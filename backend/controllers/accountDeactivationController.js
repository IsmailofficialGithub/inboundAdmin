const { supabaseAdmin } = require('../config/supabase')
const { logAdminActivity } = require('../utils/logger')

/**
 * GET /api/account-deactivations
 * List all account deactivation requests with filters
 */
const getDeactivationRequests = async (req, res) => {
  try {
    const { status, page = 0, limit = 50, user_id } = req.query
    const offset = parseInt(page) * parseInt(limit)

    let query = supabaseAdmin
      .from('account_deactivation_requests')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + parseInt(limit) - 1)

    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    if (user_id) {
      query = query.eq('user_id', user_id)
    }

    const { data, count, error } = await query

    if (error) {
      // If table doesn't exist or other database error, return empty array instead of error
      if (error.code === '42P01' || error.message.includes('does not exist')) {
        return res.json({
          requests: [],
          total: 0,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: 0,
        })
      }
      console.error('Database error:', error)
      return res.status(400).json({ error: error.message })
    }

    // Fetch user emails
    const requestsWithUsers = await Promise.all(
      (data || []).map(async (request) => {
        let email = null
        try {
          const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(request.user_id)
          email = authUser?.user?.email || null
        } catch {}
        return { ...request, user_email: email }
      })
    )

    res.json({
      requests: requestsWithUsers,
      total: count || 0,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil((count || 0) / parseInt(limit)),
    })
  } catch (err) {
    console.error('Get deactivation requests error:', err)
    res.status(500).json({ error: 'Failed to fetch deactivation requests' })
  }
}

/**
 * GET /api/account-deactivations/:id
 * Get single deactivation request
 */
const getDeactivationRequest = async (req, res) => {
  try {
    const { id } = req.params

    const { data: request, error } = await supabaseAdmin
      .from('account_deactivation_requests')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !request) {
      return res.status(404).json({ error: 'Deactivation request not found' })
    }

    // Fetch user email
    let email = null
    try {
      const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(request.user_id)
      email = authUser?.user?.email || null
    } catch {}

    res.json({ ...request, user_email: email })
  } catch (err) {
    console.error('Get deactivation request error:', err)
    res.status(500).json({ error: 'Failed to fetch deactivation request' })
  }
}

/**
 * POST /api/account-deactivations/:id/approve
 * Approve account deactivation request
 */
const approveDeactivation = async (req, res) => {
  try {
    const { id } = req.params
    const { notes } = req.body

    // Get the request
    const { data: request, error: fetchError } = await supabaseAdmin
      .from('account_deactivation_requests')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !request) {
      return res.status(404).json({ error: 'Deactivation request not found' })
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ error: 'Request is not pending' })
    }

    // Update request status
    const { data: updatedRequest, error: updateError } = await supabaseAdmin
      .from('account_deactivation_requests')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      return res.status(400).json({ error: updateError.message })
    }

    // Update user profile status to deleted
    const { error: userError } = await supabaseAdmin
      .from('user_profiles')
      .update({ account_status: 'deleted' })
      .eq('id', request.user_id)

    if (userError) {
      console.error('Error updating user profile:', userError)
    }

    // Log admin activity
    await logAdminActivity(req.admin.id, 'approve_account_deactivation', {
      target_type: 'account_deactivation_request',
      target_id: id,
      user_id: request.user_id,
      notes,
    })

    res.json({
      message: 'Account deactivation approved',
      request: updatedRequest,
    })
  } catch (err) {
    console.error('Approve deactivation error:', err)
    res.status(500).json({ error: 'Failed to approve deactivation' })
  }
}

/**
 * POST /api/account-deactivations/:id/reject
 * Reject account deactivation request
 */
const rejectDeactivation = async (req, res) => {
  try {
    const { id } = req.params
    const { notes } = req.body

    // Get the request
    const { data: request, error: fetchError } = await supabaseAdmin
      .from('account_deactivation_requests')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !request) {
      return res.status(404).json({ error: 'Deactivation request not found' })
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ error: 'Request is not pending' })
    }

    // Update request status
    const { data: updatedRequest, error: updateError } = await supabaseAdmin
      .from('account_deactivation_requests')
      .update({
        status: 'cancelled',
      })
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      return res.status(400).json({ error: updateError.message })
    }

    // Log admin activity
    await logAdminActivity(req.admin.id, 'reject_account_deactivation', {
      target_type: 'account_deactivation_request',
      target_id: id,
      user_id: request.user_id,
      notes,
    })

    res.json({
      message: 'Account deactivation rejected',
      request: updatedRequest,
    })
  } catch (err) {
    console.error('Reject deactivation error:', err)
    res.status(500).json({ error: 'Failed to reject deactivation' })
  }
}

module.exports = {
  getDeactivationRequests,
  getDeactivationRequest,
  approveDeactivation,
  rejectDeactivation,
}
