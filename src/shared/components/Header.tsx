import React from 'react';
import {
  Sparkles,
  Mail,
  Users,
  Send,
  FileCode,
  Settings,
  LayoutDashboard,
  ShieldCheck,
  Building2,
  Database,
  Sun,
  Moon,
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export type ActiveTab = 'dashboard' | 'prospecting' | 'leads' | 'templates' | 'campaigns' | 'settings';

interface HeaderProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
}

export const Header: React.FC<HeaderProps> = ({ activeTab, setActiveTab }) => {
  const { tenant, leads, campaigns, theme, toggleTheme } = useApp();

  const navItems = [
    { id: 'dashboard' as ActiveTab, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'prospecting' as ActiveTab, label: 'IA Lead Machine', icon: Sparkles, badge: 'IA' },
    { id: 'leads' as ActiveTab, label: 'Leads & CRM', icon: Users, count: leads.length },
    { id: 'templates' as ActiveTab, label: 'Templates', icon: FileCode },
    { id: 'campaigns' as ActiveTab, label: 'Campanhas', icon: Send, count: campaigns.filter((c) => c.status === 'sending').length || undefined },
    { id: 'settings' as ActiveTab, label: 'Configurações', icon: Settings },
  ];

  return (
    <header
      className={`sticky top-0 z-40 w-full border-b backdrop-blur-md transition-colors ${
        theme === 'light'
          ? 'border-slate-200 bg-white/90 text-slate-800'
          : 'border-zinc-800 bg-zinc-950/80 text-zinc-100'
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8 py-3">
        {/* Brand & Tenant */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 shadow-lg shadow-indigo-500/25">
            <Mail className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold tracking-tight text-lg bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">
                UniversaEmail
              </span>
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] font-semibold border ${
                  theme === 'light'
                    ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                    : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                }`}
              >
                SaaS
              </span>
            </div>
            <div
              className={`flex items-center gap-1.5 text-xs ${
                theme === 'light' ? 'text-slate-500' : 'text-zinc-400'
              }`}
            >
              <Building2 className="h-3 w-3" />
              <span>{tenant.name}</span>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1 overflow-x-auto py-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`relative flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150 cursor-pointer ${
                  isActive
                    ? theme === 'light'
                      ? 'bg-indigo-50 text-indigo-600 font-semibold shadow-xs ring-1 ring-indigo-200'
                      : 'bg-zinc-800 text-white shadow-xs ring-1 ring-zinc-700/50'
                    : theme === 'light'
                    ? 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? 'text-indigo-500' : ''}`} />
                <span>{item.label}</span>
                {item.badge && (
                  <span className="rounded bg-gradient-to-r from-indigo-500 to-pink-500 px-1.5 py-0.2 text-[10px] font-bold text-white uppercase tracking-wider">
                    {item.badge}
                  </span>
                )}
                {item.count !== undefined && item.count > 0 && (
                  <span
                    className={`rounded-full px-1.5 py-0.2 text-xs font-semibold ${
                      theme === 'light'
                        ? 'bg-slate-200 text-slate-700'
                        : 'bg-zinc-700 text-zinc-300'
                    }`}
                  >
                    {item.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Quick Info & Theme Toggle */}
        <div className="flex items-center gap-2.5 text-xs">
          {/* Status Badges */}
          <div className="hidden lg:flex items-center gap-2">
            <div
              className={`flex items-center gap-1.5 rounded-full px-3 py-1 font-medium border ${
                theme === 'light'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              }`}
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>MX DoH Ativo</span>
            </div>
            <div
              className={`flex items-center gap-1.5 rounded-full px-3 py-1 border ${
                theme === 'light'
                  ? 'bg-slate-100 text-slate-700 border-slate-200'
                  : 'bg-zinc-800 text-zinc-300 border-zinc-700'
              }`}
            >
              <Database className="h-3.5 w-3.5 text-indigo-400" />
              <span>Supabase</span>
            </div>
          </div>

          {/* Theme Toggle Button (Light/Dark) */}
          <button
            onClick={toggleTheme}
            aria-label="Alternar tema claro/escuro"
            title={theme === 'dark' ? 'Mudar para Modo Claro (White)' : 'Mudar para Modo Escuro (Dark)'}
            className={`flex h-9 w-9 items-center justify-center rounded-xl border transition-all cursor-pointer ${
              theme === 'light'
                ? 'border-slate-200 bg-slate-100 text-amber-500 hover:bg-slate-200 shadow-xs'
                : 'border-zinc-800 bg-zinc-900 text-indigo-400 hover:bg-zinc-800 shadow-xs'
            }`}
          >
            {theme === 'dark' ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-indigo-600" />}
          </button>
        </div>
      </div>
    </header>
  );
};
