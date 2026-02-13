const { supabaseAdmin } = require('../config/supabase')
const { logAdminActivity } = require('../utils/logger')

/**
 * GET /api/invoice-settings
 * Get active invoice settings
 */
const getSettings = async (req, res) => {
  try {
    const { data: settings, error } = await supabaseAdmin
      .from('invoice_settings')
      .select('*')
      .eq('is_active', true)
      .single()

    if (error && error.code !== 'PGRST116') {
      return res.status(400).json({ error: error.message })
    }

    res.json({ settings: settings || null })
  } catch (err) {
    console.error('Get invoice settings error:', err)
    res.status(500).json({ error: 'Failed to fetch invoice settings' })
  }
}

/**
 * PUT /api/invoice-settings
 * Update invoice settings (creates if doesn't exist)
 */
const updateSettings = async (req, res) => {
  try {
    const updateData = {
      ...req.body,
      updated_at: new Date().toISOString(),
    }

    // Check if active settings exist
    const { data: existing } = await supabaseAdmin
      .from('invoice_settings')
      .select('id')
      .eq('is_active', true)
      .single()

    let settings

    if (existing) {
      // Update existing
      const { data, error } = await supabaseAdmin
        .from('invoice_settings')
        .update(updateData)
        .eq('id', existing.id)
        .select()
        .single()

      if (error) {
        return res.status(400).json({ error: error.message })
      }
      settings = data
    } else {
      // Create new
      const { data, error } = await supabaseAdmin
        .from('invoice_settings')
        .insert({
          ...updateData,
          is_active: true,
          created_by: req.admin.id,
        })
        .select()
        .single()

      if (error) {
        return res.status(400).json({ error: error.message })
      }
      settings = data
    }

    await logAdminActivity(req.admin.id, 'update_invoice_settings', {
      target_type: 'invoice_settings',
      ip: req.ip,
    })

    res.json({ settings })
  } catch (err) {
    console.error('Update invoice settings error:', err)
    res.status(500).json({ error: 'Failed to update invoice settings' })
  }
}

module.exports = {
  getSettings,
  updateSettings,
}
