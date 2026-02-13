# Testing Guide for New Tables Implementation

## Overview

This guide provides step-by-step instructions for testing all the newly implemented features across all phases.

## Prerequisites

1. **Database Migrations**: Run all migration files in Supabase SQL Editor in this order:
   - `existing-tables-migration.sql`
   - `user-auth-tables-migration.sql`
   - `scheduling-system-migration.sql`
   - `knowledge-base-migration.sql`
   - `billing-extensions-migration.sql`
   - `communication-system-migration.sql`

2. **Backend Server**: Ensure backend is running on `http://localhost:3020`
3. **Frontend Server**: Ensure frontend is running on `http://localhost:3010`
4. **Admin Access**: Login as super_admin

## Phase 1: Existing Tables Migration

### Test Steps:
1. Verify all 15 tables exist in Supabase Dashboard
2. Check that foreign key constraints are properly set
3. Verify RLS policies are enabled
4. Test that existing functionality still works

**Expected Result**: All existing features continue to work without issues.

## Phase 2: User Authentication & Security

### URLs to Test:
- `/admin/users/deactivations` - Account Deactivation Requests
- `/admin/users/emails` - User Email Management
- `/admin/security/tokens` - Verification Tokens
- `/admin/security/2fa` - Two-Factor Authentication Management

### Test Cases:

#### Account Deactivations
1. Navigate to Account Deactivations page
2. View list of pending requests
3. Test approve action (should update status to 'completed')
4. Test reject action (should update status to 'cancelled')
5. Verify user profile status changes when approved

#### User Emails
1. Navigate to User Emails page
2. View list of all user emails
3. Filter by primary/secondary and verified/unverified
4. Test verify email action (super_admin only)
5. Verify email status updates correctly

#### Verification Tokens
1. Navigate to Verification Tokens page
2. Switch between Email and Phone tabs
3. Filter by status (active, expired, used, unused)
4. Test revoke token action (super_admin only)
5. Verify token is marked as used

#### Two-Factor Management
1. Navigate to 2FA Management page
2. View users with 2FA enabled
3. Filter by enabled status and method
4. Test disable 2FA action (super_admin only)
5. Verify 2FA is disabled for user

## Phase 3: Scheduling System

### URLs to Test:
- `/admin/scheduling/schedules` - Call Schedules
- `/admin/scheduling/holidays` - Holiday Calendar

### Test Cases:

#### Call Schedules
1. Navigate to Call Schedules page
2. View list of schedules
3. Create new schedule (super_admin/ops only)
4. Edit existing schedule
5. Delete schedule (soft delete)
6. Verify schedule details include availability and overrides

#### Holidays
1. Navigate to Holidays page
2. View list of holidays (global and user-specific)
3. Create new holiday (super_admin/ops only)
4. Edit holiday details
5. Delete holiday (soft delete)
6. Filter by active status and recurring type

## Phase 4: Knowledge Base

### URLs to Test:
- `/admin/knowledge/bases` - Knowledge Bases

### Test Cases:

1. Navigate to Knowledge Bases page
2. View list with document and FAQ counts
3. Create new knowledge base (super_admin/ops only)
4. Edit knowledge base details
5. Add documents to knowledge base
6. Add FAQs to knowledge base
7. Delete knowledge base (soft delete)
8. Verify documents and FAQs are properly linked

## Phase 5: Billing Extensions

### URLs to Test:
- `/admin/billing/transactions` - Credit Transactions
- `/admin/billing/tax-config` - Tax Configuration

### Test Cases:

#### Credit Transactions
1. Navigate to Credit Transactions page
2. View transaction history
3. Filter by transaction type, date range, and user
4. Export transactions to CSV
5. Verify transaction details show correct balances

#### Tax Configuration
1. Navigate to Tax Configuration page
2. View list of tax rates
3. Create new tax configuration (super_admin/finance only)
4. Edit tax rate details
5. Set default tax rate (should unset other defaults)
6. Delete tax configuration
7. Verify country/state-specific rates work correctly

## Phase 6: Communication System

### URLs to Test:
- `/admin/communication/prompts` - AI Prompts
- `/admin/communication/emails` - Email Logs
- `/admin/communication/templates` - Email Templates

### Test Cases:

#### AI Prompts
1. Navigate to AI Prompts page
2. View list of prompts
3. Filter by category, status, and template type
4. Create new prompt (super_admin/ops only)
5. Edit prompt details
6. Delete prompt (soft delete)
7. Verify prompt usage count updates

#### Email Logs
1. Navigate to Email Logs page
2. View email sending history
3. Filter by status, date range, and recipient
4. View email details (subject, body, status)
5. Verify error messages are displayed for failed emails

#### Email Templates
1. Navigate to Email Templates page
2. View list of templates
3. Create new template (super_admin/ops only)
4. Edit template (HTML body, styling)
5. Preview template
6. Set default template (should unset other defaults)
7. Delete template (soft delete)

## API Endpoint Testing

Use Postman or Thunder Client to test all endpoints:

### User Auth Endpoints:
```
GET    /api/account-deactivations
GET    /api/account-deactivations/:id
POST   /api/account-deactivations/:id/approve
POST   /api/account-deactivations/:id/reject
GET    /api/verification-tokens/email
GET    /api/verification-tokens/phone
POST   /api/verification-tokens/:id/revoke
GET    /api/password-history/:user_id
GET    /api/2fa/users
POST   /api/2fa/:user_id/disable
GET    /api/user-emails
POST   /api/user-emails/:id/verify
```

### Scheduling Endpoints:
```
GET    /api/call-schedules
GET    /api/call-schedules/:id
POST   /api/call-schedules
PUT    /api/call-schedules/:id
DELETE /api/call-schedules/:id
GET    /api/holidays
GET    /api/holidays/:id
POST   /api/holidays
PUT    /api/holidays/:id
DELETE /api/holidays/:id
GET    /api/agent-schedules
POST   /api/agent-schedules
DELETE /api/agent-schedules/:id
```

### Knowledge Base Endpoints:
```
GET    /api/knowledge-bases
GET    /api/knowledge-bases/:id
POST   /api/knowledge-bases
PUT    /api/knowledge-bases/:id
DELETE /api/knowledge-bases/:id
POST   /api/knowledge-bases/:id/documents
DELETE /api/knowledge-bases/documents/:id
POST   /api/knowledge-bases/:id/faqs
PUT    /api/knowledge-bases/faqs/:id
DELETE /api/knowledge-bases/faqs/:id
```

### Billing Endpoints:
```
GET    /api/tax-configuration
GET    /api/tax-configuration/:id
POST   /api/tax-configuration
PUT    /api/tax-configuration/:id
DELETE /api/tax-configuration/:id
```

### Communication Endpoints:
```
GET    /api/ai-prompts
GET    /api/ai-prompts/:id
POST   /api/ai-prompts
PUT    /api/ai-prompts/:id
DELETE /api/ai-prompts/:id
GET    /api/email-logs
GET    /api/email-logs/:id
GET    /api/email-templates
GET    /api/email-templates/:id
POST   /api/email-templates
PUT    /api/email-templates/:id
DELETE /api/email-templates/:id
```

## Database Verification

### Check in Supabase Dashboard:
1. All tables are created
2. Foreign key relationships are correct
3. Indexes are created
4. RLS policies are enabled
5. Triggers are working (updated_at timestamps)

### SQL Queries to Verify:
```sql
-- Check table counts
SELECT COUNT(*) FROM account_deactivation_requests;
SELECT COUNT(*) FROM email_verification_tokens;
SELECT COUNT(*) FROM phone_verification_tokens;
SELECT COUNT(*) FROM user_2fa;
SELECT COUNT(*) FROM user_emails;
SELECT COUNT(*) FROM call_schedules;
SELECT COUNT(*) FROM holidays;
SELECT COUNT(*) FROM knowledge_bases;
SELECT COUNT(*) FROM tax_configuration;
SELECT COUNT(*) FROM ai_prompts;
SELECT COUNT(*) FROM email_logs;
SELECT COUNT(*) FROM email_templates;

-- Check foreign keys
SELECT 
  tc.table_name, 
  kcu.column_name, 
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
  AND tc.table_name IN (
    'account_deactivation_requests',
    'call_schedules',
    'knowledge_bases',
    'tax_configuration',
    'ai_prompts',
    'email_logs',
    'email_templates'
  );
```

## Common Issues & Solutions

### Issue: Tables not found
**Solution**: Run migration files in Supabase SQL Editor

### Issue: Foreign key constraint errors
**Solution**: Ensure referenced tables exist and have data

### Issue: RLS blocking queries
**Solution**: Check RLS policies are configured correctly

### Issue: API returns 401 Unauthorized
**Solution**: Verify authentication token is valid and admin role has permissions

### Issue: Frontend routes not working
**Solution**: Check routes.js includes all new routes and navigation is updated

## Success Criteria

✅ All migration files run without errors
✅ All tables are created with correct structure
✅ All API endpoints return expected responses
✅ All frontend pages load and display data correctly
✅ CRUD operations work for all new features
✅ Filters and search work correctly
✅ Role-based access control is enforced
✅ Soft deletes work correctly
✅ Foreign key relationships are maintained

## Notes

- All timestamps use `timestamp with time zone`
- All UUIDs use `gen_random_uuid()` or `uuid_generate_v4()`
- Soft deletes use `deleted_at` column
- RLS policies should be configured separately for production
- Some features require specific admin roles (super_admin, finance, ops, support)
