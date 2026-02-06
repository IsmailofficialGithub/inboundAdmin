const { supabase } = require('../config/supabase')

/**
 * Log admin activity to the admin_activity_log table
 */
const logAdminActivity = async (adminId, action, details = {}) => {
  try {
    await supabase.from('admin_activity_log').insert({
      admin_id: adminId,
      action,
      target_type: details.target_type || null,
      target_id: details.target_id || null,
      details: details.extra || {},
      ip_address: details.ip || null,
    })
  } catch (err) {
    console.error('Failed to log admin activity:', err)
  }
}

module.exports = { logAdminActivity }
