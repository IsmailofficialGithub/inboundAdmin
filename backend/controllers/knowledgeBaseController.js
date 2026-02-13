const { supabaseAdmin } = require('../config/supabase')
const { logAdminActivity } = require('../utils/logger')

/**
 * GET /api/knowledge-bases
 * List all knowledge bases
 */
const getKnowledgeBases = async (req, res) => {
  try {
    const { user_id, status, page = 0, limit = 50 } = req.query
    const offset = parseInt(page) * parseInt(limit)

    let query = supabaseAdmin
      .from('knowledge_bases')
      .select('*', { count: 'exact' })
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .range(offset, offset + parseInt(limit) - 1)

    if (user_id) {
      query = query.eq('user_id', user_id)
    }

    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    const { data, count, error } = await query

    if (error) {
      // If table doesn't exist, return empty array instead of error
      if (error.code === '42P01' || error.message.includes('does not exist')) {
        return res.json({
          knowledge_bases: [],
          total: 0,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: 0,
        })
      }
      return res.status(400).json({ error: error.message })
    }

    // Fetch user emails and document/FAQ counts
    const basesWithDetails = await Promise.all(
      (data || []).map(async (base) => {
        let userEmail = null
        try {
          const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(base.user_id)
          userEmail = authUser?.user?.email || null
        } catch {}

        // Count documents
        const { count: docCount } = await supabaseAdmin
          .from('knowledge_base_documents')
          .select('*', { count: 'exact', head: true })
          .eq('knowledge_base_id', base.id)
          .is('deleted_at', null)

        // Count FAQs
        const { count: faqCount } = await supabaseAdmin
          .from('knowledge_base_faqs')
          .select('*', { count: 'exact', head: true })
          .eq('knowledge_base_id', base.id)
          .is('deleted_at', null)

        return {
          ...base,
          user_email: userEmail,
          document_count: docCount || 0,
          faq_count: faqCount || 0,
        }
      })
    )

    res.json({
      knowledge_bases: basesWithDetails,
      total: count || 0,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil((count || 0) / parseInt(limit)),
    })
  } catch (err) {
    console.error('Get knowledge bases error:', err)
    res.status(500).json({ error: 'Failed to fetch knowledge bases' })
  }
}

/**
 * GET /api/knowledge-bases/:id
 * Get single knowledge base with documents and FAQs
 */
const getKnowledgeBase = async (req, res) => {
  try {
    const { id } = req.params

    const { data: knowledgeBase, error } = await supabaseAdmin
      .from('knowledge_bases')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .single()

    if (error || !knowledgeBase) {
      return res.status(404).json({ error: 'Knowledge base not found' })
    }

    // Fetch documents
    const { data: documents } = await supabaseAdmin
      .from('knowledge_base_documents')
      .select('*')
      .eq('knowledge_base_id', id)
      .is('deleted_at', null)
      .order('uploaded_at', { ascending: false })

    // Fetch FAQs
    const { data: faqs } = await supabaseAdmin
      .from('knowledge_base_faqs')
      .select('*')
      .eq('knowledge_base_id', id)
      .is('deleted_at', null)
      .order('display_order', { ascending: true })

    res.json({
      knowledge_base: knowledgeBase,
      documents: documents || [],
      faqs: faqs || [],
    })
  } catch (err) {
    console.error('Get knowledge base error:', err)
    res.status(500).json({ error: 'Failed to fetch knowledge base' })
  }
}

/**
 * POST /api/knowledge-bases
 * Create new knowledge base
 */
const createKnowledgeBase = async (req, res) => {
  try {
    const { user_id, name, description, status = 'active', metadata = {} } = req.body

    if (!user_id || !name) {
      return res.status(400).json({ error: 'user_id and name are required' })
    }

    const { data: knowledgeBase, error } = await supabaseAdmin
      .from('knowledge_bases')
      .insert({
        user_id,
        name,
        description: description || null,
        status,
        metadata,
      })
      .select()
      .single()

    if (error) {
      return res.status(400).json({ error: error.message })
    }

    await logAdminActivity(req.admin.id, 'create_knowledge_base', {
      target_type: 'knowledge_base',
      target_id: knowledgeBase.id,
      user_id,
    })

    res.status(201).json({
      message: 'Knowledge base created successfully',
      knowledge_base: knowledgeBase,
    })
  } catch (err) {
    console.error('Create knowledge base error:', err)
    res.status(500).json({ error: 'Failed to create knowledge base' })
  }
}

/**
 * PUT /api/knowledge-bases/:id
 * Update knowledge base
 */
const updateKnowledgeBase = async (req, res) => {
  try {
    const { id } = req.params
    const { name, description, status, metadata } = req.body

    const updateData = {}
    if (name !== undefined) updateData.name = name
    if (description !== undefined) updateData.description = description
    if (status !== undefined) updateData.status = status
    if (metadata !== undefined) updateData.metadata = metadata

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: 'No fields to update' })
    }

    const { data: updatedBase, error } = await supabaseAdmin
      .from('knowledge_bases')
      .update(updateData)
      .eq('id', id)
      .is('deleted_at', null)
      .select()
      .single()

    if (error) {
      return res.status(400).json({ error: error.message })
    }

    await logAdminActivity(req.admin.id, 'update_knowledge_base', {
      target_type: 'knowledge_base',
      target_id: id,
    })

    res.json({
      message: 'Knowledge base updated successfully',
      knowledge_base: updatedBase,
    })
  } catch (err) {
    console.error('Update knowledge base error:', err)
    res.status(500).json({ error: 'Failed to update knowledge base' })
  }
}

/**
 * DELETE /api/knowledge-bases/:id
 * Delete knowledge base (soft delete)
 */
const deleteKnowledgeBase = async (req, res) => {
  try {
    const { id } = req.params

    const { error } = await supabaseAdmin
      .from('knowledge_bases')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)

    if (error) {
      return res.status(400).json({ error: error.message })
    }

    await logAdminActivity(req.admin.id, 'delete_knowledge_base', {
      target_type: 'knowledge_base',
      target_id: id,
    })

    res.json({ message: 'Knowledge base deleted successfully' })
  } catch (err) {
    console.error('Delete knowledge base error:', err)
    res.status(500).json({ error: 'Failed to delete knowledge base' })
  }
}

/**
 * POST /api/knowledge-bases/:id/documents
 * Add document to knowledge base
 */
const addDocument = async (req, res) => {
  try {
    const { id } = req.params
    const { name, file_type, file_url, file_size, storage_path, description } = req.body

    if (!name || !file_url) {
      return res.status(400).json({ error: 'name and file_url are required' })
    }

    const { data: document, error } = await supabaseAdmin
      .from('knowledge_base_documents')
      .insert({
        knowledge_base_id: id,
        name,
        file_type: file_type || null,
        file_url,
        file_size: file_size || null,
        storage_path: storage_path || null,
        description: description || null,
      })
      .select()
      .single()

    if (error) {
      return res.status(400).json({ error: error.message })
    }

    await logAdminActivity(req.admin.id, 'add_knowledge_base_document', {
      target_type: 'knowledge_base_document',
      target_id: document.id,
      knowledge_base_id: id,
    })

    res.status(201).json({
      message: 'Document added successfully',
      document,
    })
  } catch (err) {
    console.error('Add document error:', err)
    res.status(500).json({ error: 'Failed to add document' })
  }
}

/**
 * DELETE /api/knowledge-bases/documents/:id
 * Delete document (soft delete)
 */
const deleteDocument = async (req, res) => {
  try {
    const { id } = req.params

    const { error } = await supabaseAdmin
      .from('knowledge_base_documents')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)

    if (error) {
      return res.status(400).json({ error: error.message })
    }

    await logAdminActivity(req.admin.id, 'delete_knowledge_base_document', {
      target_type: 'knowledge_base_document',
      target_id: id,
    })

    res.json({ message: 'Document deleted successfully' })
  } catch (err) {
    console.error('Delete document error:', err)
    res.status(500).json({ error: 'Failed to delete document' })
  }
}

/**
 * POST /api/knowledge-bases/:id/faqs
 * Add FAQ to knowledge base
 */
const addFAQ = async (req, res) => {
  try {
    const { id } = req.params
    const { question, answer, category, priority = 0, display_order = 0 } = req.body

    if (!question || !answer) {
      return res.status(400).json({ error: 'question and answer are required' })
    }

    const { data: faq, error } = await supabaseAdmin
      .from('knowledge_base_faqs')
      .insert({
        knowledge_base_id: id,
        question,
        answer,
        category: category || null,
        priority,
        display_order,
      })
      .select()
      .single()

    if (error) {
      return res.status(400).json({ error: error.message })
    }

    await logAdminActivity(req.admin.id, 'add_knowledge_base_faq', {
      target_type: 'knowledge_base_faq',
      target_id: faq.id,
      knowledge_base_id: id,
    })

    res.status(201).json({
      message: 'FAQ added successfully',
      faq,
    })
  } catch (err) {
    console.error('Add FAQ error:', err)
    res.status(500).json({ error: 'Failed to add FAQ' })
  }
}

/**
 * PUT /api/knowledge-bases/faqs/:id
 * Update FAQ
 */
const updateFAQ = async (req, res) => {
  try {
    const { id } = req.params
    const { question, answer, category, priority, display_order } = req.body

    const updateData = {}
    if (question !== undefined) updateData.question = question
    if (answer !== undefined) updateData.answer = answer
    if (category !== undefined) updateData.category = category
    if (priority !== undefined) updateData.priority = priority
    if (display_order !== undefined) updateData.display_order = display_order

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: 'No fields to update' })
    }

    const { data: updatedFAQ, error } = await supabaseAdmin
      .from('knowledge_base_faqs')
      .update(updateData)
      .eq('id', id)
      .is('deleted_at', null)
      .select()
      .single()

    if (error) {
      return res.status(400).json({ error: error.message })
    }

    await logAdminActivity(req.admin.id, 'update_knowledge_base_faq', {
      target_type: 'knowledge_base_faq',
      target_id: id,
    })

    res.json({
      message: 'FAQ updated successfully',
      faq: updatedFAQ,
    })
  } catch (err) {
    console.error('Update FAQ error:', err)
    res.status(500).json({ error: 'Failed to update FAQ' })
  }
}

/**
 * DELETE /api/knowledge-bases/faqs/:id
 * Delete FAQ (soft delete)
 */
const deleteFAQ = async (req, res) => {
  try {
    const { id } = req.params

    const { error } = await supabaseAdmin
      .from('knowledge_base_faqs')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)

    if (error) {
      return res.status(400).json({ error: error.message })
    }

    await logAdminActivity(req.admin.id, 'delete_knowledge_base_faq', {
      target_type: 'knowledge_base_faq',
      target_id: id,
    })

    res.json({ message: 'FAQ deleted successfully' })
  } catch (err) {
    console.error('Delete FAQ error:', err)
    res.status(500).json({ error: 'Failed to delete FAQ' })
  }
}

module.exports = {
  getKnowledgeBases,
  getKnowledgeBase,
  createKnowledgeBase,
  updateKnowledgeBase,
  deleteKnowledgeBase,
  addDocument,
  deleteDocument,
  addFAQ,
  updateFAQ,
  deleteFAQ,
}
