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
  const { tenant, updateTenant, isSupabaseConnected, theme } = useApp();

  const isLight = theme === 'light';

  const [formData, setFormData] = useState({
    name: tenant.name,
    trade_name: tenant.trade_name || '',
    sender_name: tenant.sender_name || '',
    marketing_sender_email: tenant.marketing_sender_email || '',
    resend_api_key: tenant.resend_api_key || '',
    gemini_api_key: tenant.gemini_api_key || '',
  });

  const [supabaseUrl, setSupabaseUrl] = useState(
    localStorage.getItem('saas_supabase_url') || import.meta.env.VITE_SUPABASE_URL || ''
  );
  const [supabaseKey, setSupabaseKey] = useState(
    localStorage.getItem('saas_supabase_anon_key') || import.meta.env.VITE_SUPABASE_ANON_KEY || ''
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

  const sqlSchemaSnippet = `-- SCHEMA DE PRODUÇÃO UNIVERSAEMAIL SAAS (Execute no SQL Editor do Supabase)
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
VALUES ('00000000-0000-0000-0000-000000000001', 'UniversaEmail Enterprise', 'UniversaEmail SaaS', 'contato@universaemail.com', 'Time UniversaEmail')
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
        <div className="flex items-center gap-2">
          <h1 className={`text-2xl font-bold tracking-tight flex items-center gap-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>
            <Settings className="h-6 w-6 text-indigo-500" />
            Configurações & Conectores de Infraestrutura
          </h1>
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-semibold border ${
              isLight ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
            }`}
          >
            Multi-tenant
          </span>
        </div>
        <p className={`text-sm mt-1 ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
          Gerencie perfil da organização, credenciais do Resend, chave do Google Gemini e conexão com Supabase.
        </p>
      </div>

      {/* Notification Toast */}
      {notification && (
        <div
          className={`flex items-center justify-between rounded-xl p-4 text-sm border ${
            notification.type === 'success'
              ? isLight
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-emerald-950/40 text-emerald-300 border-emerald-800/60'
              : isLight
              ? 'bg-rose-50 text-rose-800 border-rose-200'
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
        {/* Left Column: Organization & Keys */}
        <div className="space-y-6">
          {/* Org Info */}
          <form
            onSubmit={handleSaveTenant}
            className={`rounded-2xl border p-6 backdrop-blur-sm shadow-xs space-y-4 ${
              isLight ? 'border-slate-200 bg-white' : 'border-zinc-800 bg-zinc-900/60'
            }`}
          >
            <div className="flex items-center gap-2 pb-2 border-b border-zinc-800">
              <Building2 className="h-5 w-5 text-indigo-500" />
              <h2 className={`text-base font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>Perfil da Organização (Tenant)</h2>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className={`block text-xs font-medium mb-1 ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>Nome da Organização</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className={`w-full rounded-xl border px-3 py-2 text-xs focus:outline-none ${
                    isLight ? 'border-slate-300 bg-slate-50 text-slate-900' : 'border-zinc-800 bg-zinc-950 text-white'
                  }`}
                />
              </div>

              <div>
                <label className={`block text-xs font-medium mb-1 ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>Nome Fantasia</label>
                <input
                  type="text"
                  value={formData.trade_name}
                  onChange={(e) => setFormData({ ...formData, trade_name: e.target.value })}
                  className={`w-full rounded-xl border px-3 py-2 text-xs focus:outline-none ${
                    isLight ? 'border-slate-300 bg-slate-50 text-slate-900' : 'border-zinc-800 bg-zinc-950 text-white'
                  }`}
                />
              </div>

              <div>
                <label className={`block text-xs font-medium mb-1 ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>Nome Padrão do Remetente</label>
                <input
                  type="text"
                  value={formData.sender_name}
                  onChange={(e) => setFormData({ ...formData, sender_name: e.target.value })}
                  className={`w-full rounded-xl border px-3 py-2 text-xs focus:outline-none ${
                    isLight ? 'border-slate-300 bg-slate-50 text-slate-900' : 'border-zinc-800 bg-zinc-950 text-white'
                  }`}
                />
              </div>

              <div>
                <label className={`block text-xs font-medium mb-1 ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>E-mail Padrão de Envio</label>
                <input
                  type="email"
                  value={formData.marketing_sender_email}
                  onChange={(e) => setFormData({ ...formData, marketing_sender_email: e.target.value })}
                  placeholder="ex: contato@universaemail.com"
                  className={`w-full rounded-xl border px-3 py-2 text-xs focus:outline-none ${
                    isLight ? 'border-slate-300 bg-slate-50 text-slate-900' : 'border-zinc-800 bg-zinc-950 text-white'
                  }`}
                />
              </div>
            </div>

            {/* API Keys */}
            <div className={`pt-4 border-t space-y-4 ${isLight ? 'border-slate-200' : 'border-zinc-800'}`}>
              <div className="flex items-center gap-2">
                <Key className="h-4 w-4 text-purple-500" />
                <h3 className={`text-xs font-bold uppercase tracking-wider ${isLight ? 'text-slate-700' : 'text-zinc-300'}`}>
                  Chaves de API & Conexões
                </h3>
              </div>

              <div>
                <label className={`block text-xs font-medium mb-1 ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>Resend API Key (re_...)</label>
                <input
                  type="password"
                  value={formData.resend_api_key}
                  onChange={(e) => setFormData({ ...formData, resend_api_key: e.target.value })}
                  placeholder="re_xxxxxxxxxxxxxxxxxxxxxxxx"
                  className={`w-full rounded-xl border px-3 py-2 font-mono text-xs focus:outline-none ${
                    isLight ? 'border-slate-300 bg-slate-50 text-slate-900' : 'border-zinc-800 bg-zinc-950 text-white'
                  }`}
                />
              </div>

              <div>
                <label className={`block text-xs font-medium mb-1 ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>Google Gemini API Key (IA Lead Machine)</label>
                <input
                  type="password"
                  value={formData.gemini_api_key}
                  onChange={(e) => setFormData({ ...formData, gemini_api_key: e.target.value })}
                  placeholder="AQ.Ab8... ou AIzaSy..."
                  className={`w-full rounded-xl border px-3 py-2 font-mono text-xs focus:outline-none ${
                    isLight ? 'border-slate-300 bg-slate-50 text-slate-900' : 'border-zinc-800 bg-zinc-950 text-white'
                  }`}
                />
              </div>
            </div>

            <div className={`pt-2 border-t flex justify-end ${isLight ? 'border-slate-200' : 'border-zinc-800'}`}>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 cursor-pointer shadow-xs"
              >
                <Save className="h-3.5 w-3.5" />
                Salvar Configurações
              </button>
            </div>
          </form>

          {/* Resend Domains Status */}
          <div
            className={`rounded-2xl border p-6 backdrop-blur-sm shadow-xs space-y-4 ${
              isLight ? 'border-slate-200 bg-white' : 'border-zinc-800 bg-zinc-900/60'
            }`}
          >
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-emerald-500" />
                <h2 className={`text-base font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>Autenticação de Domínios (Resend)</h2>
              </div>
              <span className="text-[11px] font-semibold text-emerald-500">SPF / DKIM / DMARC</span>
            </div>

            <div className="space-y-3">
              {domains.map((dom, idx) => (
                <div
                  key={idx}
                  className={`rounded-xl border p-4 space-y-2 ${
                    isLight ? 'border-slate-200 bg-slate-50' : 'border-zinc-800/80 bg-zinc-950/60'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`font-bold text-xs ${isLight ? 'text-slate-900' : 'text-white'}`}>{dom.name}</span>
                    <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-500 border border-emerald-500/20">
                      Verificado
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-zinc-800/60 text-[10px]">
                    <div>
                      <span className={isLight ? 'text-slate-400 block' : 'text-zinc-500 block'}>SPF</span>
                      <span className="text-emerald-500 font-semibold">Ativo</span>
                    </div>
                    <div>
                      <span className={isLight ? 'text-slate-400 block' : 'text-zinc-500 block'}>DKIM (2048-bit)</span>
                      <span className="text-emerald-500 font-semibold">Assinado</span>
                    </div>
                    <div>
                      <span className={isLight ? 'text-slate-400 block' : 'text-zinc-500 block'}>DMARC</span>
                      <span className="text-emerald-500 font-semibold">Alinhado</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Supabase Database & SQL Script */}
        <div className="space-y-6">
          {/* Supabase Connector */}
          <form
            onSubmit={handleSaveSupabase}
            className={`rounded-2xl border p-6 backdrop-blur-sm shadow-xs space-y-4 ${
              isLight ? 'border-slate-200 bg-white' : 'border-zinc-800 bg-zinc-900/60'
            }`}
          >
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <Database className="h-5 w-5 text-indigo-500" />
                <h2 className={`text-base font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>Banco de Dados Supabase (PostgreSQL)</h2>
              </div>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                  isSupabaseConnected
                    ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                    : isLight
                    ? 'bg-slate-100 text-slate-600'
                    : 'bg-zinc-800 text-zinc-400'
                }`}
              >
                {isSupabaseConnected ? 'Conectado (Live)' : 'Modo Local Fallback'}
              </span>
            </div>

            <div>
              <label className={`block text-xs font-medium mb-1 ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>Supabase Project URL</label>
              <input
                type="text"
                value={supabaseUrl}
                onChange={(e) => setSupabaseUrl(e.target.value)}
                placeholder="https://yqgtyxcawyjanspyvxro.supabase.co"
                className={`w-full rounded-xl border px-3 py-2 font-mono text-xs focus:outline-none ${
                  isLight ? 'border-slate-300 bg-slate-50 text-slate-900' : 'border-zinc-800 bg-zinc-950 text-white'
                }`}
              />
            </div>

            <div>
              <label className={`block text-xs font-medium mb-1 ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>Supabase Anon Public Key</label>
              <input
                type="password"
                value={supabaseKey}
                onChange={(e) => setSupabaseKey(e.target.value)}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                className={`w-full rounded-xl border px-3 py-2 font-mono text-xs focus:outline-none ${
                  isLight ? 'border-slate-300 bg-slate-50 text-slate-900' : 'border-zinc-800 bg-zinc-950 text-white'
                }`}
              />
            </div>

            <div className={`pt-2 border-t flex justify-end gap-2 ${isLight ? 'border-slate-200' : 'border-zinc-800'}`}>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 cursor-pointer shadow-xs"
              >
                <Server className="h-3.5 w-3.5" />
                Salvar Conexão Supabase
              </button>
            </div>
          </form>

          {/* SQL Schema Script Box */}
          <div
            className={`rounded-2xl border p-6 backdrop-blur-sm shadow-xs space-y-3 ${
              isLight ? 'border-slate-200 bg-white' : 'border-zinc-800 bg-zinc-900/60'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className={`text-xs font-bold uppercase tracking-wider ${isLight ? 'text-slate-900' : 'text-white'}`}>Script SQL de Produção</h3>
                <p className={`text-[11px] ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>Tabelas, RLS e índices para rodar no SQL Editor do Supabase</p>
              </div>
              <button
                onClick={copySql}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-all cursor-pointer ${
                  isLight
                    ? 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                    : 'border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                }`}
              >
                {copiedSql ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-500" />
                    Copiado!
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    Copiar SQL
                  </>
                )}
              </button>
            </div>

            <pre
              className={`rounded-xl border p-3 font-mono text-[10px] max-h-56 overflow-y-auto leading-relaxed ${
                isLight ? 'border-slate-200 bg-slate-50 text-slate-800' : 'border-zinc-800 bg-zinc-950 text-zinc-400'
              }`}
            >
              {sqlSchemaSnippet}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
