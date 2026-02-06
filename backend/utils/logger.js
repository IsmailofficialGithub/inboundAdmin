const { supabaseAdmin } = require('../config/supabase')

/**
 * Log admin activity to the admin_activity_log table
 * Enhanced with severity and change tracking
 */
const logAdminActivity = async (adminId, action, details = {}) => {
  try {
    // Determine severity based on action type
    const criticalActions = [
      'user_deleted',
      'admin_created',
      'admin_deleted',
      'admin_role_changed',
      'system_settings_changed',
      'webhook_security_setting_created',
      'webhook_security_setting_deleted',
      'data_retention_config_updated',
      'global_ip_allowlist_added',
      'global_ip_allowlist_removed',
    ]

    const warningActions = [
      'user_suspended',
      'user_unsuspended',
      'admin_force_logout',
      'credits_adjusted',
      'invoice_created',
      'payment_refunded',
    ]

    let severity = 'info'
    if (criticalActions.includes(action)) {
      severity = 'critical'
    } else if (warningActions.includes(action)) {
      severity = 'warning'
    }

    const userAgent = details.extra?.user_agent || details.user_agent || null

    await supabaseAdmin.from('admin_activity_log').insert({
      admin_id: adminId,
      action,
      target_type: details.target_type || null,
      target_id: details.target_id || null,
      details: details.extra || {},
      ip_address: details.ip || null,
      severity,
      old_values: details.old_values || null,
      new_values: details.new_values || null,
      user_agent: userAgent,
      session_id: details.session_id || null,
    })
  } catch (err) {
    console.error('Failed to log admin activity:', err)
  }
}

module.exports = { logAdminActivity }
