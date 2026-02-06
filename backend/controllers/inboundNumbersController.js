const { supabaseAdmin } = require('../config/supabase')
const { logAdminActivity } = require('../utils/logger')

/**
 * GET /api/inbound-numbers
 * List inbound numbers with pagination and filters
 */
const getInboundNumbers = async (req, res) => {
  try {
    const { search, status, provider, user_id, page = 0, limit = 50 } = req.query
    const offset = parseInt(page) * parseInt(limit)

    let query = supabaseAdmin
      .from('inbound_numbers')
      .select('*', { count: 'exact' })
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .range(offset, offset + parseInt(limit) - 1)

    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    if (provider && provider !== 'all') {
      query = query.eq('provider', provider)
    }

    if (user_id) {
      query = query.eq('user_id', user_id)
    }

    if (search) {
      query = query.or(
        `phone_number.ilike.%${search}%,phone_label.ilike.%${search}%`
      )
    }

    const { data, count, error } = await query

    if (error) {
      return res.status(400).json({ error: error.message })
    }

    // Fetch owner emails and agent names
    const numbersWithDetails = await Promise.all(
      (data || []).map(async (num) => {
        let ownerEmail = null
        let agentName = null
        try {
          const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(num.user_id)
          ownerEmail = authUser?.user?.email || null
        } catch {}
        if (num.assigned_to_agent_id) {
          try {
            const { data: agent } = await supabaseAdmin
              .from('voice_agents')
              .select('name')
              .eq('id', num.assigned_to_agent_id)
              .single()
            agentName = agent?.name || null
          } catch {}
        }
        return { ...num, owner_email: ownerEmail, agent_name: agentName }
      })
    )

    res.json({
      numbers: numbersWithDetails,
      total: count || 0,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil((count || 0) / parseInt(limit)),
    })
  } catch (err) {
    console.error('Get inbound numbers error:', err)
    res.status(500).json({ error: 'Failed to fetch inbound numbers' })
  }
}

/**
 * GET /api/inbound-numbers/:id
 * Get single inbound number details
 */
const getInboundNumberById = async (req, res) => {
  try {
    const { id } = req.params

    const { data: number, error } = await supabaseAdmin
      .from('inbound_numbers')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .single()

    if (error || !number) {
      return res.status(404).json({ error: 'Inbound number not found' })
    }

    // Fetch owner email
    let ownerEmail = null
    try {
      const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(number.user_id)
      ownerEmail = authUser?.user?.email || null
    } catch {}

    // Fetch assigned agent details
    let assignedAgent = null
    if (number.assigned_to_agent_id) {
      try {
        const { data: agent } = await supabaseAdmin
          .from('voice_agents')
          .select('id, name, status, agent_type, phone_number')
          .eq('id', number.assigned_to_agent_id)
          .single()
        assignedAgent = agent
      } catch {}
    }

    // Fetch recent calls for this number
    const { data: recentCalls } = await supabaseAdmin
      .from('call_history')
      .select('id, caller_number, called_number, call_status, call_duration, call_start_time')
      .eq('inbound_number_id', id)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(20)

    res.json({
      number: { ...number, owner_email: ownerEmail },
      assignedAgent,
      recentCalls: recentCalls || [],
    })
  } catch (err) {
    console.error('Get inbound number error:', err)
    res.status(500).json({ error: 'Failed to fetch inbound number' })
  }
}

/**
 * PUT /api/inbound-numbers/:id
 * Update inbound number details
 */
const updateInboundNumber = async (req, res) => {
  try {
    const { id } = req.params
    const {
      phone_label, status, call_forwarding_number,
      assigned_to_agent_id, notes,
    } = req.body

    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('inbound_numbers')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .single()

    if (fetchError || !existing) {
      return res.status(404).json({ error: 'Inbound number not found' })
    }

    const updateData = { updated_at: new Date().toISOString() }
    if (phone_label !== undefined) updateData.phone_label = phone_label
    if (status !== undefined) updateData.status = status
    if (call_forwarding_number !== undefined) updateData.call_forwarding_number = call_forwarding_number
    if (assigned_to_agent_id !== undefined) {
      updateData.assigned_to_agent_id = assigned_to_agent_id || null
      updateData.is_in_use = !!assigned_to_agent_id
    }
    if (notes !== undefined) updateData.notes = notes

    const { error } = await supabaseAdmin
      .from('inbound_numbers')
      .update(updateData)
      .eq('id', id)

    if (error) throw error

    await logAdminActivity(req.admin.id, 'inbound_number_updated', {
      target_type: 'inbound_number',
      target_id: id,
      ip: req.ip,
      extra: {
        phone_number: existing.phone_number,
        updated_fields: Object.keys(updateData).filter((k) => k !== 'updated_at'),
      },
    })

    const { data: updated } = await supabaseAdmin
      .from('inbound_numbers')
      .select('*')
      .eq('id', id)
      .single()

    res.json({ success: true, message: 'Inbound number updated successfully', number: updated })
  } catch (err) {
    console.error('Update inbound number error:', err)
    res.status(500).json({ error: 'Failed to update inbound number' })
  }
}

/**
 * PATCH /api/inbound-numbers/:id/assign
 * Assign inbound number to a voice agent
 */
const assignToAgent = async (req, res) => {
  try {
    const { id } = req.params
    const { agent_id } = req.body

    const { data: number, error: fetchError } = await supabaseAdmin
      .from('inbound_numbers')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .single()

    if (fetchError || !number) {
      return res.status(404).json({ error: 'Inbound number not found' })
    }

    // Validate agent exists if assigning
    if (agent_id) {
      const { data: agent, error: agentError } = await supabaseAdmin
        .from('voice_agents')
        .select('id, name')
        .eq('id', agent_id)
        .is('deleted_at', null)
        .single()

      if (agentError || !agent) {
        return res.status(404).json({ error: 'Voice agent not found' })
      }
    }

    const { error } = await supabaseAdmin
      .from('inbound_numbers')
      .update({
        assigned_to_agent_id: agent_id || null,
        is_in_use: !!agent_id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (error) throw error

    await logAdminActivity(req.admin.id, agent_id ? 'number_assigned_to_agent' : 'number_unassigned', {
      target_type: 'inbound_number',
      target_id: id,
      ip: req.ip,
      extra: {
        phone_number: number.phone_number,
        agent_id: agent_id || null,
        previous_agent_id: number.assigned_to_agent_id,
      },
    })

    res.json({
      success: true,
      message: agent_id ? 'Number assigned to agent successfully' : 'Number unassigned successfully',
    })
  } catch (err) {
    console.error('Assign to agent error:', err)
    res.status(500).json({ error: 'Failed to assign number' })
  }
}

module.exports = {
  getInboundNumbers,
  getInboundNumberById,
  updateInboundNumber,
  assignToAgent,
}
