const { supabaseAdmin } = require('../config/supabase')
const { logAdminActivity } = require('../utils/logger')

/**
 * GET /api/feature-flags
 * List all feature flags
 */
const getFeatureFlags = async (req, res) => {
  try {
    const { enabled, search } = req.query

    let query = supabaseAdmin
      .from('feature_flags')
      .select('*, updated_by_admin:updated_by(id, email, first_name, last_name)')
      .order('name', { ascending: true })

    if (enabled !== undefined) {
      query = query.eq('enabled', enabled === 'true')
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`)
    }

    const { data, error } = await query

    if (error) {
      return res.status(400).json({ error: error.message })
    }

    res.json({
      featureFlags: data || [],
    })
  } catch (err) {
    console.error('Get feature flags error:', err)
    res.status(500).json({ error: 'Failed to fetch feature flags' })
  }
}

/**
 * GET /api/feature-flags/:id
 * Get single feature flag
 */
const getFeatureFlagById = async (req, res) => {
  try {
    const { id } = req.params

    const { data: featureFlag, error } = await supabaseAdmin
      .from('feature_flags')
      .select('*, updated_by_admin:updated_by(id, email, first_name, last_name)')
      .eq('id', id)
      .single()

    if (error || !featureFlag) {
      return res.status(404).json({ error: 'Feature flag not found' })
    }

    // Get history
    const { data: history } = await supabaseAdmin
      .from('feature_flag_history')
      .select('*, admin:admin_id(id, email, first_name, last_name)')
      .eq('feature_flag_id', id)
      .order('created_at', { ascending: false })
      .limit(50)

    res.json({
      featureFlag,
      history: history || [],
    })
  } catch (err) {
    console.error('Get feature flag error:', err)
    res.status(500).json({ error: 'Failed to fetch feature flag' })
  }
}

/**
 * POST /api/feature-flags
 * Create a new feature flag
 */
const createFeatureFlag = async (req, res) => {
  try {
    const { name, description, enabled = false, enabled_for_roles = [], metadata = {} } = req.body

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Name is required' })
    }

    // Check if name already exists
    const { data: existing } = await supabaseAdmin
      .from('feature_flags')
      .select('id')
      .eq('name', name.trim())
      .single()

    if (existing) {
      return res.status(409).json({ error: 'Feature flag with this name already exists' })
    }

    const { data: featureFlag, error } = await supabaseAdmin
      .from('feature_flags')
      .insert({
        name: name.trim(),
        description: description || null,
        enabled: enabled === true || enabled === 'true',
        enabled_for_roles: Array.isArray(enabled_for_roles) ? enabled_for_roles : [],
        metadata: metadata || {},
        updated_by: req.admin.id,
      })
      .select()
      .single()

    if (error) {
      return res.status(400).json({ error: error.message })
    }

    // Log history
    await supabaseAdmin.from('feature_flag_history').insert({
      feature_flag_id: featureFlag.id,
      admin_id: req.admin.id,
      action: 'created',
      new_value: featureFlag,
    })

    await logAdminActivity(req.admin.id, 'feature_flag_created', {
      target_type: 'feature_flag',
      target_id: featureFlag.id,
      ip: req.ip,
      extra: { name: featureFlag.name, enabled: featureFlag.enabled },
    })

    res.status(201).json({
      success: true,
      message: 'Feature flag created successfully',
      featureFlag,
    })
  } catch (err) {
    console.error('Create feature flag error:', err)
    res.status(500).json({ error: 'Failed to create feature flag' })
  }
}

/**
 * PUT /api/feature-flags/:id
 * Update a feature flag
 */
const updateFeatureFlag = async (req, res) => {
  try {
    const { id } = req.params
    const { name, description, enabled, enabled_for_roles, metadata } = req.body

    // Get existing flag
    const { data: existingFlag, error: fetchError } = await supabaseAdmin
      .from('feature_flags')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !existingFlag) {
      return res.status(404).json({ error: 'Feature flag not found' })
    }

    const updateData = { updated_by: req.admin.id }
    const previousValue = { ...existingFlag }

    if (name !== undefined && name.trim() !== existingFlag.name) {
      // Check if new name conflicts
      const { data: conflict } = await supabaseAdmin
        .from('feature_flags')
        .select('id')
        .eq('name', name.trim())
        .neq('id', id)
        .single()

      if (conflict) {
        return res.status(409).json({ error: 'Feature flag with this name already exists' })
      }
      updateData.name = name.trim()
    }

    if (description !== undefined) updateData.description = description
    if (enabled !== undefined) {
      updateData.enabled = enabled === true || enabled === 'true'
    }
    if (enabled_for_roles !== undefined) {
      updateData.enabled_for_roles = Array.isArray(enabled_for_roles) ? enabled_for_roles : []
    }
    if (metadata !== undefined) {
      updateData.metadata = metadata || {}
    }

    const { data: updatedFlag, error: updateError } = await supabaseAdmin
      .from('feature_flags')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      return res.status(400).json({ error: updateError.message })
    }

    // Log history
    const action = updateData.enabled !== undefined
      ? (updateData.enabled ? 'enabled' : 'disabled')
      : 'updated'

    await supabaseAdmin.from('feature_flag_history').insert({
      feature_flag_id: id,
      admin_id: req.admin.id,
      action,
      previous_value: previousValue,
      new_value: updatedFlag,
    })

    await logAdminActivity(req.admin.id, 'feature_flag_updated', {
      target_type: 'feature_flag',
      target_id: id,
      ip: req.ip,
      extra: {
        action,
        updated_fields: Object.keys(updateData).filter((k) => k !== 'updated_by'),
      },
    })

    res.json({
      success: true,
      message: 'Feature flag updated successfully',
      featureFlag: updatedFlag,
    })
  } catch (err) {
    console.error('Update feature flag error:', err)
    res.status(500).json({ error: 'Failed to update feature flag' })
  }
}

/**
 * DELETE /api/feature-flags/:id
 * Delete a feature flag
 */
const deleteFeatureFlag = async (req, res) => {
  try {
    const { id } = req.params

    // Get existing flag
    const { data: existingFlag, error: fetchError } = await supabaseAdmin
      .from('feature_flags')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !existingFlag) {
      return res.status(404).json({ error: 'Feature flag not found' })
    }

    const { error: deleteError } = await supabaseAdmin
      .from('feature_flags')
      .delete()
      .eq('id', id)

    if (deleteError) {
      return res.status(400).json({ error: deleteError.message })
    }

    await logAdminActivity(req.admin.id, 'feature_flag_deleted', {
      target_type: 'feature_flag',
      target_id: id,
      ip: req.ip,
      extra: { name: existingFlag.name },
    })

    res.json({
      success: true,
      message: 'Feature flag deleted successfully',
    })
  } catch (err) {
    console.error('Delete feature flag error:', err)
    res.status(500).json({ error: 'Failed to delete feature flag' })
  }
}

module.exports = {
  getFeatureFlags,
  getFeatureFlagById,
  createFeatureFlag,
  updateFeatureFlag,
  deleteFeatureFlag,
}
