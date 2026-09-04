import React, { useState, useEffect } from 'react';
import {
  Mail,
  Users,
  Settings,
  LayoutDashboard,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  X,
  Kanban,
  Zap,
  ArrowLeft,
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export type ActiveTab = 'dashboard' | 'prospecting' | 'leads' | 'kanban' | 'campaigns' | 'templates' | 'settings';

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
  const { tenant, leads, campaigns } = useApp();

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
      groupTitle: 'MARKETING & LEADS',
      items: [
        { 
          id: 'leads', 
          label: 'Leads de Marketing', 
          icon: Users, 
          count: leads.length, 
          description: 'Base e público segmentado' 
        },
        { 
          id: 'prospecting', 
          label: 'Máquina de Leads (AI)', 
          icon: Zap, 
          badge: 'AI', 
          description: 'Extração Espanha & Brasil' 
        },
        { 
          id: 'kanban', 
          label: 'Funil de Vendas', 
          icon: Kanban, 
          description: 'Kanban comercial de conversão' 
        },
        {
          id: 'campaigns',
          label: 'Campanhas de Marketing',
          icon: Mail,
          count: campaigns.filter((c) => c.status === 'sending').length || undefined,
          description: 'Disparos, Templates e Públicos',
        },
      ],
    },
    {
      groupTitle: 'VISÃO & SISTEMA',
      items: [
        { id: 'dashboard', label: 'Visão Geral & KPIs', icon: LayoutDashboard, description: 'Métricas gerais' },
        { id: 'settings', label: 'Configurações', icon: Settings, description: 'Resend, Domínios & DNS' },
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
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-xs lg:hidden"
        />
      )}

      {/* Sidebar Container - Aligned with mcs-personal dark slate & yellow palette */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex flex-col bg-slate-900 border-r border-slate-800 text-slate-300 transition-all duration-300 ease-in-out lg:sticky lg:h-screen ${
          isCollapsed ? 'lg:w-20' : 'lg:w-64'
        } ${
          isMobileOpen ? 'translate-x-0 w-72' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand Header: CM yellow box + Universa Comercial */}
        <div
          className={`flex h-[72px] items-center border-b border-slate-800 shrink-0 ${
            isCollapsed && !isMobileOpen ? 'justify-center px-0' : 'px-5 justify-between'
          }`}
        >
          <div className="flex items-center gap-3 min-w-0">
            {/* CM Yellow Icon Badge */}
            <div className="flex h-8 w-8 items-center justify-center shrink-0 rounded bg-yellow-500 font-bold text-white text-base shadow-sm">
              CM
            </div>

            {(!isCollapsed || isMobileOpen) && (
              <div className="min-w-0 flex-1 overflow-hidden transition-opacity duration-200">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-white tracking-tight text-lg truncate">
                    Comercial
                  </span>
                  <span className="rounded bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 px-1.5 py-0.2 text-[9px] font-bold shrink-0">
                    SaaS
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 truncate">
                  {tenant.name || 'Universa Comercial'}
                </div>
              </div>
            )}
          </div>

          {/* Mobile Close Button */}
          <button
            onClick={() => setIsMobileOpen(false)}
            className="lg:hidden p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Hub Back Button */}
        <div className="px-3 mt-3 mb-1 shrink-0">
          <button
            onClick={() => handleNavClick('dashboard')}
            className={`flex items-center justify-center py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors text-xs font-medium border border-slate-700 cursor-pointer ${
              isCollapsed && !isMobileOpen ? 'w-12 mx-auto' : 'w-full gap-2 px-3'
            }`}
            title={isCollapsed && !isMobileOpen ? 'Voltar para o Painel' : undefined}
          >
            <ArrowLeft size={15} className="shrink-0 text-slate-400" />
            {(!isCollapsed || isMobileOpen) && <span>Voltar para o Hub</span>}
          </button>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-5">
          {navGroups.map((group, groupIdx) => (
            <div key={groupIdx} className={`space-y-1.5 ${groupIdx > 0 ? 'pt-2 border-t border-slate-800/70' : ''}`}>
              {(!isCollapsed || isMobileOpen) ? (
                <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {group.groupTitle}
                </div>
              ) : groupIdx > 0 ? (
                <div className="mx-2 my-1 border-t border-slate-800" />
              ) : null}

              <div className="space-y-1">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;

                  return (
                    <button
                      key={item.id}
                      onClick={() => handleNavClick(item.id)}
                      title={isCollapsed && !isMobileOpen ? `${item.label} - ${item.description}` : undefined}
                      className={`group relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-xs transition-all duration-150 cursor-pointer ${
                        isActive
                          ? 'bg-yellow-500/10 text-yellow-400 font-semibold border border-yellow-500/20'
                          : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
                      } ${isCollapsed && !isMobileOpen ? 'justify-center px-0' : ''}`}
                    >
                      <Icon
                        className={`h-4.5 w-4.5 shrink-0 transition-transform group-hover:scale-105 ${
                          isActive ? 'text-yellow-400' : 'text-slate-400'
                        }`}
                      />

                      {(!isCollapsed || isMobileOpen) && (
                        <div className="flex flex-1 items-center justify-between min-w-0 text-left">
                          <span className="truncate">{item.label}</span>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {item.badge && (
                              <span className="rounded bg-yellow-500/20 border border-yellow-500/30 px-1.5 py-0.2 text-[9px] font-bold text-yellow-400 uppercase tracking-wider">
                                {item.badge}
                              </span>
                            )}
                            {item.count !== undefined && item.count > 0 && (
                              <span className="rounded-full px-2 py-0.2 text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                                {item.count > 999 ? `${(item.count / 1000).toFixed(0)}k` : item.count}
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Active Indicator Bar on collapsed view */}
                      {isActive && isCollapsed && !isMobileOpen && (
                        <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-yellow-400" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Section: DNS Verifier Status & Collapse Toggle */}
        <div className="p-3 border-t border-slate-800 bg-slate-900/80 space-y-2 shrink-0">
          {(!isCollapsed || isMobileOpen) && (
            <div className="rounded-xl border border-slate-800 bg-slate-800/50 p-2.5 text-xs">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-emerald-500/10 p-1.5 text-emerald-400 shrink-0">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-slate-200 truncate text-[11px]">
                    mail.universatv.com
                  </div>
                  <div className="text-[10px] text-emerald-400 font-medium">Resend Verificado • 100%</div>
                </div>
              </div>
            </div>
          )}

          {/* Desktop Collapse / Expand Toggle Button */}
          <button
            onClick={toggleCollapse}
            title={isCollapsed ? 'Expandir Menu' : 'Recolher Menu'}
            className="hidden lg:flex w-full items-center justify-center gap-2 rounded-xl border border-slate-800 bg-slate-800/40 p-2 text-xs font-medium text-slate-400 hover:bg-slate-800 hover:text-white transition-all cursor-pointer"
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4 text-yellow-400" />
            ) : (
              <>
                <ChevronLeft className="h-4 w-4 text-yellow-400" />
                <span>Recolher Menu</span>
              </>
            )}
          </button>
        </div>
      </aside>
    </>
  );
};
