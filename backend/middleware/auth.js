const { supabase, supabaseAdmin } = require('../config/supabase')

/**
 * Authenticate admin via Supabase JWT token
 * Expects: Authorization: Bearer <token>
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid authorization header' })
    }

    const token = authHeader.split(' ')[1]

    // Verify the token with Supabase
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token)

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid or expired token' })
    }

    // Fetch admin profile using service role client (bypasses RLS)
    const { data: adminProfile, error: profileError } = await supabaseAdmin
      .from('admin_profiles')
      .select('*')
      .eq('id', user.id)
      .eq('is_active', true)
      .single()

    if (profileError || !adminProfile) {
      return res.status(403).json({ error: 'Access denied. Not an authorized admin.' })
    }

    // Attach user and admin profile to request
    req.user = user
    req.admin = adminProfile
    req.token = token

    next()
  } catch (err) {
    console.error('Auth middleware error:', err)
    return res.status(500).json({ error: 'Authentication failed' })
  }
}

/**
 * Role-based access control middleware
 * @param  {...string} allowedRoles - Roles allowed to access the route
 */
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.admin) {
      return res.status(401).json({ error: 'Not authenticated' })
    }

    // Super admin can access everything
    if (req.admin.role === 'super_admin') {
      return next()
    }

    if (!allowedRoles.includes(req.admin.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' })
    }

    next()
  }
}

module.exports = { authenticate, authorize }
