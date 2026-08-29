import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import type {
  Tenant,
  Lead,
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
import { processCampaignQueueBatch } from '../services/resendService';
import { getSupabaseClient } from '../services/supabaseClient';
import {
  SPAIN_B2C_MISSIONS,
  INITIAL_DORK_QUEUE,
  searchB2BLeadsWithAI,
  executeDorkTargetJob,
  deduplicateProspects,
} from '../services/geminiService';

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
  
  // B2C Missions & Continuous Auto-Pilot
  missions: LeadProspectingMission[];
  runMission: (missionId: string, location: string, count: number, onProgress?: (c: number, t: number) => void) => Promise<number>;
  isAutoMissionsActive: boolean;
  activeAutoRegion: string;
  autoBatchesCount: number;
  startAutoMissions: () => void;
  stopAutoMissions: () => void;
  
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
  DORK_QUEUE: 'universa_dork_queue_data',
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

  <p style="font-size: 13px; color: #64748b; margin-top: 24px;">¿Tienes alguma pergunta? Respóndenos a este e-mail o escríbenos directo por WhatsApp.<br><strong>Equipo Universa TV España</strong></p>
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
];

const INITIAL_LEADS: Lead[] = [
  {
    id: 'lead_b2c_01',
    tenant_id: '00000000-0000-0000-0000-000000000001',
    name: 'Alejandro Martínez',
    company_name: 'Aficionado Real Madrid (Madrid)',
    email: 'alejandro.martinez84@gmail.com',
    phone: '+34 612 34 56 78',
    source_url: 'https://instagram.com/alejandro_madridista',
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
    lead_count: 1,
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

  // Continuous Auto-Missions Loop
  const [isAutoMissionsActive, setIsAutoMissionsActive] = useState(false);
  const [activeAutoRegion, setActiveAutoRegion] = useState('Madrid');
  const [autoBatchesCount, setAutoBatchesCount] = useState(0);
  const autoMissionsIntervalRef = useRef<any>(null);

  // Dork Queue State
  const [dorkQueue, setDorkQueue] = useState<DorkTargetJob[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.DORK_QUEUE);
    return saved ? JSON.parse(saved) : INITIAL_DORK_QUEUE;
  });

  // Auto-Dorking Active State
  const [isAutoDorkingActive, setIsAutoDorkingActive] = useState(false);
  const autoDorkingIntervalRef = useRef<any>(null);

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

  // Sincronização com Supabase
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
    localStorage.setItem(STORAGE_KEYS.DORK_QUEUE, JSON.stringify(dorkQueue));
  }, [dorkQueue]);

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
    return newLead;
  };

  const updateLead = async (id: string, updates: Partial<Lead>) => {
    setLeads((prev) =>
      prev.map((lead) => (lead.id === id ? { ...lead, ...updates, updated_at: new Date().toISOString() } : lead))
    );
  };

  const deleteLead = async (id: string) => {
    setLeads((prev) => prev.filter((lead) => lead.id !== id));
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

    const processNextMission = async () => {
      const mission = missions[currentMissionIdx % missions.length];
      const city = SPANISH_CITIES_ROTATION[currentCityIdx % SPANISH_CITIES_ROTATION.length];
      setActiveAutoRegion(city);
      setAutoBatchesCount((prev) => prev + 1);

      currentMissionIdx++;
      currentCityIdx++;

      try {
        await runMission(mission.id, `${city}, Espanha`, 20);
      } catch (e) {
        console.warn('[Auto-Missions Loop Error]', e);
      }
    };

    processNextMission();
    autoMissionsIntervalRef.current = setInterval(processNextMission, 8000);
  };

  const stopAutoMissions = () => {
    setIsAutoMissionsActive(false);
    if (autoMissionsIntervalRef.current) {
      clearInterval(autoMissionsIntervalRef.current);
      autoMissionsIntervalRef.current = null;
    }
  };

  // Run Dork Target Job
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
    autoDorkingIntervalRef.current = setInterval(processNext, 10000);
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
    }
  };

  const updateProspectingResultStatus = async (resultId: string, status: 'imported' | 'discarded') => {
    setProspectingResults((prev) =>
      prev.map((r) => (r.id === resultId ? { ...r, status } : r))
    );
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
      source_url: p.source_url,
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
    return newAudience;
  };

  const deleteAudience = async (id: string) => {
    setAudiences((prev) => prev.filter((a) => a.id !== id));
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
