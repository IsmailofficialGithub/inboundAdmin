const { supabaseAdmin } = require('../config/supabase')
const { logAdminActivity } = require('../utils/logger')

/**
 * GET /api/verification-tokens/email
 * List email verification tokens
 */
const getEmailTokens = async (req, res) => {
  try {
    const { user_id, purpose, expired, used, page = 0, limit = 50 } = req.query
    const offset = parseInt(page) * parseInt(limit)

    let query = supabaseAdmin
      .from('email_verification_tokens')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + parseInt(limit) - 1)

    if (user_id) {
      query = query.eq('user_id', user_id)
    }

    if (purpose) {
      query = query.eq('purpose', purpose)
    }

    if (expired === 'true') {
      query = query.lt('expires_at', new Date().toISOString())
    } else if (expired === 'false') {
      query = query.gte('expires_at', new Date().toISOString())
    }

    if (used === 'true') {
      query = query.not('used_at', 'is', null)
    } else if (used === 'false') {
      query = query.is('used_at', null)
    }

    const { data, count, error } = await query

    if (error) {
      // If table doesn't exist, return empty array instead of error
      if (error.code === '42P01' || error.message.includes('does not exist')) {
        return res.json({
          tokens: [],
          total: 0,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: 0,
        })
      }
      return res.status(400).json({ error: error.message })
    }

    // Fetch user emails
    const tokensWithUsers = await Promise.all(
      (data || []).map(async (token) => {
        let email = null
        try {
          const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(token.user_id)
          email = authUser?.user?.email || null
        } catch {}
        return { ...token, user_email: email }
      })
    )

    res.json({
      tokens: tokensWithUsers,
      total: count || 0,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil((count || 0) / parseInt(limit)),
    })
  } catch (err) {
    console.error('Get email tokens error:', err)
    res.status(500).json({ error: 'Failed to fetch email tokens' })
  }
}

/**
 * GET /api/verification-tokens/phone
 * List phone verification tokens
 */
const getPhoneTokens = async (req, res) => {
  try {
    const { user_id, expired, used, page = 0, limit = 50 } = req.query
    const offset = parseInt(page) * parseInt(limit)

    let query = supabaseAdmin
      .from('phone_verification_tokens')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + parseInt(limit) - 1)

    if (user_id) {
      query = query.eq('user_id', user_id)
    }

    if (expired === 'true') {
      query = query.lt('expires_at', new Date().toISOString())
    } else if (expired === 'false') {
      query = query.gte('expires_at', new Date().toISOString())
    }

    if (used === 'true') {
      query = query.not('used_at', 'is', null)
    } else if (used === 'false') {
      query = query.is('used_at', null)
    }

    const { data, count, error } = await query

    if (error) {
      // If table doesn't exist, return empty array instead of error
      if (error.code === '42P01' || error.message.includes('does not exist')) {
        return res.json({
          tokens: [],
          total: 0,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: 0,
        })
      }
      return res.status(400).json({ error: error.message })
    }

    // Fetch user emails
    const tokensWithUsers = await Promise.all(
      (data || []).map(async (token) => {
        let email = null
        try {
          const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(token.user_id)
          email = authUser?.user?.email || null
        } catch {}
        return { ...token, user_email: email }
      })
    )

    res.json({
      tokens: tokensWithUsers,
      total: count || 0,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil((count || 0) / parseInt(limit)),
    })
  } catch (err) {
    console.error('Get phone tokens error:', err)
    res.status(500).json({ error: 'Failed to fetch phone tokens' })
  }
}

/**
 * POST /api/verification-tokens/:id/revoke
 * Revoke a verification token
 */
const revokeToken = async (req, res) => {
  try {
    const { id } = req.params
    const { type = 'email' } = req.body // 'email' or 'phone'

    const tableName = type === 'phone' ? 'phone_verification_tokens' : 'email_verification_tokens'

    // Get the token
    const { data: token, error: fetchError } = await supabaseAdmin
      .from(tableName)
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !token) {
      return res.status(404).json({ error: 'Token not found' })
    }

    // Mark as used (effectively revoking it)
    const { data: updatedToken, error: updateError } = await supabaseAdmin
      .from(tableName)
      .update({
        used_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      return res.status(400).json({ error: updateError.message })
    }

    // Log admin activity
    await logAdminActivity(req.admin.id, 'revoke_verification_token', {
      target_type: tableName,
      target_id: id,
      user_id: token.user_id,
      token_type: type,
    })

    res.json({
      message: 'Token revoked successfully',
      token: updatedToken,
    })
  } catch (err) {
    console.error('Revoke token error:', err)
    res.status(500).json({ error: 'Failed to revoke token' })
  }
}

module.exports = {
  getEmailTokens,
  getPhoneTokens,
  revokeToken,
}
