const { supabaseAdmin } = require('../config/supabase')
const { logAdminActivity } = require('../utils/logger')

/**
 * GET /api/system-settings
 * Get all system settings
 */
const getSystemSettings = async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('system_settings')
      .select('*, updated_by_admin:updated_by(id, email, first_name, last_name)')
      .order('key', { ascending: true })

    if (error) {
      return res.status(400).json({ error: error.message })
    }

    res.json({
      settings: data || [],
    })
  } catch (err) {
    console.error('Get system settings error:', err)
    res.status(500).json({ error: 'Failed to fetch system settings' })
  }
}

/**
 * GET /api/system-settings/:key
 * Get a specific system setting
 */
const getSystemSetting = async (req, res) => {
  try {
    const { key } = req.params

    const { data: setting, error } = await supabaseAdmin
      .from('system_settings')
      .select('*, updated_by_admin:updated_by(id, email, first_name, last_name)')
      .eq('key', key)
      .single()

    if (error || !setting) {
      return res.status(404).json({ error: 'Setting not found' })
    }

    res.json({
      setting,
    })
  } catch (err) {
    console.error('Get system setting error:', err)
    res.status(500).json({ error: 'Failed to fetch system setting' })
  }
}

/**
 * PUT /api/system-settings/:key
 * Update a system setting
 */
const updateSystemSetting = async (req, res) => {
  try {
    const { key } = req.params
    const { value, description } = req.body

    if (value === undefined) {
      return res.status(400).json({ error: 'value is required' })
    }

    // Get existing setting
    const { data: existingSetting, error: fetchError } = await supabaseAdmin
      .from('system_settings')
      .select('*')
      .eq('key', key)
      .single()

    const updateData = {
      value: typeof value === 'string' ? JSON.parse(value) : value,
      updated_by: req.admin.id,
    }

    if (description !== undefined) {
      updateData.description = description
    }

    let setting
    if (fetchError || !existingSetting) {
      // Create new setting
      const { data: newSetting, error: createError } = await supabaseAdmin
        .from('system_settings')
        .insert({
          key,
          ...updateData,
        })
        .select()
        .single()

      if (createError) {
        return res.status(400).json({ error: createError.message })
      }

      setting = newSetting
    } else {
      // Update existing setting
      const { data: updatedSetting, error: updateError } = await supabaseAdmin
        .from('system_settings')
        .update(updateData)
        .eq('key', key)
        .select()
        .single()

      if (updateError) {
        return res.status(400).json({ error: updateError.message })
      }

      setting = updatedSetting
    }

    await logAdminActivity(req.admin.id, 'system_setting_updated', {
      target_type: 'system_setting',
      target_id: key,
      ip: req.ip,
      extra: { key, previous_value: existingSetting?.value, new_value: setting.value },
    })

    res.json({
      success: true,
      message: 'System setting updated successfully',
      setting,
    })
  } catch (err) {
    console.error('Update system setting error:', err)
    res.status(500).json({ error: 'Failed to update system setting' })
  }
}

/**
 * GET /api/system-settings/maintenance/status
 * Quick check for maintenance mode
 */
const getMaintenanceStatus = async (req, res) => {
  try {
    const { data: setting, error } = await supabaseAdmin
      .from('system_settings')
      .select('value')
      .eq('key', 'maintenance_mode')
      .single()

    if (error || !setting) {
      return res.json({
        enabled: false,
        message: 'System is under maintenance. Please check back soon.',
      })
    }

    const value = setting.value || {}
    res.json({
      enabled: value.enabled === true,
      message: value.message || 'System is under maintenance. Please check back soon.',
    })
  } catch (err) {
    console.error('Get maintenance status error:', err)
    res.json({
      enabled: false,
      message: 'System is under maintenance. Please check back soon.',
    })
  }
}

/**
 * GET /api/system-settings/read-only/status
 * Quick check for read-only mode
 */
const getReadOnlyStatus = async (req, res) => {
  try {
    const { data: setting, error } = await supabaseAdmin
      .from('system_settings')
      .select('value')
      .eq('key', 'read_only_mode')
      .single()

    if (error || !setting) {
      return res.json({
        enabled: false,
        message: 'System is in read-only mode. Some operations are temporarily disabled.',
      })
    }

    const value = setting.value || {}
    res.json({
      enabled: value.enabled === true,
      message: value.message || 'System is in read-only mode. Some operations are temporarily disabled.',
    })
  } catch (err) {
    console.error('Get read-only status error:', err)
    res.json({
      enabled: false,
      message: 'System is in read-only mode. Some operations are temporarily disabled.',
    })
  }
}

module.exports = {
  getSystemSettings,
  getSystemSetting,
  updateSystemSetting,
  getMaintenanceStatus,
  getReadOnlyStatus,
}
