import React, { useState } from 'react';
import {
  Sparkles,
  Search,
  MapPin,
  Building2,
  CheckCircle,
  XCircle,
  Download,
  Trash2,
  ShieldCheck,
  Mail,
  UserCheck,
  RefreshCw,
  Layers,
  Flame,
  Target,
  Play,
  Pause,
  MessageCircle,
  Copy,
  Check,
  ExternalLink,
  FileText,
  Share2,
  Zap,
  Radio,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useApp } from '../../shared/context/AppContext';
import { searchB2BLeadsWithAI, deduplicateProspects } from '../../shared/services/geminiService';
import type { LeadProspectingJob, LeadProspectingMission, LeadProspectingResult, DorkTargetJob } from '../../types';
import { verifyEmailDns } from '../../shared/services/dnsService';
import confetti from 'canvas-confetti';

export const ProspectingView: React.FC = () => {
  const {
    tenant,
    leads,
    missions,
    runMission,
    isAutoMissionsActive,
    activeAutoRegion,
    autoBatchesCount,
    startAutoMissions,
    stopAutoMissions,
    dorkQueue,
    runDorkTarget,
    isAutoDorkingActive,
    startAutoDorking,
    stopAutoDorking,
    prospectingResults,
    addProspectingJob,
    updateProspectingResultStatus,
    importProspectsToLeads,
    importAllValidProspects,
    clearStaging,
    theme,
  } = useApp();

  const isLight = theme === 'light';

  // Active view mode
  const [activeMode, setActiveMode] = useState<'missions' | 'dorks' | 'custom'>('missions');
  const [selectedMission, setSelectedMission] = useState<LeadProspectingMission>(missions[0]);
  const [selectedCity, setSelectedCity] = useState('Madrid');
  const [batchCount, setBatchCount] = useState(25);

  // Pagination for Staging Table
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  // Modals state
  const [isDorkModalOpen, setIsDorkModalOpen] = useState(false);
  const [isRawPasteModalOpen, setIsRawPasteModalOpen] = useState(false);

  // Dork Harvester state
  const [dorkPlatform, setDorkPlatform] = useState<'instagram' | 'facebook' | 'foros' | 'peñas' | 'twitter'>('instagram');
  const [dorkCity, setDorkCity] = useState('Madrid');
  const [dorkNiche, setDorkNiche] = useState('futbol');
  const [dorkEmailDomain, setDorkEmailDomain] = useState('@gmail.com OR @hotmail.es OR @yahoo.es');
  const [copiedDork, setCopiedDork] = useState(false);

  // Raw Paste Importer state
  const [rawTextPaste, setRawTextPaste] = useState('');
  const [pasteNicheTag, setPasteNicheTag] = useState('LaLiga Espanha');
  const [isParsingPaste, setIsParsingPaste] = useState(false);
  const [pasteProgress, setPasteProgress] = useState<{ current: number; total: number } | null>(null);

  // Custom search form state
  const [keywords, setKeywords] = useState('LaLiga aficion y futbol');
  const [location, setLocation] = useState('Madrid, Espanha');
  const [sector, setSector] = useState('Consumidor / Streaming');
  const [targetCount, setTargetCount] = useState(15);
  const [isSearching, setIsSearching] = useState(false);
  const [searchProgress, setSearchProgress] = useState<{ current: number; total: number } | null>(null);

  // Staging selection state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [filterStatus, setFilterStatus] = useState<'all' | 'raw' | 'imported' | 'valid_mx'>('raw');
  const [searchTerm, setSearchTerm] = useState('');
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  const existingEmails = new Set(leads.map((l) => l.email.toLowerCase().trim()));

  // Global Goal calculation (Goal: 200,000 leads)
  const totalVerifiedGoal = 200000;
  const validMxProspectsCount = prospectingResults.filter((r) => r.mx_status === 'valid' && r.status !== 'imported').length;
  const currentTotalCaptured = leads.length + prospectingResults.filter((r) => r.mx_status === 'valid').length;
  const globalProgressPercent = Math.min(100, Math.max(1, ((currentTotalCaptured / totalVerifiedGoal) * 100)));

  // Gerador dinâmico de Dorks para Google
  const generateDorkQuery = () => {
    let siteFilter = 'site:instagram.com';
    let queryKeywords = `"${dorkCity}" "futbol" OR "laliga"`;

    if (dorkPlatform === 'instagram') {
      siteFilter = 'site:instagram.com';
      queryKeywords = `"${dorkCity}" ("${dorkNiche}")`;
    } else if (dorkPlatform === 'facebook') {
      siteFilter = 'site:facebook.com/groups OR site:facebook.com';
      queryKeywords = `"${dorkCity}" ("${dorkNiche}" OR "españa")`;
    } else if (dorkPlatform === 'foros') {
      siteFilter = 'site:forocoches.com OR site:mundoplus.tv OR site:avforos.com';
      queryKeywords = `("${dorkNiche}" OR "dazn" OR "movistar" OR "futbol")`;
    } else if (dorkPlatform === 'peñas') {
      siteFilter = '("peña madridista" OR "peña barcelonista" OR "peña atletico")';
      queryKeywords = `"${dorkCity}" ("contacto" OR "email" OR "correo")`;
    } else if (dorkPlatform === 'twitter') {
      siteFilter = 'site:x.com OR site:twitter.com';
      queryKeywords = `"${dorkCity}" ("${dorkNiche}")`;
    }

    return `${siteFilter} (${dorkEmailDomain}) ${queryKeywords}`;
  };

  const currentDorkQuery = generateDorkQuery();

  const handleCopyDork = () => {
    navigator.clipboard.writeText(currentDorkQuery);
    setCopiedDork(true);
    setTimeout(() => setCopiedDork(false), 2000);
  };

  const handleOpenGoogleDork = () => {
    const url = `https://www.google.com/search?q=${encodeURIComponent(currentDorkQuery)}`;
    window.open(url, '_blank');
  };

  // Parser & Auditor de Texto Colado (Raw Web Scrape)
  const handleProcessRawPaste = async () => {
    if (!rawTextPaste.trim()) return;

    setIsParsingPaste(true);
    setPasteProgress({ current: 0, total: 1 });

    const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/gi;
    const phoneRegex = /(\+34\s?[67]\d{2}\s?\d{2}\s?\d{2}\s?\d{2}|[67]\d{8})/g;

    const matchedEmails = Array.from(new Set(rawTextPaste.match(emailRegex) || []));

    if (matchedEmails.length === 0) {
      setIsParsingPaste(false);
      setNotification({ type: 'error', message: 'Nenhum e-mail válido foi encontrado no texto colado.' });
      return;
    }

    const matchedPhones = Array.from(new Set(rawTextPaste.match(phoneRegex) || []));
    setPasteProgress({ current: 0, total: matchedEmails.length });

    const newResults: LeadProspectingResult[] = [];
    const jobId = `job_paste_${Date.now()}`;

    for (let i = 0; i < matchedEmails.length; i++) {
      const email = matchedEmails[i].toLowerCase().trim();
      setPasteProgress({ current: i + 1, total: matchedEmails.length });

      if (existingEmails.has(email)) continue;

      const dnsResult = await verifyEmailDns(email);
      const namePart = email.split('@')[0].replace(/[._-]/g, ' ');
      const formattedName = namePart.charAt(0).toUpperCase() + namePart.slice(1);
      const phone = matchedPhones[i] || '';

      newResults.push({
        id: `pres_paste_${Date.now()}_${i}`,
        job_id: jobId,
        tenant_id: tenant.id,
        company_name: `Lead Raspado (${pasteNicheTag})`,
        contact_name: formattedName || 'Consumidor Espanha',
        role: 'Consumidor B2C / TV Streaming',
        email,
        phone: phone ? `+34 ${phone.replace('+34', '').trim()}` : undefined,
        website: '',
        source_url: 'https://google.com/search?q=social_scrape_es',
        address: 'Espanha',
        city: 'Espanha',
        province: 'Espanha',
        country: 'Espanha',
        sector: 'Streaming & Esportes B2C',
        company_size: 'B2C (Consumidor)',
        confidence_score: dnsResult.hasMx ? 95 : 30,
        mx_status: dnsResult.hasMx ? 'valid' : 'invalid',
        mx_host: dnsResult.mxRecords[0] || 'Provedor DNS',
        domain_active: dnsResult.hasARecord || dnsResult.hasMx,
        status: 'raw',
        raw_reasoning: `Importado e auditado via raspador direto (${pasteNicheTag}).`,
        target_niche: 'custom_b2c',
        created_at: new Date().toISOString(),
      });
    }

    const uniqueResults = deduplicateProspects(newResults, existingEmails);

    const completedJob: LeadProspectingJob = {
      id: jobId,
      tenant_id: tenant.id,
      title: `Raspagem Direta: ${pasteNicheTag} (${uniqueResults.length} leads)`,
      keywords: pasteNicheTag,
      location: 'Espanha',
      target_count: matchedEmails.length,
      processed_count: matchedEmails.length,
      found_emails_count: uniqueResults.length,
      status: 'completed',
      created_at: new Date().toISOString(),
    };

    await addProspectingJob(completedJob, uniqueResults);

    setIsParsingPaste(false);
    setPasteProgress(null);
    setIsRawPasteModalOpen(false);
    setRawTextPaste('');

    try {
      confetti({ particleCount: 70, spread: 80, origin: { y: 0.6 } });
    } catch {}

    setNotification({
      type: 'success',
      message: `Extração concluída! ${uniqueResults.length} e-mails reais foram extraídos e auditados via DoH MX.`,
    });

    const validIds = uniqueResults.filter((r) => r.mx_status === 'valid').map((r) => r.id);
    setSelectedIds(validIds);
  };

  // Executar Alvo Individual de Dork Automático
  const handleExecuteSingleDork = async (target: DorkTargetJob) => {
    setIsSearching(true);
    setSearchProgress({ current: 0, total: 15 });
    setNotification(null);

    try {
      const count = await runDorkTarget(target.id, (current, total) => {
        setSearchProgress({ current, total });
      });

      try {
        confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
      } catch {}

      setNotification({
        type: 'success',
        message: `Dork "${target.title}" processado! ${count} novos leads reais foram capturados com links de comprovação.`,
      });
    } catch (e: any) {
      setNotification({
        type: 'error',
        message: `Falha ao executar Dork: ${e.message || 'Erro inesperado'}`,
      });
    } finally {
      setIsSearching(false);
      setSearchProgress(null);
    }
  };

  // Executar Todas as 5 Missões Simultâneas (1 Lote)
  const handleExecuteAllMissions = async () => {
    setIsSearching(true);
    setSearchProgress({ current: 0, total: missions.length * 15 });
    setNotification(null);

    let totalAdded = 0;
    for (let i = 0; i < missions.length; i++) {
      const m = missions[i];
      setSearchProgress({ current: (i + 1) * 15, total: missions.length * 15 });
      const added = await runMission(m.id, `${selectedCity}, Espanha`, 15);
      totalAdded += added;
    }

    setIsSearching(false);
    setSearchProgress(null);

    try {
      confetti({ particleCount: 90, spread: 100, origin: { y: 0.6 } });
    } catch {}

    setNotification({
      type: 'success',
      message: `Execução Completa Concluída! As 5 missões geraram ${totalAdded} novos leads auditados no Staging.`,
    });
  };

  // Executar Missão Individual
  const handleExecuteMission = async (mission: LeadProspectingMission) => {
    setIsSearching(true);
    setSearchProgress({ current: 0, total: batchCount });
    setNotification(null);

    try {
      const added = await runMission(mission.id, `${selectedCity}, Espanha`, batchCount, (current, total) => {
        setSearchProgress({ current, total });
      });

      try {
        confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
      } catch {}

      setNotification({
        type: 'success',
        message: `Missão "${mission.title}" executada! ${added} novos leads B2C foram capturados e auditados via DNS/MX.`,
      });

      const newValid = prospectingResults
        .filter((r) => r.status === 'raw' && r.mx_status === 'valid')
        .map((r) => r.id);
      setSelectedIds(newValid);
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: `Erro na missão: ${err.message || 'Falha ao buscar leads.'}`,
      });
    } finally {
      setIsSearching(false);
      setSearchProgress(null);
    }
  };

  // Executar Busca Customizada
  const handleStartCustomSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keywords.trim() || !location.trim()) {
      setNotification({ type: 'error', message: 'Por favor, preencha as palavras-chave e localização.' });
      return;
    }

    setIsSearching(true);
    setSearchProgress({ current: 0, total: targetCount });
    setNotification(null);

    const jobId = `job_${Date.now()}`;
    const newJob: LeadProspectingJob = {
      id: jobId,
      tenant_id: tenant.id,
      title: `${keywords} em ${location}`,
      keywords,
      location,
      sector_filter: sector,
      target_count: targetCount,
      processed_count: 0,
      found_emails_count: 0,
      status: 'processing',
      created_at: new Date().toISOString(),
    };

    try {
      const results = await searchB2BLeadsWithAI(
        {
          keywords,
          location,
          sector,
          targetCount,
          apiKey: tenant.gemini_api_key,
          jobId,
          tenantId: tenant.id,
        },
        (current, total) => {
          setSearchProgress({ current, total });
        }
      );

      const uniqueResults = deduplicateProspects(results, existingEmails);

      const completedJob: LeadProspectingJob = {
        ...newJob,
        processed_count: results.length,
        found_emails_count: uniqueResults.length,
        status: 'completed',
      };

      await addProspectingJob(completedJob, uniqueResults);
      setNotification({
        type: 'success',
        message: `Busca concluída! ${uniqueResults.length} novos leads qualificados e validados via DNS/MX.`,
      });

      const validIds = uniqueResults.filter((r) => r.mx_status === 'valid').map((r) => r.id);
      setSelectedIds(validIds);
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: `Erro durante a prospecção: ${err.message || 'Falha ao buscar leads.'}`,
      });
    } finally {
      setIsSearching(false);
      setSearchProgress(null);
    }
  };

  const handleImportSelected = async () => {
    if (selectedIds.length === 0) return;

    const count = await importProspectsToLeads(selectedIds);
    try {
      confetti({
        particleCount: 70,
        spread: 80,
        origin: { y: 0.7 },
      });
    } catch {}

    setNotification({
      type: 'success',
      message: `${count} leads foram importados com sucesso para a Base Central (CRM)!`,
    });
    setSelectedIds([]);
  };

  const handleImportAllValid = async () => {
    const count = await importAllValidProspects();
    try {
      confetti({
        particleCount: 100,
        spread: 90,
        origin: { y: 0.6 },
      });
    } catch {}

    setNotification({
      type: 'success',
      message: `Sucesso! Todos os ${count} leads auditados foram transferidos para a Base Central (CRM)!`,
    });
    setSelectedIds([]);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === paginatedResults.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(paginatedResults.map((r) => r.id));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const filteredResults = prospectingResults.filter((item) => {
    if (filterStatus === 'raw' && item.status !== 'raw') return false;
    if (filterStatus === 'imported' && item.status !== 'imported') return false;
    if (filterStatus === 'valid_mx' && item.mx_status !== 'valid') return false;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matchComp = item.company_name.toLowerCase().includes(term);
      const matchContact = (item.contact_name || '').toLowerCase().includes(term);
      const matchEmail = item.email.toLowerCase().includes(term);
      const matchCity = (item.city || '').toLowerCase().includes(term);
      return matchComp || matchContact || matchEmail || matchCity;
    }
    return true;
  });

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredResults.length / itemsPerPage));
  const paginatedResults = filteredResults.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="space-y-8">
      {/* Header & Goal Progress Banner */}
      <div
        className={`relative overflow-hidden rounded-2xl border p-6 backdrop-blur-sm shadow-xl transition-all ${
          isLight
            ? 'border-indigo-100 bg-gradient-to-r from-white via-indigo-50/40 to-pink-50/50'
            : 'border-zinc-800 bg-gradient-to-r from-zinc-900 via-zinc-900/90 to-purple-950/30'
        }`}
      >
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-pink-500 to-indigo-600 px-3 py-0.5 text-xs font-bold text-white uppercase tracking-wider">
                <Flame className="h-3.5 w-3.5" />
                Motor B2C Espanha • Meta 200.000 Leads
              </span>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-semibold border ${
                  isLight ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                }`}
              >
                Oferta 24H: 9.50€/mês | 70€/ano
              </span>
            </div>
            <h1 className={`text-2xl sm:text-3xl font-bold tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
              Centro de Missões & Extrator de Leads Reais
            </h1>
            <p className={`text-xs sm:text-sm max-w-2xl ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
              Dois motores simultâneos: <strong>Missões Grounded com Google Search</strong> e <strong>Motor Automático de Dorks Sociais</strong> com rotação automática por províncias da Espanha.
            </p>
          </div>

          {/* Action Tools & Goal Progress Card */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Quick Action Modals Triggers */}
            <div className="flex flex-col gap-2">
              <button
                onClick={() => setIsDorkModalOpen(true)}
                className={`flex items-center justify-center gap-2 rounded-xl border p-2.5 text-xs font-bold transition-all cursor-pointer ${
                  isLight
                    ? 'border-indigo-200 bg-white text-indigo-600 hover:bg-indigo-50 shadow-xs'
                    : 'border-indigo-500/40 bg-zinc-900 text-indigo-400 hover:bg-zinc-800 shadow-xs'
                }`}
              >
                <Share2 className="h-4 w-4 text-pink-500" />
                <span>Gerador de Dorks do Google</span>
              </button>

              <button
                onClick={() => setIsRawPasteModalOpen(true)}
                className={`flex items-center justify-center gap-2 rounded-xl border p-2.5 text-xs font-bold transition-all cursor-pointer ${
                  isLight
                    ? 'border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-50 shadow-xs'
                    : 'border-emerald-500/40 bg-zinc-900 text-emerald-400 hover:bg-zinc-800 shadow-xs'
                }`}
              >
                <FileText className="h-4 w-4 text-emerald-500" />
                <span>Colar Texto / Raspagem Direta</span>
              </button>
            </div>

            {/* Progress Card */}
            <div
              className={`rounded-xl border p-4 min-w-[240px] space-y-2 ${
                isLight ? 'border-slate-200 bg-white/90 shadow-xs' : 'border-zinc-800 bg-zinc-950/80'
              }`}
            >
              <div className="flex items-center justify-between text-xs">
                <span className={`font-semibold flex items-center gap-1.5 ${isLight ? 'text-slate-700' : 'text-zinc-300'}`}>
                  <Target className="h-4 w-4 text-pink-500" />
                  Meta 200k Leads
                </span>
                <span className="font-bold text-indigo-500">{currentTotalCaptured.toLocaleString()} / 200.000</span>
              </div>
              <div className={`h-2.5 w-full overflow-hidden rounded-full ${isLight ? 'bg-slate-100' : 'bg-zinc-800'}`}>
                <div
                  className="h-full bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 rounded-full transition-all duration-500"
                  style={{ width: `${Math.max(2, globalProgressPercent)}%` }}
                />
              </div>
              <div className={`flex items-center justify-between text-[10px] ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                <span>CRM: {leads.length}</span>
                <span>Staging: {prospectingResults.length}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* LIVE AUTO-PILOT RUNNING STATUS STRIP */}
      {isAutoMissionsActive && (
        <div
          className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl p-4 border animate-pulse ${
            isLight
              ? 'border-emerald-200 bg-emerald-50 text-emerald-900 shadow-xs'
              : 'border-emerald-500/40 bg-emerald-950/30 text-emerald-300'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="h-3 w-3 rounded-full bg-emerald-500 animate-ping" />
            <div className="text-xs">
              <span className="font-bold">🟢 Piloto Automático Ativo: </span>
              <span>
                Varrendo província de <strong className="underline">{activeAutoRegion}</strong> • Lote #{autoBatchesCount} • Total no Staging: {prospectingResults.length} leads
              </span>
            </div>
          </div>

          <button
            onClick={stopAutoMissions}
            className="self-start sm:self-auto rounded-lg bg-emerald-600 px-3 py-1 text-xs font-bold text-white hover:bg-emerald-700 cursor-pointer"
          >
            ⏸️ Pausar Piloto
          </button>
        </div>
      )}

      {/* Notification Toast */}
      {notification && (
        <div
          className={`flex items-center justify-between rounded-xl p-4 text-sm border ${
            notification.type === 'success'
              ? isLight
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-emerald-950/40 text-emerald-300 border-emerald-800/60'
              : notification.type === 'error'
              ? isLight
                ? 'bg-rose-50 text-rose-800 border-rose-200'
                : 'bg-rose-950/40 text-rose-300 border-rose-800/60'
              : isLight
              ? 'bg-slate-100 text-slate-800 border-slate-200'
              : 'bg-zinc-800/60 text-zinc-200 border-zinc-700'
          }`}
        >
          <span>{notification.message}</span>
          <button onClick={() => setNotification(null)} className="text-xs opacity-70 hover:opacity-100 cursor-pointer">
            ✕ Fechar
          </button>
        </div>
      )}

      {/* Mode Switcher & Global Triggers */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className={`flex flex-wrap rounded-xl p-1 border text-xs font-semibold ${isLight ? 'bg-slate-100 border-slate-200' : 'bg-zinc-900 border-zinc-800'}`}>
          <button
            onClick={() => setActiveMode('missions')}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 transition-all cursor-pointer ${
              activeMode === 'missions'
                ? isLight
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'bg-zinc-800 text-white shadow-xs'
                : isLight
                ? 'text-slate-600 hover:text-slate-900'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Sparkles className="h-4 w-4 text-pink-500" />
            5 Missões B2C Espanha
          </button>

          <button
            onClick={() => setActiveMode('dorks')}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 transition-all cursor-pointer ${
              activeMode === 'dorks'
                ? isLight
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'bg-zinc-800 text-white shadow-xs'
                : isLight
                ? 'text-slate-600 hover:text-slate-900'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Radio className="h-4 w-4 text-indigo-500" />
            Fila de Social Dorks Automáticos ({dorkQueue.length} Alvos)
          </button>

          <button
            onClick={() => setActiveMode('custom')}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 transition-all cursor-pointer ${
              activeMode === 'custom'
                ? isLight
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'bg-zinc-800 text-white shadow-xs'
                : isLight
                ? 'text-slate-600 hover:text-slate-900'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Search className="h-4 w-4 text-slate-500" />
            Busca Livre
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {activeMode === 'missions' && (
            <div className="flex items-center gap-2">
              <button
                onClick={isAutoMissionsActive ? stopAutoMissions : startAutoMissions}
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold text-white shadow-lg transition-all cursor-pointer ${
                  isAutoMissionsActive
                    ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-500/20'
                    : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-95 shadow-emerald-500/20'
                }`}
              >
                {isAutoMissionsActive ? (
                  <>
                    <Pause className="h-4 w-4 fill-current" />
                    <span>Pausar Piloto Contínuo</span>
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 fill-current" />
                    <span>Ligar Piloto Automático das 5 Missões</span>
                  </>
                )}
              </button>

              <button
                onClick={handleExecuteAllMissions}
                disabled={isSearching || isAutoMissionsActive}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-pink-600 px-3.5 py-2 text-xs font-bold text-white shadow-lg shadow-orange-500/20 hover:opacity-95 disabled:opacity-50 transition-all cursor-pointer"
              >
                <Zap className="h-4 w-4 fill-current" />
                <span>Executar 1 Lote das 5</span>
              </button>
            </div>
          )}

          {activeMode === 'dorks' && (
            <button
              onClick={isAutoDorkingActive ? stopAutoDorking : startAutoDorking}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold text-white shadow-lg transition-all cursor-pointer ${
                isAutoDorkingActive
                  ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-500/20'
                  : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:opacity-95 shadow-indigo-500/20'
              }`}
            >
              {isAutoDorkingActive ? (
                <>
                  <Pause className="h-4 w-4 fill-current" />
                  <span>Pausar Motor Automático</span>
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 fill-current" />
                  <span>Iniciar Piloto Automático de Dorks</span>
                </>
              )}
            </button>
          )}

          {selectedIds.length > 0 && (
            <button
              onClick={handleImportSelected}
              className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-bold text-white shadow-lg hover:bg-indigo-500 transition-all cursor-pointer"
            >
              <Download className="h-4 w-4" />
              <span>Importar ({selectedIds.length}) Selecionados</span>
            </button>
          )}

          {validMxProspectsCount > 0 && (
            <button
              onClick={handleImportAllValid}
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-3.5 py-2 text-xs font-bold text-white shadow-lg shadow-emerald-500/20 hover:opacity-95 transition-all cursor-pointer"
            >
              <Download className="h-4 w-4" />
              <span>Importar Todos ({validMxProspectsCount}) para o CRM</span>
            </button>
          )}
        </div>
      </div>

      {/* SECTION 1: 5 B2C MISSIONS CARDS */}
      {activeMode === 'missions' && (
        <div className="space-y-6">
          {/* Mission Batch Settings Bar */}
          <div
            className={`rounded-2xl border p-4 backdrop-blur-sm flex flex-wrap items-center justify-between gap-4 ${
              isLight ? 'border-slate-200 bg-white shadow-xs' : 'border-zinc-800 bg-zinc-900/60'
            }`}
          >
            <div className="flex flex-wrap items-center gap-4 text-xs">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-indigo-500" />
                <span className={`font-semibold ${isLight ? 'text-slate-700' : 'text-zinc-300'}`}>Cidade / Região Alvo:</span>
                <select
                  value={selectedCity}
                  onChange={(e) => setSelectedCity(e.target.value)}
                  className={`rounded-lg border px-3 py-1.5 text-xs focus:outline-none ${
                    isLight ? 'border-slate-300 bg-slate-50 text-slate-900' : 'border-zinc-800 bg-zinc-950 text-white'
                  }`}
                >
                  <option value="Toda Espanha">🔁 Rotação Automática de Toda Espanha</option>
                  <option value="Madrid">Madrid (Capital & Peñas)</option>
                  <option value="Barcelona">Barcelona (Cataluña)</option>
                  <option value="Valencia">Valencia (Comunidad Valenciana)</option>
                  <option value="Sevilla">Sevilla (Andalucía)</option>
                  <option value="Málaga">Málaga & Costa del Sol</option>
                  <option value="Bilbao">Bilbao (País Vasco)</option>
                  <option value="Alicante">Alicante & Região</option>
                  <option value="Zaragoza">Zaragoza (Aragón)</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className={`font-semibold ${isLight ? 'text-slate-700' : 'text-zinc-300'}`}>Volume por Lote:</span>
                <select
                  value={batchCount}
                  onChange={(e) => setBatchCount(Number(e.target.value))}
                  className={`rounded-lg border px-3 py-1.5 text-xs focus:outline-none ${
                    isLight ? 'border-slate-300 bg-slate-50 text-slate-900' : 'border-zinc-800 bg-zinc-950 text-white'
                  }`}
                >
                  <option value={10}>10 Leads / Lote</option>
                  <option value={25}>25 Leads / Lote (Recomendado)</option>
                  <option value={50}>50 Leads / Lote</option>
                  <option value={100}>100 Leads / Lote</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-emerald-500 font-semibold">
              <ShieldCheck className="h-4 w-4" />
              <span>Google Search Grounding + DoH MX Ativos</span>
            </div>
          </div>

          {/* 5 Missions Cards Grid */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {missions.map((mission) => {
              const isSelected = selectedMission.id === mission.id;
              return (
                <div
                  key={mission.id}
                  onClick={() => setSelectedMission(mission)}
                  className={`rounded-2xl border p-5 transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? isLight
                        ? 'border-indigo-400 bg-gradient-to-br from-indigo-50/80 to-purple-50/50 shadow-md ring-1 ring-indigo-200'
                        : 'border-indigo-500/60 bg-gradient-to-br from-indigo-950/30 to-zinc-900 shadow-md ring-1 ring-indigo-500/30'
                      : isLight
                      ? 'border-slate-200 bg-white hover:border-slate-300 shadow-xs'
                      : 'border-zinc-800 bg-zinc-900/60 hover:border-zinc-700'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="text-2xl">{mission.icon}</div>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold border ${
                          isLight
                            ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                            : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                        }`}
                      >
                        Meta: {mission.target_goal.toLocaleString()} leads
                      </span>
                    </div>

                    <div>
                      <h3 className={`font-bold text-sm leading-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
                        {mission.title}
                      </h3>
                      <p className={`text-xs mt-1 line-clamp-2 ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
                        {mission.description}
                      </p>
                    </div>

                    <div
                      className={`rounded-xl border p-2.5 text-[11px] space-y-1 ${
                        isLight ? 'border-slate-200 bg-slate-50 text-slate-700' : 'border-zinc-800 bg-zinc-950 text-zinc-300'
                      }`}
                    >
                      <div className="font-semibold text-indigo-500">Argumento de Alta Conversão:</div>
                      <div className="italic">{mission.pitch_highlight}</div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-zinc-800/40 flex items-center justify-between gap-2">
                    <div className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-zinc-500'}`}>
                      Capturados: <strong className={isLight ? 'text-slate-800' : 'text-zinc-200'}>{mission.captured_count.toLocaleString()}</strong>
                    </div>

                    <button
                      type="button"
                      disabled={isSearching || isAutoMissionsActive}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleExecuteMission(mission);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-pink-500 via-purple-600 to-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-md shadow-pink-500/20 hover:opacity-95 disabled:opacity-50 transition-all cursor-pointer"
                    >
                      {isSearching && selectedMission.id === mission.id ? (
                        <>
                          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                          <span>Buscando ({searchProgress?.current}/{searchProgress?.total})</span>
                        </>
                      ) : (
                        <>
                          <Play className="h-3 w-3 fill-current" />
                          <span>Executar Lote</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SECTION 2: AUTOMATED DORK QUEUE ENGINE */}
      {activeMode === 'dorks' && (
        <div className="space-y-4">
          <div
            className={`rounded-2xl border p-4 backdrop-blur-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
              isLight ? 'border-slate-200 bg-white shadow-xs' : 'border-zinc-800 bg-zinc-900/60'
            }`}
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Radio className={`h-4 w-4 ${isAutoDorkingActive ? 'text-emerald-500 animate-pulse' : 'text-indigo-500'}`} />
                <h3 className={`text-sm font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  Fila de Dorking Contínuo ({dorkQueue.length} Alvos Programados)
                </h3>
              </div>
              <p className={`text-xs ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
                {isAutoDorkingActive
                  ? '⚡ O Piloto Automático está executando as buscas no Google a cada 10 segundos e auditando MX em segundo plano.'
                  : 'Clique em "Iniciar Piloto Automático" para rodar a fila inteira ou execute alvos individuais abaixo.'}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsDorkModalOpen(true)}
                className={`rounded-xl border px-3 py-1.5 text-xs font-semibold ${
                  isLight ? 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100' : 'border-zinc-700 bg-zinc-800 text-zinc-300'
                }`}
              >
                + Gerar Novo Dork
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {dorkQueue.map((item) => (
              <div
                key={item.id}
                className={`rounded-2xl border p-4 flex flex-col justify-between transition-all ${
                  item.status === 'running'
                    ? 'border-indigo-500 bg-indigo-500/10'
                    : isLight
                    ? 'border-slate-200 bg-white shadow-xs'
                    : 'border-zinc-800 bg-zinc-900/60'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="rounded-md bg-indigo-500/10 px-2 py-0.5 text-[10px] font-bold text-indigo-500 uppercase">
                      {item.platform}
                    </span>
                    <span className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                      {item.city}
                    </span>
                  </div>

                  <h4 className={`font-bold text-xs ${isLight ? 'text-slate-900' : 'text-white'}`}>
                    {item.title}
                  </h4>

                  <div className={`p-2 rounded font-mono text-[10px] truncate ${isLight ? 'bg-slate-100 text-slate-700' : 'bg-zinc-950 text-emerald-400'}`}>
                    {item.query}
                  </div>
                </div>

                <div className="mt-3 pt-2 border-t border-zinc-800/40 flex items-center justify-between">
                  <span className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                    Capturados: <strong>{item.leads_found}</strong>
                  </span>

                  <button
                    onClick={() => handleExecuteSingleDork(item)}
                    disabled={isSearching}
                    className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 cursor-pointer"
                  >
                    <Play className="h-2.5 w-2.5 fill-current" />
                    <span>Executar</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION 3: CUSTOM SEARCH BOX */}
      {activeMode === 'custom' && (
        <div
          className={`rounded-2xl border p-6 backdrop-blur-sm shadow-xl transition-all ${
            isLight ? 'border-slate-200 bg-white' : 'border-zinc-800 bg-zinc-900/70'
          }`}
        >
          <form onSubmit={handleStartCustomSearch} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className={`block text-xs font-medium uppercase tracking-wider mb-1.5 ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
                  Palavras-chave / Ramo
                </label>
                <div className="relative">
                  <Search className={`absolute left-3 top-2.5 h-4 w-4 ${isLight ? 'text-slate-400' : 'text-zinc-500'}`} />
                  <input
                    type="text"
                    value={keywords}
                    onChange={(e) => setKeywords(e.target.value)}
                    placeholder="Ex: Clínicas, LaLiga, Expatriados"
                    className={`w-full rounded-xl border pl-9 pr-3 py-2 text-sm focus:outline-none ${
                      isLight ? 'border-slate-300 bg-slate-50 text-slate-900' : 'border-zinc-800 bg-zinc-950 text-white'
                    }`}
                    required
                  />
                </div>
              </div>

              <div>
                <label className={`block text-xs font-medium uppercase tracking-wider mb-1.5 ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
                  Localização / Cidade, Região
                </label>
                <div className="relative">
                  <MapPin className={`absolute left-3 top-2.5 h-4 w-4 ${isLight ? 'text-slate-400' : 'text-zinc-500'}`} />
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Ex: Madrid, Espanha"
                    className={`w-full rounded-xl border pl-9 pr-3 py-2 text-sm focus:outline-none ${
                      isLight ? 'border-slate-300 bg-slate-50 text-slate-900' : 'border-zinc-800 bg-zinc-950 text-white'
                    }`}
                    required
                  />
                </div>
              </div>

              <div>
                <label className={`block text-xs font-medium uppercase tracking-wider mb-1.5 ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
                  Segmento / Nicho
                </label>
                <div className="relative">
                  <Building2 className={`absolute left-3 top-2.5 h-4 w-4 ${isLight ? 'text-slate-400' : 'text-zinc-500'}`} />
                  <input
                    type="text"
                    value={sector}
                    onChange={(e) => setSector(e.target.value)}
                    className={`w-full rounded-xl border pl-9 pr-3 py-2 text-sm focus:outline-none ${
                      isLight ? 'border-slate-300 bg-slate-50 text-slate-900' : 'border-zinc-800 bg-zinc-950 text-white'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className={`block text-xs font-medium uppercase tracking-wider mb-1.5 ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
                  Quantidade
                </label>
                <select
                  value={targetCount}
                  onChange={(e) => setTargetCount(Number(e.target.value))}
                  className={`w-full rounded-xl border px-3 py-2 text-sm focus:outline-none ${
                    isLight ? 'border-slate-300 bg-slate-50 text-slate-900' : 'border-zinc-800 bg-zinc-950 text-white'
                  }`}
                >
                  <option value={10}>10 Contatos</option>
                  <option value={25}>25 Contatos</option>
                  <option value={50}>50 Contatos</option>
                </select>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={isSearching}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-2.5 text-xs font-semibold text-white shadow-lg hover:bg-indigo-500 disabled:opacity-50 transition-all cursor-pointer"
              >
                {isSearching ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                <span>Buscar Leads</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* SECTION 4: STAGING AREA (RESULTADOS COM PAGINAÇÃO & FONTE REAL) */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <h2 className={`text-lg font-bold flex items-center gap-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>
              <Layers className="h-5 w-5 text-indigo-500" />
              Área de Staging & Auditoria ({prospectingResults.length.toLocaleString()} Leads na Fila)
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {prospectingResults.length > 0 && (
              <button
                onClick={clearStaging}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer ${
                  isLight
                    ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                    : 'bg-rose-950/40 text-rose-400 hover:bg-rose-900/60 border border-rose-800/40'
                }`}
              >
                Limpar Staging
              </button>
            )}

            <div className={`flex rounded-lg p-1 border text-xs ${isLight ? 'bg-slate-100 border-slate-200' : 'bg-zinc-900 border-zinc-800'}`}>
              <button
                onClick={() => {
                  setFilterStatus('raw');
                  setCurrentPage(1);
                }}
                className={`rounded-md px-3 py-1 font-medium transition-all cursor-pointer ${
                  filterStatus === 'raw'
                    ? isLight
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'bg-zinc-800 text-white'
                    : isLight
                    ? 'text-slate-600'
                    : 'text-zinc-400'
                }`}
              >
                Novos (Pendentes)
              </button>
              <button
                onClick={() => {
                  setFilterStatus('valid_mx');
                  setCurrentPage(1);
                }}
                className={`rounded-md px-3 py-1 font-medium transition-all cursor-pointer ${
                  filterStatus === 'valid_mx'
                    ? isLight
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'bg-zinc-800 text-white'
                    : isLight
                    ? 'text-slate-600'
                    : 'text-zinc-400'
                }`}
              >
                Apenas MX Válidos
              </button>
              <button
                onClick={() => {
                  setFilterStatus('all');
                  setCurrentPage(1);
                }}
                className={`rounded-md px-3 py-1 font-medium transition-all cursor-pointer ${
                  filterStatus === 'all'
                    ? isLight
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'bg-zinc-800 text-white'
                    : isLight
                    ? 'text-slate-600'
                    : 'text-zinc-400'
                }`}
              >
                Todos
              </button>
            </div>

            <div className="relative">
              <Search className={`absolute left-2.5 top-2 h-3.5 w-3.5 ${isLight ? 'text-slate-400' : 'text-zinc-500'}`} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Filtrar por nome, email, cidade..."
                className={`rounded-lg border pl-8 pr-3 py-1 text-xs focus:outline-none ${
                  isLight ? 'border-slate-300 bg-white text-slate-900' : 'border-zinc-800 bg-zinc-900 text-white'
                }`}
              />
            </div>
          </div>
        </div>

        {/* Results Table with Smooth Pagination */}
        <div
          className={`overflow-hidden rounded-2xl border backdrop-blur-sm ${
            isLight ? 'border-slate-200 bg-white shadow-xs' : 'border-zinc-800 bg-zinc-900/60'
          }`}
        >
          {filteredResults.length === 0 ? (
            <div className="py-16 text-center">
              <Sparkles className="mx-auto h-8 w-8 text-slate-400 mb-3" />
              <h3 className={`text-sm font-semibold ${isLight ? 'text-slate-800' : 'text-zinc-300'}`}>
                Nenhum lead nesta visualização
              </h3>
              <p className={`text-xs mt-1 max-w-sm mx-auto ${isLight ? 'text-slate-500' : 'text-zinc-500'}`}>
                Ligue o <strong>"Piloto Automático"</strong> ou clique em <strong>"Executar Lote"</strong> para capturar leads auditados na Espanha.
              </p>
            </div>
          ) : (
            <div>
              <div className="overflow-x-auto">
                <table className={`w-full text-left text-xs ${isLight ? 'text-slate-700' : 'text-zinc-300'}`}>
                  <thead
                    className={`border-b text-[11px] font-semibold uppercase tracking-wider ${
                      isLight ? 'border-slate-200 bg-slate-50 text-slate-600' : 'border-zinc-800 bg-zinc-950/60 text-zinc-400'
                    }`}
                  >
                    <tr>
                      <th className="p-4 w-10">
                        <input
                          type="checkbox"
                          checked={selectedIds.length > 0 && selectedIds.length === paginatedResults.length}
                          onChange={toggleSelectAll}
                          className="rounded border-slate-300 bg-white text-indigo-600 focus:ring-0 cursor-pointer"
                        />
                      </th>
                      <th className="p-4">Consumidor / Perfil</th>
                      <th className="p-4">E-mail & Auditoria DoH MX</th>
                      <th className="p-4">Fonte / Link Real</th>
                      <th className="p-4">WhatsApp / Telefone</th>
                      <th className="p-4">Cidade / Espanha</th>
                      <th className="p-4 text-center">Score IA</th>
                      <th className="p-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${isLight ? 'divide-slate-100' : 'divide-zinc-800/60'}`}>
                    {paginatedResults.map((item) => {
                      const isSelected = selectedIds.includes(item.id);
                      return (
                        <tr
                          key={item.id}
                          className={`transition-colors ${
                            isSelected
                              ? isLight
                                ? 'bg-indigo-50/60'
                                : 'bg-indigo-950/20'
                              : isLight
                              ? 'hover:bg-slate-50'
                              : 'hover:bg-zinc-800/40'
                          }`}
                        >
                          <td className="p-4">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelectOne(item.id)}
                              className="rounded border-slate-300 bg-white text-indigo-600 focus:ring-0 cursor-pointer"
                            />
                          </td>

                          {/* Consumidor */}
                          <td className="p-4">
                            <div className={`font-semibold text-sm flex items-center gap-1.5 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                              <UserCheck className="h-4 w-4 text-indigo-500" />
                              {item.contact_name}
                            </div>
                            <div className={`text-[11px] mt-0.5 ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>{item.company_name}</div>
                          </td>

                          {/* E-mail & MX */}
                          <td className="p-4">
                            <div className={`font-mono flex items-center gap-1.5 ${isLight ? 'text-slate-800' : 'text-zinc-200'}`}>
                              <Mail className="h-3 w-3 text-slate-400" />
                              <span>{item.email}</span>
                            </div>
                            <div className="mt-1 flex items-center gap-1.5">
                              {item.mx_status === 'valid' ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-500 border border-emerald-500/20">
                                  <CheckCircle className="h-3 w-3" />
                                  MX Ativo ({item.mx_host?.slice(0, 16)}...)
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2 py-0.5 text-[10px] font-medium text-rose-500 border border-rose-500/20">
                                  <XCircle className="h-3 w-3" />
                                  Sem MX
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Link da Fonte Real */}
                          <td className="p-4">
                            {item.source_url ? (
                              <a
                                href={item.source_url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-[11px] text-indigo-500 hover:text-indigo-400 hover:underline max-w-[150px] truncate"
                                title={item.source_url}
                              >
                                <ExternalLink className="h-3 w-3 shrink-0" />
                                <span className="truncate">{item.source_url.replace('https://', '')}</span>
                              </a>
                            ) : (
                              <span className={`text-[10px] ${isLight ? 'text-slate-400' : 'text-zinc-500'}`}>Google Grounding</span>
                            )}
                          </td>

                          {/* WhatsApp / Telefone */}
                          <td className="p-4">
                            {item.phone ? (
                              <div className="flex items-center gap-1.5">
                                <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/10 px-2 py-1 text-[11px] font-semibold text-emerald-600 border border-emerald-500/20">
                                  <MessageCircle className="h-3 w-3" />
                                  {item.phone}
                                </span>
                              </div>
                            ) : (
                              <span className={`text-[11px] ${isLight ? 'text-slate-400' : 'text-zinc-500'}`}>Apenas E-mail</span>
                            )}
                          </td>

                          {/* Localização */}
                          <td className="p-4">
                            <div className={`font-medium ${isLight ? 'text-slate-800' : 'text-zinc-200'}`}>{item.city}</div>
                            <div className={`text-[10px] ${isLight ? 'text-slate-400' : 'text-zinc-500'}`}>{item.province}</div>
                          </td>

                          {/* Score */}
                          <td className="p-4 text-center">
                            <span
                              className={`inline-flex items-center justify-center rounded-full px-2 py-0.5 text-[11px] font-bold ${
                                item.confidence_score >= 85
                                ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                                : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                              }`}
                            >
                              {item.confidence_score}%
                            </span>
                          </td>

                          {/* Ações */}
                          <td className="p-4 text-right">
                            {item.status === 'imported' ? (
                              <span className={`rounded px-2 py-1 text-[10px] font-medium ${isLight ? 'bg-slate-100 text-slate-500' : 'bg-zinc-800 text-zinc-400'}`}>
                                No CRM
                              </span>
                            ) : (
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => importProspectsToLeads([item.id])}
                                  title="Importar para CRM"
                                  className="rounded-lg bg-indigo-600/15 p-1.5 text-indigo-600 hover:bg-indigo-600 hover:text-white transition-all cursor-pointer"
                                >
                                  <Download className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={() => updateProspectingResultStatus(item.id, 'discarded')}
                                  title="Descartar"
                                  className={`rounded-lg p-1.5 transition-all cursor-pointer ${
                                    isLight
                                      ? 'bg-slate-100 text-slate-500 hover:bg-rose-50 hover:text-rose-600'
                                      : 'bg-zinc-800 text-zinc-400 hover:bg-rose-950/40 hover:text-rose-400'
                                  }`}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              <div className={`p-4 border-t flex flex-col sm:flex-row items-center justify-between gap-3 text-xs ${isLight ? 'border-slate-100 text-slate-600' : 'border-zinc-800 text-zinc-400'}`}>
                <div>
                  Mostrando <strong>{(currentPage - 1) * itemsPerPage + 1}</strong> a <strong>{Math.min(currentPage * itemsPerPage, filteredResults.length)}</strong> de <strong>{filteredResults.length.toLocaleString()}</strong> leads
                </div>

                <div className="flex items-center gap-2">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className={`flex items-center gap-1 rounded-lg border px-3 py-1.5 font-semibold disabled:opacity-40 cursor-pointer ${
                      isLight ? 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700' : 'border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-zinc-200'
                    }`}
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                    <span>Anterior</span>
                  </button>

                  <span className="px-2 font-bold">
                    {currentPage} / {totalPages}
                  </span>

                  <button
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className={`flex items-center gap-1 rounded-lg border px-3 py-1.5 font-semibold disabled:opacity-40 cursor-pointer ${
                      isLight ? 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700' : 'border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-zinc-200'
                    }`}
                  >
                    <span>Próxima</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MODAL 1: EXTRATOR DE DORKS DE REDES SOCIAIS */}
      {isDorkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div
            className={`w-full max-w-2xl rounded-2xl border p-6 shadow-2xl space-y-5 ${
              isLight ? 'border-slate-200 bg-white text-slate-900' : 'border-zinc-800 bg-zinc-900 text-white'
            }`}
          >
            <div className="flex items-center justify-between border-b pb-3 border-zinc-800">
              <div className="flex items-center gap-2">
                <Share2 className="h-5 w-5 text-pink-500" />
                <h2 className="text-base font-bold">Extrator de Dorks de Redes Sociais & Fóruns Espanha</h2>
              </div>
              <button
                onClick={() => setIsDorkModalOpen(false)}
                className="text-xs opacity-60 hover:opacity-100 cursor-pointer"
              >
                ✕ Fechar
              </button>
            </div>

            <p className={`text-xs ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
              Gere consultas de alta densidade para encontrar e-mails reais indexados publicamente no Google em perfis de torcedores, cinéfilos e expatriados na Espanha.
            </p>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
              <div>
                <label className={`block text-[11px] font-semibold mb-1 ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>Plataforma Alvo</label>
                <select
                  value={dorkPlatform}
                  onChange={(e) => setDorkPlatform(e.target.value as any)}
                  className={`w-full rounded-xl border px-3 py-2 text-xs focus:outline-none ${
                    isLight ? 'border-slate-300 bg-slate-50 text-slate-900' : 'border-zinc-800 bg-zinc-950 text-white'
                  }`}
                >
                  <option value="instagram">Instagram Espanha</option>
                  <option value="facebook">Grupos Facebook ES</option>
                  <option value="foros">ForoCoches & Foros TV</option>
                  <option value="peñas">Diretórios Peñas Futebol</option>
                  <option value="twitter">X / Twitter Espanha</option>
                </select>
              </div>

              <div>
                <label className={`block text-[11px] font-semibold mb-1 ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>Cidade / Região</label>
                <select
                  value={dorkCity}
                  onChange={(e) => setDorkCity(e.target.value)}
                  className={`w-full rounded-xl border px-3 py-2 text-xs focus:outline-none ${
                    isLight ? 'border-slate-300 bg-slate-50 text-slate-900' : 'border-zinc-800 bg-zinc-950 text-white'
                  }`}
                >
                  <option value="Madrid">Madrid</option>
                  <option value="Barcelona">Barcelona</option>
                  <option value="Valencia">Valencia</option>
                  <option value="Sevilla">Sevilla</option>
                  <option value="Málaga">Málaga</option>
                  <option value="Bilbao">Bilbao</option>
                  <option value="Alicante">Alicante</option>
                  <option value="España">Toda España</option>
                </select>
              </div>

              <div>
                <label className={`block text-[11px] font-semibold mb-1 ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>Interesse / Nicho</label>
                <select
                  value={dorkNiche}
                  onChange={(e) => setDorkNiche(e.target.value)}
                  className={`w-full rounded-xl border px-3 py-2 text-xs focus:outline-none ${
                    isLight ? 'border-slate-300 bg-slate-50 text-slate-900' : 'border-zinc-800 bg-zinc-950 text-white'
                  }`}
                >
                  <option value="futbol OR laliga">Futebol & LaLiga</option>
                  <option value="cine OR series OR peliculas">Cine, Séries & 4K</option>
                  <option value="brasileiros OR brasil">Brasileiros na Espanha</option>
                  <option value="argentinos OR colombianos">Latinos na Espanha</option>
                  <option value="f1 OR motogp OR dazn">F1, MotoGP & DAZN</option>
                </select>
              </div>

              <div>
                <label className={`block text-[11px] font-semibold mb-1 ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>Provedores de E-mail</label>
                <select
                  value={dorkEmailDomain}
                  onChange={(e) => setDorkEmailDomain(e.target.value)}
                  className={`w-full rounded-xl border px-3 py-2 text-xs focus:outline-none ${
                    isLight ? 'border-slate-300 bg-slate-50 text-slate-900' : 'border-zinc-800 bg-zinc-950 text-white'
                  }`}
                >
                  <option value="@gmail.com OR @hotmail.es OR @yahoo.es">Todos os Principais ES</option>
                  <option value="@gmail.com">Apenas @gmail.com</option>
                  <option value="@hotmail.es OR @outlook.es">Apenas Hotmail / Outlook ES</option>
                  <option value="@yahoo.es">Apenas @yahoo.es</option>
                </select>
              </div>
            </div>

            {/* Generated Dork Display */}
            <div
              className={`rounded-xl border p-3 font-mono text-xs space-y-2 ${
                isLight ? 'border-slate-300 bg-slate-50 text-slate-800' : 'border-zinc-800 bg-zinc-950 text-emerald-400'
              }`}
            >
              <div className="flex items-center justify-between text-[10px] text-slate-500">
                <span>Comando de Dorking Gerado:</span>
                <span>Copie e cole no Google ou clique abaixo</span>
              </div>
              <div className="p-2 rounded bg-black/10 break-all select-all font-semibold">{currentDorkQuery}</div>
            </div>

            <div className={`flex flex-wrap items-center justify-between gap-3 pt-2 border-t ${isLight ? 'border-slate-200' : 'border-zinc-800'}`}>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyDork}
                  className={`inline-flex items-center gap-1.5 rounded-xl border px-4 py-2 text-xs font-semibold cursor-pointer ${
                    isLight ? 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50' : 'border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                  }`}
                >
                  {copiedDork ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                  <span>{copiedDork ? 'Dork Copiado!' : 'Copiar Dork'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleOpenGoogleDork}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-pink-500 to-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-md hover:opacity-95 cursor-pointer"
                >
                  <ExternalLink className="h-4 w-4" />
                  <span>Abrir Busca no Google</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  setIsDorkModalOpen(false);
                  setIsRawPasteModalOpen(true);
                }}
                className="text-xs font-semibold text-indigo-500 hover:underline cursor-pointer"
              >
                Colar Resultados Aqui ➔
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: RASPAGEM DIRETA / COLAR TEXTO */}
      {isRawPasteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div
            className={`w-full max-w-2xl rounded-2xl border p-6 shadow-2xl space-y-4 ${
              isLight ? 'border-slate-200 bg-white text-slate-900' : 'border-zinc-800 bg-zinc-900 text-white'
            }`}
          >
            <div className="flex items-center justify-between border-b pb-3 border-zinc-800">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-emerald-500" />
                <h2 className="text-base font-bold">Importador & Auditor de Raspagens Reais (Colar Texto / HTML)</h2>
              </div>
              <button
                onClick={() => setIsRawPasteModalOpen(false)}
                className="text-xs opacity-60 hover:opacity-100 cursor-pointer"
              >
                ✕ Fechar
              </button>
            </div>

            <p className={`text-xs ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
              Cole qualquer texto, código HTML, bios do Instagram, tópicos de fóruns ou postagens de grupos. O sistema extrai automaticamente todos os <strong>e-mails</strong> e <strong>telefones espanhóis</strong> e executa a <strong>auditoria DoH MX</strong> em tempo real!
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={`block text-[11px] font-semibold mb-1 ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>Identificação / Tag do Lote</label>
                <input
                  type="text"
                  value={pasteNicheTag}
                  onChange={(e) => setPasteNicheTag(e.target.value)}
                  placeholder="Ex: Peñas Madrid, Fórum LaLiga, Instagram Expat"
                  className={`w-full rounded-xl border px-3 py-2 text-xs focus:outline-none ${
                    isLight ? 'border-slate-300 bg-slate-50 text-slate-900' : 'border-zinc-800 bg-zinc-950 text-white'
                  }`}
                />
              </div>

              <div>
                <label className={`block text-[11px] font-semibold mb-1 ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>Auditoria Automática</label>
                <div className="flex items-center gap-1.5 text-xs text-emerald-500 font-semibold pt-2">
                  <ShieldCheck className="h-4 w-4" />
                  <span>Google & Cloudflare DoH Ativo</span>
                </div>
              </div>
            </div>

            <div>
              <label className={`block text-[11px] font-semibold mb-1 ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
                Cole o Conteúdo Bruto / Lista de Contatos:
              </label>
              <textarea
                rows={8}
                value={rawTextPaste}
                onChange={(e) => setRawTextPaste(e.target.value)}
                placeholder="Exemplo de conteúdo para colar:
Alejandro martinez.real@gmail.com +34 612 34 56 78 Madrid
Contacto peña: penamadridista@hotmail.es
Mateo BCN mateo.cine4k@yahoo.es"
                className={`w-full rounded-xl border p-3 font-mono text-xs focus:outline-none leading-relaxed ${
                  isLight ? 'border-slate-300 bg-slate-50 text-slate-900' : 'border-zinc-800 bg-zinc-950 text-white'
                }`}
              />
            </div>

            <div className={`flex items-center justify-between pt-2 border-t ${isLight ? 'border-slate-200' : 'border-zinc-800'}`}>
              <button
                type="button"
                onClick={() => setIsRawPasteModalOpen(false)}
                className={`rounded-xl border px-4 py-2 text-xs font-semibold cursor-pointer ${
                  isLight ? 'border-slate-300 bg-white text-slate-700' : 'border-zinc-700 bg-zinc-800 text-zinc-300'
                }`}
              >
                Cancelar
              </button>

              <button
                type="button"
                disabled={!rawTextPaste.trim() || isParsingPaste}
                onClick={handleProcessRawPaste}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-2 text-xs font-semibold text-white shadow-lg disabled:opacity-50 cursor-pointer"
              >
                {isParsingPaste ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    <span>Auditando ({pasteProgress?.current}/{pasteProgress?.total})</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="h-4 w-4" />
                    <span>Extrair & Auditar MX</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
