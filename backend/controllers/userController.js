const { supabase, supabaseAdmin } = require('../config/supabase')
const { logAdminActivity } = require('../utils/logger')
const { sendEmail } = require('../config/email')
const { accountSuspendedTemplate } = require('../utils/emailTemplates')

/**
 * GET /api/users
 * List all users with search, filter, pagination
 */
const getUsers = async (req, res) => {
  try {
    const { search, status, page = 0, limit = 20 } = req.query
    const offset = parseInt(page) * parseInt(limit)

    let query = supabase
      .from('user_profiles')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + parseInt(limit) - 1)

    if (status && status !== 'all') {
      query = query.eq('account_status', status)
    }

    if (search) {
      query = query.or(
        `first_name.ilike.%${search}%,last_name.ilike.%${search}%,phone.ilike.%${search}%`
      )
    }

    const { data, count, error } = await query

    if (error) {
      return res.status(400).json({ error: error.message })
    }

    // Fetch emails from auth.users for each user
    const usersWithEmail = await Promise.all(
      (data || []).map(async (user) => {
        try {
          const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(user.id)
          return { ...user, email: authUser?.user?.email || null }
        } catch {
          return { ...user, email: null }
        }
      })
    )

    res.json({
      users: usersWithEmail,
      total: count || 0,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil((count || 0) / parseInt(limit)),
    })
  } catch (err) {
    console.error('Get users error:', err)
    res.status(500).json({ error: 'Failed to fetch users' })
  }
}

/**
 * GET /api/users/:id
 * Get single user detail
 */
const getUserById = async (req, res) => {
  try {
    const { id } = req.params

    const { data: user, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !user) {
      return res.status(404).json({ error: 'User not found' })
    }

    // Fetch email from auth
    let email = null
    try {
      const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(id)
      email = authUser?.user?.email || null
    } catch {}

    // Fetch login activity
    const { data: loginActivity } = await supabase
      .from('login_activity')
      .select('*')
      .eq('user_id', id)
      .order('login_at', { ascending: false })
      .limit(20)

    // Fetch security events
    const { data: securityEvents } = await supabase
      .from('security_events')
      .select('*')
      .eq('user_id', id)
      .order('created_at', { ascending: false })
      .limit(20)

    // Fetch notifications
    const { data: notifications } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', id)
      .order('created_at', { ascending: false })
      .limit(20)

    res.json({
      user: { ...user, email },
      loginActivity: loginActivity || [],
      securityEvents: securityEvents || [],
      notifications: notifications || [],
    })
  } catch (err) {
    console.error('Get user error:', err)
    res.status(500).json({ error: 'Failed to fetch user' })
  }
}

/**
 * PATCH /api/users/:id/suspend
 * Suspend a user
 */
const suspendUser = async (req, res) => {
  try {
    const { id } = req.params
    const { reason } = req.body

    const { data: user, error: fetchError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !user) {
      return res.status(404).json({ error: 'User not found' })
    }

    const { error } = await supabase
      .from('user_profiles')
      .update({
        account_status: 'suspended',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (error) throw error

    await logAdminActivity(req.admin.id, 'user_suspend', {
      target_type: 'user',
      target_id: id,
      ip: req.ip,
      extra: {
        user_name: `${user.first_name || ''} ${user.last_name || ''}`.trim(),
        previous_status: user.account_status,
        reason,
      },
    })

    // Send suspension email
    try {
      const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(id)
      if (authUser?.user?.email) {
        const template = accountSuspendedTemplate(authUser.user.email, reason)
        await sendEmail(authUser.user.email, template.subject, template.html)
      }
    } catch (emailErr) {
      console.error('Failed to send suspension email:', emailErr)
    }

    res.json({ success: true, message: 'User suspended successfully' })
  } catch (err) {
    console.error('Suspend user error:', err)
    res.status(500).json({ error: 'Failed to suspend user' })
  }
}

/**
 * PATCH /api/users/:id/unsuspend
 * Unsuspend a user
 */
const unsuspendUser = async (req, res) => {
  try {
    const { id } = req.params

    const { data: user, error: fetchError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !user) {
      return res.status(404).json({ error: 'User not found' })
    }

    const { error } = await supabase
      .from('user_profiles')
      .update({
        account_status: 'active',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (error) throw error

    await logAdminActivity(req.admin.id, 'user_unsuspend', {
      target_type: 'user',
      target_id: id,
      ip: req.ip,
      extra: {
        user_name: `${user.first_name || ''} ${user.last_name || ''}`.trim(),
        previous_status: user.account_status,
      },
    })

    res.json({ success: true, message: 'User unsuspended successfully' })
  } catch (err) {
    console.error('Unsuspend user error:', err)
    res.status(500).json({ error: 'Failed to unsuspend user' })
  }
}

/**
 * PATCH /api/users/:id/reset-email-verification
 * Force reset email verification for a user
 */
const resetEmailVerification = async (req, res) => {
  try {
    const { id } = req.params

    const { error } = await supabase
      .from('user_profiles')
      .update({
        email_verified: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (error) throw error

    await logAdminActivity(req.admin.id, 'force_email_verification_reset', {
      target_type: 'user',
      target_id: id,
      ip: req.ip,
    })

    res.json({ success: true, message: 'Email verification reset' })
  } catch (err) {
    console.error('Reset email verification error:', err)
    res.status(500).json({ error: 'Failed to reset email verification' })
  }
}

/**
 * PATCH /api/users/:id/reset-password
 * Reset user password (sends password reset email via Supabase)
 */
const resetUserPassword = async (req, res) => {
  try {
    const { id } = req.params

    // Get user email from auth
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.getUserById(id)

    if (authError || !authUser?.user?.email) {
      return res.status(404).json({ error: 'User email not found' })
    }

    // Send password reset email via Supabase
    const { error } = await supabase.auth.resetPasswordForEmail(authUser.user.email, {
      redirectTo: `${process.env.FRONTEND_URL}/reset-password`,
    })

    if (error) throw error

    await logAdminActivity(req.admin.id, 'user_password_reset', {
      target_type: 'user',
      target_id: id,
      ip: req.ip,
      extra: { email: authUser.user.email },
    })

    res.json({ success: true, message: 'Password reset email sent' })
  } catch (err) {
    console.error('Reset password error:', err)
    res.status(500).json({ error: 'Failed to reset password' })
  }
}

/**
 * DELETE /api/users/:id
 * Soft-delete a user (GDPR-style)
 */
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params

    const { data: user, error: fetchError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !user) {
      return res.status(404).json({ error: 'User not found' })
    }

    const { error } = await supabase
      .from('user_profiles')
      .update({
        account_status: 'deleted',
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (error) throw error

    await logAdminActivity(req.admin.id, 'user_soft_delete', {
      target_type: 'user',
      target_id: id,
      ip: req.ip,
      extra: {
        user_name: `${user.first_name || ''} ${user.last_name || ''}`.trim(),
      },
    })

    res.json({ success: true, message: 'User deleted successfully' })
  } catch (err) {
    console.error('Delete user error:', err)
    res.status(500).json({ error: 'Failed to delete user' })
  }
}

module.exports = {
  getUsers,
  getUserById,
  suspendUser,
  unsuspendUser,
  resetEmailVerification,
  resetUserPassword,
  deleteUser,
}
