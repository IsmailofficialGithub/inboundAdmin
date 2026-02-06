-- ============================================================
-- ADD PACKAGE SUPPORT TO INVOICES
-- Adds package_id field to invoices table for package-based invoicing
-- ============================================================

-- Add package_id column to invoices table
ALTER TABLE public.invoices 
ADD COLUMN IF NOT EXISTS package_id uuid NULL;

-- Add foreign key constraint
ALTER TABLE public.invoices
ADD CONSTRAINT invoices_package_id_fkey 
FOREIGN KEY (package_id) REFERENCES public.packages(id) ON DELETE SET NULL;

-- Add index for package_id
CREATE INDEX IF NOT EXISTS idx_invoices_package_id 
ON public.invoices USING btree (package_id) 
WHERE package_id IS NOT NULL;

-- Add comment
COMMENT ON COLUMN public.invoices.package_id IS 'Reference to the package this invoice is based on';
