const { supabaseAdmin } = require('../config/supabase')

/**
 * GET /api/invoice-email-logs
 * List invoice email delivery logs
 */
const listEmailLogs = async (req, res) => {
  try {
    const {
      page = 0,
      limit = 50,
      invoice_id,
      user_id,
      status,
      start_date,
      end_date,
      sort_by = 'created_at',
      sort_order = 'desc',
    } = req.query

    let query = supabaseAdmin
      .from('invoice_email_logs')
      .select('*, invoices:invoice_id(invoice_number)', { count: 'exact' })

    // Apply filters
    if (invoice_id) {
      query = query.eq('invoice_id', invoice_id)
    }
    if (user_id) {
      query = query.eq('user_id', user_id)
    }
    if (status) {
      query = query.eq('status', status)
    }
    if (start_date) {
      query = query.gte('created_at', start_date)
    }
    if (end_date) {
      query = query.lte('created_at', end_date)
    }

    // Apply sorting
    query = query.order(sort_by, { ascending: sort_order === 'asc' })

    // Apply pagination
    const from = parseInt(page) * parseInt(limit)
    const to = from + parseInt(limit) - 1
    query = query.range(from, to)

    const { data, error, count } = await query

    if (error) {
      return res.status(400).json({ error: error.message })
    }

    // Fetch user emails separately (auth.users is not directly joinable)
    // Note: recipient_email is already stored in the table, so we don't need to fetch it
    const emailLogsWithUsers = (data || []).map((log) => ({
      ...log,
      users: {
        email: log.recipient_email || null,
      },
    }))

    res.json({
      emailLogs: emailLogsWithUsers,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count || 0,
        totalPages: Math.ceil((count || 0) / parseInt(limit)),
      },
    })
  } catch (err) {
    console.error('List email logs error:', err)
    res.status(500).json({ error: 'Failed to fetch email logs' })
  }
}

/**
 * GET /api/invoice-email-logs/:id
 * Get email log by ID
 */
const getEmailLog = async (req, res) => {
  try {
    const { id } = req.params

    const { data: emailLog, error } = await supabaseAdmin
      .from('invoice_email_logs')
      .select('*, invoices:invoice_id(*)')
      .eq('id', id)
      .single()

    if (error || !emailLog) {
      return res.status(404).json({ error: 'Email log not found' })
    }

    // Fetch user data separately (or use recipient_email which is already stored)
    try {
      const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(emailLog.user_id)
      emailLog.users = {
        email: emailLog.recipient_email || authUser?.user?.email || null,
        first_name: authUser?.user?.user_metadata?.first_name || null,
        last_name: authUser?.user?.user_metadata?.last_name || null,
      }
    } catch (err) {
      emailLog.users = {
        email: emailLog.recipient_email || null,
        first_name: null,
        last_name: null,
      }
    }

    res.json({ emailLog })
  } catch (err) {
    console.error('Get email log error:', err)
    res.status(500).json({ error: 'Failed to fetch email log' })
  }
}

module.exports = {
  listEmailLogs,
  getEmailLog,
}
