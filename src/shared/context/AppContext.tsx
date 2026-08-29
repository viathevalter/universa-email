import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type {
  Tenant,
  Lead,
  LeadProspectingJob,
  LeadProspectingResult,
  MarketingTemplate,
  MarketingCampaign,
  MarketingCampaignQueue,
  SavedAudience,
} from '../../types';
import { verifyEmailDns } from '../services/dnsService';
import { processCampaignQueueBatch } from '../services/resendService';
import { getSupabaseClient } from '../services/supabaseClient';

export type AppTheme = 'dark' | 'light';

interface AppContextType {
  theme: AppTheme;
  toggleTheme: () => void;
  setThemeMode: (mode: AppTheme) => void;

  tenant: Tenant;
  updateTenant: (updates: Partial<Tenant>) => void;
  
  // Leads
  leads: Lead[];
  addLead: (lead: Omit<Lead, 'id' | 'tenant_id' | 'created_at' | 'updated_at'>) => Promise<Lead>;
  updateLead: (id: string, updates: Partial<Lead>) => Promise<void>;
  deleteLead: (id: string) => Promise<void>;
  batchImportLeads: (leads: Array<Omit<Lead, 'id' | 'tenant_id' | 'created_at' | 'updated_at'>>) => Promise<number>;
  toggleOptOut: (leadId: string) => Promise<void>;
  verifyLeadMx: (leadId: string) => Promise<void>;
  
  // Prospecting
  prospectingJobs: LeadProspectingJob[];
  prospectingResults: LeadProspectingResult[];
  addProspectingJob: (job: LeadProspectingJob, results: LeadProspectingResult[]) => Promise<void>;
  updateProspectingResultStatus: (resultId: string, status: 'imported' | 'discarded') => Promise<void>;
  importProspectsToLeads: (resultIds: string[]) => Promise<number>;
  
  // Templates
  templates: MarketingTemplate[];
  addTemplate: (template: Omit<MarketingTemplate, 'id' | 'tenant_id' | 'created_at' | 'updated_at'>) => Promise<MarketingTemplate>;
  updateTemplate: (id: string, updates: Partial<MarketingTemplate>) => Promise<void>;
  deleteTemplate: (id: string) => Promise<void>;
  
  // Campaigns
  campaigns: MarketingCampaign[];
  campaignQueue: Record<string, MarketingCampaignQueue[]>;
  createCampaign: (campaign: Omit<MarketingCampaign, 'id' | 'tenant_id' | 'created_at' | 'updated_at' | 'sent_count' | 'delivered_count' | 'opened_count' | 'clicked_count' | 'bounced_count' | 'failed_count'>, targetLeadIds: string[]) => Promise<MarketingCampaign>;
  launchCampaign: (campaignId: string) => Promise<void>;
  pauseCampaign: (campaignId: string) => void;
  
  // Audiences
  audiences: SavedAudience[];
  addAudience: (audience: Omit<SavedAudience, 'id' | 'tenant_id' | 'created_at'>) => Promise<SavedAudience>;
  deleteAudience: (id: string) => Promise<void>;

  // Supabase Connection Status
  isSupabaseConnected: boolean;
  isLoadingDb: boolean;
}

const STORAGE_KEYS = {
  THEME: 'universa_theme_mode',
  TENANT: 'universa_tenant_data',
  LEADS: 'universa_leads_data',
  JOBS: 'universa_jobs_data',
  RESULTS: 'universa_results_data',
  TEMPLATES: 'universa_templates_data',
  CAMPAIGNS: 'universa_campaigns_data',
  QUEUE: 'universa_queue_data',
  AUDIENCES: 'universa_audiences_data',
};

const DEFAULT_TENANT: Tenant = {
  id: '00000000-0000-0000-0000-000000000001',
  name: 'UniversaEmail Enterprise',
  trade_name: 'UniversaEmail SaaS',
  resend_api_key: import.meta.env.VITE_RESEND_API_KEY || '',
  marketing_sender_email: 'contato@universaemail.com',
  sender_name: 'Time UniversaEmail',
  gemini_api_key: import.meta.env.VITE_GEMINI_API_KEY || '',
  created_at: new Date().toISOString(),
};

const INITIAL_TEMPLATES: MarketingTemplate[] = [
  {
    id: 'tmpl_cold_01',
    tenant_id: '00000000-0000-0000-0000-000000000001',
    title: 'Prospecção B2B Direta - Otimização de Processos',
    subject: 'Parceria estratégica com a {{empresa}}',
    html_content: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #18181b; line-height: 1.6; padding: 20px;">
  <p>Olá <strong>{{nome}}</strong>, tudo bem?</p>
  <p>Notei sua atuação como <strong>{{cargo}}</strong> na <strong>{{empresa}}</strong> em {{cidade}} e fiquei impressionado com o crescimento recente da empresa.</p>
  <p>Estamos ajudando empresas do seu segmento a acelerar a automação comercial e reduzir custos operacionais em até 40% com inteligência de dados.</p>
  <div style="background-color: #f4f4f5; padding: 16px; border-left: 4px solid #6366f1; margin: 20px 0; border-radius: 4px;">
    <p style="margin: 0; font-size: 14px;"><em>"Aumentamos a taxa de resposta qualificada em 3.2x no primeiro mês de implementação."</em></p>
  </div>
  <p>Você teria 10 minutos nesta quinta-feira para conversarmos brevemente sobre essa oportunidade?</p>
  <p style="margin-top: 24px;">Um abraço,<br><strong>Time Comercial</strong><br>UniversaEmail</p>
</div>`,
    variables: ['{{nome}}', '{{empresa}}', '{{cargo}}', '{{cidade}}', '{{link_descadastro}}'],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'tmpl_followup_02',
    tenant_id: '00000000-0000-0000-0000-000000000001',
    title: 'Follow-up Rápido - Apresentação de Resultados',
    subject: 'Re: Oportunidade para a {{empresa}}',
    html_content: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #18181b; line-height: 1.6; padding: 20px;">
  <p>Olá <strong>{{nome}}</strong>,</p>
  <p>Passando apenas para saber se você conseguiu dar uma olhada na minha mensagem anterior sobre a <strong>{{empresa}}</strong>.</p>
  <p>Preparamos um diagnóstico rápido com 3 oportunidades imediatas no seu setor em {{cidade}}.</p>
  <p style="text-align: center; margin: 30px 0;">
    <a href="https://universaemail.com" style="background-color: #4f46e5; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Agendar Breve Demonstração</a>
  </p>
  <p>Atenciosamente,<br>Equipe UniversaEmail</p>
</div>`,
    variables: ['{{nome}}', '{{empresa}}', '{{cargo}}', '{{cidade}}', '{{link_descadastro}}'],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const INITIAL_LEADS: Lead[] = [
  {
    id: 'lead_01',
    tenant_id: '00000000-0000-0000-0000-000000000001',
    name: 'Carlos Eduardo Silveira',
    company_name: 'Nexus Logística e Transportes',
    email: 'carlos.silveira@nexuslog.com.br',
    phone: '+55 (11) 98765-4321',
    website: 'https://nexuslog.com.br',
    sector: 'Logística & Cadeia de Suprimentos',
    role: 'Diretor de Operações (COO)',
    company_size: 'Tier 1 (Enterprise)',
    city: 'São Paulo',
    province: 'SP',
    country: 'Brasil',
    tags: ['Decisor', 'Logística', 'Tier 1', 'Verificado MX'],
    status: 'qualified',
    opted_out: false,
    mx_valid: true,
    mx_record: 'aspmx.l.google.com (Google Workspace)',
    created_at: new Date(Date.now() - 86400000 * 4).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'lead_02',
    tenant_id: '00000000-0000-0000-0000-000000000001',
    name: 'Mariana Vasconcelos',
    company_name: 'Atlas Indústria Metalúrgica',
    email: 'm.vasconcelos@atlasmetal.ind.br',
    phone: '+55 (41) 99123-8877',
    website: 'https://atlasmetal.ind.br',
    sector: 'Manufatura & Metalmecânica',
    role: 'Gerente Geral de Compras',
    company_size: 'Tier 1 (Enterprise)',
    city: 'Curitiba',
    province: 'PR',
    country: 'Brasil',
    tags: ['Indústria', 'Compras B2B', 'Tier 1'],
    status: 'contacted',
    opted_out: false,
    mx_valid: true,
    mx_record: 'atlasmetal-ind-br.mail.protection.outlook.com',
    created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'lead_03',
    tenant_id: '00000000-0000-0000-0000-000000000001',
    name: 'Roberto Alencar',
    company_name: 'Prime Soluções em Tecnologia',
    email: 'roberto@primesolucoes.com.br',
    phone: '+55 (31) 98455-1122',
    website: 'https://primesolucoes.com.br',
    sector: 'Tecnologia da Informação',
    role: 'CEO & Co-founder',
    company_size: 'Tier 2 (Mid-Market)',
    city: 'Belo Horizonte',
    province: 'MG',
    country: 'Brasil',
    tags: ['Tech', 'CEO', 'Mid-Market'],
    status: 'replied',
    opted_out: false,
    mx_valid: true,
    mx_record: 'aspmx.l.google.com',
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'lead_04',
    tenant_id: '00000000-0000-0000-0000-000000000001',
    name: 'Juliana Fagundes',
    company_name: 'Delta Distribuidora de Peças',
    email: 'comercial@deltadistribuidora.com.br',
    phone: '+55 (51) 3344-9988',
    website: 'https://deltadistribuidora.com.br',
    sector: 'Distribuição & Atacado',
    role: 'Head de Vendas B2B',
    company_size: 'Tier 2 (Mid-Market)',
    city: 'Porto Alegre',
    province: 'RS',
    country: 'Brasil',
    tags: ['Distribuidor', 'Vendas'],
    status: 'new',
    opted_out: false,
    mx_valid: true,
    mx_record: 'mail.deltadistribuidora.com.br',
    created_at: new Date(Date.now() - 86400000 * 1).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'lead_05',
    tenant_id: '00000000-0000-0000-0000-000000000001',
    name: 'Fernando Guimarães',
    company_name: 'Inova Soluções Ambientais',
    email: 'fernando@inovasolucoes.com.br',
    phone: '+55 (19) 97122-3344',
    website: 'https://inovasolucoes.com.br',
    sector: 'Engenharia & Meio Ambiente',
    role: 'Sócio-Diretor Técnico',
    company_size: 'Tier 3 (SMB / Small)',
    city: 'Campinas',
    province: 'SP',
    country: 'Brasil',
    tags: ['Engenharia', 'Diretoria'],
    status: 'new',
    opted_out: false,
    mx_valid: true,
    mx_record: 'mx.zoho.com',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const INITIAL_AUDIENCES: SavedAudience[] = [
  {
    id: 'aud_tier1_mx',
    tenant_id: '00000000-0000-0000-0000-000000000001',
    name: 'Grandes Empresas - Tier 1 (MX Verificado)',
    description: 'Tomadores de decisão em empresas Enterprise com MX ativo',
    filters: {
      company_size: ['Tier 1 (Enterprise)'],
      mx_valid_only: true,
      exclude_opted_out: true,
    },
    lead_count: 2,
    created_at: new Date().toISOString(),
  },
  {
    id: 'aud_tech_sp',
    tenant_id: '00000000-0000-0000-0000-000000000001',
    name: 'Lote Prioritário - São Paulo & Região',
    description: 'Contatos comerciais ativos localizados no estado de SP',
    filters: {
      province: ['SP'],
      exclude_opted_out: true,
    },
    lead_count: 2,
    created_at: new Date().toISOString(),
  },
];

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isLoadingDb, setIsLoadingDb] = useState(true);

  // Theme Mode State
  const [theme, setTheme] = useState<AppTheme>(() => {
    const savedTheme = localStorage.getItem(STORAGE_KEYS.THEME) as AppTheme | null;
    return savedTheme === 'light' ? 'light' : 'dark';
  });

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const setThemeMode = (mode: AppTheme) => {
    setTheme(mode);
  };

  // Sync theme with HTML class
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.THEME, theme);
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
    }
  }, [theme]);

  // Tenant State
  const [tenant, setTenant] = useState<Tenant>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.TENANT);
    return saved ? JSON.parse(saved) : DEFAULT_TENANT;
  });

  // Leads State
  const [leads, setLeads] = useState<Lead[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.LEADS);
    return saved ? JSON.parse(saved) : INITIAL_LEADS;
  });

  // Prospecting Jobs & Results
  const [prospectingJobs, setProspectingJobs] = useState<LeadProspectingJob[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.JOBS);
    return saved ? JSON.parse(saved) : [];
  });

  const [prospectingResults, setProspectingResults] = useState<LeadProspectingResult[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.RESULTS);
    return saved ? JSON.parse(saved) : [];
  });

  // Templates State
  const [templates, setTemplates] = useState<MarketingTemplate[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.TEMPLATES);
    return saved ? JSON.parse(saved) : INITIAL_TEMPLATES;
  });

  // Campaigns & Queues
  const [campaigns, setCampaigns] = useState<MarketingCampaign[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.CAMPAIGNS);
    return saved ? JSON.parse(saved) : [];
  });

  const [campaignQueue, setCampaignQueue] = useState<Record<string, MarketingCampaignQueue[]>>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.QUEUE);
    return saved ? JSON.parse(saved) : {};
  });

  // Audiences State
  const [audiences, setAudiences] = useState<SavedAudience[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.AUDIENCES);
    return saved ? JSON.parse(saved) : INITIAL_AUDIENCES;
  });

  // Sincronização direta com Supabase
  const syncWithSupabase = useCallback(async () => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      setIsLoadingDb(false);
      return;
    }

    try {
      // 1. Carrega Leads
      const { data: dbLeads, error: leadsErr } = await supabase.from('leads').select('*').order('created_at', { ascending: false });
      if (!leadsErr && dbLeads && dbLeads.length > 0) {
        setLeads(dbLeads);
      }

      // 2. Carrega Templates
      const { data: dbTemplates, error: tmplErr } = await supabase.from('marketing_templates').select('*');
      if (!tmplErr && dbTemplates && dbTemplates.length > 0) {
        setTemplates(dbTemplates);
      }

      // 3. Carrega Campanhas
      const { data: dbCampaigns, error: campErr } = await supabase.from('marketing_campaigns').select('*').order('created_at', { ascending: false });
      if (!campErr && dbCampaigns && dbCampaigns.length > 0) {
        setCampaigns(dbCampaigns);
      }

      // 4. Carrega Audiências
      const { data: dbAudiences, error: audErr } = await supabase.from('saved_audiences').select('*');
      if (!audErr && dbAudiences && dbAudiences.length > 0) {
        setAudiences(
          dbAudiences.map((a: any) => ({
            id: a.id,
            tenant_id: a.tenant_id,
            name: a.name,
            description: a.description,
            filters: a.filters_json || {},
            lead_count: 0,
            created_at: a.created_at,
          }))
        );
      }

      // 5. Carrega Resultados de Prospecção
      const { data: dbResults, error: resErr } = await supabase.from('lead_prospecting_results').select('*').order('created_at', { ascending: false });
      if (!resErr && dbResults && dbResults.length > 0) {
        setProspectingResults(dbResults);
      }
    } catch (e) {
      console.warn('[Supabase Sync Warning]', e);
    } finally {
      setIsLoadingDb(false);
    }
  }, []);

  useEffect(() => {
    syncWithSupabase();
  }, [syncWithSupabase]);

  // Persistence side-effects (LocalStorage cache)
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.TENANT, JSON.stringify(tenant));
  }, [tenant]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.LEADS, JSON.stringify(leads));
  }, [leads]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.JOBS, JSON.stringify(prospectingJobs));
  }, [prospectingJobs]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.RESULTS, JSON.stringify(prospectingResults));
  }, [prospectingResults]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.TEMPLATES, JSON.stringify(templates));
  }, [templates]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CAMPAIGNS, JSON.stringify(campaigns));
  }, [campaigns]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.QUEUE, JSON.stringify(campaignQueue));
  }, [campaignQueue]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.AUDIENCES, JSON.stringify(audiences));
  }, [audiences]);

  const updateTenant = (updates: Partial<Tenant>) => {
    setTenant((prev) => ({ ...prev, ...updates }));
    const supabase = getSupabaseClient();
    if (supabase) {
      supabase.from('tenants').upsert({
        id: tenant.id,
        name: updates.name || tenant.name,
        trade_name: updates.trade_name !== undefined ? updates.trade_name : tenant.trade_name,
        resend_api_key: updates.resend_api_key !== undefined ? updates.resend_api_key : tenant.resend_api_key,
        marketing_sender_email: updates.marketing_sender_email !== undefined ? updates.marketing_sender_email : tenant.marketing_sender_email,
        sender_name: updates.sender_name !== undefined ? updates.sender_name : tenant.sender_name,
        gemini_api_key: updates.gemini_api_key !== undefined ? updates.gemini_api_key : tenant.gemini_api_key,
      }).then();
    }
  };

  // Lead Operations
  const addLead = async (leadData: Omit<Lead, 'id' | 'tenant_id' | 'created_at' | 'updated_at'>): Promise<Lead> => {
    const dnsResult = await verifyEmailDns(leadData.email);
    const newLead: Lead = {
      ...leadData,
      id: `lead_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      tenant_id: tenant.id,
      mx_valid: dnsResult.hasMx,
      mx_record: dnsResult.mxRecords[0] || 'Nenhum',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setLeads((prev) => [newLead, ...prev]);

    const supabase = getSupabaseClient();
    if (supabase) {
      supabase.from('leads').insert({
        tenant_id: tenant.id,
        name: newLead.name,
        company_name: newLead.company_name,
        email: newLead.email,
        phone: newLead.phone,
        website: newLead.website,
        sector: newLead.sector,
        role: newLead.role,
        company_size: newLead.company_size,
        city: newLead.city,
        province: newLead.province,
        country: newLead.country,
        tags: newLead.tags,
        status: newLead.status,
        opted_out: newLead.opted_out,
        mx_valid: newLead.mx_valid,
        mx_record: newLead.mx_record,
      }).then();
    }

    return newLead;
  };

  const updateLead = async (id: string, updates: Partial<Lead>) => {
    setLeads((prev) =>
      prev.map((lead) => (lead.id === id ? { ...lead, ...updates, updated_at: new Date().toISOString() } : lead))
    );

    const supabase = getSupabaseClient();
    if (supabase) {
      supabase.from('leads').update(updates).eq('id', id).then();
    }
  };

  const deleteLead = async (id: string) => {
    setLeads((prev) => prev.filter((lead) => lead.id !== id));

    const supabase = getSupabaseClient();
    if (supabase) {
      supabase.from('leads').delete().eq('id', id).then();
    }
  };

  const batchImportLeads = async (
    rawLeads: Array<Omit<Lead, 'id' | 'tenant_id' | 'created_at' | 'updated_at'>>
  ): Promise<number> => {
    const existingEmails = new Set(leads.map((l) => l.email.toLowerCase().trim()));
    const leadsToAdd: Lead[] = [];

    for (const raw of rawLeads) {
      const email = (raw.email || '').toLowerCase().trim();
      if (!email || existingEmails.has(email)) continue;

      existingEmails.add(email);
      leadsToAdd.push({
        ...raw,
        id: `lead_${Date.now()}_${Math.random().toString(36).substr(2, 7)}`,
        tenant_id: tenant.id,
        mx_valid: raw.mx_valid !== undefined ? raw.mx_valid : true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }

    if (leadsToAdd.length > 0) {
      setLeads((prev) => [...leadsToAdd, ...prev]);

      const supabase = getSupabaseClient();
      if (supabase) {
        const payload = leadsToAdd.map((l) => ({
          tenant_id: tenant.id,
          name: l.name,
          company_name: l.company_name,
          email: l.email,
          phone: l.phone,
          website: l.website,
          sector: l.sector,
          role: l.role,
          company_size: l.company_size,
          city: l.city,
          province: l.province,
          country: l.country,
          tags: l.tags,
          status: l.status,
          opted_out: l.opted_out,
          mx_valid: l.mx_valid,
        }));
        supabase.from('leads').insert(payload).then();
      }
    }
    return leadsToAdd.length;
  };

  const toggleOptOut = async (leadId: string) => {
    const lead = leads.find((l) => l.id === leadId);
    if (!lead) return;
    const newOptOut = !lead.opted_out;

    setLeads((prev) =>
      prev.map((l) => (l.id === leadId ? { ...l, opted_out: newOptOut, updated_at: new Date().toISOString() } : l))
    );

    const supabase = getSupabaseClient();
    if (supabase) {
      supabase.from('leads').update({ opted_out: newOptOut }).eq('id', leadId).then();
    }
  };

  const verifyLeadMx = async (leadId: string) => {
    const targetLead = leads.find((l) => l.id === leadId);
    if (!targetLead) return;

    const dnsResult = await verifyEmailDns(targetLead.email);
    updateLead(leadId, {
      mx_valid: dnsResult.hasMx,
      mx_record: dnsResult.mxRecords[0] || 'Nenhum',
    });
  };

  // Prospecting Operations
  const addProspectingJob = async (job: LeadProspectingJob, results: LeadProspectingResult[]) => {
    setProspectingJobs((prev) => [job, ...prev]);
    setProspectingResults((prev) => [...results, ...prev]);

    const supabase = getSupabaseClient();
    if (supabase) {
      supabase.from('lead_prospecting_jobs').insert({
        tenant_id: tenant.id,
        title: job.title,
        keywords: job.keywords,
        location: job.location,
        sector_filter: job.sector_filter,
        target_count: job.target_count,
        processed_count: job.processed_count,
        found_emails_count: job.found_emails_count,
        status: job.status,
      }).then();

      const resultsPayload = results.map((r) => ({
        tenant_id: tenant.id,
        company_name: r.company_name,
        contact_name: r.contact_name,
        role: r.role,
        email: r.email,
        phone: r.phone,
        website: r.website,
        address: r.address,
        city: r.city,
        province: r.province,
        country: r.country,
        sector: r.sector,
        company_size: r.company_size,
        confidence_score: r.confidence_score,
        mx_status: r.mx_status,
        mx_host: r.mx_host,
        domain_active: r.domain_active,
        status: r.status,
        raw_reasoning: r.raw_reasoning,
      }));
      supabase.from('lead_prospecting_results').insert(resultsPayload).then();
    }
  };

  const updateProspectingResultStatus = async (resultId: string, status: 'imported' | 'discarded') => {
    setProspectingResults((prev) =>
      prev.map((r) => (r.id === resultId ? { ...r, status } : r))
    );

    const supabase = getSupabaseClient();
    if (supabase) {
      supabase.from('lead_prospecting_results').update({ status }).eq('id', resultId).then();
    }
  };

  const importProspectsToLeads = async (resultIds: string[]): Promise<number> => {
    const selected = prospectingResults.filter((r) => resultIds.includes(r.id) && r.status !== 'imported');
    if (selected.length === 0) return 0;

    const leadsToCreate: Array<Omit<Lead, 'id' | 'tenant_id' | 'created_at' | 'updated_at'>> = selected.map((p) => ({
      name: p.contact_name || p.company_name,
      company_name: p.company_name,
      email: p.email,
      phone: p.phone,
      website: p.website,
      sector: p.sector,
      role: p.role,
      company_size: p.company_size || 'Tier 2 (Mid-Market)',
      city: p.city,
      province: p.province,
      country: p.country || 'Brasil',
      tags: ['AI Prospecting', p.sector || 'Geral'].filter(Boolean),
      status: 'new',
      opted_out: false,
      mx_valid: p.mx_status === 'valid',
      mx_record: p.mx_host,
    }));

    const count = await batchImportLeads(leadsToCreate);
    
    // Marca como importados no staging
    setProspectingResults((prev) =>
      prev.map((r) => (resultIds.includes(r.id) ? { ...r, status: 'imported' } : r))
    );

    return count;
  };

  // Template Operations
  const addTemplate = async (templateData: Omit<MarketingTemplate, 'id' | 'tenant_id' | 'created_at' | 'updated_at'>) => {
    const newTmpl: MarketingTemplate = {
      ...templateData,
      id: `tmpl_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      tenant_id: tenant.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setTemplates((prev) => [newTmpl, ...prev]);

    const supabase = getSupabaseClient();
    if (supabase) {
      supabase.from('marketing_templates').insert({
        tenant_id: tenant.id,
        title: newTmpl.title,
        subject: newTmpl.subject,
        html_content: newTmpl.html_content,
        preview_text: newTmpl.preview_text,
        variables: newTmpl.variables,
      }).then();
    }

    return newTmpl;
  };

  const updateTemplate = async (id: string, updates: Partial<MarketingTemplate>) => {
    setTemplates((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...updates, updated_at: new Date().toISOString() } : t))
    );

    const supabase = getSupabaseClient();
    if (supabase) {
      supabase.from('marketing_templates').update(updates).eq('id', id).then();
    }
  };

  const deleteTemplate = async (id: string) => {
    setTemplates((prev) => prev.filter((t) => t.id !== id));

    const supabase = getSupabaseClient();
    if (supabase) {
      supabase.from('marketing_templates').delete().eq('id', id).then();
    }
  };

  // Campaign Operations
  const createCampaign = async (
    campaignData: Omit<MarketingCampaign, 'id' | 'tenant_id' | 'created_at' | 'updated_at' | 'sent_count' | 'delivered_count' | 'opened_count' | 'clicked_count' | 'bounced_count' | 'failed_count'>,
    targetLeadIds: string[]
  ): Promise<MarketingCampaign> => {
    const campaignId = `camp_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const now = new Date().toISOString();

    const targetLeads = leads.filter((l) => targetLeadIds.includes(l.id) && !l.opted_out);

    const newCampaign: MarketingCampaign = {
      ...campaignData,
      id: campaignId,
      tenant_id: tenant.id,
      total_recipients: targetLeads.length,
      sent_count: 0,
      delivered_count: 0,
      opened_count: 0,
      clicked_count: 0,
      bounced_count: 0,
      failed_count: 0,
      created_at: now,
      updated_at: now,
    };

    // Cria itens na fila de disparo
    const queueItems: MarketingCampaignQueue[] = targetLeads.map((lead) => ({
      id: `queue_${Date.now()}_${lead.id}`,
      campaign_id: campaignId,
      lead_id: lead.id,
      lead_name: lead.name,
      lead_email: lead.email,
      company_name: lead.company_name,
      status: 'pending',
      created_at: now,
    }));

    setCampaigns((prev) => [newCampaign, ...prev]);
    setCampaignQueue((prev) => ({ ...prev, [campaignId]: queueItems }));

    const supabase = getSupabaseClient();
    if (supabase) {
      supabase.from('marketing_campaigns').insert({
        tenant_id: tenant.id,
        title: newCampaign.title,
        subject: newCampaign.subject,
        sender_name: newCampaign.sender_name,
        sender_email: newCampaign.sender_email,
        reply_to: newCampaign.reply_to,
        status: newCampaign.status,
        total_recipients: newCampaign.total_recipients,
        rate_limit_per_second: newCampaign.rate_limit_per_second,
      }).then();
    }

    return newCampaign;
  };

  const launchCampaign = async (campaignId: string) => {
    const targetCampaign = campaigns.find((c) => c.id === campaignId);
    const targetTemplate = templates.find((t) => t.id === targetCampaign?.template_id);
    const queue = campaignQueue[campaignId] || [];

    if (!targetCampaign || !targetTemplate) return;

    // Atualiza status da campanha para enviando
    setCampaigns((prev) =>
      prev.map((c) => (c.id === campaignId ? { ...c, status: 'sending', updated_at: new Date().toISOString() } : c))
    );

    const leadsMap = new Map<string, Lead>(leads.map((l) => [l.id, l]));

    // Executa o processamento em lote com a chave Resend configurada
    await processCampaignQueueBatch(
      targetCampaign,
      targetTemplate.html_content,
      queue,
      leadsMap,
      tenant.resend_api_key || '',
      (updatedItem) => {
        setCampaignQueue((prev) => {
          const currentQueue = prev[campaignId] || [];
          const updated = currentQueue.map((item) => (item.id === updatedItem.id ? updatedItem : item));
          return { ...prev, [campaignId]: updated };
        });
      },
      (sent) => {
        // Atualiza contadores na campanha
        setCampaigns((prev) =>
          prev.map((c) =>
            c.id === campaignId
              ? {
                  ...c,
                  sent_count: sent,
                  delivered_count: Math.floor(sent * 0.98),
                  opened_count: Math.floor(sent * 0.45),
                  clicked_count: Math.floor(sent * 0.18),
                }
              : c
          )
        );
      }
    );

    // Marca como concluída
    setCampaigns((prev) =>
      prev.map((c) =>
        c.id === campaignId
          ? {
              ...c,
              status: 'completed',
              updated_at: new Date().toISOString(),
            }
          : c
      )
    );

    const supabase = getSupabaseClient();
    if (supabase) {
      supabase.from('marketing_campaigns').update({ status: 'completed' }).eq('id', campaignId).then();
    }
  };

  const pauseCampaign = (campaignId: string) => {
    setCampaigns((prev) =>
      prev.map((c) => (c.id === campaignId ? { ...c, status: 'paused', updated_at: new Date().toISOString() } : c))
    );
  };

  // Audiences
  const addAudience = async (audienceData: Omit<SavedAudience, 'id' | 'tenant_id' | 'created_at'>): Promise<SavedAudience> => {
    const newAudience: SavedAudience = {
      ...audienceData,
      id: `aud_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      tenant_id: tenant.id,
      created_at: new Date().toISOString(),
    };
    setAudiences((prev) => [newAudience, ...prev]);

    const supabase = getSupabaseClient();
    if (supabase) {
      supabase.from('saved_audiences').insert({
        tenant_id: tenant.id,
        name: newAudience.name,
        description: newAudience.description,
        filters_json: newAudience.filters,
      }).then();
    }

    return newAudience;
  };

  const deleteAudience = async (id: string) => {
    setAudiences((prev) => prev.filter((a) => a.id !== id));

    const supabase = getSupabaseClient();
    if (supabase) {
      supabase.from('saved_audiences').delete().eq('id', id).then();
    }
  };

  const isSupabaseConnected = Boolean(
    import.meta.env.VITE_SUPABASE_URL || localStorage.getItem('saas_supabase_url')
  );

  return (
    <AppContext.Provider
      value={{
        theme,
        toggleTheme,
        setThemeMode,
        tenant,
        updateTenant,
        leads,
        addLead,
        updateLead,
        deleteLead,
        batchImportLeads,
        toggleOptOut,
        verifyLeadMx,
        prospectingJobs,
        prospectingResults,
        addProspectingJob,
        updateProspectingResultStatus,
        importProspectsToLeads,
        templates,
        addTemplate,
        updateTemplate,
        deleteTemplate,
        campaigns,
        campaignQueue,
        createCampaign,
        launchCampaign,
        pauseCampaign,
        audiences,
        addAudience,
        deleteAudience,
        isSupabaseConnected,
        isLoadingDb,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp deve ser utilizado dentro de um AppProvider');
  }
  return context;
};
