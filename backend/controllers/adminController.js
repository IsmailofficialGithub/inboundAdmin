const { supabaseAdmin } = require('../config/supabase')
const { logAdminActivity } = require('../utils/logger')
const { sendEmail } = require('../config/email')
const { accountCreatedTemplate, adminPasswordResetTemplate } = require('../utils/emailTemplates')

/**
 * Generate a random password
 */
const generateRandomPassword = (length = 12) => {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const lowercase = 'abcdefghijklmnopqrstuvwxyz'
  const numbers = '0123456789'
  const symbols = '!@#$%&*'
  const all = uppercase + lowercase + numbers + symbols

  // Ensure at least one of each type
  let password = ''
  password += uppercase[Math.floor(Math.random() * uppercase.length)]
  password += lowercase[Math.floor(Math.random() * lowercase.length)]
  password += numbers[Math.floor(Math.random() * numbers.length)]
  password += symbols[Math.floor(Math.random() * symbols.length)]

  for (let i = password.length; i < length; i++) {
    password += all[Math.floor(Math.random() * all.length)]
  }

  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('')
}

/**
 * GET /api/admin/dashboard
 * Dashboard stats
 */
const getDashboardStats = async (req, res) => {
  try {
    // Total users
    const { count: totalUsers } = await supabaseAdmin
      .from('user_profiles')
      .select('*', { count: 'exact', head: true })

    // Active users
    const { count: activeUsers } = await supabaseAdmin
      .from('user_profiles')
      .select('*', { count: 'exact', head: true })
      .eq('account_status', 'active')

    // Suspended users
    const { count: suspendedUsers } = await supabaseAdmin
      .from('user_profiles')
      .select('*', { count: 'exact', head: true })
      .eq('account_status', 'suspended')

    // Security events (last 24h)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { count: recentSecurityEvents } = await supabaseAdmin
      .from('security_events')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', oneDayAgo)

    // Recent admin activity
    const { data: recentActivity } = await supabaseAdmin
      .from('admin_activity_log')
      .select('*, admin_profiles(email, first_name, last_name)')
      .order('created_at', { ascending: false })
      .limit(10)

    // Recently registered users
    const { data: recentUsersRaw } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5)

    // Attach emails to recent users
    const recentUsers = await Promise.all(
      (recentUsersRaw || []).map(async (user) => {
        try {
          const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(user.id)
          return { ...user, email: authUser?.user?.email || null }
        } catch {
          return { ...user, email: null }
        }
      })
    )

    res.json({
      stats: {
        totalUsers: totalUsers || 0,
        activeUsers: activeUsers || 0,
        suspendedUsers: suspendedUsers || 0,
        recentSecurityEvents: recentSecurityEvents || 0,
      },
      recentActivity: recentActivity || [],
      recentUsers,
    })
  } catch (err) {
    console.error('Dashboard stats error:', err)
    res.status(500).json({ error: 'Failed to fetch dashboard data' })
  }
}

/**
 * GET /api/admin/activity-log
 * Get admin activity log
 */
const getActivityLog = async (req, res) => {
  try {
    const { page = 0, limit = 50 } = req.query
    const offset = parseInt(page) * parseInt(limit)

    const { data, count, error } = await supabaseAdmin
      .from('admin_activity_log')
      .select('*, admin_profiles(email, first_name, last_name)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + parseInt(limit) - 1)

    if (error) {
      return res.status(400).json({ error: error.message })
    }

    res.json({
      activities: data || [],
      total: count || 0,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil((count || 0) / parseInt(limit)),
    })
  } catch (err) {
    console.error('Activity log error:', err)
    res.status(500).json({ error: 'Failed to fetch activity log' })
  }
}

/**
 * GET /api/admin/security-events
 * Get security events
 */
const getSecurityEvents = async (req, res) => {
  try {
    const { page = 0, limit = 50, severity } = req.query
    const offset = parseInt(page) * parseInt(limit)

    let query = supabaseAdmin
      .from('security_events')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + parseInt(limit) - 1)

    if (severity) {
      query = query.eq('severity', severity)
    }

    const { data, count, error } = await query

    if (error) {
      return res.status(400).json({ error: error.message })
    }

    res.json({
      events: data || [],
      total: count || 0,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil((count || 0) / parseInt(limit)),
    })
  } catch (err) {
    console.error('Security events error:', err)
    res.status(500).json({ error: 'Failed to fetch security events' })
  }
}

/**
 * POST /api/admin/create-admin
 * Create a new admin user (Super Admin only)
 */
const createAdmin = async (req, res) => {
  try {
    const { email, password, first_name, last_name, role } = req.body

    if (!email || !password || !role) {
      return res.status(400).json({ error: 'Email, password, and role are required' })
    }

    const validRoles = ['super_admin', 'finance', 'support', 'ops']
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: `Invalid role. Must be one of: ${validRoles.join(', ')}` })
    }

    // Create user in Supabase auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

    if (authError) {
      return res.status(400).json({ error: authError.message })
    }

    // Create admin profile
    const { error: profileError } = await supabaseAdmin.from('admin_profiles').insert({
      id: authData.user.id,
      email,
      first_name: first_name || null,
      last_name: last_name || null,
      role,
      is_active: true,
    })

    if (profileError) {
      // Rollback: delete the auth user if profile creation fails
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      return res.status(400).json({ error: profileError.message })
    }

    await logAdminActivity(req.admin.id, 'admin_created', {
      target_type: 'admin',
      target_id: authData.user.id,
      ip: req.ip,
      extra: { email, role },
    })

    // Send welcome email
    try {
      const template = accountCreatedTemplate(email, password)
      await sendEmail(email, template.subject, template.html)
    } catch (emailErr) {
      console.error('Failed to send welcome email:', emailErr)
    }

    res.status(201).json({
      success: true,
      message: 'Admin created successfully',
      admin: {
        id: authData.user.id,
        email,
        first_name,
        last_name,
        role,
      },
    })
  } catch (err) {
    console.error('Create admin error:', err)
    res.status(500).json({ error: 'Failed to create admin' })
  }
}

/**
 * GET /api/admin/admins
 * List all admin users (Super Admin only)
 */
const getAdmins = async (req, res) => {
  try {
    const { page = 0, limit = 50, role, search } = req.query
    const offset = parseInt(page) * parseInt(limit)

    let query = supabaseAdmin
      .from('admin_profiles')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + parseInt(limit) - 1)

    if (role && role !== 'all') {
      query = query.eq('role', role)
    }

    if (search) {
      query = query.or(
        `email.ilike.%${search}%,first_name.ilike.%${search}%,last_name.ilike.%${search}%`
      )
    }

    const { data, count, error } = await query

    if (error) {
      return res.status(400).json({ error: error.message })
    }

    res.json({
      admins: data || [],
      total: count || 0,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil((count || 0) / parseInt(limit)),
    })
  } catch (err) {
    console.error('Get admins error:', err)
    res.status(500).json({ error: 'Failed to fetch admins' })
  }
}

/**
 * PATCH /api/admin/reset-password/:adminId
 * Reset admin password (Super Admin only)
 */
const resetAdminPassword = async (req, res) => {
  try {
    const { adminId } = req.params
    const { password, generate_password } = req.body

    // Check if admin exists
    const { data: targetAdmin, error: fetchError } = await supabaseAdmin
      .from('admin_profiles')
      .select('*')
      .eq('id', adminId)
      .single()

    if (fetchError || !targetAdmin) {
      return res.status(404).json({ error: 'Admin not found' })
    }

    // Use provided password (frontend generates it if generate_password is true)
    // If generate_password is true but no password provided, generate one
    let newPassword = password
    if (generate_password && !password) {
      newPassword = generateRandomPassword()
    }

    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long' })
    }

    // Update password using Supabase Admin API
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(adminId, {
      password: newPassword,
    })

    if (updateError) {
      return res.status(400).json({ error: `Failed to update password: ${updateError.message}` })
    }

    // Log the password reset activity
    await logAdminActivity(req.admin.id, 'admin_password_reset', {
      target_type: 'admin',
      target_id: adminId,
      ip: req.ip,
      extra: {
        target_admin_email: targetAdmin.email,
        password_generated: generate_password || !password,
      },
    })

    // Send email with new password via SendGrid
    try {
      const template = adminPasswordResetTemplate(targetAdmin.email, newPassword)
      const emailResult = await sendEmail(targetAdmin.email, template.subject, template.html)
      
      if (!emailResult.success) {
        console.error('Failed to send password reset email:', emailResult.error)
        // Continue even if email fails - password is still reset
      }
    } catch (emailErr) {
      console.error('Failed to send password reset email:', emailErr)
      // Don't fail the request if email fails - password is still reset
    }

    res.json({
      success: true,
      message: 'Password reset successfully. Email sent with new password via SendGrid.',
      password: newPassword, // Always return password so admin can see it
    })
  } catch (err) {
    console.error('Reset admin password error:', err)
    res.status(500).json({ error: 'Failed to reset password' })
  }
}

module.exports = {
  getDashboardStats,
  getActivityLog,
  getSecurityEvents,
  createAdmin,
  getAdmins,
  resetAdminPassword,
}
