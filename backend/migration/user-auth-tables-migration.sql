-- ============================================================
-- USER AUTHENTICATION & SECURITY TABLES MIGRATION
-- Tables for account deactivation, verification tokens, 2FA, etc.
-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- ============================================================
-- ACCOUNT DEACTIVATION REQUESTS TABLE
-- Tracks user account deactivation requests
-- ============================================================

CREATE TABLE IF NOT EXISTS public.account_deactivation_requests (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  reason text,
  scheduled_deletion_at timestamp with time zone,
  status character varying DEFAULT 'pending'::character varying CHECK (status::text = ANY (ARRAY['pending'::character varying, 'completed'::character varying, 'cancelled'::character varying]::text[])),
  created_at timestamp with time zone DEFAULT now(),
  completed_at timestamp with time zone,
  CONSTRAINT account_deactivation_requests_pkey PRIMARY KEY (id),
  CONSTRAINT account_deactivation_requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_account_deactivation_requests_user_id ON public.account_deactivation_requests USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_account_deactivation_requests_status ON public.account_deactivation_requests USING btree (status);
CREATE INDEX IF NOT EXISTS idx_account_deactivation_requests_scheduled_deletion ON public.account_deactivation_requests USING btree (scheduled_deletion_at) WHERE scheduled_deletion_at IS NOT NULL;

-- ============================================================
-- EMAIL VERIFICATION TOKENS TABLE
-- Email verification token management
-- ============================================================

CREATE TABLE IF NOT EXISTS public.email_verification_tokens (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  email character varying NOT NULL,
  token character varying NOT NULL,
  token_hash text NOT NULL,
  purpose character varying CHECK (purpose::text = ANY (ARRAY['email_verification'::character varying, 'password_reset'::character varying, 'email_change'::character varying]::text[])),
  expires_at timestamp with time zone NOT NULL,
  used_at timestamp with time zone,
  attempts integer DEFAULT 0,
  max_attempts integer DEFAULT 3,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT email_verification_tokens_pkey PRIMARY KEY (id),
  CONSTRAINT email_verification_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_user_id ON public.email_verification_tokens USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_token_hash ON public.email_verification_tokens USING btree (token_hash);
CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_expires_at ON public.email_verification_tokens USING btree (expires_at) WHERE used_at IS NULL;

-- ============================================================
-- PHONE VERIFICATION TOKENS TABLE
-- Phone verification token management
-- ============================================================

CREATE TABLE IF NOT EXISTS public.phone_verification_tokens (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  phone_number character varying NOT NULL,
  country_code character varying NOT NULL,
  token character varying NOT NULL,
  token_hash text NOT NULL,
  expires_at timestamp with time zone NOT NULL,
  used_at timestamp with time zone,
  attempts integer DEFAULT 0,
  max_attempts integer DEFAULT 3,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT phone_verification_tokens_pkey PRIMARY KEY (id),
  CONSTRAINT phone_verification_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_phone_verification_tokens_user_id ON public.phone_verification_tokens USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_phone_verification_tokens_token_hash ON public.phone_verification_tokens USING btree (token_hash);
CREATE INDEX IF NOT EXISTS idx_phone_verification_tokens_expires_at ON public.phone_verification_tokens USING btree (expires_at) WHERE used_at IS NULL;

-- ============================================================
-- PASSWORD HISTORY TABLE
-- Stores password history for security
-- ============================================================

CREATE TABLE IF NOT EXISTS public.password_history (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  password_hash text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT password_history_pkey PRIMARY KEY (id),
  CONSTRAINT password_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_password_history_user_id ON public.password_history USING btree (user_id, created_at DESC);

-- ============================================================
-- USER 2FA TABLE
-- Two-factor authentication settings
-- ============================================================

CREATE TABLE IF NOT EXISTS public.user_2fa (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL UNIQUE,
  enabled boolean DEFAULT false,
  method character varying CHECK (method::text = ANY (ARRAY['totp'::character varying, 'sms'::character varying, 'email'::character varying]::text[])),
  secret_key text,
  backup_codes ARRAY,
  phone_number character varying,
  verified boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  last_used_at timestamp with time zone,
  CONSTRAINT user_2fa_pkey PRIMARY KEY (id),
  CONSTRAINT user_2fa_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_user_2fa_user_id ON public.user_2fa USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_user_2fa_enabled ON public.user_2fa USING btree (enabled) WHERE enabled = true;

DROP TRIGGER IF EXISTS update_user_2fa_updated_at ON public.user_2fa;
CREATE TRIGGER update_user_2fa_updated_at
  BEFORE UPDATE ON public.user_2fa
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- USER EMAILS TABLE
-- Additional email addresses for users
-- ============================================================

CREATE TABLE IF NOT EXISTS public.user_emails (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  email text NOT NULL,
  name text,
  smtp_password text,
  is_primary boolean NOT NULL DEFAULT false,
  is_verified boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  deleted_at timestamp with time zone,
  CONSTRAINT user_emails_pkey PRIMARY KEY (id),
  CONSTRAINT user_emails_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_user_emails_user_id ON public.user_emails USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_user_emails_email ON public.user_emails USING btree (email);
CREATE INDEX IF NOT EXISTS idx_user_emails_is_primary ON public.user_emails USING btree (is_primary) WHERE is_primary = true;

DROP TRIGGER IF EXISTS update_user_emails_updated_at ON public.user_emails;
CREATE TRIGGER update_user_emails_updated_at
  BEFORE UPDATE ON public.user_emails
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- KYC VERIFICATIONS TABLE
-- KYC document verification
-- ============================================================

CREATE TABLE IF NOT EXISTS public.kyc_verifications (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL UNIQUE,
  document_type character varying CHECK (document_type::text = ANY (ARRAY['passport'::character varying, 'drivers_license'::character varying, 'national_id'::character varying, 'other'::character varying]::text[])),
  document_front_url text,
  document_back_url text,
  selfie_url text,
  status character varying DEFAULT 'pending'::character varying CHECK (status::text = ANY (ARRAY['pending'::character varying, 'under_review'::character varying, 'approved'::character varying, 'rejected'::character varying]::text[])),
  rejection_reason text,
  verified_by uuid,
  verified_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT kyc_verifications_pkey PRIMARY KEY (id),
  CONSTRAINT kyc_verifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT kyc_verifications_verified_by_fkey FOREIGN KEY (verified_by) REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_kyc_verifications_user_id ON public.kyc_verifications USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_kyc_verifications_status ON public.kyc_verifications USING btree (status);

DROP TRIGGER IF EXISTS update_kyc_verifications_updated_at ON public.kyc_verifications;
CREATE TRIGGER update_kyc_verifications_updated_at
  BEFORE UPDATE ON public.kyc_verifications
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- ENABLE ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE public.account_deactivation_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_verification_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.phone_verification_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.password_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_2fa ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kyc_verifications ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- NOTES
-- ============================================================
-- 1. All tables use uuid_generate_v4() or gen_random_uuid() for IDs
-- 2. RLS policies should be configured separately
-- 3. Token hashes should be stored, not plain tokens
-- 4. Password history helps prevent password reuse
-- ============================================================
