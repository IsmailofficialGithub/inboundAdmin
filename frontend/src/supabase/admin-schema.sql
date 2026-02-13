-- ============================================================
-- ADMIN PANEL TABLES
-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- Admin profiles table (gates who can log into the admin panel)
CREATE TABLE public.admin_profiles (
  id uuid NOT NULL,
  email varchar NOT NULL,
  first_name varchar,
  last_name varchar,
  role varchar NOT NULL DEFAULT 'support'
    CHECK (role IN ('super_admin', 'finance', 'support', 'ops')),
  is_active boolean DEFAULT true,
  last_login_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT admin_profiles_pkey PRIMARY KEY (id),
  CONSTRAINT admin_profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);

-- Admin activity log (audit trail: who changed what, when)
CREATE TABLE public.admin_activity_log (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  admin_id uuid NOT NULL,
  action varchar NOT NULL,
  target_type varchar,        -- e.g. 'user', 'setting'
  target_id uuid,             -- e.g. user_id being modified
  details jsonb DEFAULT '{}', -- additional context
  ip_address inet,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT admin_activity_log_pkey PRIMARY KEY (id),
  CONSTRAINT admin_activity_log_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES admin_profiles(id)
);

-- Enable RLS
ALTER TABLE public.admin_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_activity_log ENABLE ROW LEVEL SECURITY;

-- RLS policies: only authenticated admins can read their own profile
CREATE POLICY "Admins can read own profile"
  ON public.admin_profiles FOR SELECT
  USING (auth.uid() = id);

-- RLS policy: allow admins to read activity log
CREATE POLICY "Admins can read activity log"
  ON public.admin_activity_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_profiles
      WHERE admin_profiles.id = auth.uid() AND admin_profiles.is_active = true
    )
  );

-- RLS policy: allow admins to insert activity log
CREATE POLICY "Admins can insert activity log"
  ON public.admin_activity_log FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admin_profiles
      WHERE admin_profiles.id = auth.uid() AND admin_profiles.is_active = true
    )
  );

-- ============================================================
-- IMPORTANT: After creating these tables, insert your first
-- super_admin row manually:
--
-- INSERT INTO public.admin_profiles (id, email, role)
-- VALUES (
--   'your-auth-user-uuid-here',
--   'admin@yourdomain.com',
--   'super_admin'
-- );
-- ============================================================
