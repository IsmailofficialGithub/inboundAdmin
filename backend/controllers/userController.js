const { supabaseAdmin } = require('../config/supabase')
const { logAdminActivity } = require('../utils/logger')
const { sendEmail } = require('../config/email')
const { accountCreatedTemplate, accountSuspendedTemplate } = require('../utils/emailTemplates')

/**
 * Check if a user is a super admin
 * @param {string} userId - The user ID to check
 * @returns {Promise<boolean>} - True if user is a super admin
 */
const isSuperAdmin = async (userId) => {
  try {
    const { data: adminProfile } = await supabaseAdmin
      .from('admin_profiles')
      .select('role')
      .eq('id', userId)
      .eq('is_active', true)
      .single()
    
    return adminProfile?.role === 'super_admin'
  } catch {
    return false
  }
}

/**
 * Generate a random password
 */
const generateRandomPassword = (length = 12) => {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const lowercase = 'abcdefghijklmnopqrstuvwxyz'
  const numbers = '0123456789'
  const symbols = '!@#$%&*'
  const all = uppercase + lowercase + numbers + symbols

  // Ensure at least one of each type
  let password = ''
  password += uppercase[Math.floor(Math.random() * uppercase.length)]
  password += lowercase[Math.floor(Math.random() * lowercase.length)]
  password += numbers[Math.floor(Math.random() * numbers.length)]
  password += symbols[Math.floor(Math.random() * symbols.length)]

  for (let i = password.length; i < length; i++) {
    password += all[Math.floor(Math.random() * all.length)]
  }

  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('')
}

/**
 * POST /api/users
 * Create a new user (admin creates user, sends welcome email)
 */
const createUser = async (req, res) => {
  try {
    const { email, password, first_name, last_name, country_code, phone, generate_password } = req.body

    if (!email) {
      return res.status(400).json({ error: 'Email is required' })
    }

    // Check if user already exists in auth.users
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers()
    const existingUser = existingUsers?.users?.find((u) => u.email?.toLowerCase() === email.toLowerCase())

    let authData
    let isNewUser = false
    let userPassword = null // Store password for email sending

    if (existingUser) {
      // User already exists in auth.users
      // Check if they are already an admin
      const { data: existingAdminProfile } = await supabaseAdmin
        .from('admin_profiles')
        .select('id')
        .eq('id', existingUser.id)
        .single()

      if (existingAdminProfile) {
        return res.status(409).json({ 
          error: 'This email is already registered as an admin user. Cannot create consumer profile for admin users.' 
        })
      }

      // Check if they already have a consumer profile
      const { data: existingProfile } = await supabaseAdmin
        .from('user_profiles')
        .select('id')
        .eq('id', existingUser.id)
        .single()

      if (existingProfile) {
        return res.status(409).json({ error: 'User with this email already exists' })
      }

      // User exists in auth but no profile - create the profile
      authData = { user: existingUser }
    } else {
      // User doesn't exist - create new user
      isNewUser = true

      // Use provided password or generate one
      userPassword = generate_password ? generateRandomPassword() : password

      if (!userPassword) {
        return res.status(400).json({ error: 'Password is required (or enable generate_password)' })
      }

      // Create user in Supabase Auth
      const { data: newAuthData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: userPassword,
        email_confirm: true,
      })

      if (authError) {
        return res.status(400).json({ error: authError.message })
      }

      authData = newAuthData
    }

    // Create or update user profile in user_profiles table
    const profileData = {
      id: authData.user.id,
      first_name: first_name || null,
      last_name: last_name || null,
      country_code: country_code || null,
      phone: phone || null,
      email_verified: true,
      account_status: 'active',
    }

    // Use upsert to handle both new profiles and updating existing ones
    const { error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .upsert(profileData, { onConflict: 'id' })

    if (profileError) {
      // Rollback: delete the auth user if profile creation fails (only for new users)
      if (isNewUser) {
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      }
      return res.status(400).json({ error: profileError.message })
    }

    // Log admin activity
    await logAdminActivity(req.admin.id, isNewUser ? 'user_created' : 'user_profile_created', {
      target_type: 'user',
      target_id: authData.user.id,
      ip: req.ip,
      extra: { email, first_name, last_name, isNewUser },
    })

    // Send welcome email with credentials (only for new users)
    let emailSent = false
    if (isNewUser && userPassword) {
      try {
        const template = accountCreatedTemplate(email, userPassword)
        const result = await sendEmail(email, template.subject, template.html)
        emailSent = result.success
      } catch (emailErr) {
        console.error('Failed to send welcome email:', emailErr)
      }
    }

    res.status(201).json({
      success: true,
      message: isNewUser
        ? 'User created successfully'
        : 'User profile created successfully (user already existed in auth)',
      emailSent,
      isNewUser,
      user: {
        id: authData.user.id,
        email,
        first_name,
        last_name,
        country_code,
        phone,
        account_status: 'active',
      },
    })
  } catch (err) {
    console.error('Create user error:', err)
    res.status(500).json({ error: 'Failed to create user' })
  }
}

/**
 * PUT /api/users/:id
 * Update user profile
 */
const updateUser = async (req, res) => {
  try {
    const { id } = req.params
    const { first_name, last_name, country_code, phone, date_of_birth, bio, account_status } = req.body

    // Check user exists
    const { data: existingUser, error: fetchError } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !existingUser) {
      return res.status(404).json({ error: 'User not found' })
    }

    // Build update object (only include fields that were provided)
    const updateData = { updated_at: new Date().toISOString() }
    if (first_name !== undefined) updateData.first_name = first_name
    if (last_name !== undefined) updateData.last_name = last_name
    if (country_code !== undefined) updateData.country_code = country_code
    if (phone !== undefined) updateData.phone = phone
    if (date_of_birth !== undefined) updateData.date_of_birth = date_of_birth || null
    if (bio !== undefined) updateData.bio = bio
    if (account_status !== undefined) updateData.account_status = account_status

    const { error } = await supabaseAdmin
      .from('user_profiles')
      .update(updateData)
      .eq('id', id)

    if (error) throw error

    await logAdminActivity(req.admin.id, 'user_updated', {
      target_type: 'user',
      target_id: id,
      ip: req.ip,
      extra: {
        user_name: `${existingUser.first_name || ''} ${existingUser.last_name || ''}`.trim(),
        updated_fields: Object.keys(updateData).filter((k) => k !== 'updated_at'),
      },
    })

    // Fetch updated user
    const { data: updatedUser } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .eq('id', id)
      .single()

    // Get email
    let email = null
    try {
      const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(id)
      email = authUser?.user?.email || null
    } catch {}

    res.json({
      success: true,
      message: 'User updated successfully',
      user: { ...updatedUser, email },
    })
  } catch (err) {
    console.error('Update user error:', err)
    res.status(500).json({ error: 'Failed to update user' })
  }
}

/**
 * GET /api/users
 * List all users with search, filter, pagination
 */
const getUsers = async (req, res) => {
  try {
    const { search, status, page = 0, limit = 50 } = req.query
    const offset = parseInt(page) * parseInt(limit)

    let query = supabaseAdmin
      .from('user_profiles')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + parseInt(limit) - 1)

    if (status && status !== 'all') {
      query = query.eq('account_status', status)
    }

    if (search) {
      query = query.or(
        `first_name.ilike.%${search}%,last_name.ilike.%${search}%,phone.ilike.%${search}%`
      )
    }

    const { data, count, error } = await query

    if (error) {
      return res.status(400).json({ error: error.message })
    }

    // Fetch emails from auth.users for each user and check if they are admins
    const usersWithEmail = await Promise.all(
      (data || []).map(async (user) => {
        try {
          const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(user.id)
          
          // Check if user is an admin and get their role
          const { data: adminProfile } = await supabaseAdmin
            .from('admin_profiles')
            .select('role')
            .eq('id', user.id)
            .eq('is_active', true)
            .single()
          
          const isSuperAdminUser = await isSuperAdmin(user.id)
          const userRole = adminProfile ? adminProfile.role : 'consumer'
          
          return { 
            ...user, 
            email: authUser?.user?.email || null, 
            is_super_admin: isSuperAdminUser,
            role: userRole,
            is_admin: !!adminProfile
          }
        } catch {
          const isSuperAdminUser = await isSuperAdmin(user.id)
          
          // Check if user is an admin (in case of error above)
          let userRole = 'consumer'
          let isAdmin = false
          try {
            const { data: adminProfile } = await supabaseAdmin
              .from('admin_profiles')
              .select('role')
              .eq('id', user.id)
              .eq('is_active', true)
              .single()
            if (adminProfile) {
              userRole = adminProfile.role
              isAdmin = true
            }
          } catch {}
          
          return { 
            ...user, 
            email: null, 
            is_super_admin: isSuperAdminUser,
            role: userRole,
            is_admin: isAdmin
          }
        }
      })
    )

    res.json({
      users: usersWithEmail,
      total: count || 0,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil((count || 0) / parseInt(limit)),
    })
  } catch (err) {
    console.error('Get users error:', err)
    res.status(500).json({ error: 'Failed to fetch users' })
  }
}

/**
 * GET /api/users/:id
 * Get single user detail
 */
const getUserById = async (req, res) => {
  try {
    const { id } = req.params

    const { data: user, error } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !user) {
      return res.status(404).json({ error: 'User not found' })
    }

    // Fetch email from auth and check if user is super admin
    let email = null
    let isSuperAdminUser = false
    try {
      const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(id)
      email = authUser?.user?.email || null
    } catch {}
    
    try {
      isSuperAdminUser = await isSuperAdmin(id)
    } catch {}

    // Fetch login activity
    const { data: loginActivity } = await supabaseAdmin
      .from('login_activity')
      .select('*')
      .eq('user_id', id)
      .order('login_at', { ascending: false })
      .limit(20)

    // Fetch security events
    const { data: securityEvents } = await supabaseAdmin
      .from('security_events')
      .select('*')
      .eq('user_id', id)
      .order('created_at', { ascending: false })
      .limit(20)

    // Fetch notifications
    const { data: notifications } = await supabaseAdmin
      .from('notifications')
      .select('*')
      .eq('user_id', id)
      .order('created_at', { ascending: false })
      .limit(20)

    res.json({
      user: { ...user, email, is_super_admin: isSuperAdminUser },
      loginActivity: loginActivity || [],
      securityEvents: securityEvents || [],
      notifications: notifications || [],
    })
  } catch (err) {
    console.error('Get user error:', err)
    res.status(500).json({ error: 'Failed to fetch user' })
  }
}

/**
 * PATCH /api/users/:id/suspend
 * Suspend a user
 */
const suspendUser = async (req, res) => {
  try {
    const { id } = req.params
    const { reason } = req.body

    const { data: user, error: fetchError } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !user) {
      return res.status(404).json({ error: 'User not found' })
    }

    // Check if target user is a super admin
    const targetIsSuperAdmin = await isSuperAdmin(id)
    const requesterIsSuperAdmin = req.admin.role === 'super_admin'

    // Prevent non-super-admins from suspending super admins
    if (targetIsSuperAdmin && !requesterIsSuperAdmin) {
      return res.status(403).json({ error: 'You cannot suspend a super admin' })
    }

    const { error } = await supabaseAdmin
      .from('user_profiles')
      .update({
        account_status: 'suspended',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (error) throw error

    await logAdminActivity(req.admin.id, 'user_suspend', {
      target_type: 'user',
      target_id: id,
      ip: req.ip,
      extra: {
        user_name: `${user.first_name || ''} ${user.last_name || ''}`.trim(),
        previous_status: user.account_status,
        reason,
      },
    })

    // Send suspension email
    try {
      const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(id)
      if (authUser?.user?.email) {
        const template = accountSuspendedTemplate(authUser.user.email, reason)
        await sendEmail(authUser.user.email, template.subject, template.html)
      }
    } catch (emailErr) {
      console.error('Failed to send suspension email:', emailErr)
    }

    res.json({ success: true, message: 'User suspended successfully' })
  } catch (err) {
    console.error('Suspend user error:', err)
    res.status(500).json({ error: 'Failed to suspend user' })
  }
}

/**
 * PATCH /api/users/:id/unsuspend
 * Unsuspend a user
 */
const unsuspendUser = async (req, res) => {
  try {
    const { id } = req.params

    const { data: user, error: fetchError } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !user) {
      return res.status(404).json({ error: 'User not found' })
    }

    const { error } = await supabaseAdmin
      .from('user_profiles')
      .update({
        account_status: 'active',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (error) throw error

    await logAdminActivity(req.admin.id, 'user_unsuspend', {
      target_type: 'user',
      target_id: id,
      ip: req.ip,
      extra: {
        user_name: `${user.first_name || ''} ${user.last_name || ''}`.trim(),
        previous_status: user.account_status,
      },
    })

    res.json({ success: true, message: 'User unsuspended successfully' })
  } catch (err) {
    console.error('Unsuspend user error:', err)
    res.status(500).json({ error: 'Failed to unsuspend user' })
  }
}

/**
 * PATCH /api/users/:id/reset-email-verification
 * Force reset email verification for a user
 */
const resetEmailVerification = async (req, res) => {
  try {
    const { id } = req.params

    const { error } = await supabaseAdmin
      .from('user_profiles')
      .update({
        email_verified: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (error) throw error

    await logAdminActivity(req.admin.id, 'force_email_verification_reset', {
      target_type: 'user',
      target_id: id,
      ip: req.ip,
    })

    res.json({ success: true, message: 'Email verification reset' })
  } catch (err) {
    console.error('Reset email verification error:', err)
    res.status(500).json({ error: 'Failed to reset email verification' })
  }
}

/**
 * PATCH /api/users/:id/reset-password
 * Reset user password (sends password reset email via Supabase)
 */
const resetUserPassword = async (req, res) => {
  try {
    const { id } = req.params

    // Get user email from auth
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.getUserById(id)

    if (authError || !authUser?.user?.email) {
      return res.status(404).json({ error: 'User email not found' })
    }

    // Send password reset email via Supabase
    const { error } = await supabaseAdmin.auth.resetPasswordForEmail(authUser.user.email, {
      redirectTo: `${process.env.FRONTEND_URL}/reset-password`,
    })

    if (error) throw error

    await logAdminActivity(req.admin.id, 'user_password_reset', {
      target_type: 'user',
      target_id: id,
      ip: req.ip,
      extra: { email: authUser.user.email },
    })

    res.json({ success: true, message: 'Password reset email sent' })
  } catch (err) {
    console.error('Reset password error:', err)
    res.status(500).json({ error: 'Failed to reset password' })
  }
}

/**
 * DELETE /api/users/:id
 * Soft-delete a user (GDPR-style)
 */
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params

    const { data: user, error: fetchError } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !user) {
      return res.status(404).json({ error: 'User not found' })
    }

    // Prevent deletion of super admins
    const targetIsSuperAdmin = await isSuperAdmin(id)
    if (targetIsSuperAdmin) {
      return res.status(403).json({ error: 'Cannot delete a super admin' })
    }

    const { error } = await supabaseAdmin
      .from('user_profiles')
      .update({
        account_status: 'deleted',
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (error) throw error

    await logAdminActivity(req.admin.id, 'user_soft_delete', {
      target_type: 'user',
      target_id: id,
      ip: req.ip,
      extra: {
        user_name: `${user.first_name || ''} ${user.last_name || ''}`.trim(),
      },
    })

    res.json({ success: true, message: 'User deleted successfully' })
  } catch (err) {
    console.error('Delete user error:', err)
    res.status(500).json({ error: 'Failed to delete user' })
  }
}

module.exports = {
  createUser,
  updateUser,
  getUsers,
  getUserById,
  suspendUser,
  unsuspendUser,
  resetEmailVerification,
  resetUserPassword,
  deleteUser,
}
