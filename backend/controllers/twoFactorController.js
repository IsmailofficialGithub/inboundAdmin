const { supabaseAdmin } = require('../config/supabase')
const { logAdminActivity } = require('../utils/logger')

/**
 * GET /api/2fa/users
 * List users with 2FA enabled
 */
const getUsersWith2FA = async (req, res) => {
  try {
    const { enabled, method, page = 0, limit = 50 } = req.query
    const offset = parseInt(page) * parseInt(limit)

    let query = supabaseAdmin
      .from('user_2fa')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + parseInt(limit) - 1)

    if (enabled === 'true') {
      query = query.eq('enabled', true)
    } else if (enabled === 'false') {
      query = query.eq('enabled', false)
    }

    if (method) {
      query = query.eq('method', method)
    }

    const { data, count, error } = await query

    if (error) {
      // If table doesn't exist, return empty array instead of error
      if (error.code === '42P01' || error.message.includes('does not exist')) {
        return res.json({
          users: [],
          total: 0,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: 0,
        })
      }
      return res.status(400).json({ error: error.message })
    }

    // Fetch user emails and names
    const usersWith2FA = await Promise.all(
      (data || []).map(async (twoFA) => {
        let email = null
        let firstName = null
        let lastName = null
        try {
          const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(twoFA.user_id)
          email = authUser?.user?.email || null
        } catch {}

        try {
          const { data: profile } = await supabaseAdmin
            .from('user_profiles')
            .select('first_name, last_name')
            .eq('id', twoFA.user_id)
            .single()
          firstName = profile?.first_name || null
          lastName = profile?.last_name || null
        } catch {}

        // Don't return secret_key or backup_codes
        const { secret_key, backup_codes, ...safeData } = twoFA

        return {
          ...safeData,
          user_email: email,
          first_name: firstName,
          last_name: lastName,
        }
      })
    )

    res.json({
      users: usersWith2FA,
      total: count || 0,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil((count || 0) / parseInt(limit)),
    })
  } catch (err) {
    console.error('Get users with 2FA error:', err)
    res.status(500).json({ error: 'Failed to fetch users with 2FA' })
  }
}

/**
 * POST /api/2fa/:user_id/disable
 * Force disable 2FA for a user (admin action)
 */
const disable2FA = async (req, res) => {
  try {
    const { user_id } = req.params
    const { reason } = req.body

    // Verify user exists
    try {
      const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(user_id)
      if (!authUser?.user) {
        return res.status(404).json({ error: 'User not found' })
      }
    } catch {
      return res.status(404).json({ error: 'User not found' })
    }

    // Get current 2FA status
    const { data: current2FA, error: fetchError } = await supabaseAdmin
      .from('user_2fa')
      .select('*')
      .eq('user_id', user_id)
      .single()

    if (fetchError && fetchError.code !== 'PGRST116') {
      return res.status(400).json({ error: fetchError.message })
    }

    if (!current2FA || !current2FA.enabled) {
      return res.status(400).json({ error: 'User does not have 2FA enabled' })
    }

    // Disable 2FA
    const { data: updated2FA, error: updateError } = await supabaseAdmin
      .from('user_2fa')
      .update({
        enabled: false,
        verified: false,
        secret_key: null,
        backup_codes: null,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user_id)
      .select()
      .single()

    if (updateError) {
      return res.status(400).json({ error: updateError.message })
    }

    // Log admin activity
    await logAdminActivity(req.admin.id, 'disable_user_2fa', {
      target_type: 'user_2fa',
      target_id: user_id,
      user_id: user_id,
      reason,
    })

    res.json({
      message: '2FA disabled successfully',
      user_id,
    })
  } catch (err) {
    console.error('Disable 2FA error:', err)
    res.status(500).json({ error: 'Failed to disable 2FA' })
  }
}

module.exports = {
  getUsersWith2FA,
  disable2FA,
}
