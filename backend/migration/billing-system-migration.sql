-- ============================================================
-- BILLING, INVOICES & PAYMENTS SYSTEM
-- Complete migration for consumer billing functionality
-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- Note: gen_random_uuid() is available by default in PostgreSQL 13+ and Supabase
-- No extension needed for UUID generation

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Function to generate next invoice number
-- Drop function if it exists (with CASCADE to handle dependencies)
-- Note: DROP is needed because CREATE OR REPLACE cannot change return type
DROP FUNCTION IF EXISTS public.generate_invoice_number() CASCADE;

CREATE FUNCTION public.generate_invoice_number()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  prefix TEXT;
  sequence_number INTEGER;
  next_number TEXT;
BEGIN
  -- Get prefix and current sequence from invoice_settings
  SELECT 
    COALESCE(invoice_number_prefix, 'INV'),
    COALESCE(invoice_number_sequence, 0) + 1
  INTO prefix, sequence_number
  FROM public.invoice_settings
  WHERE is_active = true
  LIMIT 1;
  
  -- If no settings found, use defaults
  IF prefix IS NULL THEN
    prefix := 'INV';
    sequence_number := 1;
  END IF;
  
  -- Format: PREFIX-YYYYMMDD-000001
  next_number := prefix || '-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' || LPAD(sequence_number::TEXT, 6, '0');
  
  -- Update sequence in settings
  UPDATE public.invoice_settings
  SET invoice_number_sequence = sequence_number,
      updated_at = now()
  WHERE is_active = true;
  
  RETURN next_number;
END;
$$;

-- ============================================================
-- INVOICE TEMPLATES / SETTINGS TABLE
-- Stores company info, tax/VAT settings, numbering sequence
-- ============================================================

CREATE TABLE IF NOT EXISTS public.invoice_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  company_name character varying(255) NOT NULL,
  company_address jsonb NOT NULL DEFAULT '{}'::jsonb,
  company_phone character varying(50) NULL,
  company_email character varying(255) NULL,
  company_website character varying(255) NULL,
  company_logo_url text NULL,
  tax_id character varying(100) NULL,
  vat_number character varying(100) NULL,
  default_tax_rate numeric(5, 4) NULL DEFAULT 0,
  default_currency character varying(3) NULL DEFAULT 'USD'::character varying,
  invoice_number_prefix character varying(20) NULL DEFAULT 'INV'::character varying,
  invoice_number_sequence integer NULL DEFAULT 0,
  invoice_footer_text text NULL,
  payment_terms text NULL,
  bank_account_details jsonb NULL DEFAULT '{}'::jsonb,
  is_active boolean NULL DEFAULT true,
  created_by uuid NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT invoice_settings_pkey PRIMARY KEY (id),
  CONSTRAINT invoice_settings_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.admin_profiles(id)
);

CREATE INDEX IF NOT EXISTS idx_invoice_settings_active ON public.invoice_settings USING btree (is_active) WHERE is_active = true;

DROP TRIGGER IF EXISTS update_invoice_settings_updated_at ON public.invoice_settings;
CREATE TRIGGER update_invoice_settings_updated_at
  BEFORE UPDATE ON public.invoice_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- INVOICES TABLE
-- Main invoices table (provided by user)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.invoices (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  invoice_number character varying(50) NOT NULL,
  invoice_date date NOT NULL,
  due_date date NULL,
  purchase_id uuid NULL,
  subscription_id uuid NULL,
  subtotal numeric(10, 2) NOT NULL,
  discount_amount numeric(10, 2) NULL DEFAULT 0,
  discount_code character varying(50) NULL,
  tax_rate numeric(5, 4) NULL DEFAULT 0,
  tax_amount numeric(10, 2) NULL DEFAULT 0,
  total_amount numeric(10, 2) NOT NULL,
  currency character varying(3) NULL DEFAULT 'USD'::character varying,
  status character varying(20) NOT NULL DEFAULT 'draft'::character varying,
  paid_at timestamp with time zone NULL,
  billing_address jsonb NULL,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  pdf_url text NULL,
  pdf_generated_at timestamp with time zone NULL,
  email_sent boolean NULL DEFAULT false,
  email_sent_at timestamp with time zone NULL,
  notes text NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  metadata jsonb NULL DEFAULT '{}'::jsonb,
  CONSTRAINT invoices_pkey PRIMARY KEY (id),
  CONSTRAINT invoices_invoice_number_key UNIQUE (invoice_number),
  CONSTRAINT invoices_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT invoices_status_check CHECK (
    (status)::text = ANY (
      (ARRAY[
        'draft'::character varying,
        'sent'::character varying,
        'paid'::character varying,
        'overdue'::character varying,
        'cancelled'::character varying
      ])::text[]
    )
  )
);

-- Note: Foreign keys to purchases and user_subscriptions are commented out
-- Uncomment when those tables exist:
-- CONSTRAINT invoices_purchase_id_fkey FOREIGN KEY (purchase_id) REFERENCES purchases(id),
-- CONSTRAINT invoices_subscription_id_fkey FOREIGN KEY (subscription_id) REFERENCES user_subscriptions(id),

CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON public.invoices USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_number ON public.invoices USING btree (invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices USING btree (status);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_date ON public.invoices USING btree (invoice_date DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_purchase_id ON public.invoices USING btree (purchase_id) WHERE purchase_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_invoices_subscription_id ON public.invoices USING btree (subscription_id) WHERE subscription_id IS NOT NULL;

DROP TRIGGER IF EXISTS update_invoices_updated_at ON public.invoices;
CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- TRIGGER FUNCTION: Auto-create email log when invoice is sent
-- ============================================================

CREATE OR REPLACE FUNCTION public.trigger_invoice_email_on_sent()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_email TEXT;
BEGIN
  -- Only process if status is 'sent' and email hasn't been sent yet
  IF NEW.status = 'sent' AND (NEW.email_sent IS NULL OR NEW.email_sent = false) THEN
    -- Get user email from auth.users
    SELECT email INTO user_email
    FROM auth.users
    WHERE id = NEW.user_id;
    
    -- Only create email log if user email exists
    IF user_email IS NOT NULL THEN
      -- Create email log entry with status 'pending'
      INSERT INTO public.invoice_email_logs (
        invoice_id,
        user_id,
        recipient_email,
        email_type,
        status,
        created_at
      ) VALUES (
        NEW.id,
        NEW.user_id,
        user_email,
        'invoice',
        'pending',
        now()
      );
      
      -- Update invoice email_sent flag (will be set to true after email is actually sent)
      -- We don't set it to true here because email hasn't been sent yet
      -- The application will update this after successfully sending
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for INSERT (when invoice is created with status 'sent')
DROP TRIGGER IF EXISTS trigger_invoice_email_on_insert ON public.invoices;
CREATE TRIGGER trigger_invoice_email_on_insert
  AFTER INSERT ON public.invoices
  FOR EACH ROW
  WHEN (NEW.status = 'sent')
  EXECUTE FUNCTION public.trigger_invoice_email_on_sent();

-- Create trigger for UPDATE (when invoice status changes to 'sent')
DROP TRIGGER IF EXISTS trigger_invoice_email_on_update ON public.invoices;
CREATE TRIGGER trigger_invoice_email_on_update
  AFTER UPDATE ON public.invoices
  FOR EACH ROW
  WHEN (OLD.status != 'sent' AND NEW.status = 'sent' AND (NEW.email_sent IS NULL OR NEW.email_sent = false))
  EXECUTE FUNCTION public.trigger_invoice_email_on_sent();

-- ============================================================
-- PAYMENT HISTORY TABLE
-- Tracks all payments and subscription renewals
-- ============================================================

CREATE TABLE IF NOT EXISTS public.payment_history (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  invoice_id uuid NULL,
  purchase_id uuid NULL,
  subscription_id uuid NULL,
  payment_method character varying(50) NOT NULL,
  payment_provider character varying(50) NULL,
  payment_provider_transaction_id character varying(255) NULL,
  amount numeric(10, 2) NOT NULL,
  currency character varying(3) NULL DEFAULT 'USD'::character varying,
  status character varying(20) NOT NULL DEFAULT 'pending'::character varying,
  payment_date timestamp with time zone NULL,
  processed_at timestamp with time zone NULL,
  failure_reason text NULL,
  payment_details jsonb NULL DEFAULT '{}'::jsonb,
  is_refunded boolean NULL DEFAULT false,
  refund_amount numeric(10, 2) NULL DEFAULT 0,
  refunded_at timestamp with time zone NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  metadata jsonb NULL DEFAULT '{}'::jsonb,
  CONSTRAINT payment_history_pkey PRIMARY KEY (id),
  CONSTRAINT payment_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT payment_history_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.invoices(id) ON DELETE SET NULL,
  CONSTRAINT payment_history_status_check CHECK (
    (status)::text = ANY (
      (ARRAY[
        'pending'::character varying,
        'processing'::character varying,
        'completed'::character varying,
        'failed'::character varying,
        'cancelled'::character varying,
        'refunded'::character varying
      ])::text[]
    )
  )
);

-- Note: Foreign keys to purchases and user_subscriptions are commented out
-- Uncomment when those tables exist:
-- CONSTRAINT payment_history_purchase_id_fkey FOREIGN KEY (purchase_id) REFERENCES purchases(id),
-- CONSTRAINT payment_history_subscription_id_fkey FOREIGN KEY (subscription_id) REFERENCES user_subscriptions(id),

CREATE INDEX IF NOT EXISTS idx_payment_history_user_id ON public.payment_history USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_payment_history_invoice_id ON public.payment_history USING btree (invoice_id) WHERE invoice_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_payment_history_status ON public.payment_history USING btree (status);
CREATE INDEX IF NOT EXISTS idx_payment_history_payment_date ON public.payment_history USING btree (payment_date DESC);
CREATE INDEX IF NOT EXISTS idx_payment_history_provider_transaction_id ON public.payment_history USING btree (payment_provider_transaction_id) WHERE payment_provider_transaction_id IS NOT NULL;

DROP TRIGGER IF EXISTS update_payment_history_updated_at ON public.payment_history;
CREATE TRIGGER update_payment_history_updated_at
  BEFORE UPDATE ON public.payment_history
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- REFUND / DISPUTE NOTES TABLE
-- Tracks refunds and disputes (even for external payments)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.refund_dispute_notes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  invoice_id uuid NULL,
  payment_id uuid NULL,
  type character varying(20) NOT NULL,
  amount numeric(10, 2) NOT NULL,
  currency character varying(3) NULL DEFAULT 'USD'::character varying,
  status character varying(20) NOT NULL DEFAULT 'pending'::character varying,
  reason text NOT NULL,
  notes text NULL,
  admin_notes text NULL,
  processed_by uuid NULL,
  processed_at timestamp with time zone NULL,
  external_reference character varying(255) NULL,
  payment_provider_refund_id character varying(255) NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  metadata jsonb NULL DEFAULT '{}'::jsonb,
  CONSTRAINT refund_dispute_notes_pkey PRIMARY KEY (id),
  CONSTRAINT refund_dispute_notes_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT refund_dispute_notes_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.invoices(id) ON DELETE SET NULL,
  CONSTRAINT refund_dispute_notes_payment_id_fkey FOREIGN KEY (payment_id) REFERENCES public.payment_history(id) ON DELETE SET NULL,
  CONSTRAINT refund_dispute_notes_processed_by_fkey FOREIGN KEY (processed_by) REFERENCES public.admin_profiles(id),
  CONSTRAINT refund_dispute_notes_type_check CHECK (
    (type)::text = ANY (
      (ARRAY[
        'refund'::character varying,
        'dispute'::character varying,
        'chargeback'::character varying
      ])::text[]
    )
  ),
  CONSTRAINT refund_dispute_notes_status_check CHECK (
    (status)::text = ANY (
      (ARRAY[
        'pending'::character varying,
        'approved'::character varying,
        'rejected'::character varying,
        'processed'::character varying,
        'cancelled'::character varying
      ])::text[]
    )
  )
);

CREATE INDEX IF NOT EXISTS idx_refund_dispute_notes_user_id ON public.refund_dispute_notes USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_refund_dispute_notes_invoice_id ON public.refund_dispute_notes USING btree (invoice_id) WHERE invoice_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_refund_dispute_notes_payment_id ON public.refund_dispute_notes USING btree (payment_id) WHERE payment_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_refund_dispute_notes_status ON public.refund_dispute_notes USING btree (status);
CREATE INDEX IF NOT EXISTS idx_refund_dispute_notes_type ON public.refund_dispute_notes USING btree (type);
CREATE INDEX IF NOT EXISTS idx_refund_dispute_notes_created_at ON public.refund_dispute_notes USING btree (created_at DESC);

DROP TRIGGER IF EXISTS update_refund_dispute_notes_updated_at ON public.refund_dispute_notes;
CREATE TRIGGER update_refund_dispute_notes_updated_at
  BEFORE UPDATE ON public.refund_dispute_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- COUPON / DISCOUNT CODES TABLE
-- Manages discount codes (percentage/fixed, expiry, usage limit)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.coupon_codes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  code character varying(50) NOT NULL,
  description text NULL,
  discount_type character varying(20) NOT NULL,
  discount_value numeric(10, 2) NOT NULL,
  minimum_purchase_amount numeric(10, 2) NULL,
  maximum_discount_amount numeric(10, 2) NULL,
  currency character varying(3) NULL DEFAULT 'USD'::character varying,
  valid_from timestamp with time zone NULL DEFAULT now(),
  valid_until timestamp with time zone NULL,
  usage_limit integer NULL,
  usage_count integer NULL DEFAULT 0,
  per_user_limit integer NULL DEFAULT 1,
  is_active boolean NULL DEFAULT true,
  applicable_to character varying(50) NULL,
  created_by uuid NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  metadata jsonb NULL DEFAULT '{}'::jsonb,
  CONSTRAINT coupon_codes_pkey PRIMARY KEY (id),
  CONSTRAINT coupon_codes_code_key UNIQUE (code),
  CONSTRAINT coupon_codes_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.admin_profiles(id),
  CONSTRAINT coupon_codes_discount_type_check CHECK (
    (discount_type)::text = ANY (
      (ARRAY[
        'percentage'::character varying,
        'fixed'::character varying
      ])::text[]
    )
  ),
  CONSTRAINT coupon_codes_applicable_to_check CHECK (
    (applicable_to IS NULL) OR
    ((applicable_to)::text = ANY (
      (ARRAY[
        'all'::character varying,
        'subscriptions'::character varying,
        'purchases'::character varying,
        'specific_product'::character varying
      ])::text[]
    ))
  )
);

CREATE INDEX IF NOT EXISTS idx_coupon_codes_code ON public.coupon_codes USING btree (code);
CREATE INDEX IF NOT EXISTS idx_coupon_codes_active ON public.coupon_codes USING btree (is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_coupon_codes_valid_dates ON public.coupon_codes USING btree (valid_from, valid_until);

DROP TRIGGER IF EXISTS update_coupon_codes_updated_at ON public.coupon_codes;
CREATE TRIGGER update_coupon_codes_updated_at
  BEFORE UPDATE ON public.coupon_codes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- COUPON USAGE TRACKING TABLE
-- Tracks which users have used which coupons
-- ============================================================

CREATE TABLE IF NOT EXISTS public.coupon_usage (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  coupon_id uuid NOT NULL,
  user_id uuid NOT NULL,
  invoice_id uuid NULL,
  purchase_id uuid NULL,
  discount_amount numeric(10, 2) NOT NULL,
  used_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT coupon_usage_pkey PRIMARY KEY (id),
  CONSTRAINT coupon_usage_coupon_id_fkey FOREIGN KEY (coupon_id) REFERENCES public.coupon_codes(id) ON DELETE CASCADE,
  CONSTRAINT coupon_usage_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT coupon_usage_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.invoices(id) ON DELETE SET NULL
);

-- Note: Foreign key to purchases is commented out
-- Uncomment when purchases table exists:
-- CONSTRAINT coupon_usage_purchase_id_fkey FOREIGN KEY (purchase_id) REFERENCES purchases(id),

CREATE INDEX IF NOT EXISTS idx_coupon_usage_coupon_id ON public.coupon_usage USING btree (coupon_id);
CREATE INDEX IF NOT EXISTS idx_coupon_usage_user_id ON public.coupon_usage USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_coupon_usage_invoice_id ON public.coupon_usage USING btree (invoice_id) WHERE invoice_id IS NOT NULL;

-- ============================================================
-- EMAIL DELIVERY LOGS TABLE
-- Tracks invoice email delivery attempts and status
-- ============================================================

CREATE TABLE IF NOT EXISTS public.invoice_email_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL,
  user_id uuid NOT NULL,
  recipient_email character varying(255) NOT NULL,
  email_type character varying(50) NULL DEFAULT 'invoice'::character varying,
  status character varying(20) NOT NULL DEFAULT 'pending'::character varying,
  sent_at timestamp with time zone NULL,
  delivered_at timestamp with time zone NULL,
  opened_at timestamp with time zone NULL,
  clicked_at timestamp with time zone NULL,
  bounced boolean NULL DEFAULT false,
  bounce_reason text NULL,
  error_message text NULL,
  email_provider character varying(50) NULL,
  email_provider_message_id character varying(255) NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  metadata jsonb NULL DEFAULT '{}'::jsonb,
  CONSTRAINT invoice_email_logs_pkey PRIMARY KEY (id),
  CONSTRAINT invoice_email_logs_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.invoices(id) ON DELETE CASCADE,
  CONSTRAINT invoice_email_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT invoice_email_logs_status_check CHECK (
    (status)::text = ANY (
      (ARRAY[
        'pending'::character varying,
        'sent'::character varying,
        'delivered'::character varying,
        'failed'::character varying,
        'bounced'::character varying
      ])::text[]
    )
  )
);

CREATE INDEX IF NOT EXISTS idx_invoice_email_logs_invoice_id ON public.invoice_email_logs USING btree (invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_email_logs_user_id ON public.invoice_email_logs USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_invoice_email_logs_status ON public.invoice_email_logs USING btree (status);
CREATE INDEX IF NOT EXISTS idx_invoice_email_logs_sent_at ON public.invoice_email_logs USING btree (sent_at DESC);

-- ============================================================
-- ENABLE ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE public.invoice_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.refund_dispute_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupon_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupon_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_email_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RLS POLICIES
-- ============================================================

-- Invoice Settings: Only admins can read/write
DROP POLICY IF EXISTS "Admins can manage invoice settings" ON public.invoice_settings;
CREATE POLICY "Admins can manage invoice settings"
  ON public.invoice_settings
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_profiles
      WHERE id = auth.uid() AND is_active = true
    )
  );

-- Invoices: Users can read their own invoices, admins can read all
DROP POLICY IF EXISTS "Users can read own invoices" ON public.invoices;
CREATE POLICY "Users can read own invoices"
  ON public.invoices
  FOR SELECT
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.admin_profiles
      WHERE id = auth.uid() AND is_active = true
    )
  );

DROP POLICY IF EXISTS "Admins can manage invoices" ON public.invoices;
CREATE POLICY "Admins can manage invoices"
  ON public.invoices
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_profiles
      WHERE id = auth.uid() AND is_active = true
    )
  );

-- Payment History: Users can read their own payments, admins can read all
DROP POLICY IF EXISTS "Users can read own payment history" ON public.payment_history;
CREATE POLICY "Users can read own payment history"
  ON public.payment_history
  FOR SELECT
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.admin_profiles
      WHERE id = auth.uid() AND is_active = true
    )
  );

DROP POLICY IF EXISTS "Admins can manage payment history" ON public.payment_history;
CREATE POLICY "Admins can manage payment history"
  ON public.payment_history
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_profiles
      WHERE id = auth.uid() AND is_active = true
    )
  );

-- Refund/Dispute Notes: Users can read their own, admins can manage all
DROP POLICY IF EXISTS "Users can read own refund disputes" ON public.refund_dispute_notes;
CREATE POLICY "Users can read own refund disputes"
  ON public.refund_dispute_notes
  FOR SELECT
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.admin_profiles
      WHERE id = auth.uid() AND is_active = true
    )
  );

DROP POLICY IF EXISTS "Users can create refund disputes" ON public.refund_dispute_notes;
CREATE POLICY "Users can create refund disputes"
  ON public.refund_dispute_notes
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can manage refund disputes" ON public.refund_dispute_notes;
CREATE POLICY "Admins can manage refund disputes"
  ON public.refund_dispute_notes
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_profiles
      WHERE id = auth.uid() AND is_active = true
    )
  );

-- Coupon Codes: Everyone can read active coupons, admins can manage all
DROP POLICY IF EXISTS "Everyone can read active coupon codes" ON public.coupon_codes;
CREATE POLICY "Everyone can read active coupon codes"
  ON public.coupon_codes
  FOR SELECT
  USING (
    is_active = true AND
    (valid_until IS NULL OR valid_until >= now()) AND
    (valid_from IS NULL OR valid_from <= now())
  );

DROP POLICY IF EXISTS "Admins can manage coupon codes" ON public.coupon_codes;
CREATE POLICY "Admins can manage coupon codes"
  ON public.coupon_codes
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_profiles
      WHERE id = auth.uid() AND is_active = true
    )
  );

-- Coupon Usage: Users can read their own usage, admins can read all
DROP POLICY IF EXISTS "Users can read own coupon usage" ON public.coupon_usage;
CREATE POLICY "Users can read own coupon usage"
  ON public.coupon_usage
  FOR SELECT
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.admin_profiles
      WHERE id = auth.uid() AND is_active = true
    )
  );

DROP POLICY IF EXISTS "System can create coupon usage" ON public.coupon_usage;
CREATE POLICY "System can create coupon usage"
  ON public.coupon_usage
  FOR INSERT
  WITH CHECK (true);

-- Invoice Email Logs: Users can read their own logs, admins can read all
DROP POLICY IF EXISTS "Users can read own email logs" ON public.invoice_email_logs;
CREATE POLICY "Users can read own email logs"
  ON public.invoice_email_logs
  FOR SELECT
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.admin_profiles
      WHERE id = auth.uid() AND is_active = true
    )
  );

DROP POLICY IF EXISTS "System can create email logs" ON public.invoice_email_logs;
CREATE POLICY "System can create email logs"
  ON public.invoice_email_logs
  FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can update email logs" ON public.invoice_email_logs;
CREATE POLICY "Admins can update email logs"
  ON public.invoice_email_logs
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_profiles
      WHERE id = auth.uid() AND is_active = true
    )
  );

-- ============================================================
-- INITIAL DATA SETUP (DUMMY DATA)
-- ============================================================

-- Insert default invoice settings
-- Only insert if no active settings exist
INSERT INTO public.invoice_settings (
  company_name,
  company_address,
  company_email,
  company_phone,
  company_website,
  tax_id,
  vat_number,
  invoice_number_prefix,
  invoice_number_sequence,
  default_tax_rate,
  default_currency,
  invoice_footer_text,
  payment_terms,
  is_active
)
SELECT 
  'Outbond Inc.',
  '{"street": "123 Business St", "city": "San Francisco", "state": "CA", "zip": "94105", "country": "United States"}'::jsonb,
  'billing@outbond.com',
  '+1-555-0123',
  'https://outbond.com',
  'TAX-123456789',
  'VAT-US-123456',
  'INV',
  0,
  0.10,
  'USD',
  'Thank you for your business!',
  'Payment is due within 30 days of invoice date.',
  true
WHERE NOT EXISTS (
  SELECT 1 FROM public.invoice_settings WHERE is_active = true
);

-- Insert sample coupon codes (only if they don't exist)
INSERT INTO public.coupon_codes (
  code,
  description,
  discount_type,
  discount_value,
  minimum_purchase_amount,
  maximum_discount_amount,
  currency,
  valid_from,
  valid_until,
  usage_limit,
  usage_count,
  per_user_limit,
  is_active,
  applicable_to
)
SELECT 
  'WELCOME10',
  'Welcome discount for new customers',
  'percentage',
  10.00,
  50.00,
  100.00,
  'USD',
  now(),
  (now() + INTERVAL '1 year'),
  1000,
  0,
  1,
  true,
  'all'
WHERE NOT EXISTS (SELECT 1 FROM public.coupon_codes WHERE code = 'WELCOME10');

INSERT INTO public.coupon_codes (
  code,
  description,
  discount_type,
  discount_value,
  minimum_purchase_amount,
  maximum_discount_amount,
  currency,
  valid_from,
  valid_until,
  usage_limit,
  usage_count,
  per_user_limit,
  is_active,
  applicable_to
)
SELECT 
  'SAVE50',
  'Fixed $50 off on purchases over $200',
  'fixed',
  50.00,
  200.00,
  50.00,
  'USD',
  now(),
  (now() + INTERVAL '6 months'),
  500,
  0,
  1,
  true,
  'all'
WHERE NOT EXISTS (SELECT 1 FROM public.coupon_codes WHERE code = 'SAVE50');

INSERT INTO public.coupon_codes (
  code,
  description,
  discount_type,
  discount_value,
  minimum_purchase_amount,
  maximum_discount_amount,
  currency,
  valid_from,
  valid_until,
  usage_limit,
  usage_count,
  per_user_limit,
  is_active,
  applicable_to
)
SELECT 
  'SUBSCRIPTION20',
  '20% off on subscription plans',
  'percentage',
  20.00,
  0.00,
  NULL,
  'USD',
  now(),
  (now() + INTERVAL '3 months'),
  200,
  0,
  1,
  true,
  'subscriptions'
WHERE NOT EXISTS (SELECT 1 FROM public.coupon_codes WHERE code = 'SUBSCRIPTION20');

-- ============================================================
-- NOTES
-- ============================================================
-- 1. Foreign keys to 'purchases' and 'user_subscriptions' tables are commented out
--    Uncomment them when those tables are created
-- 2. The invoice_number generation function uses invoice_settings table
--    Make sure to insert initial settings before generating invoices
-- 3. RLS policies allow users to read their own data and admins to manage all
-- 4. Adjust RLS policies based on your security requirements
-- 5. Consider adding additional indexes based on your query patterns
-- ============================================================
