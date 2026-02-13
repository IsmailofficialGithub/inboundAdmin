const { supabaseAdmin } = require('../config/supabase')
const { logAdminActivity } = require('../utils/logger')

/**
 * GET /api/reports/revenue
 * Revenue reports (monthly, by package)
 */
const getRevenueReport = async (req, res) => {
  try {
    const { period = 'monthly', package_id, date_from, date_to } = req.query

    let dateFilter = {}
    if (date_from) dateFilter.gte = date_from
    if (date_to) dateFilter.lte = date_to

    // Fetch invoices separately
    let invoiceQuery = supabaseAdmin
      .from('invoices')
      .select('*')
      .eq('status', 'paid')

    if (date_from) {
      invoiceQuery = invoiceQuery.gte('invoice_date', date_from)
    }
    if (date_to) {
      invoiceQuery = invoiceQuery.lte('invoice_date', date_to)
    }

    const { data: invoices, error: invoiceError } = await invoiceQuery

    if (invoiceError) {
      return res.status(400).json({ error: invoiceError.message })
    }

    // Fetch subscriptions and packages separately
    const subscriptionIds = [...new Set((invoices || []).map(inv => inv.subscription_id).filter(Boolean))]
    let subscriptionsMap = {}
    let packagesMap = {}
    
    if (subscriptionIds.length > 0) {
      // Fetch subscriptions
      const { data: subscriptions } = await supabaseAdmin
        .from('user_subscriptions')
        .select('id, package_id')
        .in('id', subscriptionIds)
      
      if (subscriptions) {
        subscriptionsMap = subscriptions.reduce((acc, sub) => {
          acc[sub.id] = sub
          return acc
        }, {})
        
        // Fetch packages
        const packageIds = [...new Set(subscriptions.map(sub => sub.package_id).filter(Boolean))]
        if (packageIds.length > 0) {
          const { data: packages } = await supabaseAdmin
            .from('subscription_packages')
            .select('id, package_name, package_code')
            .in('id', packageIds)
          
          if (packages) {
            packagesMap = packages.reduce((acc, pkg) => {
              acc[pkg.id] = pkg
              return acc
            }, {})
          }
        }
      }
    }

    // Group by period and package
    const revenueByPeriod = {}
    const revenueByPackage = {}

    ;(invoices || []).forEach((invoice) => {
      const invoiceDate = new Date(invoice.invoice_date)
      let periodKey

      if (period === 'monthly') {
        periodKey = `${invoiceDate.getFullYear()}-${String(invoiceDate.getMonth() + 1).padStart(2, '0')}`
      } else if (period === 'yearly') {
        periodKey = String(invoiceDate.getFullYear())
      } else {
        // daily
        periodKey = invoice.invoice_date
      }

      // Revenue by period
      if (!revenueByPeriod[periodKey]) {
        revenueByPeriod[periodKey] = {
          period: periodKey,
          total_revenue: 0,
          invoice_count: 0,
          currency: invoice.currency || 'USD',
        }
      }
      revenueByPeriod[periodKey].total_revenue += parseFloat(invoice.total_amount || 0)
      revenueByPeriod[periodKey].invoice_count += 1

      // Revenue by package - manually join data
      const subscription = invoice.subscription_id ? subscriptionsMap[invoice.subscription_id] : null
      if (subscription && subscription.package_id) {
        const packageData = packagesMap[subscription.package_id]
        if (packageData) {
          const packageName = packageData.package_name || 'Unknown'
          const packageCode = packageData.package_code || 'unknown'

          if (!revenueByPackage[packageCode]) {
            revenueByPackage[packageCode] = {
              package_code: packageCode,
              package_name: packageName,
              total_revenue: 0,
              invoice_count: 0,
              currency: invoice.currency || 'USD',
            }
          }
          revenueByPackage[packageCode].total_revenue += parseFloat(invoice.total_amount || 0)
          revenueByPackage[packageCode].invoice_count += 1
        }
      }
    })

    // Filter by package if specified
    let filteredPackageRevenue = Object.values(revenueByPackage)
    if (package_id) {
      filteredPackageRevenue = filteredPackageRevenue.filter((p) => p.package_code === package_id)
    }

    res.json({
      period,
      date_from: date_from || null,
      date_to: date_to || null,
      revenue_by_period: Object.values(revenueByPeriod).sort((a, b) => a.period.localeCompare(b.period)),
      revenue_by_package: filteredPackageRevenue,
      summary: {
        total_revenue: Object.values(revenueByPeriod).reduce((sum, p) => sum + p.total_revenue, 0),
        total_invoices: (invoices || []).length,
        currency: invoices?.[0]?.currency || 'USD',
      },
    })
  } catch (err) {
    console.error('Revenue report error:', err)
    res.status(500).json({ error: 'Failed to generate revenue report' })
  }
}

/**
 * GET /api/reports/usage
 * Usage reports (minutes/calls by user/package)
 */
const getUsageReport = async (req, res) => {
  try {
    const { group_by = 'user', user_id, package_id, date_from, date_to } = req.query

    // Base query for call history - need to get user subscriptions separately
    let callQuery = supabaseAdmin
      .from('call_history')
      .select('*')
      .is('deleted_at', null)

    if (date_from) {
      callQuery = callQuery.gte('call_start_time', date_from)
    }
    if (date_to) {
      callQuery = callQuery.lte('call_start_time', date_to)
    }
    if (user_id) {
      callQuery = callQuery.eq('user_id', user_id)
    }

    const { data: calls, error: callError } = await callQuery

    if (callError) {
      return res.status(400).json({ error: callError.message })
    }

    // Get all unique user IDs to fetch their subscriptions
    const userIds = [...new Set((calls || []).map((c) => c.user_id))]
    const userSubscriptionsMap = {}

    // Fetch subscriptions for all users
    if (userIds.length > 0) {
      const { data: subscriptions } = await supabaseAdmin
        .from('user_subscriptions')
        .select('user_id, package_id')
        .in('user_id', userIds)
        .eq('status', 'active')

      // Fetch packages separately
      const packageIds = [...new Set((subscriptions || []).map(sub => sub.package_id).filter(Boolean))]
      let packagesMap = {}
      if (packageIds.length > 0) {
        const { data: packages } = await supabaseAdmin
          .from('subscription_packages')
          .select('id, package_name, package_code')
          .in('id', packageIds)
        
        if (packages) {
          packagesMap = packages.reduce((acc, pkg) => {
            acc[pkg.id] = pkg
            return acc
          }, {})
        }
      }

      ;(subscriptions || []).forEach((sub) => {
        if (!userSubscriptionsMap[sub.user_id]) {
          // Manually join package data
          const packageData = sub.package_id ? packagesMap[sub.package_id] : null
          userSubscriptionsMap[sub.user_id] = {
            ...sub,
            subscription_packages: packageData
          }
        }
      })
    }

    // Group by user or package
    const usageByUser = {}
    const usageByPackage = {}

    ;(calls || []).forEach((call) => {
      const callDuration = parseFloat(call.call_duration_seconds || 0) / 60 // Convert to minutes
      const isAnswered = call.call_status === 'completed' || call.call_status === 'answered'

      // Group by user
      if (!usageByUser[call.user_id]) {
        usageByUser[call.user_id] = {
          user_id: call.user_id,
          total_calls: 0,
          answered_calls: 0,
          total_minutes: 0,
          answered_minutes: 0,
        }
      }
      usageByUser[call.user_id].total_calls += 1
      usageByUser[call.user_id].total_minutes += callDuration
      if (isAnswered) {
        usageByUser[call.user_id].answered_calls += 1
        usageByUser[call.user_id].answered_minutes += callDuration
      }

      // Group by package
      const userSub = userSubscriptionsMap[call.user_id]
      if (userSub && userSub.subscription_packages) {
        const packageCode = userSub.subscription_packages.package_code || 'unknown'
        const packageName = userSub.subscription_packages.package_name || 'Unknown'

        if (!usageByPackage[packageCode]) {
          usageByPackage[packageCode] = {
            package_code: packageCode,
            package_name: packageName,
            total_calls: 0,
            answered_calls: 0,
            total_minutes: 0,
            answered_minutes: 0,
            unique_users: new Set(),
          }
        }
        usageByPackage[packageCode].total_calls += 1
        usageByPackage[packageCode].total_minutes += callDuration
        usageByPackage[packageCode].unique_users.add(call.user_id)
        if (isAnswered) {
          usageByPackage[packageCode].answered_calls += 1
          usageByPackage[packageCode].answered_minutes += callDuration
        }
      }
    })

    // Convert Set to count for packages
    Object.keys(usageByPackage).forEach((key) => {
      usageByPackage[key].unique_users = usageByPackage[key].unique_users.size
    })

    // Filter by package if specified
    let filteredPackageUsage = Object.values(usageByPackage)
    if (package_id) {
      filteredPackageUsage = filteredPackageUsage.filter((p) => p.package_code === package_id)
    }

    // Fetch user emails for user-based reports
    const usageByUserWithEmail = await Promise.all(
      Object.values(usageByUser).map(async (usage) => {
        let email = null
        try {
          const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(usage.user_id)
          email = authUser?.user?.email || null
        } catch {}
        return { ...usage, email }
      })
    )

    res.json({
      group_by,
      date_from: date_from || null,
      date_to: date_to || null,
      usage_by_user: usageByUserWithEmail,
      usage_by_package: filteredPackageUsage,
      summary: {
        total_calls: (calls || []).length,
        total_minutes: (calls || []).reduce((sum, c) => sum + parseFloat(c.call_duration_seconds || 0) / 60, 0),
        unique_users: Object.keys(usageByUser).length,
      },
    })
  } catch (err) {
    console.error('Usage report error:', err)
    res.status(500).json({ error: 'Failed to generate usage report' })
  }
}

/**
 * GET /api/reports/agent-performance
 * Agent performance reports (answer rate, avg duration)
 */
const getAgentPerformanceReport = async (req, res) => {
  try {
    const { agent_id, date_from, date_to } = req.query

    // Base query for calls - fetch agents separately for better performance
    let callQuery = supabaseAdmin
      .from('call_history')
      .select('*')
      .not('agent_id', 'is', null)
      .is('deleted_at', null)

    if (date_from) {
      callQuery = callQuery.gte('call_start_time', date_from)
    }
    if (date_to) {
      callQuery = callQuery.lte('call_start_time', date_to)
    }
    if (agent_id) {
      callQuery = callQuery.eq('agent_id', agent_id)
    }

    const { data: calls, error: callError } = await callQuery

    if (callError) {
      return res.status(400).json({ error: callError.message })
    }

    // Get all unique agent IDs to fetch agent names
    const agentIds = [...new Set((calls || []).map((c) => c.agent_id).filter(Boolean))]
    const agentsMap = {}

    if (agentIds.length > 0) {
      const { data: agents } = await supabaseAdmin
        .from('voice_agents')
        .select('id, name')
        .in('id', agentIds)

      ;(agents || []).forEach((agent) => {
        agentsMap[agent.id] = agent.name
      })
    }

    // Group by agent
    const agentPerformance = {}

    ;(calls || []).forEach((call) => {
      if (!call.agent_id) return

      if (!agentPerformance[call.agent_id]) {
        agentPerformance[call.agent_id] = {
          agent_id: call.agent_id,
          agent_name: agentsMap[call.agent_id] || 'Unknown',
          total_calls: 0,
          answered_calls: 0,
          total_duration_seconds: 0,
          answered_duration_seconds: 0,
        }
      }

      const duration = parseFloat(call.call_duration_seconds || 0)
      const isAnswered = call.call_status === 'completed' || call.call_status === 'answered'

      agentPerformance[call.agent_id].total_calls += 1
      agentPerformance[call.agent_id].total_duration_seconds += duration

      if (isAnswered) {
        agentPerformance[call.agent_id].answered_calls += 1
        agentPerformance[call.agent_id].answered_duration_seconds += duration
      }
    })

    // Calculate metrics
    const performanceData = Object.values(agentPerformance).map((perf) => {
      const answerRate = perf.total_calls > 0 ? (perf.answered_calls / perf.total_calls) * 100 : 0
      const avgDuration = perf.answered_calls > 0 ? perf.answered_duration_seconds / perf.answered_calls : 0
      const avgDurationMinutes = avgDuration / 60

      return {
        ...perf,
        answer_rate: parseFloat(answerRate.toFixed(2)),
        avg_duration_seconds: parseFloat(avgDuration.toFixed(2)),
        avg_duration_minutes: parseFloat(avgDurationMinutes.toFixed(2)),
      }
    })

    res.json({
      date_from: date_from || null,
      date_to: date_to || null,
      agent_performance: performanceData.sort((a, b) => b.total_calls - a.total_calls),
      summary: {
        total_agents: performanceData.length,
        total_calls: (calls || []).length,
        avg_answer_rate: performanceData.length > 0
          ? performanceData.reduce((sum, p) => sum + p.answer_rate, 0) / performanceData.length
          : 0,
      },
    })
  } catch (err) {
    console.error('Agent performance report error:', err)
    res.status(500).json({ error: 'Failed to generate agent performance report' })
  }
}

/**
 * GET /api/reports/provider-performance
 * Provider performance reports (failure rate, latency)
 */
const getProviderPerformanceReport = async (req, res) => {
  try {
    const { provider, date_from, date_to } = req.query

    // Base query for calls - fetch provider info separately
    let callQuery = supabaseAdmin
      .from('call_history')
      .select('*')
      .is('deleted_at', null)

    if (date_from) {
      callQuery = callQuery.gte('call_start_time', date_from)
    }
    if (date_to) {
      callQuery = callQuery.lte('call_start_time', date_to)
    }

    const { data: calls, error: callError } = await callQuery

    if (callError) {
      return res.status(400).json({ error: callError.message })
    }

    // Get provider info from inbound_numbers if available
    const inboundNumberIds = [...new Set((calls || []).map((c) => c.inbound_number_id).filter(Boolean))]
    const providersMap = {}

    if (inboundNumberIds.length > 0) {
      const { data: inboundNumbers } = await supabaseAdmin
        .from('inbound_numbers')
        .select('id, provider')
        .in('id', inboundNumberIds)

      ;(inboundNumbers || []).forEach((num) => {
        providersMap[num.id] = num.provider
      })
    }

    // Group by provider
    const providerPerformance = {}

    ;(calls || []).forEach((call) => {
      // Get provider from inbound_numbers map, call metadata, or default
      const providerName = providersMap[call.inbound_number_id] || call.provider || call.metadata?.provider || 'unknown'
      const isFailed = call.call_status === 'failed' || call.call_status === 'busy' || call.call_status === 'no-answer'
      const latency = parseFloat(call.latency_ms || call.metadata?.latency || 0)

      if (!providerPerformance[providerName]) {
        providerPerformance[providerName] = {
          provider: providerName,
          total_calls: 0,
          failed_calls: 0,
          successful_calls: 0,
          total_latency_ms: 0,
          latency_count: 0,
        }
      }

      providerPerformance[providerName].total_calls += 1
      if (isFailed) {
        providerPerformance[providerName].failed_calls += 1
      } else {
        providerPerformance[providerName].successful_calls += 1
      }

      if (latency > 0) {
        providerPerformance[providerName].total_latency_ms += latency
        providerPerformance[providerName].latency_count += 1
      }
    })

    // Calculate metrics
    const performanceData = Object.values(providerPerformance).map((perf) => {
      const failureRate = perf.total_calls > 0 ? (perf.failed_calls / perf.total_calls) * 100 : 0
      const avgLatency = perf.latency_count > 0 ? perf.total_latency_ms / perf.latency_count : 0

      return {
        ...perf,
        failure_rate: parseFloat(failureRate.toFixed(2)),
        success_rate: parseFloat((100 - failureRate).toFixed(2)),
        avg_latency_ms: parseFloat(avgLatency.toFixed(2)),
      }
    })

    // Filter by provider if specified
    let filteredData = performanceData
    if (provider) {
      filteredData = performanceData.filter((p) => p.provider === provider)
    }

    res.json({
      date_from: date_from || null,
      date_to: date_to || null,
      provider_performance: filteredData.sort((a, b) => b.total_calls - a.total_calls),
      summary: {
        total_providers: filteredData.length,
        total_calls: (calls || []).length,
        avg_failure_rate: filteredData.length > 0
          ? filteredData.reduce((sum, p) => sum + p.failure_rate, 0) / filteredData.length
          : 0,
      },
    })
  } catch (err) {
    console.error('Provider performance report error:', err)
    res.status(500).json({ error: 'Failed to generate provider performance report' })
  }
}

/**
 * GET /api/reports/export/users
 * Export users to CSV
 */
const exportUsers = async (req, res) => {
  try {
    const { status, format = 'csv' } = req.query

    let query = supabaseAdmin.from('user_profiles').select('*')

    if (status && status !== 'all') {
      query = query.eq('account_status', status)
    }

    const { data: users, error } = await query

    if (error) {
      return res.status(400).json({ error: error.message })
    }

    // Fetch emails
    const usersWithEmail = await Promise.all(
      (users || []).map(async (user) => {
        let email = null
        try {
          const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(user.id)
          email = authUser?.user?.email || null
        } catch {}
        return { ...user, email }
      })
    )

    if (format === 'csv') {
      // Convert to CSV
      const headers = ['ID', 'Email', 'First Name', 'Last Name', 'Phone', 'Country Code', 'Account Status', 'Created At', 'Updated At']
      const rows = usersWithEmail.map((user) => [
        user.id,
        user.email || '',
        user.first_name || '',
        user.last_name || '',
        user.phone || '',
        user.country_code || '',
        user.account_status || '',
        user.created_at || '',
        user.updated_at || '',
      ])

      const csv = [headers.join(','), ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))].join('\n')

      res.setHeader('Content-Type', 'text/csv')
      res.setHeader('Content-Disposition', `attachment; filename=users_export_${new Date().toISOString().split('T')[0]}.csv`)
      res.send(csv)
    } else {
      res.json({ users: usersWithEmail })
    }
  } catch (err) {
    console.error('Export users error:', err)
    res.status(500).json({ error: 'Failed to export users' })
  }
}

/**
 * GET /api/reports/export/subscriptions
 * Export subscriptions to CSV
 */
const exportSubscriptions = async (req, res) => {
  try {
    const { status, format = 'csv' } = req.query

    // Fetch subscriptions
    let query = supabaseAdmin
      .from('user_subscriptions')
      .select('*')

    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    const { data: subscriptions, error } = await query

    if (error) {
      return res.status(400).json({ error: error.message })
    }

    // Fetch packages separately
    const packageIds = [...new Set((subscriptions || []).map(sub => sub.package_id).filter(Boolean))]
    let packagesMap = {}
    if (packageIds.length > 0) {
      const { data: packages } = await supabaseAdmin
        .from('subscription_packages')
        .select('id, package_name, package_code')
        .in('id', packageIds)
      
      if (packages) {
        packagesMap = packages.reduce((acc, pkg) => {
          acc[pkg.id] = pkg
          return acc
        }, {})
      }
    }

    // Fetch user emails and join packages
    const subscriptionsWithEmail = await Promise.all(
      (subscriptions || []).map(async (sub) => {
        let email = null
        try {
          const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(sub.user_id)
          email = authUser?.user?.email || null
        } catch {}
        
        // Manually join package data
        const packageData = sub.package_id ? packagesMap[sub.package_id] : null
        
        return {
          ...sub,
          email,
          package_name: packageData?.package_name || 'Unknown',
          package_code: packageData?.package_code || 'unknown',
        }
      })
    )

    if (format === 'csv') {
      const headers = [
        'ID',
        'User Email',
        'Package Name',
        'Package Code',
        'Status',
        'Auto Renew',
        'Current Period Start',
        'Current Period End',
        'Created At',
      ]
      const rows = subscriptionsWithEmail.map((sub) => [
        sub.id,
        sub.email || '',
        sub.package_name,
        sub.package_code,
        sub.status || '',
        sub.auto_renew ? 'Yes' : 'No',
        sub.current_period_start || '',
        sub.current_period_end || '',
        sub.created_at || '',
      ])

      const csv = [headers.join(','), ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))].join('\n')

      res.setHeader('Content-Type', 'text/csv')
      res.setHeader('Content-Disposition', `attachment; filename=subscriptions_export_${new Date().toISOString().split('T')[0]}.csv`)
      res.send(csv)
    } else {
      res.json({ subscriptions: subscriptionsWithEmail })
    }
  } catch (err) {
    console.error('Export subscriptions error:', err)
    res.status(500).json({ error: 'Failed to export subscriptions' })
  }
}

/**
 * GET /api/reports/export/invoices
 * Export invoices to CSV
 */
const exportInvoices = async (req, res) => {
  try {
    const { status, date_from, date_to, format = 'csv' } = req.query

    let query = supabaseAdmin.from('invoices').select('*')

    if (status && status !== 'all') {
      query = query.eq('status', status)
    }
    if (date_from) {
      query = query.gte('invoice_date', date_from)
    }
    if (date_to) {
      query = query.lte('invoice_date', date_to)
    }

    const { data: invoices, error } = await query

    if (error) {
      return res.status(400).json({ error: error.message })
    }

    // Fetch user emails
    const invoicesWithEmail = await Promise.all(
      (invoices || []).map(async (invoice) => {
        let email = null
        try {
          const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(invoice.user_id)
          email = authUser?.user?.email || null
        } catch {}
        return { ...invoice, email }
      })
    )

    if (format === 'csv') {
      const headers = [
        'Invoice Number',
        'User Email',
        'Invoice Date',
        'Due Date',
        'Subtotal',
        'Tax Amount',
        'Total Amount',
        'Currency',
        'Status',
        'Paid At',
        'Created At',
      ]
      const rows = invoicesWithEmail.map((inv) => [
        inv.invoice_number || '',
        inv.email || '',
        inv.invoice_date || '',
        inv.due_date || '',
        inv.subtotal || 0,
        inv.tax_amount || 0,
        inv.total_amount || 0,
        inv.currency || 'USD',
        inv.status || '',
        inv.paid_at || '',
        inv.created_at || '',
      ])

      const csv = [headers.join(','), ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))].join('\n')

      res.setHeader('Content-Type', 'text/csv')
      res.setHeader('Content-Disposition', `attachment; filename=invoices_export_${new Date().toISOString().split('T')[0]}.csv`)
      res.send(csv)
    } else {
      res.json({ invoices: invoicesWithEmail })
    }
  } catch (err) {
    console.error('Export invoices error:', err)
    res.status(500).json({ error: 'Failed to export invoices' })
  }
}

/**
 * GET /api/reports/export/call-logs
 * Export call logs to CSV
 */
const exportCallLogs = async (req, res) => {
  try {
    const { call_status, user_id, agent_id, date_from, date_to, format = 'csv' } = req.query

    let query = supabaseAdmin.from('call_history').select('*').is('deleted_at', null)

    if (call_status && call_status !== 'all') {
      query = query.eq('call_status', call_status)
    }
    if (user_id) {
      query = query.eq('user_id', user_id)
    }
    if (agent_id) {
      query = query.eq('agent_id', agent_id)
    }
    if (date_from) {
      query = query.gte('call_start_time', date_from)
    }
    if (date_to) {
      query = query.lte('call_start_time', date_to)
    }

    const { data: calls, error } = await query

    if (error) {
      return res.status(400).json({ error: error.message })
    }

    // Fetch user emails and agent names
    const callsWithDetails = await Promise.all(
      (calls || []).map(async (call) => {
        let ownerEmail = null
        let agentName = null
        try {
          const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(call.user_id)
          ownerEmail = authUser?.user?.email || null
        } catch {}
        if (call.agent_id) {
          try {
            const { data: agent } = await supabaseAdmin.from('voice_agents').select('name').eq('id', call.agent_id).single()
            agentName = agent?.name || null
          } catch {}
        }
        return { ...call, owner_email: ownerEmail, agent_name: agentName }
      })
    )

    if (format === 'csv') {
      const headers = [
        'ID',
        'User Email',
        'Agent Name',
        'Caller Number',
        'Called Number',
        'Call Status',
        'Call Start Time',
        'Call End Time',
        'Duration (seconds)',
        'Duration (minutes)',
        'Created At',
      ]
      const rows = callsWithDetails.map((call) => [
        call.id,
        call.owner_email || '',
        call.agent_name || '',
        call.caller_number || '',
        call.called_number || '',
        call.call_status || '',
        call.call_start_time || '',
        call.call_end_time || '',
        call.call_duration_seconds || 0,
        ((call.call_duration_seconds || 0) / 60).toFixed(2),
        call.created_at || '',
      ])

      const csv = [headers.join(','), ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))].join('\n')

      res.setHeader('Content-Type', 'text/csv')
      res.setHeader('Content-Disposition', `attachment; filename=call_logs_export_${new Date().toISOString().split('T')[0]}.csv`)
      res.send(csv)
    } else {
      res.json({ calls: callsWithDetails })
    }
  } catch (err) {
    console.error('Export call logs error:', err)
    res.status(500).json({ error: 'Failed to export call logs' })
  }
}

module.exports = {
  getRevenueReport,
  getUsageReport,
  getAgentPerformanceReport,
  getProviderPerformanceReport,
  exportUsers,
  exportSubscriptions,
  exportInvoices,
  exportCallLogs,
}
