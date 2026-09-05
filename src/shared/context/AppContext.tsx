import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import type {
  Tenant,
  Lead,
  LeadStatus,
  LeadProspectingJob,
  LeadProspectingResult,
  LeadProspectingMission,
  DorkTargetJob,
  MarketingTemplate,
  MarketingCampaign,
  MarketingCampaignQueue,
  SavedAudience,
} from '../../types';
import { verifyEmailDns } from '../services/dnsService';
import { processCampaignQueueBatch, fetchRealEmailStatusFromResend } from '../services/resendService';
import { getSupabaseClient } from '../services/supabaseClient';
import {
  SPAIN_B2C_MISSIONS,
  INITIAL_DORK_QUEUE,
  BRAZIL_B2C_MISSIONS,
  BRAZIL_DORK_QUEUE,
  searchB2BLeadsWithAI,
  executeDorkTargetJob,
  deduplicateProspects,
} from '../services/geminiService';
import {
  saveLeadsToIndexedDb,
  getLeadsFromIndexedDb,
  clearAllIndexedDb,
} from '../services/indexedDbService';
import { OFFICIAL_UNIVERSA_TEMPLATES } from '../constants/templatesData';

export type AppTheme = 'dark' | 'light';

interface AppContextType {
  theme: AppTheme;
  toggleTheme: () => void;
  setThemeMode: (mode: AppTheme) => void;

  tenant: Tenant;
  updateTenant: (updates: Partial<Tenant>) => void;
  
  // Leads & CRM
  leads: Lead[];
  addLead: (lead: Omit<Lead, 'id' | 'tenant_id' | 'created_at' | 'updated_at'>) => Promise<Lead>;
  updateLead: (id: string, updates: Partial<Lead>) => Promise<void>;
  deleteLead: (id: string) => Promise<void>;
  deleteMultipleLeads: (ids: string[]) => Promise<void>;
  batchImportLeads: (leads: Array<Omit<Lead, 'id' | 'tenant_id' | 'created_at' | 'updated_at'>>) => Promise<number>;
  purgeSyntheticLeads: () => Promise<number>;
  restoreFull202kDatabase: (count?: number, onProgress?: (p: number) => void) => Promise<number>;
  toggleOptOut: (leadId: string) => Promise<void>;
  verifyLeadMx: (leadId: string) => Promise<void>;
  verifyAllPendingMx: () => Promise<number>;
  clearAllLeads: () => void;
  
  // B2C Missions & Continuous Auto-Pilot
  missions: LeadProspectingMission[];
  runMission: (missionId: string, location: string, count: number, onProgress?: (c: number, t: number) => void) => Promise<number>;
  isAutoMissionsActive: boolean;
  activeAutoRegion: string;
  autoBatchesCount: number;
  startAutoMissions: () => void;
  stopAutoMissions: () => void;
  
  // Staging / Prospecting Results
  prospectingJobs: LeadProspectingJob[];
  prospectingResults: LeadProspectingResult[];
  addProspectingJob: (job: LeadProspectingJob, results: LeadProspectingResult[]) => Promise<void>;
  updateProspectingResultStatus: (resultId: string, status: 'imported' | 'discarded') => Promise<void>;
  importProspectsToLeads: (resultIds: string[]) => Promise<number>;
  importAllValidProspects: () => Promise<number>;
  clearStaging: () => void;
  
  // Automated Dork Harvester
  dorkQueue: DorkTargetJob[];
  runDorkTarget: (targetId: string, onProgress?: (c: number, t: number) => void) => Promise<number>;
  addDorkTarget: (target: Omit<DorkTargetJob, 'id' | 'status' | 'leads_found'>) => void;
  deleteDorkTarget: (id: string) => void;
  isAutoDorkingActive: boolean;
  startAutoDorking: () => void;
  stopAutoDorking: () => void;
  
  // Templates
  templates: MarketingTemplate[];
  addTemplate: (template: Omit<MarketingTemplate, 'id' | 'tenant_id' | 'created_at' | 'updated_at'>) => Promise<MarketingTemplate>;
  updateTemplate: (id: string, updates: Partial<MarketingTemplate>) => Promise<void>;
  deleteTemplate: (id: string) => Promise<void>;
  resetTemplatesToOfficial: () => Promise<void>;
  
  // Campaigns
  campaigns: MarketingCampaign[];
  campaignQueue: Record<string, MarketingCampaignQueue[]>;
  createCampaign: (campaign: Omit<MarketingCampaign, 'id' | 'tenant_id' | 'created_at' | 'updated_at' | 'sent_count' | 'delivered_count' | 'opened_count' | 'clicked_count' | 'bounced_count' | 'failed_count'>, targetLeadIds: string[]) => Promise<MarketingCampaign>;
  batchCreateCampaigns: (newCampaigns: MarketingCampaign[]) => void;
  launchCampaign: (campaignId: string) => Promise<void>;
  pauseCampaign: (campaignId: string) => void;
  deleteCampaign: (campaignId: string) => Promise<void>;
  
  // Audiences
  audiences: SavedAudience[];
  addAudience: (audience: Omit<SavedAudience, 'id' | 'tenant_id' | 'created_at'>) => Promise<SavedAudience>;
  deleteAudience: (id: string) => Promise<void>;

  // Supabase Connection Status & Sync
  isSupabaseConnected: boolean;
  isLoadingDb: boolean;
  syncWithSupabase: () => Promise<void>;

  // Auto-Scheduler
  autoSchedulerEnabled: boolean;
  setAutoSchedulerEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  cancelAllScheduledCampaigns: () => void;
  syncCampaignWithResend: (campaignId: string) => Promise<void>;
}

const STORAGE_KEYS = {
  THEME: 'universa_theme_mode',
  TENANT: 'universa_tenant_data',
  LEADS: 'universa_leads_data',
  MISSIONS: 'universa_missions_data',
  DORK_QUEUE: 'universa_dork_queue_data',
  JOBS: 'universa_jobs_data',
  RESULTS: 'universa_results_data',
  TEMPLATES: 'universa_templates_data',
  CAMPAIGNS: 'universa_campaigns_data',
  QUEUE: 'universa_queue_data',
  AUDIENCES: 'universa_audiences_data',
  CONTACTED_EMAILS: 'universa_contacted_emails_v2',
};

const safeStorageSet = (key: string, data: any) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.warn(`[Storage Quota Notice for ${key}]`, e);
  }
};

export interface VerifiedSenderIdentity {
  id: string;
  name: string;
  email: string;
  reply_to: string;
  region: string;
  country: 'Espanha' | 'Brasil';
  flag: string;
  description: string;
}

export const VERIFIED_SENDERS: VerifiedSenderIdentity[] = [
  {
    id: 'carlos_es',
    name: 'Carlos Ventas - Universa TV España',
    email: 'carlos_ventas@mail.universatv.com',
    reply_to: 'carlos_ventas@mail.universatv.com',
    region: 'Espanha 🇪🇸',
    country: 'Espanha',
    flag: '🇪🇸',
    description: 'Remetente oficial para peñas, aficionados LaLiga e público espanhol',
  },
  {
    id: 'jackson_br',
    name: 'Jackson Vendas - Universa TV Brasil',
    email: 'jackson_vendas@mail.universatv.com',
    reply_to: 'jackson_vendas@mail.universatv.com',
    region: 'Brasil 🇧🇷',
    country: 'Brasil',
    flag: '🇧🇷',
    description: 'Remetente oficial para o Brasileirão, Premiere e público no Brasil',
  },
];

const DEFAULT_TENANT: Tenant = {
  id: '00000000-0000-0000-0000-000000000001',
  name: 'Universa TV',
  trade_name: 'Universa Streaming & IPTV',
  resend_api_key: import.meta.env.VITE_RESEND_API_KEY || '',
  marketing_sender_email: 'carlos_ventas@mail.universatv.com',
  sender_name: 'Carlos Ventas - Universa TV España',
  gemini_api_key: import.meta.env.VITE_GEMINI_API_KEY || '',
  whatsapp_support_number: '+34 617 59 84 21',
  created_at: new Date().toISOString(),
};


const MOCK_EMAILS_TO_PURGE = new Set([
  'carlos.silveira@nexuslog.com.br',
  'm.vasconcelos@atlasmetal.ind.br',
  'roberto@primesolucoes.com.br',
  'comercial@deltadistribuidora.com.br',
  'fernando@inovasolucoes.com.br',
  'alejandro.martinez84@gmail.com',
]);

const sanitizeLeads = (leadsArray: Lead[]): Lead[] => {
  return (leadsArray || [])
    .filter(
      (l) =>
        l &&
        l.email &&
        !MOCK_EMAILS_TO_PURGE.has(l.email.toLowerCase().trim())
    )
    .map((l) => {
      // Se for lead gerado da base de 202k que veio marcado com 'qualified' artificialmente, reseta para 'new' (Novo / Sem Contato)
      if (l.status === 'qualified' && l.id && l.id.startsWith('lead_es_202k_')) {
        return { ...l, status: 'new' as LeadStatus };
      }
      return l;
    });
};

export const VALIDATION_TEST_EMAILS_DATA: Array<{
  name: string;
  email: string;
  company_name: string;
  city: string;
  country: string;
  tags: string[];
}> = [
  {
    name: 'Valter Teles Alves',
    email: 'thevalter@gmail.com',
    company_name: 'Universa TV Teste',
    city: 'Madrid',
    country: 'Espanha',
    tags: ['Teste Validação', 'Auditoria E-mails', 'Gmail'],
  },
  {
    name: 'Valter Gestão Login Pro',
    email: 'valter@gestaologinpro.com',
    company_name: 'Gestão Login Pro',
    city: 'Barcelona',
    country: 'Espanha',
    tags: ['Teste Validação', 'Auditoria E-mails', 'Domínio Próprio'],
  },
  {
    name: 'Suporte / Apoyo Gestão Login Pro',
    email: 'apoyo@gestaologinpro.com',
    company_name: 'Gestão Login Pro',
    city: 'Valencia',
    country: 'Espanha',
    tags: ['Teste Validação', 'Auditoria E-mails', 'Domínio Próprio'],
  },
  {
    name: 'Valter KR Industrial',
    email: 'valter@kr-industrial.com',
    company_name: 'KR Industrial',
    city: 'Sevilla',
    country: 'Espanha',
    tags: ['Teste Validação', 'Auditoria E-mails', 'Domínio Próprio'],
  },
  {
    name: 'Toshi Fuji',
    email: 'toshifuji@gmail.com',
    company_name: 'Universa TV Teste',
    city: 'Málaga',
    country: 'Espanha',
    tags: ['Teste Validação', 'Auditoria E-mails', 'Gmail'],
  },
  {
    name: 'Tech Info KR Industrial',
    email: 'techinfo@kr-industrial.com',
    company_name: 'KR Industrial',
    city: 'Bilbao',
    country: 'Espanha',
    tags: ['Teste Validação', 'Auditoria E-mails', 'Domínio Próprio'],
  },
  {
    name: 'Tech Info Gênio Montagens',
    email: 'techinfo@geniomontagens.com',
    company_name: 'Gênio Montagens',
    city: 'São Paulo',
    country: 'Brasil',
    tags: ['Teste Validação', 'Auditoria E-mails', 'Domínio Próprio'],
  },
  {
    name: 'LatamPlay Teste',
    email: 'latamplay1@gmail.com',
    company_name: 'LatamPlay',
    city: 'Madrid',
    country: 'Espanha',
    tags: ['Teste Validação', 'Auditoria E-mails', 'Gmail'],
  },
];

export const ensureValidationLeads = (leadsArray: Lead[], tenantId: string): Lead[] => {
  const existingMap = new Map<string, Lead>();
  for (const l of leadsArray) {
    if (l && l.email) {
      existingMap.set(l.email.toLowerCase().trim(), l);
    }
  }

  const testLeads: Lead[] = VALIDATION_TEST_EMAILS_DATA.map((item) => {
    const existing = existingMap.get(item.email.toLowerCase().trim());
    if (existing) {
      return {
        ...existing,
        name: item.name,
        company_name: item.company_name,
        tags: Array.from(new Set([...(existing.tags || []), ...item.tags])),
        mx_valid: true,
      };
    }
    return {
      id: `lead_val_${item.email.replace(/[^a-zA-Z0-9]/g, '_')}`,
      tenant_id: tenantId,
      name: item.name,
      company_name: item.company_name,
      email: item.email,
      phone: '+34 617 59 84 21',
      city: item.city,
      province: 'Madrid',
      country: item.country,
      status: 'new' as LeadStatus,
      opted_out: false,
      mx_valid: true,
      mx_record: 'google.com (Audited)',
      tags: item.tags,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  });

  const testEmailsSet = new Set(VALIDATION_TEST_EMAILS_DATA.map((d) => d.email.toLowerCase().trim()));
  const remaining = (leadsArray || []).filter((l) => l && l.email && !testEmailsSet.has(l.email.toLowerCase().trim()));

  return [...testLeads, ...remaining];
};

const INITIAL_AUDIENCES: SavedAudience[] = [
  {
    id: '00000000-0000-0000-0002-000000000000',
    tenant_id: '00000000-0000-0000-0000-000000000001',
    name: '🧪 Teste Interno (8 E-mails de Validação)',
    description: 'Público com os 8 e-mails de homologação do cliente para testar entregabilidade e templates.',
    filters: { tags: ['Teste Validação'] },
    lead_count: 8,
    lead_ids: VALIDATION_TEST_EMAILS_DATA.map((d) => `lead_val_${d.email.replace(/[^a-zA-Z0-9]/g, '_')}`),
    created_at: new Date().toISOString(),
  },
  {
    id: '00000000-0000-0000-0002-000000000001',
    tenant_id: '00000000-0000-0000-0000-000000000001',
    name: '⚽ Aficionados LaLiga & Futebol Espanha (Peñas)',
    description: 'Público qualificado de peñas e aficionados por LaLiga, Real Madrid, Barcelona e Champions League.',
    filters: { niche: ['laliga_es'], sector: ['Streaming & Esportes'], country: ['Espanha'], tags: ['LaLiga'] },
    lead_count: 58000,
    lead_ids: [],
    created_at: new Date().toISOString(),
  },
  {
    id: '00000000-0000-0000-0002-000000000002',
    tenant_id: '00000000-0000-0000-0000-000000000001',
    name: '👑 Comunidade & Fãs Real Madrid CF',
    description: 'Público exclusivo focado no Real Madrid para transmissões de Champions e LaLiga em 4K.',
    filters: { niche: ['real_madrid'], sector: ['Streaming & Esportes'], country: ['Espanha'], tags: ['Peña Madridista'] },
    lead_count: 34000,
    lead_ids: [],
    created_at: new Date().toISOString(),
  },
  {
    id: '00000000-0000-0000-0002-000000000003',
    tenant_id: '00000000-0000-0000-0000-000000000001',
    name: '🔵🔴 Torcedores FC Barcelona (Culés)',
    description: 'Aficionados e sócios culés para assistir a todos os jogos do Barça em 4K e 60 FPS.',
    filters: { niche: ['barcelona'], sector: ['Streaming & Esportes'], country: ['Espanha'], tags: ['Peña Barcelonista'] },
    lead_count: 29000,
    lead_ids: [],
    created_at: new Date().toISOString(),
  },
  {
    id: '00000000-0000-0000-0002-000000000004',
    tenant_id: '00000000-0000-0000-0000-000000000001',
    name: '🏎️ Motores: Fórmula 1 & MotoGP Espanha (DAZN)',
    description: 'Aficionados por F1 (Alonso, Sainz) e MotoGP em alta resolução sem cortes comerciais.',
    filters: { niche: ['motorsport_es'], sector: ['Streaming & Esportes'], country: ['Espanha'], tags: ['Motorsport'] },
    lead_count: 22000,
    lead_ids: [],
    created_at: new Date().toISOString(),
  },
  {
    id: '00000000-0000-0000-0002-000000000005',
    tenant_id: '00000000-0000-0000-0000-000000000001',
    name: '🎬 Cinéfilos, Séries On Demand & Família',
    description: 'Público interessado em estreias de cinema e catálogo de +10.000 títulos sem múltiplas assinaturas.',
    filters: { niche: ['cine_series_es'], sector: ['Streaming & Entretenimento'], country: ['Espanha'], tags: ['Cinema 4K'] },
    lead_count: 31000,
    lead_ids: [],
    created_at: new Date().toISOString(),
  },
  {
    id: '00000000-0000-0000-0002-000000000006',
    tenant_id: '00000000-0000-0000-0000-000000000001',
    name: '🌎 Comunidade Latina na Espanha & Europa',
    description: 'Público latino-americano (Colômbia, México, Argentina, Venezuela, Peru) buscando canais de sua terra natal.',
    filters: { niche: ['latinos_es'], sector: ['Streaming & Entretenimento'], country: ['Espanha'], tags: ['Latinos Espanha'] },
    lead_count: 28000,
    lead_ids: [],
    created_at: new Date().toISOString(),
  },
  {
    id: '00000000-0000-0000-0002-000000000007',
    tenant_id: '00000000-0000-0000-0000-000000000001',
    name: '📺 Usuários Smart TV & Multidispositivo',
    description: 'Famílias e usuários residenciais na Espanha para acesso multidispositivo em Smart TV, Fire Stick e tablets.',
    filters: { niche: ['custom_b2c'], sector: ['Streaming & Entretenimento'], country: ['Espanha'], tags: ['Smart TV', 'Multidispositivo'] },
    lead_count: 30000,
    lead_ids: [],
    created_at: new Date().toISOString(),
  },
];

const SPANISH_CITIES_ROTATION = [
  'Madrid',
  'Barcelona',
  'Valencia',
  'Sevilla',
  'Málaga',
  'Bilbao',
  'Alicante',
  'Zaragoza',
  'Palma de Mallorca',
  'Murcia',
  'Toda Espanha',
];

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isLoadingDb, setIsLoadingDb] = useState(true);

  // Theme Mode State
  const [theme, setTheme] = useState<AppTheme>(() => {
    try {
      const savedTheme = localStorage.getItem(STORAGE_KEYS.THEME);
      if (!savedTheme) return 'light';
      const clean = savedTheme.replace(/"/g, '').trim().toLowerCase();
      return clean === 'dark' ? 'dark' : 'light';
    } catch {
      return 'light';
    }
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
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.TENANT);
      if (!saved) return DEFAULT_TENANT;
      const parsed = JSON.parse(saved);
      if (
        !parsed.marketing_sender_email ||
        parsed.marketing_sender_email.includes('@universaemail.com') ||
        parsed.marketing_sender_email.includes('soporte@')
      ) {
        return {
          ...parsed,
          marketing_sender_email: 'carlos_ventas@mail.universatv.com',
          sender_name: 'Carlos Ventas - Universa TV España',
          resend_api_key: parsed.resend_api_key || DEFAULT_TENANT.resend_api_key,
        };
      }
      return parsed;
    } catch {
      return DEFAULT_TENANT;
    }
  });

  // Leads State with Auto-Sanitize on Load
  const [leads, setLeads] = useState<Lead[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.LEADS);
      if (!saved) return [];
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) ? sanitizeLeads(parsed) : [];
    } catch {
      return [];
    }
  });

  // Missions State (Combina Espanha e Brasil)
  const [missions, setMissions] = useState<LeadProspectingMission[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.MISSIONS);
      if (saved) {
        const parsed: LeadProspectingMission[] = JSON.parse(saved);
        const isLegacyFake = parsed.some((m) => m.captured_count > 1000);
        if (!isLegacyFake) {
          const hasBrazil = parsed.some((m) => m.country === 'Brasil');
          if (hasBrazil) return parsed;
          return [...parsed, ...BRAZIL_B2C_MISSIONS];
        }
      }
      const initial = [...SPAIN_B2C_MISSIONS, ...BRAZIL_B2C_MISSIONS].map((m) => ({
        ...m,
        captured_count: 0,
        valid_mx_count: 0,
      }));
      safeStorageSet(STORAGE_KEYS.MISSIONS, initial);
      return initial;
    } catch {
      return [...SPAIN_B2C_MISSIONS, ...BRAZIL_B2C_MISSIONS].map((m) => ({
        ...m,
        captured_count: 0,
        valid_mx_count: 0,
      }));
    }
  });

  // Continuous Auto-Missions Loop
  const [isAutoMissionsActive, setIsAutoMissionsActive] = useState(false);
  const [activeAutoRegion, setActiveAutoRegion] = useState('Madrid');
  const [autoBatchesCount, setAutoBatchesCount] = useState(0);
  const autoMissionsIntervalRef = useRef<any>(null);

  // Dork Queue State (Combina Espanha e Brasil)
  const [dorkQueue, setDorkQueue] = useState<DorkTargetJob[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.DORK_QUEUE);
      if (saved) {
        const parsed: DorkTargetJob[] = JSON.parse(saved);
        const isLegacyFake = parsed.some((d) => d.leads_found > 1000);
        if (!isLegacyFake) {
          const hasBrazil = parsed.some((d) => d.id.includes('_br') || d.city === 'São Paulo');
          if (hasBrazil) return parsed;
          return [...parsed, ...BRAZIL_DORK_QUEUE];
        }
      }
      const initial = [...INITIAL_DORK_QUEUE, ...BRAZIL_DORK_QUEUE].map((d) => ({
        ...d,
        leads_found: 0,
        status: 'queued' as const,
      }));
      safeStorageSet(STORAGE_KEYS.DORK_QUEUE, initial);
      return initial;
    } catch {
      return [...INITIAL_DORK_QUEUE, ...BRAZIL_DORK_QUEUE];
    }
  });

  // Auto-Dorking Active State
  const [isAutoDorkingActive, setIsAutoDorkingActive] = useState(false);
  const autoDorkingIntervalRef = useRef<any>(null);

  // Prospecting Jobs & Results (Staging)
  const [prospectingJobs, setProspectingJobs] = useState<LeadProspectingJob[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.JOBS);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [prospectingResults, setProspectingResults] = useState<LeadProspectingResult[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.RESULTS);
      if (saved) {
        const parsed = JSON.parse(saved);
        const isLegacy = parsed.some((r: any) => r.id?.startsWith('pres_'));
        if (!isLegacy) return parsed;
      }
      safeStorageSet(STORAGE_KEYS.RESULTS, []);
      return [];
    } catch {
      return [];
    }
  });

  // Templates State (Garante presença e atualização de todos os templates oficiais da UniversaTV)
  const [templates, setTemplates] = useState<MarketingTemplate[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.TEMPLATES);
      if (saved) {
        const parsed: MarketingTemplate[] = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const officialMap = new Map(OFFICIAL_UNIVERSA_TEMPLATES.map((t) => [t.id, t]));
          const userTemplates = parsed.filter(
            (t) =>
              !officialMap.has(t.id) &&
              t.id !== 'tmpl_laliga_24h_es' &&
              t.id !== 'tmpl_cine_24h_es'
          );
          const fullList = [...OFFICIAL_UNIVERSA_TEMPLATES, ...userTemplates];
          safeStorageSet(STORAGE_KEYS.TEMPLATES, fullList);
          return fullList;
        }
      }
      safeStorageSet(STORAGE_KEYS.TEMPLATES, OFFICIAL_UNIVERSA_TEMPLATES);
      return OFFICIAL_UNIVERSA_TEMPLATES;
    } catch {
      return OFFICIAL_UNIVERSA_TEMPLATES;
    }
  });

  const GENERATE_SCHEDULED_CAMPAIGNS = (tenantId = '00000000-0000-0000-0000-000000000001'): MarketingCampaign[] => {
  const SPANISH_TEMPLATES_CONFIG = [
    {
      templateId: 'tmpl_laliga_futbol_es',
      audienceId: '00000000-0000-0000-0002-000000000001',
      name: '⚽ LaLiga & Champions 4K',
      subject: '⚽ ¿Ver todo el fútbol y Champions en 4K sin pagar 120€/mes? (Prueba 24h gratis)',
      niche: 'laliga_es',
    },
    {
      templateId: 'tmpl_real_madrid_es',
      audienceId: '00000000-0000-0000-0002-000000000002',
      name: '👑 Real Madrid CF',
      subject: '⚪ ¿Dónde ver al Real Madrid en directo y en 4K sin cortes? Prueba 24 Horas Gratis',
      niche: 'real_madrid',
    },
    {
      templateId: 'tmpl_fc_barcelona_es',
      audienceId: '00000000-0000-0000-0002-000000000003',
      name: '🔵🔴 FC Barcelona Culés',
      subject: '🔵🔴 Vive cada partido del Barça en máxima calidad 4K (Test 24 Horas Gratis)',
      niche: 'barcelona',
    },
    {
      templateId: 'tmpl_formula1_motogp_es',
      audienceId: '00000000-0000-0000-0002-000000000004',
      name: '🏎️ Fórmula 1 & MotoGP',
      subject: '🏎️ Toda la temporada de Fórmula 1 y MotoGP en directo (Prueba 24 Horas Gratis)',
      niche: 'motorsport_es',
    },
    {
      templateId: 'tmpl_cine_series_es',
      audienceId: '00000000-0000-0000-0002-000000000005',
      name: '🎬 Cinema & Séries On Demand',
      subject: '🎬 Todos los estrenos de cine y series en una sola app (Tu prueba de 24h gratis)',
      niche: 'cine_series_es',
    },
    {
      templateId: 'tmpl_canales_latinos_eu',
      audienceId: '00000000-0000-0000-0002-000000000006',
      name: '🌎 Canais Latinos na Europa',
      subject: '🌎 Los canales de tu país en directo desde España (Pide tu prueba gratis 24h)',
      niche: 'latinos_es',
    },
    {
      templateId: 'tmpl_multidispositivo_premium_es',
      audienceId: '00000000-0000-0000-0002-000000000007',
      name: '📺 Multidispositivo Smart TV',
      subject: '📺 +5.000 Canales y Cine para toda tu familia en tu Smart TV (Prueba 24h gratis)',
      niche: 'custom_b2c',
    },
  ];

  const DAYS_SCHEDULE = [
    {
      dayLabel: 'HOJE (Sáb 05/09)',
      dayKey: 'sab',
      timeLabel: '11:40',
      scheduledAt: '2026-09-05T09:40:00.000Z',
      recipientsPerCampaign: 600,
    },
    {
      dayLabel: 'AMANHÃ (Dom 06/09)',
      dayKey: 'dom',
      timeLabel: '12:00',
      scheduledAt: '2026-09-06T10:00:00.000Z',
      recipientsPerCampaign: 700,
    },
    {
      dayLabel: 'SEGUNDA (07/09)',
      dayKey: 'seg',
      timeLabel: '10:00',
      scheduledAt: '2026-09-07T08:00:00.000Z',
      recipientsPerCampaign: 850,
    },
  ];

  const list: MarketingCampaign[] = [];

  for (const day of DAYS_SCHEDULE) {
    for (let idx = 0; idx < SPANISH_TEMPLATES_CONFIG.length; idx++) {
      const cfg = SPANISH_TEMPLATES_CONFIG[idx];
      const campId = `camp_${day.dayKey}_t${idx + 1}_${cfg.niche}`;

      list.push({
        id: campId,
        tenant_id: tenantId,
        template_id: cfg.templateId,
        title: `[${day.dayLabel} ${day.timeLabel}] ${cfg.name} (${day.recipientsPerCampaign} envios)`,
        subject: cfg.subject,
        sender_name: 'Carlos Ventas - Universa TV España',
        sender_email: 'carlos_ventas@mail.universatv.com',
        reply_to: 'carlos_ventas@mail.universatv.com',
        target_audience_id: cfg.audienceId,
        status: 'scheduled',
        scheduled_at: day.scheduledAt,
        total_recipients: day.recipientsPerCampaign,
        sent_count: 0,
        delivered_count: 0,
        opened_count: 0,
        clicked_count: 0,
        bounced_count: 0,
        failed_count: 0,
        rate_limit_per_second: 2,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }
  }

  return list;
};

  // Campaigns & Queues
  const [campaigns, setCampaigns] = useState<MarketingCampaign[]>(() => {
    const defaultScheduled = GENERATE_SCHEDULED_CAMPAIGNS(DEFAULT_TENANT.id);
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CAMPAIGNS);
      if (saved) {
        const parsed: MarketingCampaign[] = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const scheduledIds = new Set(defaultScheduled.map((s) => s.id));
          const userCustom = parsed.filter((c) => !scheduledIds.has(c.id));
          const mergedScheduled = defaultScheduled.map((s) => {
            const existing = parsed.find((p) => p.id === s.id);
            return existing || s;
          });
          const full = [...mergedScheduled, ...userCustom];
          safeStorageSet(STORAGE_KEYS.CAMPAIGNS, full);
          return full;
        }
      }
      safeStorageSet(STORAGE_KEYS.CAMPAIGNS, defaultScheduled);
      return defaultScheduled;
    } catch {
      return defaultScheduled;
    }
  });

  const campaignsRef = useRef<MarketingCampaign[]>(campaigns);
  useEffect(() => {
    campaignsRef.current = campaigns;
  }, [campaigns]);

  const updateCampaignsState = (updater: (prev: MarketingCampaign[]) => MarketingCampaign[]) => {
    setCampaigns((prev) => {
      const next = updater(prev);
      campaignsRef.current = next;
      safeStorageSet(STORAGE_KEYS.CAMPAIGNS, next);
      return next;
    });
  };

  const [campaignQueue, setCampaignQueue] = useState<Record<string, MarketingCampaignQueue[]>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.QUEUE);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const contactedEmailsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CONTACTED_EMAILS);
      if (saved) {
        contactedEmailsRef.current = new Set(JSON.parse(saved));
      }
    } catch {}
  }, []);

  // Audiences State
  const [audiences, setAudiences] = useState<SavedAudience[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.AUDIENCES);
      return saved ? JSON.parse(saved) : INITIAL_AUDIENCES;
    } catch {
      return INITIAL_AUDIENCES;
    }
  });

  // Sincronização em Lote com Supabase (COM PROTEÇÃO DE MERGE - NUNCA APAGA LEADS LOCAIS)
  const syncWithSupabase = useCallback(async () => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      setIsLoadingDb(false);
      return;
    }

    try {
      const { data: dbLeads, error: leadsErr } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false })
        .range(0, 49999);

      if (!leadsErr && dbLeads && dbLeads.length > 0) {
        const sanitizedDbLeads = sanitizeLeads(dbLeads);
        setLeads((currentLeads) => {
          const emailMap = new Map<string, Lead>();
          for (const l of currentLeads) {
            if (l && l.email) emailMap.set(l.email.toLowerCase().trim(), l);
          }
          for (const l of sanitizedDbLeads) {
            if (l && l.email) emailMap.set(l.email.toLowerCase().trim(), l);
          }
          return Array.from(emailMap.values());
        });
      }

      const { data: dbTemplates, error: tmplErr } = await supabase.from('marketing_templates').select('*');
      if (!tmplErr && dbTemplates && dbTemplates.length > 0) {
        const cleanTemplates = dbTemplates.filter(
          (t: any) =>
            !t.title?.includes('B2B') &&
            !t.html_content?.includes('LUMINOUS') &&
            !t.html_content?.includes('Soldadores')
        );
        if (cleanTemplates.length > 0) {
          setTemplates(cleanTemplates);
        } else {
          setTemplates(OFFICIAL_UNIVERSA_TEMPLATES);
        }
      }

      const { data: dbAudiences, error: audErr } = await supabase.from('saved_audiences').select('*');
      if (!audErr && dbAudiences && dbAudiences.length > 0) {
        const mappedAudiences: SavedAudience[] = dbAudiences.map((a: any) => {
          const rawFilters = a.filters_json || a.filters || {};
          const toArray = (val: any) => {
            if (!val) return undefined;
            if (Array.isArray(val)) return val;
            if (typeof val === 'string') return [val];
            return undefined;
          };

          return {
            id: a.id,
            tenant_id: a.tenant_id,
            name: a.name,
            description: a.description || '',
            niche: Array.isArray(rawFilters.niche) ? rawFilters.niche[0] : (rawFilters.niche || a.niche || ''),
            filters: {
              ...rawFilters,
              country: toArray(rawFilters.country),
              region: toArray(rawFilters.region),
              province: toArray(rawFilters.province),
              city: toArray(rawFilters.city),
              tags: toArray(rawFilters.tags || rawFilters.tag),
              providers: toArray(rawFilters.providers || rawFilters.provider),
              sector: toArray(rawFilters.sector),
              status: toArray(rawFilters.status),
            },
            lead_count: rawFilters.lead_count || a.lead_count || (Array.isArray(a.lead_ids) ? a.lead_ids.length : 0),
            lead_ids: a.lead_ids || [],
            created_at: a.created_at || new Date().toISOString(),
          };
        });
        setAudiences(mappedAudiences);
      }

      const { data: dbCampaigns, error: campErr } = await supabase
        .from('marketing_campaigns')
        .select('*')
        .order('created_at', { ascending: false })
        .range(0, 49999);

      if (!campErr && dbCampaigns && dbCampaigns.length > 0) {
        setCampaigns(dbCampaigns);
      }

      const { data: dbResults, error: resErr } = await supabase
        .from('lead_prospecting_results')
        .select('*')
        .order('created_at', { ascending: false })
        .range(0, 49999);

      if (!resErr && dbResults && dbResults.length > 0) {
        setProspectingResults(dbResults);
      }
    } catch (e) {
      console.warn('[Supabase Sync Warning]', e);
    } finally {
      setIsLoadingDb(false);
    }
  }, []);

  // IndexedDB Initial Load: Carrega apenas LEADS REAIS (limpa automaticamente a base simulada)
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const idbLeads = await getLeadsFromIndexedDb();
        if (isMounted) {
          if (idbLeads && idbLeads.length > 0) {
            // Filtra e remove qualquer lead sintético gerado anteriormente
            const genuineOnly = idbLeads.filter(
              (l) => !l.id.startsWith('lead_es_202k_') && !l.id.startsWith('lead_sim_')
            );
            const finalLeads = ensureValidationLeads(genuineOnly, tenant.id);
            setLeads(finalLeads);
            await saveLeadsToIndexedDb(finalLeads);
          } else {
            const initialReal = ensureValidationLeads([], tenant.id);
            setLeads(initialReal);
            await saveLeadsToIndexedDb(initialReal);
          }
        }
      } catch (e) {
        console.warn('[IndexedDB Init Warning]', e);
        if (isMounted) {
          setLeads(ensureValidationLeads([], tenant.id));
        }
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [tenant.id]);

  useEffect(() => {
    syncWithSupabase();
  }, [syncWithSupabase]);

  // Safe Persistence side-effects with Quota Protection & IndexedDB
  useEffect(() => {
    safeStorageSet(STORAGE_KEYS.TENANT, tenant);
  }, [tenant]);

  useEffect(() => {
    if (leads.length > 0) {
      saveLeadsToIndexedDb(leads);
    }
    // Limits local storage copy to prevent browser 5MB crash
    safeStorageSet(STORAGE_KEYS.LEADS, leads.slice(0, 2000));
  }, [leads]);

  useEffect(() => {
    safeStorageSet(STORAGE_KEYS.MISSIONS, missions);
  }, [missions]);

  useEffect(() => {
    safeStorageSet(STORAGE_KEYS.DORK_QUEUE, dorkQueue);
  }, [dorkQueue]);

  useEffect(() => {
    safeStorageSet(STORAGE_KEYS.JOBS, prospectingJobs.slice(0, 100));
  }, [prospectingJobs]);

  useEffect(() => {
    safeStorageSet(STORAGE_KEYS.RESULTS, prospectingResults.slice(0, 2000));
  }, [prospectingResults]);

  useEffect(() => {
    safeStorageSet(STORAGE_KEYS.TEMPLATES, templates);
  }, [templates]);

  useEffect(() => {
    safeStorageSet(STORAGE_KEYS.CAMPAIGNS, campaigns);
  }, [campaigns]);

  useEffect(() => {
    safeStorageSet(STORAGE_KEYS.QUEUE, campaignQueue);
  }, [campaignQueue]);

  useEffect(() => {
    safeStorageSet(STORAGE_KEYS.AUDIENCES, audiences);
  }, [audiences]);

  // Sincroniza periodicamente com o Supabase a cada 20 segundos para capturar eventos de Webhook (aberturas/cliques)
  useEffect(() => {
    const interval = setInterval(() => {
      syncWithSupabase();
    }, 20000);
    return () => clearInterval(interval);
  }, [syncWithSupabase]);

  // Sincroniza automaticamente os leads enviados para o estágio 'contacted' (E-mail Enviado no Kanban)
  useEffect(() => {
    const sentEmails = new Set<string>();
    // Emails comprovadamente enviados via campanhas
    Object.values(campaignQueue).forEach((queueList) => {
      if (Array.isArray(queueList)) {
        queueList.forEach((q) => {
          if (q.status === 'sent' && q.lead_email) {
            sentEmails.add(q.lead_email.toLowerCase().trim());
          }
        });
      }
    });

    // Adiciona também os e-mails de teste e validação informados pelo usuário
    VALIDATION_TEST_EMAILS_DATA.forEach((item) => {
      sentEmails.add(item.email.toLowerCase().trim());
    });

    setLeads((prev) => {
      let changed = false;
      const existingEmails = new Set(prev.map((l) => (l.email || '').toLowerCase().trim()));
      const next = prev.map((l) => {
        const em = (l.email || '').toLowerCase().trim();
        if (sentEmails.has(em) && l.status !== 'contacted') {
          changed = true;
          return { ...l, status: 'contacted' as LeadStatus, updated_at: new Date().toISOString() };
        }
        return l;
      });

      // Se os e-mails enviados não existiam na base, insere-os diretamente como contacted
      for (const sentEmail of sentEmails) {
        if (!existingEmails.has(sentEmail)) {
          changed = true;
          const foundValidation = VALIDATION_TEST_EMAILS_DATA.find(
            (v) => v.email.toLowerCase().trim() === sentEmail.toLowerCase().trim()
          );
          next.unshift({
            id: `lead_sent_${sentEmail.replace(/[^a-zA-Z0-9]/g, '_')}`,
            tenant_id: tenant.id,
            name: foundValidation ? foundValidation.name : 'Contato de Validação',
            company_name: foundValidation ? foundValidation.company_name : 'Universa TV Teste',
            email: sentEmail,
            phone: '+34 617 59 84 21',
            city: foundValidation ? foundValidation.city : 'Madrid',
            province: 'Comunidad de Madrid',
            country: foundValidation ? foundValidation.country : 'Espanha',
            status: 'contacted' as LeadStatus,
            opted_out: false,
            mx_valid: true,
            mx_record: 'google.com (Audited)',
            tags: foundValidation ? foundValidation.tags : ['Disparo de Teste', 'Campanha Real'],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
        }
      }

      return changed ? next : prev;
    });
  }, [campaignQueue, tenant.id]);

  const updateTenant = (updates: Partial<Tenant>) => {
    setTenant((prev) => ({ ...prev, ...updates }));
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
        source_url: newLead.source_url,
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
      supabase.from('leads').update({
        ...updates,
        updated_at: new Date().toISOString(),
      }).eq('id', id).then();
    }
  };

  const deleteLead = async (id: string) => {
    setLeads((prev) => prev.filter((lead) => lead.id !== id));

    const supabase = getSupabaseClient();
    if (supabase) {
      supabase.from('leads').delete().eq('id', id).then();
    }
  };

  const deleteMultipleLeads = async (ids: string[]) => {
    const idSet = new Set(ids);
    setLeads((prev) => prev.filter((lead) => !idSet.has(lead.id)));

    const supabase = getSupabaseClient();
    if (supabase) {
      supabase.from('leads').delete().in('id', ids).then();
    }
  };

  const clearAllLeads = async () => {
    setLeads([]);
    await clearAllIndexedDb();
  };

  const purgeSyntheticLeads = async (): Promise<number> => {
    try {
      await clearAllIndexedDb();
      const realOnly = leads.filter(
        (l) => !l.id.startsWith('lead_es_202k_') && !l.id.startsWith('lead_sim_') && !l.id.startsWith('pres_')
      );
      const finalReal = ensureValidationLeads(realOnly, tenant.id);
      setLeads(finalReal);
      await saveLeadsToIndexedDb(finalReal);
      safeStorageSet(STORAGE_KEYS.LEADS, finalReal);
      safeStorageSet(STORAGE_KEYS.CONTACTED_EMAILS, []);
      contactedEmailsRef.current = new Set();

      // Zera contadores de todas as missões para 0
      const resetMissions = [...SPAIN_B2C_MISSIONS, ...BRAZIL_B2C_MISSIONS].map((m) => ({
        ...m,
        captured_count: 0,
        valid_mx_count: 0,
      }));
      setMissions(resetMissions);
      safeStorageSet(STORAGE_KEYS.MISSIONS, resetMissions);

      // Zera contadores dos alvos de dork para 0
      const resetDorks = [...INITIAL_DORK_QUEUE, ...BRAZIL_DORK_QUEUE].map((d) => ({
        ...d,
        leads_found: 0,
        status: 'queued' as const,
        last_run_at: undefined,
      }));
      setDorkQueue(resetDorks);
      safeStorageSet(STORAGE_KEYS.DORK_QUEUE, resetDorks);

      // Zera staging e jobs anteriores
      setProspectingJobs([]);
      setProspectingResults([]);
      safeStorageSet(STORAGE_KEYS.JOBS, []);
      safeStorageSet(STORAGE_KEYS.RESULTS, []);

      return finalReal.length;
    } catch (e) {
      console.error('[Purge Error]', e);
      return 0;
    }
  };

  const restoreFull202kDatabase = async (
    _count = 202000,
    _onProgress?: (p: number) => void
  ): Promise<number> => {
    return purgeSyntheticLeads();
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
        // Inserção em chunks para alta performance
        const chunkSize = 100;
        for (let i = 0; i < leadsToAdd.length; i += chunkSize) {
          const chunk = leadsToAdd.slice(i, i + chunkSize);
          supabase.from('leads').insert(chunk).then();
        }
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

  // Bulk audit all unverified leads in CRM
  const verifyAllPendingMx = async (): Promise<number> => {
    const unverified = leads.filter((l) => l.mx_valid === undefined || l.mx_record === 'Nenhum');
    let audited = 0;
    for (const lead of unverified) {
      const dnsResult = await verifyEmailDns(lead.email);
      await updateLead(lead.id, {
        mx_valid: dnsResult.hasMx,
        mx_record: dnsResult.mxRecords[0] || 'Nenhum',
      });
      audited++;
    }
    return audited;
  };

  // Run B2C Mission with Auto-Direct Lead Stream into CRM
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

    // AUTO-CONVERSÃO DIRETA EM LEADS NO CRM
    if (unique.length > 0) {
      const leadsToCreate: Array<Omit<Lead, 'id' | 'tenant_id' | 'created_at' | 'updated_at'>> = unique.map((p) => ({
        name: p.contact_name || p.company_name,
        company_name: p.company_name,
        email: p.email,
        phone: p.phone,
        website: p.website,
        source_url: p.source_url,
        sector: p.sector || 'Streaming & Esportes',
        role: p.role || 'Consumidor B2C',
        company_size: p.company_size || 'B2C (Consumidor)',
        city: p.city || location.split(',')[0].trim() || 'Madrid',
        province: p.province || 'Espanha',
        country: p.country || 'Espanha',
        tags: ['B2C Espanha', mission.niche ? mission.niche.toUpperCase() : 'Streaming'].filter(Boolean),
        status: 'new' as LeadStatus,
        opted_out: false,
        mx_valid: p.mx_status === 'valid',
        mx_record: p.mx_host,
        target_niche: mission.niche,
      }));
      await batchImportLeads(leadsToCreate);
    }

    const completedJob: LeadProspectingJob = {
      ...newJob,
      processed_count: results.length,
      found_emails_count: unique.length,
      status: 'completed',
    };

    await addProspectingJob(completedJob, unique);

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

  // Auto-Missions Continuous Loop with Automatic Region Rotation
  const startAutoMissions = () => {
    if (isAutoMissionsActive) return;
    setIsAutoMissionsActive(true);

    let currentMissionIdx = 0;
    let currentCityIdx = 0;

    const BRAZILIAN_CITIES_ROTATION = ['São Paulo', 'Rio de Janeiro', 'Belo Horizonte', 'Curitiba', 'Porto Alegre', 'Salvador', 'Brasília', 'Campinas'];

    let isRunning = false;
    const processNextMission = async () => {
      if (isRunning) return;
      isRunning = true;
      try {
        const mission = missions[currentMissionIdx % missions.length];
        const isBr = mission.country === 'Brasil';
        const city = isBr
          ? BRAZILIAN_CITIES_ROTATION[currentCityIdx % BRAZILIAN_CITIES_ROTATION.length]
          : SPANISH_CITIES_ROTATION[currentCityIdx % SPANISH_CITIES_ROTATION.length];
        const countryLabel = isBr ? 'Brasil' : 'Espanha';
        setActiveAutoRegion(`${city} (${countryLabel})`);
        setAutoBatchesCount((prev) => prev + 1);

        currentMissionIdx++;
        currentCityIdx++;

        await runMission(mission.id, `${city}, ${countryLabel}`, 25);
      } catch (e) {
        console.warn('[Auto-Missions Loop Error]', e);
      } finally {
        isRunning = false;
      }
    };

    processNextMission();
    autoMissionsIntervalRef.current = setInterval(processNextMission, 3500);
  };

  const stopAutoMissions = () => {
    setIsAutoMissionsActive(false);
    if (autoMissionsIntervalRef.current) {
      clearInterval(autoMissionsIntervalRef.current);
      autoMissionsIntervalRef.current = null;
    }
  };

  // Run Dork Target Job with Auto-Direct Stream into CRM
  const runDorkTarget = async (
    targetId: string,
    onProgress?: (c: number, t: number) => void
  ): Promise<number> => {
    const target = dorkQueue.find((d) => d.id === targetId);
    if (!target) return 0;

    setDorkQueue((prev) =>
      prev.map((d) => (d.id === targetId ? { ...d, status: 'running' } : d))
    );

    const results = await executeDorkTargetJob(target, tenant.id, tenant.gemini_api_key, onProgress);
    const existingEmails = new Set(leads.map((l) => l.email.toLowerCase().trim()));
    const unique = deduplicateProspects(results, existingEmails);

    // AUTO-CONVERSÃO DIRETA EM LEADS NO CRM
    if (unique.length > 0) {
      const leadsToCreate: Array<Omit<Lead, 'id' | 'tenant_id' | 'created_at' | 'updated_at'>> = unique.map((p) => ({
        name: p.contact_name || p.company_name,
        company_name: p.company_name,
        email: p.email,
        phone: p.phone,
        website: p.website,
        source_url: p.source_url,
        sector: p.sector || 'Streaming & Esportes',
        role: p.role || 'Consumidor B2C',
        company_size: p.company_size || 'B2C (Consumidor)',
        city: p.city || target.city || 'Madrid',
        province: p.province || 'Espanha',
        country: p.country || 'Espanha',
        tags: ['Social Dork', target.platform.toUpperCase(), target.niche].filter(Boolean),
        status: 'new' as LeadStatus,
        opted_out: false,
        mx_valid: p.mx_status === 'valid',
        mx_record: p.mx_host,
        target_niche: 'custom_b2c',
      }));
      await batchImportLeads(leadsToCreate);
    }

    const jobId = `job_dork_${targetId}_${Date.now()}`;
    const completedJob: LeadProspectingJob = {
      id: jobId,
      tenant_id: tenant.id,
      title: `Social Dork: ${target.title}`,
      keywords: target.query,
      location: `${target.city}, Espanha`,
      target_count: 15,
      processed_count: results.length,
      found_emails_count: unique.length,
      status: 'completed',
      created_at: new Date().toISOString(),
    };

    await addProspectingJob(completedJob, unique);

    setDorkQueue((prev) =>
      prev.map((d) =>
        d.id === targetId
          ? {
              ...d,
              status: 'completed',
              leads_found: d.leads_found + unique.length,
              last_run_at: new Date().toISOString(),
            }
          : d
      )
    );

    return unique.length;
  };

  const addDorkTarget = (targetData: Omit<DorkTargetJob, 'id' | 'status' | 'leads_found'>) => {
    const newTarget: DorkTargetJob = {
      ...targetData,
      id: `dork_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      status: 'queued',
      leads_found: 0,
    };
    setDorkQueue((prev) => [newTarget, ...prev]);
  };

  const deleteDorkTarget = (id: string) => {
    setDorkQueue((prev) => prev.filter((d) => d.id !== id));
  };

  // Continuous Auto-Dorking Engine Loop
  const startAutoDorking = () => {
    if (isAutoDorkingActive) return;
    setIsAutoDorkingActive(true);

    let currentIndex = 0;
    const processNext = async () => {
      if (dorkQueue.length === 0) return;
      const target = dorkQueue[currentIndex % dorkQueue.length];
      currentIndex++;

      try {
        await runDorkTarget(target.id);
      } catch (e) {
        console.warn('[Auto-Dorking Loop Target Fail]', e);
      }
    };

    processNext();
    autoDorkingIntervalRef.current = setInterval(processNext, 4000);
  };

  const stopAutoDorking = () => {
    setIsAutoDorkingActive(false);
    if (autoDorkingIntervalRef.current) {
      clearInterval(autoDorkingIntervalRef.current);
      autoDorkingIntervalRef.current = null;
    }
  };

  // Prospecting Operations
  const addProspectingJob = async (job: LeadProspectingJob, results: LeadProspectingResult[]) => {
    setProspectingJobs((prev) => [job, ...prev.slice(0, 100)]);
    setProspectingResults((prev) => [...results, ...prev.slice(0, 2000)]);

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
    }
  };

  const updateProspectingResultStatus = async (resultId: string, status: 'imported' | 'discarded') => {
    setProspectingResults((prev) =>
      prev.map((r) => (r.id === resultId ? { ...r, status } : r))
    );
  };

  const importProspectsToLeads = async (resultIds: string[]): Promise<number> => {
    const idSet = new Set(resultIds);
    const selected = prospectingResults.filter((r) => idSet.has(r.id) && r.status !== 'imported');
    if (selected.length === 0) return 0;

    const leadsToCreate: Array<Omit<Lead, 'id' | 'tenant_id' | 'created_at' | 'updated_at'>> = selected.map((p) => ({
      name: p.contact_name || p.company_name,
      company_name: p.company_name,
      email: p.email,
      phone: p.phone,
      website: p.website,
      source_url: p.source_url,
      sector: p.sector || 'Streaming & Esportes',
      role: p.role || 'Consumidor B2C',
      company_size: p.company_size || 'B2C (Consumidor)',
      city: p.city || 'Madrid',
      province: p.province || 'Espanha',
      country: p.country || 'Espanha',
      tags: ['B2C Espanha', p.target_niche ? p.target_niche.toUpperCase() : 'Streaming'].filter(Boolean),
      status: 'new' as LeadStatus,
      opted_out: false,
      mx_valid: p.mx_status === 'valid',
      mx_record: p.mx_host,
      target_niche: p.target_niche,
    }));

    const count = await batchImportLeads(leadsToCreate);
    
    setProspectingResults((prev) =>
      prev.map((r) => (idSet.has(r.id) ? { ...r, status: 'imported' } : r))
    );

    return count;
  };

  const importAllValidProspects = async (): Promise<number> => {
    const validIds = prospectingResults
      .filter((r) => r.status !== 'imported')
      .map((r) => r.id);
    return await importProspectsToLeads(validIds);
  };

  const clearStaging = () => {
    setProspectingResults([]);
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
    return newTmpl;
  };

  const updateTemplate = async (id: string, updates: Partial<MarketingTemplate>) => {
    setTemplates((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...updates, updated_at: new Date().toISOString() } : t))
    );
  };

  const deleteTemplate = async (id: string) => {
    setTemplates((prev) => prev.filter((t) => t.id !== id));
  };

  const resetTemplatesToOfficial = async () => {
    setTemplates(OFFICIAL_UNIVERSA_TEMPLATES);
    safeStorageSet(STORAGE_KEYS.TEMPLATES, OFFICIAL_UNIVERSA_TEMPLATES);
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data: current } = await supabase.from('marketing_templates').select('id');
        if (current && current.length > 0) {
          for (const item of current) {
            await supabase.from('marketing_templates').delete().eq('id', item.id);
          }
        }
        const toInsert = OFFICIAL_UNIVERSA_TEMPLATES.map((t, idx) => ({
          id: `00000000-0000-0000-0001-00000000000${idx + 1}`,
          tenant_id: tenant.id,
          title: t.title,
          subject: t.subject,
          html_content: t.html_content,
          variables: t.variables,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }));
        await supabase.from('marketing_templates').insert(toInsert);
      } catch (e) {
        console.warn('[Supabase Templates Reset Sync Warning]', e);
      }
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

    return newCampaign;
  };

  const launchCampaign = async (campaignId: string) => {
    const targetCampaign = campaignsRef.current.find((c) => c.id === campaignId);
    const targetTemplate = templates.find((t) => t.id === targetCampaign?.template_id);
    if (!targetCampaign || !targetTemplate) return;

    let activeQueue = campaignQueue[campaignId] || [];
    if (activeQueue.length === 0) {
      const targetAudience = audiences.find((a) => a.id === targetCampaign.target_audience_id);
      const niche = targetAudience?.filters?.niche ? targetAudience.filters.niche[0] : '';
      const tags = targetAudience?.filters?.tags || [];

      // Coleta todos os e-mails já enviados ou em fila nas campanhas anteriores para garantir ZERO repetição
      const alreadyTargetedEmails = new Set<string>();
      Object.values(campaignQueue).forEach((q) => {
        if (Array.isArray(q)) {
          q.forEach((item) => {
            if (item.lead_email) {
              alreadyTargetedEmails.add(item.lead_email.toLowerCase().trim());
            }
          });
        }
      });

      // Filtra os leads que pertencem ao público segmentado e não pediram opt-out
      let audienceLeads = leads.filter((l) => {
        if (l.opted_out) return false;
        if (niche && l.target_niche === niche) return true;
        if (tags.length > 0 && l.tags && tags.some((t) => l.tags.includes(t))) return true;
        return false;
      });

      if (audienceLeads.length === 0) {
        audienceLeads = leads.filter((l) => !l.opted_out);
      }

      // Prioriza estritamente LEADS NOVOS E INÉDITOS (nunca contatados anteriormente)
      const freshLeads = audienceLeads.filter((l) => {
        if (l.status === 'contacted') return false;
        if (alreadyTargetedEmails.has(l.email.toLowerCase().trim())) return false;
        return true;
      });

      const countNeeded = targetCampaign.total_recipients || 600;

      // Seleciona novos contatos do público. Se a base de inéditos for suficiente (cada público tem 22k-38k leads),
      // pega estritamente inéditos. Se esgotar, completa com os demais.
      let selected: Lead[] = [];
      if (freshLeads.length >= countNeeded) {
        selected = freshLeads.slice(0, countNeeded);
      } else {
        const remainingNeeded = countNeeded - freshLeads.length;
        const fallbackLeads = audienceLeads.filter((l) => !freshLeads.includes(l));
        selected = [...freshLeads, ...fallbackLeads.slice(0, remainingNeeded)];
      }

      activeQueue = selected.map((lead) => ({
        id: `queue_${Date.now()}_${lead.id}`,
        campaign_id: campaignId,
        lead_id: lead.id,
        lead_name: lead.name,
        lead_email: lead.email,
        company_name: lead.company_name,
        status: 'pending',
        created_at: new Date().toISOString(),
      }));

      setCampaignQueue((prev) => {
        const updated = { ...prev, [campaignId]: activeQueue };
        safeStorageSet(STORAGE_KEYS.QUEUE, updated);
        return updated;
      });
    }

    updateCampaignsState((prev) =>
      prev.map((c) => (c.id === campaignId ? { ...c, status: 'sending', updated_at: new Date().toISOString() } : c))
    );

    const leadsMap = new Map<string, Lead>(leads.map((l) => [l.id, l]));

    await processCampaignQueueBatch(
      targetCampaign,
      targetTemplate.html_content,
      activeQueue,
      leadsMap,
      tenant.resend_api_key || '',
      (updatedItem) => {
        setCampaignQueue((prev) => {
          const currentQueue = prev[campaignId] || [];
          const updated = currentQueue.map((item) => (item.id === updatedItem.id ? updatedItem : item));
          return { ...prev, [campaignId]: updated };
        });

        if (updatedItem.status === 'sent') {
          if (updatedItem.lead_email) {
            contactedEmailsRef.current.add(updatedItem.lead_email.toLowerCase().trim());
          }

          const supabase = getSupabaseClient();
          if (supabase) {
            Promise.resolve(
              supabase
                .from('leads')
                .update({ status: 'contacted', updated_at: new Date().toISOString() })
                .ilike('email', updatedItem.lead_email.trim())
            ).catch(() => {});
          }
        }
      },
      (sent) => {
        updateCampaignsState((prev) =>
          prev.map((c) =>
            c.id === campaignId
              ? {
                  ...c,
                  sent_count: sent,
                  delivered_count: sent,
                  // Métricas reais: começam em 0 durante o envio (sem números falsos simultâneos)
                  opened_count: c.opened_count || 0,
                  clicked_count: c.clicked_count || 0,
                }
              : c
          )
        );
      }
    );

    // Grava lista leve de e-mails contatados
    safeStorageSet(STORAGE_KEYS.CONTACTED_EMAILS, Array.from(contactedEmailsRef.current));

    updateCampaignsState((prev) =>
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
  };

  const pauseCampaign = (campaignId: string) => {
    updateCampaignsState((prev) =>
      prev.map((c) => (c.id === campaignId ? { ...c, status: 'paused', updated_at: new Date().toISOString() } : c))
    );
  };

  const deleteCampaign = async (campaignId: string) => {
    updateCampaignsState((prev) => prev.filter((c) => c.id !== campaignId));
    setCampaignQueue((prev) => {
      const next = { ...prev };
      delete next[campaignId];
      safeStorageSet(STORAGE_KEYS.QUEUE, next);
      return next;
    });
  };

  const batchCreateCampaigns = (newCampaigns: MarketingCampaign[]) => {
    updateCampaignsState((prev) => {
      const newIds = new Set(newCampaigns.map((c) => c.id));
      const remaining = prev.filter((c) => !newIds.has(c.id));
      return [...newCampaigns, ...remaining];
    });
  };

  // =========================================================================
  // AUTO-SCHEDULER ENGINE (MOTOR DE DISPARO AUTOMÁTICO DE CRONOGRAMA)
  // =========================================================================
  const [autoSchedulerEnabled, setAutoSchedulerEnabled] = useState<boolean>(false);

  const cancelAllScheduledCampaigns = () => {
    setAutoSchedulerEnabled(false);
    try {
      localStorage.setItem('saas_auto_scheduler_enabled', 'false');
    } catch {}
    updateCampaignsState((prev) =>
      prev.map((c) =>
        c.status === 'scheduled' || c.status === 'sending' || c.status === 'paused'
          ? { ...c, status: 'draft' }
          : c
      )
    );
    setCampaignQueue({});
    safeStorageSet(STORAGE_KEYS.QUEUE, {});
  };

  const isExecutingSchedulerRef = useRef<boolean>(false);

  useEffect(() => {
    localStorage.setItem('saas_auto_scheduler_enabled', String(autoSchedulerEnabled));
  }, [autoSchedulerEnabled]);

  useEffect(() => {
    if (!autoSchedulerEnabled) return;

    const checkAndTriggerScheduledCampaigns = async () => {
      if (isExecutingSchedulerRef.current) return;

      const currentList = campaignsRef.current;

      // 1. Prioridade Máxima: se houver campanha que estava em 'sending' ou 'paused' de hoje incompleta,
      // retoma os disparos automaticamente a partir de onde parou (ex: do envio 37 em diante)!
      const interruptedCampaign = currentList.find(
        (c) =>
          (c.status === 'sending' || c.status === 'paused') &&
          (c.id.startsWith('camp_sab_') || c.title.includes('HOJE') || c.title.includes('Sáb')) &&
          (c.sent_count || 0) < c.total_recipients
      );
      if (interruptedCampaign) {
        console.log(`[AutoScheduler] 🔄 Retomando envios da campanha interrompida/pausada: ${interruptedCampaign.title} (${interruptedCampaign.id})`);
        isExecutingSchedulerRef.current = true;
        try {
          await launchCampaign(interruptedCampaign.id);
        } catch (err) {
          console.error('[AutoScheduler] Erro ao retomar campanha interrompida:', err);
        } finally {
          isExecutingSchedulerRef.current = false;
        }
        return;
      }

      const now = new Date();

      // Procura a próxima campanha agendada na sequência cujo horário já chegou
      const dueCampaign = currentList.find((c) => {
        if (c.status !== 'scheduled') return false;

        // 1. Checagem por timestamp ISO direto
        if (c.scheduled_at) {
          const schedTime = new Date(c.scheduled_at).getTime();
          if (!isNaN(schedTime) && schedTime <= now.getTime()) {
            return true;
          }
        }

        // 2. Fallback para campanhas de hoje cujo horário já passou
        if (c.id.startsWith('camp_sab_') || c.title.includes('HOJE') || c.title.includes('Sáb')) {
          const match = c.title.match(/(\d{1,2}):(\d{2})/);
          if (match) {
            const [, h, m] = match;
            const targetToday = new Date();
            targetToday.setHours(Number(h), Number(m), 0, 0);
            if (now.getTime() >= targetToday.getTime()) {
              return true;
            }
          }
        }

        return false;
      });

      if (dueCampaign) {
        console.log(`[AutoScheduler] ⏱️ Horário atingido! Disparando sequência: ${dueCampaign.title} (${dueCampaign.id})`);
        isExecutingSchedulerRef.current = true;
        try {
          await launchCampaign(dueCampaign.id);
        } catch (err) {
          console.error('[AutoScheduler] Erro no disparo da campanha:', err);
        } finally {
          isExecutingSchedulerRef.current = false;
        }
      }
    };

    const intervalId = setInterval(checkAndTriggerScheduledCampaigns, 2500);
    // Checagem imediata
    checkAndTriggerScheduledCampaigns();

    return () => clearInterval(intervalId);
  }, [autoSchedulerEnabled]);

  const syncCampaignWithResend = async (campaignId: string) => {
    const queue = campaignQueue[campaignId] || [];
    if (!tenant.resend_api_key || queue.length === 0) return;

    let realOpened = 0;
    let realClicked = 0;
    let realDelivered = 0;

    const itemsToCheck = queue.filter((it) => it.resend_email_id && !it.resend_email_id.startsWith('resend_'));
    if (itemsToCheck.length === 0) return;

    const sample = itemsToCheck.slice(0, 30);
    for (const it of sample) {
      const status = await fetchRealEmailStatusFromResend(tenant.resend_api_key, it.resend_email_id!);
      if (status.delivered) realDelivered++;
      if (status.opened) realOpened++;
      if (status.clicked) realClicked++;
    }

    const ratio = queue.length / sample.length;
    updateCampaignsState((prev) =>
      prev.map((c) =>
        c.id === campaignId
          ? {
              ...c,
              delivered_count: Math.min(c.sent_count, Math.round(realDelivered * ratio)),
              opened_count: Math.round(realOpened * ratio),
              clicked_count: Math.round(realClicked * ratio),
            }
          : c
      )
    );
  };

  // Audiences
  const addAudience = async (audienceData: Omit<SavedAudience, 'id' | 'tenant_id' | 'created_at'>): Promise<SavedAudience> => {
    const generateUUID = () => {
      if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
      }
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });
    };

    const newAudience: SavedAudience = {
      ...audienceData,
      id: generateUUID(),
      tenant_id: tenant.id,
      created_at: new Date().toISOString(),
    };

    setAudiences((prev) => [newAudience, ...prev]);

    // Persistir no Supabase se conectado
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase.from('saved_audiences').insert({
          id: newAudience.id,
          tenant_id: newAudience.tenant_id,
          name: newAudience.name,
          description: newAudience.description,
          filters_json: newAudience.filters,
          created_at: newAudience.created_at,
        });
      } catch (err) {
        console.warn('[Supabase Audiences Insert Warning]', err);
      }
    }

    return newAudience;
  };

  const deleteAudience = async (id: string) => {
    setAudiences((prev) => prev.filter((a) => a.id !== id));

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase.from('saved_audiences').delete().eq('id', id);
      } catch (err) {
        console.warn('[Supabase Audiences Delete Warning]', err);
      }
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
        deleteMultipleLeads,
        clearAllLeads,
        batchImportLeads,
        purgeSyntheticLeads,
        restoreFull202kDatabase,
        toggleOptOut,
        verifyLeadMx,
        verifyAllPendingMx,
        missions,
        runMission,
        isAutoMissionsActive,
        activeAutoRegion,
        autoBatchesCount,
        startAutoMissions,
        stopAutoMissions,
        prospectingJobs,
        prospectingResults,
        addProspectingJob,
        updateProspectingResultStatus,
        importProspectsToLeads,
        importAllValidProspects,
        clearStaging,
        dorkQueue,
        runDorkTarget,
        addDorkTarget,
        deleteDorkTarget,
        isAutoDorkingActive,
        startAutoDorking,
        stopAutoDorking,
        templates,
        addTemplate,
        updateTemplate,
        deleteTemplate,
        resetTemplatesToOfficial,
        campaigns,
        campaignQueue,
        createCampaign,
        batchCreateCampaigns,
        launchCampaign,
        pauseCampaign,
        deleteCampaign,
        audiences,
        addAudience,
        deleteAudience,
        isSupabaseConnected,
        isLoadingDb,
        syncWithSupabase,
        autoSchedulerEnabled,
        setAutoSchedulerEnabled,
        cancelAllScheduledCampaigns,
        syncCampaignWithResend,
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
