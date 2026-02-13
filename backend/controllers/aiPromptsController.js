const { supabaseAdmin } = require('../config/supabase')
const { logAdminActivity } = require('../utils/logger')

/**
 * GET /api/ai-prompts
 * List all AI prompts
 */
const getAIPrompts = async (req, res) => {
  try {
    const { user_id, category, is_template, is_active, status, page = 0, limit = 50 } = req.query
    const offset = parseInt(page) * parseInt(limit)

    let query = supabaseAdmin
      .from('ai_prompts')
      .select('*', { count: 'exact' })
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .range(offset, offset + parseInt(limit) - 1)

    if (user_id) {
      query = query.eq('user_id', user_id)
    }

    if (category) {
      query = query.eq('category', category)
    }

    if (is_template === 'true') {
      query = query.eq('is_template', true)
    } else if (is_template === 'false') {
      query = query.eq('is_template', false)
    }

    if (is_active === 'true') {
      query = query.eq('is_active', true)
    } else if (is_active === 'false') {
      query = query.eq('is_active', false)
    }

    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    const { data, count, error } = await query

    if (error) {
      // If table doesn't exist, return empty array instead of error
      if (error.code === '42P01' || error.message.includes('does not exist')) {
        return res.json({
          prompts: [],
          total: 0,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: 0,
        })
      }
      return res.status(400).json({ error: error.message })
    }

    // Fetch user emails
    const promptsWithUsers = await Promise.all(
      (data || []).map(async (prompt) => {
        let userEmail = null
        try {
          const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(prompt.user_id)
          userEmail = authUser?.user?.email || null
        } catch {}
        return { ...prompt, user_email: userEmail }
      })
    )

    res.json({
      prompts: promptsWithUsers,
      total: count || 0,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil((count || 0) / parseInt(limit)),
    })
  } catch (err) {
    console.error('Get AI prompts error:', err)
    res.status(500).json({ error: 'Failed to fetch AI prompts' })
  }
}

/**
 * GET /api/ai-prompts/:id
 * Get single AI prompt
 */
const getAIPrompt = async (req, res) => {
  try {
    const { id } = req.params

    const { data: prompt, error } = await supabaseAdmin
      .from('ai_prompts')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .single()

    if (error || !prompt) {
      return res.status(404).json({ error: 'AI prompt not found' })
    }

    res.json({ prompt })
  } catch (err) {
    console.error('Get AI prompt error:', err)
    res.status(500).json({ error: 'Failed to fetch AI prompt' })
  }
}

/**
 * POST /api/ai-prompts
 * Create new AI prompt
 */
const createAIPrompt = async (req, res) => {
  try {
    const {
      user_id,
      name,
      category = 'general',
      system_prompt,
      begin_message,
      agent_profile = {},
      state_prompts = {},
      tools_config = {},
      call_type,
      call_goal,
      tone,
      status = 'draft',
      is_active = true,
      is_template = false,
      welcome_messages = [],
    } = req.body

    if (!user_id || !name || !system_prompt) {
      return res.status(400).json({ error: 'user_id, name, and system_prompt are required' })
    }

    const { data: prompt, error } = await supabaseAdmin
      .from('ai_prompts')
      .insert({
        user_id,
        name,
        category,
        system_prompt,
        begin_message: begin_message || null,
        agent_profile,
        state_prompts,
        tools_config,
        call_type: call_type || null,
        call_goal: call_goal || null,
        tone: tone || null,
        status,
        is_active,
        is_template,
        welcome_messages,
      })
      .select()
      .single()

    if (error) {
      return res.status(400).json({ error: error.message })
    }

    await logAdminActivity(req.admin.id, 'create_ai_prompt', {
      target_type: 'ai_prompt',
      target_id: prompt.id,
      user_id,
    })

    res.status(201).json({
      message: 'AI prompt created successfully',
      prompt,
    })
  } catch (err) {
    console.error('Create AI prompt error:', err)
    res.status(500).json({ error: 'Failed to create AI prompt' })
  }
}

/**
 * PUT /api/ai-prompts/:id
 * Update AI prompt
 */
const updateAIPrompt = async (req, res) => {
  try {
    const { id } = req.params
    const updateData = req.body

    // Remove fields that shouldn't be updated directly
    delete updateData.id
    delete updateData.user_id
    delete updateData.created_at

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: 'No fields to update' })
    }

    const { data: updatedPrompt, error } = await supabaseAdmin
      .from('ai_prompts')
      .update(updateData)
      .eq('id', id)
      .is('deleted_at', null)
      .select()
      .single()

    if (error) {
      return res.status(400).json({ error: error.message })
    }

    await logAdminActivity(req.admin.id, 'update_ai_prompt', {
      target_type: 'ai_prompt',
      target_id: id,
    })

    res.json({
      message: 'AI prompt updated successfully',
      prompt: updatedPrompt,
    })
  } catch (err) {
    console.error('Update AI prompt error:', err)
    res.status(500).json({ error: 'Failed to update AI prompt' })
  }
}

/**
 * DELETE /api/ai-prompts/:id
 * Delete AI prompt (soft delete)
 */
const deleteAIPrompt = async (req, res) => {
  try {
    const { id } = req.params

    const { error } = await supabaseAdmin
      .from('ai_prompts')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)

    if (error) {
      return res.status(400).json({ error: error.message })
    }

    await logAdminActivity(req.admin.id, 'delete_ai_prompt', {
      target_type: 'ai_prompt',
      target_id: id,
    })

    res.json({ message: 'AI prompt deleted successfully' })
  } catch (err) {
    console.error('Delete AI prompt error:', err)
    res.status(500).json({ error: 'Failed to delete AI prompt' })
  }
}

module.exports = {
  getAIPrompts,
  getAIPrompt,
  createAIPrompt,
  updateAIPrompt,
  deleteAIPrompt,
}
