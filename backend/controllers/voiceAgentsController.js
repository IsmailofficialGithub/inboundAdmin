const { supabaseAdmin } = require('../config/supabase')
const { logAdminActivity } = require('../utils/logger')

/**
 * GET /api/voice-agents
 * List voice agents with pagination, search, filters
 */
const getAgents = async (req, res) => {
  try {
    const { search, status, agent_type, user_id, page = 0, limit = 50 } = req.query
    const offset = parseInt(page) * parseInt(limit)

    let query = supabaseAdmin
      .from('voice_agents')
      .select('*', { count: 'exact' })
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .range(offset, offset + parseInt(limit) - 1)

    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    if (agent_type && agent_type !== 'all') {
      query = query.eq('agent_type', agent_type)
    }

    if (user_id) {
      query = query.eq('user_id', user_id)
    }

    if (search) {
      query = query.or(
        `name.ilike.%${search}%,company_name.ilike.%${search}%,phone_number.ilike.%${search}%`
      )
    }

    const { data, count, error } = await query

    if (error) {
      return res.status(400).json({ error: error.message })
    }

    // Fetch owner emails
    const agentsWithEmail = await Promise.all(
      (data || []).map(async (agent) => {
        try {
          const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(agent.user_id)
          return { ...agent, owner_email: authUser?.user?.email || null }
        } catch {
          return { ...agent, owner_email: null }
        }
      })
    )

    res.json({
      agents: agentsWithEmail,
      total: count || 0,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil((count || 0) / parseInt(limit)),
    })
  } catch (err) {
    console.error('Get agents error:', err)
    res.status(500).json({ error: 'Failed to fetch voice agents' })
  }
}

/**
 * GET /api/voice-agents/:id
 * Get single agent with full details
 */
const getAgentById = async (req, res) => {
  try {
    const { id } = req.params

    const { data: agent, error } = await supabaseAdmin
      .from('voice_agents')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .single()

    if (error || !agent) {
      return res.status(404).json({ error: 'Voice agent not found' })
    }

    // Fetch owner email
    let ownerEmail = null
    try {
      const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(agent.user_id)
      ownerEmail = authUser?.user?.email || null
    } catch {}

    // Fetch recent calls
    const { data: recentCalls } = await supabaseAdmin
      .from('agent_calls')
      .select('*')
      .eq('agent_id', id)
      .order('created_at', { ascending: false })
      .limit(20)

    // Fetch analytics summary
    const { data: analytics } = await supabaseAdmin
      .from('agent_analytics')
      .select('*')
      .eq('agent_id', id)
      .order('date', { ascending: false })
      .limit(30)

    // Fetch assigned inbound numbers
    const { data: inboundNumbers } = await supabaseAdmin
      .from('inbound_numbers')
      .select('id, phone_number, phone_label, status, provider')
      .eq('assigned_to_agent_id', id)
      .is('deleted_at', null)

    res.json({
      agent: { ...agent, owner_email: ownerEmail },
      recentCalls: recentCalls || [],
      analytics: analytics || [],
      inboundNumbers: inboundNumbers || [],
    })
  } catch (err) {
    console.error('Get agent error:', err)
    res.status(500).json({ error: 'Failed to fetch voice agent' })
  }
}

/**
 * PUT /api/voice-agents/:id
 * Update agent details
 */
const updateAgent = async (req, res) => {
  try {
    const { id } = req.params
    const {
      name, company_name, goal, background, welcome_message, instruction_voice,
      script, voice, tone, model, background_noise, language, agent_type, tool,
      timezone, status, phone_number, phone_label, sms_enabled, execution_mode,
    } = req.body

    // Check agent exists
    const { data: existingAgent, error: fetchError } = await supabaseAdmin
      .from('voice_agents')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .single()

    if (fetchError || !existingAgent) {
      return res.status(404).json({ error: 'Voice agent not found' })
    }

    const updateData = { updated_at: new Date().toISOString() }
    if (name !== undefined) updateData.name = name
    if (company_name !== undefined) updateData.company_name = company_name
    if (goal !== undefined) updateData.goal = goal
    if (background !== undefined) updateData.background = background
    if (welcome_message !== undefined) updateData.welcome_message = welcome_message
    if (instruction_voice !== undefined) updateData.instruction_voice = instruction_voice
    if (script !== undefined) updateData.script = script
    if (voice !== undefined) updateData.voice = voice
    if (tone !== undefined) updateData.tone = tone
    if (model !== undefined) updateData.model = model
    if (background_noise !== undefined) updateData.background_noise = background_noise
    if (language !== undefined) updateData.language = language
    if (agent_type !== undefined) updateData.agent_type = agent_type
    if (tool !== undefined) updateData.tool = tool
    if (timezone !== undefined) updateData.timezone = timezone
    if (status !== undefined) updateData.status = status
    if (phone_number !== undefined) updateData.phone_number = phone_number
    if (phone_label !== undefined) updateData.phone_label = phone_label
    if (sms_enabled !== undefined) updateData.sms_enabled = sms_enabled
    if (execution_mode !== undefined) updateData.execution_mode = execution_mode

    const { error } = await supabaseAdmin
      .from('voice_agents')
      .update(updateData)
      .eq('id', id)

    if (error) throw error

    await logAdminActivity(req.admin.id, 'voice_agent_updated', {
      target_type: 'voice_agent',
      target_id: id,
      ip: req.ip,
      extra: {
        agent_name: existingAgent.name,
        updated_fields: Object.keys(updateData).filter((k) => k !== 'updated_at'),
      },
    })

    const { data: updatedAgent } = await supabaseAdmin
      .from('voice_agents')
      .select('*')
      .eq('id', id)
      .single()

    res.json({
      success: true,
      message: 'Voice agent updated successfully',
      agent: updatedAgent,
    })
  } catch (err) {
    console.error('Update agent error:', err)
    res.status(500).json({ error: 'Failed to update voice agent' })
  }
}

/**
 * DELETE /api/voice-agents/:id
 * Soft delete agent
 */
const deleteAgent = async (req, res) => {
  try {
    const { id } = req.params

    const { data: agent, error: fetchError } = await supabaseAdmin
      .from('voice_agents')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .single()

    if (fetchError || !agent) {
      return res.status(404).json({ error: 'Voice agent not found' })
    }

    const { error } = await supabaseAdmin
      .from('voice_agents')
      .update({
        deleted_at: new Date().toISOString(),
        status: 'archived',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (error) throw error

    await logAdminActivity(req.admin.id, 'voice_agent_deleted', {
      target_type: 'voice_agent',
      target_id: id,
      ip: req.ip,
      extra: { agent_name: agent.name, user_id: agent.user_id },
    })

    res.json({ success: true, message: 'Voice agent deleted successfully' })
  } catch (err) {
    console.error('Delete agent error:', err)
    res.status(500).json({ error: 'Failed to delete voice agent' })
  }
}

/**
 * PATCH /api/voice-agents/:id/activate
 * Activate agent
 */
const activateAgent = async (req, res) => {
  try {
    const { id } = req.params

    const { data: agent, error: fetchError } = await supabaseAdmin
      .from('voice_agents')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .single()

    if (fetchError || !agent) {
      return res.status(404).json({ error: 'Voice agent not found' })
    }

    const { error } = await supabaseAdmin
      .from('voice_agents')
      .update({ status: 'active', updated_at: new Date().toISOString() })
      .eq('id', id)

    if (error) throw error

    await logAdminActivity(req.admin.id, 'voice_agent_activated', {
      target_type: 'voice_agent',
      target_id: id,
      ip: req.ip,
      extra: { agent_name: agent.name, previous_status: agent.status },
    })

    res.json({ success: true, message: 'Voice agent activated' })
  } catch (err) {
    console.error('Activate agent error:', err)
    res.status(500).json({ error: 'Failed to activate voice agent' })
  }
}

/**
 * PATCH /api/voice-agents/:id/deactivate
 * Deactivate agent
 */
const deactivateAgent = async (req, res) => {
  try {
    const { id } = req.params

    const { data: agent, error: fetchError } = await supabaseAdmin
      .from('voice_agents')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .single()

    if (fetchError || !agent) {
      return res.status(404).json({ error: 'Voice agent not found' })
    }

    const { error } = await supabaseAdmin
      .from('voice_agents')
      .update({ status: 'inactive', updated_at: new Date().toISOString() })
      .eq('id', id)

    if (error) throw error

    await logAdminActivity(req.admin.id, 'voice_agent_deactivated', {
      target_type: 'voice_agent',
      target_id: id,
      ip: req.ip,
      extra: { agent_name: agent.name, previous_status: agent.status },
    })

    res.json({ success: true, message: 'Voice agent deactivated' })
  } catch (err) {
    console.error('Deactivate agent error:', err)
    res.status(500).json({ error: 'Failed to deactivate voice agent' })
  }
}

module.exports = {
  getAgents,
  getAgentById,
  updateAgent,
  deleteAgent,
  activateAgent,
  deactivateAgent,
}
