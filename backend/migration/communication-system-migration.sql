-- ============================================================
-- COMMUNICATION SYSTEM MIGRATION
-- Tables for AI prompts, email logs, and email templates
-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- ============================================================
-- AI PROMPTS TABLE
-- AI prompt templates
-- ============================================================

CREATE TABLE IF NOT EXISTS public.ai_prompts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  category text NOT NULL DEFAULT 'general'::text,
  system_prompt text NOT NULL,
  begin_message text,
  agent_profile jsonb DEFAULT '{}'::jsonb,
  state_prompts jsonb DEFAULT '{}'::jsonb,
  tools_config jsonb DEFAULT '{}'::jsonb,
  call_type text,
  call_goal text,
  tone text,
  status text DEFAULT 'draft'::text,
  is_active boolean DEFAULT true,
  is_template boolean DEFAULT false,
  usage_count integer DEFAULT 0,
  welcome_messages jsonb DEFAULT '[]'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  deleted_at timestamp with time zone,
  CONSTRAINT ai_prompts_pkey PRIMARY KEY (id),
  CONSTRAINT ai_prompts_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_ai_prompts_user_id ON public.ai_prompts USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_ai_prompts_category ON public.ai_prompts USING btree (category);
CREATE INDEX IF NOT EXISTS idx_ai_prompts_is_template ON public.ai_prompts USING btree (is_template) WHERE is_template = true;

DROP TRIGGER IF EXISTS update_ai_prompts_updated_at ON public.ai_prompts;
CREATE TRIGGER update_ai_prompts_updated_at
  BEFORE UPDATE ON public.ai_prompts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- EMAIL LOGS TABLE
-- Email sending logs
-- ============================================================

CREATE TABLE IF NOT EXISTS public.email_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  from_email text NOT NULL,
  to_email text NOT NULL,
  to_phone_number text,
  subject text NOT NULL,
  body text NOT NULL,
  status text NOT NULL DEFAULT 'pending'::text,
  sent_at timestamp with time zone,
  error_message text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  deleted_at timestamp with time zone,
  CONSTRAINT email_logs_pkey PRIMARY KEY (id),
  CONSTRAINT email_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_email_logs_user_id ON public.email_logs USING btree (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON public.email_logs USING btree (status);
CREATE INDEX IF NOT EXISTS idx_email_logs_to_email ON public.email_logs USING btree (to_email);

DROP TRIGGER IF EXISTS update_email_logs_updated_at ON public.email_logs;
CREATE TRIGGER update_email_logs_updated_at
  BEFORE UPDATE ON public.email_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- EMAIL TEMPLATES TABLE
-- Email template management
-- ============================================================

CREATE TABLE IF NOT EXISTS public.email_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  subject text NOT NULL,
  body text NOT NULL,
  description text,
  is_default boolean NOT NULL DEFAULT false,
  accent_color text NOT NULL DEFAULT '#4F46E5'::text,
  design_style text NOT NULL DEFAULT 'modern'::text,
  company_name text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  deleted_at timestamp with time zone,
  CONSTRAINT email_templates_pkey PRIMARY KEY (id),
  CONSTRAINT email_templates_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_email_templates_user_id ON public.email_templates USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_email_templates_is_default ON public.email_templates USING btree (is_default) WHERE is_default = true;

DROP TRIGGER IF EXISTS update_email_templates_updated_at ON public.email_templates;
CREATE TRIGGER update_email_templates_updated_at
  BEFORE UPDATE ON public.email_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- ENABLE ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE public.ai_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- NOTES
-- ============================================================
-- 1. AI prompts can be templates or user-specific
-- 2. Email logs track all email sending attempts
-- 3. Email templates support custom styling
-- ============================================================
