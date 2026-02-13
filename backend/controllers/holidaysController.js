const { supabaseAdmin } = require('../config/supabase')
const { logAdminActivity } = require('../utils/logger')

/**
 * GET /api/holidays
 * List all holidays with filters
 */
const getHolidays = async (req, res) => {
  try {
    const { user_id, is_active, is_recurring, year, page = 0, limit = 50 } = req.query
    const offset = parseInt(page) * parseInt(limit)

    let query = supabaseAdmin
      .from('holidays')
      .select('*', { count: 'exact' })
      .is('deleted_at', null)
      .order('holiday_date', { ascending: true })
      .range(offset, offset + parseInt(limit) - 1)

    if (user_id) {
      query = query.eq('user_id', user_id)
    } else {
      // If no user_id, show global holidays (user_id IS NULL)
      query = query.is('user_id', null)
    }

    if (is_active === 'true') {
      query = query.eq('is_active', true)
    } else if (is_active === 'false') {
      query = query.eq('is_active', false)
    }

    if (is_recurring === 'true') {
      query = query.eq('is_recurring', true)
    } else if (is_recurring === 'false') {
      query = query.eq('is_recurring', false)
    }

    if (year) {
      query = query.gte('holiday_date', `${year}-01-01`).lte('holiday_date', `${year}-12-31`)
    }

    const { data, count, error } = await query

    if (error) {
      // If table doesn't exist, return empty array instead of error
      if (error.code === '42P01' || error.message.includes('does not exist')) {
        return res.json({
          holidays: [],
          total: 0,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: 0,
        })
      }
      return res.status(400).json({ error: error.message })
    }

    // Fetch holiday messages and user emails
    const holidaysWithDetails = await Promise.all(
      (data || []).map(async (holiday) => {
        let userEmail = null
        if (holiday.user_id) {
          try {
            const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(holiday.user_id)
            userEmail = authUser?.user?.email || null
          } catch {}
        }

        // Fetch holiday message
        const { data: message } = await supabaseAdmin
          .from('holiday_messages')
          .select('*')
          .eq('holiday_id', holiday.id)
          .eq('is_active', true)
          .single()

        return {
          ...holiday,
          user_email: userEmail,
          message: message || null,
        }
      })
    )

    res.json({
      holidays: holidaysWithDetails,
      total: count || 0,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil((count || 0) / parseInt(limit)),
    })
  } catch (err) {
    console.error('Get holidays error:', err)
    res.status(500).json({ error: 'Failed to fetch holidays' })
  }
}

/**
 * GET /api/holidays/:id
 * Get single holiday with message
 */
const getHoliday = async (req, res) => {
  try {
    const { id } = req.params

    const { data: holiday, error } = await supabaseAdmin
      .from('holidays')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .single()

    if (error || !holiday) {
      return res.status(404).json({ error: 'Holiday not found' })
    }

    // Fetch holiday message
    const { data: message } = await supabaseAdmin
      .from('holiday_messages')
      .select('*')
      .eq('holiday_id', id)
      .single()

    res.json({
      holiday,
      message: message || null,
    })
  } catch (err) {
    console.error('Get holiday error:', err)
    res.status(500).json({ error: 'Failed to fetch holiday' })
  }
}

/**
 * POST /api/holidays
 * Create new holiday
 */
const createHoliday = async (req, res) => {
  try {
    const {
      user_id,
      holiday_name,
      holiday_date,
      is_recurring = false,
      is_active = true,
      message = null,
    } = req.body

    if (!holiday_name || !holiday_date) {
      return res.status(400).json({ error: 'holiday_name and holiday_date are required' })
    }

    // Create holiday
    const { data: holiday, error: holidayError } = await supabaseAdmin
      .from('holidays')
      .insert({
        user_id: user_id || null,
        holiday_name,
        holiday_date,
        is_recurring,
        is_active,
      })
      .select()
      .single()

    if (holidayError) {
      return res.status(400).json({ error: holidayError.message })
    }

    // Create holiday message if provided
    if (message && message.message_text) {
      const { error: messageError } = await supabaseAdmin
        .from('holiday_messages')
        .insert({
          holiday_id: holiday.id,
          message_text: message.message_text,
          message_type: message.message_type || 'greeting',
          redirect_phone_number: message.redirect_phone_number || null,
          is_active: message.is_active !== undefined ? message.is_active : true,
        })

      if (messageError) {
        console.error('Error creating holiday message:', messageError)
      }
    }

    await logAdminActivity(req.admin.id, 'create_holiday', {
      target_type: 'holiday',
      target_id: holiday.id,
    })

    res.status(201).json({
      message: 'Holiday created successfully',
      holiday,
    })
  } catch (err) {
    console.error('Create holiday error:', err)
    res.status(500).json({ error: 'Failed to create holiday' })
  }
}

/**
 * PUT /api/holidays/:id
 * Update holiday
 */
const updateHoliday = async (req, res) => {
  try {
    const { id } = req.params
    const { holiday_name, holiday_date, is_recurring, is_active, message } = req.body

    // Check if holiday exists
    const { data: existingHoliday, error: fetchError } = await supabaseAdmin
      .from('holidays')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .single()

    if (fetchError || !existingHoliday) {
      return res.status(404).json({ error: 'Holiday not found' })
    }

    // Update holiday
    const updateData = {}
    if (holiday_name !== undefined) updateData.holiday_name = holiday_name
    if (holiday_date !== undefined) updateData.holiday_date = holiday_date
    if (is_recurring !== undefined) updateData.is_recurring = is_recurring
    if (is_active !== undefined) updateData.is_active = is_active

    if (Object.keys(updateData).length > 0) {
      const { error: updateError } = await supabaseAdmin
        .from('holidays')
        .update(updateData)
        .eq('id', id)

      if (updateError) {
        return res.status(400).json({ error: updateError.message })
      }
    }

    // Update holiday message if provided
    if (message !== undefined) {
      // Delete existing message
      await supabaseAdmin.from('holiday_messages').delete().eq('holiday_id', id)

      // Insert new message if provided
      if (message && message.message_text) {
        await supabaseAdmin.from('holiday_messages').insert({
          holiday_id: id,
          message_text: message.message_text,
          message_type: message.message_type || 'greeting',
          redirect_phone_number: message.redirect_phone_number || null,
          is_active: message.is_active !== undefined ? message.is_active : true,
        })
      }
    }

    await logAdminActivity(req.admin.id, 'update_holiday', {
      target_type: 'holiday',
      target_id: id,
    })

    res.json({ message: 'Holiday updated successfully' })
  } catch (err) {
    console.error('Update holiday error:', err)
    res.status(500).json({ error: 'Failed to update holiday' })
  }
}

/**
 * DELETE /api/holidays/:id
 * Delete holiday (soft delete)
 */
const deleteHoliday = async (req, res) => {
  try {
    const { id } = req.params

    const { error } = await supabaseAdmin
      .from('holidays')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)

    if (error) {
      return res.status(400).json({ error: error.message })
    }

    await logAdminActivity(req.admin.id, 'delete_holiday', {
      target_type: 'holiday',
      target_id: id,
    })

    res.json({ message: 'Holiday deleted successfully' })
  } catch (err) {
    console.error('Delete holiday error:', err)
    res.status(500).json({ error: 'Failed to delete holiday' })
  }
}

module.exports = {
  getHolidays,
  getHoliday,
  createHoliday,
  updateHoliday,
  deleteHoliday,
}
