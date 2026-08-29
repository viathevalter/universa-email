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
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export type ActiveTab = 'dashboard' | 'prospecting' | 'leads' | 'templates' | 'campaigns' | 'settings';

interface HeaderProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
}

export const Header: React.FC<HeaderProps> = ({ activeTab, setActiveTab }) => {
  const { tenant, leads, campaigns } = useApp();

  const navItems = [
    { id: 'dashboard' as ActiveTab, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'prospecting' as ActiveTab, label: 'IA Lead Machine', icon: Sparkles, badge: 'Prospecção' },
    { id: 'leads' as ActiveTab, label: 'Leads & CRM', icon: Users, count: leads.length },
    { id: 'templates' as ActiveTab, label: 'Templates', icon: FileCode },
    { id: 'campaigns' as ActiveTab, label: 'Campanhas', icon: Send, count: campaigns.filter((c) => c.status === 'sending').length || undefined },
    { id: 'settings' as ActiveTab, label: 'Configurações', icon: Settings },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8 py-3">
        {/* Brand & Tenant */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 shadow-lg shadow-indigo-500/20">
            <Mail className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-white tracking-tight text-lg">Kotrik</span>
              <span className="rounded-full bg-indigo-500/10 px-2 py-0.5 text-xs font-semibold text-indigo-400 border border-indigo-500/20">
                Email & AI Lead
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-zinc-400">
              <Building2 className="h-3 w-3 text-zinc-500" />
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
                className={`relative flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-zinc-800 text-white shadow-sm ring-1 ring-zinc-700/50'
                    : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? 'text-indigo-400' : 'text-zinc-400'}`} />
                <span>{item.label}</span>
                {item.badge && (
                  <span className="rounded bg-gradient-to-r from-indigo-500 to-pink-500 px-1.5 py-0.2 text-[10px] font-bold text-white uppercase tracking-wider">
                    {item.badge}
                  </span>
                )}
                {item.count !== undefined && item.count > 0 && (
                  <span className="rounded-full bg-zinc-700 px-1.5 py-0.2 text-xs font-semibold text-zinc-300">
                    {item.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Quick Info / Live Status */}
        <div className="hidden lg:flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-emerald-400 border border-emerald-500/20">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span className="font-medium">MX DoH Ativo</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-full bg-zinc-800 px-3 py-1 text-zinc-300 border border-zinc-700">
            <Database className="h-3.5 w-3.5 text-indigo-400" />
            <span>Multi-tenant</span>
          </div>
        </div>
      </div>
    </header>
  );
};
