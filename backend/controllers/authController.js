const { supabase, supabaseAdmin } = require('../config/supabase')
const { logAdminActivity } = require('../utils/logger')

/**
 * POST /api/auth/login
 * Admin login
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' })
    }

    // Sign in with Supabase
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      return res.status(401).json({ error: error.message })
    }

    // Check if user is an admin
    const { data: adminProfile, error: profileError } = await supabase
      .from('admin_profiles')
      .select('*')
      .eq('id', data.user.id)
      .eq('is_active', true)
      .single()

    if (profileError || !adminProfile) {
      await supabase.auth.signOut()
      return res.status(403).json({ error: 'Access denied. You are not authorized as an admin.' })
    }

    // Update last login
    await supabase
      .from('admin_profiles')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', data.user.id)

    // Extract device/browser info from headers
    const userAgent = req.headers['user-agent'] || ''
    const deviceInfo = {
      user_agent: userAgent,
      ip_address: req.ip || req.connection.remoteAddress,
    }

    // Log the login activity with device info
    await logAdminActivity(data.user.id, 'admin_login', {
      ip: req.ip,
      extra: { email, ...deviceInfo },
    })

    // Map role to URL prefix
    const rolePrefixMap = {
      super_admin: 'admin',
      finance: 'finance',
      support: 'support',
      ops: 'ops',
    }

    res.json({
      success: true,
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at,
      },
      admin: {
        id: adminProfile.id,
        email: adminProfile.email,
        first_name: adminProfile.first_name,
        last_name: adminProfile.last_name,
        role: adminProfile.role,
        rolePrefix: rolePrefixMap[adminProfile.role] || 'admin',
      },
    })
  } catch (err) {
    console.error('Login error:', err)
    res.status(500).json({ error: 'Login failed' })
  }
}

/**
 * POST /api/auth/logout
 * Admin logout
 */
const logout = async (req, res) => {
  try {
    await logAdminActivity(req.admin.id, 'admin_logout', { ip: req.ip })
    await supabase.auth.signOut()
    res.json({ success: true, message: 'Logged out successfully' })
  } catch (err) {
    console.error('Logout error:', err)
    res.status(500).json({ error: 'Logout failed' })
  }
}

/**
 * GET /api/auth/me
 * Get current admin profile
 */
const getMe = async (req, res) => {
  try {
    const rolePrefixMap = {
      super_admin: 'admin',
      finance: 'finance',
      support: 'support',
      ops: 'ops',
    }

    res.json({
      admin: {
        id: req.admin.id,
        email: req.admin.email,
        first_name: req.admin.first_name,
        last_name: req.admin.last_name,
        role: req.admin.role,
        rolePrefix: rolePrefixMap[req.admin.role] || 'admin',
        is_active: req.admin.is_active,
        last_login_at: req.admin.last_login_at,
        created_at: req.admin.created_at,
      },
    })
  } catch (err) {
    console.error('Get me error:', err)
    res.status(500).json({ error: 'Failed to fetch profile' })
  }
}

/**
 * POST /api/auth/refresh
 * Refresh session token
 */
const refreshToken = async (req, res) => {
  try {
    const { refresh_token } = req.body

    if (!refresh_token) {
      return res.status(400).json({ error: 'Refresh token is required' })
    }

    const { data, error } = await supabase.auth.refreshSession({ refresh_token })

    if (error) {
      return res.status(401).json({ error: 'Failed to refresh session' })
    }

    res.json({
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at,
      },
    })
  } catch (err) {
    console.error('Refresh token error:', err)
    res.status(500).json({ error: 'Token refresh failed' })
  }
}

/**
 * PUT /api/auth/profile
 * Update current admin profile
 * Note: Email cannot be changed through this endpoint
 */
const updateProfile = async (req, res) => {
  try {
    const { first_name, last_name } = req.body
    const adminId = req.admin.id

    // Reject email updates if attempted
    if (req.body.email !== undefined) {
      return res.status(400).json({ error: 'Email cannot be changed. Please contact an administrator.' })
    }

    // Build update object (only include fields that were provided)
    const updateData = { updated_at: new Date().toISOString() }
    if (first_name !== undefined) updateData.first_name = first_name
    if (last_name !== undefined) updateData.last_name = last_name

    // Update admin profile
    const { error: profileError } = await supabaseAdmin
      .from('admin_profiles')
      .update(updateData)
      .eq('id', adminId)

    if (profileError) throw profileError

    // Log the profile update activity
    await logAdminActivity(adminId, 'admin_profile_updated', {
      ip: req.ip,
      extra: {
        updated_fields: Object.keys(updateData).filter((k) => k !== 'updated_at'),
      },
    })

    // Fetch updated admin profile
    const { data: updatedProfile, error: fetchError } = await supabaseAdmin
      .from('admin_profiles')
      .select('*')
      .eq('id', adminId)
      .single()

    if (fetchError) throw fetchError

    const rolePrefixMap = {
      super_admin: 'admin',
      finance: 'finance',
      support: 'support',
      ops: 'ops',
    }

    res.json({
      success: true,
      message: 'Profile updated successfully',
      admin: {
        id: updatedProfile.id,
        email: updatedProfile.email,
        first_name: updatedProfile.first_name,
        last_name: updatedProfile.last_name,
        role: updatedProfile.role,
        rolePrefix: rolePrefixMap[updatedProfile.role] || 'admin',
        is_active: updatedProfile.is_active,
        last_login_at: updatedProfile.last_login_at,
        created_at: updatedProfile.created_at,
      },
    })
  } catch (err) {
    console.error('Update profile error:', err)
    res.status(500).json({ error: 'Failed to update profile' })
  }
}

/**
 * GET /api/auth/sessions
 * Get current admin's login sessions/IP logs
 */
const getSessions = async (req, res) => {
  try {
    const adminId = req.admin.id

    // Get login activities from admin_activity_log
    const { data: loginActivities, error } = await supabaseAdmin
      .from('admin_activity_log')
      .select('*')
      .eq('admin_id', adminId)
      .eq('action', 'admin_login')
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) throw error

    // Format sessions data
    const sessions = (loginActivities || []).map((activity) => ({
      id: activity.id,
      login_at: activity.created_at,
      ip_address: activity.ip_address,
      user_agent: activity.details?.user_agent || '-',
      device_info: activity.details || {},
    }))

    res.json({
      success: true,
      sessions,
    })
  } catch (err) {
    console.error('Get sessions error:', err)
    res.status(500).json({ error: 'Failed to fetch sessions' })
  }
}

/**
 * POST /api/auth/force-logout/:adminId
 * Force logout an admin (revoke all sessions) - Super Admin only
 */
const forceLogout = async (req, res) => {
  try {
    const { adminId } = req.params
    const currentAdminId = req.admin.id

    // Only super_admin can force logout
    if (req.admin.role !== 'super_admin') {
      return res.status(403).json({ error: 'Only super admins can force logout other admins' })
    }

    // Check if admin exists
    const { data: targetAdmin, error: fetchError } = await supabaseAdmin
      .from('admin_profiles')
      .select('*')
      .eq('id', adminId)
      .single()

    if (fetchError || !targetAdmin) {
      return res.status(404).json({ error: 'Admin not found' })
    }

    // Revoke all sessions for the admin using Supabase Admin API
    const { error: revokeError } = await supabaseAdmin.auth.admin.signOut(adminId)

    if (revokeError) {
      console.error('Force logout error:', revokeError)
      // Continue even if there's an error - the admin might not have active sessions
    }

    // Log the force logout activity
    await logAdminActivity(currentAdminId, 'admin_force_logout', {
      ip: req.ip,
      extra: {
        target_admin_id: adminId,
        target_admin_email: targetAdmin.email,
      },
    })

    res.json({
      success: true,
      message: `Successfully logged out ${targetAdmin.email}`,
    })
  } catch (err) {
    console.error('Force logout error:', err)
    res.status(500).json({ error: 'Failed to force logout' })
  }
}

module.exports = { login, logout, getMe, refreshToken, updateProfile, getSessions, forceLogout }
