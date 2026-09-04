import React from 'react';
import {
  Menu,
  Sun,
  Moon,
  ShieldCheck,
  Database,
  Building2,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import type { ActiveTab } from './Sidebar';

interface TopNavbarProps {
  activeTab: ActiveTab;
  onOpenMobileMenu: () => void;
}

export const TopNavbar: React.FC<TopNavbarProps> = ({ activeTab, onOpenMobileMenu }) => {
  const { tenant, theme, toggleTheme, isSupabaseConnected } = useApp();
  const isLight = theme === 'light';

  const tabLabels: Record<ActiveTab, { title: string; subtitle: string }> = {
    dashboard: { title: 'Dashboard', subtitle: 'Métricas e Desempenho em Tempo Real' },
    prospecting: { title: 'Máquina de Leads (AI)', subtitle: 'Extração & Enriquecimento com Grounded Search' },
    leads: { title: 'Leads de Marketing', subtitle: 'Tabela, Segmentação e Filtros Avançados' },
    kanban: { title: 'Funil de Vendas', subtitle: 'Pipeline Comercial & Estágios de Conversão' },
    templates: { title: 'Editor de Templates', subtitle: 'Modelos Personalizados com Tags Dinâmicas' },
    campaigns: { title: 'Campanhas de Marketing', subtitle: 'Campanhas, Templates HTML & Públicos Salvos' },
    settings: { title: 'Configurações', subtitle: 'Multi-tenant, Resend, Webhooks & Banco' },
  };

  const currentTab = tabLabels[activeTab] || { title: 'Painel', subtitle: 'UniversaEmail' };

  return (
    <header
      className={`sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b px-4 sm:px-6 lg:px-8 backdrop-blur-md transition-colors ${
        isLight
          ? 'border-slate-200 bg-white/90 text-slate-800'
          : 'border-zinc-800 bg-zinc-950/80 text-zinc-100'
      }`}
    >
      {/* Left: Mobile Menu Trigger + Breadcrumb Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileMenu}
          className={`lg:hidden flex h-9 w-9 items-center justify-center rounded-xl border shadow-xs cursor-pointer ${
            isLight ? 'border-slate-200 bg-white text-slate-700' : 'border-zinc-800 bg-zinc-900 text-zinc-300'
          }`}
        >
          <Menu className="h-5 w-5" />
        </button>

        <div>
          <h1 className={`text-base sm:text-lg font-bold tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
            {currentTab.title}
          </h1>
          <p className={`hidden sm:block text-xs ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
            {currentTab.subtitle}
          </p>
        </div>
      </div>

      {/* Right: Status Pills, Tenant Badge & Theme Switcher */}
      <div className="flex items-center gap-2.5">
        {/* Status Indicators */}
        <div className="hidden md:flex items-center gap-2 text-xs">
          <div
            className={`flex items-center gap-1.5 rounded-full px-3 py-1 font-medium border ${
              isLight
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
            }`}
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>MX DoH Ativo</span>
          </div>

          <div
            className={`flex items-center gap-1.5 rounded-full px-3 py-1 font-medium border ${
              isSupabaseConnected
                ? isLight
                  ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                  : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                : isLight
                ? 'bg-slate-100 text-slate-600 border-slate-200'
                : 'bg-zinc-800 text-zinc-400 border-zinc-700'
            }`}
          >
            <Database className="h-3.5 w-3.5 text-indigo-500" />
            <span>{isSupabaseConnected ? 'Supabase Live' : 'Modo Local'}</span>
          </div>
        </div>

        {/* Tenant Info Pill */}
        <div
          className={`hidden sm:flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold ${
            isLight
              ? 'border-slate-200 bg-slate-50 text-slate-700'
              : 'border-zinc-800 bg-zinc-900 text-zinc-300'
          }`}
        >
          <Building2 className="h-3.5 w-3.5 text-indigo-500" />
          <span className="truncate max-w-[140px]">{tenant.name}</span>
        </div>

        {/* Light / Dark Mode Toggle */}
        <button
          onClick={toggleTheme}
          aria-label="Alternar tema claro/escuro"
          title={theme === 'dark' ? 'Mudar para Modo Claro (White)' : 'Mudar para Modo Escuro (Dark)'}
          className={`flex h-9 w-9 items-center justify-center rounded-xl border transition-all cursor-pointer ${
            isLight
              ? 'border-slate-200 bg-slate-100 text-amber-500 hover:bg-slate-200 shadow-xs'
              : 'border-zinc-800 bg-zinc-900 text-indigo-400 hover:bg-zinc-800 shadow-xs'
          }`}
        >
          {theme === 'dark' ? (
            <Sun className="h-4 w-4 text-amber-400" />
          ) : (
            <Moon className="h-4 w-4 text-indigo-600" />
          )}
        </button>
      </div>
    </header>
  );
};
