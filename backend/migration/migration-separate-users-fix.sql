-- ============================================================
-- FIX: Update trigger to allow admin creation for auto-created profiles
-- Run this AFTER the main migration if you're getting errors
-- ============================================================

-- Update the function to be more lenient with auto-created profiles
CREATE OR REPLACE FUNCTION public.prevent_consumer_in_admin_profiles()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  has_meaningful_data boolean;
BEGIN
  -- Check if user exists in user_profiles and has meaningful data
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
  -- The application code will delete the empty profile first
  RETURN NEW;
END;
$$;

-- The trigger is already created, so we just need to update the function above
-- No need to recreate the trigger
