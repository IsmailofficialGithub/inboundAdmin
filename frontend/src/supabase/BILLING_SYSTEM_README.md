# Billing, Invoices & Payments System

This document explains the complete billing system implementation, including automatic invoice email sending.

## Database Tables

### Core Tables

1. **`invoice_settings`** - Company information, tax/VAT settings, invoice numbering sequence
2. **`invoices`** - Main invoices table with all invoice details
3. **`payment_history`** - Tracks all payments and subscription renewals
4. **`refund_dispute_notes`** - Tracks refunds and disputes (even for external payments)
5. **`coupon_codes`** - Discount codes (percentage/fixed, expiry, usage limits)
6. **`coupon_usage`** - Tracks which users have used which coupons
7. **`invoice_email_logs`** - Tracks invoice email delivery attempts and status

## Automatic Invoice Email Sending

### How It Works

When an invoice is created or its status changes to `'sent'`, a database trigger automatically:

1. **Creates an email log entry** in `invoice_email_logs` with status `'pending'`
2. **Retrieves the user's email** from `auth.users`
3. **Queues the email** for processing

### Database Triggers

The system includes two triggers:

1. **`trigger_invoice_email_on_insert`** - Fires when an invoice is created with status `'sent'`
2. **`trigger_invoice_email_on_update`** - Fires when invoice status changes from any status to `'sent'`

Both triggers call the function `trigger_invoice_email_on_sent()` which creates the email log entry.

### Processing Pending Emails

There are two ways to process and send pending invoice emails:

#### Option 1: Manual API Call (Recommended for Testing)

```bash
POST /api/invoices/process-emails
Authorization: Bearer <admin_token>
```

This endpoint:
- Fetches all pending email logs (up to 50 at a time)
- Sends emails using the configured email service (SendGrid)
- Updates email logs with success/failure status
- Updates invoice `email_sent` and `email_sent_at` fields

#### Option 2: Automated Cron Job (Recommended for Production)

Set up a cron job to call the processing endpoint periodically:

```bash
# Run every 5 minutes
*/5 * * * * curl -X POST https://your-api.com/api/invoices/process-emails \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

Or use a Node.js cron job:

```javascript
const cron = require('node-cron')
const { processPendingInvoiceEmails } = require('./controllers/invoiceController')

// Run every 5 minutes
cron.schedule('*/5 * * * *', async () => {
  console.log('Processing pending invoice emails...')
  const result = await processPendingInvoiceEmails()
  console.log('Processed:', result)
})
```

### Manual Email Sending

To manually send an email for a specific invoice:

```bash
POST /api/invoices/:invoiceId/send-email
Authorization: Bearer <admin_token>
```

This bypasses the queue and sends the email immediately.

## Email Template

The invoice email template includes:
- Invoice number and date
- Due date (if applicable)
- Total amount with currency
- Links to view invoice online
- Download PDF link (if PDF is generated)
- Company branding

## Setup Instructions

### 1. Run the Migration

Execute the SQL migration file in Supabase SQL Editor:

```sql
-- Run: frontend/src/supabase/billing-system-migration.sql
```

### 2. Configure Invoice Settings

Insert your company information:

```sql
INSERT INTO public.invoice_settings (
  company_name,
  company_address,
  company_email,
  company_phone,
  invoice_number_prefix,
  invoice_number_sequence,
  default_tax_rate,
  default_currency,
  is_active
) VALUES (
  'Your Company Name',
  '{"street": "123 Main St", "city": "City", "state": "State", "zip": "12345", "country": "Country"}'::jsonb,
  'billing@yourcompany.com',
  '+1-234-567-8900',
  'INV',
  0,
  0.00,
  'USD',
  true
);
```

### 3. Configure Email Service

Ensure your `.env` file has email configuration:

```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=your_sendgrid_api_key
EMAIL_FROM=noreply@yourdomain.com
FRONTEND_URL=https://your-frontend-url.com
```

### 4. Set Up Automated Processing (Optional)

For production, set up a cron job or scheduled task to process pending emails every 5-10 minutes.

## API Endpoints

### Process Pending Emails
- **POST** `/api/invoices/process-emails`
- **Auth:** Admin (super_admin, finance)
- **Description:** Processes all pending invoice emails and sends them

### Send Invoice Email
- **POST** `/api/invoices/:id/send-email`
- **Auth:** Admin (super_admin, finance, support)
- **Description:** Manually sends email for a specific invoice

## Email Log Status

Email logs can have the following statuses:
- `pending` - Email is queued for sending
- `sent` - Email was successfully sent
- `delivered` - Email was delivered (if tracking is enabled)
- `failed` - Email sending failed
- `bounced` - Email bounced back

## Notes

1. **Foreign Keys**: The migration includes commented foreign keys to `purchases` and `user_subscriptions` tables. Uncomment them when those tables are created.

2. **RLS Policies**: Row Level Security is enabled on all tables. Users can read their own data, admins can manage all data.

3. **Invoice Number Generation**: The `generate_invoice_number()` function automatically generates invoice numbers based on settings. Format: `PREFIX-YYYYMMDD-000001`

4. **Email Delivery**: The system logs all email attempts. Check `invoice_email_logs` table for delivery status and any errors.

## Troubleshooting

### Emails Not Sending

1. Check `invoice_email_logs` table for error messages
2. Verify email service configuration (SMTP settings)
3. Ensure user email exists in `auth.users`
4. Check that invoice status is `'sent'`

### Email Logs Not Created

1. Verify triggers are created: `SELECT * FROM pg_trigger WHERE tgname LIKE '%invoice_email%'`
2. Check that invoice status is `'sent'` when created/updated
3. Verify user email exists in `auth.users`

### Processing Errors

1. Check backend logs for detailed error messages
2. Verify email service credentials
3. Ensure `FRONTEND_URL` is set correctly for invoice links
