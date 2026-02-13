-- ============================================================
-- MIGRATION: Separate Consumer and Admin Users
-- This migration ensures users can only be in ONE profile table
-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- Step 1: Create a function to check if a user is an admin
CREATE OR REPLACE FUNCTION public.is_admin_user(user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_profiles
    WHERE id = user_id AND is_active = true
  );
$$;

-- Step 2: Create a function to prevent user_profiles creation for admins
-- This will be used in a trigger
CREATE OR REPLACE FUNCTION public.prevent_admin_in_user_profiles()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- If this user is an admin, prevent insertion into user_profiles
  IF public.is_admin_user(NEW.id) THEN
    RAISE EXCEPTION 'User with id % is an admin and cannot be in user_profiles table', NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

-- Step 3: Create a trigger to prevent admins from being added to user_profiles
DROP TRIGGER IF EXISTS prevent_admin_in_user_profiles_trigger ON public.user_profiles;
CREATE TRIGGER prevent_admin_in_user_profiles_trigger
  BEFORE INSERT OR UPDATE ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_admin_in_user_profiles();

-- Step 4: Create a function to prevent admin_profiles creation for consumer users
-- This function will check if user has meaningful data in user_profiles
-- If it's just an auto-created empty profile, we'll allow admin creation
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

-- Step 5: Create a trigger to prevent consumer users from being added to admin_profiles
DROP TRIGGER IF EXISTS prevent_consumer_in_admin_profiles_trigger ON public.admin_profiles;
CREATE TRIGGER prevent_consumer_in_admin_profiles_trigger
  BEFORE INSERT OR UPDATE ON public.admin_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_consumer_in_admin_profiles();

-- Step 6: Clean up any existing conflicts (users in both tables)
-- This will delete from user_profiles if they exist in admin_profiles
-- WARNING: Review this carefully before running in production!
-- Uncomment the following lines if you want to clean up existing data:

-- DELETE FROM public.user_profiles
-- WHERE id IN (
--   SELECT id FROM public.admin_profiles
-- );

-- ============================================================
-- VERIFICATION QUERIES
-- Run these to verify the migration worked:
-- ============================================================

-- Check for users in both tables (should return 0 rows after cleanup)
-- SELECT up.id, up.first_name, ap.email, ap.role
-- FROM public.user_profiles up
-- INNER JOIN public.admin_profiles ap ON up.id = ap.id;

-- Test the is_admin_user function
-- SELECT public.is_admin_user('your-admin-user-id-here');

-- ============================================================
-- NOTES:
-- 1. This migration prevents the same user from being in both tables
-- 2. If a user is created as an admin, they cannot be in user_profiles
-- 3. If a user is created as a consumer, they cannot be in admin_profiles
-- 4. The triggers will automatically enforce this at the database level
-- ============================================================
