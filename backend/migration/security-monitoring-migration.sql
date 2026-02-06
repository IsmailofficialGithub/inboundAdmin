-- ============================================================
-- SECURITY & MONITORING SYSTEM MIGRATION
-- Complete security, audit, and monitoring functionality
-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- ============================================================
-- ENHANCED ADMIN AUDIT LOGS
-- Tracks all critical admin changes with before/after values
-- ============================================================

-- Add severity and change tracking columns to existing admin_activity_log
ALTER TABLE public.admin_activity_log 
ADD COLUMN IF NOT EXISTS severity varchar DEFAULT 'info' 
  CHECK (severity IN ('info', 'warning', 'critical')),
ADD COLUMN IF NOT EXISTS old_values jsonb,
ADD COLUMN IF NOT EXISTS new_values jsonb,
ADD COLUMN IF NOT EXISTS user_agent text,
ADD COLUMN IF NOT EXISTS session_id varchar;

-- Create index for severity-based queries
CREATE INDEX IF NOT EXISTS idx_admin_activity_log_severity 
  ON public.admin_activity_log(severity, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_admin_activity_log_critical 
  ON public.admin_activity_log(created_at DESC) 
  WHERE severity = 'critical';

-- ============================================================
-- WEBHOOK SIGNATURE ENFORCEMENT SETTINGS
-- Configures webhook signature validation per provider
-- ============================================================

CREATE TABLE IF NOT EXISTS public.webhook_security_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  provider_name varchar NOT NULL, -- e.g., 'twilio', 'vonage', 'custom'
  webhook_endpoint varchar NOT NULL,
  secret_key varchar NOT NULL, -- encrypted/hashed secret
  signature_algorithm varchar NOT NULL DEFAULT 'hmac_sha256',
  is_enabled boolean NOT NULL DEFAULT true,
  require_signature boolean NOT NULL DEFAULT true,
  allowed_ips cidr[], -- Optional IP allowlist for webhook source
  rate_limit_per_minute integer DEFAULT 60,
  last_validated_at timestamptz,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT webhook_security_settings_pkey PRIMARY KEY (id),
  CONSTRAINT webhook_security_settings_provider_endpoint_key UNIQUE (provider_name, webhook_endpoint),
  CONSTRAINT webhook_security_settings_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.admin_profiles(id)
);

CREATE INDEX IF NOT EXISTS idx_webhook_security_settings_provider 
  ON public.webhook_security_settings(provider_name, is_enabled);

CREATE INDEX IF NOT EXISTS idx_webhook_security_settings_endpoint 
  ON public.webhook_security_settings(webhook_endpoint);

DROP TRIGGER IF EXISTS update_webhook_security_settings_updated_at ON public.webhook_security_settings;
CREATE TRIGGER update_webhook_security_settings_updated_at
  BEFORE UPDATE ON public.webhook_security_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- WEBHOOK REQUEST LOGS
-- Tracks all webhook requests for audit and abuse detection
-- ============================================================

CREATE TABLE IF NOT EXISTS public.webhook_request_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  provider_name varchar NOT NULL,
  webhook_endpoint varchar NOT NULL,
  request_method varchar NOT NULL DEFAULT 'POST',
  request_headers jsonb DEFAULT '{}',
  request_body jsonb DEFAULT '{}',
  request_ip inet,
  signature_valid boolean,
  signature_error text,
  response_status integer,
  response_body jsonb,
  processing_time_ms integer,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT webhook_request_logs_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_webhook_request_logs_provider 
  ON public.webhook_request_logs(provider_name, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_webhook_request_logs_endpoint 
  ON public.webhook_request_logs(webhook_endpoint, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_webhook_request_logs_ip 
  ON public.webhook_request_logs(request_ip, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_webhook_request_logs_created_at 
  ON public.webhook_request_logs(created_at DESC);

-- ============================================================
-- IP ALLOWLIST FOR ADMIN ACCESS
-- Optional IP-based access control for admin panel
-- ============================================================

CREATE TABLE IF NOT EXISTS public.admin_ip_allowlist (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  admin_id uuid,
  ip_address cidr NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT admin_ip_allowlist_pkey PRIMARY KEY (id),
  CONSTRAINT admin_ip_allowlist_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES public.admin_profiles(id) ON DELETE CASCADE,
  CONSTRAINT admin_ip_allowlist_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.admin_profiles(id)
);

-- Global IP allowlist (applies to all admins)
CREATE TABLE IF NOT EXISTS public.global_ip_allowlist (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  ip_address cidr NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT global_ip_allowlist_pkey PRIMARY KEY (id),
  CONSTRAINT global_ip_allowlist_ip_address_key UNIQUE (ip_address),
  CONSTRAINT global_ip_allowlist_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.admin_profiles(id)
);

CREATE INDEX IF NOT EXISTS idx_admin_ip_allowlist_admin 
  ON public.admin_ip_allowlist(admin_id, is_active);

CREATE INDEX IF NOT EXISTS idx_admin_ip_allowlist_ip 
  ON public.admin_ip_allowlist(ip_address);

CREATE INDEX IF NOT EXISTS idx_global_ip_allowlist_active 
  ON public.global_ip_allowlist(is_active) WHERE is_active = true;

DROP TRIGGER IF EXISTS update_admin_ip_allowlist_updated_at ON public.admin_ip_allowlist;
CREATE TRIGGER update_admin_ip_allowlist_updated_at
  BEFORE UPDATE ON public.admin_ip_allowlist
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_global_ip_allowlist_updated_at ON public.global_ip_allowlist;
CREATE TRIGGER update_global_ip_allowlist_updated_at
  BEFORE UPDATE ON public.global_ip_allowlist
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- DATA RETENTION CONFIGURATION
-- Configures retention policies for recordings, transcripts, etc.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.data_retention_config (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  data_type varchar NOT NULL, -- 'call_recordings', 'transcripts', 'call_history', 'logs', etc.
  retention_days integer NOT NULL, -- 0 = keep forever
  auto_delete_enabled boolean NOT NULL DEFAULT false,
  archive_before_delete boolean NOT NULL DEFAULT false,
  archive_location text, -- S3 bucket, etc.
  last_cleanup_run timestamptz,
  last_cleanup_count integer DEFAULT 0,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT data_retention_config_pkey PRIMARY KEY (id),
  CONSTRAINT data_retention_config_data_type_key UNIQUE (data_type),
  CONSTRAINT data_retention_config_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.admin_profiles(id)
);

CREATE INDEX IF NOT EXISTS idx_data_retention_config_type 
  ON public.data_retention_config(data_type);

DROP TRIGGER IF EXISTS update_data_retention_config_updated_at ON public.data_retention_config;
CREATE TRIGGER update_data_retention_config_updated_at
  BEFORE UPDATE ON public.data_retention_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default retention configs
INSERT INTO public.data_retention_config (data_type, retention_days, auto_delete_enabled, archive_before_delete, created_at)
VALUES 
  ('call_recordings', 365, false, true, now()),
  ('transcripts', 365, false, true, now()),
  ('call_history', 730, false, false, now()),
  ('webhook_logs', 90, true, false, now()),
  ('admin_activity_log', 1095, false, false, now())
ON CONFLICT (data_type) DO NOTHING;

-- ============================================================
-- BACKUP STATUS MONITORING
-- Tracks backup operations and status
-- ============================================================

CREATE TABLE IF NOT EXISTS public.backup_status (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  backup_type varchar NOT NULL, -- 'database', 'files', 'recordings', etc.
  backup_location text NOT NULL,
  backup_size_bytes bigint,
  status varchar NOT NULL DEFAULT 'pending',
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  duration_seconds integer,
  error_message text,
  metadata jsonb DEFAULT '{}',
  created_by uuid,
  CONSTRAINT backup_status_pkey PRIMARY KEY (id),
  CONSTRAINT backup_status_status_check CHECK (
    status IN ('pending', 'in_progress', 'completed', 'failed', 'cancelled')
  ),
  CONSTRAINT backup_status_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.admin_profiles(id)
);

CREATE INDEX IF NOT EXISTS idx_backup_status_type 
  ON public.backup_status(backup_type, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_backup_status_status 
  ON public.backup_status(status, started_at DESC);

-- ============================================================
-- ABUSE DETECTION TABLES
-- Detects suspicious patterns: call spikes, failed logins, webhook floods
-- ============================================================

-- Failed login attempts tracking
CREATE TABLE IF NOT EXISTS public.failed_login_attempts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  email varchar,
  ip_address inet NOT NULL,
  user_agent text,
  failure_reason text,
  is_admin boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT failed_login_attempts_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_failed_login_attempts_email 
  ON public.failed_login_attempts(email, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_failed_login_attempts_ip 
  ON public.failed_login_attempts(ip_address, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_failed_login_attempts_created_at 
  ON public.failed_login_attempts(created_at DESC);

-- Abuse detection alerts
CREATE TABLE IF NOT EXISTS public.abuse_detection_alerts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  alert_type varchar NOT NULL, -- 'call_spike', 'failed_login_flood', 'webhook_flood', 'suspicious_activity'
  severity varchar NOT NULL DEFAULT 'medium',
  entity_type varchar, -- 'user', 'ip_address', 'provider', etc.
  entity_id varchar, -- user_id, IP, provider name, etc.
  threshold_value numeric,
  actual_value numeric,
  time_window_minutes integer,
  description text NOT NULL,
  status varchar NOT NULL DEFAULT 'open', -- 'open', 'investigating', 'resolved', 'false_positive'
  resolved_by uuid,
  resolved_at timestamptz,
  resolution_notes text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  CONSTRAINT abuse_detection_alerts_pkey PRIMARY KEY (id),
  CONSTRAINT abuse_detection_alerts_severity_check CHECK (
    severity IN ('low', 'medium', 'high', 'critical')
  ),
  CONSTRAINT abuse_detection_alerts_status_check CHECK (
    status IN ('open', 'investigating', 'resolved', 'false_positive', 'ignored')
  ),
  CONSTRAINT abuse_detection_alerts_resolved_by_fkey FOREIGN KEY (resolved_by) REFERENCES public.admin_profiles(id)
);

CREATE INDEX IF NOT EXISTS idx_abuse_detection_alerts_type 
  ON public.abuse_detection_alerts(alert_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_abuse_detection_alerts_status 
  ON public.abuse_detection_alerts(status, severity, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_abuse_detection_alerts_entity 
  ON public.abuse_detection_alerts(entity_type, entity_id, created_at DESC);

-- Call spike detection tracking
CREATE TABLE IF NOT EXISTS public.call_spike_detection (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  agent_id uuid,
  time_window_start timestamptz NOT NULL,
  time_window_end timestamptz NOT NULL,
  call_count integer NOT NULL,
  threshold_count integer NOT NULL,
  average_calls_per_hour numeric,
  is_alerted boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT call_spike_detection_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_call_spike_detection_user 
  ON public.call_spike_detection(user_id, time_window_start DESC);

CREATE INDEX IF NOT EXISTS idx_call_spike_detection_agent 
  ON public.call_spike_detection(agent_id, time_window_start DESC);

CREATE INDEX IF NOT EXISTS idx_call_spike_detection_time 
  ON public.call_spike_detection(time_window_start, time_window_end);

-- ============================================================
-- ENABLE ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE public.webhook_security_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_request_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_ip_allowlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.global_ip_allowlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_retention_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backup_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.failed_login_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.abuse_detection_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_spike_detection ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RLS POLICIES
-- ============================================================

-- Webhook Security Settings: Only admins can manage
DROP POLICY IF EXISTS "Admins can manage webhook security settings" ON public.webhook_security_settings;
CREATE POLICY "Admins can manage webhook security settings"
  ON public.webhook_security_settings
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_profiles
      WHERE id = auth.uid() AND is_active = true
    )
  );

-- Webhook Request Logs: Only admins can read
DROP POLICY IF EXISTS "Admins can read webhook request logs" ON public.webhook_request_logs;
CREATE POLICY "Admins can read webhook request logs"
  ON public.webhook_request_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_profiles
      WHERE id = auth.uid() AND is_active = true
    )
  );

-- System can insert webhook logs (for webhook endpoints)
DROP POLICY IF EXISTS "System can insert webhook logs" ON public.webhook_request_logs;
CREATE POLICY "System can insert webhook logs"
  ON public.webhook_request_logs
  FOR INSERT
  WITH CHECK (true);

-- Admin IP Allowlist: Only admins can manage
DROP POLICY IF EXISTS "Admins can manage admin IP allowlist" ON public.admin_ip_allowlist;
CREATE POLICY "Admins can manage admin IP allowlist"
  ON public.admin_ip_allowlist
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_profiles
      WHERE id = auth.uid() AND is_active = true
    )
  );

-- Global IP Allowlist: Only admins can manage
DROP POLICY IF EXISTS "Admins can manage global IP allowlist" ON public.global_ip_allowlist;
CREATE POLICY "Admins can manage global IP allowlist"
  ON public.global_ip_allowlist
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_profiles
      WHERE id = auth.uid() AND is_active = true
    )
  );

-- Data Retention Config: Only admins can manage
DROP POLICY IF EXISTS "Admins can manage data retention config" ON public.data_retention_config;
CREATE POLICY "Admins can manage data retention config"
  ON public.data_retention_config
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_profiles
      WHERE id = auth.uid() AND is_active = true
    )
  );

-- Backup Status: Only admins can read/manage
DROP POLICY IF EXISTS "Admins can manage backup status" ON public.backup_status;
CREATE POLICY "Admins can manage backup status"
  ON public.backup_status
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_profiles
      WHERE id = auth.uid() AND is_active = true
    )
  );

-- Failed Login Attempts: Only admins can read
DROP POLICY IF EXISTS "Admins can read failed login attempts" ON public.failed_login_attempts;
CREATE POLICY "Admins can read failed login attempts"
  ON public.failed_login_attempts
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_profiles
      WHERE id = auth.uid() AND is_active = true
    )
  );

-- System can insert failed login attempts
DROP POLICY IF EXISTS "System can insert failed login attempts" ON public.failed_login_attempts;
CREATE POLICY "System can insert failed login attempts"
  ON public.failed_login_attempts
  FOR INSERT
  WITH CHECK (true);

-- Abuse Detection Alerts: Only admins can read/manage
DROP POLICY IF EXISTS "Admins can manage abuse detection alerts" ON public.abuse_detection_alerts;
CREATE POLICY "Admins can manage abuse detection alerts"
  ON public.abuse_detection_alerts
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_profiles
      WHERE id = auth.uid() AND is_active = true
    )
  );

-- Call Spike Detection: Only admins can read
DROP POLICY IF EXISTS "Admins can read call spike detection" ON public.call_spike_detection;
CREATE POLICY "Admins can read call spike detection"
  ON public.call_spike_detection
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_profiles
      WHERE id = auth.uid() AND is_active = true
    )
  );

-- System can insert call spike detection
DROP POLICY IF EXISTS "System can insert call spike detection" ON public.call_spike_detection;
CREATE POLICY "System can insert call spike detection"
  ON public.call_spike_detection
  FOR INSERT
  WITH CHECK (true);

-- ============================================================
-- FUNCTIONS FOR ABUSE DETECTION
-- ============================================================

-- Function to detect failed login floods
CREATE OR REPLACE FUNCTION public.detect_failed_login_flood(
  p_ip_address inet,
  p_time_window_minutes integer DEFAULT 15,
  p_threshold_count integer DEFAULT 5
)
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  v_count integer;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM public.failed_login_attempts
  WHERE ip_address = p_ip_address
    AND created_at >= now() - (p_time_window_minutes || ' minutes')::interval;
  
  RETURN v_count >= p_threshold_count;
END;
$$;

-- Function to detect webhook floods
CREATE OR REPLACE FUNCTION public.detect_webhook_flood(
  p_provider_name varchar,
  p_webhook_endpoint varchar,
  p_time_window_minutes integer DEFAULT 5,
  p_threshold_count integer DEFAULT 100
)
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  v_count integer;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM public.webhook_request_logs
  WHERE provider_name = p_provider_name
    AND webhook_endpoint = p_webhook_endpoint
    AND created_at >= now() - (p_time_window_minutes || ' minutes')::interval;
  
  RETURN v_count >= p_threshold_count;
END;
$$;

-- Function to detect call spikes
CREATE OR REPLACE FUNCTION public.detect_call_spike(
  p_user_id uuid,
  p_time_window_hours integer DEFAULT 1,
  p_threshold_multiplier numeric DEFAULT 3.0
)
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  v_recent_count integer;
  v_historical_avg numeric;
BEGIN
  -- Get call count in recent time window
  SELECT COUNT(*) INTO v_recent_count
  FROM public.call_history
  WHERE user_id = p_user_id
    AND call_start_time >= now() - (p_time_window_hours || ' hours')::interval;
  
  -- Get historical average (last 7 days, same hour)
  SELECT AVG(hourly_count) INTO v_historical_avg
  FROM (
    SELECT COUNT(*) as hourly_count
    FROM public.call_history
    WHERE user_id = p_user_id
      AND call_start_time >= now() - INTERVAL '7 days'
      AND EXTRACT(HOUR FROM call_start_time) = EXTRACT(HOUR FROM now())
    GROUP BY DATE_TRUNC('hour', call_start_time)
  ) sub;
  
  -- If no historical data, use a default threshold
  IF v_historical_avg IS NULL OR v_historical_avg = 0 THEN
    v_historical_avg := 10; -- Default threshold
  END IF;
  
  RETURN v_recent_count >= (v_historical_avg * p_threshold_multiplier);
END;
$$;

-- ============================================================
-- NOTES
-- ============================================================
-- 1. Webhook secret keys should be encrypted at application level
-- 2. IP allowlist is optional - set is_enabled flag per admin
-- 3. Data retention cleanup should run as a scheduled job
-- 4. Abuse detection functions should be called periodically via cron
-- 5. Backup status should be updated by backup automation scripts
-- 6. Consider adding alerts/notifications for critical abuse detections
-- ============================================================
