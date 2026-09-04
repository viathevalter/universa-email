import React, { useState, useMemo } from 'react';
import {
  Search,
  Plus,
  Settings,
  Mail,
  Phone,
  ChevronLeft,
  ChevronRight,
  MessageCircle,
  Building2,
} from 'lucide-react';
import { useApp } from '../../shared/context/AppContext';
import type { Lead, LeadStatus } from '../../types';
import confetti from 'canvas-confetti';

interface KanbanStageConfig {
  id: LeadStatus;
  title: string;
  dotColor: string;
  badgeBg: string;
  badgeText: string;
  description: string;
}

const DEFAULT_STAGES: KanbanStageConfig[] = [
  {
    id: 'new',
    title: 'Novo / Sem Contato',
    dotColor: 'bg-blue-500',
    badgeBg: 'bg-blue-500/10',
    badgeText: 'text-blue-500',
    description: 'Leads capturados na máquina de leads aguardando envio',
  },
  {
    id: 'contacted',
    title: 'E-mail Enviado',
    dotColor: 'bg-amber-500',
    badgeBg: 'bg-amber-500/10',
    badgeText: 'text-amber-500',
    description: 'Disparados via campanhas de e-mail Resend',
  },
  {
    id: 'replied',
    title: 'E-mail Lido / Clicado',
    dotColor: 'bg-cyan-500',
    badgeBg: 'bg-cyan-500/10',
    badgeText: 'text-cyan-500',
    description: 'Leads que abriram o e-mail ou clicaram no link',
  },
  {
    id: 'qualified',
    title: 'Teste 24h / Orçamento',
    dotColor: 'bg-purple-500',
    badgeBg: 'bg-purple-500/10',
    badgeText: 'text-purple-500',
    description: 'Interesse confirmado ou teste 24h solicitado',
  },
  {
    id: 'converted',
    title: 'Contato Via WhatsApp',
    dotColor: 'bg-emerald-500',
    badgeBg: 'bg-emerald-500/10',
    badgeText: 'text-emerald-500',
    description: 'Atendimento direto e conversão no WhatsApp',
  },
];

const STAGE_ORDER: LeadStatus[] = ['new', 'contacted', 'replied', 'qualified', 'converted'];

interface KanbanViewProps {
  onNavigateToCampaigns?: () => void;
}

export const KanbanView: React.FC<KanbanViewProps> = ({ onNavigateToCampaigns }) => {
  const { tenant, leads, updateLead, addLead, theme } = useApp();
  const isLight = theme === 'light';

  const [stages, setStages] = useState<KanbanStageConfig[]>(DEFAULT_STAGES);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCommercial, setSelectedCommercial] = useState<string>('all');
  const [selectedCountryFilter, setSelectedCountryFilter] = useState<'all' | 'Espanha' | 'Brasil'>('all');

  // Modals
  const [isNewLeadModalOpen, setIsNewLeadModalOpen] = useState(false);
  const [isConfigStagesModalOpen, setIsConfigStagesModalOpen] = useState(false);

  // New Lead Form State
  const [newLeadData, setNewLeadData] = useState({
    name: '',
    company_name: '',
    email: '',
    phone: '',
    city: 'Madrid',
    country: 'Espanha',
    status: 'new' as LeadStatus,
  });

  // Limit visible cards per column for 60fps performance with 200k leads
  const [cardsLimitPerCol, setCardsLimitPerCol] = useState<Record<LeadStatus, number>>({
    new: 30,
    contacted: 30,
    replied: 30,
    qualified: 30,
    converted: 30,
    unqualified: 30,
  });

  const loadMoreCards = (stage: LeadStatus) => {
    setCardsLimitPerCol((prev) => ({
      ...prev,
      [stage]: (prev[stage] || 30) + 30,
    }));
  };

  // Filtered Leads
  const filteredLeads = useMemo(() => {
    let result = leads;

    if (selectedCountryFilter !== 'all') {
      result = result.filter((l) => (l.country || 'Espanha').toLowerCase() === selectedCountryFilter.toLowerCase());
    }

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      result = result.filter(
        (l) =>
          (l.name && l.name.toLowerCase().includes(term)) ||
          (l.company_name && l.company_name.toLowerCase().includes(term)) ||
          (l.email && l.email.toLowerCase().includes(term)) ||
          (l.city && l.city.toLowerCase().includes(term)) ||
          (l.role && l.role.toLowerCase().includes(term))
      );
    }

    return result;
  }, [leads, selectedCountryFilter, searchTerm]);

  // Group leads by stage
  const groupedLeads = useMemo(() => {
    const groups: Record<LeadStatus, Lead[]> = {
      new: [],
      contacted: [],
      replied: [],
      qualified: [],
      converted: [],
      unqualified: [],
    };

    for (const lead of filteredLeads) {
      const statusKey = lead.status in groups ? lead.status : 'new';
      groups[statusKey].push(lead);
    }

    return groups;
  }, [filteredLeads]);

  // Move lead forward or backward in funnel
  const moveLead = (leadId: string, currentStatus: LeadStatus, direction: 'forward' | 'backward') => {
    const currentIndex = STAGE_ORDER.indexOf(currentStatus);
    if (currentIndex === -1) return;

    const nextIndex = direction === 'forward' ? currentIndex + 1 : currentIndex - 1;
    if (nextIndex < 0 || nextIndex >= STAGE_ORDER.length) return;

    const nextStatus = STAGE_ORDER[nextIndex];
    updateLead(leadId, { status: nextStatus });

    if (nextStatus === 'converted') {
      try {
        confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
      } catch {}
    }
  };

  const handleCreateLead = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLeadData.email.trim()) return;

    const leadToAdd: Omit<Lead, 'id' | 'created_at' | 'updated_at'> = {
      tenant_id: tenant.id,
      name: newLeadData.name.trim() || 'Novo Contato',
      company_name: newLeadData.company_name.trim() || 'Consumidor Final',
      email: newLeadData.email.trim().toLowerCase(),
      phone: newLeadData.phone.trim() || undefined,
      city: newLeadData.city.trim() || undefined,
      country: newLeadData.country.trim() || 'Espanha',
      status: newLeadData.status,
      opted_out: false,
      mx_valid: true,
      tags: [newLeadData.country, 'Manual CRM'],
    };

    addLead(leadToAdd);
    setIsNewLeadModalOpen(false);
    setNewLeadData({
      name: '',
      company_name: '',
      email: '',
      phone: '',
      city: 'Madrid',
      country: 'Espanha',
      status: 'new',
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Header matching mcs-personal */}
      <div
        className={`rounded-2xl border p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 transition-all ${
          isLight ? 'border-slate-200 bg-white shadow-xs' : 'border-zinc-800 bg-zinc-950/70 shadow-lg'
        }`}
      >
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-yellow-500 flex items-center justify-center font-bold text-white text-base">
              📊
            </div>
            <h1 className={`text-2xl font-bold tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
              Funil de Vendas
            </h1>
            <span className="rounded-full bg-yellow-500/10 px-3 py-0.5 text-xs font-bold text-yellow-600 border border-yellow-500/20">
              {leads.length.toLocaleString()} Leads
            </span>
          </div>
          <p className={`text-xs sm:text-sm ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
            Acompanhe o engajamento e a negociação dos seus leads em tempo real
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Tenant Selector */}
          <div
            className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold ${
              isLight ? 'border-slate-200 bg-slate-50 text-slate-700' : 'border-zinc-800 bg-zinc-900 text-zinc-300'
            }`}
          >
            <Building2 className="h-4 w-4 text-yellow-500" />
            <span>{tenant.name}</span>
          </div>

          {/* Commercial / Sender Selector */}
          <select
            value={selectedCommercial}
            onChange={(e) => setSelectedCommercial(e.target.value)}
            className={`rounded-xl border px-3 py-2 text-xs font-medium focus:outline-none ${
              isLight ? 'border-slate-200 bg-white text-slate-800' : 'border-zinc-800 bg-zinc-900 text-zinc-200'
            }`}
          >
            <option value="all">👤 Todos os Comerciais</option>
            <option value="carlos">🇪🇸 Carlos Ventas (Espanha)</option>
            <option value="jackson">🇧🇷 Jackson Vendas (Brasil)</option>
          </select>

          {/* New Lead Button */}
          <button
            onClick={() => setIsNewLeadModalOpen(true)}
            className="flex items-center gap-1.5 rounded-xl bg-yellow-500 hover:bg-yellow-400 px-4 py-2 text-xs font-bold text-slate-950 shadow-md shadow-yellow-500/20 transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4 stroke-[3]" />
            <span>+ Novo Lead</span>
          </button>

          {/* Config Stages Button */}
          <button
            onClick={() => setIsConfigStagesModalOpen(true)}
            className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium transition-all cursor-pointer ${
              isLight ? 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50' : 'border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800'
            }`}
          >
            <Settings className="h-3.5 w-3.5" />
            <span>Configurar Estágios</span>
          </button>

          {onNavigateToCampaigns && (
            <button
              onClick={onNavigateToCampaigns}
              className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition-all cursor-pointer ${
                isLight 
                  ? 'border-yellow-300 bg-yellow-50 text-yellow-800 hover:bg-yellow-100' 
                  : 'border-yellow-500/30 bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20'
              }`}
              title="Ir para Campanhas de Marketing"
            >
              <Mail className="h-3.5 w-3.5" />
              <span>Campanhas</span>
            </button>
          )}
        </div>
      </div>

      {/* Search Bar & Country Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar lead por nome, empresa, e-mail..."
            className={`w-full rounded-xl border pl-10 pr-4 py-2.5 text-xs focus:outline-none transition-all ${
              isLight
                ? 'border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 shadow-xs'
                : 'border-zinc-800 bg-zinc-950 text-white placeholder:text-zinc-500 shadow-inner'
            }`}
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-200"
            >
              ✕
            </button>
          )}
        </div>

        {/* Quick Country Pills */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => setSelectedCountryFilter('all')}
            className={`rounded-xl px-3 py-2 text-xs font-bold transition-all cursor-pointer ${
              selectedCountryFilter === 'all'
                ? 'bg-yellow-500 text-slate-950 shadow-xs'
                : isLight
                ? 'bg-white border border-slate-200 text-slate-600'
                : 'bg-zinc-900 border border-zinc-800 text-zinc-400'
            }`}
          >
            Todos ({leads.length.toLocaleString()})
          </button>
          <button
            onClick={() => setSelectedCountryFilter('Espanha')}
            className={`rounded-xl px-3 py-2 text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
              selectedCountryFilter === 'Espanha'
                ? 'bg-yellow-500 text-slate-950 shadow-xs'
                : isLight
                ? 'bg-white border border-slate-200 text-slate-600'
                : 'bg-zinc-900 border border-zinc-800 text-zinc-400'
            }`}
          >
            <span>🇪🇸 Espanha</span>
            <span className="text-[10px] opacity-80">
              ({leads.filter((l) => (l.country || 'Espanha').toLowerCase() === 'espanha').length.toLocaleString()})
            </span>
          </button>
          <button
            onClick={() => setSelectedCountryFilter('Brasil')}
            className={`rounded-xl px-3 py-2 text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
              selectedCountryFilter === 'Brasil'
                ? 'bg-yellow-500 text-slate-950 shadow-xs'
                : isLight
                ? 'bg-white border border-slate-200 text-slate-600'
                : 'bg-zinc-900 border border-zinc-800 text-zinc-400'
            }`}
          >
            <span>🇧🇷 Brasil</span>
            <span className="text-[10px] opacity-80">
              ({leads.filter((l) => (l.country || '').toLowerCase() === 'brasil').length.toLocaleString()})
            </span>
          </button>
        </div>
      </div>

      {/* Kanban Columns Horizontal Board */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 overflow-x-auto pb-6">
        {stages.map((stage) => {
          const leadsInStage = groupedLeads[stage.id] || [];
          const currentLimit = cardsLimitPerCol[stage.id] || 30;
          const visibleLeads = leadsInStage.slice(0, currentLimit);
          const hasMore = leadsInStage.length > currentLimit;

          return (
            <div
              key={stage.id}
              className={`rounded-2xl border flex flex-col min-w-[260px] max-h-[820px] transition-all ${
                isLight ? 'border-slate-200 bg-slate-50/70 shadow-xs' : 'border-zinc-800/80 bg-zinc-950/70 shadow-lg'
              }`}
            >
              {/* Column Header */}
              <div
                className={`p-3.5 border-b flex items-center justify-between sticky top-0 backdrop-blur-sm z-10 ${
                  isLight ? 'border-slate-200 bg-slate-50/90' : 'border-zinc-800/80 bg-zinc-950/90'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className={`h-2.5 w-2.5 rounded-full ${stage.dotColor}`} />
                  <span className={`text-xs font-bold ${isLight ? 'text-slate-800' : 'text-zinc-200'}`}>
                    {stage.title}
                  </span>
                </div>
                <span className={`rounded-md px-2 py-0.5 text-[11px] font-bold ${stage.badgeBg} ${stage.badgeText}`}>
                  {leadsInStage.length.toLocaleString()}
                </span>
              </div>

              {/* Cards Container */}
              <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
                {visibleLeads.length === 0 ? (
                  <div className="py-12 text-center">
                    <span className={`text-xs ${isLight ? 'text-slate-400' : 'text-zinc-600'}`}>
                      Nenhum lead neste estágio
                    </span>
                  </div>
                ) : (
                  visibleLeads.map((lead) => {
                    const phoneClean = (lead.phone || '').replace(/\D/g, '');
                    const hasWhatsApp = phoneClean.length >= 8;
                    const waUrl = hasWhatsApp
                      ? `https://api.whatsapp.com/send?phone=${phoneClean}&text=${encodeURIComponent(
                          `Olá ${lead.name || ''}, tudo bem? Sou da Universa TV.`
                        )}`
                      : null;

                    return (
                      <div
                        key={lead.id}
                        className={`rounded-xl border p-3.5 space-y-2 transition-all hover:shadow-md ${
                          isLight
                            ? 'border-slate-200 bg-white text-slate-800 hover:border-slate-300'
                            : 'border-zinc-800 bg-zinc-900/90 text-zinc-200 hover:border-zinc-700'
                        }`}
                      >
                        {/* Company / Category Title */}
                        <div className="flex items-start justify-between gap-1.5">
                          <div>
                            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider truncate max-w-[170px]">
                              {lead.company_name || 'CONSUMIDOR B2C'}
                            </span>
                            <h4 className={`text-xs font-bold truncate max-w-[180px] ${isLight ? 'text-slate-900' : 'text-white'}`}>
                              {lead.name || 'Lead sem Nome'}
                            </h4>
                          </div>

                          {/* Country Flag Badge */}
                          <span className="text-xs">
                            {(lead.country || 'Espanha').toLowerCase() === 'brasil' ? '🇧🇷' : '🇪🇸'}
                          </span>
                        </div>

                        {/* Contact details */}
                        <div className="space-y-1 text-[11px]">
                          {lead.email && (
                            <div className="flex items-center gap-1.5 truncate text-slate-400">
                              <Mail className="h-3 w-3 shrink-0 text-slate-400" />
                              <a
                                href={`mailto:${lead.email}`}
                                className={`truncate hover:underline ${isLight ? 'text-slate-600' : 'text-zinc-300'}`}
                              >
                                {lead.email}
                              </a>
                            </div>
                          )}

                          {lead.phone && (
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5 text-slate-400">
                                <Phone className="h-3 w-3 shrink-0 text-slate-400" />
                                <span className={`text-[11px] font-mono ${isLight ? 'text-slate-600' : 'text-zinc-300'}`}>
                                  {lead.phone}
                                </span>
                              </div>

                              {waUrl && (
                                <a
                                  href={waUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  title="Iniciar conversa no WhatsApp"
                                  className="text-emerald-500 hover:text-emerald-400 p-0.5"
                                >
                                  <MessageCircle className="h-3.5 w-3.5 fill-emerald-500/20" />
                                </a>
                              )}
                            </div>
                          )}

                          {lead.city && (
                            <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                              <span>📍 {lead.city}</span>
                              <span>{lead.created_at ? new Date(lead.created_at).toLocaleDateString() : 'Hoje'}</span>
                            </div>
                          )}
                        </div>

                        {/* Move Card Action Buttons */}
                        <div className="pt-2 border-t border-zinc-800/40 flex items-center justify-between">
                          <button
                            onClick={() => moveLead(lead.id, stage.id, 'backward')}
                            disabled={stage.id === 'new'}
                            className="p-1 rounded text-slate-400 hover:text-slate-200 disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed"
                            title="Voltar estágio"
                          >
                            <ChevronLeft className="h-3.5 w-3.5" />
                          </button>

                          <span className="text-[10px] font-bold text-slate-500 uppercase">
                            Mover
                          </span>

                          <button
                            onClick={() => moveLead(lead.id, stage.id, 'forward')}
                            disabled={stage.id === 'converted'}
                            className="p-1 rounded text-slate-400 hover:text-slate-200 disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed"
                            title="Avançar estágio"
                          >
                            <ChevronRight className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}

                {/* Load More Button for Column */}
                {hasMore && (
                  <button
                    onClick={() => loadMoreCards(stage.id)}
                    className={`w-full py-2 rounded-xl border text-[11px] font-semibold transition-all cursor-pointer ${
                      isLight
                        ? 'border-slate-200 bg-white text-slate-600 hover:bg-slate-100'
                        : 'border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800'
                    }`}
                  >
                    + Carregar mais 30 ({leadsInStage.length - currentLimit} restantes)
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal: Novo Lead */}
      {isNewLeadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div
            className={`w-full max-w-md rounded-2xl border p-6 shadow-2xl space-y-4 ${
              isLight ? 'border-slate-200 bg-white' : 'border-zinc-800 bg-zinc-900'
            }`}
          >
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className={`font-bold text-sm ${isLight ? 'text-slate-900' : 'text-white'}`}>
                Cadastrar Novo Lead no Funil
              </h3>
              <button
                onClick={() => setIsNewLeadModalOpen(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateLead} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Nome Completo</label>
                <input
                  type="text"
                  required
                  value={newLeadData.name}
                  onChange={(e) => setNewLeadData({ ...newLeadData, name: e.target.value })}
                  placeholder="Ex: Alejandro Martínez"
                  className={`w-full rounded-xl border px-3 py-2 text-xs focus:outline-none ${
                    isLight ? 'border-slate-200 bg-slate-50 text-slate-900' : 'border-zinc-800 bg-zinc-950 text-white'
                  }`}
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">E-mail *</label>
                <input
                  type="email"
                  required
                  value={newLeadData.email}
                  onChange={(e) => setNewLeadData({ ...newLeadData, email: e.target.value })}
                  placeholder="exemplo@gmail.com"
                  className={`w-full rounded-xl border px-3 py-2 text-xs focus:outline-none ${
                    isLight ? 'border-slate-200 bg-slate-50 text-slate-900' : 'border-zinc-800 bg-zinc-950 text-white'
                  }`}
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">WhatsApp / Telefone</label>
                <input
                  type="text"
                  value={newLeadData.phone}
                  onChange={(e) => setNewLeadData({ ...newLeadData, phone: e.target.value })}
                  placeholder="+34 600 000 000 ou +55 11 99999-9999"
                  className={`w-full rounded-xl border px-3 py-2 text-xs focus:outline-none ${
                    isLight ? 'border-slate-200 bg-slate-50 text-slate-900' : 'border-zinc-800 bg-zinc-950 text-white'
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">País</label>
                  <select
                    value={newLeadData.country}
                    onChange={(e) => setNewLeadData({ ...newLeadData, country: e.target.value })}
                    className={`w-full rounded-xl border px-3 py-2 text-xs focus:outline-none ${
                      isLight ? 'border-slate-200 bg-slate-50 text-slate-900' : 'border-zinc-800 bg-zinc-950 text-white'
                    }`}
                  >
                    <option value="Espanha">🇪🇸 Espanha</option>
                    <option value="Brasil">🇧🇷 Brasil</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Cidade</label>
                  <input
                    type="text"
                    value={newLeadData.city}
                    onChange={(e) => setNewLeadData({ ...newLeadData, city: e.target.value })}
                    placeholder="Madrid ou São Paulo"
                    className={`w-full rounded-xl border px-3 py-2 text-xs focus:outline-none ${
                      isLight ? 'border-slate-200 bg-slate-50 text-slate-900' : 'border-zinc-800 bg-zinc-950 text-white'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Estágio Inicial</label>
                <select
                  value={newLeadData.status}
                  onChange={(e) => setNewLeadData({ ...newLeadData, status: e.target.value as LeadStatus })}
                  className={`w-full rounded-xl border px-3 py-2 text-xs focus:outline-none ${
                    isLight ? 'border-slate-200 bg-slate-50 text-slate-900' : 'border-zinc-800 bg-zinc-950 text-white'
                  }`}
                >
                  {stages.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewLeadModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-slate-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-bold"
                >
                  Adicionar Lead
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Configurar Estágios */}
      {isConfigStagesModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div
            className={`w-full max-w-lg rounded-2xl border p-6 shadow-2xl space-y-4 ${
              isLight ? 'border-slate-200 bg-white' : 'border-zinc-800 bg-zinc-900'
            }`}
          >
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className={`font-bold text-sm ${isLight ? 'text-slate-900' : 'text-white'}`}>
                Personalizar Estágios do Funil
              </h3>
              <button
                onClick={() => setIsConfigStagesModalOpen(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              {stages.map((stage, idx) => (
                <div
                  key={stage.id}
                  className={`flex items-center gap-3 p-3 rounded-xl border ${
                    isLight ? 'border-slate-200 bg-slate-50' : 'border-zinc-800 bg-zinc-950'
                  }`}
                >
                  <div className={`h-3 w-3 rounded-full ${stage.dotColor} shrink-0`} />
                  <div className="flex-1">
                    <input
                      type="text"
                      value={stage.title}
                      onChange={(e) => {
                        const newTitle = e.target.value;
                        setStages((prev) =>
                          prev.map((st, i) => (i === idx ? { ...st, title: newTitle } : st))
                        );
                      }}
                      className={`w-full bg-transparent text-xs font-bold focus:outline-none ${
                        isLight ? 'text-slate-900' : 'text-white'
                      }`}
                    />
                    <span className="text-[10px] text-slate-500 block">{stage.description}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-3 flex items-center justify-end">
              <button
                onClick={() => setIsConfigStagesModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-bold text-xs"
              >
                Salvar Configuração
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
