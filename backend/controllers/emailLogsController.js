const { supabaseAdmin } = require('../config/supabase')

/**
 * GET /api/email-logs
 * List all email logs with filters
 */
const getEmailLogs = async (req, res) => {
  try {
    const { user_id, status, to_email, date_from, date_to, page = 0, limit = 50 } = req.query
    const offset = parseInt(page) * parseInt(limit)

    let query = supabaseAdmin
      .from('email_logs')
      .select('*', { count: 'exact' })
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .range(offset, offset + parseInt(limit) - 1)

    if (user_id) {
      query = query.eq('user_id', user_id)
    }

    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    if (to_email) {
      query = query.ilike('to_email', `%${to_email}%`)
    }

    if (date_from) {
      query = query.gte('created_at', date_from)
    }

    if (date_to) {
      query = query.lte('created_at', date_to)
    }

    const { data, count, error } = await query

    if (error) {
      // If table doesn't exist, return empty array instead of error
      if (error.code === '42P01' || error.message.includes('does not exist')) {
        return res.json({
          logs: [],
          total: 0,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: 0,
        })
      }
      return res.status(400).json({ error: error.message })
    }

    // Fetch user emails
    const logsWithUsers = await Promise.all(
      (data || []).map(async (log) => {
        let userEmail = null
        try {
          const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(log.user_id)
          userEmail = authUser?.user?.email || null
        } catch {}
        return { ...log, user_email: userEmail }
      })
    )

    res.json({
      logs: logsWithUsers,
      total: count || 0,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil((count || 0) / parseInt(limit)),
    })
  } catch (err) {
    console.error('Get email logs error:', err)
    res.status(500).json({ error: 'Failed to fetch email logs' })
  }
}

/**
 * GET /api/email-logs/:id
 * Get single email log
 */
const getEmailLog = async (req, res) => {
  try {
    const { id } = req.params

    const { data: log, error } = await supabaseAdmin
      .from('email_logs')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .single()

    if (error || !log) {
      return res.status(404).json({ error: 'Email log not found' })
    }

    res.json({ log })
  } catch (err) {
    console.error('Get email log error:', err)
    res.status(500).json({ error: 'Failed to fetch email log' })
  }
}

module.exports = {
  getEmailLogs,
  getEmailLog,
}
