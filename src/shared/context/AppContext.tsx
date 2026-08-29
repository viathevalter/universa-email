import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type {
  Tenant,
  Lead,
  LeadProspectingJob,
  LeadProspectingResult,
  LeadProspectingMission,
  MarketingTemplate,
  MarketingCampaign,
  MarketingCampaignQueue,
  SavedAudience,
} from '../../types';
import { verifyEmailDns } from '../services/dnsService';
import { processCampaignQueueBatch } from '../services/resendService';
import { getSupabaseClient } from '../services/supabaseClient';
import { SPAIN_B2C_MISSIONS, searchB2BLeadsWithAI, deduplicateProspects } from '../services/geminiService';

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
  
  // B2C Missions & Prospecting
  missions: LeadProspectingMission[];
  runMission: (missionId: string, location: string, count: number, onProgress?: (c: number, t: number) => void) => Promise<number>;
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
  MISSIONS: 'universa_missions_data',
  JOBS: 'universa_jobs_data',
  RESULTS: 'universa_results_data',
  TEMPLATES: 'universa_templates_data',
  CAMPAIGNS: 'universa_campaigns_data',
  QUEUE: 'universa_queue_data',
  AUDIENCES: 'universa_audiences_data',
};

const DEFAULT_TENANT: Tenant = {
  id: '00000000-0000-0000-0000-000000000001',
  name: 'Universa TV España',
  trade_name: 'Universa Streaming & IPTV',
  resend_api_key: import.meta.env.VITE_RESEND_API_KEY || '',
  marketing_sender_email: 'soporte@universaemail.com',
  sender_name: 'Universa TV España',
  gemini_api_key: import.meta.env.VITE_GEMINI_API_KEY || '',
  whatsapp_support_number: '+34 600 000 000',
  created_at: new Date().toISOString(),
};

const INITIAL_TEMPLATES: MarketingTemplate[] = [
  {
    id: 'tmpl_laliga_24h_es',
    tenant_id: '00000000-0000-0000-0000-000000000001',
    title: '⚽ [ES] LaLiga & Fútbol - Prueba de 24 Horas Gratis',
    subject: '⚽ ¿Ver todo el fútbol y Champions sin pagar 120€/mes? (Test 24 Horas Gratis)',
    category: 'b2c_es',
    html_content: `<div style="font-family: Arial, Helvetica, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; color: #18181b; line-height: 1.6; padding: 24px; border-radius: 8px; border: 1px solid #e4e4e7;">
  <div style="text-align: center; margin-bottom: 24px;">
    <h2 style="color: #4f46e5; margin: 0; font-size: 22px;">⚽ Universa TV España</h2>
    <p style="color: #71717a; font-size: 14px; margin-top: 4px;">Toda LaLiga, Champions League, DAZN y +8.000 Canales en 4K</p>
  </div>

  <p>Hola <strong>{{nome}}</strong>,</p>
  <p>Sabemos que pagar más de <strong>120€ al mes</strong> en plataformas de televisión para ver el fútbol y tus series favoritas es excesivo.</p>
  <p>Por eso, queremos que pruebes nuestro servicio <strong>completamente gratis durante 24 Horas</strong> en tu Smart TV, Fire Stick, Móvil o Tablet antes de decidir nada:</p>

  <div style="background-color: #f8fafc; border: 2px dashed #6366f1; border-radius: 8px; padding: 18px; margin: 24px 0; text-align: center;">
    <h3 style="margin: 0 0 10px 0; color: #1e293b; font-size: 17px;">🎁 Tu Prueba Gratuita de 24 Horas</h3>
    <p style="font-size: 13px; color: #64748b; margin-bottom: 16px;">Sin cortes, calidad Full HD/4K real y soporte en español 24/7.</p>
    <a href="https://api.whatsapp.com/send?phone=34600000000&text=Hola,%20quiero%20activar%20mi%20prueba%20gratis%20de%2024%20horas" style="background-color: #22c55e; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 15px; display: inline-block;">👉 Activar Mi Prueba de 24 Horas por WhatsApp</a>
  </div>

  <div style="background-color: #f1f5f9; padding: 16px; border-radius: 6px; margin: 20px 0;">
    <h4 style="margin: 0 0 8px 0; font-size: 14px; color: #334155;">Nuestros Planes Oficiales en España:</h4>
    <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: #475569;">
      <li><strong>Mensual:</strong> 9,50€ / mes</li>
      <li><strong>Trimestral:</strong> 25€ (Ahorras 15%)</li>
      <li><strong>Semestral:</strong> 40€ (Ahorras 30%)</li>
      <li><strong>Anual:</strong> 70€ (Menos de 6€ al mes - ¡Super Oferta!)</li>
    </ul>
  </div>

  <p style="font-size: 13px; color: #64748b; margin-top: 24px;">¿Tienes alguna pregunta? Respóndenos a este e-mail o escríbenos directo por WhatsApp.<br><strong>Equipo Universa TV España</strong></p>
</div>`,
    variables: ['{{nome}}', '{{cidade}}', '{{link_descadastro}}'],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'tmpl_cine_24h_es',
    tenant_id: '00000000-0000-0000-0000-000000000001',
    title: '🎬 [ES] Cine, Series y +8.000 Canales - Test 24 Horas',
    subject: '🎬 Todos los estrenos de cine, series y TV en 4K - Prueba 24 Horas Gratis',
    category: 'b2c_es',
    html_content: `<div style="font-family: Arial, Helvetica, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; color: #18181b; line-height: 1.6; padding: 24px; border-radius: 8px; border: 1px solid #e4e4e7;">
  <div style="text-align: center; margin-bottom: 20px;">
    <h2 style="color: #6366f1; margin: 0; font-size: 22px;">🍿 Cine & Series en 4K en Casa</h2>
    <p style="color: #71717a; font-size: 14px;">Netflix, HBO Max, Disney+, SkyShowtime y +8.000 Canales en una sola app</p>
  </div>

  <p>Hola <strong>{{nome}}</strong>,</p>
  <p>¿Cansado de pagar múltiples suscripciones mensuales que suman más de 60€ al mes? En <strong>Universa TV</strong> tienes todas las plataformas, canales de cine 24/7 y estrenos de cartelera unificados en tu Smart TV o Fire Stick.</p>

  <p style="text-align: center; margin: 28px 0;">
    <a href="https://api.whatsapp.com/send?phone=34600000000&text=Hola,%20quiero%20probar%20Universa%20TV%20por%2024%20horas" style="background-color: #4f46e5; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 15px; display: inline-block;">🍿 Solicitar Test de 24 Horas Gratis</a>
  </p>

  <div style="border-top: 1px solid #e2e8f0; padding-top: 16px; font-size: 13px; color: #475569;">
    <p style="margin: 0 0 6px 0;"><strong>Planes Disponibles:</strong></p>
    <p style="margin: 0;">• Mensual: <strong>9.50€</strong> | Trimestral: <strong>25€</strong> | Semestral: <strong>40€</strong> | Anual: <strong>70€</strong></p>
  </div>
</div>`,
    variables: ['{{nome}}', '{{cidade}}', '{{link_descadastro}}'],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'tmpl_brasileiros_24h_pt',
    tenant_id: '00000000-0000-0000-0000-000000000001',
    title: '🇧🇷 [PT] Brasileiros na Espanha - TV do Brasil sem travas (Teste 24h)',
    subject: '🇧🇷 Assista TV Globo, Premiere, Novelas e Brasileirão na Espanha (Teste 24h Grátis)',
    category: 'b2c_pt',
    html_content: `<div style="font-family: Arial, Helvetica, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; color: #18181b; line-height: 1.6; padding: 24px; border-radius: 8px; border: 1px solid #e4e4e7;">
  <div style="text-align: center; margin-bottom: 20px;">
    <h2 style="color: #16a34a; margin: 0; font-size: 22px;">🇧🇷 Todos os Canais do Brasil na Espanha</h2>
    <p style="color: #71717a; font-size: 14px;">Globo ao vivo, Premiere Futebol, BBB, Novelas e Filmes dublados</p>
  </div>

  <p>Olá <strong>{{nome}}</strong>, tudo bem?</p>
  <p>Mora na Espanha e está com saudades de acompanhar o futebol brasileiro, as novelas da Globo, notícias e canais infantis com a família?</p>
  <p>O <strong>Universa TV</strong> foi configurado com servidores ultrarrápidos na Europa para garantir transmissão 100% lisa, sem travamentos na sua Smart TV, TV Box, Fire Stick ou Celular.</p>

  <div style="background-color: #f0fdf4; border: 2px solid #86efac; border-radius: 8px; padding: 18px; margin: 24px 0; text-align: center;">
    <h3 style="margin: 0 0 10px 0; color: #15803d; font-size: 16px;">🎁 Teste Grátis de 24 Horas Liberado</h3>
    <a href="https://api.whatsapp.com/send?phone=34600000000&text=Ola,%20sou%20brasileiro%20na%20Espanha%20e%20quero%20o%20teste%20de%2024h" style="background-color: #16a34a; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">👉 Pedir Teste de 24 Horas no WhatsApp</a>
  </div>

  <p style="font-size: 13px; color: #475569;">
    <strong>Planos:</strong> Mensal 9,50€ | Trimestral 25€ | Semestral 40€ | Anual 70€ (Super Econômico).
  </p>
  <p style="font-size: 12px; color: #94a3b8; margin-top: 20px;">Atenciosamente,<br>Equipe Universa TV Espanha</p>
</div>`,
    variables: ['{{nome}}', '{{cidade}}', '{{link_descadastro}}'],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const INITIAL_LEADS: Lead[] = [
  {
    id: 'lead_b2c_01',
    tenant_id: '00000000-0000-0000-0000-000000000001',
    name: 'Alejandro Martínez',
    company_name: 'Aficionado Real Madrid (Madrid)',
    email: 'alejandro.martinez84@gmail.com',
    phone: '+34 612 34 56 78',
    sector: 'Streaming & Esportes B2C',
    role: 'Torcedor LaLiga / Smart TV',
    company_size: 'B2C (Consumidor)',
    city: 'Madrid',
    province: 'Comunidad de Madrid',
    country: 'Espanha',
    tags: ['LaLiga', 'Futebol ES', 'Madrid', 'MX Verificado'],
    status: 'qualified',
    opted_out: false,
    mx_valid: true,
    mx_record: 'gmail-smtp-in.l.google.com',
    target_niche: 'laliga_es',
    created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'lead_b2c_02',
    tenant_id: '00000000-0000-0000-0000-000000000001',
    name: 'Mateo González',
    company_name: 'Aficionado FC Barcelona (Barcelona)',
    email: 'mateo.gonzalez.bcn@hotmail.es',
    phone: '+34 655 43 21 09',
    sector: 'Streaming & Esportes B2C',
    role: 'Torcedor Barça / DAZN',
    company_size: 'B2C (Consumidor)',
    city: 'Barcelona',
    province: 'Cataluña',
    country: 'Espanha',
    tags: ['LaLiga', 'Barcelona', 'Cataluña'],
    status: 'contacted',
    opted_out: false,
    mx_valid: true,
    mx_record: 'hotmail-com.olc.protection.outlook.com',
    target_niche: 'laliga_es',
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'lead_b2c_03',
    tenant_id: '00000000-0000-0000-0000-000000000001',
    name: 'Rodrigo Silva',
    company_name: 'Brasileiros em Madrid (Comunidade BR)',
    email: 'rodrigo.silva.es@gmail.com',
    phone: '+34 689 11 22 33',
    sector: 'Comunidade Expat',
    role: 'Brasileiro na Espanha (Globo/Premiere)',
    company_size: 'B2C (Consumidor)',
    city: 'Madrid',
    province: 'Madrid',
    country: 'Espanha',
    tags: ['Brasileiro na Espanha', 'Premiere', 'Globo'],
    status: 'replied',
    opted_out: false,
    mx_valid: true,
    mx_record: 'gmail-smtp-in.l.google.com',
    target_niche: 'brasileiros_es',
    created_at: new Date(Date.now() - 86400000 * 1).toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const INITIAL_AUDIENCES: SavedAudience[] = [
  {
    id: 'aud_laliga_es',
    tenant_id: '00000000-0000-0000-0000-000000000001',
    name: '⚽ Torcedores LaLiga & Esportes Espanha (MX Válido)',
    description: 'Aficionados por futebol na Espanha com e-mail verificado',
    filters: {
      tags: ['LaLiga'],
      mx_valid_only: true,
      exclude_opted_out: true,
    },
    lead_count: 2,
    created_at: new Date().toISOString(),
  },
  {
    id: 'aud_brasileiros_es',
    tenant_id: '00000000-0000-0000-0000-000000000001',
    name: '🇧🇷 Brasileiros na Espanha (Canais do Brasil)',
    description: 'Comunidade brasileira residente na Espanha',
    filters: {
      tags: ['Brasileiro na Espanha'],
      exclude_opted_out: true,
    },
    lead_count: 1,
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

  // Missions State
  const [missions, setMissions] = useState<LeadProspectingMission[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.MISSIONS);
    return saved ? JSON.parse(saved) : SPAIN_B2C_MISSIONS;
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
      const { data: dbLeads, error: leadsErr } = await supabase.from('leads').select('*').order('created_at', { ascending: false });
      if (!leadsErr && dbLeads && dbLeads.length > 0) {
        setLeads(dbLeads);
      }

      const { data: dbTemplates, error: tmplErr } = await supabase.from('marketing_templates').select('*');
      if (!tmplErr && dbTemplates && dbTemplates.length > 0) {
        setTemplates(dbTemplates);
      }

      const { data: dbCampaigns, error: campErr } = await supabase.from('marketing_campaigns').select('*').order('created_at', { ascending: false });
      if (!campErr && dbCampaigns && dbCampaigns.length > 0) {
        setCampaigns(dbCampaigns);
      }

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

  // Persistence side-effects
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.TENANT, JSON.stringify(tenant));
  }, [tenant]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.LEADS, JSON.stringify(leads));
  }, [leads]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.MISSIONS, JSON.stringify(missions));
  }, [missions]);

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

  // Run B2C Mission
  const runMission = async (
    missionId: string,
    location: string,
    count: number,
    onProgress?: (c: number, t: number) => void
  ): Promise<number> => {
    const mission = missions.find((m) => m.id === missionId) || missions[0];
    const jobId = `job_mission_${Date.now()}`;

    const newJob: LeadProspectingJob = {
      id: jobId,
      tenant_id: tenant.id,
      title: `${mission.title} - ${location}`,
      keywords: mission.keywords,
      location,
      mission_id: mission.id,
      target_count: count,
      processed_count: 0,
      found_emails_count: 0,
      status: 'processing',
      created_at: new Date().toISOString(),
    };

    const results = await searchB2BLeadsWithAI(
      {
        keywords: mission.keywords,
        location,
        niche: mission.niche,
        targetCount: count,
        apiKey: tenant.gemini_api_key,
        jobId,
        tenantId: tenant.id,
      },
      onProgress
    );

    const existingEmails = new Set(leads.map((l) => l.email.toLowerCase().trim()));
    const unique = deduplicateProspects(results, existingEmails);

    const completedJob: LeadProspectingJob = {
      ...newJob,
      processed_count: results.length,
      found_emails_count: unique.length,
      status: 'completed',
    };

    await addProspectingJob(completedJob, unique);

    // Atualiza contadores da missão
    setMissions((prev) =>
      prev.map((m) =>
        m.id === missionId
          ? {
              ...m,
              captured_count: m.captured_count + unique.length,
              valid_mx_count: m.valid_mx_count + unique.filter((r) => r.mx_status === 'valid').length,
            }
          : m
      )
    );

    return unique.length;
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
      sector: p.sector || 'Streaming & Esportes',
      role: p.role || 'Consumidor B2C',
      company_size: p.company_size || 'B2C (Consumidor)',
      city: p.city || 'Madrid',
      province: p.province || 'Espanha',
      country: p.country || 'Espanha',
      tags: ['B2C Espanha', p.target_niche ? p.target_niche.toUpperCase() : 'Streaming'].filter(Boolean),
      status: 'new',
      opted_out: false,
      mx_valid: p.mx_status === 'valid',
      mx_record: p.mx_host,
      target_niche: p.target_niche,
    }));

    const count = await batchImportLeads(leadsToCreate);
    
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

    setCampaigns((prev) =>
      prev.map((c) => (c.id === campaignId ? { ...c, status: 'sending', updated_at: new Date().toISOString() } : c))
    );

    const leadsMap = new Map<string, Lead>(leads.map((l) => [l.id, l]));

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
        missions,
        runMission,
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
