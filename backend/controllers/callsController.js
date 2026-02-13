const { supabaseAdmin } = require('../config/supabase')

/**
 * GET /api/calls
 * List call history with pagination, search, filters
 */
const getCalls = async (req, res) => {
  try {
    const { search, call_status, user_id, agent_id, date_from, date_to, page = 0, limit = 50 } = req.query
    const offset = parseInt(page) * parseInt(limit)

    let query = supabaseAdmin
      .from('call_history')
      .select('*', { count: 'exact' })
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .range(offset, offset + parseInt(limit) - 1)

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

    if (search) {
      query = query.or(
        `caller_number.ilike.%${search}%,called_number.ilike.%${search}%,call_forwarded_to.ilike.%${search}%`
      )
    }

    const { data, count, error } = await query

    if (error) {
      return res.status(400).json({ error: error.message })
    }

    // Fetch owner emails
    const callsWithDetails = await Promise.all(
      (data || []).map(async (call) => {
        let ownerEmail = null
        let agentName = null
        try {
          const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(call.user_id)
          ownerEmail = authUser?.user?.email || null
        } catch {}
        if (call.agent_id) {
          try {
            const { data: agent } = await supabaseAdmin
              .from('voice_agents')
              .select('name')
              .eq('id', call.agent_id)
              .single()
            agentName = agent?.name || null
          } catch {}
        }
        return { ...call, owner_email: ownerEmail, agent_name: agentName }
      })
    )

    res.json({
      calls: callsWithDetails,
      total: count || 0,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil((count || 0) / parseInt(limit)),
    })
  } catch (err) {
    console.error('Get calls error:', err)
    res.status(500).json({ error: 'Failed to fetch calls' })
  }
}

/**
 * GET /api/calls/:id
 * Get single call with recording details
 */
const getCallById = async (req, res) => {
  try {
    const { id } = req.params

    const { data: call, error } = await supabaseAdmin
      .from('call_history')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !call) {
      return res.status(404).json({ error: 'Call not found' })
    }

    // Fetch owner email
    let ownerEmail = null
    try {
      const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(call.user_id)
      ownerEmail = authUser?.user?.email || null
    } catch {}

    // Fetch agent name
    let agentName = null
    if (call.agent_id) {
      try {
        const { data: agent } = await supabaseAdmin
          .from('voice_agents')
          .select('name')
          .eq('id', call.agent_id)
          .single()
        agentName = agent?.name || null
      } catch {}
    }

    // Fetch recordings
    const { data: recordings } = await supabaseAdmin
      .from('call_recordings')
      .select('*')
      .eq('call_history_id', id)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    res.json({
      call: { ...call, owner_email: ownerEmail, agent_name: agentName },
      recordings: recordings || [],
    })
  } catch (err) {
    console.error('Get call error:', err)
    res.status(500).json({ error: 'Failed to fetch call' })
  }
}

/**
 * GET /api/calls/:id/recordings
 * List recordings for a call
 */
const getCallRecordings = async (req, res) => {
  try {
    const { id } = req.params

    const { data: recordings, error } = await supabaseAdmin
      .from('call_recordings')
      .select('*')
      .eq('call_history_id', id)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (error) {
      return res.status(400).json({ error: error.message })
    }

    res.json({ recordings: recordings || [] })
  } catch (err) {
    console.error('Get recordings error:', err)
    res.status(500).json({ error: 'Failed to fetch recordings' })
  }
}

module.exports = {
  getCalls,
  getCallById,
  getCallRecordings,
}
