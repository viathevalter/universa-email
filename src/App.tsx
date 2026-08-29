import React, { useState } from 'react';
import { AppProvider, useApp } from './shared/context/AppContext';
import { Header } from './shared/components/Header';
import type { ActiveTab } from './shared/components/Header';
import { DashboardView } from './features/dashboard/DashboardView';
import { ProspectingView } from './features/prospecting/ProspectingView';
import { LeadsView } from './features/leads/LeadsView';
import { TemplatesView } from './features/templates/TemplatesView';
import { CampaignsView } from './features/campaigns/CampaignsView';
import { SettingsView } from './features/settings/SettingsView';
import { ShieldCheck, Mail, Sparkles } from 'lucide-react';

const MainApp: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const { theme } = useApp();

  return (
    <div
      className={`min-h-screen flex flex-col transition-colors duration-200 ${
        theme === 'light'
          ? 'bg-slate-50 text-slate-900 selection:bg-indigo-100 selection:text-indigo-900'
          : 'bg-zinc-950 text-zinc-100 selection:bg-indigo-500/30 selection:text-indigo-200'
      }`}
    >
      {/* Top Bar Navigation */}
      <Header activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Content Area */}
      <main className="flex-1 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
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
          theme === 'light'
            ? 'border-slate-200 bg-white/80 text-slate-500'
            : 'border-zinc-800/80 bg-zinc-950/80 text-zinc-500'
        }`}
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-2">
            <span className={`font-semibold ${theme === 'light' ? 'text-slate-700' : 'text-zinc-300'}`}>
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
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainApp />
    </AppProvider>
  );
}
