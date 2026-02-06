const { supabaseAdmin } = require('../config/supabase')
const { logAdminActivity } = require('../utils/logger')

/**
 * GET /api/credits
 * List all user credit balances
 */
const getUserCredits = async (req, res) => {
  try {
    const { search, page = 0, limit = 50 } = req.query
    const offset = parseInt(page) * parseInt(limit)

    let query = supabaseAdmin
      .from('user_credits')
      .select('*', { count: 'exact' })
      .order('updated_at', { ascending: false })
      .range(offset, offset + parseInt(limit) - 1)

    const { data, count, error } = await query

    if (error) {
      return res.status(400).json({ error: error.message })
    }

    // Fetch user emails and names
    const creditsWithUsers = await Promise.all(
      (data || []).map(async (credit) => {
        let email = null
        let firstName = null
        let lastName = null
        try {
          const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(credit.user_id)
          email = authUser?.user?.email || null
        } catch {}
        try {
          const { data: profile } = await supabaseAdmin
            .from('user_profiles')
            .select('first_name, last_name')
            .eq('id', credit.user_id)
            .single()
          firstName = profile?.first_name || null
          lastName = profile?.last_name || null
        } catch {}
        return { ...credit, email, first_name: firstName, last_name: lastName }
      })
    )

    // Filter by search if provided (search by email or name - done post-query since email is from auth)
    let filtered = creditsWithUsers
    if (search) {
      const s = search.toLowerCase()
      filtered = creditsWithUsers.filter(
        (c) =>
          (c.email && c.email.toLowerCase().includes(s)) ||
          (c.first_name && c.first_name.toLowerCase().includes(s)) ||
          (c.last_name && c.last_name.toLowerCase().includes(s))
      )
    }

    res.json({
      credits: filtered,
      total: search ? filtered.length : (count || 0),
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil((search ? filtered.length : (count || 0)) / parseInt(limit)),
    })
  } catch (err) {
    console.error('Get credits error:', err)
    res.status(500).json({ error: 'Failed to fetch user credits' })
  }
}

/**
 * GET /api/credits/transactions
 * List credit transactions with filters
 */
const getCreditTransactions = async (req, res) => {
  try {
    const { user_id, transaction_type, date_from, date_to, page = 0, limit = 50 } = req.query
    const offset = parseInt(page) * parseInt(limit)

    let query = supabaseAdmin
      .from('credit_transactions')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + parseInt(limit) - 1)

    if (user_id) {
      query = query.eq('user_id', user_id)
    }

    if (transaction_type && transaction_type !== 'all') {
      query = query.eq('transaction_type', transaction_type)
    }

    if (date_from) {
      query = query.gte('created_at', date_from)
    }

    if (date_to) {
      query = query.lte('created_at', date_to)
    }

    const { data, count, error } = await query

    if (error) {
      return res.status(400).json({ error: error.message })
    }

    // Fetch user emails
    const transactionsWithEmail = await Promise.all(
      (data || []).map(async (tx) => {
        let email = null
        try {
          const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(tx.user_id)
          email = authUser?.user?.email || null
        } catch {}
        return { ...tx, email }
      })
    )

    res.json({
      transactions: transactionsWithEmail,
      total: count || 0,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil((count || 0) / parseInt(limit)),
    })
  } catch (err) {
    console.error('Get transactions error:', err)
    res.status(500).json({ error: 'Failed to fetch credit transactions' })
  }
}

/**
 * GET /api/credits/transactions/:id
 * Get single transaction details
 */
const getTransactionById = async (req, res) => {
  try {
    const { id } = req.params

    const { data: transaction, error } = await supabaseAdmin
      .from('credit_transactions')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !transaction) {
      return res.status(404).json({ error: 'Transaction not found' })
    }

    let email = null
    try {
      const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(transaction.user_id)
      email = authUser?.user?.email || null
    } catch {}

    res.json({ transaction: { ...transaction, email } })
  } catch (err) {
    console.error('Get transaction error:', err)
    res.status(500).json({ error: 'Failed to fetch transaction' })
  }
}

/**
 * POST /api/credits/adjust
 * Manual credit adjustment (finance, super_admin only)
 */
const adjustCredits = async (req, res) => {
  try {
    const { user_id, amount, description, transaction_type } = req.body

    if (!user_id || amount === undefined || amount === null) {
      return res.status(400).json({ error: 'user_id and amount are required' })
    }

    const validTypes = ['adjustment', 'bonus', 'refund']
    const txType = transaction_type || 'adjustment'
    if (!validTypes.includes(txType)) {
      return res.status(400).json({ error: `Invalid transaction type. Must be one of: ${validTypes.join(', ')}` })
    }

    // Get current balance
    const { data: currentCredits, error: fetchError } = await supabaseAdmin
      .from('user_credits')
      .select('*')
      .eq('user_id', user_id)
      .single()

    if (fetchError || !currentCredits) {
      return res.status(404).json({ error: 'User credits not found. The user may not have a credit record.' })
    }

    const balanceBefore = parseFloat(currentCredits.balance)
    const adjustmentAmount = parseFloat(amount)
    const balanceAfter = balanceBefore + adjustmentAmount

    if (balanceAfter < 0) {
      return res.status(400).json({ error: 'Adjustment would result in negative balance' })
    }

    // Create transaction record
    const { error: txError } = await supabaseAdmin.from('credit_transactions').insert({
      user_id,
      transaction_type: txType,
      amount: adjustmentAmount,
      balance_before: balanceBefore,
      balance_after: balanceAfter,
      description: description || `Admin ${txType}: ${adjustmentAmount > 0 ? '+' : ''}${adjustmentAmount}`,
      metadata: { adjusted_by: req.admin.id, admin_email: req.admin.email },
    })

    if (txError) throw txError

    // Update user credits
    const updateData = {
      balance: balanceAfter,
      updated_at: new Date().toISOString(),
    }

    if (adjustmentAmount > 0) {
      updateData.total_purchased = parseFloat(currentCredits.total_purchased) + adjustmentAmount
    }

    const { error: updateError } = await supabaseAdmin
      .from('user_credits')
      .update(updateData)
      .eq('user_id', user_id)

    if (updateError) throw updateError

    await logAdminActivity(req.admin.id, 'credits_adjusted', {
      target_type: 'user_credits',
      target_id: user_id,
      ip: req.ip,
      extra: {
        amount: adjustmentAmount,
        balance_before: balanceBefore,
        balance_after: balanceAfter,
        transaction_type: txType,
        description,
      },
    })

    res.json({
      success: true,
      message: `Credits ${txType} of ${adjustmentAmount > 0 ? '+' : ''}${adjustmentAmount} applied successfully`,
      balance_before: balanceBefore,
      balance_after: balanceAfter,
    })
  } catch (err) {
    console.error('Adjust credits error:', err)
    res.status(500).json({ error: 'Failed to adjust credits' })
  }
}

module.exports = {
  getUserCredits,
  getCreditTransactions,
  getTransactionById,
  adjustCredits,
}
