const { supabaseAdmin } = require('../config/supabase')
const { logAdminActivity } = require('../utils/logger')

/**
 * GET /api/agent-schedules
 * List agent schedule assignments
 */
const getAgentSchedules = async (req, res) => {
  try {
    const { agent_id, schedule_id, page = 0, limit = 50 } = req.query
    const offset = parseInt(page) * parseInt(limit)

    let query = supabaseAdmin
      .from('agent_schedules')
      .select('*, voice_agents(name), call_schedules(schedule_name, timezone, is_active)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + parseInt(limit) - 1)

    if (agent_id) {
      query = query.eq('agent_id', agent_id)
    }

    if (schedule_id) {
      query = query.eq('schedule_id', schedule_id)
    }

    const { data, count, error } = await query

    if (error) {
      // If table doesn't exist, return empty array instead of error
      if (error.code === '42P01' || error.message.includes('does not exist')) {
        return res.json({
          assignments: [],
          total: 0,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: 0,
        })
      }
      return res.status(400).json({ error: error.message })
    }

    res.json({
      assignments: data || [],
      total: count || 0,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil((count || 0) / parseInt(limit)),
    })
  } catch (err) {
    console.error('Get agent schedules error:', err)
    res.status(500).json({ error: 'Failed to fetch agent schedules' })
  }
}

/**
 * POST /api/agent-schedules
 * Assign agent to schedule
 */
const assignAgentToSchedule = async (req, res) => {
  try {
    const { agent_id, schedule_id } = req.body

    if (!agent_id || !schedule_id) {
      return res.status(400).json({ error: 'agent_id and schedule_id are required' })
    }

    // Check if assignment already exists
    const { data: existing } = await supabaseAdmin
      .from('agent_schedules')
      .select('id')
      .eq('agent_id', agent_id)
      .eq('schedule_id', schedule_id)
      .single()

    if (existing) {
      return res.status(409).json({ error: 'Agent is already assigned to this schedule' })
    }

    // Create assignment
    const { data: assignment, error } = await supabaseAdmin
      .from('agent_schedules')
      .insert({
        agent_id,
        schedule_id,
      })
      .select()
      .single()

    if (error) {
      return res.status(400).json({ error: error.message })
    }

    await logAdminActivity(req.admin.id, 'assign_agent_schedule', {
      target_type: 'agent_schedule',
      target_id: assignment.id,
      agent_id,
      schedule_id,
    })

    res.status(201).json({
      message: 'Agent assigned to schedule successfully',
      assignment,
    })
  } catch (err) {
    console.error('Assign agent schedule error:', err)
    res.status(500).json({ error: 'Failed to assign agent to schedule' })
  }
}

/**
 * DELETE /api/agent-schedules/:id
 * Remove agent from schedule
 */
const removeAgentFromSchedule = async (req, res) => {
  try {
    const { id } = req.params

    const { error } = await supabaseAdmin.from('agent_schedules').delete().eq('id', id)

    if (error) {
      return res.status(400).json({ error: error.message })
    }

    await logAdminActivity(req.admin.id, 'remove_agent_schedule', {
      target_type: 'agent_schedule',
      target_id: id,
    })

    res.json({ message: 'Agent removed from schedule successfully' })
  } catch (err) {
    console.error('Remove agent schedule error:', err)
    res.status(500).json({ error: 'Failed to remove agent from schedule' })
  }
}

module.exports = {
  getAgentSchedules,
  assignAgentToSchedule,
  removeAgentFromSchedule,
}
