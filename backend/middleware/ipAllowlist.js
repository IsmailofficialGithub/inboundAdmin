const { supabaseAdmin } = require('../config/supabase')

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

    if (!clientIP) {
      return res.status(403).json({ error: 'Unable to determine IP address' })
    }

    // Check global IP allowlist first
    const { data: globalAllowlist } = await supabaseAdmin
      .from('global_ip_allowlist')
      .select('ip_address')
      .eq('is_active', true)

    if (globalAllowlist && globalAllowlist.length > 0) {
      const isAllowed = globalAllowlist.some((entry) => {
        try {
          // Check if IP matches CIDR
          const cidr = entry.ip_address
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
      })

      if (!isAllowed) {
        return res.status(403).json({
          error: 'Access denied. Your IP address is not in the allowlist.',
        })
      }
    }

    // Check admin-specific IP allowlist
    const { data: adminAllowlist } = await supabaseAdmin
      .from('admin_ip_allowlist')
      .select('ip_address')
      .eq('admin_id', req.admin.id)
      .eq('is_active', true)

    if (adminAllowlist && adminAllowlist.length > 0) {
      const isAllowed = adminAllowlist.some((entry) => {
        try {
          const cidr = entry.ip_address
          if (cidr.includes('/')) {
            const [network, prefix] = cidr.split('/')
            return isIPInCIDR(clientIP, network, parseInt(prefix))
          } else {
            return clientIP === cidr
          }
        } catch {
          return false
        }
      })

      if (!isAllowed) {
        return res.status(403).json({
          error: 'Access denied. Your IP address is not in your personal allowlist.',
        })
      }
    }

    // If no allowlist entries exist, allow access (optional feature)
    next()
  } catch (err) {
    console.error('IP allowlist check error:', err)
    // On error, allow access (fail open) - you may want to change this
    next()
  }
}

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

module.exports = { checkIPAllowlist }
