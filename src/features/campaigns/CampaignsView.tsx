import React, { useState, useMemo } from 'react';
import {
  Send,
  Plus,
  Play,
  Pause,
  CheckCircle,
  Trash2,
  Eye,
  FileCode,
  Edit3,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Search,
  X,
  Check,
  Users,
  MapPin,
  Sparkles,
  Mail,
  SlidersHorizontal,
  RotateCcw,
  Monitor,
  Smartphone,
} from 'lucide-react';
import { useApp, VERIFIED_SENDERS, VALIDATION_TEST_EMAILS_DATA } from '../../shared/context/AppContext';
import { sendEmailViaResend, interpolateEmailVariables } from '../../shared/services/resendService';
import type { MarketingTemplate, SavedAudience, Lead, LeadStatus } from '../../types';
import confetti from 'canvas-confetti';

interface CampaignsViewProps {
  onNavigateToLeads?: () => void;
}

interface MultiSelectOption {
  label: string;
  value: string;
  flag?: string;
  count?: number;
}

interface MultiSelectComboboxProps {
  label: string;
  options: MultiSelectOption[];
  selectedValues: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  isLight?: boolean;
}

const formatFilterDisplay = (val: any): string | null => {
  if (!val) return null;
  if (Array.isArray(val)) {
    const clean = val.filter(Boolean).map((v) => String(v).trim()).filter((v) => v.length > 0);
    return clean.length > 0 ? clean.join(', ') : null;
  }
  if (typeof val === 'string' && val.trim().length > 0) {
    return val.trim();
  }
  return null;
};

const MultiSelectCombobox: React.FC<MultiSelectComboboxProps> = ({
  label,
  options,
  selectedValues = [],
  onChange,
  placeholder = 'Selecione opções...',
  isLight = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filteredOptions = options.filter(
    (opt) =>
      opt.label.toLowerCase().includes(search.toLowerCase()) ||
      opt.value.toLowerCase().includes(search.toLowerCase())
  );

  const toggleOption = (val: string) => {
    if (selectedValues.includes(val)) {
      onChange(selectedValues.filter((v) => v !== val));
    } else {
      onChange([...selectedValues, val]);
    }
  };

  const removeValue = (val: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(selectedValues.filter((v) => v !== val));
  };

  const handleSelectAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    const allFilteredVals = filteredOptions.map((o) => o.value);
    const combined = Array.from(new Set([...selectedValues, ...allFilteredVals]));
    onChange(combined);
  };

  const handleClearAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange([]);
  };

  return (
    <div className="space-y-1.5 relative">
      <div className="flex justify-between items-center">
        <label className={`text-xs font-semibold ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
          {label}
        </label>
        {selectedValues.length > 0 && (
          <button
            type="button"
            onClick={handleClearAll}
            className="text-[10px] text-amber-500 hover:text-amber-600 font-semibold cursor-pointer"
          >
            Limpar ({selectedValues.length})
          </button>
        )}
      </div>

      {/* Trigger Box */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full min-h-[38px] max-h-[90px] overflow-y-auto border rounded-xl px-2.5 py-1.5 text-xs cursor-pointer flex flex-wrap items-center gap-1.5 transition-all scrollbar-thin ${
          isLight
            ? 'border-slate-300 bg-white hover:border-amber-500/50'
            : 'border-slate-800 bg-slate-900/90 hover:border-amber-500/50'
        }`}
      >
        {selectedValues.length === 0 ? (
          <span className="text-slate-400 text-xs py-0.5">{placeholder}</span>
        ) : (
          selectedValues.map((val) => {
            const match = options.find((o) => o.value === val);
            const labelText = match ? match.label : val;
            const flag = match?.flag;

            return (
              <span
                key={val}
                className="bg-yellow-500/10 text-yellow-500 dark:text-yellow-400 border border-yellow-500/30 rounded-lg text-[11px] px-2 py-0.5 flex items-center gap-1 font-semibold shrink-0"
              >
                {flag && <span>{flag}</span>}
                <span className="truncate max-w-[180px]">{labelText}</span>
                <X
                  className="h-3 w-3 hover:text-red-500 cursor-pointer shrink-0"
                  onClick={(e) => removeValue(val, e)}
                />
              </span>
            );
          })
        )}
        <ChevronDown className="h-3.5 w-3.5 text-slate-400 ml-auto shrink-0" />
      </div>

      {/* Popover Dropdown */}
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div
            className={`absolute left-0 right-0 top-full mt-1.5 rounded-xl border shadow-2xl z-50 p-2.5 space-y-2 max-h-72 overflow-y-auto w-full min-w-[300px] ${
              isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-900 border-slate-800 text-white'
            }`}
          >
            <div className="flex gap-1.5">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Pesquisar..."
                  className={`w-full h-8 pl-8 pr-2.5 text-xs rounded-lg border focus:outline-none ${
                    isLight
                      ? 'border-slate-300 bg-slate-50 text-slate-900'
                      : 'border-slate-800 bg-slate-950 text-white'
                  }`}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  autoFocus
                />
              </div>
              <button
                type="button"
                onClick={handleSelectAll}
                className={`h-8 px-2.5 text-[11px] rounded-lg border font-semibold cursor-pointer shrink-0 transition-all ${
                  isLight
                    ? 'border-slate-300 bg-slate-100 hover:bg-slate-200 text-slate-700'
                    : 'border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300'
                }`}
              >
                Todos
              </button>
            </div>

            <div className="space-y-0.5 max-h-48 overflow-y-auto scrollbar-thin">
              {filteredOptions.length === 0 ? (
                <div className="text-[11px] text-slate-400 p-3 text-center">Nenhuma opção encontrada</div>
              ) : (
                filteredOptions.map((opt) => {
                  const isChecked = selectedValues.includes(opt.value);
                  return (
                    <div
                      key={opt.value}
                      onClick={() => toggleOption(opt.value)}
                      className={`flex items-center justify-between p-2 rounded-lg cursor-pointer text-xs transition-colors ${
                        isChecked
                          ? 'bg-yellow-500/10 text-yellow-500 font-bold'
                          : isLight
                          ? 'hover:bg-slate-100 text-slate-700'
                          : 'hover:bg-slate-800/70 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <div
                          className={`h-4 w-4 rounded border flex items-center justify-center shrink-0 ${
                            isChecked
                              ? 'bg-yellow-500 border-yellow-500 text-slate-950'
                              : isLight
                              ? 'border-slate-300 bg-white'
                              : 'border-slate-700 bg-slate-950'
                          }`}
                        >
                          {isChecked && <Check className="h-3 w-3 stroke-[3]" />}
                        </div>
                        {opt.flag && <span>{opt.flag}</span>}
                        <span className="truncate">{opt.label}</span>
                      </div>
                      {opt.count !== undefined && (
                        <span className="text-[10px] text-slate-400 shrink-0 font-medium">
                          {opt.count > 999 ? `${(opt.count / 1000).toFixed(0)}k` : opt.count}
                        </span>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export const CampaignsView: React.FC<CampaignsViewProps> = ({ onNavigateToLeads }) => {
  const {
    tenant,
    campaigns,
    templates,
    leads,
    audiences,
    createCampaign,
    launchCampaign,
    pauseCampaign,
    deleteCampaign,
    addTemplate,
    updateTemplate,
    deleteTemplate,
    resetTemplatesToOfficial,
    addAudience,
    deleteAudience,
    theme,
  } = useApp();

  const isLight = theme === 'light';

  // Sub-tabs state (matching mcs-personal screenshots)
  const [activeSubTab, setActiveSubTab] = useState<'campaigns' | 'templates' | 'audiences'>('campaigns');

  // Campaign Wizard Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3 | 4>(1);

  // Template Modal State
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<MarketingTemplate | null>(null);
  const [templateFormData, setTemplateFormData] = useState({
    title: '',
    subject: '',
    html_content: '',
  });

  // Template Preview Modal
  const [previewingTemplate, setPreviewingTemplate] = useState<MarketingTemplate | null>(null);
  const [previewDeviceMode, setPreviewDeviceMode] = useState<'desktop' | 'mobile'>('desktop');

  // =========================================================================
  // ADVANCED SAVED AUDIENCE MODAL STATE (Matching Screenshot 2 & mcs-personal)
  // =========================================================================
  const [isNewAudienceDialogOpen, setIsNewAudienceDialogOpen] = useState(false);
  const [audienceSaveName, setAudienceSaveName] = useState('');

  const [audienceFilters, setAudienceFilters] = useState({
    stageId: '',
    origin: '',
    selectedCountries: [] as string[],
    selectedCompanySizes: [] as string[],
    selectedRegions: [] as string[],
    selectedProvinces: [] as string[],
    selectedSectors: [] as string[],
    selectedServices: [] as string[],
    selectedProviders: [] as string[],
    sectorKeyword: '',
    cargoKeyword: '',
    provinceKeyword: '',
    limit: '',
    offset: '',
  });

  const [leadGridSearch, setLeadGridSearch] = useState('');
  const [gridPage, setGridPage] = useState(1);
  const [selectedAudienceLeadIds, setSelectedAudienceLeadIds] = useState<Set<string>>(new Set());

  // View Audience Members Modal State
  const [viewLeadsAudience, setViewLeadsAudience] = useState<SavedAudience | null>(null);
  const [viewLeadsSearch, setViewLeadsSearch] = useState('');
  const [viewLeadsPage, setViewLeadsPage] = useState(1);

  // Campaign Form State
  const [formData, setFormData] = useState({
    title: '',
    subject: '',
    sender_name: tenant.sender_name || 'Carlos Ventas - Universa TV España',
    sender_email: tenant.marketing_sender_email || 'carlos_ventas@mail.universatv.com',
    reply_to: 'carlos_ventas@mail.universatv.com',
    template_id: templates[0]?.id || '',
    target_audience_id: '',
    rate_limit_per_second: 2,
    launch_now: true,
  });

  // Selected leads for campaign
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Test Campaign Modal State (8 E-mails de Validação)
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [testMode, setTestMode] = useState<'distribute_8' | 'single_template' | 'all_to_all'>('distribute_8');
  const [testSelectedTemplateId, setTestSelectedTemplateId] = useState<string>('');
  const [testSenderId, setTestSenderId] = useState<string>('carlos_es');
  const [isExecutingTest, setIsExecutingTest] = useState(false);
  const [testLogs, setTestLogs] = useState<Array<{
    email: string;
    templateTitle: string;
    status: 'pending' | 'sending' | 'success' | 'error';
    error?: string;
    resendId?: string;
  }>>([]);

  // Cronograma de Disparos Filtro por Dia
  const [campaignDayFilter, setCampaignDayFilter] = useState<'all' | 'sab' | 'dom' | 'seg'>('all');
  const [isLaunchingBatch, setIsLaunchingBatch] = useState(false);

  const handleLaunchTodayBatch = async () => {
    const todayList = campaigns.filter((c) => (c.id.startsWith('camp_sab_') || c.title.includes('HOJE') || c.title.includes('Sáb')) && c.status !== 'completed');
    if (todayList.length === 0) return;
    setIsLaunchingBatch(true);
    for (const c of todayList) {
      await launchCampaign(c.id);
    }
    setIsLaunchingBatch(false);
  };

  const displayedCampaigns = useMemo(() => {
    if (campaignDayFilter === 'all') return campaigns;
    if (campaignDayFilter === 'sab') return campaigns.filter((c) => c.id.startsWith('camp_sab_') || c.title.includes('Sáb') || c.title.includes('HOJE'));
    if (campaignDayFilter === 'dom') return campaigns.filter((c) => c.id.startsWith('camp_dom_') || c.title.includes('Dom') || c.title.includes('AMANHÃ'));
    if (campaignDayFilter === 'seg') return campaigns.filter((c) => c.id.startsWith('camp_seg_') || c.title.includes('Seg') || c.title.includes('SEGUNDA'));
    return campaigns;
  }, [campaigns, campaignDayFilter]);

  const handleExecuteTestCampaign = async () => {
    if (templates.length === 0) return;
    setIsExecutingTest(true);

    const senderObj = VERIFIED_SENDERS.find((s) => s.id === testSenderId) || VERIFIED_SENDERS[0];
    const senderFrom = `${senderObj.name} <${senderObj.email}>`;
    const replyTo = senderObj.reply_to;

    // Constrói a lista de envios conforme o modo
    let dispatchPlan: Array<{ recipient: typeof VALIDATION_TEST_EMAILS_DATA[0]; template: MarketingTemplate }> = [];

    if (testMode === 'distribute_8') {
      // 1 template para cada um dos 8 emails
      dispatchPlan = VALIDATION_TEST_EMAILS_DATA.map((recipient, idx) => {
        const tmpl = templates[idx % templates.length];
        return { recipient, template: tmpl };
      });
    } else if (testMode === 'single_template') {
      const tmpl = templates.find((t) => t.id === testSelectedTemplateId) || templates[0];
      dispatchPlan = VALIDATION_TEST_EMAILS_DATA.map((recipient) => ({
        recipient,
        template: tmpl,
      }));
    } else {
      // all_to_all: todos os 8 templates para todos os 8 emails
      for (const recipient of VALIDATION_TEST_EMAILS_DATA) {
        for (const tmpl of templates) {
          dispatchPlan.push({ recipient, template: tmpl });
        }
      }
    }

    const initialLogs = dispatchPlan.map((item) => ({
      email: item.recipient.email,
      templateTitle: item.template.title,
      status: 'pending' as const,
    }));
    setTestLogs(initialLogs);

    let successCount = 0;
    for (let i = 0; i < dispatchPlan.length; i++) {
      const item = dispatchPlan[i];

      // Atualiza status para 'sending'
      setTestLogs((prev) =>
        prev.map((log, idx) => (idx === i ? { ...log, status: 'sending' } : log))
      );

      const fakeLead: Lead = {
        id: `lead_val_${item.recipient.email.replace(/[^a-zA-Z0-9]/g, '_')}`,
        tenant_id: tenant.id,
        name: item.recipient.name,
        company_name: item.recipient.company_name,
        email: item.recipient.email,
        phone: '+34 617 59 84 21',
        city: item.recipient.city,
        province: 'Comunidad',
        country: item.recipient.country,
        status: 'contacted' as LeadStatus,
        opted_out: false,
        tags: item.recipient.tags || [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const personalizedHtml = interpolateEmailVariables(item.template.html_content, fakeLead);

      const result = await sendEmailViaResend({
        apiKey: tenant.resend_api_key || '',
        from: senderFrom,
        to: item.recipient.email,
        subject: `[TESTE] ${item.template.subject}`,
        html: personalizedHtml,
        replyTo: replyTo,
      });

      if (result.success) {
        successCount++;
        setTestLogs((prev) =>
          prev.map((log, idx) =>
            idx === i ? { ...log, status: 'success', resendId: result.id } : log
          )
        );
      } else {
        setTestLogs((prev) =>
          prev.map((log, idx) =>
            idx === i ? { ...log, status: 'error', error: result.error } : log
          )
        );
      }

      // Pequeno intervalo entre envios para segurança de rate-limit
      await new Promise((resolve) => setTimeout(resolve, 350));
    }

    setIsExecutingTest(false);
    if (successCount > 0) {
      confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
    }
  };

  // Helper to detect country from lead
  const getLeadCountry = (lead: Lead): { code: string; name: string; flag: string } => {
    const c = (lead.country || '').toLowerCase();
    if (c.includes('espanha') || c.includes('spain') || c === 'es') return { code: 'ES', name: 'Espanha', flag: '🇪🇸' };
    if (c.includes('brasil') || c.includes('brazil') || c === 'br') return { code: 'BR', name: 'Brasil', flag: '🇧🇷' };
    if (c.includes('portugal') || c === 'pt') return { code: 'PT', name: 'Portugal', flag: '🇵🇹' };
    if (c.includes('frança') || c.includes('france') || c === 'fr') return { code: 'FR', name: 'França', flag: '🇫🇷' };
    if (c.includes('italia') || c.includes('itália') || c === 'it') return { code: 'IT', name: 'Itália', flag: '🇮🇹' };
    if (c.includes('alemanha') || c === 'de') return { code: 'DE', name: 'Alemanha', flag: '🇩🇪' };

    if (lead.phone) {
      const p = lead.phone.trim();
      if (p.startsWith('+34') || p.startsWith('34')) return { code: 'ES', name: 'Espanha', flag: '🇪🇸' };
      if (p.startsWith('+55') || p.startsWith('55')) return { code: 'BR', name: 'Brasil', flag: '🇧🇷' };
      if (p.startsWith('+351') || p.startsWith('351')) return { code: 'PT', name: 'Portugal', flag: '🇵🇹' };
    }
    if (lead.email) {
      const em = lead.email.toLowerCase();
      if (em.endsWith('.es')) return { code: 'ES', name: 'Espanha', flag: '🇪🇸' };
      if (em.endsWith('.br')) return { code: 'BR', name: 'Brasil', flag: '🇧🇷' };
      if (em.endsWith('.pt')) return { code: 'PT', name: 'Portugal', flag: '🇵🇹' };
    }
    return { code: 'ES', name: 'Espanha', flag: '🇪🇸' };
  };

  // Helper to detect provider from email
  const getLeadProvider = (email: string): string => {
    const em = (email || '').toLowerCase();
    if (em.includes('@gmail.')) return 'gmail';
    if (em.includes('@yahoo.')) return 'yahoo';
    if (em.includes('@outlook.') || em.includes('@hotmail.') || em.includes('@live.')) return 'outlook';
    return 'custom_domain';
  };

  // Dynamic Options for Comboboxes
  const dynamicCountryOptions = useMemo(() => {
    const counts: Record<string, number> = {};
    leads.forEach((l) => {
      const c = getLeadCountry(l).name;
      counts[c] = (counts[c] || 0) + 1;
    });

    const entries = Object.keys(counts).map((name) => {
      let flag = '🌍';
      if (name === 'Espanha') flag = '🇪🇸';
      else if (name === 'Brasil') flag = '🇧🇷';
      else if (name === 'Portugal') flag = '🇵🇹';
      else if (name === 'França') flag = '🇫🇷';
      return {
        label: `${name} (${counts[name].toLocaleString()})`,
        value: name,
        flag,
        count: counts[name],
      };
    });

    // Ensure default Spain and Brazil exist even if empty
    if (!entries.some((e) => e.value === 'Espanha')) {
      entries.push({ label: 'Espanha', value: 'Espanha', flag: '🇪🇸', count: 0 });
    }
    if (!entries.some((e) => e.value === 'Brasil')) {
      entries.push({ label: 'Brasil', value: 'Brasil', flag: '🇧🇷', count: 0 });
    }

    return entries.sort((a, b) => (b.count || 0) - (a.count || 0));
  }, [leads]);

  const dynamicCompanySizeOptions = useMemo(() => {
    return [
      { label: 'B2C Consumidor / Individual', value: 'B2C Consumidor' },
      { label: 'Peñas / Torcidas Organizadas', value: 'Peñas & Torcidas' },
      { label: 'Comunidade Brasileira no Exterior', value: 'Comunidade Brasileira' },
      { label: 'Bares & Restaurantes (Comercial)', value: 'Bares & Restaurantes' },
      { label: 'Tier 1 (Empresas de Grande Porte)', value: 'Tier 1' },
      { label: 'Tier 2 (Médio Porte)', value: 'Tier 2' },
      { label: 'Tier 3 (Pequeno Porte / Residencial)', value: 'Tier 3' },
    ];
  }, []);

  const dynamicRegionOptions = useMemo(() => {
    const counts: Record<string, number> = {};
    leads.forEach((l) => {
      const reg = l.province || l.city;
      if (reg) {
        counts[reg] = (counts[reg] || 0) + 1;
      }
    });

    const defaults = ['Comunidad de Madrid', 'Cataluña', 'Andalucía', 'Comunidad Valenciana', 'Galicia', 'País Vasco', 'São Paulo', 'Rio de Janeiro'];
    defaults.forEach((d) => {
      if (!counts[d]) counts[d] = 0;
    });

    return Object.keys(counts)
      .map((k) => ({
        label: `${k} (${counts[k].toLocaleString()})`,
        value: k,
        count: counts[k],
      }))
      .sort((a, b) => b.count - a.count);
  }, [leads]);

  const dynamicProvinceOptions = useMemo(() => {
    const counts: Record<string, number> = {};
    leads.forEach((l) => {
      const city = l.city;
      if (city) {
        counts[city] = (counts[city] || 0) + 1;
      }
    });

    const defaults = ['Madrid', 'Barcelona', 'Valencia', 'Sevilla', 'Málaga', 'Bilbao', 'Zaragoza', 'Alicante', 'São Paulo', 'Rio de Janeiro'];
    defaults.forEach((d) => {
      if (!counts[d]) counts[d] = 0;
    });

    return Object.keys(counts)
      .map((k) => ({
        label: `${k} (${counts[k].toLocaleString()})`,
        value: k,
        count: counts[k],
      }))
      .sort((a, b) => b.count - a.count);
  }, [leads]);

  const dynamicSectorOptions = useMemo(() => {
    const counts: Record<string, number> = {};
    leads.forEach((l) => {
      (l.tags || []).forEach((tag) => {
        counts[tag] = (counts[tag] || 0) + 1;
      });
      if (l.target_niche) {
        counts[l.target_niche] = (counts[l.target_niche] || 0) + 1;
      }
    });

    const defaults = [
      'Peñas LaLiga',
      'Real Madrid',
      'FC Barcelona',
      'Atlético de Madrid',
      'Sevilla FC',
      'Real Betis',
      'Athletic Bilbao',
      'Valencia CF',
      'Brasileiros na Espanha',
      'Futebol Europeu',
      'IPTV 4K',
    ];
    defaults.forEach((d) => {
      if (!counts[d]) counts[d] = 0;
    });

    return Object.keys(counts)
      .map((k) => ({
        label: `${k} (${counts[k].toLocaleString()})`,
        value: k,
        count: counts[k],
      }))
      .sort((a, b) => b.count - a.count);
  }, [leads]);

  const dynamicProviderOptions = useMemo(() => {
    const counts: Record<string, number> = {
      gmail: 0,
      yahoo: 0,
      outlook: 0,
      custom_domain: 0,
    };

    leads.forEach((l) => {
      const prov = getLeadProvider(l.email);
      counts[prov] = (counts[prov] || 0) + 1;
    });

    return [
      { label: `Gmail (@gmail.com) (${counts.gmail.toLocaleString()})`, value: 'gmail', count: counts.gmail },
      { label: `Yahoo (@yahoo.es/.com) (${counts.yahoo.toLocaleString()})`, value: 'yahoo', count: counts.yahoo },
      { label: `Outlook / Hotmail (@hotmail, @outlook) (${counts.outlook.toLocaleString()})`, value: 'outlook', count: counts.outlook },
      { label: `Domínios Próprios / Empresas (${counts.custom_domain.toLocaleString()})`, value: 'custom_domain', count: counts.custom_domain },
    ];
  }, [leads]);

  // Unique origins
  const originOptions = useMemo(() => {
    const set = new Set<string>();
    leads.forEach((l) => {
      if (l.tags && l.tags.length > 0) {
        set.add(l.tags[0]);
      }
    });
    set.add('Peñas LaLiga');
    set.add('Extração Web Gemini');
    set.add('Mailing Espanha');
    set.add('Mailing Brasil');
    set.add('Manual CRM');
    return Array.from(set);
  }, [leads]);

  // Filtered Leads for the Audience Builder Modal
  const eligibleLeadsForAudience = useMemo(() => {
    let list = leads.filter((l) => !l.opted_out);

    // Filter by Stage
    if (audienceFilters.stageId) {
      list = list.filter((l) => l.status === audienceFilters.stageId);
    }

    // Filter by Origin
    if (audienceFilters.origin) {
      list = list.filter((l) => (l.tags || []).some((t) => t.toLowerCase() === audienceFilters.origin.toLowerCase()));
    }

    // Filter by Country
    if (audienceFilters.selectedCountries.length > 0) {
      list = list.filter((l) => {
        const countryName = getLeadCountry(l).name;
        return audienceFilters.selectedCountries.includes(countryName);
      });
    }

    // Filter by Region
    if (audienceFilters.selectedRegions.length > 0) {
      list = list.filter((l) => {
        const reg = (l.province || l.city || '').toLowerCase();
        return audienceFilters.selectedRegions.some((r) => reg.includes(r.toLowerCase()));
      });
    }

    // Filter by Province / City
    if (audienceFilters.selectedProvinces.length > 0) {
      list = list.filter((l) => {
        const c = (l.city || l.province || '').toLowerCase();
        return audienceFilters.selectedProvinces.some((p) => c.includes(p.toLowerCase()));
      });
    }

    // Filter by Sectors / Tags / Clubs
    if (audienceFilters.selectedSectors.length > 0) {
      list = list.filter((l) => {
        const leadTags = (l.tags || []).map((t) => t.toLowerCase());
        const niche = (l.target_niche || '').toLowerCase();
        return audienceFilters.selectedSectors.some(
          (s) => leadTags.includes(s.toLowerCase()) || niche.includes(s.toLowerCase())
        );
      });
    }

    // Filter by Provider
    if (audienceFilters.selectedProviders.length > 0) {
      list = list.filter((l) => {
        const prov = getLeadProvider(l.email);
        return audienceFilters.selectedProviders.includes(prov);
      });
    }

    // Keyword Free Search
    if (audienceFilters.sectorKeyword.trim()) {
      const kw = audienceFilters.sectorKeyword.toLowerCase().trim();
      list = list.filter(
        (l) =>
          (l.name && l.name.toLowerCase().includes(kw)) ||
          (l.company_name && l.company_name.toLowerCase().includes(kw)) ||
          (l.city && l.city.toLowerCase().includes(kw)) ||
          (l.notes && l.notes.toLowerCase().includes(kw))
      );
    }

    // Apply Offset and Limit if specified
    const offset = parseInt(audienceFilters.offset) || 0;
    const limit = parseInt(audienceFilters.limit) || 0;

    if (offset > 0) {
      list = list.slice(offset);
    }
    if (limit > 0) {
      list = list.slice(0, limit);
    }

    return list;
  }, [leads, audienceFilters]);

  // Filtered Leads further by the in-grid search box
  const visibleLeadsForGrid = useMemo(() => {
    if (!leadGridSearch.trim()) return eligibleLeadsForAudience;
    const s = leadGridSearch.toLowerCase().trim();
    return eligibleLeadsForAudience.filter(
      (l) =>
        (l.name && l.name.toLowerCase().includes(s)) ||
        (l.company_name && l.company_name.toLowerCase().includes(s)) ||
        (l.email && l.email.toLowerCase().includes(s)) ||
        (l.city && l.city.toLowerCase().includes(s))
    );
  }, [eligibleLeadsForAudience, leadGridSearch]);

  // Paginated leads for the right column (50 per page)
  const pageSize = 50;
  const totalPages = Math.max(1, Math.ceil(visibleLeadsForGrid.length / pageSize));
  const paginatedLeads = useMemo(() => {
    const start = (gridPage - 1) * pageSize;
    return visibleLeadsForGrid.slice(start, start + pageSize);
  }, [visibleLeadsForGrid, gridPage]);

  // Open the Advanced Audience Dialog and pre-select leads
  const handleOpenNewAudienceDialog = () => {
    setIsNewAudienceDialogOpen(true);
    setAudienceSaveName('');
    setAudienceFilters({
      stageId: '',
      origin: '',
      selectedCountries: ['Espanha'],
      selectedCompanySizes: [],
      selectedRegions: [],
      selectedProvinces: [],
      selectedSectors: [],
      selectedServices: [],
      selectedProviders: [],
      sectorKeyword: '',
      cargoKeyword: '',
      provinceKeyword: '',
      limit: '',
      offset: '',
    });
    setLeadGridSearch('');
    setGridPage(1);

    // Default select first batch of eligible leads
    const initialEligible = leads.filter((l) => !l.opted_out);
    setSelectedAudienceLeadIds(new Set(initialEligible.slice(0, 5000).map((l) => l.id)));
  };

  // Toggle single lead selection
  const handleToggleSelectLead = (leadId: string, checked: boolean) => {
    setSelectedAudienceLeadIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(leadId);
      else next.delete(leadId);
      return next;
    });
  };

  // Toggle select all in current filtered view
  const handleToggleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = visibleLeadsForGrid.map((l) => l.id);
      setSelectedAudienceLeadIds(new Set(allIds));
    } else {
      setSelectedAudienceLeadIds(new Set());
    }
  };

  // Select all filtered leads
  const handleSelectAllFiltered = () => {
    const allIds = visibleLeadsForGrid.map((l) => l.id);
    setSelectedAudienceLeadIds(new Set(allIds));
  };

  // Clear all selections
  const handleClearSelection = () => {
    setSelectedAudienceLeadIds(new Set());
  };

  // Save new audience preset
  const handleCreateNewAudiencePreset = async () => {
    if (!audienceSaveName.trim() || selectedAudienceLeadIds.size === 0) return;

    await addAudience({
      name: audienceSaveName.trim(),
      description: `Segmento personalizado com ${selectedAudienceLeadIds.size.toLocaleString()} leads selecionados`,
      filters: {
        status: audienceFilters.stageId ? [audienceFilters.stageId as LeadStatus] : undefined,
        origin: audienceFilters.origin || undefined,
        country: audienceFilters.selectedCountries.length > 0 ? audienceFilters.selectedCountries : undefined,
        region: audienceFilters.selectedRegions.length > 0 ? audienceFilters.selectedRegions : undefined,
        province: audienceFilters.selectedProvinces.length > 0 ? audienceFilters.selectedProvinces : undefined,
        tags: audienceFilters.selectedSectors.length > 0 ? audienceFilters.selectedSectors : undefined,
        company_size: audienceFilters.selectedCompanySizes.length > 0 ? audienceFilters.selectedCompanySizes : undefined,
        providers: audienceFilters.selectedProviders.length > 0 ? audienceFilters.selectedProviders : undefined,
        search_query: audienceFilters.sectorKeyword || undefined,
        limit: audienceFilters.limit ? parseInt(audienceFilters.limit) : undefined,
        offset: audienceFilters.offset ? parseInt(audienceFilters.offset) : undefined,
      },
      lead_ids: Array.from(selectedAudienceLeadIds),
      lead_count: selectedAudienceLeadIds.size,
    });

    try {
      confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } });
    } catch {}

    setIsNewAudienceDialogOpen(false);
    setAudienceSaveName('');
    setSelectedAudienceLeadIds(new Set());
    setNotification({
      type: 'success',
      message: `Público "${audienceSaveName}" criado com sucesso com ${selectedAudienceLeadIds.size.toLocaleString()} membros!`,
    });
  };

  // Filter leads based on selected audience for Campaign Wizard
  const handleAudienceChange = (audienceId: string) => {
    setFormData((prev) => ({ ...prev, target_audience_id: audienceId }));
    if (!audienceId || audienceId === 'all') {
      setSelectedLeadIds(leads.filter((l) => !l.opted_out && l.mx_valid).map((l) => l.id));
      return;
    }

    const aud = audiences.find((a) => a.id === audienceId);
    if (!aud) return;

    // Direct lead_ids array if present
    if (aud.lead_ids && aud.lead_ids.length > 0) {
      setSelectedLeadIds(aud.lead_ids);
      return;
    }

    // Fallback to dynamic filters
    const filtered = leads.filter((lead) => {
      if (lead.opted_out) return false;
      const f = (aud.filters || {}) as any;

      if (f.status) {
        const statuses = Array.isArray(f.status) ? f.status : [f.status];
        if (statuses.length > 0 && !statuses.includes(lead.status)) return false;
      }
      if (f.city) {
        const cities = Array.isArray(f.city) ? f.city : [f.city];
        if (cities.length > 0 && !cities.includes(lead.city as any)) return false;
      }
      if (f.country) {
        const countries = Array.isArray(f.country) ? f.country : [f.country];
        if (countries.length > 0 && !countries.some((c: any) => (lead.country || '').toLowerCase() === String(c).toLowerCase())) return false;
      }
      if (f.province) {
        const provinces = Array.isArray(f.province) ? f.province : [f.province];
        if (provinces.length > 0 && !provinces.includes(lead.province as any)) return false;
      }
      if (f.tags || f.tag) {
        const rawTags = f.tags || f.tag;
        const tags = Array.isArray(rawTags) ? rawTags : [rawTags];
        if (tags.length > 0) {
          const hasTag = (lead.tags || []).some((t) => tags.includes(t));
          if (!hasTag) return false;
        }
      }
      return true;
    });

    setSelectedLeadIds(filtered.map((l) => l.id));
  };

  const handleOpenWizard = (targetAudienceId?: string) => {
    setIsCreateModalOpen(true);
    setWizardStep(1);

    const initialAudId = targetAudienceId || '';
    if (initialAudId) {
      handleAudienceChange(initialAudId);
    } else {
      setSelectedLeadIds(leads.filter((l) => !l.opted_out && l.mx_valid).map((l) => l.id));
    }

    const defaultTmpl = templates[0];
    setFormData({
      title: 'Disparo B2C - Teste 24 Horas Universa TV',
      subject: defaultTmpl?.subject || '⚽ ¿Ver todo el fútbol en 4K sin pagar 120€/mes? (Test 24h Gratis)',
      sender_name: tenant.sender_name || 'Carlos Ventas - Universa TV España',
      sender_email: tenant.marketing_sender_email || 'carlos_ventas@mail.universatv.com',
      reply_to: 'carlos_ventas@mail.universatv.com',
      template_id: defaultTmpl?.id || '',
      target_audience_id: initialAudId,
      rate_limit_per_second: 2,
      launch_now: true,
    });
  };

  const handleCreateAndLaunch = async () => {
    if (!formData.title || !formData.subject || !formData.template_id || selectedLeadIds.length === 0) {
      setNotification({ type: 'error', message: 'Preencha todos os campos e selecione pelo menos 1 destinatário.' });
      return;
    }

    try {
      const camp = await createCampaign(
        {
          title: formData.title,
          subject: formData.subject,
          sender_name: formData.sender_name,
          sender_email: formData.sender_email,
          reply_to: formData.reply_to,
          template_id: formData.template_id,
          target_audience_id: formData.target_audience_id || undefined,
          rate_limit_per_second: formData.rate_limit_per_second,
          status: 'draft',
          total_recipients: selectedLeadIds.length,
        },
        selectedLeadIds
      );

      if (formData.launch_now) {
        await launchCampaign(camp.id);
      }

      setIsCreateModalOpen(false);
      setNotification({
        type: 'success',
        message: `Campanha "${formData.title}" agendada com ${selectedLeadIds.length.toLocaleString()} destinatários!`,
      });

      try {
        confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
      } catch {}
    } catch {
      setNotification({ type: 'error', message: 'Falha ao criar campanha. Verifique sua chave Resend.' });
    }
  };

  const handleEditTemplate = (tmpl: MarketingTemplate) => {
    setEditingTemplate(tmpl);
    setTemplateFormData({
      title: tmpl.title,
      subject: tmpl.subject,
      html_content: tmpl.html_content,
    });
    setIsTemplateModalOpen(true);
  };

  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateFormData.title || !templateFormData.subject || !templateFormData.html_content) return;

    if (editingTemplate) {
      await updateTemplate(editingTemplate.id, {
        title: templateFormData.title,
        subject: templateFormData.subject,
        html_content: templateFormData.html_content,
      });
      setNotification({ type: 'success', message: 'Template atualizado com sucesso!' });
    } else {
      await addTemplate({
        title: templateFormData.title,
        subject: templateFormData.subject,
        html_content: templateFormData.html_content,
        variables: ['{{name}}', '{{city}}', '{{club}}', '{{whatsapp_link}}', '{{test_link}}'],
        category: 'b2c_es',
      });
      setNotification({ type: 'success', message: 'Template criado com sucesso!' });
    }

    setIsTemplateModalOpen(false);
    setEditingTemplate(null);
  };

  // Leads for View Audience Members Modal
  const viewAudienceLeadsList = useMemo(() => {
    if (!viewLeadsAudience) return [];
    const ids = viewLeadsAudience.lead_ids || [];
    const map = new Map(leads.map((l) => [l.id, l]));
    let list: Lead[] = [];

    if (ids.length > 0) {
      list = ids.map((id) => map.get(id)).filter(Boolean) as Lead[];
    } else {
      list = leads.filter((l) => {
        const f = (viewLeadsAudience.filters || {}) as any;
        if (f.country) {
          const countries = Array.isArray(f.country) ? f.country : [f.country];
          if (countries.length > 0 && !countries.some((c: any) => (l.country || '').toLowerCase() === String(c).toLowerCase())) return false;
        }
        if (f.city) {
          const cities = Array.isArray(f.city) ? f.city : [f.city];
          if (cities.length > 0 && !cities.some((c: any) => (l.city || '').toLowerCase() === String(c).toLowerCase())) return false;
        }
        return true;
      });
    }

    if (!viewLeadsSearch.trim()) return list;
    const s = viewLeadsSearch.toLowerCase().trim();
    return list.filter(
      (l) =>
        (l.name && l.name.toLowerCase().includes(s)) ||
        (l.company_name && l.company_name.toLowerCase().includes(s)) ||
        (l.email && l.email.toLowerCase().includes(s))
    );
  }, [viewLeadsAudience, leads, viewLeadsSearch]);

  return (
    <div className="space-y-6">
      {/* Toast Notification Banner */}
      {notification && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between text-xs font-semibold shadow-md transition-all ${
            notification.type === 'success'
              ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
              : 'bg-rose-500/10 text-rose-600 border border-rose-500/20'
          }`}
        >
          <span>{notification.message}</span>
          <button onClick={() => setNotification(null)} className="cursor-pointer font-bold">
            ✕
          </button>
        </div>
      )}

      {/* Top Header matching mcs-personal layout */}
      <div
        className={`rounded-2xl border p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 transition-all ${
          isLight ? 'border-slate-200 bg-white shadow-xs' : 'border-zinc-800 bg-zinc-950/70 shadow-lg'
        }`}
      >
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-yellow-500 flex items-center justify-center font-bold text-white text-base">
              ✉️
            </div>
            <h1 className={`text-2xl font-bold tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
              Campanhas de Marketing
            </h1>
            <span className="rounded-full bg-yellow-500/10 px-3 py-0.5 text-xs font-bold text-yellow-600 border border-yellow-500/20">
              {campaigns.length} Campanhas
            </span>
          </div>
          <p className={`text-xs sm:text-sm ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
            Disparos em massa com Resend, templates HTML profissionais e públicos segmentados
          </p>
        </div>

        {/* Action Button depending on active subtab */}
        <div className="flex items-center gap-2.5">
          {activeSubTab === 'campaigns' && (
            <>
              <button
                onClick={() => {
                  setTestLogs([]);
                  setIsTestModalOpen(true);
                }}
                className={`flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-xs font-bold transition-all cursor-pointer border shadow-sm ${
                  isLight
                    ? 'bg-amber-50 border-amber-300 text-amber-800 hover:bg-amber-100'
                    : 'bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20'
                }`}
                title="Disparar teste dos templates para os 8 e-mails de validação"
              >
                <Sparkles className="h-4 w-4 text-amber-500" />
                <span>🧪 Testar 8 Templates</span>
              </button>

              <button
                onClick={() => handleOpenWizard()}
                className="flex items-center gap-2 rounded-xl bg-yellow-500 hover:bg-yellow-400 px-4 py-2.5 text-xs font-bold text-slate-950 shadow-md shadow-yellow-500/20 transition-all cursor-pointer"
              >
                <Plus className="h-4 w-4 stroke-[3]" />
                <span>+ Nova Campanha</span>
              </button>
            </>
          )}

          {activeSubTab === 'templates' && (
            <button
              onClick={() => {
                setEditingTemplate(null);
                setTemplateFormData({
                  title: '',
                  subject: '',
                  html_content: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; background-color: #ffffff; color: #1e293b; border-radius: 12px; border: 1px solid #e2e8f0;">\n  <h2 style="color: #0f172a;">Olá {{name}},</h2>\n  <p>Temos uma oferta exclusiva para quem mora em <strong>{{city}}</strong>!</p>\n  <p style="margin-top: 25px;"><a href="{{test_link}}" style="background-color: #eab308; color: #000; padding: 12px 24px; border-radius: 8px; font-weight: bold; text-decoration: none;">Pedir Teste 24 Horas Grátis</a></p>\n</div>`,
                });
                setIsTemplateModalOpen(true);
              }}
              className="flex items-center gap-2 rounded-xl bg-yellow-500 hover:bg-yellow-400 px-4 py-2.5 text-xs font-bold text-slate-950 shadow-md shadow-yellow-500/20 transition-all cursor-pointer"
            >
              <Plus className="h-4 w-4 stroke-[3]" />
              <span>+ Criar Template HTML</span>
            </button>
          )}

          {activeSubTab === 'audiences' && (
            <button
              onClick={handleOpenNewAudienceDialog}
              className="flex items-center gap-2 rounded-xl bg-yellow-500 hover:bg-yellow-400 px-4 py-2.5 text-xs font-bold text-slate-950 shadow-md shadow-yellow-500/20 transition-all cursor-pointer"
            >
              <Plus className="h-4 w-4 stroke-[3]" />
              <span>+ Novo Público Salvo</span>
            </button>
          )}
        </div>
      </div>

      {/* Sub-tabs Header matching mcs-personal layout */}
      <div className={`flex items-center gap-2 border-b pb-2 ${isLight ? 'border-slate-200' : 'border-zinc-800'}`}>
        <button
          onClick={() => setActiveSubTab('campaigns')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSubTab === 'campaigns'
              ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20'
              : isLight
              ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
          }`}
        >
          <Send className="h-4 w-4" />
          <span>Campanhas</span>
          <span
            className={`rounded-full px-2 py-0.2 text-[10px] ml-1 font-semibold ${
              isLight ? 'bg-slate-200 text-slate-700' : 'bg-slate-800 text-slate-300'
            }`}
          >
            {campaigns.length}
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('templates')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSubTab === 'templates'
              ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20'
              : isLight
              ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
          }`}
        >
          <FileCode className="h-4 w-4" />
          <span>Templates de E-mail</span>
          <span
            className={`rounded-full px-2 py-0.2 text-[10px] ml-1 font-semibold ${
              isLight ? 'bg-slate-200 text-slate-700' : 'bg-slate-800 text-slate-300'
            }`}
          >
            {templates.length}
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('audiences')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSubTab === 'audiences'
              ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20'
              : isLight
              ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
          }`}
        >
          <Users className="h-4 w-4" />
          <span>Públicos / Segmentos</span>
          <span
            className={`rounded-full px-2 py-0.2 text-[10px] ml-1 font-semibold ${
              isLight ? 'bg-slate-200 text-slate-700' : 'bg-slate-800 text-slate-300'
            }`}
          >
            {audiences.length}
          </span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: CAMPANHAS (Cards Grid matching Screenshot 2) */}
      {/* ========================================================================= */}
      {activeSubTab === 'campaigns' && (
        <div className="space-y-4">
          {/* Cronograma Bar: Filtros por Dia e Botão de Ação Rápida */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl border bg-yellow-500/5 border-yellow-500/20">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-bold mr-1 text-yellow-500 flex items-center gap-1">
                📅 Cronograma:
              </span>

              <button
                onClick={() => setCampaignDayFilter('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  campaignDayFilter === 'all'
                    ? 'bg-yellow-500 text-slate-950 shadow-sm'
                    : isLight
                    ? 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                    : 'bg-zinc-800 text-slate-300 hover:bg-zinc-700 border border-zinc-700'
                }`}
              >
                Todas ({campaigns.length})
              </button>

              <button
                onClick={() => setCampaignDayFilter('sab')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  campaignDayFilter === 'sab'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : isLight
                    ? 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                    : 'bg-zinc-800 text-slate-300 hover:bg-zinc-700 border border-zinc-700'
                }`}
              >
                <span>🔥 Hoje - Sáb (4.200)</span>
                <span className="text-[10px] opacity-75 font-mono">
                  ({campaigns.filter((c) => c.id.startsWith('camp_sab_') || c.title.includes('Sáb') || c.title.includes('HOJE')).length})
                </span>
              </button>

              <button
                onClick={() => setCampaignDayFilter('dom')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  campaignDayFilter === 'dom'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : isLight
                    ? 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                    : 'bg-zinc-800 text-slate-300 hover:bg-zinc-700 border border-zinc-700'
                }`}
              >
                <span>⭐ Dom 06/09 (4.900)</span>
                <span className="text-[10px] opacity-75 font-mono">
                  ({campaigns.filter((c) => c.id.startsWith('camp_dom_') || c.title.includes('Dom') || c.title.includes('AMANHÃ')).length})
                </span>
              </button>

              <button
                onClick={() => setCampaignDayFilter('seg')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  campaignDayFilter === 'seg'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : isLight
                    ? 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                    : 'bg-zinc-800 text-slate-300 hover:bg-zinc-700 border border-zinc-700'
                }`}
              >
                <span>💼 Seg 07/09 (5.950)</span>
                <span className="text-[10px] opacity-75 font-mono">
                  ({campaigns.filter((c) => c.id.startsWith('camp_seg_') || c.title.includes('Seg') || c.title.includes('SEGUNDA')).length})
                </span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                disabled={isLaunchingBatch}
                onClick={handleLaunchTodayBatch}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-bold text-xs shadow-sm cursor-pointer disabled:opacity-50"
                title="Disparar em sequência as 7 campanhas programadas para hoje"
              >
                {isLaunchingBatch ? (
                  <>
                    <div className="h-3.5 w-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                    <span>Disparando Lote de Hoje...</span>
                  </>
                ) : (
                  <>
                    <Play className="h-3.5 w-3.5 fill-current" />
                    <span>🚀 Disparar Lote de Hoje (4.200 envios)</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {displayedCampaigns.length === 0 ? (
            <div
              className={`rounded-2xl border p-12 text-center space-y-4 ${
                isLight ? 'border-slate-200 bg-white' : 'border-zinc-800 bg-zinc-950/40'
              }`}
            >
              <div className="h-12 w-12 rounded-2xl bg-yellow-500/10 text-yellow-500 mx-auto flex items-center justify-center">
                <Send className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h3 className={`font-bold text-base ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
                  Nenhuma campanha encontrada neste filtro
                </h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Selecione "Todas" ou crie uma nova campanha personalizada.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {displayedCampaigns.map((camp) => {
                const total = camp.total_recipients || 1;
                const sent = camp.sent_count || 0;
                const pct = Math.min(100, Math.round((sent / total) * 100));

                let statusBadge = {
                  label: 'Rascunho',
                  bg: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
                };
                if (camp.status === 'scheduled') {
                  let scheduleLabel = 'Agendada';
                  if (camp.id.startsWith('camp_sab_') || camp.title.includes('HOJE') || camp.title.includes('Sáb')) {
                    scheduleLabel = '📅 Hoje às 11:40';
                  } else if (camp.id.startsWith('camp_dom_') || camp.title.includes('DOM') || camp.title.includes('Dom')) {
                    scheduleLabel = '📅 Dom 06/09 às 12:00';
                  } else if (camp.id.startsWith('camp_seg_') || camp.title.includes('SEG') || camp.title.includes('Seg')) {
                    scheduleLabel = '📅 Seg 07/09 às 10:00';
                  }
                  statusBadge = {
                    label: scheduleLabel,
                    bg: 'bg-purple-500/15 text-purple-400 border-purple-500/30 font-semibold',
                  };
                } else if (camp.status === 'sending') {
                  statusBadge = {
                    label: 'Em Disparo',
                    bg: 'bg-amber-500/10 text-amber-500 border-amber-500/20 animate-pulse',
                  };
                } else if (camp.status === 'completed') {
                  statusBadge = {
                    label: 'Concluída',
                    bg: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
                  };
                } else if (camp.status === 'paused') {
                  statusBadge = {
                    label: 'Pausada',
                    bg: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
                  };
                }

                return (
                  <div
                    key={camp.id}
                    className={`rounded-2xl border p-5 flex flex-col justify-between space-y-4 transition-all hover:shadow-lg ${
                      isLight
                        ? 'border-slate-200 bg-white hover:border-slate-300'
                        : 'border-zinc-800 bg-zinc-950/70 hover:border-zinc-700'
                    }`}
                  >
                    {/* Header: Status Badge & Trash */}
                    <div className="flex items-center justify-between">
                      <span className={`rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${statusBadge.bg}`}>
                        {statusBadge.label}
                      </span>

                      <button
                        onClick={() => deleteCampaign(camp.id)}
                        className="text-slate-400 hover:text-rose-500 transition-colors p-1 cursor-pointer"
                        title="Excluir campanha"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {/* Campaign Info */}
                    <div className="space-y-1.5">
                      <h3 className={`font-bold text-sm line-clamp-1 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                        {camp.title}
                      </h3>
                      <p className="text-xs text-slate-400 line-clamp-2">
                        <strong>Assunto:</strong> {camp.subject}
                      </p>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1.5 pt-1">
                        <span>Remetente:</span>
                        <span className="font-semibold text-slate-400 truncate">{camp.sender_email}</span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-zinc-800/80">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-slate-400">Progresso</span>
                        <span className="font-bold text-slate-300">
                          {sent.toLocaleString()} / {total.toLocaleString()} ({pct}%)
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-zinc-800 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-yellow-500 transition-all duration-300"
                          style={{ width: `${pct}%` }}
                        />
                      </div>

                      {/* Performance KPIs */}
                      <div className="grid grid-cols-3 gap-2 pt-2 text-center text-[10px]">
                        <div className="rounded-lg bg-slate-50 dark:bg-zinc-900 p-1.5 border border-slate-200 dark:border-zinc-800">
                          <span className="block text-slate-400 font-medium">Entregues</span>
                          <span className="font-bold text-emerald-500">{camp.delivered_count || 0}</span>
                        </div>
                        <div className="rounded-lg bg-slate-50 dark:bg-zinc-900 p-1.5 border border-slate-200 dark:border-zinc-800">
                          <span className="block text-slate-400 font-medium">Aberturas</span>
                          <span className="font-bold text-cyan-500">{camp.opened_count || 0}</span>
                        </div>
                        <div className="rounded-lg bg-slate-50 dark:bg-zinc-900 p-1.5 border border-slate-200 dark:border-zinc-800">
                          <span className="block text-slate-400 font-medium">Cliques</span>
                          <span className="font-bold text-yellow-500">{camp.clicked_count || 0}</span>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Action Controls */}
                    <div className="pt-2 flex items-center justify-between gap-2">
                      {(camp.status === 'draft' || camp.status === 'scheduled') && (
                        <button
                          onClick={() => launchCampaign(camp.id)}
                          className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-yellow-500 hover:bg-yellow-400 text-slate-950 text-xs font-bold shadow-xs cursor-pointer transition-all"
                        >
                          <Play className="h-3.5 w-3.5 fill-current" />
                          <span>{camp.status === 'scheduled' ? 'Disparar Agora' : 'Iniciar Disparo'}</span>
                        </button>
                      )}

                      {camp.status === 'sending' && (
                        <button
                          onClick={() => pauseCampaign(camp.id)}
                          className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-xl border border-yellow-500/30 text-yellow-500 hover:bg-yellow-500/10 text-xs font-bold cursor-pointer"
                        >
                          <Pause className="h-3.5 w-3.5" />
                          <span>Pausar</span>
                        </button>
                      )}

                      {camp.status === 'paused' && (
                        <button
                          onClick={() => launchCampaign(camp.id)}
                          className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-xl bg-yellow-500 hover:bg-yellow-400 text-slate-950 text-xs font-bold cursor-pointer"
                        >
                          <Play className="h-3.5 w-3.5 fill-current" />
                          <span>Retomar Disparo</span>
                        </button>
                      )}

                      {camp.status === 'completed' && (
                        <span className="w-full text-center text-xs font-bold text-emerald-500 py-1.5 flex items-center justify-center gap-1">
                          <CheckCircle className="h-3.5 w-3.5" />
                          <span>Finalizada</span>
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: TEMPLATES DE E-MAIL (Cards Grid matching Screenshot 3) */}
      {/* ========================================================================= */}
      {activeSubTab === 'templates' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-slate-100 dark:border-zinc-800">
            <div>
              <h2 className={`text-base font-bold flex items-center gap-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                Templates Oficiais UniversaTV ({templates.length})
              </h2>
              <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                Templates de alta conversão em espanhol com botões para WhatsApp (+34 617 59 84 21) e prova de 24h.
              </p>
            </div>
            <button
              onClick={async () => {
                if (window.confirm('Carregar e restaurar todos os 8 templates oficiais de alta conversão da UniversaTV?')) {
                  await resetTemplatesToOfficial();
                }
              }}
              className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-1.5 text-xs font-semibold cursor-pointer transition-all ${
                isLight
                  ? 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50 shadow-xs'
                  : 'border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800'
              }`}
            >
              <RotateCcw className="h-3.5 w-3.5 text-amber-500" />
              Restaurar Templates Oficiais UniversaTV
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((tmpl) => (
              <div
                key={tmpl.id}
                className={`rounded-2xl border p-5 flex flex-col justify-between space-y-4 transition-all hover:shadow-lg ${
                  isLight ? 'border-slate-200 bg-white hover:border-slate-300' : 'border-zinc-800 bg-zinc-950/70 hover:border-zinc-700'
                }`}
              >
                {/* Header: HTML badge & Trash */}
                <div className="flex items-center justify-between">
                  <span className="rounded-md bg-slate-500/10 text-slate-400 border border-slate-500/20 px-2 py-0.5 text-[11px] font-mono font-bold">
                    &lt;&gt; HTML
                  </span>

                  <button
                    onClick={() => deleteTemplate(tmpl.id)}
                    className="text-slate-400 hover:text-rose-500 transition-colors p-1"
                    title="Excluir template"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Content info */}
                <div className="space-y-1.5">
                  <h3 className={`font-bold text-sm line-clamp-1 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                    {tmpl.title}
                  </h3>
                  <p className="text-xs text-slate-400 line-clamp-2">
                    <strong>Assunto:</strong> {tmpl.subject}
                  </p>
                  <span className="text-[10px] text-slate-500 block pt-1">
                    Atualizado em: {new Date(tmpl.updated_at || tmpl.created_at).toLocaleDateString()}
                  </span>
                </div>

                {/* Bottom Actions matching screenshot */}
                <div className="pt-3 border-t border-slate-100 dark:border-zinc-800/80 flex items-center justify-between gap-2">
                  <button
                    onClick={() => setPreviewingTemplate(tmpl)}
                    className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 font-medium cursor-pointer"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    <span>Visualizar</span>
                  </button>

                  <button
                    onClick={() => handleEditTemplate(tmpl)}
                    className="flex items-center gap-1.5 text-xs text-yellow-500 hover:text-yellow-400 font-bold cursor-pointer"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                    <span>Editar HTML</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: PÚBLICOS / SEGMENTOS (Cards Grid matching Screenshot 4) */}
      {/* ========================================================================= */}
      {activeSubTab === 'audiences' && (
        <div className="space-y-4">
          <div className="space-y-1">
            <h2 className={`text-base font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
              Segmentos e Públicos Reutilizáveis
            </h2>
            <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
              Crie e gerencie públicos filtrados com todos os filtros, tags e seleções em lotes
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {audiences.map((aud) => (
              <div
                key={aud.id}
                className={`rounded-2xl border p-5 flex flex-col justify-between space-y-4 transition-all hover:shadow-lg ${
                  isLight ? 'border-slate-200 bg-white hover:border-slate-300' : 'border-zinc-800 bg-zinc-950/70 hover:border-zinc-700'
                }`}
              >
                {/* Header: SEGMENTO & count badge & Trash */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="rounded-md bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                      SEGMENTO
                    </span>
                    <span className="rounded-md bg-emerald-500/10 text-emerald-500 px-2 py-0.5 text-[11px] font-bold">
                      {aud.lead_count ? aud.lead_count.toLocaleString() : (aud.lead_ids?.length || 0).toLocaleString()} leads
                    </span>
                  </div>

                  <button
                    onClick={() => deleteAudience(aud.id)}
                    className="text-slate-400 hover:text-rose-500 transition-colors p-1 cursor-pointer"
                    title="Excluir público"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Audience Title & Filter tags */}
                <div className="space-y-2">
                  <h3 className={`font-bold text-sm line-clamp-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                    {aud.name}
                  </h3>

                  {/* Filter details */}
                  <div className="space-y-1 text-[11px] text-slate-400">
                    {(() => {
                      const f = (aud.filters || {}) as any;
                      const country = formatFilterDisplay(f.country);
                      const region = formatFilterDisplay(f.region);
                      const province = formatFilterDisplay(f.province);
                      const tags = formatFilterDisplay(f.tags || f.tag || f.niche);
                      const sector = formatFilterDisplay(f.sector);
                      const providers = formatFilterDisplay(f.providers || f.provider);

                      return (
                        <>
                          {country && (
                            <div className="flex items-center gap-1.5 truncate">
                              <span className="font-semibold text-slate-500">País:</span>
                              <span className={`font-medium truncate ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>{country}</span>
                            </div>
                          )}
                          {region && (
                            <div className="flex items-center gap-1.5 truncate">
                              <span className="font-semibold text-slate-500">Regiões:</span>
                              <span className="truncate">{region}</span>
                            </div>
                          )}
                          {province && (
                            <div className="flex items-center gap-1.5 truncate">
                              <span className="font-semibold text-slate-500">Províncias:</span>
                              <span className="truncate">{province}</span>
                            </div>
                          )}
                          {sector && (
                            <div className="flex items-center gap-1.5 truncate">
                              <span className="font-semibold text-slate-500">Setor:</span>
                              <span className="truncate">{sector}</span>
                            </div>
                          )}
                          {tags && (
                            <div className="flex items-center gap-1.5 truncate">
                              <span className="font-semibold text-slate-500">Tags/Nichos:</span>
                              <span className="truncate">{tags}</span>
                            </div>
                          )}
                          {providers && (
                            <div className="flex items-center gap-1.5 truncate">
                              <span className="font-semibold text-slate-500">Provedores:</span>
                              <span className="truncate">{providers}</span>
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </div>

                {/* Bottom Actions matching screenshot */}
                <div className="pt-3 border-t border-slate-100 dark:border-zinc-800/80 flex items-center justify-between gap-2">
                  <button
                    onClick={() => {
                      setViewLeadsAudience(aud);
                      setViewLeadsSearch('');
                      setViewLeadsPage(1);
                    }}
                    className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 font-medium cursor-pointer"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    <span>Ver Leads</span>
                  </button>

                  <button
                    onClick={() => handleOpenWizard(aud.id)}
                    className="flex items-center gap-1.5 text-xs text-yellow-500 hover:text-yellow-400 font-bold cursor-pointer"
                  >
                    <Send className="h-3.5 w-3.5" />
                    <span>Nova Campanha</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: ADVANCED AUDIENCE SEGMENTATION (Matches Screenshot 2 & mcs-personal) */}
      {/* ========================================================================= */}
      {isNewAudienceDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-2 sm:p-4">
          <div
            className={`w-[96vw] max-w-[1440px] h-[92vh] max-h-[92vh] flex flex-col justify-between p-5 sm:p-6 rounded-2xl shadow-2xl border ${
              isLight ? 'border-slate-200 bg-white text-slate-900' : 'border-zinc-800 bg-slate-950 text-white'
            }`}
          >
            {/* Modal Header */}
            <div
              className={`border-b pb-3 flex items-center justify-between shrink-0 ${
                isLight ? 'border-slate-200' : 'border-slate-800'
              }`}
            >
              <div>
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="h-5 w-5 text-yellow-500" />
                  <h2 className={`text-lg font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                    Criar Novo Público Salvo
                  </h2>
                </div>
                <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                  Filtre e selecione os leads que farão parte deste segmento reutilizável.
                </p>
              </div>
              <button
                onClick={() => setIsNewAudienceDialogOpen(false)}
                className={`p-1 rounded-lg cursor-pointer transition-colors ${
                  isLight ? 'text-slate-400 hover:text-slate-700' : 'text-slate-400 hover:text-white'
                }`}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body: 2 Columns */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-hidden flex-1 py-3 text-sm min-h-0">
              {/* Left Column: FILTROS GERAIS (5 cols) */}
              <div
                className={`lg:col-span-5 space-y-4 overflow-y-auto pr-3 lg:border-r h-full scrollbar-thin ${
                  isLight ? 'border-slate-200' : 'border-slate-800'
                }`}
              >
                <div>
                  <h3
                    className={`font-semibold text-xs uppercase tracking-wider mb-2 ${
                      isLight ? 'text-slate-500' : 'text-slate-400'
                    }`}
                  >
                    Filtros Gerais
                  </h3>
                </div>

                {/* Live Stats Summary Banner */}
                <div
                  className={`border p-3 rounded-xl flex items-center justify-between text-xs mb-3 shadow-xs ${
                    isLight
                      ? 'bg-amber-50/80 border-amber-200/90 text-slate-800'
                      : 'bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-amber-500/20 text-slate-100'
                  }`}
                >
                  <div>
                    <span className={`block text-[10px] uppercase font-bold ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                      Total da Base
                    </span>
                    <span className={`font-bold text-sm ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
                      {leads.length.toLocaleString()} leads
                    </span>
                  </div>
                  <div className="text-center">
                    <span className={`block text-[10px] uppercase font-bold ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                      No Filtro Atual
                    </span>
                    <span className={`font-bold text-sm ${isLight ? 'text-amber-700' : 'text-amber-400'}`}>
                      {eligibleLeadsForAudience.length.toLocaleString()} elegíveis
                    </span>
                  </div>
                  <div className="text-right">
                    <span className={`block text-[10px] uppercase font-bold ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                      Selecionados
                    </span>
                    <span className={`font-bold text-sm ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`}>
                      {selectedAudienceLeadIds.size.toLocaleString()} membros
                    </span>
                  </div>
                </div>

                {/* Nome do Público Salvo */}
                <div className="space-y-1.5">
                  <label className={`text-xs font-semibold block ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                    Nome do Público Salvo *
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Peñas LaLiga da Espanha - Lote 1"
                    className={`w-full h-9 rounded-xl border px-3 text-xs focus:outline-none transition-colors ${
                      isLight
                        ? 'border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 shadow-2xs'
                        : 'border-slate-800 bg-slate-900 text-white placeholder:text-slate-500'
                    }`}
                    value={audienceSaveName}
                    onChange={(e) => setAudienceSaveName(e.target.value)}
                  />
                </div>

                {/* Estágio (Kanban) e Origem */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className={`text-xs font-semibold ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                      Estágio (Kanban)
                    </label>
                    <select
                      value={audienceFilters.stageId}
                      onChange={(e) => setAudienceFilters({ ...audienceFilters, stageId: e.target.value })}
                      className={`w-full h-9 rounded-xl border px-3 text-xs focus:outline-none transition-colors ${
                        isLight ? 'border-slate-300 bg-white text-slate-900 shadow-2xs' : 'border-slate-800 bg-slate-900 text-white'
                      }`}
                    >
                      <option value="">Todos os Estágios</option>
                      <option value="new">Novo / Sem Contato</option>
                      <option value="contacted">E-mail Enviado</option>
                      <option value="replied">E-mail Lido / Clicado</option>
                      <option value="qualified">Teste 24h / Orçamento</option>
                      <option value="converted">Contato Via WhatsApp</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className={`text-xs font-semibold ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                      Origem
                    </label>
                    <select
                      value={audienceFilters.origin}
                      onChange={(e) => setAudienceFilters({ ...audienceFilters, origin: e.target.value })}
                      className={`w-full h-9 rounded-xl border px-3 text-xs focus:outline-none transition-colors ${
                        isLight ? 'border-slate-300 bg-white text-slate-900 shadow-2xs' : 'border-slate-800 bg-slate-900 text-white'
                      }`}
                    >
                      <option value="">Todas as Origens</option>
                      {originOptions.map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* País e Porte */}
                <div className={`space-y-3 border-t pt-3 ${isLight ? 'border-slate-200' : 'border-slate-800/80'}`}>
                  <MultiSelectCombobox
                    label="País (Multiseleção)"
                    options={dynamicCountryOptions}
                    selectedValues={audienceFilters.selectedCountries}
                    onChange={(vals) => setAudienceFilters({ ...audienceFilters, selectedCountries: vals })}
                    placeholder="Selecione países (ex: Espanha, Brasil)..."
                    isLight={isLight}
                  />

                  <MultiSelectCombobox
                    label="Porte da Empresa / Perfil (Multiseleção)"
                    options={dynamicCompanySizeOptions}
                    selectedValues={audienceFilters.selectedCompanySizes}
                    onChange={(vals) => setAudienceFilters({ ...audienceFilters, selectedCompanySizes: vals })}
                    placeholder="Selecione perfis (ex: Tier 1, Peñas)..."
                    isLight={isLight}
                  />

                  <MultiSelectCombobox
                    label="Região / Comunidade Autônoma (Multiseleção)"
                    options={dynamicRegionOptions}
                    selectedValues={audienceFilters.selectedRegions}
                    onChange={(vals) => setAudienceFilters({ ...audienceFilters, selectedRegions: vals })}
                    placeholder="Selecione regiões (ex: Madrid, Cataluña, Andalucia)..."
                    isLight={isLight}
                  />

                  <MultiSelectCombobox
                    label="Província / Cidade (Multiseleção)"
                    options={dynamicProvinceOptions}
                    selectedValues={audienceFilters.selectedProvinces}
                    onChange={(vals) => setAudienceFilters({ ...audienceFilters, selectedProvinces: vals })}
                    placeholder="Selecione cidades (ex: Madrid, Barcelona, Sevilha)..."
                    isLight={isLight}
                  />
                </div>

                {/* Setores, Nicho e Provedores */}
                <div className={`space-y-3 border-t pt-3 ${isLight ? 'border-slate-200' : 'border-slate-800/80'}`}>
                  <MultiSelectCombobox
                    label="Setores da Empresa / Nicho / Clube (Multiseleção)"
                    options={dynamicSectorOptions}
                    selectedValues={audienceFilters.selectedSectors}
                    onChange={(vals) => setAudienceFilters({ ...audienceFilters, selectedSectors: vals })}
                    placeholder="Selecione clubes ou nichos (ex: Real Madrid, Peñas)..."
                    isLight={isLight}
                  />

                  <MultiSelectCombobox
                    label="Provedores de E-mail (Multiseleção)"
                    options={dynamicProviderOptions}
                    selectedValues={audienceFilters.selectedProviders}
                    onChange={(vals) => setAudienceFilters({ ...audienceFilters, selectedProviders: vals })}
                    placeholder="Selecione provedores (Gmail, Yahoo, Corporativos)..."
                    isLight={isLight}
                  />

                  <div className="space-y-1.5">
                    <label className={`text-xs font-semibold ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                      Palavra-Chave (Busca Livre em Textos/Notas)
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: peña, torcida, bar, iptv..."
                      className={`w-full h-9 rounded-xl border px-3 text-xs focus:outline-none transition-colors ${
                        isLight
                          ? 'border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 shadow-2xs'
                          : 'border-slate-800 bg-slate-900 text-white placeholder:text-slate-500'
                      }`}
                      value={audienceFilters.sectorKeyword}
                      onChange={(e) => setAudienceFilters({ ...audienceFilters, sectorKeyword: e.target.value })}
                    />
                  </div>
                </div>

                {/* Lote: Limite e Offset */}
                <div className={`grid grid-cols-2 gap-3 border-t pt-3 ${isLight ? 'border-slate-200' : 'border-slate-800/80'}`}>
                  <div className="space-y-1.5">
                    <label className={`text-xs font-semibold ${isLight ? 'text-amber-700' : 'text-amber-400'}`}>
                      Lote: Limite Máximo
                    </label>
                    <input
                      type="number"
                      placeholder="Ex: 500"
                      className={`w-full h-9 rounded-xl border px-3 text-xs focus:outline-none transition-colors ${
                        isLight ? 'border-slate-300 bg-white text-slate-900 shadow-2xs' : 'border-slate-800 bg-slate-900 text-white'
                      }`}
                      value={audienceFilters.limit}
                      onChange={(e) => setAudienceFilters({ ...audienceFilters, limit: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className={`text-xs font-semibold ${isLight ? 'text-amber-700' : 'text-amber-400'}`}>
                      Lote: Pular (Offset)
                    </label>
                    <input
                      type="number"
                      placeholder="Ex: 0"
                      className={`w-full h-9 rounded-xl border px-3 text-xs focus:outline-none transition-colors ${
                        isLight ? 'border-slate-300 bg-white text-slate-900 shadow-2xs' : 'border-slate-800 bg-slate-900 text-white'
                      }`}
                      value={audienceFilters.offset}
                      onChange={(e) => setAudienceFilters({ ...audienceFilters, offset: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Right Column: MEMBROS DO SEGMENTO (7 cols) */}
              <div className="lg:col-span-7 flex flex-col justify-between overflow-hidden h-full pl-2">
                <div className="mb-2">
                  <h3 className={`font-semibold text-xs uppercase tracking-wider mb-2 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                    Membros do Segmento
                  </h3>
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Pesquisar por nome, empresa ou e-mail na lista..."
                      className={`w-full h-9 pl-9 pr-3 rounded-xl border text-xs focus:outline-none transition-colors ${
                        isLight
                          ? 'border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 shadow-2xs'
                          : 'border-slate-800 bg-slate-900 text-white placeholder:text-slate-500'
                      }`}
                      value={leadGridSearch}
                      onChange={(e) => {
                        setLeadGridSearch(e.target.value);
                        setGridPage(1);
                      }}
                    />
                  </div>
                </div>

                {/* Selection Action Toolbar matching screenshot */}
                <div
                  className={`flex flex-wrap justify-between items-center gap-2 border rounded-xl p-2.5 mb-2 text-xs transition-colors ${
                    isLight
                      ? 'bg-slate-50 border-slate-200 text-slate-700 shadow-2xs'
                      : 'bg-slate-900/80 border-slate-800 text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <label className={`flex items-center gap-2 cursor-pointer font-semibold select-none ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
                      <input
                        type="checkbox"
                        checked={
                          visibleLeadsForGrid.length > 0 &&
                          visibleLeadsForGrid.every((l) => selectedAudienceLeadIds.has(l.id))
                        }
                        onChange={(e) => handleToggleSelectAll(e.target.checked)}
                        className={`rounded text-yellow-500 focus:ring-yellow-500/20 h-4 w-4 cursor-pointer ${
                          isLight ? 'border-slate-300' : 'border-slate-700'
                        }`}
                      />
                      <span>Selecionar Todos do Filtro</span>
                    </label>

                    <div className={`flex items-center gap-1.5 border-l pl-3 ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
                      <button
                        type="button"
                        onClick={handleClearSelection}
                        className={`text-[11px] px-2 py-0.5 rounded font-semibold cursor-pointer transition-colors ${
                          isLight ? 'text-rose-600 hover:bg-rose-50' : 'text-rose-400 hover:bg-rose-500/10'
                        }`}
                      >
                        Desmarcar Todos (0)
                      </button>
                      <button
                        type="button"
                        onClick={handleSelectAllFiltered}
                        className={`text-[11px] px-2 py-0.5 rounded font-semibold cursor-pointer transition-colors ${
                          isLight ? 'text-amber-700 hover:bg-amber-50' : 'text-amber-400 hover:bg-amber-500/10'
                        }`}
                      >
                        Marcar Todos ({visibleLeadsForGrid.length.toLocaleString()})
                      </button>
                    </div>
                  </div>

                  <span
                    className={`font-bold px-3 py-1 rounded-full text-xs transition-all border ${
                      selectedAudienceLeadIds.size > 0
                        ? isLight
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                          : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                        : isLight
                        ? 'bg-slate-100 border-slate-200 text-slate-600'
                        : 'bg-slate-800 border-slate-700 text-slate-400'
                    }`}
                  >
                    {selectedAudienceLeadIds.size.toLocaleString()} selecionado
                    {selectedAudienceLeadIds.size === 1 ? '' : 's'}
                  </span>
                </div>

                {/* Scrollable List of Leads matching Screenshot 2 */}
                <div
                  className={`flex-1 overflow-y-auto space-y-2 border rounded-xl p-3 scrollbar-thin transition-colors ${
                    isLight ? 'border-slate-200 bg-slate-50/50' : 'border-slate-800 bg-slate-900/30'
                  }`}
                >
                  {paginatedLeads.length === 0 ? (
                    <div className={`text-center py-20 text-xs ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>
                      Nenhum lead encontrado com estes filtros.
                    </div>
                  ) : (
                    paginatedLeads.map((l) => {
                      const countryInfo = getLeadCountry(l);
                      const cleanName = l.company_name || l.name || 'Contato / Torcedor';
                      const isChecked = selectedAudienceLeadIds.has(l.id);

                      let stageBadge = 'Sem estágio';
                      if (l.status === 'new') stageBadge = 'Novo / Sem Contato';
                      else if (l.status === 'contacted') stageBadge = 'E-mail Enviado';
                      else if (l.status === 'replied') stageBadge = 'E-mail Lido / Clicado';
                      else if (l.status === 'qualified') stageBadge = 'Teste 24h / Orçamento';
                      else if (l.status === 'converted') stageBadge = 'Contato WhatsApp';

                      return (
                        <div
                          key={l.id}
                          className={`flex justify-between items-center p-2.5 rounded-lg border text-xs transition-all gap-2 ${
                            isChecked
                              ? isLight
                                ? 'bg-amber-50/50 border-amber-300/80 shadow-2xs'
                                : 'bg-slate-900 border-amber-500/40'
                              : isLight
                              ? 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
                              : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-3 truncate max-w-[380px]">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => handleToggleSelectLead(l.id, e.target.checked)}
                              className={`rounded text-yellow-500 focus:ring-yellow-500/20 h-4 w-4 cursor-pointer shrink-0 ${
                                isLight ? 'border-slate-300' : 'border-slate-700'
                              }`}
                            />
                            <div className="truncate space-y-0.5">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className={`font-bold truncate ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
                                  {cleanName}
                                </span>
                                <span
                                  className={`inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.2 rounded border ${
                                    isLight
                                      ? 'bg-slate-100 text-slate-700 border-slate-200'
                                      : 'bg-slate-800 text-slate-300 border-slate-700'
                                  }`}
                                >
                                  <span>{countryInfo.flag}</span>
                                  <span>{countryInfo.code}</span>
                                </span>
                                {l.tags && l.tags.length > 0 && (
                                  <span
                                    className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${
                                      isLight
                                        ? 'bg-yellow-50 text-yellow-800 border-yellow-200'
                                        : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                                    }`}
                                  >
                                    {l.tags[0]}
                                  </span>
                                )}
                              </div>
                              <p className={`text-[10px] truncate flex items-center gap-1 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                                <Mail className="h-3 w-3 text-slate-400 shrink-0" />
                                <span className={`font-medium truncate ${isLight ? 'text-blue-600' : 'text-blue-400'}`}>
                                  {l.email}
                                </span>
                              </p>
                            </div>
                          </div>

                          <div className="text-right shrink-0 space-y-0.5">
                            <span
                              className={`px-2 py-0.5 rounded text-[9px] border font-medium ${
                                isLight
                                  ? 'bg-slate-100 text-slate-600 border-slate-200'
                                  : 'bg-slate-800 text-slate-300 border-slate-700'
                              }`}
                            >
                              {stageBadge}
                            </span>
                            {(l.city || l.province) && (
                              <p
                                className={`text-[9px] font-medium flex items-center justify-end gap-1 ${
                                  isLight ? 'text-emerald-700' : 'text-emerald-400'
                                }`}
                              >
                                <MapPin className="h-2.5 w-2.5 shrink-0" />
                                <span>{[l.city, l.province].filter(Boolean).join(' • ')}</span>
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Paginação */}
                {totalPages > 1 && (
                  <div
                    className={`flex justify-between items-center mt-3 border-t pt-2.5 ${
                      isLight ? 'border-slate-200 text-slate-600' : 'border-slate-800 text-slate-400'
                    }`}
                  >
                    <button
                      type="button"
                      disabled={gridPage === 1}
                      onClick={() => setGridPage((p) => Math.max(1, p - 1))}
                      className={`h-8 px-3 text-xs rounded-xl border font-semibold flex items-center gap-1 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                        isLight
                          ? 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50 shadow-2xs'
                          : 'border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                      <span>Anterior</span>
                    </button>
                    <span className={`text-[11px] font-medium ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                      Página {gridPage} de {totalPages}
                    </span>
                    <button
                      type="button"
                      disabled={gridPage === totalPages}
                      onClick={() => setGridPage((p) => Math.min(totalPages, p + 1))}
                      className={`h-8 px-3 text-xs rounded-xl border font-semibold flex items-center gap-1 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                        isLight
                          ? 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50 shadow-2xs'
                          : 'border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <span>Próxima</span>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div
              className={`pt-3 border-t flex items-center justify-end gap-3 shrink-0 ${
                isLight ? 'border-slate-200' : 'border-slate-800'
              }`}
            >
              <button
                type="button"
                onClick={() => setIsNewAudienceDialogOpen(false)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
                  isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-white'
                }`}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleCreateNewAudiencePreset}
                disabled={selectedAudienceLeadIds.size === 0 || !audienceSaveName.trim()}
                className="px-6 py-2.5 rounded-xl bg-yellow-500 hover:bg-yellow-400 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 text-xs font-bold shadow-md shadow-yellow-500/20 cursor-pointer transition-all"
              >
                Criar Público Salvo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: VISUALIZAR LEADS DO PÚBLICO (Membros do Segmento) */}
      {/* ========================================================================= */}
      {viewLeadsAudience && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div
            className={`w-full max-w-2xl max-h-[85vh] flex flex-col justify-between p-6 rounded-2xl shadow-2xl border ${
              isLight ? 'border-slate-200 bg-white text-slate-900' : 'border-zinc-800 bg-slate-950 text-white'
            }`}
          >
            <div
              className={`border-b pb-3 flex items-center justify-between shrink-0 ${
                isLight ? 'border-slate-200' : 'border-slate-800'
              }`}
            >
              <div>
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-yellow-500" />
                  <h3 className={`font-bold text-base ${isLight ? 'text-slate-900' : 'text-white'}`}>
                    Membros do Público: {viewLeadsAudience.name}
                  </h3>
                </div>
                <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                  Total de {viewAudienceLeadsList.length.toLocaleString()} leads neste público
                </p>
              </div>
              <button
                onClick={() => setViewLeadsAudience(null)}
                className={`p-1 rounded-lg cursor-pointer transition-colors ${
                  isLight ? 'text-slate-400 hover:text-slate-700' : 'text-slate-400 hover:text-white'
                }`}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="py-3 shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Pesquisar nos leads deste público..."
                  value={viewLeadsSearch}
                  onChange={(e) => {
                    setViewLeadsSearch(e.target.value);
                    setViewLeadsPage(1);
                  }}
                  className={`w-full h-9 pl-9 pr-3 rounded-xl border text-xs focus:outline-none transition-colors ${
                    isLight
                      ? 'border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 shadow-2xs'
                      : 'border-slate-800 bg-slate-900 text-white placeholder:text-slate-500'
                  }`}
                />
              </div>
            </div>

            {/* Scrollable list */}
            <div
              className={`flex-1 overflow-y-auto space-y-2 border rounded-xl p-3 scrollbar-thin max-h-96 transition-colors ${
                isLight ? 'border-slate-200 bg-slate-50/50' : 'border-slate-800 bg-slate-900/40'
              }`}
            >
              {viewAudienceLeadsList.length === 0 ? (
                <div className={`text-center py-12 text-xs ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>
                  Nenhum lead encontrado.
                </div>
              ) : (
                viewAudienceLeadsList.slice((viewLeadsPage - 1) * 30, viewLeadsPage * 30).map((l) => (
                  <div
                    key={l.id}
                    className={`flex justify-between items-center p-2.5 rounded-lg border text-xs transition-colors ${
                      isLight ? 'border-slate-200 bg-white text-slate-800 shadow-2xs' : 'border-slate-800 bg-slate-900 text-white'
                    }`}
                  >
                    <div>
                      <div className={`font-bold ${isLight ? 'text-slate-900' : 'text-slate-200'}`}>
                        {l.name || l.company_name}
                      </div>
                      <div className={`text-[10px] ${isLight ? 'text-blue-600 font-medium' : 'text-blue-400'}`}>
                        {l.email}
                      </div>
                    </div>
                    <div className="text-right">
                      <span
                        className={`px-2 py-0.5 rounded text-[9px] border ${
                          isLight
                            ? 'bg-slate-100 text-slate-600 border-slate-200'
                            : 'bg-slate-800 text-slate-400 border-slate-700'
                        }`}
                      >
                        {l.city || l.country || 'Espanha'}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div
              className={`pt-3 border-t flex items-center justify-between shrink-0 ${
                isLight ? 'border-slate-200' : 'border-slate-800'
              }`}
            >
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setViewLeadsAudience(null)}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
                    isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Fechar
                </button>
                {onNavigateToLeads && (
                  <button
                    type="button"
                    onClick={() => {
                      setViewLeadsAudience(null);
                      onNavigateToLeads();
                    }}
                    className={`px-4 py-2 rounded-xl border text-xs font-semibold cursor-pointer transition-colors ${
                      isLight
                        ? 'border-slate-300 bg-white hover:bg-slate-50 text-slate-700 shadow-2xs'
                        : 'border-slate-700 hover:bg-slate-800 text-slate-300'
                    }`}
                  >
                    Ver na Base de Leads CRM
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  const targetAudId = viewLeadsAudience.id;
                  setViewLeadsAudience(null);
                  handleOpenWizard(targetAudId);
                }}
                className="px-5 py-2 rounded-xl bg-yellow-500 hover:bg-yellow-400 text-slate-950 text-xs font-bold shadow-md cursor-pointer transition-all"
              >
                Disparar Campanha para Este Público
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: WIZARD NOVA CAMPANHA (4 Passos) */}
      {/* ========================================================================= */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div
            className={`w-full max-w-3xl rounded-2xl border p-6 shadow-2xl space-y-6 ${
              isLight ? 'border-slate-200 bg-white' : 'border-zinc-800 bg-zinc-900 text-white'
            }`}
          >
            {/* Header */}
            <div className={`flex items-center justify-between border-b pb-4 ${isLight ? 'border-slate-200' : 'border-zinc-800'}`}>
              <div>
                <h3 className={`font-bold text-base ${isLight ? 'text-slate-900' : 'text-white'}`}>Criar Nova Campanha de Disparo</h3>
                <span className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Passo {wizardStep} de 4</span>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className={`cursor-pointer ${isLight ? 'text-slate-400 hover:text-slate-700' : 'text-slate-400 hover:text-white'}`}
              >
                ✕
              </button>
            </div>

            {/* Step 1: Remetente & Detalhes */}
            {wizardStep === 1 && (
              <div className="space-y-4 text-xs">
                <div>
                  <label className={`block mb-1 font-semibold ${isLight ? 'text-slate-700' : 'text-slate-400'}`}>Título Interno da Campanha</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Ex: Disparo Espanha - Peñas LaLiga Madrid"
                    className={`w-full rounded-xl border px-3 py-2 text-xs focus:outline-none ${
                      isLight ? 'border-slate-300 bg-white text-slate-900 placeholder:text-slate-400' : 'border-zinc-800 bg-zinc-950 text-white placeholder:text-zinc-500'
                    }`}
                  />
                </div>

                <div>
                  <label className={`block mb-1 font-semibold ${isLight ? 'text-slate-700' : 'text-slate-400'}`}>Assunto do E-mail</label>
                  <input
                    type="text"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    placeholder="Ex: ⚽ Todos os canais em 4K (Teste 24 Horas Grátis)"
                    className={`w-full rounded-xl border px-3 py-2 text-xs focus:outline-none ${
                      isLight ? 'border-slate-300 bg-white text-slate-900 placeholder:text-slate-400' : 'border-zinc-800 bg-zinc-950 text-white placeholder:text-zinc-500'
                    }`}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={`block mb-1 font-semibold ${isLight ? 'text-slate-700' : 'text-slate-400'}`}>Identidade do Remetente (Verificado Resend)</label>
                    <select
                      value={formData.sender_email}
                      onChange={(e) => {
                        const s = VERIFIED_SENDERS.find((item) => item.email === e.target.value);
                        setFormData({
                          ...formData,
                          sender_email: e.target.value,
                          sender_name: s ? s.name : formData.sender_name,
                          reply_to: s ? s.reply_to : formData.reply_to,
                        });
                      }}
                      className={`w-full rounded-xl border px-3 py-2 text-xs focus:outline-none ${
                        isLight ? 'border-slate-300 bg-white text-slate-900' : 'border-zinc-800 bg-zinc-950 text-white'
                      }`}
                    >
                      {VERIFIED_SENDERS.map((s) => (
                        <option key={s.id} value={s.email}>
                          {s.flag} {s.name} &lt;{s.email}&gt;
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className={`block mb-1 font-semibold ${isLight ? 'text-slate-700' : 'text-slate-400'}`}>E-mail de Resposta (Reply-To)</label>
                    <input
                      type="text"
                      value={formData.reply_to}
                      onChange={(e) => setFormData({ ...formData, reply_to: e.target.value })}
                      className={`w-full rounded-xl border px-3 py-2 text-xs focus:outline-none ${
                        isLight ? 'border-slate-300 bg-white text-slate-900' : 'border-zinc-800 bg-zinc-950 text-white'
                      }`}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Seleção de Template */}
            {wizardStep === 2 && (
              <div className="space-y-4 text-xs">
                <label className={`block mb-1 font-semibold ${isLight ? 'text-slate-700' : 'text-slate-400'}`}>Selecione o Template HTML</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-72 overflow-y-auto pr-1">
                  {templates.map((tmpl) => (
                    <div
                      key={tmpl.id}
                      onClick={() => setFormData({ ...formData, template_id: tmpl.id, subject: tmpl.subject })}
                      className={`p-4 rounded-xl border cursor-pointer transition-all ${
                        formData.template_id === tmpl.id
                          ? 'border-yellow-500 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 shadow-md ring-2 ring-yellow-500/30'
                          : isLight
                          ? 'border-slate-200 bg-slate-50 hover:bg-slate-100/80 text-slate-800'
                          : 'border-slate-800 hover:border-slate-700 bg-zinc-950/60 text-slate-200'
                      }`}
                    >
                      <div className={`font-bold text-xs ${isLight ? 'text-slate-900' : 'text-white'}`}>{tmpl.title}</div>
                      <div className={`text-[11px] truncate mt-1 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>{tmpl.subject}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Step 3: Público-Alvo */}
            {wizardStep === 3 && (
              <div className="space-y-4 text-xs">
                <div>
                  <label className={`block mb-1 font-semibold ${isLight ? 'text-slate-700' : 'text-slate-400'}`}>Segmento ou Público Salvo</label>
                  <select
                    value={formData.target_audience_id}
                    onChange={(e) => handleAudienceChange(e.target.value)}
                    className={`w-full rounded-xl border px-3 py-2 text-xs focus:outline-none ${
                      isLight ? 'border-slate-300 bg-white text-slate-900' : 'border-zinc-800 bg-zinc-950 text-white'
                    }`}
                  >
                    <option value="all">🌍 Toda a Base Ativa (Apenas MX Válidos)</option>
                    {audiences.map((aud) => (
                      <option key={aud.id} value={aud.id}>
                        🎯 {aud.name} ({aud.lead_count ? aud.lead_count.toLocaleString() : (aud.lead_ids?.length || 0).toLocaleString()} leads)
                      </option>
                    ))}
                  </select>
                </div>

                <div className={`p-4 rounded-xl border ${isLight ? 'border-yellow-300 bg-yellow-50 text-yellow-900' : 'border-yellow-500/20 bg-yellow-500/5 text-yellow-400'} flex items-center justify-between`}>
                  <div className="flex items-center gap-3">
                    <Sparkles className="h-5 w-5 text-yellow-500" />
                    <div>
                      <div className={`font-bold text-xs ${isLight ? 'text-yellow-800' : 'text-yellow-400'}`}>
                        {selectedLeadIds.length.toLocaleString()} Leads Selecionados
                      </div>
                      <div className={`text-[11px] ${isLight ? 'text-yellow-700/80' : 'text-slate-400'}`}>
                        Prontos para receber o e-mail via motor Resend
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Revisão & Agendamento */}
            {wizardStep === 4 && (
              <div className="space-y-4 text-xs">
                <div className={`rounded-xl border p-4 space-y-3 ${isLight ? 'border-slate-200 bg-slate-50' : 'border-slate-800 bg-zinc-950'}`}>
                  <div className={`flex justify-between border-b pb-2 ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
                    <span className={isLight ? 'text-slate-600' : 'text-slate-400'}>Campanha:</span>
                    <span className={`font-bold ${isLight ? 'text-slate-900' : 'text-slate-200'}`}>{formData.title}</span>
                  </div>
                  <div className={`flex justify-between border-b pb-2 ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
                    <span className={isLight ? 'text-slate-600' : 'text-slate-400'}>Assunto:</span>
                    <span className={`font-semibold ${isLight ? 'text-slate-900' : 'text-slate-200'}`}>{formData.subject}</span>
                  </div>
                  <div className={`flex justify-between border-b pb-2 ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
                    <span className={isLight ? 'text-slate-600' : 'text-slate-400'}>Remetente:</span>
                    <span className={isLight ? 'text-slate-800' : 'text-slate-200'}>
                      {formData.sender_name} &lt;{formData.sender_email}&gt;
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className={isLight ? 'text-slate-600' : 'text-slate-400'}>Total de Destinatários:</span>
                    <span className="font-bold text-emerald-500">
                      {selectedLeadIds.length.toLocaleString()} leads
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="launch_now_check"
                    checked={formData.launch_now}
                    onChange={(e) => setFormData({ ...formData, launch_now: e.target.checked })}
                    className="rounded border-slate-400 text-yellow-500 focus:ring-yellow-500"
                  />
                  <label htmlFor="launch_now_check" className={`font-semibold cursor-pointer ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
                    Iniciar envio imediatamente após confirmação
                  </label>
                </div>
              </div>
            )}

            {/* Wizard Navigation */}
            <div className={`flex items-center justify-between border-t pt-4 ${isLight ? 'border-slate-200' : 'border-zinc-800'}`}>
              <button
                type="button"
                onClick={() => {
                  if (wizardStep > 1) setWizardStep((prev) => (prev - 1) as any);
                  else setIsCreateModalOpen(false);
                }}
                className={`px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer ${
                  isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {wizardStep === 1 ? 'Cancelar' : 'Voltar'}
              </button>

              {wizardStep < 4 ? (
                <button
                  type="button"
                  onClick={() => setWizardStep((prev) => (prev + 1) as any)}
                  className="px-5 py-2 rounded-xl bg-yellow-500 hover:bg-yellow-400 text-slate-950 text-xs font-bold shadow-md cursor-pointer"
                >
                  Próximo Passo →
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleCreateAndLaunch}
                  className="px-6 py-2 rounded-xl bg-gradient-to-r from-yellow-500 to-amber-500 hover:opacity-95 text-slate-950 text-xs font-extrabold shadow-lg cursor-pointer"
                >
                  Confirmar & Iniciar Campanha
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: CRIAR / EDITAR TEMPLATE */}
      {/* ========================================================================= */}
      {isTemplateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div
            className={`w-full max-w-2xl rounded-2xl border p-6 shadow-2xl space-y-4 ${
              isLight ? 'border-slate-200 bg-white' : 'border-zinc-800 bg-zinc-900'
            }`}
          >
            <div className={`flex items-center justify-between border-b pb-3 ${isLight ? 'border-slate-200' : 'border-zinc-800'}`}>
              <h3 className={`font-bold text-sm ${isLight ? 'text-slate-900' : 'text-white'}`}>
                {editingTemplate ? 'Editar Template HTML' : 'Criar Novo Template HTML'}
              </h3>
              <button
                onClick={() => setIsTemplateModalOpen(false)}
                className={`cursor-pointer ${isLight ? 'text-slate-400 hover:text-slate-700' : 'text-slate-400 hover:text-slate-200'}`}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveTemplate} className="space-y-3 text-xs">
              <div>
                <label className={`block mb-1 font-semibold ${isLight ? 'text-slate-700' : 'text-slate-400'}`}>Título do Template</label>
                <input
                  type="text"
                  required
                  value={templateFormData.title}
                  onChange={(e) => setTemplateFormData({ ...templateFormData, title: e.target.value })}
                  placeholder="Ex: Oferta Especial 4K LaLiga"
                  className={`w-full rounded-xl border px-3 py-2 text-xs focus:outline-none ${
                    isLight ? 'border-slate-300 bg-white text-slate-900' : 'border-zinc-800 bg-zinc-950 text-white'
                  }`}
                />
              </div>

              <div>
                <label className={`block mb-1 font-semibold ${isLight ? 'text-slate-700' : 'text-slate-400'}`}>Assunto Padrão</label>
                <input
                  type="text"
                  required
                  value={templateFormData.subject}
                  onChange={(e) => setTemplateFormData({ ...templateFormData, subject: e.target.value })}
                  placeholder="Ex: ⚽ Todos os jogos em 4K (Teste 24 Horas Grátis)"
                  className={`w-full rounded-xl border px-3 py-2 text-xs focus:outline-none ${
                    isLight ? 'border-slate-300 bg-white text-slate-900' : 'border-zinc-800 bg-zinc-950 text-white'
                  }`}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className={`font-semibold ${isLight ? 'text-slate-700' : 'text-slate-400'}`}>Código HTML do E-mail</label>
                  <span className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>
                    Tags: &#123;&#123;nome&#125;&#125;, &#123;&#123;cidade&#125;&#125;, &#123;&#123;whatsapp_link&#125;&#125;
                  </span>
                </div>
                <textarea
                  rows={8}
                  required
                  value={templateFormData.html_content}
                  onChange={(e) => setTemplateFormData({ ...templateFormData, html_content: e.target.value })}
                  className={`w-full rounded-xl border p-3 font-mono text-[11px] focus:outline-none ${
                    isLight ? 'border-slate-300 bg-white text-slate-900' : 'border-zinc-800 bg-zinc-950 text-white'
                  }`}
                />
              </div>

              <div className={`pt-3 border-t flex items-center justify-end gap-2 ${isLight ? 'border-slate-200' : 'border-zinc-800'}`}>
                <button
                  type="button"
                  onClick={() => setIsTemplateModalOpen(false)}
                  className={`px-4 py-2 rounded-xl cursor-pointer ${isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-bold cursor-pointer"
                >
                  Salvar Template
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: PREVIEW DE TEMPLATE */}
      {/* ========================================================================= */}
      {/* ========================================================================= */}
      {/* MODAL 5: PREVIEW DE TEMPLATE COM TOGGLE DESKTOP / CELULAR */}
      {/* ========================================================================= */}
      {previewingTemplate && (() => {
        const renderedHtml = previewingTemplate.html_content
          .replace(/\{\{nome\}\}/g, 'Alejandro Martínez')
          .replace(/\{\{cidade\}\}/g, 'Madrid')
          .replace(/\{\{link_descadastro\}\}/g, '#optout');

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div
              className={`w-full ${
                previewDeviceMode === 'mobile' ? 'max-w-xl' : 'max-w-3xl'
              } rounded-2xl border p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col transition-all duration-300 ${
                isLight ? 'border-slate-200 bg-white text-slate-900' : 'border-zinc-800 bg-zinc-900 text-white'
              }`}
            >
              {/* Header do Preview com Alternador Mobile / Desktop */}
              <div className={`flex flex-wrap items-center justify-between gap-3 border-b pb-3 shrink-0 ${isLight ? 'border-slate-200' : 'border-zinc-800'}`}>
                <div className="min-w-0 flex-1">
                  <h3 className={`font-bold text-sm truncate ${isLight ? 'text-slate-900' : 'text-white'}`}>
                    {previewingTemplate.title}
                  </h3>
                  <span className={`text-xs truncate block ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                    Assunto: {previewingTemplate.subject}
                  </span>
                </div>

                {/* Seletor Desktop / Celular */}
                <div className="flex items-center gap-3">
                  <div className={`flex items-center p-1 rounded-xl border ${isLight ? 'bg-slate-100 border-slate-200' : 'bg-zinc-800/80 border-zinc-700'}`}>
                    <button
                      type="button"
                      onClick={() => setPreviewDeviceMode('desktop')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        previewDeviceMode === 'desktop'
                          ? 'bg-yellow-500 text-slate-950 shadow-sm'
                          : isLight
                          ? 'text-slate-600 hover:text-slate-900'
                          : 'text-slate-400 hover:text-white'
                      }`}
                      title="Visualização em Computador (Desktop)"
                    >
                      <Monitor className="h-3.5 w-3.5" />
                      <span>Desktop</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewDeviceMode('mobile')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        previewDeviceMode === 'mobile'
                          ? 'bg-yellow-500 text-slate-950 shadow-sm'
                          : isLight
                          ? 'text-slate-600 hover:text-slate-900'
                          : 'text-slate-400 hover:text-white'
                      }`}
                      title="Visualização em Celular / Smartphone"
                    >
                      <Smartphone className="h-3.5 w-3.5" />
                      <span>Celular</span>
                    </button>
                  </div>

                  <button
                    onClick={() => setPreviewingTemplate(null)}
                    className={`p-1.5 rounded-lg border text-sm font-bold transition-colors cursor-pointer ${
                      isLight
                        ? 'border-slate-200 text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                        : 'border-zinc-800 text-slate-400 hover:text-white hover:bg-zinc-800'
                    }`}
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Área de Visualização do E-mail */}
              <div
                className={`flex-1 overflow-y-auto p-4 rounded-xl border flex justify-center ${
                  isLight ? 'border-slate-200 bg-slate-100/70' : 'border-zinc-800 bg-zinc-950'
                }`}
              >
                {previewDeviceMode === 'mobile' ? (
                  /* Mockup de Celular (Smartphone Frame) */
                  <div className="w-[370px] max-w-full rounded-[38px] border-[8px] border-slate-900 shadow-2xl overflow-hidden bg-slate-900 my-auto flex flex-col">
                    {/* Notch do aparelho */}
                    <div className="h-6 bg-slate-900 flex items-center justify-center shrink-0">
                      <div className="w-16 h-3 bg-slate-950 rounded-full flex items-center justify-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-800"></div>
                        <div className="w-2 h-2 rounded-full bg-blue-900/60"></div>
                      </div>
                    </div>

                    {/* Tela do celular com o e-mail responsivo */}
                    <div className="bg-white overflow-y-auto max-h-[520px] px-1 py-1">
                      <div dangerouslySetInnerHTML={{ __html: renderedHtml }} />
                    </div>

                    {/* Barra inferior de navegação do celular */}
                    <div className="h-5 bg-slate-900 flex items-center justify-center shrink-0">
                      <div className="w-24 h-1 bg-slate-700 rounded-full"></div>
                    </div>
                  </div>
                ) : (
                  /* Layout Desktop com largura natural de e-mail */
                  <div className="w-full max-w-[620px] bg-white rounded-xl shadow-md overflow-hidden my-auto">
                    <div dangerouslySetInnerHTML={{ __html: renderedHtml }} />
                  </div>
                )}
              </div>

              <div className="shrink-0 pt-2 flex items-center justify-between">
                <span className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                  {previewDeviceMode === 'mobile'
                    ? '📱 Visualizando layout adaptado para telas de celular (max 600px).'
                    : '💻 Visualizando layout para clientes de e-mail em computador.'}
                </span>
                <button
                  onClick={() => setPreviewingTemplate(null)}
                  className="px-4 py-2 rounded-xl bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-bold text-xs cursor-pointer"
                >
                  Fechar Prévia
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ========================================================================= */}
      {/* MODAL 6: DISPARAR TESTE DOS 8 TEMPLATES (CONTATOS DE VALIDAÇÃO) */}
      {/* ========================================================================= */}
      {isTestModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
          <div
            className={`w-full max-w-3xl rounded-2xl border p-6 shadow-2xl space-y-5 my-auto max-h-[92vh] flex flex-col ${
              isLight ? 'border-slate-200 bg-white text-slate-900' : 'border-zinc-800 bg-zinc-900 text-white'
            }`}
          >
            {/* Modal Header */}
            <div className={`flex items-start justify-between border-b pb-4 shrink-0 ${isLight ? 'border-slate-200' : 'border-zinc-800'}`}>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-amber-500/15 text-amber-500 flex items-center justify-center font-bold text-lg">
                  🧪
                </div>
                <div>
                  <h3 className={`font-bold text-base ${isLight ? 'text-slate-900' : 'text-white'}`}>
                    Teste de Entregabilidade dos 8 Templates
                  </h3>
                  <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                    Valide o recebimento em Caixa de Entrada (Gmail e Domínios Corporativos) e os links exclusivos do WhatsApp.
                  </p>
                </div>
              </div>
              <button
                disabled={isExecutingTest}
                onClick={() => setIsTestModalOpen(false)}
                className={`p-1.5 rounded-lg border text-sm font-bold transition-colors cursor-pointer disabled:opacity-40 ${
                  isLight
                    ? 'border-slate-200 text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                    : 'border-zinc-800 text-slate-400 hover:text-white hover:bg-zinc-800'
                }`}
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="space-y-4 overflow-y-auto pr-1 flex-1">
              {/* Opções de Envio */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {/* Remetente */}
                <div>
                  <label className={`block text-xs font-semibold mb-1.5 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                    Remetente do Disparo:
                  </label>
                  <select
                    disabled={isExecutingTest}
                    value={testSenderId}
                    onChange={(e) => setTestSenderId(e.target.value)}
                    className={`w-full rounded-xl border px-3 py-2 text-xs font-medium focus:outline-none ${
                      isLight
                        ? 'border-slate-300 bg-white text-slate-900 focus:border-amber-500'
                        : 'border-zinc-700 bg-zinc-800 text-white focus:border-amber-500'
                    }`}
                  >
                    {VERIFIED_SENDERS.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.flag} {s.name} ({s.email})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Modo de Teste */}
                <div>
                  <label className={`block text-xs font-semibold mb-1.5 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                    Estratégia de Distribuição:
                  </label>
                  <select
                    disabled={isExecutingTest}
                    value={testMode}
                    onChange={(e) => setTestMode(e.target.value as any)}
                    className={`w-full rounded-xl border px-3 py-2 text-xs font-medium focus:outline-none ${
                      isLight
                        ? 'border-slate-300 bg-white text-slate-900 focus:border-amber-500'
                        : 'border-zinc-700 bg-zinc-800 text-white focus:border-amber-500'
                    }`}
                  >
                    <option value="distribute_8">🎯 Distribuir 8 Templates (1 para cada e-mail)</option>
                    <option value="single_template">📄 Enviar 1 Template Escolhido para os 8 e-mails</option>
                    <option value="all_to_all">🚀 Bateria Completa (Todos os 8 Templates para os 8 e-mails)</option>
                  </select>
                </div>
              </div>

              {/* Seletor se escolheu Template Único */}
              {testMode === 'single_template' && (
                <div className="pt-1">
                  <label className={`block text-xs font-semibold mb-1.5 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                    Escolha o Template para Testar nos 8 e-mails:
                  </label>
                  <select
                    disabled={isExecutingTest}
                    value={testSelectedTemplateId || templates[0]?.id}
                    onChange={(e) => setTestSelectedTemplateId(e.target.value)}
                    className={`w-full rounded-xl border px-3 py-2 text-xs font-medium focus:outline-none ${
                      isLight
                        ? 'border-slate-300 bg-white text-slate-900 focus:border-amber-500'
                        : 'border-zinc-700 bg-zinc-800 text-white focus:border-amber-500'
                    }`}
                  >
                    {templates.map((t, idx) => (
                      <option key={t.id} value={t.id}>
                        T{idx + 1}: {t.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Tabela dos 8 Destinatários de Homologação */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-bold ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
                    Destinatários de Validação Monitorados (8 Contatos):
                  </span>
                  <span className="text-[11px] text-amber-500 font-semibold">
                    {testMode === 'all_to_all' ? '64 disparos totais' : '8 disparos no lote'}
                  </span>
                </div>

                <div
                  className={`rounded-xl border overflow-hidden text-xs ${
                    isLight ? 'border-slate-200 bg-slate-50' : 'border-zinc-800 bg-zinc-950/60'
                  }`}
                >
                  <div className="max-h-48 overflow-y-auto divide-y divide-zinc-800/20">
                    {VALIDATION_TEST_EMAILS_DATA.map((lead, idx) => {
                      const assignedTemplate =
                        testMode === 'single_template'
                          ? templates.find((t) => t.id === testSelectedTemplateId) || templates[0]
                          : testMode === 'distribute_8'
                          ? templates[idx % templates.length]
                          : null;

                      return (
                        <div key={lead.email} className="px-3 py-2 flex items-center justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold truncate">{lead.name}</span>
                              <span
                                className={`text-[10px] px-1.5 py-0.2 rounded font-mono font-medium ${
                                  lead.email.includes('@gmail.com')
                                    ? 'bg-red-500/10 text-red-500 border border-red-500/20'
                                    : 'bg-blue-500/10 text-blue-500 border border-blue-500/20'
                                }`}
                              >
                                {lead.email.includes('@gmail.com') ? 'Gmail' : 'Domínio'}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-400 truncate">{lead.email}</div>
                          </div>

                          <div className="text-right shrink-0">
                            {assignedTemplate ? (
                              <span className="inline-block text-[10px] px-2 py-0.5 rounded-lg bg-yellow-500/10 text-yellow-500 font-medium max-w-[220px] truncate border border-yellow-500/20">
                                T{templates.indexOf(assignedTemplate) + 1}: {assignedTemplate.category || 'Geral'}
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-400">Todos os 8 Templates</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Status e Logs de Execução em Tempo Real */}
              {testLogs.length > 0 && (
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-bold ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
                      Progresso dos Disparos em Tempo Real:
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {testLogs.filter((l) => l.status === 'success').length} de {testLogs.length} enviados
                    </span>
                  </div>

                  <div
                    className={`rounded-xl border p-2.5 max-h-44 overflow-y-auto space-y-1.5 font-mono text-[11px] ${
                      isLight ? 'bg-slate-100 border-slate-200 text-slate-800' : 'bg-black/60 border-zinc-800 text-zinc-300'
                    }`}
                  >
                    {testLogs.map((log, idx) => (
                      <div key={idx} className="flex items-center justify-between gap-2 py-0.5 border-b border-white/5 last:border-0">
                        <div className="truncate flex-1">
                          <span className="text-slate-400">[{idx + 1}]</span> <strong>{log.email}</strong> - <span className="text-slate-400 truncate">{log.templateTitle}</span>
                        </div>
                        <div className="shrink-0 font-bold">
                          {log.status === 'pending' && <span className="text-slate-400">⏳ Aguardando</span>}
                          {log.status === 'sending' && <span className="text-amber-500 animate-pulse">📤 Enviando...</span>}
                          {log.status === 'success' && <span className="text-emerald-500">✅ Enviado</span>}
                          {log.status === 'error' && <span className="text-rose-500" title={log.error}>❌ Falhou</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className={`flex items-center justify-between border-t pt-4 shrink-0 ${isLight ? 'border-slate-200' : 'border-zinc-800'}`}>
              <div className="text-[11px] text-slate-400">
                {tenant.resend_api_key && tenant.resend_api_key.length > 10 ? (
                  <span className="text-emerald-500 font-medium">● Resend API Conectada</span>
                ) : (
                  <span className="text-amber-500 font-medium">● Modo Simulação (Insira API Key em Configurações para envio real)</span>
                )}
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  disabled={isExecutingTest}
                  onClick={() => setIsTestModalOpen(false)}
                  className={`px-4 py-2 rounded-xl border text-xs font-semibold cursor-pointer disabled:opacity-50 ${
                    isLight ? 'border-slate-200 hover:bg-slate-100 text-slate-700' : 'border-zinc-800 hover:bg-zinc-800 text-slate-300'
                  }`}
                >
                  {testLogs.length > 0 && !isExecutingTest ? 'Concluir' : 'Cancelar'}
                </button>

                <button
                  type="button"
                  disabled={isExecutingTest}
                  onClick={handleExecuteTestCampaign}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-yellow-500 hover:bg-yellow-400 text-slate-950 text-xs font-bold shadow-md shadow-yellow-500/20 cursor-pointer disabled:opacity-50"
                >
                  {isExecutingTest ? (
                    <>
                      <div className="h-3.5 w-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                      <span>Disparando E-mails...</span>
                    </>
                  ) : (
                    <>
                      <Send className="h-3.5 w-3.5" />
                      <span>Iniciar Disparo de Teste</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
