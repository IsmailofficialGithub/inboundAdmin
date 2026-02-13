const { supabaseAdmin } = require('../config/supabase')
const { logAdminActivity } = require('../utils/logger')

/**
 * GET /api/kyc/pending
 * Get users with pending KYC status
 */
const getPendingKYC = async (req, res) => {
  try {
    const { status, page = 0, limit = 50, search } = req.query
    const offset = parseInt(page) * parseInt(limit)

    let query = supabaseAdmin
      .from('user_profiles')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + parseInt(limit) - 1)

    // Filter by KYC status
    if (status && status !== 'all') {
      query = query.eq('kyc_status', status)
    } else {
      // Default: show pending and under_review
      query = query.in('kyc_status', ['pending', 'under_review', 'needs_info'])
    }

    // Search by name, email, or company name
    if (search) {
      query = query.or(
        `first_name.ilike.%${search}%,last_name.ilike.%${search}%,company_name.ilike.%${search}%`
      )
    }

    const { data: users, count, error } = await query

    if (error) {
      return res.status(400).json({ error: error.message })
    }

    // Fetch emails and verified_by admin info
    const usersWithDetails = await Promise.all(
      (users || []).map(async (user) => {
        try {
          const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(user.id)
          let verifiedByAdmin = null

          if (user.kyc_verified_by) {
            const { data: admin } = await supabaseAdmin
              .from('admin_profiles')
              .select('id, email, first_name, last_name')
              .eq('id', user.kyc_verified_by)
              .single()
            verifiedByAdmin = admin
          }

          return {
            ...user,
            email: authUser?.user?.email || null,
            verified_by_admin: verifiedByAdmin,
          }
        } catch {
          return {
            ...user,
            email: null,
            verified_by_admin: null,
          }
        }
      })
    )

    res.json({
      users: usersWithDetails,
      total: count || 0,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil((count || 0) / parseInt(limit)),
    })
  } catch (err) {
    console.error('Get pending KYC error:', err)
    res.status(500).json({ error: 'Failed to fetch pending KYC' })
  }
}

/**
 * GET /api/kyc/users/:id
 * Get user KYC details with history
 */
const getUserKYCDetails = async (req, res) => {
  try {
    const { id } = req.params

    // Get user profile
    const { data: user, error: userError } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .eq('id', id)
      .single()

    if (userError || !user) {
      return res.status(404).json({ error: 'User not found' })
    }

    // Get user email
    let userEmail = null
    try {
      const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(id)
      userEmail = authUser?.user?.email || null
    } catch {}

    // Get verified_by admin info
    let verifiedByAdmin = null
    if (user.kyc_verified_by) {
      const { data: admin } = await supabaseAdmin
        .from('admin_profiles')
        .select('id, email, first_name, last_name')
        .eq('id', user.kyc_verified_by)
        .single()
      verifiedByAdmin = admin
    }

    // Get moderation history
    const { data: history } = await supabaseAdmin
      .from('kyc_moderation_history')
      .select('*, admin:admin_id(id, email, first_name, last_name)')
      .eq('user_id', id)
      .order('created_at', { ascending: false })

    res.json({
      user: {
        ...user,
        email: userEmail,
        verified_by_admin: verifiedByAdmin,
      },
      history: history || [],
    })
  } catch (err) {
    console.error('Get user KYC details error:', err)
    res.status(500).json({ error: 'Failed to fetch user KYC details' })
  }
}

/**
 * POST /api/kyc/users/:id/approve
 * Approve user KYC
 */
const approveKYC = async (req, res) => {
  try {
    const { id } = req.params
    const { notes } = req.body

    // Get user profile
    const { data: user, error: userError } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .eq('id', id)
      .single()

    if (userError || !user) {
      return res.status(404).json({ error: 'User not found' })
    }

    const previousStatus = user.kyc_status

    // Update user KYC status
    const { data: updatedUser, error: updateError } = await supabaseAdmin
      .from('user_profiles')
      .update({
        kyc_status: 'approved',
        kyc_verified_at: new Date().toISOString(),
        kyc_verified_by: req.admin.id,
        kyc_rejection_reason: null,
      })
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      return res.status(400).json({ error: updateError.message })
    }

    // Log moderation history
    await supabaseAdmin.from('kyc_moderation_history').insert({
      user_id: id,
      admin_id: req.admin.id,
      action: 'approved',
      previous_status: previousStatus,
      new_status: 'approved',
      notes: notes || null,
    })

    await logAdminActivity(req.admin.id, 'kyc_approved', {
      target_type: 'user',
      target_id: id,
      ip: req.ip,
      extra: { previous_status, notes },
    })

    res.json({
      success: true,
      message: 'KYC approved successfully',
      user: updatedUser,
    })
  } catch (err) {
    console.error('Approve KYC error:', err)
    res.status(500).json({ error: 'Failed to approve KYC' })
  }
}

/**
 * POST /api/kyc/users/:id/reject
 * Reject user KYC
 */
const rejectKYC = async (req, res) => {
  try {
    const { id } = req.params
    const { reason, notes } = req.body

    if (!reason || !reason.trim()) {
      return res.status(400).json({ error: 'Rejection reason is required' })
    }

    // Get user profile
    const { data: user, error: userError } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .eq('id', id)
      .single()

    if (userError || !user) {
      return res.status(404).json({ error: 'User not found' })
    }

    const previousStatus = user.kyc_status

    // Update user KYC status
    const { data: updatedUser, error: updateError } = await supabaseAdmin
      .from('user_profiles')
      .update({
        kyc_status: 'rejected',
        kyc_verified_at: null,
        kyc_verified_by: req.admin.id,
        kyc_rejection_reason: reason.trim(),
      })
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      return res.status(400).json({ error: updateError.message })
    }

    // Log moderation history
    await supabaseAdmin.from('kyc_moderation_history').insert({
      user_id: id,
      admin_id: req.admin.id,
      action: 'rejected',
      previous_status: previousStatus,
      new_status: 'rejected',
      notes: notes || null,
    })

    await logAdminActivity(req.admin.id, 'kyc_rejected', {
      target_type: 'user',
      target_id: id,
      ip: req.ip,
      extra: { previous_status, reason, notes },
    })

    res.json({
      success: true,
      message: 'KYC rejected successfully',
      user: updatedUser,
    })
  } catch (err) {
    console.error('Reject KYC error:', err)
    res.status(500).json({ error: 'Failed to reject KYC' })
  }
}

/**
 * POST /api/kyc/users/:id/request-info
 * Request additional information from user
 */
const requestKYCInfo = async (req, res) => {
  try {
    const { id } = req.params
    const { notes } = req.body

    if (!notes || !notes.trim()) {
      return res.status(400).json({ error: 'Notes are required to specify what information is needed' })
    }

    // Get user profile
    const { data: user, error: userError } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .eq('id', id)
      .single()

    if (userError || !user) {
      return res.status(404).json({ error: 'User not found' })
    }

    const previousStatus = user.kyc_status

    // Update user KYC status
    const { data: updatedUser, error: updateError } = await supabaseAdmin
      .from('user_profiles')
      .update({
        kyc_status: 'needs_info',
        kyc_verified_at: null,
        kyc_verified_by: req.admin.id,
      })
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      return res.status(400).json({ error: updateError.message })
    }

    // Log moderation history
    await supabaseAdmin.from('kyc_moderation_history').insert({
      user_id: id,
      admin_id: req.admin.id,
      action: 'requested_info',
      previous_status: previousStatus,
      new_status: 'needs_info',
      notes: notes.trim(),
    })

    await logAdminActivity(req.admin.id, 'kyc_info_requested', {
      target_type: 'user',
      target_id: id,
      ip: req.ip,
      extra: { previous_status, notes },
    })

    res.json({
      success: true,
      message: 'Information request logged successfully',
      user: updatedUser,
    })
  } catch (err) {
    console.error('Request KYC info error:', err)
    res.status(500).json({ error: 'Failed to request KYC information' })
  }
}

/**
 * PUT /api/kyc/users/:id
 * Update user KYC/company information (admin can edit)
 */
const updateUserKYCInfo = async (req, res) => {
  try {
    const { id } = req.params
    const {
      company_name,
      company_registration_number,
      company_address,
      company_website,
      company_tax_id,
      kyc_status,
    } = req.body

    // Get user profile
    const { data: existingUser, error: userError } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .eq('id', id)
      .single()

    if (userError || !existingUser) {
      return res.status(404).json({ error: 'User not found' })
    }

    const updateData = {}
    if (company_name !== undefined) updateData.company_name = company_name || null
    if (company_registration_number !== undefined)
      updateData.company_registration_number = company_registration_number || null
    if (company_address !== undefined) updateData.company_address = company_address || null
    if (company_website !== undefined) updateData.company_website = company_website || null
    if (company_tax_id !== undefined) updateData.company_tax_id = company_tax_id || null
    if (kyc_status !== undefined) {
      const validStatuses = ['pending', 'under_review', 'approved', 'rejected', 'needs_info']
      if (!validStatuses.includes(kyc_status)) {
        return res.status(400).json({
          error: `Invalid KYC status. Must be one of: ${validStatuses.join(', ')}`,
        })
      }
      updateData.kyc_status = kyc_status
      if (kyc_status === 'approved') {
        updateData.kyc_verified_at = new Date().toISOString()
        updateData.kyc_verified_by = req.admin.id
      }
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: 'No fields to update' })
    }

    const { data: updatedUser, error: updateError } = await supabaseAdmin
      .from('user_profiles')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      return res.status(400).json({ error: updateError.message })
    }

    // Log moderation history if status changed
    if (updateData.kyc_status && updateData.kyc_status !== existingUser.kyc_status) {
      await supabaseAdmin.from('kyc_moderation_history').insert({
        user_id: id,
        admin_id: req.admin.id,
        action: 'updated',
        previous_status: existingUser.kyc_status,
        new_status: updateData.kyc_status,
        notes: 'Admin updated KYC information',
      })
    }

    await logAdminActivity(req.admin.id, 'kyc_info_updated', {
      target_type: 'user',
      target_id: id,
      ip: req.ip,
      extra: { updated_fields: Object.keys(updateData) },
    })

    res.json({
      success: true,
      message: 'KYC information updated successfully',
      user: updatedUser,
    })
  } catch (err) {
    console.error('Update KYC info error:', err)
    res.status(500).json({ error: 'Failed to update KYC information' })
  }
}

/**
 * GET /api/kyc/users/:id/documents
 * Get KYC documents from storage for a specific user
 */
const getUserKYCDocuments = async (req, res) => {
  try {
    const { id } = req.params
    const bucketName = 'kyc-documents'
    const userFolder = `${id}/`

    // List items in the user's folder (both files and subfolders)
    const { data: items, error: listError } = await supabaseAdmin.storage
      .from(bucketName)
      .list(userFolder, {
        limit: 1000,
        offset: 0,
        sortBy: { column: 'name', order: 'asc' },
      })

    if (listError) {
      // If folder doesn't exist, return empty documents
      if (listError.message?.includes('not found') || listError.message?.includes('does not exist')) {
        return res.json({
          success: true,
          documents: {},
          totalTypes: 0,
        })
      }
      console.error('Error listing KYC documents:', listError)
      return res.status(400).json({ error: `Failed to list documents: ${listError.message}` })
    }

    // Organize files by document type (folder name)
    const documentsByType = {}

    if (items && items.length > 0) {
      // First, identify folders (document types)
      const folders = items.filter(item => item.id === null && item.name)
      const files = items.filter(item => item.id !== null && item.name)

      // Process files directly in user folder (if any)
      if (files.length > 0) {
        if (!documentsByType['other']) {
          documentsByType['other'] = []
        }
        for (const file of files) {
          const filePath = `${userFolder}${file.name}`
          const { data: { publicUrl } } = supabaseAdmin.storage
            .from(bucketName)
            .getPublicUrl(filePath)
          
          documentsByType['other'].push({
            name: file.name,
            path: filePath,
            url: publicUrl,
            size: file.metadata?.size || 0,
            created_at: file.created_at,
            updated_at: file.updated_at,
          })
        }
      }

      // Process each folder (document type)
      for (const folder of folders) {
        const documentType = folder.name
        const typeFolder = `${userFolder}${documentType}/`
        
        // List files in this document type folder
        const { data: typeFiles, error: typeFilesError } = await supabaseAdmin.storage
          .from(bucketName)
          .list(typeFolder, {
            limit: 1000,
            offset: 0,
          })

        if (!typeFilesError && typeFiles && typeFiles.length > 0) {
          documentsByType[documentType] = []

          for (const file of typeFiles) {
            // Skip subfolders, only process files
            if (file.id !== null && file.name) {
              const filePath = `${typeFolder}${file.name}`
              const { data: { publicUrl } } = supabaseAdmin.storage
                .from(bucketName)
                .getPublicUrl(filePath)
              
              documentsByType[documentType].push({
                name: file.name,
                path: filePath,
                url: publicUrl,
                size: file.metadata?.size || 0,
                created_at: file.created_at,
                updated_at: file.updated_at,
              })
            }
          }
        }
      }
    }

    res.json({
      success: true,
      documents: documentsByType,
      totalTypes: Object.keys(documentsByType).length,
    })
  } catch (err) {
    console.error('Get KYC documents error:', err)
    res.status(500).json({ error: 'Failed to fetch KYC documents' })
  }
}

module.exports = {
  getPendingKYC,
  getUserKYCDetails,
  approveKYC,
  rejectKYC,
  requestKYCInfo,
  updateUserKYCInfo,
  getUserKYCDocuments,
}
