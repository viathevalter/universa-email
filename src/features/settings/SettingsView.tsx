import React, { useState, useEffect } from 'react';
import {
  Settings,
  Building2,
  Key,
  ShieldCheck,
  Database,
  Copy,
  Check,
  Server,
  Save,
} from 'lucide-react';
import { useApp } from '../../shared/context/AppContext';
import { getResendDomains } from '../../shared/services/resendService';
import type { ResendDomainStatus } from '../../types';
import { resetSupabaseClient } from '../../shared/services/supabaseClient';

export const SettingsView: React.FC = () => {
  const { tenant, updateTenant, isSupabaseConnected } = useApp();

  const [formData, setFormData] = useState({
    name: tenant.name,
    trade_name: tenant.trade_name || '',
    sender_name: tenant.sender_name || '',
    marketing_sender_email: tenant.marketing_sender_email || '',
    resend_api_key: tenant.resend_api_key || '',
    gemini_api_key: tenant.gemini_api_key || '',
  });

  const [supabaseUrl, setSupabaseUrl] = useState(
    localStorage.getItem('saas_supabase_url') || ''
  );
  const [supabaseKey, setSupabaseKey] = useState(
    localStorage.getItem('saas_supabase_anon_key') || ''
  );

  const [domains, setDomains] = useState<ResendDomainStatus[]>([]);
  const [copiedSql, setCopiedSql] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    getResendDomains(tenant.resend_api_key).then((res) => {
      setDomains(res);
    });
  }, [tenant.resend_api_key]);

  const handleSaveTenant = (e: React.FormEvent) => {
    e.preventDefault();
    updateTenant(formData);
    setNotification({ type: 'success', message: 'Configurações da organização salvas com sucesso!' });
  };

  const handleSaveSupabase = (e: React.FormEvent) => {
    e.preventDefault();
    if (supabaseUrl && supabaseKey) {
      resetSupabaseClient(supabaseUrl, supabaseKey);
      setNotification({ type: 'success', message: 'Conexão Supabase configurada com sucesso!' });
    } else {
      resetSupabaseClient();
      setNotification({ type: 'success', message: 'Supabase desconectado. Modo Local Fallback ativo.' });
    }
  };

  const sqlSchemaSnippet = `-- SCHEMA DE PRODUÇÃO KOTRIK EMAIL SAAS (Execute no SQL Editor do Supabase)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

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

INSERT INTO public.tenants (id, name, trade_name, marketing_sender_email, sender_name)
VALUES ('00000000-0000-0000-0000-000000000001', 'Kotrik Growth Labs', 'Kotrik B2B Intelligence', 'contato@kotrik.com.br', 'Time Comercial Kotrik')
ON CONFLICT (id) DO NOTHING;

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
    opted_out BOOLEAN DEFAULT false,
    mx_valid BOOLEAN DEFAULT true,
    mx_record TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_lead_email_per_tenant UNIQUE (tenant_id, email)
);

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

CREATE TABLE IF NOT EXISTS public.saved_audiences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001' REFERENCES public.tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    filters_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_prospecting_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_prospecting_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_campaign_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_audiences ENABLE ROW LEVEL SECURITY;

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
CREATE POLICY "Public access audiences" ON public.saved_audiences FOR ALL USING (true) WITH CHECK (true);`;

  const copySql = () => {
    navigator.clipboard.writeText(sqlSchemaSnippet);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
          <Settings className="h-6 w-6 text-indigo-400" />
          Configurações da Organização & Integrações
        </h1>
        <p className="text-sm text-zinc-400 mt-1">
          Gerenciamento de credenciais de envio Resend, chaves de IA Gemini, domínios autenticados e banco Supabase.
        </p>
      </div>

      {notification && (
        <div
          className={`flex items-center justify-between rounded-xl p-4 text-sm border ${
            notification.type === 'success'
              ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/60'
              : 'bg-rose-950/40 text-rose-300 border-rose-800/60'
          }`}
        >
          <span>{notification.message}</span>
          <button onClick={() => setNotification(null)} className="text-xs opacity-70 hover:opacity-100 cursor-pointer">
            ✕ Fechar
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Organization / Tenant Profile */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 backdrop-blur-sm space-y-4">
          <h2 className="text-sm font-bold text-white flex items-center gap-2 border-b border-zinc-800 pb-3">
            <Building2 className="h-4 w-4 text-indigo-400" />
            Dados da Organização (Tenant)
          </h2>

          <form onSubmit={handleSaveTenant} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Razão Social / Nome da Conta *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Nome Fantasia</label>
              <input
                type="text"
                value={formData.trade_name}
                onChange={(e) => setFormData({ ...formData, trade_name: e.target.value })}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-white focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Nome Padrão do Remetente</label>
                <input
                  type="text"
                  value={formData.sender_name}
                  onChange={(e) => setFormData({ ...formData, sender_name: e.target.value })}
                  placeholder="Ex: Comercial Kotrik"
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">E-mail Padrão de Envio</label>
                <input
                  type="email"
                  value={formData.marketing_sender_email}
                  onChange={(e) => setFormData({ ...formData, marketing_sender_email: e.target.value })}
                  placeholder="contato@seudominio.com.br"
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-white focus:outline-none"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 transition-colors shadow-sm cursor-pointer"
              >
                <Save className="h-3.5 w-3.5" />
                Salvar Dados da Organização
              </button>
            </div>
          </form>
        </div>

        {/* API Keys Configuration */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 backdrop-blur-sm space-y-4">
          <h2 className="text-sm font-bold text-white flex items-center gap-2 border-b border-zinc-800 pb-3">
            <Key className="h-4 w-4 text-purple-400" />
            Chaves de API & Conexões Externas
          </h2>

          <div className="space-y-4">
            {/* Resend API Key */}
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">
                Resend API Key (Envio de Emails & Webhooks)
              </label>
              <input
                type="password"
                value={formData.resend_api_key}
                onChange={(e) => setFormData({ ...formData, resend_api_key: e.target.value })}
                placeholder="re_xxxxxxxxxxxxxxxxxxxxxxxx"
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 font-mono text-xs text-white focus:outline-none"
              />
              <p className="text-[10px] text-zinc-500 mt-1">
                Obtenha sua chave no painel do <a href="https://resend.com" target="_blank" rel="noreferrer" className="text-indigo-400 underline">Resend.com</a>. Caso não informada, opera em modo simulador resiliente.
              </p>
            </div>

            {/* Google Gemini API Key */}
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">
                Google Gemini API Key (AI Grounded Search & Prospecção)
              </label>
              <input
                type="password"
                value={formData.gemini_api_key}
                onChange={(e) => setFormData({ ...formData, gemini_api_key: e.target.value })}
                placeholder="AIzaSyxxxxxxxxxxxxxxxxxxxxxxxx"
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 font-mono text-xs text-white focus:outline-none"
              />
              <p className="text-[10px] text-zinc-500 mt-1">
                Obtenha gratuitamente no <a href="https://aistudio.google.com" target="_blank" rel="noreferrer" className="text-pink-400 underline">Google AI Studio</a> para extrações de alta precisão.
              </p>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={handleSaveTenant}
                className="inline-flex items-center gap-1.5 rounded-xl bg-purple-600 px-4 py-2 text-xs font-semibold text-white hover:bg-purple-500 transition-colors shadow-sm cursor-pointer"
              >
                <Save className="h-3.5 w-3.5" />
                Atualizar Chaves de API
              </button>
            </div>
          </div>
        </div>

        {/* Resend Domains & DNS Health */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 backdrop-blur-sm space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              Status de Autenticação DNS (SPF / DKIM / DMARC)
            </h2>
            <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400 border border-emerald-500/20">
              Alta Entregabilidade
            </span>
          </div>

          <div className="space-y-3">
            {domains.map((dom) => (
              <div key={dom.id} className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-xs text-white flex items-center gap-2">
                    <Server className="h-3.5 w-3.5 text-indigo-400" />
                    {dom.name}
                  </div>
                  <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
                    {dom.status === 'verified' ? 'Verificado & Autenticado' : dom.status}
                  </span>
                </div>

                <div className="space-y-1.5 pt-2 border-t border-zinc-800/80 text-[11px]">
                  {dom.dns_records.map((rec, idx) => (
                    <div key={idx} className="flex items-center justify-between text-zinc-400">
                      <span className="font-mono text-zinc-300 font-semibold">{rec.record}</span>
                      <span className="truncate max-w-[200px] text-zinc-500 font-mono text-[10px]">{rec.value}</span>
                      <span className="text-emerald-400 flex items-center gap-1">
                        <Check className="h-3 w-3" /> OK
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Supabase Schema & Database Connection */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 backdrop-blur-sm space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Database className="h-4 w-4 text-teal-400" />
              Banco de Dados PostgreSQL (Supabase)
            </h2>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                isSupabaseConnected
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-zinc-800 text-zinc-400'
              }`}
            >
              {isSupabaseConnected ? 'Conectado' : 'Modo Fallback Local'}
            </span>
          </div>

          <form onSubmit={handleSaveSupabase} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Supabase Project URL</label>
              <input
                type="text"
                value={supabaseUrl}
                onChange={(e) => setSupabaseUrl(e.target.value)}
                placeholder="https://xyzcompany.supabase.co"
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 font-mono text-xs text-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Supabase Anon Key</label>
              <input
                type="password"
                value={supabaseKey}
                onChange={(e) => setSupabaseKey(e.target.value)}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 font-mono text-xs text-white focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={copySql}
                className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-2 text-xs font-semibold text-zinc-200 hover:bg-zinc-700 cursor-pointer"
              >
                {copiedSql ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                {copiedSql ? 'Copiado!' : 'Copiar Script SQL'}
              </button>

              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-xl bg-teal-600 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-500 cursor-pointer"
              >
                Salvar Conexão
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
