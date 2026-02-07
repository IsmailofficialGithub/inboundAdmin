const { supabase, supabaseAdmin } = require('../config/supabase')

/**
 * Get header value case-insensitively
 * Production proxies/load balancers often lowercase headers
 */
const getHeader = (req, headerName) => {
  const lowerName = headerName.toLowerCase()
  // Check common variations
  return (
    req.headers[headerName] ||
    req.headers[lowerName] ||
    req.headers[headerName.toLowerCase()] ||
    req.headers[headerName.toUpperCase()]
  )
}

/**
 * Authenticate admin via Supabase JWT token
 * Expects: Authorization: Bearer <token>
 */
const authenticate = async (req, res, next) => {
  try {
    // Handle case-insensitive headers (production proxies often lowercase headers)
    const authHeader = getHeader(req, 'authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // Log for debugging in production
      if (process.env.NODE_ENV === 'production') {
        console.error('Auth failed - Missing Authorization header', {
          hasAuthHeader: !!authHeader,
          headerValue: authHeader ? 'present but invalid' : 'missing',
          availableHeaders: Object.keys(req.headers).filter(k => k.toLowerCase().includes('auth')),
          method: req.method,
          path: req.path,
        })
      }
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

    // Check if user has been force logged out
    if (user.app_metadata?.force_logout) {
      return res.status(401).json({ error: 'Your session has been revoked. Please log in again.' })
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
