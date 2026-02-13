const { supabaseAdmin } = require('../config/supabase')
const { logAdminActivity } = require('../utils/logger')

/**
 * GET /api/email-templates
 * List all email templates
 */
const getEmailTemplates = async (req, res) => {
  try {
    const { user_id, is_default, page = 0, limit = 50 } = req.query
    const offset = parseInt(page) * parseInt(limit)

    let query = supabaseAdmin
      .from('email_templates')
      .select('*', { count: 'exact' })
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .range(offset, offset + parseInt(limit) - 1)

    if (user_id) {
      query = query.eq('user_id', user_id)
    }

    if (is_default === 'true') {
      query = query.eq('is_default', true)
    } else if (is_default === 'false') {
      query = query.eq('is_default', false)
    }

    const { data, count, error } = await query

    if (error) {
      // If table doesn't exist, return empty array instead of error
      if (error.code === '42P01' || error.message.includes('does not exist')) {
        return res.json({
          templates: [],
          total: 0,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: 0,
        })
      }
      return res.status(400).json({ error: error.message })
    }

    // Fetch user emails
    const templatesWithUsers = await Promise.all(
      (data || []).map(async (template) => {
        let userEmail = null
        try {
          const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(template.user_id)
          userEmail = authUser?.user?.email || null
        } catch {}
        return { ...template, user_email: userEmail }
      })
    )

    res.json({
      templates: templatesWithUsers,
      total: count || 0,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil((count || 0) / parseInt(limit)),
    })
  } catch (err) {
    console.error('Get email templates error:', err)
    res.status(500).json({ error: 'Failed to fetch email templates' })
  }
}

/**
 * GET /api/email-templates/:id
 * Get single email template
 */
const getEmailTemplate = async (req, res) => {
  try {
    const { id } = req.params

    const { data: template, error } = await supabaseAdmin
      .from('email_templates')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .single()

    if (error || !template) {
      return res.status(404).json({ error: 'Email template not found' })
    }

    res.json({ template })
  } catch (err) {
    console.error('Get email template error:', err)
    res.status(500).json({ error: 'Failed to fetch email template' })
  }
}

/**
 * POST /api/email-templates
 * Create new email template
 */
const createEmailTemplate = async (req, res) => {
  try {
    const {
      user_id,
      name,
      subject,
      body,
      description,
      is_default = false,
      accent_color = '#4F46E5',
      design_style = 'modern',
      company_name,
    } = req.body

    if (!user_id || !name || !subject || !body) {
      return res.status(400).json({ error: 'user_id, name, subject, and body are required' })
    }

    // If setting as default, unset other defaults for this user
    if (is_default) {
      await supabaseAdmin
        .from('email_templates')
        .update({ is_default: false })
        .eq('user_id', user_id)
        .eq('is_default', true)
    }

    const { data: template, error } = await supabaseAdmin
      .from('email_templates')
      .insert({
        user_id,
        name,
        subject,
        body,
        description: description || null,
        is_default,
        accent_color,
        design_style,
        company_name: company_name || null,
      })
      .select()
      .single()

    if (error) {
      return res.status(400).json({ error: error.message })
    }

    await logAdminActivity(req.admin.id, 'create_email_template', {
      target_type: 'email_template',
      target_id: template.id,
      user_id,
    })

    res.status(201).json({
      message: 'Email template created successfully',
      template,
    })
  } catch (err) {
    console.error('Create email template error:', err)
    res.status(500).json({ error: 'Failed to create email template' })
  }
}

/**
 * PUT /api/email-templates/:id
 * Update email template
 */
const updateEmailTemplate = async (req, res) => {
  try {
    const { id } = req.params
    const { name, subject, body, description, is_default, accent_color, design_style, company_name } = req.body

    // Get existing template
    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('email_templates')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .single()

    if (fetchError || !existing) {
      return res.status(404).json({ error: 'Email template not found' })
    }

    // If setting as default, unset other defaults
    if (is_default && !existing.is_default) {
      await supabaseAdmin
        .from('email_templates')
        .update({ is_default: false })
        .eq('user_id', existing.user_id)
        .eq('is_default', true)
        .neq('id', id)
    }

    const updateData = {}
    if (name !== undefined) updateData.name = name
    if (subject !== undefined) updateData.subject = subject
    if (body !== undefined) updateData.body = body
    if (description !== undefined) updateData.description = description
    if (is_default !== undefined) updateData.is_default = is_default
    if (accent_color !== undefined) updateData.accent_color = accent_color
    if (design_style !== undefined) updateData.design_style = design_style
    if (company_name !== undefined) updateData.company_name = company_name

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: 'No fields to update' })
    }

    const { data: updatedTemplate, error } = await supabaseAdmin
      .from('email_templates')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return res.status(400).json({ error: error.message })
    }

    await logAdminActivity(req.admin.id, 'update_email_template', {
      target_type: 'email_template',
      target_id: id,
    })

    res.json({
      message: 'Email template updated successfully',
      template: updatedTemplate,
    })
  } catch (err) {
    console.error('Update email template error:', err)
    res.status(500).json({ error: 'Failed to update email template' })
  }
}

/**
 * DELETE /api/email-templates/:id
 * Delete email template (soft delete)
 */
const deleteEmailTemplate = async (req, res) => {
  try {
    const { id } = req.params

    const { error } = await supabaseAdmin
      .from('email_templates')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)

    if (error) {
      return res.status(400).json({ error: error.message })
    }

    await logAdminActivity(req.admin.id, 'delete_email_template', {
      target_type: 'email_template',
      target_id: id,
    })

    res.json({ message: 'Email template deleted successfully' })
  } catch (err) {
    console.error('Delete email template error:', err)
    res.status(500).json({ error: 'Failed to delete email template' })
  }
}

module.exports = {
  getEmailTemplates,
  getEmailTemplate,
  createEmailTemplate,
  updateEmailTemplate,
  deleteEmailTemplate,
}
