const { supabaseAdmin } = require('../config/supabase')
const { logAdminActivity } = require('../utils/logger')

/**
 * GET /api/refunds-disputes
 * List refunds and disputes
 */
const listRefundsDisputes = async (req, res) => {
  try {
    const {
      page = 0,
      limit = 50,
      user_id,
      invoice_id,
      payment_id,
      type,
      status,
      start_date,
      end_date,
      sort_by = 'created_at',
      sort_order = 'desc',
    } = req.query

    let query = supabaseAdmin
      .from('refund_dispute_notes')
      .select('*, invoices:invoice_id(invoice_number), payments:payment_id(*)', {
        count: 'exact',
      })

    // Apply filters
    if (user_id) {
      query = query.eq('user_id', user_id)
    }
    if (invoice_id) {
      query = query.eq('invoice_id', invoice_id)
    }
    if (payment_id) {
      query = query.eq('payment_id', payment_id)
    }
    if (type) {
      query = query.eq('type', type)
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
    const refundsDisputesWithUsers = await Promise.all(
      (data || []).map(async (refundDispute) => {
        try {
          const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(refundDispute.user_id)
          return {
            ...refundDispute,
            users: {
              email: authUser?.user?.email || null,
            },
          }
        } catch (err) {
          return {
            ...refundDispute,
            users: {
              email: null,
            },
          }
        }
      })
    )

    res.json({
      refundsDisputes: refundsDisputesWithUsers,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count || 0,
        totalPages: Math.ceil((count || 0) / parseInt(limit)),
      },
    })
  } catch (err) {
    console.error('List refunds/disputes error:', err)
    res.status(500).json({ error: 'Failed to fetch refunds/disputes' })
  }
}

/**
 * GET /api/refunds-disputes/:id
 * Get refund/dispute by ID
 */
const getRefundDispute = async (req, res) => {
  try {
    const { id } = req.params

    const { data: refundDispute, error } = await supabaseAdmin
      .from('refund_dispute_notes')
      .select('*, invoices:invoice_id(*), payments:payment_id(*), processed_by_admin:processed_by(*)')
      .eq('id', id)
      .single()

    if (error || !refundDispute) {
      return res.status(404).json({ error: 'Refund/dispute not found' })
    }

    // Fetch user data separately
    try {
      const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(refundDispute.user_id)
      refundDispute.users = {
        email: authUser?.user?.email || null,
        first_name: authUser?.user?.user_metadata?.first_name || null,
        last_name: authUser?.user?.user_metadata?.last_name || null,
      }
    } catch (err) {
      refundDispute.users = {
        email: null,
        first_name: null,
        last_name: null,
      }
    }

    res.json({ refundDispute })
  } catch (err) {
    console.error('Get refund/dispute error:', err)
    res.status(500).json({ error: 'Failed to fetch refund/dispute' })
  }
}

/**
 * POST /api/refunds-disputes
 * Create refund/dispute note
 */
const createRefundDispute = async (req, res) => {
  try {
    const {
      user_id,
      invoice_id,
      payment_id,
      type,
      amount,
      currency = 'USD',
      reason,
      notes,
      external_reference,
    } = req.body

    if (!user_id || !type || !amount || !reason) {
      return res.status(400).json({ error: 'Missing required fields: user_id, type, amount, reason' })
    }

    if (!['refund', 'dispute', 'chargeback'].includes(type)) {
      return res.status(400).json({ error: 'Invalid type. Must be: refund, dispute, or chargeback' })
    }

    const { data: refundDispute, error } = await supabaseAdmin
      .from('refund_dispute_notes')
      .insert({
        user_id,
        invoice_id,
        payment_id,
        type,
        amount: parseFloat(amount),
        currency,
        status: 'pending',
        reason,
        notes: notes || null,
        external_reference: external_reference || null,
      })
      .select()
      .single()

    if (error) {
      return res.status(400).json({ error: error.message })
    }

    await logAdminActivity(req.admin.id, 'create_refund_dispute', {
      target_type: 'refund_dispute',
      target_id: refundDispute.id,
      ip: req.ip,
      extra: { type, amount, user_id },
    })

    res.status(201).json({ refundDispute })
  } catch (err) {
    console.error('Create refund/dispute error:', err)
    res.status(500).json({ error: 'Failed to create refund/dispute' })
  }
}

/**
 * PUT /api/refunds-disputes/:id
 * Update refund/dispute (approve, reject, process)
 */
const updateRefundDispute = async (req, res) => {
  try {
    const { id } = req.params
    const { status, admin_notes, payment_provider_refund_id } = req.body

    if (!status || !['pending', 'approved', 'rejected', 'processed', 'cancelled'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' })
    }

    const updateData = {
      status,
      updated_at: new Date().toISOString(),
    }

    if (admin_notes !== undefined) {
      updateData.admin_notes = admin_notes
    }
    if (payment_provider_refund_id !== undefined) {
      updateData.payment_provider_refund_id = payment_provider_refund_id
    }

    // If status is processed or approved, set processed_by and processed_at
    if (status === 'processed' || status === 'approved') {
      updateData.processed_by = req.admin.id
      updateData.processed_at = new Date().toISOString()
    }

    const { data: refundDispute, error } = await supabaseAdmin
      .from('refund_dispute_notes')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error || !refundDispute) {
      return res.status(404).json({ error: 'Refund/dispute not found or update failed' })
    }

    // If refund is processed and linked to a payment, update payment record
    if (status === 'processed' && refundDispute.payment_id) {
      await supabaseAdmin
        .from('payment_history')
        .update({
          is_refunded: true,
          refund_amount: refundDispute.amount,
          refunded_at: new Date().toISOString(),
          status: 'refunded',
        })
        .eq('id', refundDispute.payment_id)
    }

    await logAdminActivity(req.admin.id, 'update_refund_dispute', {
      target_type: 'refund_dispute',
      target_id: id,
      ip: req.ip,
      extra: { status, type: refundDispute.type },
    })

    res.json({ refundDispute })
  } catch (err) {
    console.error('Update refund/dispute error:', err)
    res.status(500).json({ error: 'Failed to update refund/dispute' })
  }
}

module.exports = {
  listRefundsDisputes,
  getRefundDispute,
  createRefundDispute,
  updateRefundDispute,
}
