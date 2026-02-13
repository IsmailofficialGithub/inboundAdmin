const { supabaseAdmin } = require('../config/supabase')
const { logAdminActivity } = require('../utils/logger')

/**
 * GET /api/call-schedules
 * List all call schedules with filters
 */
const getCallSchedules = async (req, res) => {
  try {
    const { user_id, agent_id, is_active, page = 0, limit = 50 } = req.query
    const offset = parseInt(page) * parseInt(limit)

    let query = supabaseAdmin
      .from('call_schedules')
      .select('*', { count: 'exact' })
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .range(offset, offset + parseInt(limit) - 1)

    if (user_id) {
      query = query.eq('user_id', user_id)
    }

    if (agent_id) {
      query = query.eq('agent_id', agent_id)
    }

    if (is_active === 'true') {
      query = query.eq('is_active', true)
    } else if (is_active === 'false') {
      query = query.eq('is_active', false)
    }

    const { data, count, error } = await query

    if (error) {
      // If table doesn't exist, return empty array instead of error
      if (error.code === '42P01' || error.message.includes('does not exist')) {
        return res.json({
          schedules: [],
          total: 0,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: 0,
        })
      }
      return res.status(400).json({ error: error.message })
    }

    // Fetch user emails and agent names
    const schedulesWithDetails = await Promise.all(
      (data || []).map(async (schedule) => {
        let userEmail = null
        let agentName = null

        try {
          const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(schedule.user_id)
          userEmail = authUser?.user?.email || null
        } catch {}

        if (schedule.agent_id) {
          try {
            const { data: agent } = await supabaseAdmin
              .from('voice_agents')
              .select('name')
              .eq('id', schedule.agent_id)
              .single()
            agentName = agent?.name || null
          } catch {}
        }

        return {
          ...schedule,
          user_email: userEmail,
          agent_name: agentName,
        }
      })
    )

    res.json({
      schedules: schedulesWithDetails,
      total: count || 0,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil((count || 0) / parseInt(limit)),
    })
  } catch (err) {
    console.error('Get call schedules error:', err)
    res.status(500).json({ error: 'Failed to fetch call schedules' })
  }
}

/**
 * GET /api/call-schedules/:id
 * Get single call schedule with availability and overrides
 */
const getCallSchedule = async (req, res) => {
  try {
    const { id } = req.params

    const { data: schedule, error } = await supabaseAdmin
      .from('call_schedules')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .single()

    if (error || !schedule) {
      return res.status(404).json({ error: 'Schedule not found' })
    }

    // Fetch weekly availability
    const { data: availability } = await supabaseAdmin
      .from('weekly_availability')
      .select('*')
      .eq('schedule_id', id)
      .order('day_of_week', { ascending: true })

    // Fetch schedule overrides
    const { data: overrides } = await supabaseAdmin
      .from('schedule_overrides')
      .select('*')
      .eq('schedule_id', id)
      .order('override_date', { ascending: true })

    // Fetch after-hours message
    const { data: afterHours } = await supabaseAdmin
      .from('after_hours_messages')
      .select('*')
      .eq('schedule_id', id)
      .single()

    res.json({
      schedule,
      availability: availability || [],
      overrides: overrides || [],
      after_hours: afterHours || null,
    })
  } catch (err) {
    console.error('Get call schedule error:', err)
    res.status(500).json({ error: 'Failed to fetch call schedule' })
  }
}

/**
 * POST /api/call-schedules
 * Create new call schedule
 */
const createCallSchedule = async (req, res) => {
  try {
    const {
      user_id,
      agent_id,
      schedule_name,
      timezone = 'America/New_York',
      is_active = true,
      availability = [],
      after_hours = null,
    } = req.body

    if (!user_id || !schedule_name) {
      return res.status(400).json({ error: 'user_id and schedule_name are required' })
    }

    // Create schedule
    const { data: schedule, error: scheduleError } = await supabaseAdmin
      .from('call_schedules')
      .insert({
        user_id,
        agent_id: agent_id || null,
        schedule_name,
        timezone,
        is_active,
      })
      .select()
      .single()

    if (scheduleError) {
      return res.status(400).json({ error: scheduleError.message })
    }

    // Create weekly availability if provided
    if (availability && availability.length > 0) {
      const availabilityData = availability.map((avail) => ({
        schedule_id: schedule.id,
        day_of_week: avail.day_of_week,
        is_available: avail.is_available || false,
        start_time: avail.start_time,
        end_time: avail.end_time,
        break_start_time: avail.break_start_time || null,
        break_end_time: avail.break_end_time || null,
      }))

      const { error: availError } = await supabaseAdmin
        .from('weekly_availability')
        .insert(availabilityData)

      if (availError) {
        console.error('Error creating availability:', availError)
      }
    }

    // Create after-hours message if provided
    if (after_hours) {
      const { error: afterHoursError } = await supabaseAdmin
        .from('after_hours_messages')
        .insert({
          schedule_id: schedule.id,
          message_text: after_hours.message_text,
          message_type: after_hours.message_type || 'voicemail',
          redirect_phone_number: after_hours.redirect_phone_number || null,
          callback_enabled: after_hours.callback_enabled || false,
          is_active: after_hours.is_active !== undefined ? after_hours.is_active : true,
        })

      if (afterHoursError) {
        console.error('Error creating after-hours message:', afterHoursError)
      }
    }

    await logAdminActivity(req.admin.id, 'create_call_schedule', {
      target_type: 'call_schedule',
      target_id: schedule.id,
      user_id,
    })

    res.status(201).json({
      message: 'Call schedule created successfully',
      schedule,
    })
  } catch (err) {
    console.error('Create call schedule error:', err)
    res.status(500).json({ error: 'Failed to create call schedule' })
  }
}

/**
 * PUT /api/call-schedules/:id
 * Update call schedule
 */
const updateCallSchedule = async (req, res) => {
  try {
    const { id } = req.params
    const { schedule_name, timezone, is_active, agent_id, availability, after_hours } = req.body

    // Check if schedule exists
    const { data: existingSchedule, error: fetchError } = await supabaseAdmin
      .from('call_schedules')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .single()

    if (fetchError || !existingSchedule) {
      return res.status(404).json({ error: 'Schedule not found' })
    }

    // Update schedule
    const updateData = {}
    if (schedule_name !== undefined) updateData.schedule_name = schedule_name
    if (timezone !== undefined) updateData.timezone = timezone
    if (is_active !== undefined) updateData.is_active = is_active
    if (agent_id !== undefined) updateData.agent_id = agent_id || null

    if (Object.keys(updateData).length > 0) {
      const { data: updatedSchedule, error: updateError } = await supabaseAdmin
        .from('call_schedules')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()

      if (updateError) {
        return res.status(400).json({ error: updateError.message })
      }
    }

    // Update availability if provided
    if (availability && Array.isArray(availability)) {
      // Delete existing availability
      await supabaseAdmin.from('weekly_availability').delete().eq('schedule_id', id)

      // Insert new availability
      if (availability.length > 0) {
        const availabilityData = availability.map((avail) => ({
          schedule_id: id,
          day_of_week: avail.day_of_week,
          is_available: avail.is_available || false,
          start_time: avail.start_time,
          end_time: avail.end_time,
          break_start_time: avail.break_start_time || null,
          break_end_time: avail.break_end_time || null,
        }))

        await supabaseAdmin.from('weekly_availability').insert(availabilityData)
      }
    }

    // Update after-hours message if provided
    if (after_hours !== undefined) {
      // Delete existing
      await supabaseAdmin.from('after_hours_messages').delete().eq('schedule_id', id)

      // Insert new if provided
      if (after_hours && after_hours.message_text) {
        await supabaseAdmin.from('after_hours_messages').insert({
          schedule_id: id,
          message_text: after_hours.message_text,
          message_type: after_hours.message_type || 'voicemail',
          redirect_phone_number: after_hours.redirect_phone_number || null,
          callback_enabled: after_hours.callback_enabled || false,
          is_active: after_hours.is_active !== undefined ? after_hours.is_active : true,
        })
      }
    }

    await logAdminActivity(req.admin.id, 'update_call_schedule', {
      target_type: 'call_schedule',
      target_id: id,
    })

    res.json({
      message: 'Call schedule updated successfully',
    })
  } catch (err) {
    console.error('Update call schedule error:', err)
    res.status(500).json({ error: 'Failed to update call schedule' })
  }
}

/**
 * DELETE /api/call-schedules/:id
 * Delete call schedule (soft delete)
 */
const deleteCallSchedule = async (req, res) => {
  try {
    const { id } = req.params

    const { error } = await supabaseAdmin
      .from('call_schedules')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)

    if (error) {
      return res.status(400).json({ error: error.message })
    }

    await logAdminActivity(req.admin.id, 'delete_call_schedule', {
      target_type: 'call_schedule',
      target_id: id,
    })

    res.json({ message: 'Call schedule deleted successfully' })
  } catch (err) {
    console.error('Delete call schedule error:', err)
    res.status(500).json({ error: 'Failed to delete call schedule' })
  }
}

module.exports = {
  getCallSchedules,
  getCallSchedule,
  createCallSchedule,
  updateCallSchedule,
  deleteCallSchedule,
}
