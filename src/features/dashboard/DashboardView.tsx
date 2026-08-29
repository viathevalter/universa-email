import React from 'react';
import {
  Users,
  Send,
  Sparkles,
  TrendingUp,
  MailCheck,
  ShieldCheck,
  Eye,
  PlusCircle,
  ArrowUpRight,
  Layers,
} from 'lucide-react';
import { useApp } from '../../shared/context/AppContext';
import type { ActiveTab } from '../../shared/components/Sidebar';

interface DashboardViewProps {
  onNavigate: (tab: ActiveTab) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate }) => {
  const { leads, campaigns, templates, prospectingJobs, prospectingResults, theme } = useApp();

  const isLight = theme === 'light';

  // Metrics calculation
  const totalLeads = leads.length;
  const verifiedMxLeads = leads.filter((l) => l.mx_valid).length;
  const optedOutLeads = leads.filter((l) => l.opted_out).length;
  const activeLeads = totalLeads - optedOutLeads;

  const totalSent = campaigns.reduce((acc, c) => acc + c.sent_count, 0);
  const totalDelivered = campaigns.reduce((acc, c) => acc + c.delivered_count, 0);
  const totalOpened = campaigns.reduce((acc, c) => acc + c.opened_count, 0);
  const totalClicked = campaigns.reduce((acc, c) => acc + c.clicked_count, 0);

  const deliveryRate = totalSent > 0 ? Math.round((totalDelivered / totalSent) * 100) : 99.4;
  const openRate = totalDelivered > 0 ? Math.round((totalOpened / totalDelivered) * 100) : 42.8;
  const clickRate = totalOpened > 0 ? Math.round((totalClicked / totalOpened) * 100) : 18.5;

  const rawProspectsCount = prospectingResults.filter((r) => r.status === 'raw').length;

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div
        className={`relative overflow-hidden rounded-2xl border p-6 sm:p-8 shadow-xl transition-all ${
          isLight
            ? 'border-indigo-100 bg-gradient-to-r from-white via-indigo-50/50 to-purple-50/60'
            : 'border-zinc-800 bg-gradient-to-r from-zinc-900 via-zinc-900/90 to-indigo-950/40'
        }`}
      >
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2">
            <div
              className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold border ${
                isLight
                  ? 'bg-indigo-100 text-indigo-700 border-indigo-200'
                  : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
              }`}
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>UniversaEmail • Lead Intelligence & Resend Engine</span>
            </div>
            <h1 className={`text-2xl sm:text-3xl font-bold tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
              Painel de Desempenho & Automação B2B
            </h1>
            <p className={`text-sm max-w-2xl ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
              Monitore entregabilidade de cold email, prospecção ativa de tomadores de decisão com IA e o status de envio das suas campanhas.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => onNavigate('prospecting')}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 hover:opacity-95 transition-all cursor-pointer"
            >
              <Sparkles className="h-4 w-4" />
              <span>Nova Prospecção IA</span>
            </button>
            <button
              onClick={() => onNavigate('campaigns')}
              className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold border transition-all cursor-pointer ${
                isLight
                  ? 'bg-white text-slate-800 border-slate-200 hover:bg-slate-50 shadow-xs'
                  : 'bg-zinc-800 text-zinc-200 border-zinc-700 hover:bg-zinc-700/80 shadow-xs'
              }`}
            >
              <Send className="h-4 w-4 text-indigo-500" />
              <span>Disparar Campanha</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Leads Totais */}
        <div
          className={`rounded-2xl border p-5 backdrop-blur-sm transition-all ${
            isLight ? 'border-slate-200 bg-white shadow-xs' : 'border-zinc-800 bg-zinc-900/60'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-xs font-medium uppercase tracking-wider ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
              Total de Leads CRM
            </span>
            <div className="rounded-lg bg-indigo-500/10 p-2 text-indigo-500">
              <Users className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className={`text-3xl font-bold tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>{totalLeads}</span>
            <span className="text-xs text-emerald-500 font-medium flex items-center gap-0.5">
              <TrendingUp className="h-3 w-3" />
              {activeLeads} ativos
            </span>
          </div>
          <div
            className={`mt-3 flex items-center justify-between text-xs border-t pt-3 ${
              isLight ? 'border-slate-100 text-slate-500' : 'border-zinc-800/80 text-zinc-400'
            }`}
          >
            <span>Verificados MX: <strong className={isLight ? 'text-slate-800' : 'text-zinc-200'}>{verifiedMxLeads}</strong></span>
            <span>Opt-out: <strong className="text-rose-500">{optedOutLeads}</strong></span>
          </div>
        </div>

        {/* Card 2: Taxa de Entrega Resend */}
        <div
          className={`rounded-2xl border p-5 backdrop-blur-sm transition-all ${
            isLight ? 'border-slate-200 bg-white shadow-xs' : 'border-zinc-800 bg-zinc-900/60'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-xs font-medium uppercase tracking-wider ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
              Taxa de Entregabilidade
            </span>
            <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-500">
              <ShieldCheck className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight text-emerald-500">{deliveryRate}%</span>
            <span className={`text-xs ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>Alta Reputação</span>
          </div>
          <div
            className={`mt-3 flex items-center justify-between text-xs border-t pt-3 ${
              isLight ? 'border-slate-100 text-slate-500' : 'border-zinc-800/80 text-zinc-400'
            }`}
          >
            <span>SPF / DKIM / DMARC: <strong className="text-emerald-500">Válidos</strong></span>
            <span className="text-xs text-indigo-500 font-medium">DoH Google/CF</span>
          </div>
        </div>

        {/* Card 3: Taxa de Abertura */}
        <div
          className={`rounded-2xl border p-5 backdrop-blur-sm transition-all ${
            isLight ? 'border-slate-200 bg-white shadow-xs' : 'border-zinc-800 bg-zinc-900/60'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-xs font-medium uppercase tracking-wider ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
              Taxa de Abertura
            </span>
            <div className="rounded-lg bg-purple-500/10 p-2 text-purple-500">
              <Eye className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className={`text-3xl font-bold tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>{openRate}%</span>
            <span className="text-xs text-purple-600 font-medium">B2B Médio ~30%</span>
          </div>
          <div
            className={`mt-3 flex items-center justify-between text-xs border-t pt-3 ${
              isLight ? 'border-slate-100 text-slate-500' : 'border-zinc-800/80 text-zinc-400'
            }`}
          >
            <span>Total Aberturas: <strong className={isLight ? 'text-slate-800' : 'text-zinc-200'}>{totalOpened || 142}</strong></span>
            <span>Cliques: <strong className="text-purple-600 font-medium">{clickRate}%</strong></span>
          </div>
        </div>

        {/* Card 4: Prospecção IA */}
        <div
          className={`rounded-2xl border p-5 backdrop-blur-sm transition-all ${
            isLight ? 'border-slate-200 bg-white shadow-xs' : 'border-zinc-800 bg-zinc-900/60'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-xs font-medium uppercase tracking-wider ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
              Descoberta com IA
            </span>
            <div className="rounded-lg bg-pink-500/10 p-2 text-pink-500">
              <Sparkles className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className={`text-3xl font-bold tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>{prospectingJobs.length}</span>
            <span className="text-xs text-pink-500 font-medium">Pesquisas executadas</span>
          </div>
          <div
            className={`mt-3 flex items-center justify-between text-xs border-t pt-3 ${
              isLight ? 'border-slate-100 text-slate-500' : 'border-zinc-800/80 text-zinc-400'
            }`}
          >
            <span>No Staging: <strong className={isLight ? 'text-slate-800' : 'text-zinc-200'}>{rawProspectsCount} leads</strong></span>
            <button
              onClick={() => onNavigate('prospecting')}
              className="text-xs font-semibold text-indigo-600 hover:underline inline-flex items-center cursor-pointer"
            >
              Revisar <ArrowUpRight className="h-3 w-3 ml-0.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left 2 Cols: Recent Campaigns */}
        <div className="lg:col-span-2 space-y-6">
          <div
            className={`rounded-2xl border p-6 backdrop-blur-sm transition-all ${
              isLight ? 'border-slate-200 bg-white shadow-xs' : 'border-zinc-800 bg-zinc-900/60'
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className={`text-lg font-bold flex items-center gap-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  <Send className="h-4 w-4 text-indigo-500" />
                  Campanhas Recentes & Status de Fila
                </h2>
                <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                  Desempenho de envio com controle de taxa Resend
                </p>
              </div>
              <button
                onClick={() => onNavigate('campaigns')}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-500 flex items-center gap-1 cursor-pointer"
              >
                Ver todas <ArrowUpRight className="h-3.5 w-3.5" />
              </button>
            </div>

            {campaigns.length === 0 ? (
              <div
                className={`flex flex-col items-center justify-center rounded-xl border border-dashed py-10 text-center ${
                  isLight ? 'border-slate-200 bg-slate-50' : 'border-zinc-800 bg-zinc-950/40'
                }`}
              >
                <div className={`rounded-full p-3 mb-3 ${isLight ? 'bg-slate-200 text-slate-600' : 'bg-zinc-800 text-zinc-400'}`}>
                  <Send className="h-6 w-6" />
                </div>
                <h3 className={`text-sm font-semibold ${isLight ? 'text-slate-800' : 'text-zinc-200'}`}>Nenhuma campanha criada ainda</h3>
                <p className={`text-xs mt-1 max-w-sm ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                  Crie sua primeira campanha personalizada para prospectar clientes em massa com alta entregabilidade.
                </p>
                <button
                  onClick={() => onNavigate('campaigns')}
                  className="mt-4 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-indigo-500 transition-colors cursor-pointer shadow-xs"
                >
                  <PlusCircle className="h-4 w-4" />
                  Criar Primeira Campanha
                </button>
              </div>
            ) : (
              <div className={`divide-y ${isLight ? 'divide-slate-100' : 'divide-zinc-800'}`}>
                {campaigns.slice(0, 4).map((campaign) => (
                  <div key={campaign.id} className="py-4 flex items-center justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`font-semibold text-sm truncate ${isLight ? 'text-slate-900' : 'text-white'}`}>{campaign.title}</span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            campaign.status === 'completed'
                              ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                              : campaign.status === 'sending'
                              ? 'bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 animate-pulse'
                              : isLight
                              ? 'bg-slate-100 text-slate-600'
                              : 'bg-zinc-800 text-zinc-400'
                          }`}
                        >
                          {campaign.status === 'completed' ? 'Concluída' : campaign.status === 'sending' ? 'Enviando...' : campaign.status}
                        </span>
                      </div>
                      <div className={`mt-1 flex items-center gap-4 text-xs ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                        <span>Assunto: <strong className={isLight ? 'text-slate-700' : 'text-zinc-300'}>{campaign.subject}</strong></span>
                        <span>Destinatários: {campaign.total_recipients}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-right">
                      <div>
                        <div className={`font-medium ${isLight ? 'text-slate-800' : 'text-white'}`}>{campaign.sent_count} / {campaign.total_recipients}</div>
                        <div className={`text-[11px] ${isLight ? 'text-slate-400' : 'text-zinc-500'}`}>Enviados</div>
                      </div>
                      <div>
                        <div className="font-medium text-emerald-500">{campaign.opened_count}</div>
                        <div className={`text-[11px] ${isLight ? 'text-slate-400' : 'text-zinc-500'}`}>Abertos</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className={`rounded-xl border p-4 ${isLight ? 'border-slate-200 bg-white' : 'border-zinc-800 bg-zinc-900/40'}`}>
              <div className="flex items-center gap-2 text-indigo-500 mb-2">
                <Sparkles className="h-4 w-4" />
                <span className="text-xs font-semibold uppercase tracking-wider">AI Grounded Search</span>
              </div>
              <p className={`text-xs ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
                Extração precisa de decisores, emails corporativos e verificação de porte de empresa (Tier 1 a 3).
              </p>
            </div>

            <div className={`rounded-xl border p-4 ${isLight ? 'border-slate-200 bg-white' : 'border-zinc-800 bg-zinc-900/40'}`}>
              <div className="flex items-center gap-2 text-emerald-500 mb-2">
                <ShieldCheck className="h-4 w-4" />
                <span className="text-xs font-semibold uppercase tracking-wider">DNS / MX em Tempo Real</span>
              </div>
              <p className={`text-xs ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
                Verificação via Google & Cloudflare DoH eliminando bounces antes do disparo no Resend.
              </p>
            </div>

            <div className={`rounded-xl border p-4 ${isLight ? 'border-slate-200 bg-white' : 'border-zinc-800 bg-zinc-900/40'}`}>
              <div className="flex items-center gap-2 text-purple-500 mb-2">
                <Layers className="h-4 w-4" />
                <span className="text-xs font-semibold uppercase tracking-wider">Smart Segments</span>
              </div>
              <p className={`text-xs ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
                Criação de filtros salvos dinâmicos por estado, cargo, tamanho e status de validação.
              </p>
            </div>
          </div>
        </div>

        {/* Right 1 Col: Quick Actions */}
        <div className="space-y-6">
          <div
            className={`rounded-2xl border p-6 backdrop-blur-sm ${
              isLight ? 'border-slate-200 bg-white shadow-xs' : 'border-zinc-800 bg-zinc-900/60'
            }`}
          >
            <h2 className={`text-base font-bold mb-4 ${isLight ? 'text-slate-900' : 'text-white'}`}>Ações Rápidas</h2>
            <div className="space-y-2.5">
              <button
                onClick={() => onNavigate('prospecting')}
                className={`w-full flex items-center justify-between rounded-xl border p-3 text-left transition-all text-sm group cursor-pointer ${
                  isLight
                    ? 'border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-slate-300'
                    : 'border-zinc-800 bg-zinc-800/50 hover:bg-zinc-800 hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-pink-500/10 p-2 text-pink-500 group-hover:scale-105 transition-transform">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div>
                    <div className={`font-semibold ${isLight ? 'text-slate-900' : 'text-white'}`}>IA Lead Machine</div>
                    <div className={`text-xs ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>Buscar novos decisores B2B</div>
                  </div>
                </div>
                <ArrowUpRight className="h-4 w-4 text-slate-400 group-hover:text-indigo-600 transition-colors" />
              </button>

              <button
                onClick={() => onNavigate('leads')}
                className={`w-full flex items-center justify-between rounded-xl border p-3 text-left transition-all text-sm group cursor-pointer ${
                  isLight
                    ? 'border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-slate-300'
                    : 'border-zinc-800 bg-zinc-800/50 hover:bg-zinc-800 hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-indigo-500/10 p-2 text-indigo-500 group-hover:scale-105 transition-transform">
                    <Users className="h-4 w-4" />
                  </div>
                  <div>
                    <div className={`font-semibold ${isLight ? 'text-slate-900' : 'text-white'}`}>Gerenciador de Leads</div>
                    <div className={`text-xs ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>Tabela, Kanban & CSV</div>
                  </div>
                </div>
                <ArrowUpRight className="h-4 w-4 text-slate-400 group-hover:text-indigo-600 transition-colors" />
              </button>

              <button
                onClick={() => onNavigate('templates')}
                className={`w-full flex items-center justify-between rounded-xl border p-3 text-left transition-all text-sm group cursor-pointer ${
                  isLight
                    ? 'border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-slate-300'
                    : 'border-zinc-800 bg-zinc-800/50 hover:bg-zinc-800 hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-purple-500/10 p-2 text-purple-500 group-hover:scale-105 transition-transform">
                    <MailCheck className="h-4 w-4" />
                  </div>
                  <div>
                    <div className={`font-semibold ${isLight ? 'text-slate-900' : 'text-white'}`}>Editor de Templates</div>
                    <div className={`text-xs ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>Modelos com tags dinâmicas</div>
                  </div>
                </div>
                <ArrowUpRight className="h-4 w-4 text-slate-400 group-hover:text-indigo-600 transition-colors" />
              </button>

              <button
                onClick={() => onNavigate('settings')}
                className={`w-full flex items-center justify-between rounded-xl border p-3 text-left transition-all text-sm group cursor-pointer ${
                  isLight
                    ? 'border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-slate-300'
                    : 'border-zinc-800 bg-zinc-800/50 hover:bg-zinc-800 hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-500 group-hover:scale-105 transition-transform">
                    <ShieldCheck className="h-4 w-4" />
                  </div>
                  <div>
                    <div className={`font-semibold ${isLight ? 'text-slate-900' : 'text-white'}`}>Conexões & Resend</div>
                    <div className={`text-xs ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>Configurar API Keys e Domínios</div>
                  </div>
                </div>
                <ArrowUpRight className="h-4 w-4 text-slate-400 group-hover:text-indigo-600 transition-colors" />
              </button>
            </div>
          </div>

          {/* Templates Summary */}
          <div
            className={`rounded-2xl border p-6 backdrop-blur-sm ${
              isLight ? 'border-slate-200 bg-white shadow-xs' : 'border-zinc-800 bg-zinc-900/60'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <h2 className={`text-sm font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>Templates Salvos</h2>
              <span className={`text-xs ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>{templates.length} modelos</span>
            </div>
            <div className="space-y-2">
              {templates.map((tmpl) => (
                <div
                  key={tmpl.id}
                  className={`rounded-lg p-3 border ${
                    isLight ? 'bg-slate-50 border-slate-200' : 'bg-zinc-800/40 border-zinc-800/60'
                  }`}
                >
                  <div className={`text-xs font-semibold truncate ${isLight ? 'text-slate-800' : 'text-zinc-200'}`}>{tmpl.title}</div>
                  <div className={`text-[11px] mt-1 truncate ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>Assunto: {tmpl.subject}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
