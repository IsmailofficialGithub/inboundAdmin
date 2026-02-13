-- ============================================================
-- KNOWLEDGE BASE SYSTEM MIGRATION
-- Tables for knowledge bases, documents, and FAQs
-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- ============================================================
-- KNOWLEDGE BASES TABLE
-- Knowledge base containers
-- ============================================================

CREATE TABLE IF NOT EXISTS public.knowledge_bases (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  name character varying NOT NULL,
  description text,
  status character varying DEFAULT 'active'::character varying CHECK (status::text = ANY (ARRAY['active'::character varying, 'inactive'::character varying, 'archived'::character varying]::text[])),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  deleted_at timestamp with time zone,
  metadata jsonb DEFAULT '{}'::jsonb,
  CONSTRAINT knowledge_bases_pkey PRIMARY KEY (id),
  CONSTRAINT knowledge_bases_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_knowledge_bases_user_id ON public.knowledge_bases USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_bases_status ON public.knowledge_bases USING btree (status);

DROP TRIGGER IF EXISTS update_knowledge_bases_updated_at ON public.knowledge_bases;
CREATE TRIGGER update_knowledge_bases_updated_at
  BEFORE UPDATE ON public.knowledge_bases
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- KNOWLEDGE BASE DOCUMENTS TABLE
-- Knowledge base document storage
-- ============================================================

CREATE TABLE IF NOT EXISTS public.knowledge_base_documents (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  knowledge_base_id uuid NOT NULL,
  name character varying NOT NULL,
  file_type character varying,
  file_url text NOT NULL,
  file_size bigint,
  storage_path text,
  description text,
  uploaded_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  deleted_at timestamp with time zone,
  CONSTRAINT knowledge_base_documents_pkey PRIMARY KEY (id),
  CONSTRAINT knowledge_base_documents_knowledge_base_id_fkey FOREIGN KEY (knowledge_base_id) REFERENCES public.knowledge_bases(id)
);

CREATE INDEX IF NOT EXISTS idx_knowledge_base_documents_kb_id ON public.knowledge_base_documents USING btree (knowledge_base_id);

DROP TRIGGER IF EXISTS update_knowledge_base_documents_updated_at ON public.knowledge_base_documents;
CREATE TRIGGER update_knowledge_base_documents_updated_at
  BEFORE UPDATE ON public.knowledge_base_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- KNOWLEDGE BASE FAQS TABLE
-- Knowledge base FAQ entries
-- ============================================================

CREATE TABLE IF NOT EXISTS public.knowledge_base_faqs (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  knowledge_base_id uuid NOT NULL,
  question text NOT NULL,
  answer text NOT NULL,
  category character varying,
  priority integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  deleted_at timestamp with time zone,
  display_order integer DEFAULT 0,
  CONSTRAINT knowledge_base_faqs_pkey PRIMARY KEY (id),
  CONSTRAINT knowledge_base_faqs_knowledge_base_id_fkey FOREIGN KEY (knowledge_base_id) REFERENCES public.knowledge_bases(id)
);

CREATE INDEX IF NOT EXISTS idx_knowledge_base_faqs_kb_id ON public.knowledge_base_faqs USING btree (knowledge_base_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_faqs_category ON public.knowledge_base_faqs USING btree (category);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_faqs_display_order ON public.knowledge_base_faqs USING btree (display_order);

DROP TRIGGER IF EXISTS update_knowledge_base_faqs_updated_at ON public.knowledge_base_faqs;
CREATE TRIGGER update_knowledge_base_faqs_updated_at
  BEFORE UPDATE ON public.knowledge_base_faqs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- ENABLE ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE public.knowledge_bases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_base_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_base_faqs ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- NOTES
-- ============================================================
-- 1. Documents can be uploaded and stored in cloud storage
-- 2. FAQs can be categorized and ordered for display
-- 3. Knowledge bases can be linked to voice agents
-- ============================================================
