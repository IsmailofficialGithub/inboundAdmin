const { supabaseAdmin } = require('../config/supabase')

/**
 * Middleware to check maintenance mode
 * Blocks all requests except health checks and status endpoints
 */
const checkMaintenanceMode = async (req, res, next) => {
  try {
    // Allow health check and status endpoints
    if (req.path === '/api/health' || 
        req.path === '/api/system-settings/maintenance/status' ||
        req.path === '/api/system-settings/read-only/status') {
      return next()
    }

    // Check maintenance mode
    const { data: setting, error } = await supabaseAdmin
      .from('system_settings')
      .select('value')
      .eq('key', 'maintenance_mode')
      .single()

    if (!error && setting?.value?.enabled === true) {
      return res.status(503).json({
        error: 'Maintenance Mode',
        message: setting.value.message || 'System is under maintenance. Please check back soon.',
        maintenance: true,
      })
    }

    next()
  } catch (err) {
    console.error('Maintenance mode check error:', err)
    // On error, allow request to proceed (fail open)
    next()
  }
}

/**
 * Middleware to check read-only mode
 * Blocks write operations (POST, PUT, PATCH, DELETE) except for system settings
 */
const checkReadOnlyMode = async (req, res, next) => {
  try {
    // Allow read operations
    if (req.method === 'GET' || req.method === 'OPTIONS') {
      return next()
    }

    // Allow system settings updates (needed to turn off read-only mode)
    if (req.path.startsWith('/api/system-settings')) {
      return next()
    }

    // Check read-only mode
    const { data: setting, error } = await supabaseAdmin
      .from('system_settings')
      .select('value')
      .eq('key', 'read_only_mode')
      .single()

    if (!error && setting?.value?.enabled === true) {
      return res.status(423).json({
        error: 'Read-Only Mode',
        message: setting.value.message || 'System is in read-only mode. Some operations are temporarily disabled.',
        readOnly: true,
      })
    }

    next()
  } catch (err) {
    console.error('Read-only mode check error:', err)
    // On error, allow request to proceed (fail open)
    next()
  }
}

module.exports = {
  checkMaintenanceMode,
  checkReadOnlyMode,
}
