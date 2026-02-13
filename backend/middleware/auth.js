const { supabase, supabaseAdmin } = require('../config/supabase')
const { checkIPAllowlist } = require('./ipAllowlist')

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
 * Parse cookies from request
 * @param {object} req - Express request object
 * @returns {object} Parsed cookies object
 */
const parseCookies = (req) => {
  const cookies = {}
  const cookieHeader = req.headers.cookie || req.headers.Cookie || ''
  
  if (cookieHeader) {
    cookieHeader.split(';').forEach((cookie) => {
      const parts = cookie.trim().split('=')
      if (parts.length === 2) {
        const name = parts[0].trim()
        let value = parts[1].trim()
        // Decode URL-encoded values
        try {
          value = decodeURIComponent(value)
        } catch (e) {
          // If decoding fails, use original value
        }
        cookies[name] = value
      }
    })
  }
  
  return cookies
}

/**
 * Extract token from cookies
 * Handles both sb-auth-token (Supabase format) and auth_token (custom format)
 * @param {object} req - Express request object
 * @returns {string|null} Token or null if not found
 */
const getTokenFromCookies = (req) => {
  const cookies = parseCookies(req)
  
  // Check for auth_token cookie (our custom format - just the token)
  if (cookies.auth_token) {
    return cookies.auth_token
  }
  
  // Check for sb-auth-token (Supabase format - JSON object with access_token)
  if (cookies['sb-auth-token']) {
    try {
      const sessionData = JSON.parse(cookies['sb-auth-token'])
      if (sessionData && sessionData.access_token) {
        return sessionData.access_token
      }
    } catch (e) {
      // If parsing fails, try to use the cookie value directly as token
      // (in case it's just the token string, not JSON)
      return cookies['sb-auth-token']
    }
  }
  
  return null
}

/**
 * Authenticate admin via Supabase JWT token
 * Expects: Authorization: Bearer <token>
 */
const authenticate = async (req, res, next) => {
  try {
    let token = null
    
    // First, try to get token from Authorization header
    const authHeader = getHeader(req, 'authorization')
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1]
    }
    
    // If no token in header, try to get from cookies (for production environments)
    if (!token) {
      token = getTokenFromCookies(req)
    }
    
    // If still no token, return error
    if (!token) {
      // Log for debugging in production
      if (process.env.NODE_ENV === 'production') {
        const cookies = parseCookies(req)
        console.error('Auth failed - Missing token', {
          hasAuthHeader: !!authHeader,
          hasCookies: Object.keys(cookies).length > 0,
          cookieNames: Object.keys(cookies),
          hasAuthTokenCookie: !!cookies.auth_token,
          hasSbAuthTokenCookie: !!cookies['sb-auth-token'],
          method: req.method,
          path: req.path,
        })
      }
      return res.status(401).json({ error: 'Missing or invalid authorization header' })
    }

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

    // Check IP allowlist after authentication
    // This will call next() if allowed, or return 403 if not
    return checkIPAllowlist(req, res, next)
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
