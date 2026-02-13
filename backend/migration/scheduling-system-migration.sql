-- ============================================================
-- SCHEDULING SYSTEM MIGRATION
-- Tables for call schedules, availability, holidays, etc.
-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- ============================================================
-- AGENT SCHEDULES TABLE
-- Agent schedule assignments
-- ============================================================

CREATE TABLE IF NOT EXISTS public.agent_schedules (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL,
  schedule_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT agent_schedules_pkey PRIMARY KEY (id),
  CONSTRAINT agent_schedules_agent_id_fkey FOREIGN KEY (agent_id) REFERENCES public.voice_agents(id),
  CONSTRAINT agent_schedules_schedule_id_fkey FOREIGN KEY (schedule_id) REFERENCES public.call_schedules(id)
);

CREATE INDEX IF NOT EXISTS idx_agent_schedules_agent_id ON public.agent_schedules USING btree (agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_schedules_schedule_id ON public.agent_schedules USING btree (schedule_id);

-- ============================================================
-- CALL SCHEDULES TABLE
-- Call schedule configuration
-- ============================================================

CREATE TABLE IF NOT EXISTS public.call_schedules (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  agent_id uuid,
  schedule_name character varying NOT NULL,
  timezone character varying NOT NULL DEFAULT 'America/New_York'::character varying,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  deleted_at timestamp with time zone,
  CONSTRAINT call_schedules_pkey PRIMARY KEY (id),
  CONSTRAINT call_schedules_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT call_schedules_agent_id_fkey FOREIGN KEY (agent_id) REFERENCES public.voice_agents(id)
);

CREATE INDEX IF NOT EXISTS idx_call_schedules_user_id ON public.call_schedules USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_call_schedules_agent_id ON public.call_schedules USING btree (agent_id) WHERE agent_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_call_schedules_is_active ON public.call_schedules USING btree (is_active) WHERE is_active = true;

DROP TRIGGER IF EXISTS update_call_schedules_updated_at ON public.call_schedules;
CREATE TRIGGER update_call_schedules_updated_at
  BEFORE UPDATE ON public.call_schedules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- WEEKLY AVAILABILITY TABLE
-- Weekly availability schedule (Mon-Sun with time ranges)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.weekly_availability (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  schedule_id uuid NOT NULL,
  day_of_week integer NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  is_available boolean NOT NULL DEFAULT false,
  start_time time without time zone NOT NULL,
  end_time time without time zone NOT NULL,
  break_start_time time without time zone,
  break_end_time time without time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT weekly_availability_pkey PRIMARY KEY (id),
  CONSTRAINT weekly_availability_schedule_id_fkey FOREIGN KEY (schedule_id) REFERENCES public.call_schedules(id)
);

CREATE INDEX IF NOT EXISTS idx_weekly_availability_schedule_id ON public.weekly_availability USING btree (schedule_id, day_of_week);

DROP TRIGGER IF EXISTS update_weekly_availability_updated_at ON public.weekly_availability;
CREATE TRIGGER update_weekly_availability_updated_at
  BEFORE UPDATE ON public.weekly_availability
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- SCHEDULE OVERRIDES TABLE
-- Schedule override exceptions
-- ============================================================

CREATE TABLE IF NOT EXISTS public.schedule_overrides (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  schedule_id uuid NOT NULL,
  override_date date NOT NULL,
  is_available boolean NOT NULL DEFAULT false,
  start_time time without time zone,
  end_time time without time zone,
  override_reason character varying,
  message_text text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT schedule_overrides_pkey PRIMARY KEY (id),
  CONSTRAINT schedule_overrides_schedule_id_fkey FOREIGN KEY (schedule_id) REFERENCES public.call_schedules(id)
);

CREATE INDEX IF NOT EXISTS idx_schedule_overrides_schedule_id ON public.schedule_overrides USING btree (schedule_id, override_date);

DROP TRIGGER IF EXISTS update_schedule_overrides_updated_at ON public.schedule_overrides;
CREATE TRIGGER update_schedule_overrides_updated_at
  BEFORE UPDATE ON public.schedule_overrides
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- AFTER HOURS MESSAGES TABLE
-- After-hours message configuration
-- ============================================================

CREATE TABLE IF NOT EXISTS public.after_hours_messages (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  schedule_id uuid NOT NULL UNIQUE,
  message_text text NOT NULL,
  message_type character varying NOT NULL DEFAULT 'voicemail'::character varying CHECK (message_type::text = ANY (ARRAY['voicemail'::character varying, 'redirect'::character varying, 'callback_request'::character varying]::text[])),
  redirect_phone_number character varying,
  callback_enabled boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT after_hours_messages_pkey PRIMARY KEY (id),
  CONSTRAINT after_hours_messages_schedule_id_fkey FOREIGN KEY (schedule_id) REFERENCES public.call_schedules(id)
);

CREATE INDEX IF NOT EXISTS idx_after_hours_messages_schedule_id ON public.after_hours_messages USING btree (schedule_id);

DROP TRIGGER IF EXISTS update_after_hours_messages_updated_at ON public.after_hours_messages;
CREATE TRIGGER update_after_hours_messages_updated_at
  BEFORE UPDATE ON public.after_hours_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- HOLIDAYS TABLE
-- Holiday calendar
-- ============================================================

CREATE TABLE IF NOT EXISTS public.holidays (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid,
  holiday_name character varying NOT NULL,
  holiday_date date NOT NULL,
  is_recurring boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  deleted_at timestamp with time zone,
  CONSTRAINT holidays_pkey PRIMARY KEY (id),
  CONSTRAINT holidays_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_holidays_user_id ON public.holidays USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_holidays_holiday_date ON public.holidays USING btree (holiday_date);

DROP TRIGGER IF EXISTS update_holidays_updated_at ON public.holidays;
CREATE TRIGGER update_holidays_updated_at
  BEFORE UPDATE ON public.holidays
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- HOLIDAY MESSAGES TABLE
-- Holiday-specific messages
-- ============================================================

CREATE TABLE IF NOT EXISTS public.holiday_messages (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  holiday_id uuid NOT NULL,
  message_text text NOT NULL,
  message_type character varying NOT NULL DEFAULT 'greeting'::character varying CHECK (message_type::text = ANY (ARRAY['greeting'::character varying, 'voicemail'::character varying, 'redirect'::character varying]::text[])),
  redirect_phone_number character varying,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT holiday_messages_pkey PRIMARY KEY (id),
  CONSTRAINT holiday_messages_holiday_id_fkey FOREIGN KEY (holiday_id) REFERENCES public.holidays(id)
);

CREATE INDEX IF NOT EXISTS idx_holiday_messages_holiday_id ON public.holiday_messages USING btree (holiday_id);

DROP TRIGGER IF EXISTS update_holiday_messages_updated_at ON public.holiday_messages;
CREATE TRIGGER update_holiday_messages_updated_at
  BEFORE UPDATE ON public.holiday_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- ENABLE ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE public.agent_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.after_hours_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.holidays ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.holiday_messages ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- NOTES
-- ============================================================
-- 1. day_of_week: 0 = Sunday, 1 = Monday, ..., 6 = Saturday
-- 2. Schedule overrides take precedence over weekly availability
-- 3. Holidays can be user-specific or global (user_id = NULL)
-- ============================================================
