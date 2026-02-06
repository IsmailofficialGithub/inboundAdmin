const { supabaseAdmin } = require('../config/supabase')
const { sendEmail } = require('../config/email')
const { invoiceEmailTemplate } = require('../utils/emailTemplates')
const { logAdminActivity } = require('../utils/logger')

// ============================================================
// INVOICE CRUD OPERATIONS
// ============================================================

/**
 * GET /api/invoices
 * List all invoices with filters
 */
const listInvoices = async (req, res) => {
  try {
    const {
      page = 0,
      limit = 50,
      user_id,
      status,
      invoice_number,
      start_date,
      end_date,
      sort_by = 'invoice_date',
      sort_order = 'desc',
    } = req.query

    let query = supabaseAdmin.from('invoices').select('*, packages:package_id(name, tier)', { count: 'exact' })

    // Apply filters
    if (user_id) {
      query = query.eq('user_id', user_id)
    }
    if (status) {
      query = query.eq('status', status)
    }
    if (invoice_number) {
      query = query.ilike('invoice_number', `%${invoice_number}%`)
    }
    if (start_date) {
      query = query.gte('invoice_date', start_date)
    }
    if (end_date) {
      query = query.lte('invoice_date', end_date)
    }

    // Apply sorting
    query = query.order(sort_by, { ascending: sort_order === 'asc' })

    // Apply pagination
    const from = parseInt(page) * parseInt(limit)
    const to = from + parseInt(limit) - 1
    query = query.range(from, to)

    const { data, error, count } = await query

    if (error) {
      return res.status(400).json({ error: error.message })
    }

    // Fetch user emails separately (auth.users is not directly joinable)
    const invoicesWithUsers = await Promise.all(
      (data || []).map(async (invoice) => {
        try {
          const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(invoice.user_id)
          return {
            ...invoice,
            users: {
              email: authUser?.user?.email || null,
            },
          }
        } catch (err) {
          return {
            ...invoice,
            users: {
              email: null,
            },
          }
        }
      })
    )

    res.json({
      invoices: invoicesWithUsers,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count || 0,
        totalPages: Math.ceil((count || 0) / parseInt(limit)),
      },
    })
  } catch (err) {
    console.error('List invoices error:', err)
    res.status(500).json({ error: 'Failed to fetch invoices' })
  }
}

/**
 * GET /api/invoices/:id
 * Get invoice by ID
 */
const getInvoice = async (req, res) => {
  try {
    const { id } = req.params

    const { data: invoice, error } = await supabaseAdmin
      .from('invoices')
      .select('*, packages:package_id(name, tier, slug)')
      .eq('id', id)
      .single()

    if (error || !invoice) {
      return res.status(404).json({ error: 'Invoice not found' })
    }

    // Fetch user data separately
    try {
      const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(invoice.user_id)
      invoice.users = {
        email: authUser?.user?.email || null,
        first_name: authUser?.user?.user_metadata?.first_name || null,
        last_name: authUser?.user?.user_metadata?.last_name || null,
      }
    } catch (err) {
      invoice.users = {
        email: null,
        first_name: null,
        last_name: null,
      }
    }

    res.json({ invoice })
  } catch (err) {
    console.error('Get invoice error:', err)
    res.status(500).json({ error: 'Failed to fetch invoice' })
  }
}

/**
 * POST /api/invoices
 * Create a new invoice (manual generation)
 */
const createInvoice = async (req, res) => {
  try {
    const {
      user_id,
      user_email,
      invoice_date,
      due_date,
      package_id,
      subtotal,
      discount_amount = 0,
      discount_code,
      tax_rate = 0,
      currency = 'USD',
      billing_address,
      items,
      notes,
      status = 'draft',
    } = req.body

    // Validate required fields
    if (!invoice_date) {
      return res.status(400).json({ error: 'Missing required field: invoice_date' })
    }

    // Get user_id from email if email is provided, otherwise use user_id directly
    let finalUserId = user_id
    if (user_email && !user_id) {
      try {
        // Look up user by email using Supabase Admin API
        // Note: listUsers() doesn't support email filter, so we search through results
        // For better performance with many users, consider creating a database function
        const { data: authUsers, error: userError } = await supabaseAdmin.auth.admin.listUsers()
        if (userError) {
          return res.status(400).json({ error: 'Failed to lookup user' })
        }
        const user = authUsers.users.find((u) => u.email?.toLowerCase() === user_email.toLowerCase())
        if (!user) {
          return res.status(400).json({ error: `User with email ${user_email} not found` })
        }
        finalUserId = user.id
      } catch (err) {
        console.error('Error looking up user by email:', err)
        return res.status(400).json({ error: `Failed to find user: ${err.message}` })
      }
    } else if (!user_id && !user_email) {
      return res.status(400).json({ error: 'Missing required field: user_id or user_email' })
    }

    let finalItems = items || []
    let finalSubtotal = subtotal
    let finalCurrency = currency
    let finalTaxRate = tax_rate
    let finalNotes = notes || null

    // If package_id is provided, auto-populate from package
    if (package_id) {
      const { data: packageData, error: packageError } = await supabaseAdmin
        .from('packages')
        .select('*, package_features(*), package_variables(*)')
        .eq('id', package_id)
        .single()

      if (packageError || !packageData) {
        return res.status(400).json({ error: 'Package not found' })
      }

      // Set currency from package if not provided
      if (!currency) {
        finalCurrency = packageData.currency || 'USD'
      }

      // Get tax rate from invoice settings if not provided
      if (!tax_rate) {
        const { data: settings } = await supabaseAdmin
          .from('invoice_settings')
          .select('default_tax_rate')
          .eq('is_active', true)
          .single()
        finalTaxRate = settings?.default_tax_rate || 0
      }

      // Build invoice items from package
      finalItems = [
        {
          description: `${packageData.name} Package`,
          quantity: 1,
          unit_price: packageData.price_monthly || 0,
          total: packageData.price_monthly || 0,
        },
      ]

      // Add package features as line items if needed (optional)
      // Or include them in the description/notes
      const featuresList = (packageData.package_features || [])
        .map((feature) => {
          let rendered = feature.feature_template
          // Replace built-in variables
          rendered = rendered.replace(/\{\{credits\}\}/g, String(packageData.credits_included || 0))
          rendered = rendered.replace(/\{\{price_monthly\}\}/g, String(packageData.price_monthly || 0))
          rendered = rendered.replace(/\{\{price_yearly\}\}/g, String(packageData.price_yearly || 0))
          rendered = rendered.replace(/\{\{currency\}\}/g, packageData.currency || 'USD')
          // Replace custom variables
          ;(packageData.package_variables || []).forEach((variable) => {
            const regex = new RegExp(`\\{\\{${variable.variable_key}\\}\\}`, 'g')
            rendered = rendered.replace(regex, variable.variable_value)
          })
          return rendered
        })
        .join(', ')

      // Calculate subtotal from package price
      finalSubtotal = packageData.price_monthly || 0

      // Update notes to include package features
      if (featuresList) {
        finalNotes = finalNotes
          ? `${finalNotes}\n\nPackage Features: ${featuresList}`
          : `Package Features: ${featuresList}`
      }
    } else {
      // Manual invoice - validate items and subtotal
      if (!subtotal || !items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'Missing required fields: subtotal and items (or provide package_id)' })
      }
      finalSubtotal = parseFloat(subtotal)
    }

    // Calculate tax and total
    const taxAmount = parseFloat(finalSubtotal) * parseFloat(finalTaxRate)
    const totalAmount = parseFloat(finalSubtotal) - parseFloat(discount_amount) + taxAmount

    // Get invoice settings for number generation
    const { data: settings } = await supabaseAdmin
      .from('invoice_settings')
      .select('*')
      .eq('is_active', true)
      .single()

    // Generate invoice number
    let invoiceNumber
    try {
      const { data: invoiceNumberData, error: numberError } = await supabaseAdmin.rpc('generate_invoice_number')
      
      if (numberError || !invoiceNumberData) {
        throw numberError || new Error('Failed to generate invoice number')
      }
      invoiceNumber = invoiceNumberData
    } catch (err) {
      console.error('Error generating invoice number:', err)
      // Fallback to manual generation
      const prefix = settings?.invoice_number_prefix || 'INV'
      const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '')
      const sequence = (settings?.invoice_number_sequence || 0) + 1
      invoiceNumber = `${prefix}-${dateStr}-${String(sequence).padStart(6, '0')}`
      
      // Update sequence in settings
      if (settings) {
        await supabaseAdmin
          .from('invoice_settings')
          .update({ invoice_number_sequence: sequence })
          .eq('id', settings.id)
      }
    }

    // Create invoice
    const { data: invoice, error: createError } = await supabaseAdmin
      .from('invoices')
      .insert({
        user_id: finalUserId,
        invoice_number: invoiceNumber,
        invoice_date,
        due_date,
        package_id: package_id || null,
        subtotal: parseFloat(finalSubtotal),
        discount_amount: parseFloat(discount_amount),
        discount_code,
        tax_rate: parseFloat(finalTaxRate),
        tax_amount: taxAmount,
        total_amount: totalAmount,
        currency: finalCurrency,
        status,
        billing_address: billing_address || null,
        items: finalItems,
        notes: finalNotes,
      })
      .select()
      .single()

    if (createError) {
      return res.status(400).json({ error: createError.message })
    }

    // If discount code was used, track it
    if (discount_code) {
      const { data: coupon } = await supabaseAdmin
        .from('coupon_codes')
        .select('id')
        .eq('code', discount_code)
        .single()

      if (coupon) {
        await supabaseAdmin.from('coupon_usage').insert({
          coupon_id: coupon.id,
          user_id: finalUserId,
          invoice_id: invoice.id,
          discount_amount: parseFloat(discount_amount),
        })

        // Update coupon usage count
        const { data: currentCoupon } = await supabaseAdmin
          .from('coupon_codes')
          .select('usage_count')
          .eq('id', coupon.id)
          .single()
        
        if (currentCoupon) {
          await supabaseAdmin
            .from('coupon_codes')
            .update({ usage_count: (currentCoupon.usage_count || 0) + 1 })
            .eq('id', coupon.id)
        }
      }
    }

    await logAdminActivity(req.admin.id, 'create_invoice', {
      target_type: 'invoice',
      target_id: invoice.id,
      ip: req.ip,
      extra: { invoice_number: invoice.invoice_number, user_id: finalUserId, user_email },
    })

    res.status(201).json({ invoice })
  } catch (err) {
    console.error('Create invoice error:', err)
    res.status(500).json({ error: 'Failed to create invoice' })
  }
}

/**
 * PUT /api/invoices/:id
 * Update invoice
 */
const updateInvoice = async (req, res) => {
  try {
    const { id } = req.params
    const updateData = req.body

    // Recalculate totals if amounts changed
    if (updateData.subtotal !== undefined || updateData.discount_amount !== undefined || updateData.tax_rate !== undefined) {
      const { data: existingInvoice } = await supabaseAdmin
        .from('invoices')
        .select('subtotal, discount_amount, tax_rate')
        .eq('id', id)
        .single()

      const subtotal = updateData.subtotal ?? existingInvoice?.subtotal ?? 0
      const discountAmount = updateData.discount_amount ?? existingInvoice?.discount_amount ?? 0
      const taxRate = updateData.tax_rate ?? existingInvoice?.tax_rate ?? 0

      const taxAmount = parseFloat(subtotal) * parseFloat(taxRate)
      updateData.tax_amount = taxAmount
      updateData.total_amount = parseFloat(subtotal) - parseFloat(discountAmount) + taxAmount
    }

    const { data: invoice, error } = await supabaseAdmin
      .from('invoices')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error || !invoice) {
      return res.status(404).json({ error: 'Invoice not found or update failed' })
    }

    await logAdminActivity(req.admin.id, 'update_invoice', {
      target_type: 'invoice',
      target_id: id,
      ip: req.ip,
      extra: { invoice_number: invoice.invoice_number },
    })

    res.json({ invoice })
  } catch (err) {
    console.error('Update invoice error:', err)
    res.status(500).json({ error: 'Failed to update invoice' })
  }
}

/**
 * DELETE /api/invoices/:id
 * Delete invoice (soft delete by setting status to cancelled)
 */
const deleteInvoice = async (req, res) => {
  try {
    const { id } = req.params

    const { data: invoice, error } = await supabaseAdmin
      .from('invoices')
      .update({ status: 'cancelled' })
      .eq('id', id)
      .select()
      .single()

    if (error || !invoice) {
      return res.status(404).json({ error: 'Invoice not found' })
    }

    await logAdminActivity(req.admin.id, 'delete_invoice', {
      target_type: 'invoice',
      target_id: id,
      ip: req.ip,
      extra: { invoice_number: invoice.invoice_number },
    })

    res.json({ message: 'Invoice cancelled successfully', invoice })
  } catch (err) {
    console.error('Delete invoice error:', err)
    res.status(500).json({ error: 'Failed to delete invoice' })
  }
}

/**
 * GET /api/invoices/:id/download
 * Download invoice as PDF (returns HTML for now, PDF can be added later)
 */
const downloadInvoice = async (req, res) => {
  try {
    const { id } = req.params

    const { data: invoice, error } = await supabaseAdmin
      .from('invoices')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !invoice) {
      return res.status(404).json({ error: 'Invoice not found' })
    }

    // Fetch user data separately
    try {
      const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(invoice.user_id)
      invoice.users = {
        email: authUser?.user?.email || null,
        first_name: authUser?.user?.user_metadata?.first_name || null,
        last_name: authUser?.user?.user_metadata?.last_name || null,
      }
    } catch (err) {
      invoice.users = {
        email: null,
        first_name: null,
        last_name: null,
      }
    }

    // Get invoice settings
    const { data: settings } = await supabaseAdmin
      .from('invoice_settings')
      .select('*')
      .eq('is_active', true)
      .single()

    // Generate HTML invoice (PDF generation can be added later with pdfkit or puppeteer)
    const html = generateInvoiceHTML(invoice, settings)

    res.setHeader('Content-Type', 'text/html')
    res.send(html)
  } catch (err) {
    console.error('Download invoice error:', err)
    res.status(500).json({ error: 'Failed to generate invoice' })
  }
}

/**
 * Helper function to generate invoice HTML
 */
const generateInvoiceHTML = (invoice, settings) => {
  const companyName = settings?.company_name || 'Outbond Inc.'
  const companyAddress = settings?.company_address || {}
  const addressLines = [
    companyAddress.street,
    `${companyAddress.city || ''}${companyAddress.state ? `, ${companyAddress.state}` : ''} ${companyAddress.zip || ''}`,
    companyAddress.country,
  ]
    .filter(Boolean)
    .join('<br>')

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Invoice ${invoice.invoice_number}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; color: #333; }
    .header { margin-bottom: 30px; }
    .company-info { float: left; }
    .invoice-info { float: right; text-align: right; }
    .clear { clear: both; }
    .section { margin: 20px 0; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
    th { background-color: #f8f9fa; font-weight: bold; }
    .text-right { text-align: right; }
    .total-row { font-weight: bold; font-size: 1.1em; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 0.9em; color: #666; }
  </style>
</head>
<body>
  <div class="header">
    <div class="company-info">
      <h1>${companyName}</h1>
      <div>${addressLines}</div>
      ${settings?.company_phone ? `<div>Phone: ${settings.company_phone}</div>` : ''}
      ${settings?.company_email ? `<div>Email: ${settings.company_email}</div>` : ''}
    </div>
    <div class="invoice-info">
      <h2>INVOICE</h2>
      <div><strong>Invoice #:</strong> ${invoice.invoice_number}</div>
      <div><strong>Date:</strong> ${new Date(invoice.invoice_date).toLocaleDateString()}</div>
      ${invoice.due_date ? `<div><strong>Due Date:</strong> ${new Date(invoice.due_date).toLocaleDateString()}</div>` : ''}
      <div><strong>Status:</strong> ${invoice.status.toUpperCase()}</div>
    </div>
    <div class="clear"></div>
  </div>

  <div class="section">
    <h3>Bill To:</h3>
    <div>
      ${invoice.users?.first_name || ''} ${invoice.users?.last_name || ''}<br>
      ${invoice.users?.email || ''}<br>
      ${invoice.billing_address ? JSON.stringify(invoice.billing_address) : ''}
    </div>
  </div>

  <div class="section">
    <table>
      <thead>
        <tr>
          <th>Description</th>
          <th class="text-right">Quantity</th>
          <th class="text-right">Unit Price</th>
          <th class="text-right">Total</th>
        </tr>
      </thead>
      <tbody>
        ${(invoice.items || []).map(
          (item) => `
        <tr>
          <td>${item.description || item.name || 'Item'}</td>
          <td class="text-right">${item.quantity || 1}</td>
          <td class="text-right">${invoice.currency} ${parseFloat(item.unit_price || item.price || 0).toFixed(2)}</td>
          <td class="text-right">${invoice.currency} ${parseFloat(item.total || item.quantity * (item.unit_price || item.price || 0)).toFixed(2)}</td>
        </tr>
        `
        ).join('')}
      </tbody>
      <tfoot>
        <tr>
          <td colspan="3" class="text-right"><strong>Subtotal:</strong></td>
          <td class="text-right">${invoice.currency} ${parseFloat(invoice.subtotal).toFixed(2)}</td>
        </tr>
        ${invoice.discount_amount > 0 ? `
        <tr>
          <td colspan="3" class="text-right"><strong>Discount:</strong></td>
          <td class="text-right">-${invoice.currency} ${parseFloat(invoice.discount_amount).toFixed(2)}</td>
        </tr>
        ` : ''}
        ${invoice.tax_amount > 0 ? `
        <tr>
          <td colspan="3" class="text-right"><strong>Tax (${(invoice.tax_rate * 100).toFixed(2)}%):</strong></td>
          <td class="text-right">${invoice.currency} ${parseFloat(invoice.tax_amount).toFixed(2)}</td>
        </tr>
        ` : ''}
        <tr class="total-row">
          <td colspan="3" class="text-right"><strong>Total:</strong></td>
          <td class="text-right">${invoice.currency} ${parseFloat(invoice.total_amount).toFixed(2)}</td>
        </tr>
      </tfoot>
    </table>
  </div>

  ${invoice.notes ? `
  <div class="section">
    <h3>Notes:</h3>
    <p>${invoice.notes}</p>
  </div>
  ` : ''}

  ${settings?.invoice_footer_text ? `
  <div class="footer">
    <p>${settings.invoice_footer_text}</p>
  </div>
  ` : ''}
</body>
</html>
  `
}

/**
 * Process pending invoice emails and send them
 * This function should be called periodically (via cron job or scheduled task)
 * or can be called manually via API endpoint
 */
const processPendingInvoiceEmails = async () => {
  try {
    // Get all pending email logs
    const { data: pendingEmails, error: fetchError } = await supabaseAdmin
      .from('invoice_email_logs')
      .select(`
        *,
        invoices (
          id,
          invoice_number,
          invoice_date,
          due_date,
          total_amount,
          currency,
          pdf_url,
          user_id,
          status
        )
      `)
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(50) // Process 50 at a time

    if (fetchError) {
      console.error('Error fetching pending emails:', fetchError)
      return { success: false, error: fetchError.message }
    }

    if (!pendingEmails || pendingEmails.length === 0) {
      return { success: true, processed: 0, message: 'No pending emails to process' }
    }

    let processed = 0
    let failed = 0
    const errors = []

    for (const emailLog of pendingEmails) {
      try {
        const invoice = emailLog.invoices
        if (!invoice) {
          // Update log as failed
          await supabaseAdmin
            .from('invoice_email_logs')
            .update({
              status: 'failed',
              error_message: 'Invoice not found',
              sent_at: new Date().toISOString(),
            })
            .eq('id', emailLog.id)
          failed++
          continue
        }

        // Get user email
        const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(invoice.user_id)
        const userEmail = authUser?.user?.email || emailLog.recipient_email

        if (!userEmail) {
          await supabaseAdmin
            .from('invoice_email_logs')
            .update({
              status: 'failed',
              error_message: 'User email not found',
              sent_at: new Date().toISOString(),
            })
            .eq('id', emailLog.id)
          failed++
          continue
        }

        // Get company name from invoice settings
        const { data: invoiceSettings } = await supabaseAdmin
          .from('invoice_settings')
          .select('company_name')
          .eq('is_active', true)
          .single()

        const companyName = invoiceSettings?.company_name || 'Outbond'

        // Generate invoice URL (adjust based on your frontend URL structure)
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3010'
        const invoiceUrl = `${frontendUrl}/invoices/${invoice.id}`

        // Format dates
        const invoiceDate = new Date(invoice.invoice_date).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
        const dueDate = invoice.due_date
          ? new Date(invoice.due_date).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })
          : null

        // Generate email template
        const template = invoiceEmailTemplate(
          invoice.invoice_number,
          invoiceDate,
          dueDate,
          invoice.total_amount,
          invoice.currency || 'USD',
          invoiceUrl,
          invoice.pdf_url,
          companyName
        )

        // Send email
        const emailResult = await sendEmail(userEmail, template.subject, template.html)

        if (emailResult.success) {
          // Update email log as sent
          await supabaseAdmin
            .from('invoice_email_logs')
            .update({
              status: 'sent',
              sent_at: new Date().toISOString(),
              email_provider: 'sendgrid',
              email_provider_message_id: emailResult.messageId,
            })
            .eq('id', emailLog.id)

          // Update invoice email_sent flag
          await supabaseAdmin
            .from('invoices')
            .update({
              email_sent: true,
              email_sent_at: new Date().toISOString(),
            })
            .eq('id', invoice.id)

          processed++
        } else {
          // Update email log as failed
          await supabaseAdmin
            .from('invoice_email_logs')
            .update({
              status: 'failed',
              error_message: emailResult.error || 'Failed to send email',
              sent_at: new Date().toISOString(),
            })
            .eq('id', emailLog.id)
          failed++
          errors.push(`Invoice ${invoice.invoice_number}: ${emailResult.error}`)
        }
      } catch (err) {
        console.error(`Error processing email log ${emailLog.id}:`, err)
        await supabaseAdmin
          .from('invoice_email_logs')
          .update({
            status: 'failed',
            error_message: err.message,
            sent_at: new Date().toISOString(),
          })
          .eq('id', emailLog.id)
        failed++
        errors.push(`Email log ${emailLog.id}: ${err.message}`)
      }
    }

    return {
      success: true,
      processed,
      failed,
      total: pendingEmails.length,
      errors: errors.length > 0 ? errors : undefined,
    }
  } catch (err) {
    console.error('Error processing pending invoice emails:', err)
    return { success: false, error: err.message }
  }
}

/**
 * POST /api/invoices/process-emails
 * Manually trigger processing of pending invoice emails
 * Requires admin authentication
 */
const processEmails = async (req, res) => {
  try {
    const result = await processPendingInvoiceEmails()

    if (result.success) {
      await logAdminActivity(req.admin.id, 'process_invoice_emails', {
        ip: req.ip,
        extra: {
          processed: result.processed,
          failed: result.failed,
          total: result.total,
        },
      })
    }

    res.json(result)
  } catch (err) {
    console.error('Process emails error:', err)
    res.status(500).json({ error: 'Failed to process emails' })
  }
}

/**
 * POST /api/invoices/:id/send-email
 * Manually send email for a specific invoice
 * Requires admin authentication
 */
const sendInvoiceEmail = async (req, res) => {
  try {
    const { id } = req.params

    // Get invoice
    const { data: invoice, error: invoiceError } = await supabaseAdmin
      .from('invoices')
      .select('*')
      .eq('id', id)
      .single()

    if (invoiceError || !invoice) {
      return res.status(404).json({ error: 'Invoice not found' })
    }

    // Get user email
    const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(invoice.user_id)
    const userEmail = authUser?.user?.email

    if (!userEmail) {
      return res.status(400).json({ error: 'User email not found' })
    }

    // Get company name from invoice settings
    const { data: invoiceSettings } = await supabaseAdmin
      .from('invoice_settings')
      .select('company_name')
      .eq('is_active', true)
      .single()

    const companyName = invoiceSettings?.company_name || 'Outbond'

    // Generate invoice URL
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3010'
    const invoiceUrl = `${frontendUrl}/invoices/${invoice.id}`

    // Format dates
    const invoiceDate = new Date(invoice.invoice_date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
    const dueDate = invoice.due_date
      ? new Date(invoice.due_date).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      : null

    // Generate email template
    const template = invoiceEmailTemplate(
      invoice.invoice_number,
      invoiceDate,
      dueDate,
      invoice.total_amount,
      invoice.currency || 'USD',
      invoiceUrl,
      invoice.pdf_url,
      companyName
    )

    // Send email
    const emailResult = await sendEmail(userEmail, template.subject, template.html)

    if (emailResult.success) {
      // Create or update email log
      const { data: existingLog } = await supabaseAdmin
        .from('invoice_email_logs')
        .select('id')
        .eq('invoice_id', invoice.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (existingLog) {
        // Update existing log
        await supabaseAdmin
          .from('invoice_email_logs')
          .update({
            status: 'sent',
            sent_at: new Date().toISOString(),
            email_provider: 'sendgrid',
            email_provider_message_id: emailResult.messageId,
          })
          .eq('id', existingLog.id)
      } else {
        // Create new log
        await supabaseAdmin.from('invoice_email_logs').insert({
          invoice_id: invoice.id,
          user_id: invoice.user_id,
          recipient_email: userEmail,
          email_type: 'invoice',
          status: 'sent',
          sent_at: new Date().toISOString(),
          email_provider: 'sendgrid',
          email_provider_message_id: emailResult.messageId,
        })
      }

      // Update invoice email_sent flag
      await supabaseAdmin
        .from('invoices')
        .update({
          email_sent: true,
          email_sent_at: new Date().toISOString(),
        })
        .eq('id', invoice.id)

      await logAdminActivity(req.admin.id, 'send_invoice_email', {
        target_type: 'invoice',
        target_id: invoice.id,
        ip: req.ip,
        extra: {
          invoice_number: invoice.invoice_number,
          recipient: userEmail,
        },
      })

      res.json({
        success: true,
        message: 'Invoice email sent successfully',
        messageId: emailResult.messageId,
      })
    } else {
      res.status(500).json({
        success: false,
        error: emailResult.error || 'Failed to send email',
      })
    }
  } catch (err) {
    console.error('Send invoice email error:', err)
    res.status(500).json({ error: 'Failed to send invoice email' })
  }
}

module.exports = {
  // Invoice CRUD
  listInvoices,
  getInvoice,
  createInvoice,
  updateInvoice,
  deleteInvoice,
  downloadInvoice,
  // Email operations
  processPendingInvoiceEmails,
  processEmails,
  sendInvoiceEmail,
}
