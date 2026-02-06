-- ============================================================
-- QUICK FIX: Allow admin creation for users with empty user_profiles
-- Run this in Supabase SQL Editor to fix the immediate issue
-- ============================================================

-- Update the trigger function to be more lenient
CREATE OR REPLACE FUNCTION public.prevent_consumer_in_admin_profiles()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  has_meaningful_data boolean;
BEGIN
  -- Check if user exists in user_profiles and has meaningful data
  -- Only check for non-empty values to allow auto-created empty profiles
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

  -- Only prevent if user has meaningful consumer data
  -- Empty/auto-created profiles can be converted to admin
  IF has_meaningful_data THEN
    RAISE EXCEPTION 'User with id % is a consumer user with profile data and cannot be in admin_profiles table', NEW.id;
  END IF;
  
  -- If user exists in user_profiles but has no meaningful data, allow admin creation
  -- The application code will delete the empty profile before inserting
  RETURN NEW;
END;
$$;

-- ============================================================
-- If you still get errors, you can manually delete empty profiles:
-- ============================================================

-- Find users with empty profiles that should be admins:
-- SELECT id, email, first_name, last_name, phone, country_code
-- FROM public.user_profiles
-- WHERE (first_name IS NULL OR first_name = '')
--   AND (last_name IS NULL OR last_name = '')
--   AND (phone IS NULL OR phone = '')
--   AND (country_code IS NULL OR country_code = '');

-- Delete a specific empty profile (replace with actual user ID):
-- DELETE FROM public.user_profiles WHERE id = 'fde0a653-3e3b-4b89-8486-c5bb59ea2be2';
