const { supabaseAdmin } = require('../config/supabase')

/**
 * Detect and log failed login floods
 */
const detectFailedLoginFlood = async (email, ipAddress, isAdmin = false) => {
  try {
    const timeWindowMinutes = 15
    const thresholdCount = 5

    // Log the failed attempt
    await supabaseAdmin.from('failed_login_attempts').insert({
      email,
      ip_address: ipAddress,
      is_admin: isAdmin,
      failure_reason: 'Invalid credentials',
    })

    // Check if threshold is exceeded
    const { count } = await supabaseAdmin
      .from('failed_login_attempts')
      .select('*', { count: 'exact', head: true })
      .eq('ip_address', ipAddress)
      .gte('created_at', new Date(Date.now() - timeWindowMinutes * 60 * 1000).toISOString())

    if (count >= thresholdCount) {
      // Check if alert already exists
      const { data: existingAlert } = await supabaseAdmin
        .from('abuse_detection_alerts')
        .select('id')
        .eq('alert_type', 'failed_login_flood')
        .eq('entity_type', 'ip_address')
        .eq('entity_id', ipAddress)
        .eq('status', 'open')
        .single()

      if (!existingAlert) {
        // Create new alert
        await supabaseAdmin.from('abuse_detection_alerts').insert({
          alert_type: 'failed_login_flood',
          severity: 'high',
          entity_type: 'ip_address',
          entity_id: ipAddress,
          threshold_value: thresholdCount,
          actual_value: count,
          time_window_minutes: timeWindowMinutes,
          description: `Multiple failed login attempts from IP ${ipAddress} (${count} attempts in ${timeWindowMinutes} minutes)`,
          status: 'open',
        })
      }

      return true
    }

    return false
  } catch (err) {
    console.error('Failed login flood detection error:', err)
    return false
  }
}

/**
 * Detect and log webhook floods
 */
const detectWebhookFlood = async (providerName, webhookEndpoint) => {
  try {
    const timeWindowMinutes = 5
    const thresholdCount = 100

    // Check recent requests
    const { count } = await supabaseAdmin
      .from('webhook_request_logs')
      .select('*', { count: 'exact', head: true })
      .eq('provider_name', providerName)
      .eq('webhook_endpoint', webhookEndpoint)
      .gte('created_at', new Date(Date.now() - timeWindowMinutes * 60 * 1000).toISOString())

    if (count >= thresholdCount) {
      // Check if alert already exists
      const entityId = `${providerName}:${webhookEndpoint}`
      const { data: existingAlert } = await supabaseAdmin
        .from('abuse_detection_alerts')
        .select('id')
        .eq('alert_type', 'webhook_flood')
        .eq('entity_type', 'provider')
        .eq('entity_id', entityId)
        .eq('status', 'open')
        .single()

      if (!existingAlert) {
        // Create new alert
        await supabaseAdmin.from('abuse_detection_alerts').insert({
          alert_type: 'webhook_flood',
          severity: 'medium',
          entity_type: 'provider',
          entity_id: entityId,
          threshold_value: thresholdCount,
          actual_value: count,
          time_window_minutes: timeWindowMinutes,
          description: `Webhook flood detected from ${providerName} to ${webhookEndpoint} (${count} requests in ${timeWindowMinutes} minutes)`,
          status: 'open',
        })
      }

      return true
    }

    return false
  } catch (err) {
    console.error('Webhook flood detection error:', err)
    return false
  }
}

/**
 * Detect and log call spikes
 */
const detectCallSpike = async (userId, agentId = null) => {
  try {
    const timeWindowHours = 1
    const thresholdMultiplier = 3.0

    // Get call count in recent time window
    let recentQuery = supabaseAdmin
      .from('call_history')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('call_start_time', new Date(Date.now() - timeWindowHours * 60 * 60 * 1000).toISOString())

    if (agentId) {
      recentQuery = recentQuery.eq('agent_id', agentId)
    }

    const { count: recentCount } = await recentQuery

    // Get historical average (last 7 days, same hour)
    const currentHour = new Date().getHours()
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

    let historicalQuery = supabaseAdmin
      .from('call_history')
      .select('call_start_time')
      .eq('user_id', userId)
      .gte('call_start_time', sevenDaysAgo)

    if (agentId) {
      historicalQuery = historicalQuery.eq('agent_id', agentId)
    }

    const { data: historicalCalls } = await historicalQuery

    if (!historicalCalls || historicalCalls.length === 0) {
      return false
    }

    // Group by hour and calculate average
    const hourlyCounts = {}
    historicalCalls.forEach((call) => {
      const hour = new Date(call.call_start_time).getHours()
      if (hour === currentHour) {
        const date = new Date(call.call_start_time).toDateString()
        hourlyCounts[date] = (hourlyCounts[date] || 0) + 1
      }
    })

    const hourlyValues = Object.values(hourlyCounts)
    const historicalAvg = hourlyValues.length > 0 ? hourlyValues.reduce((a, b) => a + b, 0) / hourlyValues.length : 10

    const threshold = historicalAvg * thresholdMultiplier

    if (recentCount >= threshold) {
      // Log spike detection
      await supabaseAdmin.from('call_spike_detection').insert({
        user_id: userId,
        agent_id: agentId,
        time_window_start: new Date(Date.now() - timeWindowHours * 60 * 60 * 1000).toISOString(),
        time_window_end: new Date().toISOString(),
        call_count: recentCount,
        threshold_count: Math.ceil(threshold),
        average_calls_per_hour: historicalAvg,
        is_alerted: false,
      })

      // Check if alert already exists
      const entityId = agentId ? `${userId}:${agentId}` : userId.toString()
      const { data: existingAlert } = await supabaseAdmin
        .from('abuse_detection_alerts')
        .select('id')
        .eq('alert_type', 'call_spike')
        .eq('entity_type', agentId ? 'agent' : 'user')
        .eq('entity_id', entityId)
        .eq('status', 'open')
        .single()

      if (!existingAlert) {
        // Create new alert
        await supabaseAdmin.from('abuse_detection_alerts').insert({
          alert_type: 'call_spike',
          severity: 'medium',
          entity_type: agentId ? 'agent' : 'user',
          entity_id: entityId,
          threshold_value: Math.ceil(threshold),
          actual_value: recentCount,
          time_window_minutes: timeWindowHours * 60,
          description: `Call spike detected: ${recentCount} calls in ${timeWindowHours} hour(s) (threshold: ${Math.ceil(threshold)}, avg: ${historicalAvg.toFixed(2)})`,
          status: 'open',
        })

        // Mark spike as alerted
        await supabaseAdmin
          .from('call_spike_detection')
          .update({ is_alerted: true })
          .eq('user_id', userId)
          .eq('agent_id', agentId)
          .eq('is_alerted', false)
      }

      return true
    }

    return false
  } catch (err) {
    console.error('Call spike detection error:', err)
    return false
  }
}

/**
 * Run periodic abuse detection checks
 * This should be called by a cron job or scheduled task
 */
const runAbuseDetectionChecks = async () => {
  try {
    console.log('Running abuse detection checks...')

    // Check for recent failed login floods
    const { data: recentFailedLogins } = await supabaseAdmin
      .from('failed_login_attempts')
      .select('ip_address')
      .gte('created_at', new Date(Date.now() - 15 * 60 * 1000).toISOString())
      .group('ip_address')

    if (recentFailedLogins) {
      for (const entry of recentFailedLogins) {
        await detectFailedLoginFlood(null, entry.ip_address, false)
      }
    }

    // Check for webhook floods
    const { data: recentWebhooks } = await supabaseAdmin
      .from('webhook_request_logs')
      .select('provider_name, webhook_endpoint')
      .gte('created_at', new Date(Date.now() - 5 * 60 * 1000).toISOString())
      .group('provider_name, webhook_endpoint')

    if (recentWebhooks) {
      for (const entry of recentWebhooks) {
        await detectWebhookFlood(entry.provider_name, entry.webhook_endpoint)
      }
    }

    // Check for call spikes (check users with recent calls)
    const { data: recentCalls } = await supabaseAdmin
      .from('call_history')
      .select('user_id, agent_id')
      .gte('call_start_time', new Date(Date.now() - 60 * 60 * 1000).toISOString())
      .group('user_id, agent_id')

    if (recentCalls) {
      for (const entry of recentCalls) {
        await detectCallSpike(entry.user_id, entry.agent_id)
      }
    }

    console.log('Abuse detection checks completed')
  } catch (err) {
    console.error('Abuse detection checks error:', err)
  }
}

module.exports = {
  detectFailedLoginFlood,
  detectWebhookFlood,
  detectCallSpike,
  runAbuseDetectionChecks,
}
