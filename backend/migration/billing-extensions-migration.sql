-- ============================================================
-- BILLING EXTENSIONS MIGRATION
-- Tables for credit transactions and tax configuration
-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- ============================================================
-- CREDIT TRANSACTIONS TABLE
-- Credit transaction history
-- ============================================================

CREATE TABLE IF NOT EXISTS public.credit_transactions (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  transaction_type character varying NOT NULL CHECK (transaction_type::text = ANY (ARRAY['purchase'::character varying, 'usage'::character varying, 'refund'::character varying, 'adjustment'::character varying, 'bonus'::character varying, 'subscription_credit'::character varying]::text[])),
  amount numeric NOT NULL,
  agent_id uuid,
  call_id uuid,
  call_duration_seconds integer,
  credits_per_minute numeric DEFAULT 0.10,
  purchase_id uuid,
  balance_before numeric NOT NULL,
  balance_after numeric NOT NULL,
  description text,
  created_at timestamp with time zone DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb,
  CONSTRAINT credit_transactions_pkey PRIMARY KEY (id),
  CONSTRAINT credit_transactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT credit_transactions_agent_id_fkey FOREIGN KEY (agent_id) REFERENCES public.voice_agents(id),
  CONSTRAINT credit_transactions_call_id_fkey FOREIGN KEY (call_id) REFERENCES public.call_history(id),
  CONSTRAINT credit_transactions_purchase_id_fkey FOREIGN KEY (purchase_id) REFERENCES public.purchases(id)
);

CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_id ON public.credit_transactions USING btree (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_transaction_type ON public.credit_transactions USING btree (transaction_type);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_created_at ON public.credit_transactions USING btree (created_at DESC);

-- ============================================================
-- TAX CONFIGURATION TABLE
-- Tax rate configuration by location
-- ============================================================

CREATE TABLE IF NOT EXISTS public.tax_configuration (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  country_code character varying NOT NULL,
  state_code character varying,
  tax_name character varying NOT NULL,
  tax_rate numeric NOT NULL,
  is_default boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT tax_configuration_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_tax_configuration_country_state ON public.tax_configuration USING btree (country_code, state_code);
CREATE INDEX IF NOT EXISTS idx_tax_configuration_is_default ON public.tax_configuration USING btree (is_default) WHERE is_default = true;
CREATE INDEX IF NOT EXISTS idx_tax_configuration_is_active ON public.tax_configuration USING btree (is_active) WHERE is_active = true;

DROP TRIGGER IF EXISTS update_tax_configuration_updated_at ON public.tax_configuration;
CREATE TRIGGER update_tax_configuration_updated_at
  BEFORE UPDATE ON public.tax_configuration
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- ENABLE ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tax_configuration ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- NOTES
-- ============================================================
-- 1. Credit transactions track all credit movements
-- 2. Tax configuration supports country/state-specific rates
-- 3. Only one default tax rate should exist per country/state
-- ============================================================
