const { supabaseAdmin } = require('../config/supabase')

/**
 * GET /api/password-history/:user_id
 * View password history for a user
 */
const getPasswordHistory = async (req, res) => {
  try {
    const { user_id } = req.params
    const { limit = 10 } = req.query

    // Verify user exists
    try {
      const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(user_id)
      if (!authUser?.user) {
        return res.status(404).json({ error: 'User not found' })
      }
    } catch {
      return res.status(404).json({ error: 'User not found' })
    }

    const { data: history, error } = await supabaseAdmin
      .from('password_history')
      .select('id, created_at')
      .eq('user_id', user_id)
      .order('created_at', { ascending: false })
      .limit(parseInt(limit))

    if (error) {
      return res.status(400).json({ error: error.message })
    }

    // Don't return password hashes, just metadata
    const safeHistory = (history || []).map((entry) => ({
      id: entry.id,
      changed_at: entry.created_at,
    }))

    res.json({
      user_id,
      history: safeHistory,
      count: safeHistory.length,
    })
  } catch (err) {
    console.error('Get password history error:', err)
    res.status(500).json({ error: 'Failed to fetch password history' })
  }
}

module.exports = {
  getPasswordHistory,
}
