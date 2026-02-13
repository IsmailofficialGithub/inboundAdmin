const { supabaseAdmin } = require('../config/supabase')
const { logAdminActivity } = require('../utils/logger')

/**
 * GET /api/tax-configuration
 * List all tax configurations
 */
const getTaxConfigurations = async (req, res) => {
  try {
    const { country_code, state_code, is_active, is_default, page = 0, limit = 50 } = req.query
    const offset = parseInt(page) * parseInt(limit)

    let query = supabaseAdmin
      .from('tax_configuration')
      .select('*', { count: 'exact' })
      .order('country_code', { ascending: true })
      .order('state_code', { ascending: true })
      .range(offset, offset + parseInt(limit) - 1)

    if (country_code) {
      query = query.eq('country_code', country_code)
    }

    if (state_code) {
      query = query.eq('state_code', state_code)
    }

    if (is_active === 'true') {
      query = query.eq('is_active', true)
    } else if (is_active === 'false') {
      query = query.eq('is_active', false)
    }

    if (is_default === 'true') {
      query = query.eq('is_default', true)
    }

    const { data, count, error } = await query

    if (error) {
      // If table doesn't exist, return empty array instead of error
      if (error.code === '42P01' || error.message.includes('does not exist')) {
        return res.json({
          tax_configs: [],
          total: 0,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: 0,
        })
      }
      return res.status(400).json({ error: error.message })
    }

    res.json({
      tax_configs: data || [],
      total: count || 0,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil((count || 0) / parseInt(limit)),
    })
  } catch (err) {
    console.error('Get tax configurations error:', err)
    res.status(500).json({ error: 'Failed to fetch tax configurations' })
  }
}

/**
 * GET /api/tax-configuration/:id
 * Get single tax configuration
 */
const getTaxConfiguration = async (req, res) => {
  try {
    const { id } = req.params

    const { data: taxConfig, error } = await supabaseAdmin
      .from('tax_configuration')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !taxConfig) {
      return res.status(404).json({ error: 'Tax configuration not found' })
    }

    res.json({ tax_config: taxConfig })
  } catch (err) {
    console.error('Get tax configuration error:', err)
    res.status(500).json({ error: 'Failed to fetch tax configuration' })
  }
}

/**
 * POST /api/tax-configuration
 * Create new tax configuration
 */
const createTaxConfiguration = async (req, res) => {
  try {
    const { country_code, state_code, tax_name, tax_rate, is_default = false, is_active = true } = req.body

    if (!country_code || !tax_name || tax_rate === undefined) {
      return res.status(400).json({ error: 'country_code, tax_name, and tax_rate are required' })
    }

    // If setting as default, unset other defaults for same country/state
    if (is_default) {
      const unsetQuery = supabaseAdmin
        .from('tax_configuration')
        .update({ is_default: false })
        .eq('country_code', country_code)
        .eq('is_default', true)

      if (state_code) {
        unsetQuery.eq('state_code', state_code)
      } else {
        unsetQuery.is('state_code', null)
      }

      await unsetQuery
    }

    const { data: taxConfig, error } = await supabaseAdmin
      .from('tax_configuration')
      .insert({
        country_code,
        state_code: state_code || null,
        tax_name,
        tax_rate,
        is_default,
        is_active,
      })
      .select()
      .single()

    if (error) {
      return res.status(400).json({ error: error.message })
    }

    await logAdminActivity(req.admin.id, 'create_tax_configuration', {
      target_type: 'tax_configuration',
      target_id: taxConfig.id,
    })

    res.status(201).json({
      message: 'Tax configuration created successfully',
      tax_config: taxConfig,
    })
  } catch (err) {
    console.error('Create tax configuration error:', err)
    res.status(500).json({ error: 'Failed to create tax configuration' })
  }
}

/**
 * PUT /api/tax-configuration/:id
 * Update tax configuration
 */
const updateTaxConfiguration = async (req, res) => {
  try {
    const { id } = req.params
    const { country_code, state_code, tax_name, tax_rate, is_default, is_active } = req.body

    // Get existing config
    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('tax_configuration')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !existing) {
      return res.status(404).json({ error: 'Tax configuration not found' })
    }

    // If setting as default, unset other defaults
    if (is_default && !existing.is_default) {
      const finalCountryCode = country_code || existing.country_code
      const finalStateCode = state_code !== undefined ? state_code : existing.state_code

      const unsetQuery = supabaseAdmin
        .from('tax_configuration')
        .update({ is_default: false })
        .eq('country_code', finalCountryCode)
        .eq('is_default', true)
        .neq('id', id)

      if (finalStateCode) {
        unsetQuery.eq('state_code', finalStateCode)
      } else {
        unsetQuery.is('state_code', null)
      }

      await unsetQuery
    }

    const updateData = {}
    if (country_code !== undefined) updateData.country_code = country_code
    if (state_code !== undefined) updateData.state_code = state_code
    if (tax_name !== undefined) updateData.tax_name = tax_name
    if (tax_rate !== undefined) updateData.tax_rate = tax_rate
    if (is_default !== undefined) updateData.is_default = is_default
    if (is_active !== undefined) updateData.is_active = is_active

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: 'No fields to update' })
    }

    const { data: updatedConfig, error } = await supabaseAdmin
      .from('tax_configuration')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return res.status(400).json({ error: error.message })
    }

    await logAdminActivity(req.admin.id, 'update_tax_configuration', {
      target_type: 'tax_configuration',
      target_id: id,
    })

    res.json({
      message: 'Tax configuration updated successfully',
      tax_config: updatedConfig,
    })
  } catch (err) {
    console.error('Update tax configuration error:', err)
    res.status(500).json({ error: 'Failed to update tax configuration' })
  }
}

/**
 * DELETE /api/tax-configuration/:id
 * Delete tax configuration
 */
const deleteTaxConfiguration = async (req, res) => {
  try {
    const { id } = req.params

    const { error } = await supabaseAdmin.from('tax_configuration').delete().eq('id', id)

    if (error) {
      return res.status(400).json({ error: error.message })
    }

    await logAdminActivity(req.admin.id, 'delete_tax_configuration', {
      target_type: 'tax_configuration',
      target_id: id,
    })

    res.json({ message: 'Tax configuration deleted successfully' })
  } catch (err) {
    console.error('Delete tax configuration error:', err)
    res.status(500).json({ error: 'Failed to delete tax configuration' })
  }
}

module.exports = {
  getTaxConfigurations,
  getTaxConfiguration,
  createTaxConfiguration,
  updateTaxConfiguration,
  deleteTaxConfiguration,
}
