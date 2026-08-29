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
  Globe,
  Phone,
  Mail,
  UserCheck,
  RefreshCw,
  Layers,
} from 'lucide-react';
import { useApp } from '../../shared/context/AppContext';
import { searchB2BLeadsWithAI, deduplicateProspects } from '../../shared/services/geminiService';
import type { LeadProspectingJob } from '../../types';
import confetti from 'canvas-confetti';

export const ProspectingView: React.FC = () => {
  const {
    tenant,
    leads,
    prospectingResults,
    addProspectingJob,
    updateProspectingResultStatus,
    importProspectsToLeads,
    theme,
  } = useApp();

  const isLight = theme === 'light';

  // Search form state
  const [keywords, setKeywords] = useState('Indústria e Distribuição');
  const [location, setLocation] = useState('São Paulo, SP');
  const [sector, setSector] = useState('Manufatura & B2B');
  const [targetCount, setTargetCount] = useState(8);
  const [isSearching, setIsSearching] = useState(false);
  const [searchProgress, setSearchProgress] = useState<{ current: number; total: number } | null>(null);

  // Staging selection state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [filterStatus, setFilterStatus] = useState<'all' | 'raw' | 'imported' | 'valid_mx'>('raw');
  const [searchTerm, setSearchTerm] = useState('');
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  const existingEmails = new Set(leads.map((l) => l.email.toLowerCase().trim()));

  const handleStartSearch = async (e: React.FormEvent) => {
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

      // Deduplica com a base existente
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

      // Auto seleciona os novos leads válidos
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
        particleCount: 60,
        spread: 70,
        origin: { y: 0.7 },
      });
    } catch {
      // Ignora se canvas não estiver disponível
    }

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

  // Filtered results in staging
  const filteredResults = prospectingResults.filter((item) => {
    if (filterStatus === 'raw' && item.status !== 'raw') return false;
    if (filterStatus === 'imported' && item.status !== 'imported') return false;
    if (filterStatus === 'valid_mx' && item.mx_status !== 'valid') return false;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matchComp = item.company_name.toLowerCase().includes(term);
      const matchContact = (item.contact_name || '').toLowerCase().includes(term);
      const matchEmail = item.email.toLowerCase().includes(term);
      const matchSector = (item.sector || '').toLowerCase().includes(term);
      return matchComp || matchContact || matchEmail || matchSector;
    }
    return true;
  });

  return (
    <div className="space-y-8">
      {/* Header & Description */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className={`text-2xl font-bold tracking-tight flex items-center gap-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>
              <Sparkles className="h-6 w-6 text-pink-500" />
              AI Lead Machine & Motor de Prospecção
            </h1>
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-semibold border ${
                isLight ? 'bg-pink-50 text-pink-700 border-pink-200' : 'bg-pink-500/10 text-pink-400 border-pink-500/20'
              }`}
            >
              Grounded Search + DNS DoH
            </span>
          </div>
          <p className={`text-sm mt-1 ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
            Descubra tomadores de decisão e empresas B2B por nicho e região com validação de MX em tempo real.
          </p>
        </div>

        {selectedIds.length > 0 && (
          <button
            onClick={handleImportSelected}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 hover:opacity-95 transition-all cursor-pointer"
          >
            <Download className="h-4 w-4" />
            <span>Importar {selectedIds.length} Selecionados para o CRM</span>
          </button>
        )}
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

      {/* Search Engine Form Box */}
      <div
        className={`rounded-2xl border p-6 backdrop-blur-sm shadow-xl transition-all ${
          isLight ? 'border-slate-200 bg-white' : 'border-zinc-800 bg-zinc-900/70'
        }`}
      >
        <form onSubmit={handleStartSearch} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Palavras-chave */}
            <div>
              <label className={`block text-xs font-medium uppercase tracking-wider mb-1.5 ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
                Palavras-chave / Ramo de Atividade
              </label>
              <div className="relative">
                <Search className={`absolute left-3 top-2.5 h-4 w-4 ${isLight ? 'text-slate-400' : 'text-zinc-500'}`} />
                <input
                  type="text"
                  value={keywords}
                  onChange={(e) => setKeywords(e.target.value)}
                  placeholder="Ex: Clínicas Médicas, Metalurgia, Logística"
                  className={`w-full rounded-xl border pl-9 pr-3 py-2 text-sm focus:border-indigo-500 focus:outline-none ${
                    isLight
                      ? 'border-slate-300 bg-slate-50 text-slate-900 placeholder-slate-400'
                      : 'border-zinc-800 bg-zinc-950 text-white placeholder-zinc-500'
                  }`}
                  required
                />
              </div>
            </div>

            {/* Localização */}
            <div>
              <label className={`block text-xs font-medium uppercase tracking-wider mb-1.5 ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
                Localização / Cidade, UF
              </label>
              <div className="relative">
                <MapPin className={`absolute left-3 top-2.5 h-4 w-4 ${isLight ? 'text-slate-400' : 'text-zinc-500'}`} />
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Ex: São Paulo, SP ou Curitiba, PR"
                  className={`w-full rounded-xl border pl-9 pr-3 py-2 text-sm focus:border-indigo-500 focus:outline-none ${
                    isLight
                      ? 'border-slate-300 bg-slate-50 text-slate-900 placeholder-slate-400'
                      : 'border-zinc-800 bg-zinc-950 text-white placeholder-zinc-500'
                  }`}
                  required
                />
              </div>
            </div>

            {/* Setor */}
            <div>
              <label className={`block text-xs font-medium uppercase tracking-wider mb-1.5 ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
                Segmento Industrial / B2B
              </label>
              <div className="relative">
                <Building2 className={`absolute left-3 top-2.5 h-4 w-4 ${isLight ? 'text-slate-400' : 'text-zinc-500'}`} />
                <input
                  type="text"
                  value={sector}
                  onChange={(e) => setSector(e.target.value)}
                  placeholder="Ex: Indústria, Serviços, Varejo"
                  className={`w-full rounded-xl border pl-9 pr-3 py-2 text-sm focus:border-indigo-500 focus:outline-none ${
                    isLight
                      ? 'border-slate-300 bg-slate-50 text-slate-900 placeholder-slate-400'
                      : 'border-zinc-800 bg-zinc-950 text-white placeholder-zinc-500'
                  }`}
                />
              </div>
            </div>

            {/* Quantidade */}
            <div>
              <label className={`block text-xs font-medium uppercase tracking-wider mb-1.5 ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
                Quantidade de Decisores
              </label>
              <select
                value={targetCount}
                onChange={(e) => setTargetCount(Number(e.target.value))}
                className={`w-full rounded-xl border px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none ${
                  isLight
                    ? 'border-slate-300 bg-slate-50 text-slate-900'
                    : 'border-zinc-800 bg-zinc-950 text-white'
                }`}
              >
                <option value={5}>5 Empresas / Decisores</option>
                <option value={8}>8 Empresas / Decisores</option>
                <option value={15}>15 Empresas / Decisores</option>
                <option value={25}>25 Empresas / Decisores</option>
              </select>
            </div>
          </div>

          <div
            className={`flex flex-col sm:flex-row items-center justify-between gap-4 pt-2 border-t ${
              isLight ? 'border-slate-200' : 'border-zinc-800/80'
            }`}
          >
            <div className={`flex items-center gap-2 text-xs ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
              <span>Validação automática de MX (Google & Cloudflare DoH) ativa</span>
            </div>

            <button
              type="submit"
              disabled={isSearching}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-pink-500 via-purple-600 to-indigo-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-pink-500/20 hover:opacity-95 disabled:opacity-50 transition-all cursor-pointer"
            >
              {isSearching ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>
                    Extraindo e Verificando MX... ({searchProgress?.current}/{searchProgress?.total})
                  </span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  <span>Iniciar Extração com IA</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Staging Area / Results Section */}
      <div className="space-y-4">
        {/* Controls Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <h2 className={`text-lg font-bold flex items-center gap-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>
              <Layers className="h-5 w-5 text-indigo-500" />
              Área de Staging ({prospectingResults.length} Leads Encontrados)
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Filter Tabs */}
            <div className={`flex rounded-lg p-1 border text-xs ${isLight ? 'bg-slate-100 border-slate-200' : 'bg-zinc-900 border-zinc-800'}`}>
              <button
                onClick={() => setFilterStatus('raw')}
                className={`rounded-md px-3 py-1 font-medium transition-all cursor-pointer ${
                  filterStatus === 'raw'
                    ? isLight
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'bg-zinc-800 text-white'
                    : isLight
                    ? 'text-slate-600 hover:text-slate-900'
                    : 'text-zinc-400 hover:text-zinc-200'
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
                    ? 'text-slate-600 hover:text-slate-900'
                    : 'text-zinc-400 hover:text-zinc-200'
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
                    ? 'text-slate-600 hover:text-slate-900'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Todos
              </button>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className={`absolute left-2.5 top-2 h-3.5 w-3.5 ${isLight ? 'text-slate-400' : 'text-zinc-500'}`} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Filtrar resultados..."
                className={`rounded-lg border pl-8 pr-3 py-1 text-xs focus:border-indigo-500 focus:outline-none ${
                  isLight
                    ? 'border-slate-300 bg-white text-slate-900 placeholder-slate-400'
                    : 'border-zinc-800 bg-zinc-900 text-white placeholder-zinc-500'
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
              <h3 className={`text-sm font-semibold ${isLight ? 'text-slate-800' : 'text-zinc-300'}`}>Nenhum resultado nesta visualização</h3>
              <p className={`text-xs mt-1 max-w-sm mx-auto ${isLight ? 'text-slate-500' : 'text-zinc-500'}`}>
                Execute uma nova pesquisa acima com o nicho e região desejados para extrair novos tomadores de decisão.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className={`w-full text-left text-xs ${isLight ? 'text-slate-700' : 'text-zinc-300'}`}>
                <thead
                  className={`border-b text-[11px] font-semibold uppercase tracking-wider ${
                    isLight
                      ? 'border-slate-200 bg-slate-50 text-slate-600'
                      : 'border-zinc-800 bg-zinc-950/60 text-zinc-400'
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
                    <th className="p-4">Empresa & Porte</th>
                    <th className="p-4">Tomador de Decisão / Cargo</th>
                    <th className="p-4">E-mail Corporativo & DNS</th>
                    <th className="p-4">Localização & Setor</th>
                    <th className="p-4 text-center">Score IA</th>
                    <th className="p-4 text-right">Ação</th>
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

                        {/* Empresa */}
                        <td className="p-4">
                          <div className={`font-semibold text-sm flex items-center gap-1.5 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                            <Building2 className={`h-3.5 w-3.5 ${isLight ? 'text-slate-400' : 'text-zinc-400'}`} />
                            {item.company_name}
                          </div>
                          <div className="mt-1 flex items-center gap-2">
                            <span
                              className={`rounded px-1.5 py-0.5 text-[10px] border ${
                                isLight
                                  ? 'bg-slate-100 text-slate-700 border-slate-200'
                                  : 'bg-zinc-800 text-zinc-300 border-zinc-700/60'
                              }`}
                            >
                              {item.company_size || 'Tier 2 (Mid-Market)'}
                            </span>
                            {item.website && (
                              <a
                                href={item.website}
                                target="_blank"
                                rel="noreferrer"
                                className="text-slate-400 hover:text-indigo-600 flex items-center gap-0.5"
                              >
                                <Globe className="h-3 w-3" />
                              </a>
                            )}
                          </div>
                        </td>

                        {/* Tomador de Decisão */}
                        <td className="p-4">
                          <div className={`font-medium flex items-center gap-1.5 ${isLight ? 'text-slate-900' : 'text-zinc-100'}`}>
                            <UserCheck className="h-3.5 w-3.5 text-indigo-500" />
                            {item.contact_name || 'Diretor Comercial'}
                          </div>
                          <div className={`text-[11px] mt-0.5 ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>{item.role || 'Executivo'}</div>
                          {item.phone && (
                            <div className={`text-[10px] flex items-center gap-1 mt-0.5 ${isLight ? 'text-slate-500' : 'text-zinc-500'}`}>
                              <Phone className="h-2.5 w-2.5" />
                              {item.phone}
                            </div>
                          )}
                        </td>

                        {/* E-mail & MX Record */}
                        <td className="p-4">
                          <div className={`flex items-center gap-1.5 font-mono ${isLight ? 'text-slate-800' : 'text-zinc-200'}`}>
                            <Mail className="h-3 w-3 text-slate-400" />
                            <span>{item.email}</span>
                          </div>
                          <div className="mt-1.5 flex items-center gap-1.5">
                            {item.mx_status === 'valid' ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-500 border border-emerald-500/20">
                                <CheckCircle className="h-3 w-3" />
                                MX Ativo ({item.mx_host?.slice(0, 18)}...)
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2 py-0.5 text-[10px] font-medium text-rose-500 border border-rose-500/20">
                                <XCircle className="h-3 w-3" />
                                Sem MX (Risco de Bounce)
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Localização & Setor */}
                        <td className="p-4">
                          <div className={isLight ? 'text-slate-800' : 'text-zinc-200'}>{item.city}, {item.province}</div>
                          <div className={`text-[11px] mt-0.5 ${isLight ? 'text-slate-500' : 'text-zinc-500'}`}>{item.sector}</div>
                        </td>

                        {/* Score */}
                        <td className="p-4 text-center">
                          <span
                            className={`inline-flex items-center justify-center rounded-full px-2 py-1 text-[11px] font-bold ${
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
                              Importado
                            </span>
                          ) : (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => importProspectsToLeads([item.id])}
                                title="Importar individualmente"
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
