-- ============================================================
-- FIX AVATAR UPLOAD ISSUES
-- 1. Adds avatar_url column to admin_profiles
-- 2. Fixes trigger to allow updates to existing admin profiles
-- ============================================================
-- Run this in your Supabase SQL Editor
-- ============================================================

-- Step 1: Add avatar_url column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'admin_profiles' 
    AND column_name = 'avatar_url'
  ) THEN
    ALTER TABLE public.admin_profiles 
    ADD COLUMN avatar_url text NULL;
    
    -- Add comment
    COMMENT ON COLUMN public.admin_profiles.avatar_url IS 'URL to admin avatar image stored in Supabase Storage (avatars bucket)';
  END IF;
END $$;

-- Step 2: Fix the trigger to allow updates to existing admin profiles
-- This prevents the trigger from blocking avatar_url updates
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
  RETURN NEW;
END;
$$;

-- ============================================================
-- NOTES
-- ============================================================
-- This fix:
-- 1. Adds the avatar_url column to admin_profiles table
-- 2. Updates the trigger to allow UPDATEs to existing admin profiles
-- 3. Still prevents inserting consumers with meaningful data into admin_profiles
-- 4. Still allows converting empty consumer profiles to admin profiles
--
-- After running this, you should be able to upload avatars without errors.
-- ============================================================
