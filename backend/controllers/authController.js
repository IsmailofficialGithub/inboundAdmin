const { supabase } = require('../config/supabase')
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

    // Log the login activity
    await logAdminActivity(data.user.id, 'admin_login', {
      ip: req.ip,
      extra: { email },
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

module.exports = { login, logout, getMe, refreshToken }
