-- ============================================================
-- EXISTING TABLES MIGRATION
-- Migration file for tables that already exist in database
-- but need migration files for version control
-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- Note: gen_random_uuid() is available by default in PostgreSQL 13+ and Supabase
-- No extension needed for UUID generation

-- ============================================================
-- HELPER FUNCTION (if not exists)
-- ============================================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ============================================================
-- USER PROFILES TABLE
-- User profile information with KYC and company fields
-- ============================================================

CREATE TABLE IF NOT EXISTS public.user_profiles (
  id uuid NOT NULL,
  first_name character varying,
  last_name character varying,
  phone character varying,
  country_code character varying DEFAULT '+1'::character varying,
  avatar_url text,
  bio text,
  date_of_birth date,
  account_status character varying DEFAULT 'active'::character varying CHECK (account_status::text = ANY (ARRAY['active'::character varying, 'inactive'::character varying, 'suspended'::character varying, 'deleted'::character varying]::text[])),
  email_verified boolean DEFAULT false,
  phone_verified boolean DEFAULT false,
  last_login_at timestamp with time zone,
  last_active_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  deleted_at timestamp with time zone,
  metadata jsonb DEFAULT '{}'::jsonb,
  company_name character varying,
  company_registration_number character varying,
  company_address text,
  company_website character varying,
  company_tax_id character varying,
  kyc_status character varying DEFAULT 'pending'::character varying CHECK (kyc_status::text = ANY (ARRAY['pending'::character varying, 'under_review'::character varying, 'approved'::character varying, 'rejected'::character varying, 'needs_info'::character varying]::text[])),
  kyc_verified_at timestamp with time zone,
  kyc_verified_by uuid,
  kyc_rejection_reason text,
  CONSTRAINT user_profiles_pkey PRIMARY KEY (id),
  CONSTRAINT user_profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id),
  CONSTRAINT user_profiles_kyc_verified_by_fkey FOREIGN KEY (kyc_verified_by) REFERENCES public.admin_profiles(id)
);

CREATE INDEX IF NOT EXISTS idx_user_profiles_account_status ON public.user_profiles USING btree (account_status);
CREATE INDEX IF NOT EXISTS idx_user_profiles_kyc_status ON public.user_profiles USING btree (kyc_status);
CREATE INDEX IF NOT EXISTS idx_user_profiles_created_at ON public.user_profiles USING btree (created_at DESC);

DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON public.user_profiles;
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- USER CREDITS TABLE
-- User credit balance management with auto-topup features
-- ============================================================

CREATE TABLE IF NOT EXISTS public.user_credits (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL UNIQUE,
  balance numeric NOT NULL DEFAULT 0,
  total_purchased numeric NOT NULL DEFAULT 0,
  total_used numeric NOT NULL DEFAULT 0,
  low_credit_threshold numeric DEFAULT 10.00,
  low_credit_notified boolean DEFAULT false,
  auto_topup_enabled boolean DEFAULT false,
  auto_topup_amount numeric,
  auto_topup_threshold numeric,
  services_paused boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  last_topup_at timestamp with time zone,
  CONSTRAINT user_credits_pkey PRIMARY KEY (id),
  CONSTRAINT user_credits_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_user_credits_user_id ON public.user_credits USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_user_credits_balance ON public.user_credits USING btree (balance);

DROP TRIGGER IF EXISTS update_user_credits_updated_at ON public.user_credits;
CREATE TRIGGER update_user_credits_updated_at
  BEFORE UPDATE ON public.user_credits
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- USER SUBSCRIPTIONS TABLE
-- User subscription management with billing cycles
-- ============================================================

CREATE TABLE IF NOT EXISTS public.user_subscriptions (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  package_id uuid NOT NULL,
  status character varying NOT NULL DEFAULT 'active'::character varying CHECK (status::text = ANY (ARRAY['active'::character varying, 'canceled'::character varying, 'expired'::character varying, 'suspended'::character varying, 'pending'::character varying]::text[])),
  billing_cycle character varying DEFAULT 'monthly'::character varying CHECK (billing_cycle::text = ANY (ARRAY['monthly'::character varying, 'yearly'::character varying]::text[])),
  current_period_start timestamp with time zone NOT NULL,
  current_period_end timestamp with time zone NOT NULL,
  auto_renew boolean DEFAULT true,
  cancel_at_period_end boolean DEFAULT false,
  payment_method_id character varying,
  last_payment_date timestamp with time zone,
  next_billing_date timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  canceled_at timestamp with time zone,
  metadata jsonb DEFAULT '{}'::jsonb,
  CONSTRAINT user_subscriptions_pkey PRIMARY KEY (id),
  CONSTRAINT user_subscriptions_package_id_fkey FOREIGN KEY (package_id) REFERENCES public.packages(id),
  CONSTRAINT user_subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON public.user_subscriptions USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_package_id ON public.user_subscriptions USING btree (package_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON public.user_subscriptions USING btree (status);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_next_billing ON public.user_subscriptions USING btree (next_billing_date);

DROP TRIGGER IF EXISTS update_user_subscriptions_updated_at ON public.user_subscriptions;
CREATE TRIGGER update_user_subscriptions_updated_at
  BEFORE UPDATE ON public.user_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- VOICE AGENTS TABLE
-- AI voice agent configuration with full provider configs
-- ============================================================

CREATE TABLE IF NOT EXISTS public.voice_agents (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  name character varying NOT NULL,
  company_name character varying,
  website_url text,
  goal text NOT NULL,
  background text NOT NULL,
  welcome_message text NOT NULL,
  instruction_voice text NOT NULL,
  script text NOT NULL,
  voice character varying DEFAULT 'aura-helena-en'::character varying,
  tone character varying DEFAULT 'professional'::character varying,
  model character varying DEFAULT 'gpt-4o'::character varying,
  background_noise character varying DEFAULT 'office'::character varying,
  language character varying DEFAULT 'en-US'::character varying,
  agent_type character varying CHECK (agent_type::text = ANY (ARRAY['sales'::character varying, 'support'::character varying, 'booking'::character varying, 'general'::character varying]::text[])),
  tool character varying CHECK (tool::text = ANY (ARRAY['calendar'::character varying, 'crm'::character varying, 'email'::character varying, 'sms'::character varying]::text[])),
  timezone character varying,
  phone_provider character varying CHECK (phone_provider::text = ANY (ARRAY['twilio'::character varying, 'vonage'::character varying, 'telnyx'::character varying]::text[])),
  phone_number character varying NOT NULL,
  phone_label character varying,
  twilio_sid character varying,
  twilio_auth_token text,
  sms_enabled boolean DEFAULT false,
  vonage_api_key character varying,
  vonage_api_secret text,
  telnyx_api_key text,
  status character varying DEFAULT 'active'::character varying CHECK (status::text = ANY (ARRAY['active'::character varying, 'inactive'::character varying, 'archived'::character varying, 'testing'::character varying]::text[])),
  vapi_id uuid,
  vapi_account_assigned integer,
  account_in_use boolean DEFAULT false,
  voice_provider character varying DEFAULT 'deepgram'::character varying,
  execution_mode character varying DEFAULT 'production'::character varying,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  deleted_at timestamp with time zone,
  metadata jsonb DEFAULT '{}'::jsonb,
  temperature real,
  confidence numeric DEFAULT 0.8 CHECK (confidence >= 0::numeric AND confidence <= 1::numeric),
  verbosity numeric DEFAULT 0.7 CHECK (verbosity >= 0::numeric AND verbosity <= 1::numeric),
  fallback_number character varying,
  fallback_enabled boolean DEFAULT false,
  knowledge_base_config jsonb DEFAULT '{}'::jsonb,
  knowledge_base_id uuid,
  CONSTRAINT voice_agents_pkey PRIMARY KEY (id),
  CONSTRAINT voice_agents_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT voice_agents_knowledge_base_id_fkey FOREIGN KEY (knowledge_base_id) REFERENCES public.knowledge_bases(id)
);

CREATE INDEX IF NOT EXISTS idx_voice_agents_user_id ON public.voice_agents USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_voice_agents_status ON public.voice_agents USING btree (status);
CREATE INDEX IF NOT EXISTS idx_voice_agents_phone_number ON public.voice_agents USING btree (phone_number);

DROP TRIGGER IF EXISTS update_voice_agents_updated_at ON public.voice_agents;
CREATE TRIGGER update_voice_agents_updated_at
  BEFORE UPDATE ON public.voice_agents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- CALL HISTORY TABLE
-- Main call history table with metadata and lead tracking
-- ============================================================

CREATE TABLE IF NOT EXISTS public.call_history (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  agent_id uuid,
  inbound_number_id uuid,
  caller_number character varying,
  called_number character varying,
  call_status character varying,
  call_duration double precision,
  call_start_time timestamp with time zone,
  call_end_time timestamp without time zone,
  call_answered_time timestamp with time zone,
  recording_url text,
  transcript text,
  call_forwarded_to character varying,
  call_cost numeric,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  deleted_at timestamp with time zone,
  metadata jsonb DEFAULT '{}'::jsonb,
  is_lead boolean,
  CONSTRAINT call_history_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_call_history_user_id ON public.call_history USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_call_history_agent_id ON public.call_history USING btree (agent_id) WHERE agent_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_call_history_call_start_time ON public.call_history USING btree (call_start_time DESC);
CREATE INDEX IF NOT EXISTS idx_call_history_call_status ON public.call_history USING btree (call_status);
CREATE INDEX IF NOT EXISTS idx_call_history_is_lead ON public.call_history USING btree (is_lead) WHERE is_lead = true;

DROP TRIGGER IF EXISTS update_call_history_updated_at ON public.call_history;
CREATE TRIGGER update_call_history_updated_at
  BEFORE UPDATE ON public.call_history
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- CALL RECORDINGS TABLE
-- Call recording storage with storage details
-- ============================================================

CREATE TABLE IF NOT EXISTS public.call_recordings (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  call_history_id uuid NOT NULL,
  user_id uuid NOT NULL,
  recording_url text NOT NULL,
  recording_duration integer,
  file_size_bytes bigint,
  file_format character varying DEFAULT 'mp3'::character varying,
  storage_provider character varying,
  storage_path text,
  transcript_available boolean DEFAULT false,
  transcript_url text,
  speaker_separated boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  deleted_at timestamp with time zone,
  metadata jsonb DEFAULT '{}'::jsonb,
  CONSTRAINT call_recordings_pkey PRIMARY KEY (id),
  CONSTRAINT call_recordings_call_history_id_fkey FOREIGN KEY (call_history_id) REFERENCES public.call_history(id),
  CONSTRAINT call_recordings_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_call_recordings_call_history_id ON public.call_recordings USING btree (call_history_id);
CREATE INDEX IF NOT EXISTS idx_call_recordings_user_id ON public.call_recordings USING btree (user_id);

DROP TRIGGER IF EXISTS update_call_recordings_updated_at ON public.call_recordings;
CREATE TRIGGER update_call_recordings_updated_at
  BEFORE UPDATE ON public.call_recordings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- INBOUND NUMBERS TABLE
-- Inbound phone number management with provider integrations
-- ============================================================

CREATE TABLE IF NOT EXISTS public.inbound_numbers (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  phone_number character varying NOT NULL,
  country_code character varying NOT NULL DEFAULT '+1'::character varying,
  phone_label character varying,
  call_forwarding_number character varying,
  provider character varying NOT NULL CHECK (provider::text = ANY (ARRAY['twilio'::character varying, 'vonage'::character varying, 'callhippo'::character varying, 'telnyx'::character varying, 'other'::character varying]::text[])),
  provider_account_id character varying,
  twilio_sid character varying,
  twilio_auth_token text,
  twilio_account_sid character varying,
  sms_enabled boolean DEFAULT false,
  vonage_api_key character varying,
  vonage_api_secret text,
  vonage_application_id character varying,
  callhippo_api_key text,
  callhippo_account_id character varying,
  provider_api_key text,
  provider_api_secret text,
  provider_webhook_url text,
  provider_config jsonb DEFAULT '{}'::jsonb,
  status character varying NOT NULL DEFAULT 'active'::character varying CHECK (status::text = ANY (ARRAY['active'::character varying, 'suspended'::character varying, 'error'::character varying, 'pending'::character varying, 'inactive'::character varying]::text[])),
  health_status character varying DEFAULT 'unknown'::character varying CHECK (health_status::text = ANY (ARRAY['healthy'::character varying, 'unhealthy'::character varying, 'unknown'::character varying, 'testing'::character varying]::text[])),
  last_health_check timestamp with time zone,
  health_check_error text,
  webhook_url text,
  webhook_status character varying DEFAULT 'unknown'::character varying CHECK (webhook_status::text = ANY (ARRAY['active'::character varying, 'inactive'::character varying, 'error'::character varying, 'unknown'::character varying]::text[])),
  last_webhook_test timestamp with time zone,
  webhook_test_result jsonb,
  assigned_to_agent_id uuid,
  is_in_use boolean DEFAULT false,
  metadata jsonb DEFAULT '{}'::jsonb,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  deleted_at timestamp with time zone,
  number_id uuid,
  tool_id uuid,
  CONSTRAINT inbound_numbers_pkey PRIMARY KEY (id),
  CONSTRAINT inbound_numbers_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT inbound_numbers_assigned_to_agent_id_fkey FOREIGN KEY (assigned_to_agent_id) REFERENCES public.voice_agents(id)
);

CREATE INDEX IF NOT EXISTS idx_inbound_numbers_user_id ON public.inbound_numbers USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_inbound_numbers_status ON public.inbound_numbers USING btree (status);
CREATE INDEX IF NOT EXISTS idx_inbound_numbers_phone_number ON public.inbound_numbers USING btree (phone_number);

DROP TRIGGER IF EXISTS update_inbound_numbers_updated_at ON public.inbound_numbers;
CREATE TRIGGER update_inbound_numbers_updated_at
  BEFORE UPDATE ON public.inbound_numbers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- AGENT CALLS TABLE
-- Individual agent call records
-- ============================================================

CREATE TABLE IF NOT EXISTS public.agent_calls (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  agent_id uuid NOT NULL,
  user_id uuid NOT NULL,
  caller_number character varying,
  called_number character varying,
  direction character varying CHECK (direction::text = ANY (ARRAY['inbound'::character varying, 'outbound'::character varying]::text[])),
  status character varying CHECK (status::text = ANY (ARRAY['initiated'::character varying, 'ringing'::character varying, 'answered'::character varying, 'completed'::character varying, 'failed'::character varying, 'busy'::character varying, 'no-answer'::character varying]::text[])),
  duration integer DEFAULT 0,
  recording_url text,
  transcript text,
  provider character varying,
  provider_call_id character varying,
  started_at timestamp with time zone,
  answered_at timestamp with time zone,
  ended_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb,
  CONSTRAINT agent_calls_pkey PRIMARY KEY (id),
  CONSTRAINT agent_calls_agent_id_fkey FOREIGN KEY (agent_id) REFERENCES public.voice_agents(id),
  CONSTRAINT agent_calls_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_agent_calls_agent_id ON public.agent_calls USING btree (agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_calls_user_id ON public.agent_calls USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_agent_calls_started_at ON public.agent_calls USING btree (started_at DESC);

-- ============================================================
-- AGENT ANALYTICS TABLE
-- Agent performance analytics
-- ============================================================

CREATE TABLE IF NOT EXISTS public.agent_analytics (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  agent_id uuid NOT NULL,
  user_id uuid NOT NULL,
  date date NOT NULL,
  period character varying CHECK (period::text = ANY (ARRAY['hour'::character varying, 'day'::character varying, 'week'::character varying, 'month'::character varying]::text[])),
  total_calls integer DEFAULT 0,
  answered_calls integer DEFAULT 0,
  missed_calls integer DEFAULT 0,
  total_duration integer DEFAULT 0,
  average_duration numeric DEFAULT 0,
  conversions integer DEFAULT 0,
  conversion_rate numeric DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT agent_analytics_pkey PRIMARY KEY (id),
  CONSTRAINT agent_analytics_agent_id_fkey FOREIGN KEY (agent_id) REFERENCES public.voice_agents(id),
  CONSTRAINT agent_analytics_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_agent_analytics_agent_id ON public.agent_analytics USING btree (agent_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_agent_analytics_user_id ON public.agent_analytics USING btree (user_id, date DESC);

DROP TRIGGER IF EXISTS update_agent_analytics_updated_at ON public.agent_analytics;
CREATE TRIGGER update_agent_analytics_updated_at
  BEFORE UPDATE ON public.agent_analytics
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- CALL ANALYTICS TABLE
-- Call analytics aggregation for reporting
-- ============================================================

CREATE TABLE IF NOT EXISTS public.call_analytics (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  agent_id uuid,
  date date NOT NULL,
  hour integer CHECK (hour >= 0 AND hour <= 23),
  total_calls integer DEFAULT 0,
  answered_calls integer DEFAULT 0,
  missed_calls integer DEFAULT 0,
  forwarded_calls integer DEFAULT 0,
  failed_calls integer DEFAULT 0,
  total_duration_seconds integer DEFAULT 0,
  average_duration_seconds numeric DEFAULT 0,
  min_duration_seconds integer DEFAULT 0,
  max_duration_seconds integer DEFAULT 0,
  total_cost numeric DEFAULT 0,
  average_cost numeric DEFAULT 0,
  average_quality_score numeric DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT call_analytics_pkey PRIMARY KEY (id),
  CONSTRAINT call_analytics_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT call_analytics_agent_id_fkey FOREIGN KEY (agent_id) REFERENCES public.voice_agents(id)
);

CREATE INDEX IF NOT EXISTS idx_call_analytics_user_id ON public.call_analytics USING btree (user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_call_analytics_agent_id ON public.call_analytics USING btree (agent_id, date DESC) WHERE agent_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_call_analytics_date_hour ON public.call_analytics USING btree (date, hour);

DROP TRIGGER IF EXISTS update_call_analytics_updated_at ON public.call_analytics;
CREATE TRIGGER update_call_analytics_updated_at
  BEFORE UPDATE ON public.call_analytics
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- SUPPORT TICKETS TABLE
-- Support ticket management
-- ============================================================

CREATE TABLE IF NOT EXISTS public.support_tickets (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  subject character varying NOT NULL,
  description text NOT NULL,
  status character varying NOT NULL DEFAULT 'open'::character varying CHECK (status::text = ANY (ARRAY['open'::character varying, 'in_progress'::character varying, 'resolved'::character varying, 'closed'::character varying]::text[])),
  priority character varying NOT NULL DEFAULT 'medium'::character varying CHECK (priority::text = ANY (ARRAY['low'::character varying, 'medium'::character varying, 'high'::character varying, 'urgent'::character varying]::text[])),
  assigned_to uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  resolved_at timestamp with time zone,
  closed_at timestamp with time zone,
  CONSTRAINT support_tickets_pkey PRIMARY KEY (id),
  CONSTRAINT support_tickets_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT support_tickets_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.admin_profiles(id)
);

CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id ON public.support_tickets USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON public.support_tickets USING btree (status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_assigned_to ON public.support_tickets USING btree (assigned_to) WHERE assigned_to IS NOT NULL;

DROP TRIGGER IF EXISTS update_support_tickets_updated_at ON public.support_tickets;
CREATE TRIGGER update_support_tickets_updated_at
  BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- SUPPORT TICKET NOTES TABLE
-- Internal notes for support tickets
-- ============================================================

CREATE TABLE IF NOT EXISTS public.support_ticket_notes (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  ticket_id uuid NOT NULL,
  admin_id uuid NOT NULL,
  note text NOT NULL,
  is_internal boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT support_ticket_notes_pkey PRIMARY KEY (id),
  CONSTRAINT support_ticket_notes_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES public.support_tickets(id),
  CONSTRAINT support_ticket_notes_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES public.admin_profiles(id)
);

CREATE INDEX IF NOT EXISTS idx_support_ticket_notes_ticket_id ON public.support_ticket_notes USING btree (ticket_id);
CREATE INDEX IF NOT EXISTS idx_support_ticket_notes_admin_id ON public.support_ticket_notes USING btree (admin_id);

-- ============================================================
-- SECURITY EVENTS TABLE
-- Security event logging
-- ============================================================

CREATE TABLE IF NOT EXISTS public.security_events (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid,
  event_type character varying NOT NULL CHECK (event_type::text = ANY (ARRAY['failed_login'::character varying, 'password_reset_request'::character varying, 'password_changed'::character varying, 'email_changed'::character varying, '2fa_enabled'::character varying, '2fa_disabled'::character varying, '2fa_failed'::character varying, 'suspicious_activity'::character varying, 'account_locked'::character varying, 'account_unlocked'::character varying, 'session_revoked'::character varying, 'multiple_failed_attempts'::character varying]::text[])),
  severity character varying DEFAULT 'medium'::character varying CHECK (severity::text = ANY (ARRAY['low'::character varying, 'medium'::character varying, 'high'::character varying, 'critical'::character varying]::text[])),
  ip_address inet,
  user_agent text,
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT security_events_pkey PRIMARY KEY (id),
  CONSTRAINT security_events_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_security_events_user_id ON public.security_events USING btree (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_events_event_type ON public.security_events USING btree (event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_events_severity ON public.security_events USING btree (severity, created_at DESC) WHERE severity IN ('high', 'critical');

-- ============================================================
-- LOGIN ACTIVITY TABLE
-- Tracks user login sessions and activity
-- ============================================================

CREATE TABLE IF NOT EXISTS public.login_activity (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  session_id uuid,
  ip_address inet,
  user_agent text,
  device_type character varying,
  device_name character varying,
  browser_name character varying,
  os_name character varying,
  location_country character varying,
  location_city character varying,
  login_method character varying CHECK (login_method::text = ANY (ARRAY['email'::character varying, 'google'::character varying, 'apple'::character varying, 'facebook'::character varying, '2fa'::character varying]::text[])),
  success boolean DEFAULT true,
  failure_reason text,
  login_at timestamp with time zone DEFAULT now(),
  logout_at timestamp with time zone,
  expires_at timestamp with time zone,
  is_active boolean DEFAULT true,
  CONSTRAINT login_activity_pkey PRIMARY KEY (id),
  CONSTRAINT login_activity_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_login_activity_user_id ON public.login_activity USING btree (user_id, login_at DESC);
CREATE INDEX IF NOT EXISTS idx_login_activity_session_id ON public.login_activity USING btree (session_id) WHERE session_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_login_activity_is_active ON public.login_activity USING btree (is_active) WHERE is_active = true;

-- ============================================================
-- NOTIFICATIONS TABLE
-- User notification system
-- ============================================================

CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  type character varying NOT NULL CHECK (type::text = ANY (ARRAY['email_verification'::character varying, 'password_changed'::character varying, 'password_reset_request'::character varying, 'login_alert'::character varying, 'new_device_login'::character varying, '2fa_enabled'::character varying, '2fa_disabled'::character varying, 'account_deactivated'::character varying, 'account_deleted'::character varying, 'security_alert'::character varying, 'suspicious_activity'::character varying]::text[])),
  title character varying NOT NULL,
  message text NOT NULL,
  email_sent boolean DEFAULT false,
  email_sent_at timestamp with time zone,
  read_at timestamp with time zone,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT notifications_pkey PRIMARY KEY (id),
  CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications USING btree (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_read_at ON public.notifications USING btree (read_at) WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_type ON public.notifications USING btree (type);

-- ============================================================
-- SUBSCRIPTION PACKAGES TABLE
-- Subscription package definitions with feature limits
-- ============================================================

CREATE TABLE IF NOT EXISTS public.subscription_packages (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  package_name character varying NOT NULL,
  package_code character varying NOT NULL UNIQUE,
  description text,
  monthly_price numeric NOT NULL,
  currency character varying DEFAULT 'USD'::character varying,
  max_agents integer DEFAULT 1,
  max_inbound_numbers integer DEFAULT 1,
  monthly_call_minutes integer DEFAULT 0,
  monthly_credits integer DEFAULT 0,
  features jsonb DEFAULT '{}'::jsonb,
  is_active boolean DEFAULT true,
  is_featured boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  deleted_at timestamp with time zone,
  CONSTRAINT subscription_packages_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_subscription_packages_package_code ON public.subscription_packages USING btree (package_code);
CREATE INDEX IF NOT EXISTS idx_subscription_packages_is_active ON public.subscription_packages USING btree (is_active) WHERE is_active = true;

DROP TRIGGER IF EXISTS update_subscription_packages_updated_at ON public.subscription_packages;
CREATE TRIGGER update_subscription_packages_updated_at
  BEFORE UPDATE ON public.subscription_packages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- ENABLE ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voice_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_recordings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inbound_numbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_ticket_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.login_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_packages ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- NOTES
-- ============================================================
-- 1. These tables already exist in the database
-- 2. This migration ensures version control and consistency
-- 3. RLS policies should be configured separately
-- 4. Foreign keys reference tables that should exist
-- ============================================================
