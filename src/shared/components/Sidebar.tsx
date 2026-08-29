import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Mail,
  Users,
  Send,
  FileCode,
  Settings,
  LayoutDashboard,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  X,
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export type ActiveTab = 'dashboard' | 'prospecting' | 'leads' | 'templates' | 'campaigns' | 'settings';

interface NavItem {
  id: ActiveTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  badge?: string;
  count?: number;
}

interface NavGroup {
  groupTitle: string;
  items: NavItem[];
}

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  isMobileOpen,
  setIsMobileOpen,
}) => {
  const { tenant, leads, campaigns, theme } = useApp();
  const isLight = theme === 'light';

  // Persisted Collapsed State
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('universa_sidebar_collapsed') === 'true';
  });

  useEffect(() => {
    localStorage.setItem('universa_sidebar_collapsed', isCollapsed ? 'true' : 'false');
  }, [isCollapsed]);

  const toggleCollapse = () => {
    setIsCollapsed((prev) => !prev);
  };

  const navGroups: NavGroup[] = [
    {
      groupTitle: 'Principal',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, description: 'Visão Geral & KPIs' },
        { id: 'prospecting', label: 'IA Lead Machine', icon: Sparkles, badge: 'IA', description: 'Extração com Gemini' },
        { id: 'leads', label: 'Leads & CRM', icon: Users, count: leads.length, description: 'Tabela & Kanban' },
      ],
    },
    {
      groupTitle: 'Campanhas & Disparos',
      items: [
        { id: 'templates', label: 'Templates', icon: FileCode, description: 'Editor & Tags' },
        {
          id: 'campaigns',
          label: 'Campanhas',
          icon: Send,
          count: campaigns.filter((c) => c.status === 'sending').length || undefined,
          description: 'Fila Resend',
        },
      ],
    },
    {
      groupTitle: 'Sistema',
      items: [
        { id: 'settings', label: 'Configurações', icon: Settings, description: 'APIs & Supabase' },
      ],
    },
  ];

  const handleNavClick = (tab: ActiveTab) => {
    setActiveTab(tab);
    if (isMobileOpen) {
      setIsMobileOpen(false);
    }
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isMobileOpen && (
        <div
          onClick={() => setIsMobileOpen(false)}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs lg:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex flex-col border-r transition-all duration-300 ease-in-out lg:sticky lg:h-screen ${
          isCollapsed ? 'lg:w-20' : 'lg:w-64'
        } ${
          isMobileOpen ? 'translate-x-0 w-72' : '-translate-x-full lg:translate-x-0'
        } ${
          isLight
            ? 'bg-white border-slate-200 text-slate-800 shadow-sm'
            : 'bg-zinc-950 border-zinc-800 text-zinc-100'
        }`}
      >
        {/* Brand Header */}
        <div
          className={`flex h-16 items-center justify-between px-4 border-b ${
            isLight ? 'border-slate-100' : 'border-zinc-800/80'
          }`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 shadow-md shadow-indigo-500/20">
              <Mail className="h-5 w-5 text-white" />
            </div>

            {(!isCollapsed || isMobileOpen) && (
              <div className="min-w-0 flex-1 overflow-hidden transition-opacity duration-200">
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold tracking-tight text-base bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 bg-clip-text text-transparent truncate">
                    UniversaEmail
                  </span>
                  <span
                    className={`rounded px-1.5 py-0.2 text-[10px] font-bold border shrink-0 ${
                      isLight
                        ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                        : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                    }`}
                  >
                    SaaS
                  </span>
                </div>
                <div className={`text-[11px] truncate ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                  {tenant.name}
                </div>
              </div>
            )}
          </div>

          {/* Mobile Close Button */}
          <button
            onClick={() => setIsMobileOpen(false)}
            className="lg:hidden p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          {navGroups.map((group, groupIdx) => (
            <div key={groupIdx} className="space-y-1.5">
              {(!isCollapsed || isMobileOpen) && (
                <div
                  className={`px-3 text-[10px] font-bold uppercase tracking-wider ${
                    isLight ? 'text-slate-400' : 'text-zinc-500'
                  }`}
                >
                  {group.groupTitle}
                </div>
              )}

              <div className="space-y-1">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;

                  return (
                    <button
                      key={item.id}
                      onClick={() => handleNavClick(item.id)}
                      title={isCollapsed && !isMobileOpen ? `${item.label} - ${item.description}` : undefined}
                      className={`group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold transition-all duration-150 cursor-pointer ${
                        isActive
                          ? isLight
                            ? 'bg-indigo-50 text-indigo-600 shadow-xs ring-1 ring-indigo-200/80 font-bold'
                            : 'bg-zinc-900 text-white shadow-xs ring-1 ring-zinc-700/60 font-bold'
                          : isLight
                          ? 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                          : 'text-zinc-400 hover:bg-zinc-900/60 hover:text-zinc-200'
                      } ${isCollapsed && !isMobileOpen ? 'justify-center px-0' : ''}`}
                    >
                      <Icon
                        className={`h-4.5 w-4.5 shrink-0 transition-transform group-hover:scale-105 ${
                          isActive ? 'text-indigo-500' : isLight ? 'text-slate-500' : 'text-zinc-400'
                        }`}
                      />

                      {(!isCollapsed || isMobileOpen) && (
                        <div className="flex flex-1 items-center justify-between min-w-0">
                          <span className="truncate">{item.label}</span>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {item.badge && (
                              <span className="rounded bg-gradient-to-r from-pink-500 to-indigo-500 px-1.5 py-0.2 text-[9px] font-bold text-white uppercase tracking-wider">
                                {item.badge}
                              </span>
                            )}
                            {item.count !== undefined && item.count > 0 && (
                              <span
                                className={`rounded-full px-2 py-0.2 text-[10px] font-bold ${
                                  isLight
                                    ? 'bg-slate-200 text-slate-700'
                                    : 'bg-zinc-800 text-zinc-300'
                                }`}
                              >
                                {item.count}
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Active Indicator Bar */}
                      {isActive && (
                        <span
                          className={`absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-gradient-to-b from-indigo-500 to-purple-600 ${
                            isCollapsed && !isMobileOpen ? 'block' : 'hidden'
                          }`}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Section: Tenant Card & Collapse Toggle Button */}
        <div
          className={`p-3 border-t space-y-3 ${
            isLight ? 'border-slate-100 bg-slate-50/50' : 'border-zinc-800/80 bg-zinc-950/40'
          }`}
        >
          {(!isCollapsed || isMobileOpen) && (
            <div
              className={`rounded-xl border p-2.5 text-xs ${
                isLight ? 'border-slate-200 bg-white' : 'border-zinc-800 bg-zinc-900/60'
              }`}
            >
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-emerald-500/10 p-1.5 text-emerald-500">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className={`font-semibold truncate text-[11px] ${isLight ? 'text-slate-800' : 'text-zinc-200'}`}>
                    DoH MX Verifier
                  </div>
                  <div className="text-[10px] text-emerald-500 font-medium">99.4% Entregabilidade</div>
                </div>
              </div>
            </div>
          )}

          {/* Desktop Collapse / Expand Toggle Button */}
          <button
            onClick={toggleCollapse}
            title={isCollapsed ? 'Expandir Menu Lateral' : 'Recolher Menu Lateral'}
            className={`hidden lg:flex w-full items-center justify-center gap-2 rounded-xl border p-2 text-xs font-semibold transition-all cursor-pointer ${
              isLight
                ? 'border-slate-200 bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 shadow-xs'
                : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 shadow-xs'
            }`}
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4 text-indigo-500" />
            ) : (
              <>
                <ChevronLeft className="h-4 w-4 text-indigo-500" />
                <span>Recolher Menu</span>
              </>
            )}
          </button>
        </div>
      </aside>
    </>
  );
};
