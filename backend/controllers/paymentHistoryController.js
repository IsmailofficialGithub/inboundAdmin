const { supabaseAdmin } = require('../config/supabase')
const { logAdminActivity } = require('../utils/logger')

/**
 * GET /api/payments
 * List payment history with filters
 */
const listPayments = async (req, res) => {
  try {
    const {
      page = 0,
      limit = 50,
      user_id,
      invoice_id,
      status,
      payment_method,
      start_date,
      end_date,
      sort_by = 'payment_date',
      sort_order = 'desc',
    } = req.query

    let query = supabaseAdmin
      .from('payment_history')
      .select('*, invoices:invoice_id(invoice_number)', { count: 'exact' })

    // Apply filters
    if (user_id) {
      query = query.eq('user_id', user_id)
    }
    if (invoice_id) {
      query = query.eq('invoice_id', invoice_id)
    }
    if (status) {
      query = query.eq('status', status)
    }
    if (payment_method) {
      query = query.eq('payment_method', payment_method)
    }
    if (start_date) {
      query = query.gte('payment_date', start_date)
    }
    if (end_date) {
      query = query.lte('payment_date', end_date)
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
    const paymentsWithUsers = await Promise.all(
      (data || []).map(async (payment) => {
        try {
          const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(payment.user_id)
          return {
            ...payment,
            users: {
              email: authUser?.user?.email || null,
            },
          }
        } catch (err) {
          return {
            ...payment,
            users: {
              email: null,
            },
          }
        }
      })
    )

    res.json({
      payments: paymentsWithUsers,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count || 0,
        totalPages: Math.ceil((count || 0) / parseInt(limit)),
      },
    })
  } catch (err) {
    console.error('List payments error:', err)
    res.status(500).json({ error: 'Failed to fetch payment history' })
  }
}

/**
 * GET /api/payments/:id
 * Get payment by ID
 */
const getPayment = async (req, res) => {
  try {
    const { id } = req.params

    const { data: payment, error } = await supabaseAdmin
      .from('payment_history')
      .select('*, invoices:invoice_id(*)')
      .eq('id', id)
      .single()

    if (error || !payment) {
      return res.status(404).json({ error: 'Payment not found' })
    }

    // Fetch user data separately
    try {
      const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(payment.user_id)
      payment.users = {
        email: authUser?.user?.email || null,
        first_name: authUser?.user?.user_metadata?.first_name || null,
        last_name: authUser?.user?.user_metadata?.last_name || null,
      }
    } catch (err) {
      payment.users = {
        email: null,
        first_name: null,
        last_name: null,
      }
    }

    res.json({ payment })
  } catch (err) {
    console.error('Get payment error:', err)
    res.status(500).json({ error: 'Failed to fetch payment' })
  }
}

/**
 * POST /api/payments
 * Create payment record (for manual/offline payments)
 */
const createPayment = async (req, res) => {
  try {
    const {
      user_id,
      invoice_id,
      purchase_id,
      subscription_id,
      payment_method,
      payment_provider,
      payment_provider_transaction_id,
      amount,
      currency = 'USD',
      status = 'completed',
      payment_date,
      payment_details,
    } = req.body

    if (!user_id || !amount || !payment_method) {
      return res.status(400).json({ error: 'Missing required fields: user_id, amount, payment_method' })
    }

    const { data: payment, error } = await supabaseAdmin
      .from('payment_history')
      .insert({
        user_id,
        invoice_id,
        purchase_id,
        subscription_id,
        payment_method,
        payment_provider,
        payment_provider_transaction_id,
        amount: parseFloat(amount),
        currency,
        status,
        payment_date: payment_date || new Date().toISOString(),
        processed_at: status === 'completed' ? new Date().toISOString() : null,
        payment_details: payment_details || {},
      })
      .select()
      .single()

    if (error) {
      return res.status(400).json({ error: error.message })
    }

    // If payment is for an invoice, update invoice status
    if (invoice_id && status === 'completed') {
      await supabaseAdmin
        .from('invoices')
        .update({
          status: 'paid',
          paid_at: new Date().toISOString(),
        })
        .eq('id', invoice_id)
    }

    await logAdminActivity(req.admin.id, 'create_payment', {
      target_type: 'payment',
      target_id: payment.id,
      ip: req.ip,
      extra: { amount, user_id, invoice_id },
    })

    res.status(201).json({ payment })
  } catch (err) {
    console.error('Create payment error:', err)
    res.status(500).json({ error: 'Failed to create payment' })
  }
}

/**
 * PUT /api/payments/:id
 * Update payment
 */
const updatePayment = async (req, res) => {
  try {
    const { id } = req.params
    const updateData = {
      ...req.body,
      updated_at: new Date().toISOString(),
    }

    // If status changed to completed, set processed_at
    if (updateData.status === 'completed' && !updateData.processed_at) {
      updateData.processed_at = new Date().toISOString()
    }

    const { data: payment, error } = await supabaseAdmin
      .from('payment_history')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error || !payment) {
      return res.status(404).json({ error: 'Payment not found or update failed' })
    }

    // Update invoice status if payment status changed
    if (payment.invoice_id && updateData.status === 'completed') {
      await supabaseAdmin
        .from('invoices')
        .update({
          status: 'paid',
          paid_at: new Date().toISOString(),
        })
        .eq('id', payment.invoice_id)
    }

    await logAdminActivity(req.admin.id, 'update_payment', {
      target_type: 'payment',
      target_id: id,
      ip: req.ip,
    })

    res.json({ payment })
  } catch (err) {
    console.error('Update payment error:', err)
    res.status(500).json({ error: 'Failed to update payment' })
  }
}

module.exports = {
  listPayments,
  getPayment,
  createPayment,
  updatePayment,
}
