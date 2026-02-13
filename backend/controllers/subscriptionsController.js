const { supabaseAdmin } = require('../config/supabase')
const { logAdminActivity } = require('../utils/logger')

/**
 * GET /api/subscriptions
 * List user subscriptions with pagination and filters
 */
const getSubscriptions = async (req, res) => {
  try {
    const { user_id, status, page = 0, limit = 50 } = req.query
    const offset = parseInt(page) * parseInt(limit)

    // Fetch subscriptions without the relationship
    let query = supabaseAdmin
      .from('user_subscriptions')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + parseInt(limit) - 1)

    if (user_id) {
      query = query.eq('user_id', user_id)
    }

    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    const { data, count, error } = await query

    if (error) {
      return res.status(400).json({ error: error.message })
    }

    // Fetch all packages to join manually
    const packageIds = [...new Set((data || []).map(sub => sub.package_id).filter(Boolean))]
    let packagesMap = {}
    if (packageIds.length > 0) {
      const { data: packages } = await supabaseAdmin
        .from('subscription_packages')
        .select('id, package_name, package_code, monthly_price')
        .in('id', packageIds)
      
      if (packages) {
        packagesMap = packages.reduce((acc, pkg) => {
          acc[pkg.id] = pkg
          return acc
        }, {})
      }
    }

    // Fetch user emails - batch fetch from auth.users
    const userIds = [...new Set((data || []).map(sub => sub.user_id).filter(Boolean))]
    let emailsMap = {}
    
    if (userIds.length > 0) {
      // Batch fetch all users from auth
      try {
        const { data: authUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers()
        
        if (!listError && authUsers?.users) {
          // Create a map of user_id -> email
          authUsers.users.forEach((authUser) => {
            if (userIds.includes(authUser.id) && authUser.email) {
              emailsMap[authUser.id] = authUser.email
            }
          })
        }
      } catch (err) {
        console.error('Error fetching user emails:', err)
        // Fallback: try individual lookups for missing emails
        for (const userId of userIds) {
          if (!emailsMap[userId]) {
            try {
              const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(userId)
              if (authUser?.user?.email) {
                emailsMap[userId] = authUser.user.email
              }
            } catch (getErr) {
              console.warn(`Failed to fetch email for user ${userId}:`, getErr.message)
            }
          }
        }
      }
    }

    // Join emails and packages
    const subscriptionsWithEmail = (data || []).map((sub) => {
      // Manually join package data
      const packageData = sub.package_id ? packagesMap[sub.package_id] : null
      
      return {
        ...sub,
        email: emailsMap[sub.user_id] || null,
        subscription_packages: packageData || null
      }
    })

    res.json({
      subscriptions: subscriptionsWithEmail,
      total: count || 0,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil((count || 0) / parseInt(limit)),
    })
  } catch (err) {
    console.error('Get subscriptions error:', err)
    res.status(500).json({ error: 'Failed to fetch subscriptions' })
  }
}

/**
 * GET /api/subscriptions/:id
 * Get single subscription details
 */
const getSubscriptionById = async (req, res) => {
  try {
    const { id } = req.params

    const { data: subscription, error } = await supabaseAdmin
      .from('user_subscriptions')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !subscription) {
      return res.status(404).json({ error: 'Subscription not found' })
    }

    // Fetch package data separately
    let packageData = null
    if (subscription.package_id) {
      const { data: pkg } = await supabaseAdmin
        .from('subscription_packages')
        .select('*')
        .eq('id', subscription.package_id)
        .single()
      packageData = pkg || null
    }

    let email = null
    try {
      const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(subscription.user_id)
      email = authUser?.user?.email || null
    } catch {}

    // Fetch related invoices
    const { data: invoices } = await supabaseAdmin
      .from('invoices')
      .select('*')
      .eq('subscription_id', id)
      .order('created_at', { ascending: false })
      .limit(20)

    res.json({
      subscription: {
        ...subscription,
        email,
        subscription_packages: packageData
      },
      invoices: invoices || [],
    })
  } catch (err) {
    console.error('Get subscription error:', err)
    res.status(500).json({ error: 'Failed to fetch subscription' })
  }
}

/**
 * PATCH /api/subscriptions/:id
 * Update subscription status
 */
const updateSubscription = async (req, res) => {
  try {
    const { id } = req.params
    const { status, auto_renew, cancel_at_period_end } = req.body

    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('user_subscriptions')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !existing) {
      return res.status(404).json({ error: 'Subscription not found' })
    }

    const updateData = { updated_at: new Date().toISOString() }
    if (status !== undefined) {
      updateData.status = status
      if (status === 'canceled') {
        updateData.canceled_at = new Date().toISOString()
      }
    }
    if (auto_renew !== undefined) updateData.auto_renew = auto_renew
    if (cancel_at_period_end !== undefined) updateData.cancel_at_period_end = cancel_at_period_end

    const { error } = await supabaseAdmin
      .from('user_subscriptions')
      .update(updateData)
      .eq('id', id)

    if (error) throw error

    await logAdminActivity(req.admin.id, 'subscription_updated', {
      target_type: 'subscription',
      target_id: id,
      ip: req.ip,
      extra: {
        user_id: existing.user_id,
        previous_status: existing.status,
        updated_fields: Object.keys(updateData).filter((k) => k !== 'updated_at'),
      },
    })

    // Fetch updated subscription
    const { data: updated } = await supabaseAdmin
      .from('user_subscriptions')
      .select('*')
      .eq('id', id)
      .single()

    // Fetch package data separately
    let packageData = null
    if (updated?.package_id) {
      const { data: pkg } = await supabaseAdmin
        .from('subscription_packages')
        .select('package_name, package_code')
        .eq('id', updated.package_id)
        .single()
      packageData = pkg || null
    }

    res.json({
      success: true,
      message: 'Subscription updated successfully',
      subscription: {
        ...updated,
        subscription_packages: packageData
      }
    })
  } catch (err) {
    console.error('Update subscription error:', err)
    res.status(500).json({ error: 'Failed to update subscription' })
  }
}

// =====================
// PACKAGES
// =====================

/**
 * GET /api/subscriptions/packages
 * List all subscription packages
 */
const getPackages = async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('subscription_packages')
      .select('*')
      .is('deleted_at', null)
      .order('monthly_price', { ascending: true })

    if (error) {
      return res.status(400).json({ error: error.message })
    }

    res.json({ packages: data || [] })
  } catch (err) {
    console.error('Get packages error:', err)
    res.status(500).json({ error: 'Failed to fetch packages' })
  }
}

/**
 * POST /api/subscriptions/packages
 * Create a new subscription package
 */
const createPackage = async (req, res) => {
  try {
    const {
      package_name, package_code, description, monthly_price, currency,
      max_agents, max_inbound_numbers, monthly_call_minutes, monthly_credits,
      features, is_active, is_featured,
    } = req.body

    if (!package_name || !package_code || monthly_price === undefined) {
      return res.status(400).json({ error: 'package_name, package_code, and monthly_price are required' })
    }

    const { data, error } = await supabaseAdmin.from('subscription_packages').insert({
      package_name,
      package_code,
      description: description || null,
      monthly_price,
      currency: currency || 'USD',
      max_agents: max_agents || 1,
      max_inbound_numbers: max_inbound_numbers || 1,
      monthly_call_minutes: monthly_call_minutes || 0,
      monthly_credits: monthly_credits || 0,
      features: features || {},
      is_active: is_active !== undefined ? is_active : true,
      is_featured: is_featured || false,
    }).select().single()

    if (error) {
      return res.status(400).json({ error: error.message })
    }

    await logAdminActivity(req.admin.id, 'package_created', {
      target_type: 'subscription_package',
      target_id: data.id,
      ip: req.ip,
      extra: { package_name, package_code, monthly_price },
    })

    res.status(201).json({ success: true, message: 'Package created successfully', package: data })
  } catch (err) {
    console.error('Create package error:', err)
    res.status(500).json({ error: 'Failed to create package' })
  }
}

/**
 * PUT /api/subscriptions/packages/:id
 * Update a subscription package
 */
const updatePackage = async (req, res) => {
  try {
    const { id } = req.params
    const {
      package_name, description, monthly_price, currency,
      max_agents, max_inbound_numbers, monthly_call_minutes, monthly_credits,
      features, is_active, is_featured,
    } = req.body

    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('subscription_packages')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .single()

    if (fetchError || !existing) {
      return res.status(404).json({ error: 'Package not found' })
    }

    const updateData = { updated_at: new Date().toISOString() }
    if (package_name !== undefined) updateData.package_name = package_name
    if (description !== undefined) updateData.description = description
    if (monthly_price !== undefined) updateData.monthly_price = monthly_price
    if (currency !== undefined) updateData.currency = currency
    if (max_agents !== undefined) updateData.max_agents = max_agents
    if (max_inbound_numbers !== undefined) updateData.max_inbound_numbers = max_inbound_numbers
    if (monthly_call_minutes !== undefined) updateData.monthly_call_minutes = monthly_call_minutes
    if (monthly_credits !== undefined) updateData.monthly_credits = monthly_credits
    if (features !== undefined) updateData.features = features
    if (is_active !== undefined) updateData.is_active = is_active
    if (is_featured !== undefined) updateData.is_featured = is_featured

    const { error } = await supabaseAdmin
      .from('subscription_packages')
      .update(updateData)
      .eq('id', id)

    if (error) throw error

    await logAdminActivity(req.admin.id, 'package_updated', {
      target_type: 'subscription_package',
      target_id: id,
      ip: req.ip,
      extra: {
        package_name: existing.package_name,
        updated_fields: Object.keys(updateData).filter((k) => k !== 'updated_at'),
      },
    })

    const { data: updated } = await supabaseAdmin
      .from('subscription_packages')
      .select('*')
      .eq('id', id)
      .single()

    res.json({ success: true, message: 'Package updated successfully', package: updated })
  } catch (err) {
    console.error('Update package error:', err)
    res.status(500).json({ error: 'Failed to update package' })
  }
}

/**
 * DELETE /api/subscriptions/packages/:id
 * Soft delete a package
 */
const deletePackage = async (req, res) => {
  try {
    const { id } = req.params

    const { data: pkg, error: fetchError } = await supabaseAdmin
      .from('subscription_packages')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .single()

    if (fetchError || !pkg) {
      return res.status(404).json({ error: 'Package not found' })
    }

    // Check if any active subscriptions use this package
    const { count: activeCount } = await supabaseAdmin
      .from('user_subscriptions')
      .select('*', { count: 'exact', head: true })
      .eq('package_id', id)
      .eq('status', 'active')

    if (activeCount > 0) {
      return res.status(400).json({
        error: `Cannot delete: ${activeCount} active subscription(s) use this package. Deactivate them first.`,
      })
    }

    const { error } = await supabaseAdmin
      .from('subscription_packages')
      .update({
        deleted_at: new Date().toISOString(),
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (error) throw error

    await logAdminActivity(req.admin.id, 'package_deleted', {
      target_type: 'subscription_package',
      target_id: id,
      ip: req.ip,
      extra: { package_name: pkg.package_name, package_code: pkg.package_code },
    })

    res.json({ success: true, message: 'Package deleted successfully' })
  } catch (err) {
    console.error('Delete package error:', err)
    res.status(500).json({ error: 'Failed to delete package' })
  }
}

module.exports = {
  getSubscriptions,
  getSubscriptionById,
  updateSubscription,
  getPackages,
  createPackage,
  updatePackage,
  deletePackage,
}
