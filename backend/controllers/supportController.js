const { supabaseAdmin } = require('../config/supabase')
const { logAdminActivity } = require('../utils/logger')

/**
 * GET /api/support/tickets
 * List all support tickets with filters
 */
const getTickets = async (req, res) => {
  try {
    const { status, priority, assigned_to, user_id, page = 0, limit = 50, search } = req.query
    const offset = parseInt(page) * parseInt(limit)

    let query = supabaseAdmin
      .from('support_tickets')
      .select('*, assigned_admin:assigned_to(id, email, first_name, last_name)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + parseInt(limit) - 1)

    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    if (priority && priority !== 'all') {
      query = query.eq('priority', priority)
    }

    if (assigned_to) {
      query = query.eq('assigned_to', assigned_to)
    }

    if (user_id) {
      query = query.eq('user_id', user_id)
    }

    if (search) {
      query = query.or(`subject.ilike.%${search}%,description.ilike.%${search}%`)
    }

    const { data, count, error } = await query

    if (error) {
      return res.status(400).json({ error: error.message })
    }

    // Fetch user emails from auth.users
    const ticketsWithUserData = await Promise.all(
      (data || []).map(async (ticket) => {
        try {
          const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(ticket.user_id)
          return {
            ...ticket,
            user_email: authUser?.user?.email || null,
          }
        } catch {
          return {
            ...ticket,
            user_email: null,
          }
        }
      })
    )

    res.json({
      tickets: ticketsWithUserData,
      total: count || 0,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil((count || 0) / parseInt(limit)),
    })
  } catch (err) {
    console.error('Get tickets error:', err)
    res.status(500).json({ error: 'Failed to fetch tickets' })
  }
}

/**
 * GET /api/support/tickets/:id
 * Get single ticket with notes
 */
const getTicketById = async (req, res) => {
  try {
    const { id } = req.params

    // Get ticket
    const { data: ticket, error: ticketError } = await supabaseAdmin
      .from('support_tickets')
      .select('*, assigned_admin:assigned_to(id, email, first_name, last_name)')
      .eq('id', id)
      .single()

    if (ticketError || !ticket) {
      return res.status(404).json({ error: 'Ticket not found' })
    }

    // Get user email
    let userEmail = null
    try {
      const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(ticket.user_id)
      userEmail = authUser?.user?.email || null
    } catch {}

    // Get notes
    const { data: notes, error: notesError } = await supabaseAdmin
      .from('support_ticket_notes')
      .select('*, admin:admin_id(id, email, first_name, last_name)')
      .eq('ticket_id', id)
      .order('created_at', { ascending: true })

    res.json({
      ticket: {
        ...ticket,
        user_email: userEmail,
      },
      notes: notes || [],
    })
  } catch (err) {
    console.error('Get ticket error:', err)
    res.status(500).json({ error: 'Failed to fetch ticket' })
  }
}

/**
 * POST /api/support/tickets
 * Create a new support ticket
 */
const createTicket = async (req, res) => {
  try {
    const { user_id, subject, description, priority = 'medium' } = req.body

    if (!user_id || !subject || !description) {
      return res.status(400).json({ error: 'user_id, subject, and description are required' })
    }

    const validPriorities = ['low', 'medium', 'high', 'urgent']
    if (!validPriorities.includes(priority)) {
      return res.status(400).json({ error: `Invalid priority. Must be one of: ${validPriorities.join(', ')}` })
    }

    // Verify user exists
    const { data: authUser, error: userError } = await supabaseAdmin.auth.admin.getUserById(user_id)
    if (userError || !authUser) {
      return res.status(404).json({ error: 'User not found' })
    }

    const { data: ticket, error: ticketError } = await supabaseAdmin
      .from('support_tickets')
      .insert({
        user_id,
        subject,
        description,
        priority,
        status: 'open',
      })
      .select()
      .single()

    if (ticketError) {
      return res.status(400).json({ error: ticketError.message })
    }

    await logAdminActivity(req.admin.id, 'ticket_created', {
      target_type: 'ticket',
      target_id: ticket.id,
      ip: req.ip,
      extra: { user_id, subject, priority },
    })

    res.status(201).json({
      success: true,
      message: 'Ticket created successfully',
      ticket,
    })
  } catch (err) {
    console.error('Create ticket error:', err)
    res.status(500).json({ error: 'Failed to create ticket' })
  }
}

/**
 * PUT /api/support/tickets/:id
 * Update ticket
 */
const updateTicket = async (req, res) => {
  try {
    const { id } = req.params
    const { subject, description, status, priority, assigned_to } = req.body

    // Get existing ticket
    const { data: existingTicket, error: fetchError } = await supabaseAdmin
      .from('support_tickets')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !existingTicket) {
      return res.status(404).json({ error: 'Ticket not found' })
    }

    const updateData = {}
    if (subject !== undefined) updateData.subject = subject
    if (description !== undefined) updateData.description = description
    if (priority !== undefined) {
      const validPriorities = ['low', 'medium', 'high', 'urgent']
      if (!validPriorities.includes(priority)) {
        return res.status(400).json({ error: `Invalid priority. Must be one of: ${validPriorities.join(', ')}` })
      }
      updateData.priority = priority
    }
    if (status !== undefined) {
      const validStatuses = ['open', 'in_progress', 'resolved', 'closed']
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` })
      }
      updateData.status = status

      // Set resolved_at or closed_at timestamps
      if (status === 'resolved' && existingTicket.status !== 'resolved') {
        updateData.resolved_at = new Date().toISOString()
      }
      if (status === 'closed' && existingTicket.status !== 'closed') {
        updateData.closed_at = new Date().toISOString()
      }
    }
    if (assigned_to !== undefined) {
      if (assigned_to) {
        // Verify admin exists
        const { data: admin } = await supabaseAdmin
          .from('admin_profiles')
          .select('id')
          .eq('id', assigned_to)
          .eq('is_active', true)
          .single()

        if (!admin) {
          return res.status(404).json({ error: 'Assigned admin not found' })
        }
      }
      updateData.assigned_to = assigned_to || null
    }

    const { data: updatedTicket, error: updateError } = await supabaseAdmin
      .from('support_tickets')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      return res.status(400).json({ error: updateError.message })
    }

    await logAdminActivity(req.admin.id, 'ticket_updated', {
      target_type: 'ticket',
      target_id: id,
      ip: req.ip,
      extra: {
        updated_fields: Object.keys(updateData),
        previous_status: existingTicket.status,
        new_status: status || existingTicket.status,
      },
    })

    res.json({
      success: true,
      message: 'Ticket updated successfully',
      ticket: updatedTicket,
    })
  } catch (err) {
    console.error('Update ticket error:', err)
    res.status(500).json({ error: 'Failed to update ticket' })
  }
}

/**
 * POST /api/support/tickets/:id/notes
 * Add a note to a ticket
 */
const addTicketNote = async (req, res) => {
  try {
    const { id } = req.params
    const { note, is_internal = true } = req.body

    if (!note || !note.trim()) {
      return res.status(400).json({ error: 'Note is required' })
    }

    // Verify ticket exists
    const { data: ticket, error: ticketError } = await supabaseAdmin
      .from('support_tickets')
      .select('id')
      .eq('id', id)
      .single()

    if (ticketError || !ticket) {
      return res.status(404).json({ error: 'Ticket not found' })
    }

    const { data: ticketNote, error: noteError } = await supabaseAdmin
      .from('support_ticket_notes')
      .insert({
        ticket_id: id,
        admin_id: req.admin.id,
        note: note.trim(),
        is_internal: is_internal === true || is_internal === 'true',
      })
      .select('*, admin:admin_id(id, email, first_name, last_name)')
      .single()

    if (noteError) {
      return res.status(400).json({ error: noteError.message })
    }

    await logAdminActivity(req.admin.id, 'ticket_note_added', {
      target_type: 'ticket',
      target_id: id,
      ip: req.ip,
      extra: { is_internal },
    })

    res.status(201).json({
      success: true,
      message: 'Note added successfully',
      note: ticketNote,
    })
  } catch (err) {
    console.error('Add ticket note error:', err)
    res.status(500).json({ error: 'Failed to add note' })
  }
}

/**
 * DELETE /api/support/tickets/:id
 * Delete a ticket (soft delete by closing it, or hard delete)
 */
const deleteTicket = async (req, res) => {
  try {
    const { id } = req.params

    // Verify ticket exists
    const { data: ticket, error: ticketError } = await supabaseAdmin
      .from('support_tickets')
      .select('*')
      .eq('id', id)
      .single()

    if (ticketError || !ticket) {
      return res.status(404).json({ error: 'Ticket not found' })
    }

    // Delete ticket (cascade will delete notes)
    const { error: deleteError } = await supabaseAdmin
      .from('support_tickets')
      .delete()
      .eq('id', id)

    if (deleteError) {
      return res.status(400).json({ error: deleteError.message })
    }

    await logAdminActivity(req.admin.id, 'ticket_deleted', {
      target_type: 'ticket',
      target_id: id,
      ip: req.ip,
      extra: { subject: ticket.subject },
    })

    res.json({
      success: true,
      message: 'Ticket deleted successfully',
    })
  } catch (err) {
    console.error('Delete ticket error:', err)
    res.status(500).json({ error: 'Failed to delete ticket' })
  }
}

module.exports = {
  getTickets,
  getTicketById,
  createTicket,
  updateTicket,
  addTicketNote,
  deleteTicket,
}
