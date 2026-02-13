-- ============================================================
-- FIX: Allow updates to admin_profiles for existing admins
-- The trigger was blocking updates (like avatar_url) for admins
-- who might have an entry in user_profiles
-- ============================================================

-- Update the function to allow updates to existing admin profiles
CREATE OR REPLACE FUNCTION public.prevent_consumer_in_admin_profiles()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  has_meaningful_data boolean;
  is_existing_admin boolean;
BEGIN
  -- If this is an UPDATE and the record already exists in admin_profiles, allow it
  -- This allows updating fields like avatar_url, first_name, last_name, etc.
  IF TG_OP = 'UPDATE' THEN
    -- Check if this user already exists as an admin
    SELECT EXISTS (
      SELECT 1 FROM public.admin_profiles
      WHERE id = NEW.id
    ) INTO is_existing_admin;
    
    -- If they're already an admin, allow the update
    IF is_existing_admin THEN
      RETURN NEW;
    END IF;
  END IF;
  
  -- For INSERT operations, check if user exists in user_profiles and has meaningful data
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = NEW.id
      AND (
        (first_name IS NOT NULL AND first_name != '') OR
        (last_name IS NOT NULL AND last_name != '') OR
        (phone IS NOT NULL AND phone != '') OR
        (country_code IS NOT NULL AND country_code != '') OR
        (account_status IS NOT NULL AND account_status != 'active')
      )
  ) INTO has_meaningful_data;

  -- Only prevent INSERT if user has meaningful consumer data
  -- Empty/auto-created profiles can be converted to admin
  IF has_meaningful_data THEN
    RAISE EXCEPTION 'User with id % is a consumer user with profile data and cannot be in admin_profiles table', NEW.id;
  END IF;
  
  -- If user exists in user_profiles but has no meaningful data, allow admin creation
  -- The application code will delete the empty profile first
  RETURN NEW;
END;
$$;

-- ============================================================
-- NOTES
-- ============================================================
-- This fix allows:
-- 1. Updates to existing admin_profiles records (for avatar_url, name changes, etc.)
-- 2. Still prevents inserting consumers with meaningful data into admin_profiles
-- 3. Still allows converting empty consumer profiles to admin profiles
-- ============================================================
