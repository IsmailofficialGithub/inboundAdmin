const { supabaseAdmin } = require('../config/supabase')

/**
 * Helper function to check if IP is in CIDR range
 */
function isIPInCIDR(ip, network, prefix) {
  try {
    const ipParts = ip.split('.').map(Number)
    const networkParts = network.split('.').map(Number)

    if (ipParts.length !== 4 || networkParts.length !== 4) {
      return false
    }

    const ipNum = (ipParts[0] << 24) | (ipParts[1] << 16) | (ipParts[2] << 8) | ipParts[3]
    const networkNum = (networkParts[0] << 24) | (networkParts[1] << 16) | (networkParts[2] << 8) | networkParts[3]
    const mask = ~((1 << (32 - prefix)) - 1)

    return (ipNum & mask) === (networkNum & mask)
  } catch {
    return false
  }
}

/**
 * Check if an IP address matches an allowlist entry
 */
function checkIPMatch(clientIP, allowlistEntry) {
  try {
    const cidr = allowlistEntry.ip_address
    if (cidr.includes('/')) {
      // CIDR notation
      const [network, prefix] = cidr.split('/')
      return isIPInCIDR(clientIP, network, parseInt(prefix))
    } else {
      // Exact IP match
      return clientIP === cidr
    }
  } catch {
    return false
  }
}

/**
 * Check IP allowlist for a specific admin (used in login and middleware)
 * @param {string} adminId - Admin ID to check
 * @param {string} clientIP - Client IP address
 * @returns {Promise<{allowed: boolean, reason?: string}>}
 */
const checkIPAllowlistForAdmin = async (adminId, clientIP) => {
  try {
    if (!clientIP) {
      return { allowed: false, reason: 'Unable to determine IP address' }
    }

    // Check global IP allowlist first
    const { data: globalAllowlist } = await supabaseAdmin
      .from('global_ip_allowlist')
      .select('ip_address')
      .eq('is_active', true)

    if (globalAllowlist && globalAllowlist.length > 0) {
      const isAllowed = globalAllowlist.some((entry) => checkIPMatch(clientIP, entry))

      if (!isAllowed) {
        return { 
          allowed: false, 
          reason: 'Access denied. Your IP address is not in the global allowlist.' 
        }
      }
      // If global allowlist exists and IP is allowed, grant access
      return { allowed: true }
    }

    // Check admin-specific IP allowlist
    const { data: adminAllowlist } = await supabaseAdmin
      .from('admin_ip_allowlist')
      .select('ip_address')
      .eq('admin_id', adminId)
      .eq('is_active', true)

    if (adminAllowlist && adminAllowlist.length > 0) {
      const isAllowed = adminAllowlist.some((entry) => checkIPMatch(clientIP, entry))

      if (!isAllowed) {
        return { 
          allowed: false, 
          reason: 'Access denied. Your IP address is not in your personal allowlist.' 
        }
      }
      // If admin allowlist exists and IP is allowed, grant access
      return { allowed: true }
    }

    // If no allowlist entries exist, allow access (optional feature - fail open)
    // To make it mandatory, change this to: return { allowed: false, reason: 'No IP allowlist configured' }
    return { allowed: true }
  } catch (err) {
    console.error('IP allowlist check error:', err)
    // On error, fail open (allow access) - change to fail closed if needed
    return { allowed: true }
  }
}

/**
 * Middleware to check if admin IP is in allowlist
 * Only applies if IP allowlist is enabled for the admin
 */
const checkIPAllowlist = async (req, res, next) => {
  try {
    // Skip if no admin is authenticated (will be caught by auth middleware)
    if (!req.admin) {
      return next()
    }

    const clientIP = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for']?.split(',')[0]?.trim()
    const result = await checkIPAllowlistForAdmin(req.admin.id, clientIP)

    if (!result.allowed) {
      return res.status(403).json({
        error: result.reason || 'Access denied. Your IP address is not in the allowlist.',
      })
    }

    next()
  } catch (err) {
    console.error('IP allowlist middleware error:', err)
    // On error, allow access (fail open) - you may want to change this
    next()
  }
}

module.exports = { checkIPAllowlist, checkIPAllowlistForAdmin }
