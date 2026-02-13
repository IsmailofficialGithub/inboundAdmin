-- ============================================================
-- PACKAGE / PLAN SYSTEM
-- Complete migration for subscription packages with dynamic features
-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- ============================================================
-- PACKAGES TABLE
-- Stores package/plan information (Free, Pro, Premium, Enterprise)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.packages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name character varying(100) NOT NULL,
  slug character varying(100) NOT NULL,
  description text NULL,
  tier character varying(50) NOT NULL DEFAULT 'free',
  price_monthly numeric(10, 2) NULL DEFAULT 0,
  price_yearly numeric(10, 2) NULL,
  currency character varying(3) NULL DEFAULT 'USD'::character varying,
  credits_included integer NULL DEFAULT 0,
  is_active boolean NULL DEFAULT true,
  is_featured boolean NULL DEFAULT false,
  sort_order integer NULL DEFAULT 0,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  metadata jsonb NULL DEFAULT '{}'::jsonb,
  CONSTRAINT packages_pkey PRIMARY KEY (id),
  CONSTRAINT packages_slug_key UNIQUE (slug),
  CONSTRAINT packages_tier_check CHECK (
    (tier)::text = ANY (
      (ARRAY[
        'free'::character varying,
        'pro'::character varying,
        'premium'::character varying,
        'enterprise'::character varying
      ])::text[]
    )
  )
);

CREATE INDEX IF NOT EXISTS idx_packages_slug ON public.packages USING btree (slug);
CREATE INDEX IF NOT EXISTS idx_packages_tier ON public.packages USING btree (tier);
CREATE INDEX IF NOT EXISTS idx_packages_active ON public.packages USING btree (is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_packages_sort_order ON public.packages USING btree (sort_order);

-- ============================================================
-- PACKAGE FEATURES TABLE
-- Stores feature templates with variables like {{value}}
-- ============================================================

CREATE TABLE IF NOT EXISTS public.package_features (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  package_id uuid NOT NULL,
  feature_key character varying(100) NOT NULL,
  feature_label character varying(255) NOT NULL,
  feature_template text NOT NULL,
  display_order integer NULL DEFAULT 0,
  is_highlighted boolean NULL DEFAULT false,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT package_features_pkey PRIMARY KEY (id),
  CONSTRAINT package_features_package_id_fkey FOREIGN KEY (package_id) REFERENCES public.packages(id) ON DELETE CASCADE,
  CONSTRAINT package_features_package_key_unique UNIQUE (package_id, feature_key)
);

CREATE INDEX IF NOT EXISTS idx_package_features_package_id ON public.package_features USING btree (package_id);
CREATE INDEX IF NOT EXISTS idx_package_features_display_order ON public.package_features USING btree (package_id, display_order);

-- ============================================================
-- PACKAGE VARIABLES TABLE
-- Stores variable values that replace {{variable}} in templates
-- ============================================================

CREATE TABLE IF NOT EXISTS public.package_variables (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  package_id uuid NOT NULL,
  variable_key character varying(100) NOT NULL,
  variable_value text NOT NULL,
  variable_type character varying(50) NULL DEFAULT 'text'::character varying,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT package_variables_pkey PRIMARY KEY (id),
  CONSTRAINT package_variables_package_id_fkey FOREIGN KEY (package_id) REFERENCES public.packages(id) ON DELETE CASCADE,
  CONSTRAINT package_variables_package_key_unique UNIQUE (package_id, variable_key),
  CONSTRAINT package_variables_type_check CHECK (
    (variable_type)::text = ANY (
      (ARRAY[
        'text'::character varying,
        'number'::character varying,
        'boolean'::character varying,
        'currency'::character varying
      ])::text[]
    )
  )
);

CREATE INDEX IF NOT EXISTS idx_package_variables_package_id ON public.package_variables USING btree (package_id);
CREATE INDEX IF NOT EXISTS idx_package_variables_key ON public.package_variables USING btree (package_id, variable_key);

-- ============================================================
-- HELPER FUNCTION: Update updated_at timestamp
-- ============================================================

DROP TRIGGER IF EXISTS update_packages_updated_at ON public.packages;
CREATE TRIGGER update_packages_updated_at
  BEFORE UPDATE ON public.packages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_package_features_updated_at ON public.package_features;
CREATE TRIGGER update_package_features_updated_at
  BEFORE UPDATE ON public.package_features
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_package_variables_updated_at ON public.package_variables;
CREATE TRIGGER update_package_variables_updated_at
  BEFORE UPDATE ON public.package_variables
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- FUNCTION: Render package feature with variables
-- Replaces {{variable}} placeholders with actual values
-- ============================================================

CREATE OR REPLACE FUNCTION public.render_package_feature(
  p_package_id uuid,
  p_feature_key character varying
)
RETURNS text
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_template text;
  v_result text;
  v_var_record record;
  v_credits text;
  v_price_monthly text;
  v_price_yearly text;
  v_currency text;
BEGIN
  -- Get the feature template
  SELECT feature_template INTO v_template
  FROM public.package_features
  WHERE package_id = p_package_id AND feature_key = p_feature_key;
  
  IF v_template IS NULL THEN
    RETURN NULL;
  END IF;
  
  v_result := v_template;
  
  -- Get built-in variables from package
  SELECT 
    COALESCE(credits_included, 0)::text,
    COALESCE(price_monthly, 0)::text,
    COALESCE(price_yearly, 0)::text,
    COALESCE(currency, 'USD')
  INTO v_credits, v_price_monthly, v_price_yearly, v_currency
  FROM public.packages
  WHERE id = p_package_id;
  
  -- Replace built-in variables first
  v_result := REPLACE(v_result, '{{credits}}', v_credits);
  v_result := REPLACE(v_result, '{{price_monthly}}', v_price_monthly);
  v_result := REPLACE(v_result, '{{price_yearly}}', v_price_yearly);
  v_result := REPLACE(v_result, '{{currency}}', v_currency);
  
  -- Replace custom variables
  FOR v_var_record IN
    SELECT variable_key, variable_value
    FROM public.package_variables
    WHERE package_id = p_package_id
  LOOP
    v_result := REPLACE(v_result, '{{' || v_var_record.variable_key || '}}', v_var_record.variable_value);
  END LOOP;
  
  RETURN v_result;
END;
$$;

-- ============================================================
-- ENABLE ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE public.packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.package_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.package_variables ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RLS POLICIES
-- ============================================================

-- Packages: Everyone can read active packages, admins can manage all
DROP POLICY IF EXISTS "Everyone can read active packages" ON public.packages;
CREATE POLICY "Everyone can read active packages"
  ON public.packages
  FOR SELECT
  USING (is_active = true);

DROP POLICY IF EXISTS "Admins can manage packages" ON public.packages;
CREATE POLICY "Admins can manage packages"
  ON public.packages
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_profiles
      WHERE id = auth.uid() AND is_active = true
    )
  );

-- Package Features: Everyone can read features of active packages, admins can manage all
DROP POLICY IF EXISTS "Everyone can read active package features" ON public.package_features;
CREATE POLICY "Everyone can read active package features"
  ON public.package_features
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.packages
      WHERE id = package_features.package_id AND is_active = true
    )
  );

DROP POLICY IF EXISTS "Admins can manage package features" ON public.package_features;
CREATE POLICY "Admins can manage package features"
  ON public.package_features
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_profiles
      WHERE id = auth.uid() AND is_active = true
    )
  );

-- Package Variables: Everyone can read variables of active packages, admins can manage all
DROP POLICY IF EXISTS "Everyone can read active package variables" ON public.package_variables;
CREATE POLICY "Everyone can read active package variables"
  ON public.package_variables
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.packages
      WHERE id = package_variables.package_id AND is_active = true
    )
  );

DROP POLICY IF EXISTS "Admins can manage package variables" ON public.package_variables;
CREATE POLICY "Admins can manage package variables"
  ON public.package_variables
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_profiles
      WHERE id = auth.uid() AND is_active = true
    )
  );

-- ============================================================
-- INITIAL DATA SETUP
-- ============================================================

-- Insert default packages
INSERT INTO public.packages (
  name,
  slug,
  description,
  tier,
  price_monthly,
  price_yearly,
  currency,
  credits_included,
  is_active,
  is_featured,
  sort_order
)
SELECT 
  'Free',
  'free',
  'Perfect for getting started',
  'free',
  0.00,
  0.00,
  'USD',
  200,
  true,
  false,
  1
WHERE NOT EXISTS (SELECT 1 FROM public.packages WHERE slug = 'free');

INSERT INTO public.packages (
  name,
  slug,
  description,
  tier,
  price_monthly,
  price_yearly,
  currency,
  credits_included,
  is_active,
  is_featured,
  sort_order
)
SELECT 
  'Pro',
  'pro',
  'For professionals and small teams',
  'pro',
  29.99,
  299.99,
  'USD',
  1000,
  true,
  true,
  2
WHERE NOT EXISTS (SELECT 1 FROM public.packages WHERE slug = 'pro');

INSERT INTO public.packages (
  name,
  slug,
  description,
  tier,
  price_monthly,
  price_yearly,
  currency,
  credits_included,
  is_active,
  is_featured,
  sort_order
)
SELECT 
  'Premium',
  'premium',
  'Advanced features for growing businesses',
  'premium',
  79.99,
  799.99,
  'USD',
  5000,
  true,
  false,
  3
WHERE NOT EXISTS (SELECT 1 FROM public.packages WHERE slug = 'premium');

INSERT INTO public.packages (
  name,
  slug,
  description,
  tier,
  price_monthly,
  price_yearly,
  currency,
  credits_included,
  is_active,
  is_featured,
  sort_order
)
SELECT 
  'Enterprise',
  'enterprise',
  'Custom solutions for large organizations',
  'enterprise',
  199.99,
  1999.99,
  'USD',
  20000,
  true,
  false,
  4
WHERE NOT EXISTS (SELECT 1 FROM public.packages WHERE slug = 'enterprise');

-- Insert features for Free package
DO $$
DECLARE
  v_free_package_id uuid;
BEGIN
  SELECT id INTO v_free_package_id FROM public.packages WHERE slug = 'free' LIMIT 1;
  
  IF v_free_package_id IS NOT NULL THEN
    INSERT INTO public.package_features (package_id, feature_key, feature_label, feature_template, display_order, is_highlighted)
    VALUES
      (v_free_package_id, 'credits', 'Credits Included', '{{credits}} credits per month', 1, true),
      (v_free_package_id, 'voice_agents', 'Voice Agents', 'Up to {{max_voice_agents}} voice agents', 2, false),
      (v_free_package_id, 'support', 'Support', '{{support_type}} support', 3, false)
    ON CONFLICT (package_id, feature_key) DO NOTHING;
    
    INSERT INTO public.package_variables (package_id, variable_key, variable_value, variable_type)
    VALUES
      (v_free_package_id, 'max_voice_agents', '1', 'number'),
      (v_free_package_id, 'support_type', 'Community', 'text')
    ON CONFLICT (package_id, variable_key) DO NOTHING;
  END IF;
END $$;

-- Insert features for Pro package
DO $$
DECLARE
  v_pro_package_id uuid;
BEGIN
  SELECT id INTO v_pro_package_id FROM public.packages WHERE slug = 'pro' LIMIT 1;
  
  IF v_pro_package_id IS NOT NULL THEN
    INSERT INTO public.package_features (package_id, feature_key, feature_label, feature_template, display_order, is_highlighted)
    VALUES
      (v_pro_package_id, 'credits', 'Credits Included', '{{credits}} credits per month', 1, true),
      (v_pro_package_id, 'voice_agents', 'Voice Agents', 'Up to {{max_voice_agents}} voice agents', 2, true),
      (v_pro_package_id, 'api_access', 'API Access', '{{api_calls}} API calls per month', 3, false),
      (v_pro_package_id, 'support', 'Support', '{{support_type}} support', 4, false),
      (v_pro_package_id, 'analytics', 'Analytics', '{{analytics_type}} analytics dashboard', 5, false)
    ON CONFLICT (package_id, feature_key) DO NOTHING;
    
    INSERT INTO public.package_variables (package_id, variable_key, variable_value, variable_type)
    VALUES
      (v_pro_package_id, 'max_voice_agents', '5', 'number'),
      (v_pro_package_id, 'api_calls', '10000', 'number'),
      (v_pro_package_id, 'support_type', 'Email', 'text'),
      (v_pro_package_id, 'analytics_type', 'Basic', 'text')
    ON CONFLICT (package_id, variable_key) DO NOTHING;
  END IF;
END $$;

-- Insert features for Premium package
DO $$
DECLARE
  v_premium_package_id uuid;
BEGIN
  SELECT id INTO v_premium_package_id FROM public.packages WHERE slug = 'premium' LIMIT 1;
  
  IF v_premium_package_id IS NOT NULL THEN
    INSERT INTO public.package_features (package_id, feature_key, feature_label, feature_template, display_order, is_highlighted)
    VALUES
      (v_premium_package_id, 'credits', 'Credits Included', '{{credits}} credits per month', 1, true),
      (v_premium_package_id, 'voice_agents', 'Voice Agents', 'Up to {{max_voice_agents}} voice agents', 2, true),
      (v_premium_package_id, 'api_access', 'API Access', '{{api_calls}} API calls per month', 3, true),
      (v_premium_package_id, 'support', 'Support', '{{support_type}} support', 4, true),
      (v_premium_package_id, 'analytics', 'Analytics', '{{analytics_type}} analytics dashboard', 5, false),
      (v_premium_package_id, 'custom_integrations', 'Custom Integrations', '{{integration_count}} custom integrations', 6, false)
    ON CONFLICT (package_id, feature_key) DO NOTHING;
    
    INSERT INTO public.package_variables (package_id, variable_key, variable_value, variable_type)
    VALUES
      (v_premium_package_id, 'max_voice_agents', '20', 'number'),
      (v_premium_package_id, 'api_calls', '100000', 'number'),
      (v_premium_package_id, 'support_type', 'Priority Email', 'text'),
      (v_premium_package_id, 'analytics_type', 'Advanced', 'text'),
      (v_premium_package_id, 'integration_count', '10', 'number')
    ON CONFLICT (package_id, variable_key) DO NOTHING;
  END IF;
END $$;

-- Insert features for Enterprise package
DO $$
DECLARE
  v_enterprise_package_id uuid;
BEGIN
  SELECT id INTO v_enterprise_package_id FROM public.packages WHERE slug = 'enterprise' LIMIT 1;
  
  IF v_enterprise_package_id IS NOT NULL THEN
    INSERT INTO public.package_features (package_id, feature_key, feature_label, feature_template, display_order, is_highlighted)
    VALUES
      (v_enterprise_package_id, 'credits', 'Credits Included', '{{credits}} credits per month', 1, true),
      (v_enterprise_package_id, 'voice_agents', 'Voice Agents', '{{max_voice_agents}} voice agents (unlimited)', 2, true),
      (v_enterprise_package_id, 'api_access', 'API Access', '{{api_calls}} API calls per month', 3, true),
      (v_enterprise_package_id, 'support', 'Support', '{{support_type}} support', 4, true),
      (v_enterprise_package_id, 'analytics', 'Analytics', '{{analytics_type}} analytics dashboard', 5, true),
      (v_enterprise_package_id, 'custom_integrations', 'Custom Integrations', '{{integration_count}} custom integrations', 6, true),
      (v_enterprise_package_id, 'sla', 'SLA', '{{sla_percentage}}% uptime SLA', 7, true)
    ON CONFLICT (package_id, feature_key) DO NOTHING;
    
    INSERT INTO public.package_variables (package_id, variable_key, variable_value, variable_type)
    VALUES
      (v_enterprise_package_id, 'max_voice_agents', 'Unlimited', 'text'),
      (v_enterprise_package_id, 'api_calls', 'Unlimited', 'text'),
      (v_enterprise_package_id, 'support_type', '24/7 Phone & Email', 'text'),
      (v_enterprise_package_id, 'analytics_type', 'Enterprise', 'text'),
      (v_enterprise_package_id, 'integration_count', 'Unlimited', 'text'),
      (v_enterprise_package_id, 'sla_percentage', '99.9', 'number')
    ON CONFLICT (package_id, variable_key) DO NOTHING;
  END IF;
END $$;

-- ============================================================
-- NOTES
-- ============================================================
-- 1. Features use templates with {{variable}} placeholders
-- 2. Variables are stored separately and replaced when rendering
-- 3. Built-in variables: {{credits}}, {{price_monthly}}, {{price_yearly}}, {{currency}}
-- 4. Custom variables can be added per package
-- 5. Use render_package_feature() function to get rendered feature text
-- 6. Features are ordered by display_order
-- 7. Highlighted features can be shown prominently in UI
-- ============================================================
