import React, { useState } from 'react';
import { AppProvider, useApp } from './shared/context/AppContext';
import { Sidebar } from './shared/components/Sidebar';
import { TopNavbar } from './shared/components/TopNavbar';
import type { ActiveTab } from './shared/components/Sidebar';
import { DashboardView } from './features/dashboard/DashboardView';
import { ProspectingView } from './features/prospecting/ProspectingView';
import { LeadsView } from './features/leads/LeadsView';
import { TemplatesView } from './features/templates/TemplatesView';
import { CampaignsView } from './features/campaigns/CampaignsView';
import { SettingsView } from './features/settings/SettingsView';
import { ShieldCheck, Mail, Sparkles } from 'lucide-react';

const MainApp: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const { theme } = useApp();
  const isLight = theme === 'light';

  return (
    <div
      className={`min-h-screen flex w-full transition-colors duration-200 ${
        isLight
          ? 'bg-slate-50 text-slate-900 selection:bg-indigo-100 selection:text-indigo-900'
          : 'bg-zinc-950 text-zinc-100 selection:bg-indigo-500/30 selection:text-indigo-200'
      }`}
    >
      {/* Left Collapsible Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isMobileOpen={isMobileOpen}
        setIsMobileOpen={setIsMobileOpen}
      />

      {/* Main Workspace Area (Navbar + Active View + Footer) */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Navbar */}
        <TopNavbar
          activeTab={activeTab}
          onOpenMobileMenu={() => setIsMobileOpen(true)}
        />

        {/* Dynamic Page Content */}
        <main className="flex-1 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          {activeTab === 'dashboard' && <DashboardView onNavigate={(tab) => setActiveTab(tab)} />}
          {activeTab === 'prospecting' && <ProspectingView />}
          {activeTab === 'leads' && <LeadsView />}
          {activeTab === 'templates' && <TemplatesView />}
          {activeTab === 'campaigns' && <CampaignsView />}
          {activeTab === 'settings' && <SettingsView />}
        </main>

        {/* Modern SaaS Footer */}
        <footer
          className={`border-t py-6 mt-12 transition-colors ${
            isLight
              ? 'border-slate-200 bg-white/80 text-slate-500'
              : 'border-zinc-800/80 bg-zinc-950/80 text-zinc-500'
          }`}
        >
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-2">
              <span className={`font-semibold ${isLight ? 'text-slate-700' : 'text-zinc-300'}`}>
                UniversaEmail • Email & AI Lead Intelligence
              </span>
              <span>•</span>
              <span>SaaS v1.0.0</span>
            </div>

            <div className="flex items-center gap-6">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                DoH MX DNS Verifier
              </span>
              <span className="flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-pink-500" />
                Gemini Grounded Search
              </span>
              <span className="flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-indigo-500" />
                Resend Delivery Engine
              </span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

import { ErrorBoundary } from './shared/components/ErrorBoundary';

export default function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <MainApp />
      </AppProvider>
    </ErrorBoundary>
  );
}
