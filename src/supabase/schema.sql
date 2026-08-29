-- ============================================================================
-- SCHEMA SQL: EMAIL MARKETING & LEAD INTELLIGENCE SAAS (SUPABASE / POSTGRESQL)
-- ============================================================================

-- 1. Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. TABELA DE ORGANIZAÇÕES / EMPRESAS (TENANTS)
CREATE TABLE IF NOT EXISTS public.tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    trade_name VARCHAR(255),
    resend_api_key TEXT,
    marketing_sender_email VARCHAR(255),
    sender_name VARCHAR(255),
    gemini_api_key TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Inserir tenant padrão se não existir
INSERT INTO public.tenants (id, name, trade_name, marketing_sender_email, sender_name)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'Kotrik Growth Labs',
    'Kotrik B2B Intelligence',
    'contato@kotrik.com.br',
    'Time Comercial Kotrik'
)
ON CONFLICT (id) DO NOTHING;

-- 3. TABELA CENTRAL DE LEADS & CRM
CREATE TABLE IF NOT EXISTS public.leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001' REFERENCES public.tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    company_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    website VARCHAR(255),
    sector VARCHAR(150),
    role VARCHAR(150),
    company_size VARCHAR(100) DEFAULT 'Tier 2 (Mid-Market)',
    city VARCHAR(150),
    province VARCHAR(100),
    country VARCHAR(100) DEFAULT 'Brasil',
    tags TEXT[] DEFAULT '{}',
    notes TEXT,
    status VARCHAR(50) DEFAULT 'new',
    opted_out BOOLEAN DEFAULT false NOT NULL,
    mx_valid BOOLEAN DEFAULT true,
    mx_record TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_lead_email_per_tenant UNIQUE (tenant_id, email)
);

-- 4. TABELA DE TRABALHOS DE PROSPECÇÃO COM IA (AI LEAD JOBS)
CREATE TABLE IF NOT EXISTS public.lead_prospecting_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001' REFERENCES public.tenants(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    keywords TEXT NOT NULL,
    location VARCHAR(255) NOT NULL,
    sector_filter VARCHAR(150),
    target_count INTEGER DEFAULT 20 NOT NULL,
    processed_count INTEGER DEFAULT 0 NOT NULL,
    found_emails_count INTEGER DEFAULT 0 NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. TABELA DE RESULTADOS DE PROSPECÇÃO (STAGING AREA)
CREATE TABLE IF NOT EXISTS public.lead_prospecting_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES public.lead_prospecting_jobs(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001' REFERENCES public.tenants(id) ON DELETE CASCADE,
    company_name VARCHAR(255) NOT NULL,
    contact_name VARCHAR(255),
    role VARCHAR(150),
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    website VARCHAR(255),
    address TEXT,
    city VARCHAR(150),
    province VARCHAR(100),
    country VARCHAR(100) DEFAULT 'Brasil',
    sector VARCHAR(150),
    company_size VARCHAR(100),
    confidence_score INTEGER DEFAULT 0,
    mx_status VARCHAR(50) DEFAULT 'unknown',
    mx_host TEXT,
    domain_active BOOLEAN DEFAULT true,
    status VARCHAR(50) DEFAULT 'raw',
    raw_reasoning TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. TABELA DE TEMPLATES DE EMAIL
CREATE TABLE IF NOT EXISTS public.marketing_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001' REFERENCES public.tenants(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    html_content TEXT NOT NULL,
    preview_text TEXT,
    variables TEXT[] DEFAULT ARRAY['{{nome}}', '{{empresa}}', '{{cargo}}', '{{cidade}}', '{{link_descadastro}}'],
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. TABELA DE CAMPANHAS DE EMAIL MARKETING
CREATE TABLE IF NOT EXISTS public.marketing_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001' REFERENCES public.tenants(id) ON DELETE CASCADE,
    template_id UUID REFERENCES public.marketing_templates(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    sender_name VARCHAR(255) NOT NULL,
    sender_email VARCHAR(255) NOT NULL,
    reply_to VARCHAR(255),
    target_audience_id UUID,
    status VARCHAR(50) DEFAULT 'draft',
    scheduled_at TIMESTAMPTZ,
    total_recipients INTEGER DEFAULT 0,
    sent_count INTEGER DEFAULT 0,
    delivered_count INTEGER DEFAULT 0,
    opened_count INTEGER DEFAULT 0,
    clicked_count INTEGER DEFAULT 0,
    bounced_count INTEGER DEFAULT 0,
    failed_count INTEGER DEFAULT 0,
    rate_limit_per_second INTEGER DEFAULT 2,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. TABELA DE FILA DE ENVIOS RESILIENTE (RESEND QUEUE)
CREATE TABLE IF NOT EXISTS public.marketing_campaign_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES public.marketing_campaigns(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
    lead_name VARCHAR(255) NOT NULL,
    lead_email VARCHAR(255) NOT NULL,
    company_name VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    resend_email_id VARCHAR(255),
    sent_at TIMESTAMPTZ,
    error_message TEXT,
    opened_at TIMESTAMPTZ,
    clicked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 9. TABELA DE AUDIÊNCIAS SALVAS (SMART SEGMENTS)
CREATE TABLE IF NOT EXISTS public.saved_audiences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001' REFERENCES public.tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    filters_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ============================================================================
-- ÍNDICES DE ALTA PERFORMANCE
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_leads_tenant ON public.leads(tenant_id);
CREATE INDEX IF NOT EXISTS idx_leads_email ON public.leads(email);
CREATE INDEX IF NOT EXISTS idx_leads_status ON public.leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_opted_out ON public.leads(opted_out);
CREATE INDEX IF NOT EXISTS idx_prospecting_job ON public.lead_prospecting_results(job_id);
CREATE INDEX IF NOT EXISTS idx_queue_campaign ON public.marketing_campaign_queue(campaign_id);
CREATE INDEX IF NOT EXISTS idx_queue_status ON public.marketing_campaign_queue(status);

-- ============================================================================
-- HABILITAR ROW LEVEL SECURITY (RLS) COM ACESSO COMPLETO AO CLIENTE
-- ============================================================================
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_prospecting_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_prospecting_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_campaign_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_audiences ENABLE ROW LEVEL SECURITY;

-- Políticas de Acesso (Drop se já existirem e recriação limpa)
DROP POLICY IF EXISTS "Public access tenants" ON public.tenants;
CREATE POLICY "Public access tenants" ON public.tenants FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access leads" ON public.leads;
CREATE POLICY "Public access leads" ON public.leads FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access jobs" ON public.lead_prospecting_jobs;
CREATE POLICY "Public access jobs" ON public.lead_prospecting_jobs FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access results" ON public.lead_prospecting_results;
CREATE POLICY "Public access results" ON public.lead_prospecting_results FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access templates" ON public.marketing_templates;
CREATE POLICY "Public access templates" ON public.marketing_templates FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access campaigns" ON public.marketing_campaigns;
CREATE POLICY "Public access campaigns" ON public.marketing_campaigns FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access queue" ON public.marketing_campaign_queue;
CREATE POLICY "Public access queue" ON public.marketing_campaign_queue FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access audiences" ON public.saved_audiences;
CREATE POLICY "Public access audiences" ON public.saved_audiences FOR ALL USING (true) WITH CHECK (true);
