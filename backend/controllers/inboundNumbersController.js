const { supabaseAdmin } = require('../config/supabase')
const { logAdminActivity } = require('../utils/logger')
const { verifyProviderConnection } = require('../utils/providerVerification')

/**
 * POST /api/inbound-numbers/verify-connection
 * Verify provider connection without creating a number
 */
const verifyConnection = async (req, res) => {
  try {
    const {
      provider,
      provider_account_id,
      twilio_sid,
      twilio_auth_token,
      twilio_account_sid,
      vonage_api_key,
      vonage_api_secret,
      vonage_application_id,
      callhippo_api_key,
      callhippo_account_id,
      provider_api_key,
      provider_api_secret,
      provider_webhook_url,
    } = req.body

    // Validate provider
    if (!provider) {
      return res.status(400).json({ error: 'Provider is required' })
    }

    const validProviders = ['twilio', 'vonage', 'callhippo', 'telnyx', 'other']
    if (!validProviders.includes(provider)) {
      return res.status(400).json({ error: `Invalid provider. Must be one of: ${validProviders.join(', ')}` })
    }

    // Prepare credentials for verification
    const credentials = {
      twilio_account_sid: twilio_account_sid || provider_account_id,
      twilio_auth_token: twilio_auth_token,
      twilio_sid: twilio_sid,
      vonage_api_key: vonage_api_key,
      vonage_api_secret: vonage_api_secret,
      vonage_application_id: vonage_application_id,
      callhippo_api_key: callhippo_api_key,
      callhippo_account_id: callhippo_account_id,
      provider_api_key: provider_api_key,
      provider_api_secret: provider_api_secret,
      provider_webhook_url: provider_webhook_url,
    }

    // Verify provider connection
    const verification = await verifyProviderConnection(provider, credentials)
    
    if (!verification.success) {
      return res.status(400).json({
        success: false,
        error: verification.error,
      })
    }

    res.json({
      success: true,
      message: 'Connection verified successfully',
      account: verification.account,
    })
  } catch (err) {
    console.error('Verify connection error:', err)
    res.status(500).json({ success: false, error: 'Failed to verify connection' })
  }
}

/**
 * POST /api/inbound-numbers
 * Create a new inbound number with provider verification
 */
const createInboundNumber = async (req, res) => {
  try {
    const {
      user_id,
      phone_number,
      country_code = '+1',
      phone_label,
      call_forwarding_number,
      provider,
      provider_account_id,
      twilio_sid,
      twilio_auth_token,
      twilio_account_sid,
      sms_enabled = false,
      vonage_api_key,
      vonage_api_secret,
      vonage_application_id,
      callhippo_api_key,
      callhippo_account_id,
      provider_api_key,
      provider_api_secret,
      provider_webhook_url,
      provider_config = {},
      webhook_url,
      assigned_to_agent_id,
      notes,
      metadata = {},
    } = req.body

    // Validate required fields
    if (!user_id || !phone_number || !provider) {
      return res.status(400).json({ error: 'user_id, phone_number, and provider are required' })
    }

    // Validate provider
    const validProviders = ['twilio', 'vonage', 'callhippo', 'telnyx', 'other']
    if (!validProviders.includes(provider)) {
      return res.status(400).json({ error: `Invalid provider. Must be one of: ${validProviders.join(', ')}` })
    }

    // Validate user exists and is active
    try {
      const { data: authUser, error: userError } = await supabaseAdmin.auth.admin.getUserById(user_id)
      if (userError || !authUser?.user) {
        return res.status(404).json({ error: 'User not found. Please verify the user exists and is active.' })
      }
      
      // Additional check: verify user is in the users table (consumer)
      const { data: consumerUser } = await supabaseAdmin
        .from('users')
        .select('id, account_status')
        .eq('id', user_id)
        .single()
      
      if (!consumerUser) {
        return res.status(404).json({ error: 'User not found in system. Please select a valid consumer user.' })
      }
      
      if (consumerUser.account_status === 'deleted' || consumerUser.account_status === 'suspended') {
        return res.status(400).json({ 
          error: `Cannot create number for user with status: ${consumerUser.account_status}. User must be active.` 
        })
      }
    } catch (err) {
      console.error('User validation error:', err)
      return res.status(404).json({ error: 'Failed to verify user. Please ensure the user exists and is active.' })
    }

    // Check if number already exists for this user (not deleted)
    const { data: existingNumber } = await supabaseAdmin
      .from('inbound_numbers')
      .select('id')
      .eq('user_id', user_id)
      .eq('phone_number', phone_number)
      .is('deleted_at', null)
      .single()

    if (existingNumber) {
      return res.status(409).json({ error: 'This phone number already exists for this user' })
    }

    // Prepare credentials for verification
    const credentials = {
      twilio_account_sid: twilio_account_sid || provider_account_id,
      twilio_auth_token: twilio_auth_token,
      twilio_sid: twilio_sid,
      vonage_api_key: vonage_api_key,
      vonage_api_secret: vonage_api_secret,
      vonage_application_id: vonage_application_id,
      callhippo_api_key: callhippo_api_key,
      callhippo_account_id: callhippo_account_id,
      provider_api_key: provider_api_key,
      provider_api_secret: provider_api_secret,
      provider_webhook_url: provider_webhook_url,
    }

    // Verify provider connection
    const verification = await verifyProviderConnection(provider, credentials)
    if (!verification.success) {
      return res.status(400).json({ 
        error: `Provider connection verification failed: ${verification.error}`,
        verificationError: verification.error,
      })
    }

    // Prepare number data
    const numberData = {
      user_id,
      phone_number,
      country_code,
      phone_label: phone_label || null,
      call_forwarding_number: call_forwarding_number || null,
      provider,
      provider_account_id: provider_account_id || null,
      twilio_sid: twilio_sid || null,
      twilio_auth_token: twilio_auth_token || null,
      twilio_account_sid: twilio_account_sid || provider_account_id || null,
      sms_enabled: sms_enabled || false,
      vonage_api_key: vonage_api_key || null,
      vonage_api_secret: vonage_api_secret || null,
      vonage_application_id: vonage_application_id || null,
      callhippo_api_key: callhippo_api_key || null,
      callhippo_account_id: callhippo_account_id || null,
      provider_api_key: provider_api_key || null,
      provider_api_secret: provider_api_secret || null,
      provider_webhook_url: provider_webhook_url || null,
      provider_config: typeof provider_config === 'object' ? provider_config : {},
      status: 'active',
      health_status: 'unknown',
      webhook_url: webhook_url || null,
      webhook_status: 'unknown',
      assigned_to_agent_id: assigned_to_agent_id || null,
      is_in_use: !!assigned_to_agent_id,
      metadata: typeof metadata === 'object' ? metadata : {},
      notes: notes || null,
    }

    // Create the number
    const { data: newNumber, error: createError } = await supabaseAdmin
      .from('inbound_numbers')
      .insert(numberData)
      .select()
      .single()

    if (createError) {
      console.error('Create inbound number error:', createError)
      return res.status(400).json({ error: createError.message || 'Failed to create inbound number' })
    }

    // Log admin activity
    await logAdminActivity(req.admin.id, 'inbound_number_created', {
      target_type: 'inbound_number',
      target_id: newNumber.id,
      ip: req.ip,
      extra: {
        phone_number: `${country_code}${phone_number}`,
        provider,
        user_id,
        verification_success: true,
      },
    })

    res.status(201).json({
      success: true,
      message: 'Inbound number created successfully',
      number: newNumber,
      verification: {
        success: true,
        account: verification.account,
      },
    })
  } catch (err) {
    console.error('Create inbound number error:', err)
    res.status(500).json({ error: 'Failed to create inbound number' })
  }
}

/**
 * GET /api/inbound-numbers
 * List inbound numbers with pagination and filters
 */
const getInboundNumbers = async (req, res) => {
  try {
    const { search, status, provider, user_id, page = 0, limit = 50 } = req.query
    const offset = parseInt(page) * parseInt(limit)

    let query = supabaseAdmin
      .from('inbound_numbers')
      .select('*', { count: 'exact' })
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .range(offset, offset + parseInt(limit) - 1)

    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    if (provider && provider !== 'all') {
      query = query.eq('provider', provider)
    }

    if (user_id) {
      query = query.eq('user_id', user_id)
    }

    if (search) {
      query = query.or(
        `phone_number.ilike.%${search}%,phone_label.ilike.%${search}%`
      )
    }

    const { data, count, error } = await query

    if (error) {
      return res.status(400).json({ error: error.message })
    }

    // Fetch owner emails and agent names
    const numbersWithDetails = await Promise.all(
      (data || []).map(async (num) => {
        let ownerEmail = null
        let agentName = null
        try {
          const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(num.user_id)
          ownerEmail = authUser?.user?.email || null
        } catch {}
        if (num.assigned_to_agent_id) {
          try {
            const { data: agent } = await supabaseAdmin
              .from('voice_agents')
              .select('name')
              .eq('id', num.assigned_to_agent_id)
              .single()
            agentName = agent?.name || null
          } catch {}
        }
        return { ...num, owner_email: ownerEmail, agent_name: agentName }
      })
    )

    res.json({
      numbers: numbersWithDetails,
      total: count || 0,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil((count || 0) / parseInt(limit)),
    })
  } catch (err) {
    console.error('Get inbound numbers error:', err)
    res.status(500).json({ error: 'Failed to fetch inbound numbers' })
  }
}

/**
 * GET /api/inbound-numbers/:id
 * Get single inbound number details
 */
const getInboundNumberById = async (req, res) => {
  try {
    const { id } = req.params

    const { data: number, error } = await supabaseAdmin
      .from('inbound_numbers')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .single()

    if (error || !number) {
      return res.status(404).json({ error: 'Inbound number not found' })
    }

    // Fetch owner email
    let ownerEmail = null
    try {
      const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(number.user_id)
      ownerEmail = authUser?.user?.email || null
    } catch {}

    // Fetch assigned agent details
    let assignedAgent = null
    if (number.assigned_to_agent_id) {
      try {
        const { data: agent } = await supabaseAdmin
          .from('voice_agents')
          .select('id, name, status, agent_type, phone_number')
          .eq('id', number.assigned_to_agent_id)
          .single()
        assignedAgent = agent
      } catch {}
    }

    // Fetch recent calls for this number
    const { data: recentCalls } = await supabaseAdmin
      .from('call_history')
      .select('id, caller_number, called_number, call_status, call_duration, call_start_time')
      .eq('inbound_number_id', id)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(20)

    res.json({
      number: { ...number, owner_email: ownerEmail },
      assignedAgent,
      recentCalls: recentCalls || [],
    })
  } catch (err) {
    console.error('Get inbound number error:', err)
    res.status(500).json({ error: 'Failed to fetch inbound number' })
  }
}

/**
 * PUT /api/inbound-numbers/:id
 * Update inbound number details
 */
const updateInboundNumber = async (req, res) => {
  try {
    const { id } = req.params
    const {
      phone_label, status, call_forwarding_number,
      assigned_to_agent_id, notes,
    } = req.body

    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('inbound_numbers')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .single()

    if (fetchError || !existing) {
      return res.status(404).json({ error: 'Inbound number not found' })
    }

    const updateData = { updated_at: new Date().toISOString() }
    if (phone_label !== undefined) updateData.phone_label = phone_label
    if (status !== undefined) updateData.status = status
    if (call_forwarding_number !== undefined) updateData.call_forwarding_number = call_forwarding_number
    if (assigned_to_agent_id !== undefined) {
      updateData.assigned_to_agent_id = assigned_to_agent_id || null
      updateData.is_in_use = !!assigned_to_agent_id
    }
    if (notes !== undefined) updateData.notes = notes

    const { error } = await supabaseAdmin
      .from('inbound_numbers')
      .update(updateData)
      .eq('id', id)

    if (error) throw error

    await logAdminActivity(req.admin.id, 'inbound_number_updated', {
      target_type: 'inbound_number',
      target_id: id,
      ip: req.ip,
      extra: {
        phone_number: existing.phone_number,
        updated_fields: Object.keys(updateData).filter((k) => k !== 'updated_at'),
      },
    })

    const { data: updated } = await supabaseAdmin
      .from('inbound_numbers')
      .select('*')
      .eq('id', id)
      .single()

    res.json({ success: true, message: 'Inbound number updated successfully', number: updated })
  } catch (err) {
    console.error('Update inbound number error:', err)
    res.status(500).json({ error: 'Failed to update inbound number' })
  }
}

/**
 * PATCH /api/inbound-numbers/:id/assign
 * Assign inbound number to a voice agent
 */
const assignToAgent = async (req, res) => {
  try {
    const { id } = req.params
    const { agent_id } = req.body

    const { data: number, error: fetchError } = await supabaseAdmin
      .from('inbound_numbers')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .single()

    if (fetchError || !number) {
      return res.status(404).json({ error: 'Inbound number not found' })
    }

    // Validate agent exists if assigning
    if (agent_id) {
      const { data: agent, error: agentError } = await supabaseAdmin
        .from('voice_agents')
        .select('id, name')
        .eq('id', agent_id)
        .is('deleted_at', null)
        .single()

      if (agentError || !agent) {
        return res.status(404).json({ error: 'Voice agent not found' })
      }
    }

    const { error } = await supabaseAdmin
      .from('inbound_numbers')
      .update({
        assigned_to_agent_id: agent_id || null,
        is_in_use: !!agent_id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (error) throw error

    await logAdminActivity(req.admin.id, agent_id ? 'number_assigned_to_agent' : 'number_unassigned', {
      target_type: 'inbound_number',
      target_id: id,
      ip: req.ip,
      extra: {
        phone_number: number.phone_number,
        agent_id: agent_id || null,
        previous_agent_id: number.assigned_to_agent_id,
      },
    })

    res.json({
      success: true,
      message: agent_id ? 'Number assigned to agent successfully' : 'Number unassigned successfully',
    })
  } catch (err) {
    console.error('Assign to agent error:', err)
    res.status(500).json({ error: 'Failed to assign number' })
  }
}

module.exports = {
  verifyConnection,
  createInboundNumber,
  getInboundNumbers,
  getInboundNumberById,
  updateInboundNumber,
  assignToAgent,
}
