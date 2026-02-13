const { supabaseAdmin } = require('../config/supabase')
const { logAdminActivity } = require('../utils/logger')

/**
 * GET /api/security/webhook-settings
 * Get all webhook security settings
 */
const getWebhookSettings = async (req, res) => {
  try {
    const { provider_name } = req.query

    let query = supabaseAdmin
      .from('webhook_security_settings')
      .select('*')
      .order('provider_name', { ascending: true })

    if (provider_name) {
      query = query.eq('provider_name', provider_name)
    }

    const { data, error } = await query

    if (error) {
      return res.status(400).json({ error: error.message })
    }

    // Don't return secret keys in response
    const sanitized = (data || []).map(({ secret_key, ...rest }) => ({
      ...rest,
      has_secret: !!secret_key,
    }))

    res.json({ settings: sanitized })
  } catch (err) {
    console.error('Get webhook settings error:', err)
    res.status(500).json({ error: 'Failed to fetch webhook settings' })
  }
}

/**
 * POST /api/security/webhook-settings
 * Create webhook security setting
 */
const createWebhookSetting = async (req, res) => {
  try {
    const {
      provider_name,
      webhook_endpoint,
      secret_key,
      signature_algorithm = 'hmac_sha256',
      is_enabled = true,
      require_signature = true,
      allowed_ips = [],
      rate_limit_per_minute = 60,
    } = req.body

    if (!provider_name || !webhook_endpoint || !secret_key) {
      return res.status(400).json({ error: 'provider_name, webhook_endpoint, and secret_key are required' })
    }

    const { data, error } = await supabaseAdmin
      .from('webhook_security_settings')
      .insert({
        provider_name,
        webhook_endpoint,
        secret_key, // In production, encrypt this
        signature_algorithm,
        is_enabled,
        require_signature,
        allowed_ips,
        rate_limit_per_minute,
        created_by: req.admin.id,
      })
      .select()
      .single()

    if (error) {
      return res.status(400).json({ error: error.message })
    }

    await logAdminActivity(req.admin.id, 'webhook_security_setting_created', {
      target_type: 'webhook_setting',
      target_id: data.id,
      ip: req.ip,
      extra: { provider_name, webhook_endpoint },
    })

    const { secret_key: _, ...sanitized } = data
    res.status(201).json({
      success: true,
      setting: { ...sanitized, has_secret: true },
    })
  } catch (err) {
    console.error('Create webhook setting error:', err)
    res.status(500).json({ error: 'Failed to create webhook setting' })
  }
}

/**
 * PUT /api/security/webhook-settings/:id
 * Update webhook security setting
 */
const updateWebhookSetting = async (req, res) => {
  try {
    const { id } = req.params
    const updates = req.body

    // Get current setting for audit log
    const { data: current } = await supabaseAdmin
      .from('webhook_security_settings')
      .select('*')
      .eq('id', id)
      .single()

    if (!current) {
      return res.status(404).json({ error: 'Webhook setting not found' })
    }

    // Don't allow updating secret_key via this endpoint (use separate endpoint)
    delete updates.secret_key

    const { data, error } = await supabaseAdmin
      .from('webhook_security_settings')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return res.status(400).json({ error: error.message })
    }

    await logAdminActivity(req.admin.id, 'webhook_security_setting_updated', {
      target_type: 'webhook_setting',
      target_id: id,
      ip: req.ip,
      extra: {
        old_values: current,
        new_values: data,
      },
    })

    const { secret_key: _, ...sanitized } = data
    res.json({
      success: true,
      setting: { ...sanitized, has_secret: !!data.secret_key },
    })
  } catch (err) {
    console.error('Update webhook setting error:', err)
    res.status(500).json({ error: 'Failed to update webhook setting' })
  }
}

/**
 * DELETE /api/security/webhook-settings/:id
 * Delete webhook security setting
 */
const deleteWebhookSetting = async (req, res) => {
  try {
    const { id } = req.params

    const { error } = await supabaseAdmin
      .from('webhook_security_settings')
      .delete()
      .eq('id', id)

    if (error) {
      return res.status(400).json({ error: error.message })
    }

    await logAdminActivity(req.admin.id, 'webhook_security_setting_deleted', {
      target_type: 'webhook_setting',
      target_id: id,
      ip: req.ip,
    })

    res.json({ success: true })
  } catch (err) {
    console.error('Delete webhook setting error:', err)
    res.status(500).json({ error: 'Failed to delete webhook setting' })
  }
}

/**
 * GET /api/security/webhook-logs
 * Get webhook request logs
 */
const getWebhookLogs = async (req, res) => {
  try {
    const { provider_name, webhook_endpoint, page = 0, limit = 50 } = req.query
    const offset = parseInt(page) * parseInt(limit)

    let query = supabaseAdmin
      .from('webhook_request_logs')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + parseInt(limit) - 1)

    if (provider_name) {
      query = query.eq('provider_name', provider_name)
    }

    if (webhook_endpoint) {
      query = query.eq('webhook_endpoint', webhook_endpoint)
    }

    const { data, count, error } = await query

    if (error) {
      return res.status(400).json({ error: error.message })
    }

    res.json({
      logs: data || [],
      total: count || 0,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil((count || 0) / parseInt(limit)),
    })
  } catch (err) {
    console.error('Get webhook logs error:', err)
    res.status(500).json({ error: 'Failed to fetch webhook logs' })
  }
}

/**
 * GET /api/security/ip-allowlist
 * Get IP allowlist (admin-specific and global)
 */
const getIPAllowlist = async (req, res) => {
  try {
    const { admin_id, type = 'all' } = req.query

    const results = {
      admin_specific: [],
      global: [],
    }

    if (type === 'all' || type === 'admin') {
      let adminQuery = supabaseAdmin
        .from('admin_ip_allowlist')
        .select('*')
        .order('created_at', { ascending: false })

      if (admin_id) {
        adminQuery = adminQuery.eq('admin_id', admin_id)
      }

      const { data: adminData } = await adminQuery
      results.admin_specific = adminData || []
    }

    if (type === 'all' || type === 'global') {
      const { data: globalData } = await supabaseAdmin
        .from('global_ip_allowlist')
        .select('*')
        .order('created_at', { ascending: false })

      results.global = globalData || []
    }

    res.json(results)
  } catch (err) {
    console.error('Get IP allowlist error:', err)
    res.status(500).json({ error: 'Failed to fetch IP allowlist' })
  }
}

/**
 * POST /api/security/ip-allowlist
 * Add IP to allowlist
 */
const addIPToAllowlist = async (req, res) => {
  try {
    const { admin_id, ip_address, description, is_global = false } = req.body

    if (!ip_address) {
      return res.status(400).json({ error: 'ip_address is required' })
    }

    if (is_global) {
      const { data, error } = await supabaseAdmin
        .from('global_ip_allowlist')
        .insert({
          ip_address,
          description,
          created_by: req.admin.id,
        })
        .select()
        .single()

      if (error) {
        return res.status(400).json({ error: error.message })
      }

      await logAdminActivity(req.admin.id, 'global_ip_allowlist_added', {
        target_type: 'ip_allowlist',
        target_id: data.id,
        ip: req.ip,
        extra: { ip_address, description },
      })

      res.status(201).json({ success: true, entry: data })
    } else {
      if (!admin_id) {
        return res.status(400).json({ error: 'admin_id is required for admin-specific allowlist' })
      }

      const { data, error } = await supabaseAdmin
        .from('admin_ip_allowlist')
        .insert({
          admin_id,
          ip_address,
          description,
          created_by: req.admin.id,
        })
        .select()
        .single()

      if (error) {
        return res.status(400).json({ error: error.message })
      }

      await logAdminActivity(req.admin.id, 'admin_ip_allowlist_added', {
        target_type: 'ip_allowlist',
        target_id: data.id,
        ip: req.ip,
        extra: { admin_id, ip_address, description },
      })

      res.status(201).json({ success: true, entry: data })
    }
  } catch (err) {
    console.error('Add IP to allowlist error:', err)
    res.status(500).json({ error: 'Failed to add IP to allowlist' })
  }
}

/**
 * DELETE /api/security/ip-allowlist/:id
 * Remove IP from allowlist
 */
const removeIPFromAllowlist = async (req, res) => {
  try {
    const { id } = req.params
    const { type = 'admin' } = req.query

    const table = type === 'global' ? 'global_ip_allowlist' : 'admin_ip_allowlist'

    const { error } = await supabaseAdmin.from(table).delete().eq('id', id)

    if (error) {
      return res.status(400).json({ error: error.message })
    }

    await logAdminActivity(req.admin.id, `${type}_ip_allowlist_removed`, {
      target_type: 'ip_allowlist',
      target_id: id,
      ip: req.ip,
    })

    res.json({ success: true })
  } catch (err) {
    console.error('Remove IP from allowlist error:', err)
    res.status(500).json({ error: 'Failed to remove IP from allowlist' })
  }
}

/**
 * GET /api/security/data-retention
 * Get data retention configuration
 */
const getDataRetentionConfig = async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('data_retention_config')
      .select('*')
      .order('data_type', { ascending: true })

    if (error) {
      return res.status(400).json({ error: error.message })
    }

    res.json({ configs: data || [] })
  } catch (err) {
    console.error('Get data retention config error:', err)
    res.status(500).json({ error: 'Failed to fetch data retention config' })
  }
}

/**
 * PUT /api/security/data-retention/:id
 * Update data retention configuration
 */
const updateDataRetentionConfig = async (req, res) => {
  try {
    const { id } = req.params
    const updates = req.body

    // Get current config for audit log
    const { data: current } = await supabaseAdmin
      .from('data_retention_config')
      .select('*')
      .eq('id', id)
      .single()

    if (!current) {
      return res.status(404).json({ error: 'Data retention config not found' })
    }

    const { data, error } = await supabaseAdmin
      .from('data_retention_config')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return res.status(400).json({ error: error.message })
    }

    await logAdminActivity(req.admin.id, 'data_retention_config_updated', {
      target_type: 'data_retention',
      target_id: id,
      ip: req.ip,
      extra: {
        old_values: current,
        new_values: data,
      },
    })

    res.json({ success: true, config: data })
  } catch (err) {
    console.error('Update data retention config error:', err)
    res.status(500).json({ error: 'Failed to update data retention config' })
  }
}

/**
 * GET /api/security/backup-status
 * Get backup status
 */
const getBackupStatus = async (req, res) => {
  try {
    const { backup_type, status, page = 0, limit = 50 } = req.query
    const offset = parseInt(page) * parseInt(limit)

    let query = supabaseAdmin
      .from('backup_status')
      .select('*', { count: 'exact' })
      .order('started_at', { ascending: false })
      .range(offset, offset + parseInt(limit) - 1)

    if (backup_type) {
      query = query.eq('backup_type', backup_type)
    }

    if (status) {
      query = query.eq('status', status)
    }

    const { data, count, error } = await query

    if (error) {
      return res.status(400).json({ error: error.message })
    }

    res.json({
      backups: data || [],
      total: count || 0,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil((count || 0) / parseInt(limit)),
    })
  } catch (err) {
    console.error('Get backup status error:', err)
    res.status(500).json({ error: 'Failed to fetch backup status' })
  }
}

/**
 * POST /api/security/backup-status
 * Create backup status entry
 */
const createBackupStatus = async (req, res) => {
  try {
    const {
      backup_type,
      backup_location,
      backup_size_bytes,
      status = 'pending',
      metadata = {},
    } = req.body

    if (!backup_type || !backup_location) {
      return res.status(400).json({ error: 'backup_type and backup_location are required' })
    }

    const { data, error } = await supabaseAdmin
      .from('backup_status')
      .insert({
        backup_type,
        backup_location,
        backup_size_bytes,
        status,
        metadata,
        created_by: req.admin.id,
      })
      .select()
      .single()

    if (error) {
      return res.status(400).json({ error: error.message })
    }

    await logAdminActivity(req.admin.id, 'backup_status_created', {
      target_type: 'backup',
      target_id: data.id,
      ip: req.ip,
      extra: { backup_type, backup_location },
    })

    res.status(201).json({ success: true, backup: data })
  } catch (err) {
    console.error('Create backup status error:', err)
    res.status(500).json({ error: 'Failed to create backup status' })
  }
}

/**
 * GET /api/security/abuse-alerts
 * Get abuse detection alerts
 */
const getAbuseAlerts = async (req, res) => {
  try {
    const {
      alert_type,
      severity,
      status = 'open',
      page = 0,
      limit = 50,
    } = req.query
    const offset = parseInt(page) * parseInt(limit)

    let query = supabaseAdmin
      .from('abuse_detection_alerts')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + parseInt(limit) - 1)

    if (alert_type) {
      query = query.eq('alert_type', alert_type)
    }

    if (severity) {
      query = query.eq('severity', severity)
    }

    if (status) {
      query = query.eq('status', status)
    }

    const { data, count, error } = await query

    if (error) {
      return res.status(400).json({ error: error.message })
    }

    res.json({
      alerts: data || [],
      total: count || 0,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil((count || 0) / parseInt(limit)),
    })
  } catch (err) {
    console.error('Get abuse alerts error:', err)
    res.status(500).json({ error: 'Failed to fetch abuse alerts' })
  }
}

/**
 * PUT /api/security/abuse-alerts/:id/resolve
 * Resolve abuse detection alert
 */
const resolveAbuseAlert = async (req, res) => {
  try {
    const { id } = req.params
    const { status = 'resolved', resolution_notes } = req.body

    const { data, error } = await supabaseAdmin
      .from('abuse_detection_alerts')
      .update({
        status,
        resolved_by: req.admin.id,
        resolved_at: new Date().toISOString(),
        resolution_notes,
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return res.status(400).json({ error: error.message })
    }

    await logAdminActivity(req.admin.id, 'abuse_alert_resolved', {
      target_type: 'abuse_alert',
      target_id: id,
      ip: req.ip,
      extra: { status, resolution_notes },
    })

    res.json({ success: true, alert: data })
  } catch (err) {
    console.error('Resolve abuse alert error:', err)
    res.status(500).json({ error: 'Failed to resolve abuse alert' })
  }
}

/**
 * GET /api/security/failed-logins
 * Get failed login attempts
 */
const getFailedLogins = async (req, res) => {
  try {
    const { email, ip_address, page = 0, limit = 50 } = req.query
    const offset = parseInt(page) * parseInt(limit)

    let query = supabaseAdmin
      .from('failed_login_attempts')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + parseInt(limit) - 1)

    if (email) {
      query = query.eq('email', email)
    }

    if (ip_address) {
      query = query.eq('ip_address', ip_address)
    }

    const { data, count, error } = await query

    if (error) {
      return res.status(400).json({ error: error.message })
    }

    res.json({
      attempts: data || [],
      total: count || 0,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil((count || 0) / parseInt(limit)),
    })
  } catch (err) {
    console.error('Get failed logins error:', err)
    res.status(500).json({ error: 'Failed to fetch failed login attempts' })
  }
}

module.exports = {
  getWebhookSettings,
  createWebhookSetting,
  updateWebhookSetting,
  deleteWebhookSetting,
  getWebhookLogs,
  getIPAllowlist,
  addIPToAllowlist,
  removeIPFromAllowlist,
  getDataRetentionConfig,
  updateDataRetentionConfig,
  getBackupStatus,
  createBackupStatus,
  getAbuseAlerts,
  resolveAbuseAlert,
  getFailedLogins,
}
