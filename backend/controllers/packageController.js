const { supabaseAdmin } = require('../config/supabase')
const { logAdminActivity } = require('../utils/logger')

/**
 * GET /api/packages
 * List all packages with their features and variables
 */
const listPackages = async (req, res) => {
  try {
    const { include_inactive = false } = req.query

    let query = supabaseAdmin
      .from('packages')
      .select('*')
      .order('sort_order', { ascending: true })

    if (include_inactive !== 'true') {
      query = query.eq('is_active', true)
    }

    const { data: packages, error } = await query

    if (error) {
      return res.status(400).json({ error: error.message })
    }

    // Get features and variables for each package
    const packagesWithDetails = await Promise.all(
      (packages || []).map(async (pkg) => {
        // Get features
        const { data: features } = await supabaseAdmin
          .from('package_features')
          .select('*')
          .eq('package_id', pkg.id)
          .order('display_order', { ascending: true })

        // Get variables
        const { data: variables } = await supabaseAdmin
          .from('package_variables')
          .select('*')
          .eq('package_id', pkg.id)

        // Render features with variables
        const renderedFeatures = (features || []).map((feature) => {
          let rendered = feature.feature_template

          // Replace built-in variables
          rendered = rendered.replace(/\{\{credits\}\}/g, String(pkg.credits_included || 0))
          rendered = rendered.replace(/\{\{price_monthly\}\}/g, String(pkg.price_monthly || 0))
          rendered = rendered.replace(/\{\{price_yearly\}\}/g, String(pkg.price_yearly || 0))
          rendered = rendered.replace(/\{\{currency\}\}/g, pkg.currency || 'USD')

          // Replace custom variables
          ;(variables || []).forEach((variable) => {
            const regex = new RegExp(`\\{\\{${variable.variable_key}\\}\\}`, 'g')
            rendered = rendered.replace(regex, variable.variable_value)
          })

          return {
            ...feature,
            rendered_text: rendered,
          }
        })

        return {
          ...pkg,
          features: renderedFeatures,
          variables: variables || [],
        }
      })
    )

    res.json({ packages: packagesWithDetails })
  } catch (err) {
    console.error('List packages error:', err)
    res.status(500).json({ error: 'Failed to fetch packages' })
  }
}

/**
 * GET /api/packages/:id
 * Get package by ID with features and variables
 */
const getPackage = async (req, res) => {
  try {
    const { id } = req.params

    const { data: package, error } = await supabaseAdmin
      .from('packages')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !package) {
      return res.status(404).json({ error: 'Package not found' })
    }

    // Get features
    const { data: features } = await supabaseAdmin
      .from('package_features')
      .select('*')
      .eq('package_id', id)
      .order('display_order', { ascending: true })

    // Get variables
    const { data: variables } = await supabaseAdmin
      .from('package_variables')
      .select('*')
      .eq('package_id', id)

    // Render features
    const renderedFeatures = (features || []).map((feature) => {
      let rendered = feature.feature_template

      rendered = rendered.replace(/\{\{credits\}\}/g, String(package.credits_included || 0))
      rendered = rendered.replace(/\{\{price_monthly\}\}/g, String(package.price_monthly || 0))
      rendered = rendered.replace(/\{\{price_yearly\}\}/g, String(package.price_yearly || 0))
      rendered = rendered.replace(/\{\{currency\}\}/g, package.currency || 'USD')

      ;(variables || []).forEach((variable) => {
        const regex = new RegExp(`\\{\\{${variable.variable_key}\\}\\}`, 'g')
        rendered = rendered.replace(regex, variable.variable_value)
      })

      return {
        ...feature,
        rendered_text: rendered,
      }
    })

    res.json({
      package: {
        ...package,
        features: renderedFeatures,
        variables: variables || [],
      },
    })
  } catch (err) {
    console.error('Get package error:', err)
    res.status(500).json({ error: 'Failed to fetch package' })
  }
}

/**
 * POST /api/packages
 * Create a new package
 */
const createPackage = async (req, res) => {
  try {
    const {
      name,
      slug,
      description,
      tier,
      price_monthly,
      price_yearly,
      currency = 'USD',
      credits_included = 0,
      is_active = true,
      is_featured = false,
      sort_order = 0,
      features = [],
      variables = [],
    } = req.body

    if (!name || !slug || !tier) {
      return res.status(400).json({ error: 'Missing required fields: name, slug, tier' })
    }

    // Create package
    const { data: package, error: createError } = await supabaseAdmin
      .from('packages')
      .insert({
        name,
        slug,
        description,
        tier,
        price_monthly: price_monthly ? parseFloat(price_monthly) : 0,
        price_yearly: price_yearly ? parseFloat(price_yearly) : null,
        currency,
        credits_included: parseInt(credits_included) || 0,
        is_active,
        is_featured,
        sort_order: parseInt(sort_order) || 0,
      })
      .select()
      .single()

    if (createError) {
      return res.status(400).json({ error: createError.message })
    }

    // Create features
    if (features && features.length > 0) {
      const featuresToInsert = features.map((feature) => ({
        package_id: package.id,
        feature_key: feature.feature_key,
        feature_label: feature.feature_label,
        feature_template: feature.feature_template,
        display_order: feature.display_order || 0,
        is_highlighted: feature.is_highlighted || false,
      }))

      await supabaseAdmin.from('package_features').insert(featuresToInsert)
    }

    // Create variables
    if (variables && variables.length > 0) {
      const variablesToInsert = variables.map((variable) => ({
        package_id: package.id,
        variable_key: variable.variable_key,
        variable_value: variable.variable_value,
        variable_type: variable.variable_type || 'text',
      }))

      await supabaseAdmin.from('package_variables').insert(variablesToInsert)
    }

    await logAdminActivity(req.admin.id, 'create_package', {
      target_type: 'package',
      target_id: package.id,
      ip: req.ip,
      extra: { name, slug, tier },
    })

    res.status(201).json({ package })
  } catch (err) {
    console.error('Create package error:', err)
    res.status(500).json({ error: 'Failed to create package' })
  }
}

/**
 * PUT /api/packages/:id
 * Update package
 */
const updatePackage = async (req, res) => {
  try {
    const { id } = req.params
    const updateData = {
      ...req.body,
      updated_at: new Date().toISOString(),
    }

    // Convert numeric fields
    if (updateData.price_monthly !== undefined) {
      updateData.price_monthly = parseFloat(updateData.price_monthly) || 0
    }
    if (updateData.price_yearly !== undefined) {
      updateData.price_yearly = updateData.price_yearly ? parseFloat(updateData.price_yearly) : null
    }
    if (updateData.credits_included !== undefined) {
      updateData.credits_included = parseInt(updateData.credits_included) || 0
    }
    if (updateData.sort_order !== undefined) {
      updateData.sort_order = parseInt(updateData.sort_order) || 0
    }

    const { data: package, error } = await supabaseAdmin
      .from('packages')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error || !package) {
      return res.status(404).json({ error: 'Package not found or update failed' })
    }

    await logAdminActivity(req.admin.id, 'update_package', {
      target_type: 'package',
      target_id: id,
      ip: req.ip,
    })

    res.json({ package })
  } catch (err) {
    console.error('Update package error:', err)
    res.status(500).json({ error: 'Failed to update package' })
  }
}

/**
 * DELETE /api/packages/:id
 * Delete package (soft delete by setting is_active to false)
 */
const deletePackage = async (req, res) => {
  try {
    const { id } = req.params

    const { data: package, error } = await supabaseAdmin
      .from('packages')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error || !package) {
      return res.status(404).json({ error: 'Package not found' })
    }

    await logAdminActivity(req.admin.id, 'delete_package', {
      target_type: 'package',
      target_id: id,
      ip: req.ip,
      extra: { name: package.name },
    })

    res.json({ message: 'Package deactivated successfully', package })
  } catch (err) {
    console.error('Delete package error:', err)
    res.status(500).json({ error: 'Failed to delete package' })
  }
}

/**
 * POST /api/packages/:id/features
 * Add or update package feature
 */
const upsertFeature = async (req, res) => {
  try {
    const { id } = req.params
    const { feature_key, feature_label, feature_template, display_order, is_highlighted } = req.body

    if (!feature_key || !feature_label || !feature_template) {
      return res.status(400).json({ error: 'Missing required fields: feature_key, feature_label, feature_template' })
    }

    const { data: feature, error } = await supabaseAdmin
      .from('package_features')
      .upsert(
        {
          package_id: id,
          feature_key,
          feature_label,
          feature_template,
          display_order: display_order || 0,
          is_highlighted: is_highlighted || false,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'package_id,feature_key' }
      )
      .select()
      .single()

    if (error) {
      return res.status(400).json({ error: error.message })
    }

    await logAdminActivity(req.admin.id, 'upsert_package_feature', {
      target_type: 'package_feature',
      target_id: feature.id,
      ip: req.ip,
      extra: { package_id: id, feature_key },
    })

    res.json({ feature })
  } catch (err) {
    console.error('Upsert feature error:', err)
    res.status(500).json({ error: 'Failed to upsert feature' })
  }
}

/**
 * DELETE /api/packages/:id/features/:featureKey
 * Delete package feature
 */
const deleteFeature = async (req, res) => {
  try {
    const { id, featureKey } = req.params

    const { error } = await supabaseAdmin
      .from('package_features')
      .delete()
      .eq('package_id', id)
      .eq('feature_key', featureKey)

    if (error) {
      return res.status(400).json({ error: error.message })
    }

    await logAdminActivity(req.admin.id, 'delete_package_feature', {
      target_type: 'package_feature',
      ip: req.ip,
      extra: { package_id: id, feature_key: featureKey },
    })

    res.json({ message: 'Feature deleted successfully' })
  } catch (err) {
    console.error('Delete feature error:', err)
    res.status(500).json({ error: 'Failed to delete feature' })
  }
}

/**
 * POST /api/packages/:id/variables
 * Add or update package variable
 */
const upsertVariable = async (req, res) => {
  try {
    const { id } = req.params
    const { variable_key, variable_value, variable_type = 'text' } = req.body

    if (!variable_key || variable_value === undefined) {
      return res.status(400).json({ error: 'Missing required fields: variable_key, variable_value' })
    }

    const { data: variable, error } = await supabaseAdmin
      .from('package_variables')
      .upsert(
        {
          package_id: id,
          variable_key,
          variable_value: String(variable_value),
          variable_type,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'package_id,variable_key' }
      )
      .select()
      .single()

    if (error) {
      return res.status(400).json({ error: error.message })
    }

    await logAdminActivity(req.admin.id, 'upsert_package_variable', {
      target_type: 'package_variable',
      target_id: variable.id,
      ip: req.ip,
      extra: { package_id: id, variable_key },
    })

    res.json({ variable })
  } catch (err) {
    console.error('Upsert variable error:', err)
    res.status(500).json({ error: 'Failed to upsert variable' })
  }
}

/**
 * DELETE /api/packages/:id/variables/:variableKey
 * Delete package variable
 */
const deleteVariable = async (req, res) => {
  try {
    const { id, variableKey } = req.params

    const { error } = await supabaseAdmin
      .from('package_variables')
      .delete()
      .eq('package_id', id)
      .eq('variable_key', variableKey)

    if (error) {
      return res.status(400).json({ error: error.message })
    }

    await logAdminActivity(req.admin.id, 'delete_package_variable', {
      target_type: 'package_variable',
      ip: req.ip,
      extra: { package_id: id, variable_key: variableKey },
    })

    res.json({ message: 'Variable deleted successfully' })
  } catch (err) {
    console.error('Delete variable error:', err)
    res.status(500).json({ error: 'Failed to delete variable' })
  }
}

module.exports = {
  listPackages,
  getPackage,
  createPackage,
  updatePackage,
  deletePackage,
  upsertFeature,
  deleteFeature,
  upsertVariable,
  deleteVariable,
}
