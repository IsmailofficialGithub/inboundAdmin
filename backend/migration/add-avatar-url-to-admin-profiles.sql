-- ============================================================
-- ADD AVATAR_URL COLUMN TO ADMIN_PROFILES
-- Adds avatar_url column to store Supabase Storage avatar URLs
-- ============================================================

-- Add avatar_url column if it doesn't exist
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

-- ============================================================
-- NOTES
-- ============================================================
-- Avatar URLs will be in format:
-- https://{project}.supabase.co/storage/v1/object/public/avatars/{admin_id}/avatar-{timestamp}.jpg
-- ============================================================
