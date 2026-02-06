-- ============================================================
-- SUPPORT & OPERATIONS TOOLS SCHEMA
-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- ============================================================
-- 1. SUPPORT TICKETS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  subject varchar(255) NOT NULL,
  description text NOT NULL,
  status varchar(50) NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  priority varchar(50) NOT NULL DEFAULT 'medium'
    CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  assigned_to uuid, -- admin_id who is handling the ticket
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  resolved_at timestamptz,
  closed_at timestamptz,
  CONSTRAINT support_tickets_pkey PRIMARY KEY (id),
  CONSTRAINT support_tickets_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT support_tickets_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.admin_profiles(id) ON DELETE SET NULL
);

-- Support ticket notes (internal notes for admins)
CREATE TABLE IF NOT EXISTS public.support_ticket_notes (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  ticket_id uuid NOT NULL,
  admin_id uuid NOT NULL,
  note text NOT NULL,
  is_internal boolean DEFAULT true, -- true = internal note, false = visible to user
  created_at timestamptz DEFAULT now(),
  CONSTRAINT support_ticket_notes_pkey PRIMARY KEY (id),
  CONSTRAINT support_ticket_notes_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  CONSTRAINT support_ticket_notes_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES public.admin_profiles(id) ON DELETE CASCADE
);

-- ============================================================
-- 2. KYC/COMPANY INFO MODERATION
-- ============================================================
-- Add company fields to user_profiles if they don't exist
DO $$ 
BEGIN
  -- Add company_name if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'user_profiles' 
                 AND column_name = 'company_name') THEN
    ALTER TABLE public.user_profiles ADD COLUMN company_name varchar(255);
  END IF;

  -- Add company_registration_number if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'user_profiles' 
                 AND column_name = 'company_registration_number') THEN
    ALTER TABLE public.user_profiles ADD COLUMN company_registration_number varchar(100);
  END IF;

  -- Add company_address if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'user_profiles' 
                 AND column_name = 'company_address') THEN
    ALTER TABLE public.user_profiles ADD COLUMN company_address text;
  END IF;

  -- Add company_website if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'user_profiles' 
                 AND column_name = 'company_website') THEN
    ALTER TABLE public.user_profiles ADD COLUMN company_website varchar(255);
  END IF;

  -- Add company_tax_id if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'user_profiles' 
                 AND column_name = 'company_tax_id') THEN
    ALTER TABLE public.user_profiles ADD COLUMN company_tax_id varchar(100);
  END IF;

  -- Add kyc_status if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'user_profiles' 
                 AND column_name = 'kyc_status') THEN
    ALTER TABLE public.user_profiles ADD COLUMN kyc_status varchar(50) DEFAULT 'pending'
      CHECK (kyc_status IN ('pending', 'under_review', 'approved', 'rejected', 'needs_info'));
  END IF;

  -- Add kyc_verified_at if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'user_profiles' 
                 AND column_name = 'kyc_verified_at') THEN
    ALTER TABLE public.user_profiles ADD COLUMN kyc_verified_at timestamptz;
  END IF;

  -- Add kyc_verified_by if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'user_profiles' 
                 AND column_name = 'kyc_verified_by') THEN
    ALTER TABLE public.user_profiles ADD COLUMN kyc_verified_by uuid
      REFERENCES public.admin_profiles(id) ON DELETE SET NULL;
  END IF;

  -- Add kyc_rejection_reason if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'user_profiles' 
                 AND column_name = 'kyc_rejection_reason') THEN
    ALTER TABLE public.user_profiles ADD COLUMN kyc_rejection_reason text;
  END IF;
END $$;

-- KYC moderation history
CREATE TABLE IF NOT EXISTS public.kyc_moderation_history (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  admin_id uuid NOT NULL,
  action varchar(50) NOT NULL, -- 'approved', 'rejected', 'requested_info', 'updated'
  previous_status varchar(50),
  new_status varchar(50),
  notes text,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT kyc_moderation_history_pkey PRIMARY KEY (id),
  CONSTRAINT kyc_moderation_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT kyc_moderation_history_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES public.admin_profiles(id) ON DELETE CASCADE
);

-- ============================================================
-- 3. FEATURE FLAGS / TOGGLES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.feature_flags (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name varchar(100) NOT NULL UNIQUE,
  description text,
  enabled boolean DEFAULT false,
  enabled_for_roles jsonb DEFAULT '[]', -- Array of roles that can access this feature, empty = all
  metadata jsonb DEFAULT '{}', -- Additional config for the feature
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES public.admin_profiles(id) ON DELETE SET NULL,
  CONSTRAINT feature_flags_pkey PRIMARY KEY (id)
);

-- Feature flag change history
CREATE TABLE IF NOT EXISTS public.feature_flag_history (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  feature_flag_id uuid NOT NULL,
  admin_id uuid NOT NULL,
  action varchar(50) NOT NULL, -- 'enabled', 'disabled', 'updated'
  previous_value jsonb,
  new_value jsonb,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT feature_flag_history_pkey PRIMARY KEY (id),
  CONSTRAINT feature_flag_history_feature_flag_id_fkey FOREIGN KEY (feature_flag_id) REFERENCES public.feature_flags(id) ON DELETE CASCADE,
  CONSTRAINT feature_flag_history_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES public.admin_profiles(id) ON DELETE CASCADE
);

-- ============================================================
-- 4. SYSTEM SETTINGS (Maintenance & Read-only Mode)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.system_settings (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  key varchar(100) NOT NULL UNIQUE,
  value jsonb NOT NULL DEFAULT '{}',
  description text,
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES public.admin_profiles(id) ON DELETE SET NULL,
  CONSTRAINT system_settings_pkey PRIMARY KEY (id)
);

-- Insert default system settings
INSERT INTO public.system_settings (key, value, description)
VALUES 
  ('maintenance_mode', '{"enabled": false, "message": "System is under maintenance. Please check back soon."}', 'Maintenance mode toggle and message'),
  ('read_only_mode', '{"enabled": false, "message": "System is in read-only mode. Some operations are temporarily disabled."}', 'Read-only mode toggle and message')
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id ON public.support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON public.support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_assigned_to ON public.support_tickets(assigned_to);
CREATE INDEX IF NOT EXISTS idx_support_ticket_notes_ticket_id ON public.support_ticket_notes(ticket_id);
CREATE INDEX IF NOT EXISTS idx_kyc_moderation_history_user_id ON public.kyc_moderation_history(user_id);
CREATE INDEX IF NOT EXISTS idx_feature_flags_name ON public.feature_flags(name);
CREATE INDEX IF NOT EXISTS idx_feature_flag_history_feature_flag_id ON public.feature_flag_history(feature_flag_id);
CREATE INDEX IF NOT EXISTS idx_system_settings_key ON public.system_settings(key);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_ticket_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kyc_moderation_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_flag_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for support_tickets
CREATE POLICY "Admins can view all tickets"
  ON public.support_tickets FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_profiles
      WHERE admin_profiles.id = auth.uid() AND admin_profiles.is_active = true
    )
  );

CREATE POLICY "Admins can create tickets"
  ON public.support_tickets FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admin_profiles
      WHERE admin_profiles.id = auth.uid() AND admin_profiles.is_active = true
    )
  );

CREATE POLICY "Admins can update tickets"
  ON public.support_tickets FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_profiles
      WHERE admin_profiles.id = auth.uid() AND admin_profiles.is_active = true
    )
  );

-- RLS Policies for support_ticket_notes
CREATE POLICY "Admins can view ticket notes"
  ON public.support_ticket_notes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_profiles
      WHERE admin_profiles.id = auth.uid() AND admin_profiles.is_active = true
    )
  );

CREATE POLICY "Admins can create ticket notes"
  ON public.support_ticket_notes FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admin_profiles
      WHERE admin_profiles.id = auth.uid() AND admin_profiles.is_active = true
    )
  );

-- RLS Policies for kyc_moderation_history
CREATE POLICY "Admins can view KYC history"
  ON public.kyc_moderation_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_profiles
      WHERE admin_profiles.id = auth.uid() AND admin_profiles.is_active = true
    )
  );

CREATE POLICY "Admins can create KYC history"
  ON public.kyc_moderation_history FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admin_profiles
      WHERE admin_profiles.id = auth.uid() AND admin_profiles.is_active = true
    )
  );

-- RLS Policies for feature_flags
CREATE POLICY "Admins can view feature flags"
  ON public.feature_flags FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_profiles
      WHERE admin_profiles.id = auth.uid() AND admin_profiles.is_active = true
    )
  );

CREATE POLICY "Super admins can manage feature flags"
  ON public.feature_flags FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_profiles
      WHERE admin_profiles.id = auth.uid() 
        AND admin_profiles.is_active = true 
        AND admin_profiles.role = 'super_admin'
    )
  );

-- RLS Policies for feature_flag_history
CREATE POLICY "Admins can view feature flag history"
  ON public.feature_flag_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_profiles
      WHERE admin_profiles.id = auth.uid() AND admin_profiles.is_active = true
    )
  );

-- RLS Policies for system_settings
CREATE POLICY "Admins can view system settings"
  ON public.system_settings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_profiles
      WHERE admin_profiles.id = auth.uid() AND admin_profiles.is_active = true
    )
  );

CREATE POLICY "Super admins can manage system settings"
  ON public.system_settings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_profiles
      WHERE admin_profiles.id = auth.uid() 
        AND admin_profiles.is_active = true 
        AND admin_profiles.role = 'super_admin'
    )
  );

-- ============================================================
-- TRIGGERS
-- ============================================================
-- Update updated_at timestamp for support_tickets
CREATE OR REPLACE FUNCTION update_support_tickets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_support_tickets_updated_at ON public.support_tickets;
CREATE TRIGGER trigger_update_support_tickets_updated_at
  BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION update_support_tickets_updated_at();

-- Update updated_at timestamp for feature_flags
CREATE OR REPLACE FUNCTION update_feature_flags_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_feature_flags_updated_at ON public.feature_flags;
CREATE TRIGGER trigger_update_feature_flags_updated_at
  BEFORE UPDATE ON public.feature_flags
  FOR EACH ROW
  EXECUTE FUNCTION update_feature_flags_updated_at();

-- Update updated_at timestamp for system_settings
CREATE OR REPLACE FUNCTION update_system_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_system_settings_updated_at ON public.system_settings;
CREATE TRIGGER trigger_update_system_settings_updated_at
  BEFORE UPDATE ON public.system_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_system_settings_updated_at();
