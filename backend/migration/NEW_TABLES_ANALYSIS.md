# New Tables Analysis

## Tables in Provided Schema That Are NOT in Migration Files

Based on comparison between your provided schema and existing migration files, here are the tables that appear to be **NEW** or not yet migrated:

### 🔴 Core User & Authentication Tables (Not in Migrations)

1. **`account_deactivation_requests`** ⚠️ **NEW**
   - Purpose: Tracks user account deactivation requests
   - Status: Not found in any migration file
   - Columns: `id`, `user_id`, `reason`, `scheduled_deletion_at`, `status`, `created_at`, `completed_at`

2. **`email_verification_tokens`** ⚠️ **NEW**
   - Purpose: Email verification token management
   - Status: Not found in any migration file
   - Columns: `id`, `user_id`, `email`, `token`, `token_hash`, `purpose`, `expires_at`, `used_at`, `attempts`, `max_attempts`, `created_at`

3. **`phone_verification_tokens`** ⚠️ **NEW**
   - Purpose: Phone verification token management
   - Status: Not found in any migration file
   - Columns: `id`, `user_id`, `phone_number`, `country_code`, `token`, `token_hash`, `expires_at`, `used_at`, `attempts`, `max_attempts`, `created_at`

4. **`password_history`** ⚠️ **NEW**
   - Purpose: Stores password history for security
   - Status: Not found in any migration file
   - Columns: `id`, `user_id`, `password_hash`, `created_at`

5. **`login_activity`** ⚠️ **NEW**
   - Purpose: Tracks user login sessions and activity
   - Status: Not found in any migration file
   - Columns: `id`, `user_id`, `session_id`, `ip_address`, `user_agent`, `device_type`, `device_name`, `browser_name`, `os_name`, `location_country`, `location_city`, `login_method`, `success`, `failure_reason`, `login_at`, `logout_at`, `expires_at`, `is_active`

6. **`security_events`** ⚠️ **NEW**
   - Purpose: Security event logging
   - Status: Not found in any migration file
   - Columns: `id`, `user_id`, `event_type`, `severity`, `ip_address`, `user_agent`, `details`, `created_at`

7. **`notifications`** ⚠️ **NEW**
   - Purpose: User notification system
   - Status: Not found in any migration file
   - Columns: `id`, `user_id`, `type`, `title`, `message`, `email_sent`, `email_sent_at`, `read_at`, `metadata`, `created_at`

8. **`user_2fa`** ⚠️ **NEW**
   - Purpose: Two-factor authentication settings
   - Status: Not found in any migration file
   - Columns: `id`, `user_id`, `enabled`, `method`, `secret_key`, `backup_codes`, `phone_number`, `verified`, `created_at`, `updated_at`, `last_used_at`

9. **`user_credits`** ⚠️ **NEW**
   - Purpose: User credit balance management
   - Status: Not found in any migration file (but referenced in code)
   - Columns: `id`, `user_id`, `balance`, `total_purchased`, `total_used`, `low_credit_threshold`, `low_credit_notified`, `auto_topup_enabled`, `auto_topup_amount`, `auto_topup_threshold`, `services_paused`, `created_at`, `updated_at`, `last_topup_at`

10. **`user_emails`** ⚠️ **NEW**
    - Purpose: Additional email addresses for users
    - Status: Not found in any migration file
    - Columns: `id`, `user_id`, `email`, `name`, `smtp_password`, `is_primary`, `is_verified`, `created_at`, `updated_at`, `deleted_at`

11. **`user_profiles`** ⚠️ **NEW**
    - Purpose: User profile information
    - Status: Not found in any migration file (but referenced in code and migration-separate-users.sql)
    - Columns: Many columns including KYC fields, company info, etc.

12. **`user_subscriptions`** ⚠️ **NEW**
    - Purpose: User subscription management
    - Status: Not found in any migration file (but referenced in code)
    - Columns: `id`, `user_id`, `package_id`, `status`, `billing_cycle`, `current_period_start`, `current_period_end`, `auto_renew`, `cancel_at_period_end`, `payment_method_id`, `last_payment_date`, `next_billing_date`, `created_at`, `updated_at`, `canceled_at`, `metadata`

13. **`kyc_verifications`** ⚠️ **NEW**
    - Purpose: KYC document verification
    - Status: Not found in any migration file
    - Columns: `id`, `user_id`, `document_type`, `document_front_url`, `document_back_url`, `selfie_url`, `status`, `rejection_reason`, `verified_by`, `verified_at`, `created_at`, `updated_at`

---

### 🟡 Voice Agent & Call Management Tables (Not in Migrations)

14. **`voice_agents`** ⚠️ **NEW**
    - Purpose: AI voice agent configuration
    - Status: Not found in any migration file (but heavily referenced in code)
    - Columns: Many columns including `name`, `goal`, `background`, `welcome_message`, `voice`, `tone`, `model`, `phone_number`, `status`, etc.

15. **`agent_calls`** ⚠️ **NEW**
    - Purpose: Individual agent call records
    - Status: Not found in any migration file
    - Columns: `id`, `agent_id`, `user_id`, `caller_number`, `called_number`, `direction`, `status`, `duration`, `recording_url`, `transcript`, `provider`, `provider_call_id`, `started_at`, `answered_at`, `ended_at`, `created_at`, `metadata`

16. **`agent_analytics`** ⚠️ **NEW**
    - Purpose: Agent performance analytics
    - Status: Not found in any migration file
    - Columns: `id`, `agent_id`, `user_id`, `date`, `period`, `total_calls`, `answered_calls`, `missed_calls`, `total_duration`, `average_duration`, `conversions`, `conversion_rate`, `created_at`, `updated_at`

17. **`agent_schedules`** ⚠️ **NEW**
    - Purpose: Agent schedule assignments
    - Status: Not found in any migration file
    - Columns: `id`, `agent_id`, `schedule_id`, `created_at`

18. **`call_history`** ⚠️ **NEW**
    - Purpose: Main call history table
    - Status: Not found in any migration file (but heavily referenced in code)
    - Columns: `id`, `user_id`, `agent_id`, `inbound_number_id`, `caller_number`, `called_number`, `call_status`, `call_duration`, `call_start_time`, `call_end_time`, `call_answered_time`, `recording_url`, `transcript`, `call_forwarded_to`, `call_cost`, `notes`, `created_at`, `updated_at`, `deleted_at`, `metadata`, `is_lead`

19. **`call_recordings`** ⚠️ **NEW**
    - Purpose: Call recording storage
    - Status: Not found in any migration file (but referenced in code)
    - Columns: `id`, `call_history_id`, `user_id`, `recording_url`, `recording_duration`, `file_size_bytes`, `file_format`, `storage_provider`, `storage_path`, `transcript_available`, `transcript_url`, `speaker_separated`, `created_at`, `updated_at`, `deleted_at`, `metadata`

20. **`call_analytics`** ⚠️ **NEW**
    - Purpose: Call analytics aggregation
    - Status: Not found in any migration file
    - Columns: `id`, `user_id`, `agent_id`, `date`, `hour`, `total_calls`, `answered_calls`, `missed_calls`, `forwarded_calls`, `failed_calls`, `total_duration_seconds`, `average_duration_seconds`, `min_duration_seconds`, `max_duration_seconds`, `total_cost`, `average_cost`, `average_quality_score`, `created_at`, `updated_at`

21. **`call_schedules`** ⚠️ **NEW**
    - Purpose: Call schedule configuration
    - Status: Not found in any migration file
    - Columns: `id`, `user_id`, `agent_id`, `schedule_name`, `timezone`, `is_active`, `created_at`, `updated_at`, `deleted_at`

22. **`weekly_availability`** ⚠️ **NEW**
    - Purpose: Weekly availability schedule
    - Status: Not found in any migration file
    - Columns: `id`, `schedule_id`, `day_of_week`, `is_available`, `start_time`, `end_time`, `break_start_time`, `break_end_time`, `created_at`, `updated_at`

23. **`schedule_overrides`** ⚠️ **NEW**
    - Purpose: Schedule override exceptions
    - Status: Not found in any migration file
    - Columns: `id`, `schedule_id`, `override_date`, `is_available`, `start_time`, `end_time`, `override_reason`, `message_text`, `created_at`, `updated_at`

24. **`after_hours_messages`** ⚠️ **NEW**
    - Purpose: After-hours message configuration
    - Status: Not found in any migration file
    - Columns: `id`, `schedule_id`, `message_text`, `message_type`, `redirect_phone_number`, `callback_enabled`, `is_active`, `created_at`, `updated_at`

25. **`holidays`** ⚠️ **NEW**
    - Purpose: Holiday calendar
    - Status: Not found in any migration file
    - Columns: `id`, `user_id`, `holiday_name`, `holiday_date`, `is_recurring`, `is_active`, `created_at`, `updated_at`, `deleted_at`

26. **`holiday_messages`** ⚠️ **NEW**
    - Purpose: Holiday-specific messages
    - Status: Not found in any migration file
    - Columns: `id`, `holiday_id`, `message_text`, `message_type`, `redirect_phone_number`, `is_active`, `created_at`, `updated_at`

27. **`inbound_numbers`** ⚠️ **NEW**
    - Purpose: Inbound phone number management
    - Status: Not found in any migration file
    - Columns: Many columns including provider configs, health status, webhook settings, etc.

---

### 🟢 Billing & Payment Tables (Not in Migrations)

28. **`purchases`** ⚠️ **NEW**
    - Purpose: Purchase transaction records
    - Status: Not found in any migration file (but referenced in invoices table)
    - Columns: `id`, `user_id`, `purchase_type`, `amount`, `currency`, `credits_amount`, `credits_rate`, `payment_status`, `payment_method`, `payment_provider_id`, `payment_provider_response`, `subtotal`, `tax_rate`, `tax_amount`, `total_amount`, `created_at`, `completed_at`, `metadata`

29. **`credit_transactions`** ⚠️ **NEW**
    - Purpose: Credit transaction history
    - Status: Not found in any migration file
    - Columns: `id`, `user_id`, `transaction_type`, `amount`, `agent_id`, `call_id`, `call_duration_seconds`, `credits_per_minute`, `purchase_id`, `balance_before`, `balance_after`, `description`, `created_at`, `metadata`

30. **`subscription_packages`** ⚠️ **NEW**
    - Purpose: Subscription package definitions (different from `packages`?)
    - Status: Not found in any migration file
    - Columns: `id`, `package_name`, `package_code`, `description`, `monthly_price`, `currency`, `max_agents`, `max_inbound_numbers`, `monthly_call_minutes`, `monthly_credits`, `features`, `is_active`, `is_featured`, `created_at`, `updated_at`, `deleted_at`

31. **`tax_configuration`** ⚠️ **NEW**
    - Purpose: Tax rate configuration by location
    - Status: Not found in any migration file
    - Columns: `id`, `country_code`, `state_code`, `tax_name`, `tax_rate`, `is_default`, `is_active`, `created_at`, `updated_at`

---

### 🔵 Knowledge Base & AI Tables (Not in Migrations)

32. **`ai_prompts`** ⚠️ **NEW**
    - Purpose: AI prompt templates
    - Status: Not found in any migration file
    - Columns: `id`, `user_id`, `name`, `category`, `system_prompt`, `begin_message`, `agent_profile`, `state_prompts`, `tools_config`, `call_type`, `call_goal`, `tone`, `status`, `is_active`, `is_template`, `usage_count`, `welcome_messages`, `created_at`, `updated_at`, `deleted_at`

33. **`knowledge_bases`** ⚠️ **NEW**
    - Purpose: Knowledge base containers
    - Status: Not found in any migration file
    - Columns: `id`, `user_id`, `name`, `description`, `status`, `created_at`, `updated_at`, `deleted_at`, `metadata`

34. **`knowledge_base_documents`** ⚠️ **NEW**
    - Purpose: Knowledge base document storage
    - Status: Not found in any migration file
    - Columns: `id`, `knowledge_base_id`, `name`, `file_type`, `file_url`, `file_size`, `storage_path`, `description`, `uploaded_at`, `created_at`, `updated_at`, `deleted_at`

35. **`knowledge_base_faqs`** ⚠️ **NEW**
    - Purpose: Knowledge base FAQ entries
    - Status: Not found in any migration file
    - Columns: `id`, `knowledge_base_id`, `question`, `answer`, `category`, `priority`, `created_at`, `updated_at`, `deleted_at`, `display_order`

---

### 🟣 Email & Communication Tables (Not in Migrations)

36. **`email_logs`** ⚠️ **NEW**
    - Purpose: Email sending logs
    - Status: Not found in any migration file
    - Columns: `id`, `user_id`, `from_email`, `to_email`, `to_phone_number`, `subject`, `body`, `status`, `sent_at`, `error_message`, `created_at`, `updated_at`, `deleted_at`

37. **`email_templates`** ⚠️ **NEW**
    - Purpose: Email template management
    - Status: Not found in any migration file
    - Columns: `id`, `user_id`, `name`, `subject`, `body`, `description`, `is_default`, `accent_color`, `design_style`, `company_name`, `created_at`, `updated_at`, `deleted_at`

---

## Summary

### Total New Tables: **37 tables**

These tables are in your provided schema but **NOT found in any migration files**. This means:

1. ✅ They may already exist in your database (created manually or via other means)
2. ⚠️ They may need to be created via new migration files
3. 🔍 They are referenced in code but migration files may be missing

### Action Items

1. **Verify Database State**: Check if these tables already exist in your database
2. **Create Migration Files**: If tables don't exist, create migration files for them
3. **Document Dependencies**: Ensure foreign key relationships are properly documented
4. **Test Relationships**: Verify all foreign keys work correctly

### Tables Referenced in Code But Missing Migrations

These tables are **actively used in code** but don't have migration files:
- `user_profiles` - Used extensively
- `user_credits` - Used in creditsController.js
- `user_subscriptions` - Used in subscriptionsController.js
- `voice_agents` - Used extensively
- `call_history` - Used in callsController.js
- `call_recordings` - Used in callsController.js
- `purchases` - Referenced in invoices table

**Recommendation**: Create migration files for these critical tables to ensure proper version control and deployment consistency.
