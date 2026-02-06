const { supabaseAdmin } = require('../config/supabase')
const { logAdminActivity } = require('../utils/logger')

/**
 * GET /api/coupons
 * List coupon codes
 */
const listCoupons = async (req, res) => {
  try {
    const {
      page = 0,
      limit = 50,
      code,
      is_active,
      discount_type,
      sort_by = 'created_at',
      sort_order = 'desc',
    } = req.query

    let query = supabaseAdmin.from('coupon_codes').select('*', { count: 'exact' })

    // Apply filters
    if (code) {
      query = query.ilike('code', `%${code}%`)
    }
    if (is_active !== undefined) {
      query = query.eq('is_active', is_active === 'true')
    }
    if (discount_type) {
      query = query.eq('discount_type', discount_type)
    }

    // Apply sorting
    query = query.order(sort_by, { ascending: sort_order === 'asc' })

    // Apply pagination
    const from = parseInt(page) * parseInt(limit)
    const to = from + parseInt(limit) - 1
    query = query.range(from, to)

    const { data, error, count } = await query

    if (error) {
      return res.status(400).json({ error: error.message })
    }

    res.json({
      coupons: data || [],
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count || 0,
        totalPages: Math.ceil((count || 0) / parseInt(limit)),
      },
    })
  } catch (err) {
    console.error('List coupons error:', err)
    res.status(500).json({ error: 'Failed to fetch coupons' })
  }
}

/**
 * GET /api/coupons/:id
 * Get coupon by ID
 */
const getCoupon = async (req, res) => {
  try {
    const { id } = req.params

    const { data: coupon, error } = await supabaseAdmin
      .from('coupon_codes')
      .select('*, created_by_admin:created_by(*)')
      .eq('id', id)
      .single()

    if (error || !coupon) {
      return res.status(404).json({ error: 'Coupon not found' })
    }

    // Get usage statistics
    const { data: usage } = await supabaseAdmin
      .from('coupon_usage')
      .select('id', { count: 'exact' })
      .eq('coupon_id', id)

    coupon.actual_usage_count = usage?.length || 0

    res.json({ coupon })
  } catch (err) {
    console.error('Get coupon error:', err)
    res.status(500).json({ error: 'Failed to fetch coupon' })
  }
}

/**
 * POST /api/coupons
 * Create coupon code
 */
const createCoupon = async (req, res) => {
  try {
    const {
      code,
      description,
      discount_type,
      discount_value,
      minimum_purchase_amount,
      maximum_discount_amount,
      currency = 'USD',
      valid_from,
      valid_until,
      usage_limit,
      per_user_limit = 1,
      is_active = true,
      applicable_to = 'all',
    } = req.body

    if (!code || !discount_type || !discount_value) {
      return res.status(400).json({ error: 'Missing required fields: code, discount_type, discount_value' })
    }

    if (!['percentage', 'fixed'].includes(discount_type)) {
      return res.status(400).json({ error: 'Invalid discount_type. Must be: percentage or fixed' })
    }

    // Check if code already exists
    const { data: existing } = await supabaseAdmin.from('coupon_codes').select('id').eq('code', code).single()

    if (existing) {
      return res.status(400).json({ error: 'Coupon code already exists' })
    }

    const { data: coupon, error } = await supabaseAdmin
      .from('coupon_codes')
      .insert({
        code: code.toUpperCase(),
        description,
        discount_type,
        discount_value: parseFloat(discount_value),
        minimum_purchase_amount: minimum_purchase_amount ? parseFloat(minimum_purchase_amount) : null,
        maximum_discount_amount: maximum_discount_amount ? parseFloat(maximum_discount_amount) : null,
        currency,
        valid_from: valid_from || new Date().toISOString(),
        valid_until,
        usage_limit: usage_limit ? parseInt(usage_limit) : null,
        usage_count: 0,
        per_user_limit: parseInt(per_user_limit),
        is_active,
        applicable_to,
        created_by: req.admin.id,
      })
      .select()
      .single()

    if (error) {
      return res.status(400).json({ error: error.message })
    }

    await logAdminActivity(req.admin.id, 'create_coupon', {
      target_type: 'coupon',
      target_id: coupon.id,
      ip: req.ip,
      extra: { code: coupon.code, discount_type, discount_value },
    })

    res.status(201).json({ coupon })
  } catch (err) {
    console.error('Create coupon error:', err)
    res.status(500).json({ error: 'Failed to create coupon' })
  }
}

/**
 * PUT /api/coupons/:id
 * Update coupon
 */
const updateCoupon = async (req, res) => {
  try {
    const { id } = req.params
    const updateData = {
      ...req.body,
      updated_at: new Date().toISOString(),
    }

    // Convert numeric fields
    if (updateData.discount_value !== undefined) {
      updateData.discount_value = parseFloat(updateData.discount_value)
    }
    if (updateData.minimum_purchase_amount !== undefined) {
      updateData.minimum_purchase_amount = updateData.minimum_purchase_amount
        ? parseFloat(updateData.minimum_purchase_amount)
        : null
    }
    if (updateData.maximum_discount_amount !== undefined) {
      updateData.maximum_discount_amount = updateData.maximum_discount_amount
        ? parseFloat(updateData.maximum_discount_amount)
        : null
    }
    if (updateData.usage_limit !== undefined) {
      updateData.usage_limit = updateData.usage_limit ? parseInt(updateData.usage_limit) : null
    }
    if (updateData.per_user_limit !== undefined) {
      updateData.per_user_limit = parseInt(updateData.per_user_limit)
    }

    // Uppercase code if provided
    if (updateData.code) {
      updateData.code = updateData.code.toUpperCase()
    }

    const { data: coupon, error } = await supabaseAdmin
      .from('coupon_codes')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error || !coupon) {
      return res.status(404).json({ error: 'Coupon not found or update failed' })
    }

    await logAdminActivity(req.admin.id, 'update_coupon', {
      target_type: 'coupon',
      target_id: id,
      ip: req.ip,
      extra: { code: coupon.code },
    })

    res.json({ coupon })
  } catch (err) {
    console.error('Update coupon error:', err)
    res.status(500).json({ error: 'Failed to update coupon' })
  }
}

/**
 * DELETE /api/coupons/:id
 * Delete coupon (soft delete by setting is_active to false)
 */
const deleteCoupon = async (req, res) => {
  try {
    const { id } = req.params

    const { data: coupon, error } = await supabaseAdmin
      .from('coupon_codes')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error || !coupon) {
      return res.status(404).json({ error: 'Coupon not found' })
    }

    await logAdminActivity(req.admin.id, 'delete_coupon', {
      target_type: 'coupon',
      target_id: id,
      ip: req.ip,
      extra: { code: coupon.code },
    })

    res.json({ message: 'Coupon deactivated successfully', coupon })
  } catch (err) {
    console.error('Delete coupon error:', err)
    res.status(500).json({ error: 'Failed to delete coupon' })
  }
}

/**
 * GET /api/coupons/:id/usage
 * Get coupon usage history
 */
const getCouponUsage = async (req, res) => {
  try {
    const { id } = req.params
    const { page = 0, limit = 50 } = req.query

    let query = supabaseAdmin
      .from('coupon_usage')
      .select('*, invoices:invoice_id(invoice_number)', {
        count: 'exact',
      })
      .eq('coupon_id', id)
      .order('used_at', { ascending: false })

    const from = parseInt(page) * parseInt(limit)
    const to = from + parseInt(limit) - 1
    query = query.range(from, to)

    const { data, error, count } = await query

    if (error) {
      return res.status(400).json({ error: error.message })
    }

    // Fetch user emails separately (auth.users is not directly joinable)
    const usageWithUsers = await Promise.all(
      (data || []).map(async (usage) => {
        try {
          const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(usage.user_id)
          return {
            ...usage,
            users: {
              email: authUser?.user?.email || null,
              first_name: authUser?.user?.user_metadata?.first_name || null,
              last_name: authUser?.user?.user_metadata?.last_name || null,
            },
          }
        } catch (err) {
          return {
            ...usage,
            users: {
              email: null,
              first_name: null,
              last_name: null,
            },
          }
        }
      })
    )

    res.json({
      usage: usageWithUsers,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count || 0,
        totalPages: Math.ceil((count || 0) / parseInt(limit)),
      },
    })
  } catch (err) {
    console.error('Get coupon usage error:', err)
    res.status(500).json({ error: 'Failed to fetch coupon usage' })
  }
}

module.exports = {
  listCoupons,
  getCoupon,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  getCouponUsage,
}
