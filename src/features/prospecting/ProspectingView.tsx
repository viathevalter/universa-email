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
  MessageCircle,
} from 'lucide-react';
import { useApp } from '../../shared/context/AppContext';
import { searchB2BLeadsWithAI, deduplicateProspects } from '../../shared/services/geminiService';
import type { LeadProspectingJob, LeadProspectingMission } from '../../types';
import confetti from 'canvas-confetti';

export const ProspectingView: React.FC = () => {
  const {
    tenant,
    leads,
    missions,
    runMission,
    prospectingResults,
    addProspectingJob,
    updateProspectingResultStatus,
    importProspectsToLeads,
    theme,
  } = useApp();

  const isLight = theme === 'light';

  // Mode: B2C Missions vs Custom Search
  const [activeMode, setActiveMode] = useState<'missions' | 'custom'>('missions');
  const [selectedMission, setSelectedMission] = useState<LeadProspectingMission>(missions[0]);
  const [selectedCity, setSelectedCity] = useState('Madrid');
  const [batchCount, setBatchCount] = useState(25);

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
  const currentTotalCaptured = leads.length + prospectingResults.filter((r) => r.mx_status === 'valid').length;
  const globalProgressPercent = Math.min(100, Math.max(1, ((currentTotalCaptured / totalVerifiedGoal) * 100)));

  // Executar Missão B2C com 1 clique
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
        message: `Missão "${mission.title}" executada com sucesso! ${added} novos leads B2C foram auditados via DNS/MX.`,
      });

      // Auto seleciona válidos recém-chegados
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

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredResults.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredResults.map((r) => r.id));
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
            <div className="flex items-center gap-2">
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
              Centro de Missões de Prospecção B2C
            </h1>
            <p className={`text-xs sm:text-sm max-w-2xl ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
              Captação massiva e auditada de consumidores na Espanha interessados em futebol, cinema 4K e canais internacionais para ativação do teste grátis de 24 horas.
            </p>
          </div>

          {/* Goal Progress Card */}
          <div
            className={`rounded-xl border p-4 min-w-[280px] space-y-2 ${
              isLight ? 'border-slate-200 bg-white/90 shadow-xs' : 'border-zinc-800 bg-zinc-950/80'
            }`}
          >
            <div className="flex items-center justify-between text-xs">
              <span className={`font-semibold flex items-center gap-1.5 ${isLight ? 'text-slate-700' : 'text-zinc-300'}`}>
                <Target className="h-4 w-4 text-pink-500" />
                Progresso para 200k Leads
              </span>
              <span className="font-bold text-indigo-500">{currentTotalCaptured.toLocaleString()} / 200.000</span>
            </div>
            <div className={`h-2.5 w-full overflow-hidden rounded-full ${isLight ? 'bg-slate-100' : 'bg-zinc-800'}`}>
              <div
                className="h-full bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 rounded-full transition-all duration-500"
                style={{ width: `${Math.max(2, globalProgressPercent)}%` }}
              />
            </div>
            <div className={`flex items-center justify-between text-[11px] ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
              <span>No CRM: {leads.length}</span>
              <span>No Staging: {prospectingResults.length}</span>
            </div>
          </div>
        </div>
      </div>

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

      {/* Mode Switcher Tabs */}
      <div className="flex items-center justify-between">
        <div className={`flex rounded-xl p-1 border text-xs font-semibold ${isLight ? 'bg-slate-100 border-slate-200' : 'bg-zinc-900 border-zinc-800'}`}>
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
            5 Missões B2C Espanha (Streaming & Esportes)
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
            <Search className="h-4 w-4 text-indigo-500" />
            Busca Personalizada Livre
          </button>
        </div>

        {selectedIds.length > 0 && (
          <button
            onClick={handleImportSelected}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-emerald-500/20 hover:opacity-95 transition-all cursor-pointer"
          >
            <Download className="h-4 w-4" />
            <span>Importar {selectedIds.length} Selecionados para o CRM</span>
          </button>
        )}
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
                  <option value="Toda Espanha">Toda Espanha (Nacional)</option>
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
                <span className={`font-semibold ${isLight ? 'text-slate-700' : 'text-zinc-300'}`}>Volume por Disparo:</span>
                <select
                  value={batchCount}
                  onChange={(e) => setBatchCount(Number(e.target.value))}
                  className={`rounded-lg border px-3 py-1.5 text-xs focus:outline-none ${
                    isLight ? 'border-slate-300 bg-slate-50 text-slate-900' : 'border-zinc-800 bg-zinc-950 text-white'
                  }`}
                >
                  <option value={10}>10 Leads / Extração</option>
                  <option value={25}>25 Leads / Extração (Recomendado)</option>
                  <option value={50}>50 Leads / Extração</option>
                  <option value={100}>100 Leads / Extração (Lote Alto)</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-emerald-500 font-semibold">
              <ShieldCheck className="h-4 w-4" />
              <span>Validação DoH MX Ativa em Tempo Real</span>
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
                      Capturados: <strong className={isLight ? 'text-slate-800' : 'text-zinc-200'}>{mission.captured_count}</strong>
                    </div>

                    <button
                      type="button"
                      disabled={isSearching}
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
                          <span>Executar Missão</span>
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

      {/* SECTION 2: CUSTOM SEARCH BOX */}
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

      {/* SECTION 3: STAGING AREA (RESULTADOS AUDITADOS) */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <h2 className={`text-lg font-bold flex items-center gap-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>
              <Layers className="h-5 w-5 text-indigo-500" />
              Área de Staging & Auditoria ({prospectingResults.length} Leads na Fila)
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className={`flex rounded-lg p-1 border text-xs ${isLight ? 'bg-slate-100 border-slate-200' : 'bg-zinc-900 border-zinc-800'}`}>
              <button
                onClick={() => setFilterStatus('raw')}
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
                onClick={() => setFilterStatus('valid_mx')}
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
                onClick={() => setFilterStatus('all')}
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
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Filtrar por nome, email, cidade..."
                className={`rounded-lg border pl-8 pr-3 py-1 text-xs focus:outline-none ${
                  isLight ? 'border-slate-300 bg-white text-slate-900' : 'border-zinc-800 bg-zinc-900 text-white'
                }`}
              />
            </div>
          </div>
        </div>

        {/* Results Table */}
        <div
          className={`overflow-hidden rounded-2xl border backdrop-blur-sm ${
            isLight ? 'border-slate-200 bg-white shadow-xs' : 'border-zinc-800 bg-zinc-900/60'
          }`}
        >
          {filteredResults.length === 0 ? (
            <div className="py-16 text-center">
              <Sparkles className="mx-auto h-8 w-8 text-slate-400 mb-3" />
              <h3 className={`text-sm font-semibold ${isLight ? 'text-slate-800' : 'text-zinc-300'}`}>
                Nenhum lead na área de staging
              </h3>
              <p className={`text-xs mt-1 max-w-sm mx-auto ${isLight ? 'text-slate-500' : 'text-zinc-500'}`}>
                Clique em <strong>"Executar Missão"</strong> em um dos cards acima para capturar e auditar um novo lote de contatos.
              </p>
            </div>
          ) : (
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
                        checked={selectedIds.length > 0 && selectedIds.length === filteredResults.length}
                        onChange={toggleSelectAll}
                        className="rounded border-slate-300 bg-white text-indigo-600 focus:ring-0 cursor-pointer"
                      />
                    </th>
                    <th className="p-4">Consumidor / Perfil</th>
                    <th className="p-4">E-mail & Auditoria DoH MX</th>
                    <th className="p-4">WhatsApp / Telefone</th>
                    <th className="p-4">Cidade / Espanha</th>
                    <th className="p-4 text-center">Score IA</th>
                    <th className="p-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isLight ? 'divide-slate-100' : 'divide-zinc-800/60'}`}>
                  {filteredResults.map((item) => {
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
          )}
        </div>
      </div>
    </div>
  );
};
