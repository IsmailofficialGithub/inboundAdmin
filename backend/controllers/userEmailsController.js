const { supabaseAdmin } = require('../config/supabase')
const { logAdminActivity } = require('../utils/logger')

/**
 * GET /api/user-emails
 * List all user emails
 */
const getUserEmails = async (req, res) => {
  try {
    const { user_id, is_primary, is_verified, page = 0, limit = 50 } = req.query
    const offset = parseInt(page) * parseInt(limit)

    let query = supabaseAdmin
      .from('user_emails')
      .select('*', { count: 'exact' })
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .range(offset, offset + parseInt(limit) - 1)

    if (user_id) {
      query = query.eq('user_id', user_id)
    }

    if (is_primary === 'true') {
      query = query.eq('is_primary', true)
    } else if (is_primary === 'false') {
      query = query.eq('is_primary', false)
    }

    if (is_verified === 'true') {
      query = query.eq('is_verified', true)
    } else if (is_verified === 'false') {
      query = query.eq('is_verified', false)
    }

    const { data, count, error } = await query

    if (error) {
      // If table doesn't exist, return empty array instead of error
      if (error.code === '42P01' || error.message.includes('does not exist')) {
        return res.json({
          emails: [],
          total: 0,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: 0,
        })
      }
      return res.status(400).json({ error: error.message })
    }

    // Fetch user emails from auth
    const emailsWithUsers = await Promise.all(
      (data || []).map(async (email) => {
        let userEmail = null
        try {
          const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(email.user_id)
          userEmail = authUser?.user?.email || null
        } catch {}

        // Don't return smtp_password
        const { smtp_password, ...safeEmail } = email

        return {
          ...safeEmail,
          user_email: userEmail,
        }
      })
    )

    res.json({
      emails: emailsWithUsers,
      total: count || 0,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil((count || 0) / parseInt(limit)),
    })
  } catch (err) {
    console.error('Get user emails error:', err)
    res.status(500).json({ error: 'Failed to fetch user emails' })
  }
}

/**
 * POST /api/user-emails/:id/verify
 * Verify a user email (admin action)
 */
const verifyEmail = async (req, res) => {
  try {
    const { id } = req.params

    // Get the email record
    const { data: email, error: fetchError } = await supabaseAdmin
      .from('user_emails')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .single()

    if (fetchError || !email) {
      return res.status(404).json({ error: 'Email not found' })
    }

    if (email.is_verified) {
      return res.status(400).json({ error: 'Email is already verified' })
    }

    // Update verification status
    const { data: updatedEmail, error: updateError } = await supabaseAdmin
      .from('user_emails')
      .update({
        is_verified: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      return res.status(400).json({ error: updateError.message })
    }

    // Log admin activity
    await logAdminActivity(req.admin.id, 'verify_user_email', {
      target_type: 'user_emails',
      target_id: id,
      user_id: email.user_id,
      email: email.email,
    })

    res.json({
      message: 'Email verified successfully',
      email: updatedEmail,
    })
  } catch (err) {
    console.error('Verify email error:', err)
    res.status(500).json({ error: 'Failed to verify email' })
  }
}

module.exports = {
  getUserEmails,
  verifyEmail,
}
