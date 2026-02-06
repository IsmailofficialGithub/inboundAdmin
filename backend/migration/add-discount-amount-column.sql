-- ============================================================
-- ADD MISSING COLUMNS TO invoices TABLE
-- Run this in your Supabase SQL Editor if columns are missing
-- Adds: discount_amount, discount_code, notes
-- ============================================================

-- Add discount_amount column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'invoices' 
    AND column_name = 'discount_amount'
  ) THEN
    ALTER TABLE public.invoices 
    ADD COLUMN discount_amount numeric(10, 2) NULL DEFAULT 0;
    
    RAISE NOTICE 'Added discount_amount column to invoices table';
  ELSE
    RAISE NOTICE 'discount_amount column already exists in invoices table';
  END IF;
END $$;

-- Add discount_code column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'invoices' 
    AND column_name = 'discount_code'
  ) THEN
    ALTER TABLE public.invoices 
    ADD COLUMN discount_code character varying(50) NULL;
    
    RAISE NOTICE 'Added discount_code column to invoices table';
  ELSE
    RAISE NOTICE 'discount_code column already exists in invoices table';
  END IF;
END $$;

-- Add notes column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'invoices' 
    AND column_name = 'notes'
  ) THEN
    ALTER TABLE public.invoices 
    ADD COLUMN notes text NULL;
    
    RAISE NOTICE 'Added notes column to invoices table';
  ELSE
    RAISE NOTICE 'notes column already exists in invoices table';
  END IF;
END $$;

-- Add notes column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'invoices' 
    AND column_name = 'notes'
  ) THEN
    ALTER TABLE public.invoices 
    ADD COLUMN notes text NULL;
    
    RAISE NOTICE 'Added notes column to invoices table';
  ELSE
    RAISE NOTICE 'notes column already exists in invoices table';
  END IF;
END $$;
