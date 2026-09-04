import React, { useState } from 'react';
import {
  Send,
  Plus,
  Play,
  Pause,
  CheckCircle,
  Clock,
  Trash2,
  Eye,
  FileCode,
  Building2,
  Edit3,
  ChevronRight,
} from 'lucide-react';
import { useApp, VERIFIED_SENDERS } from '../../shared/context/AppContext';
import type { MarketingTemplate } from '../../types';
import confetti from 'canvas-confetti';

interface CampaignsViewProps {
  onNavigateToLeads?: () => void;
}

export const CampaignsView: React.FC<CampaignsViewProps> = ({ onNavigateToLeads }) => {
  const {
    tenant,
    campaigns,
    templates,
    leads,
    audiences,
    createCampaign,
    launchCampaign,
    pauseCampaign,
    deleteCampaign,
    addTemplate,
    updateTemplate,
    deleteTemplate,
    addAudience,
    deleteAudience,
    theme,
  } = useApp();

  const isLight = theme === 'light';

  // Sub-tabs state (matching mcs-personal screenshots)
  const [activeSubTab, setActiveSubTab] = useState<'campaigns' | 'templates' | 'audiences'>('campaigns');

  // Campaign Wizard Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3 | 4>(1);

  // Template Modal State
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<MarketingTemplate | null>(null);
  const [templateFormData, setTemplateFormData] = useState({
    title: '',
    subject: '',
    html_content: '',
  });

  // Template Preview Modal
  const [previewingTemplate, setPreviewingTemplate] = useState<MarketingTemplate | null>(null);

  // Audience Modal State
  const [isAudienceModalOpen, setIsAudienceModalOpen] = useState(false);
  const [audienceFormData, setAudienceFormData] = useState({
    name: '',
    description: '',
    country: 'Espanha',
    niche: '',
    city: '',
  });

  // Campaign Form State
  const [formData, setFormData] = useState({
    title: '',
    subject: '',
    sender_name: tenant.sender_name || 'Carlos Ventas - Universa TV España',
    sender_email: tenant.marketing_sender_email || 'carlos_ventas@mail.universatv.com',
    reply_to: 'carlos_ventas@mail.universatv.com',
    template_id: templates[0]?.id || '',
    target_audience_id: '',
    rate_limit_per_second: 2,
    launch_now: true,
  });

  // Selected leads for campaign
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Filter leads based on selected audience
  const handleAudienceChange = (audienceId: string) => {
    setFormData((prev) => ({ ...prev, target_audience_id: audienceId }));
    if (!audienceId || audienceId === 'all') {
      setSelectedLeadIds(leads.filter((l) => !l.opted_out && l.mx_valid).map((l) => l.id));
      return;
    }

    const aud = audiences.find((a) => a.id === audienceId);
    if (!aud) return;

    const filtered = leads.filter((lead) => {
      if (lead.opted_out) return false;
      if (aud.filters.status && aud.filters.status.length > 0 && !aud.filters.status.includes(lead.status)) return false;
      if (aud.filters.city && aud.filters.city.length > 0 && !aud.filters.city.includes(lead.city as any)) return false;
      if (aud.filters.province && aud.filters.province.length > 0 && !aud.filters.province.includes(lead.province as any)) return false;
      if (aud.filters.mx_valid_only && !lead.mx_valid) return false;
      if (aud.filters.niche && aud.filters.niche.length > 0) {
        const nicheMatch = aud.filters.niche.some(
          (n) => lead.target_niche === n || (lead.role || '').toLowerCase().includes(n) || (lead.company_name || '').toLowerCase().includes(n)
        );
        if (!nicheMatch) return false;
      }
      return true;
    });

    setSelectedLeadIds(filtered.map((l) => l.id));
  };

  const handleOpenWizard = (targetAudienceId?: string) => {
    setIsCreateModalOpen(true);
    setWizardStep(1);

    const initialAudId = targetAudienceId || '';
    if (initialAudId) {
      handleAudienceChange(initialAudId);
    } else {
      setSelectedLeadIds(leads.filter((l) => !l.opted_out && l.mx_valid).map((l) => l.id));
    }

    const defaultTmpl = templates[0];
    setFormData({
      title: 'Disparo B2C - Teste 24 Horas Universa TV',
      subject: defaultTmpl?.subject || '⚽ ¿Ver todo el fútbol en 4K sin pagar 120€/mes? (Test 24h Gratis)',
      sender_name: tenant.sender_name || 'Carlos Ventas - Universa TV España',
      sender_email: tenant.marketing_sender_email || 'carlos_ventas@mail.universatv.com',
      reply_to: 'carlos_ventas@mail.universatv.com',
      template_id: defaultTmpl?.id || '',
      target_audience_id: initialAudId,
      rate_limit_per_second: 2,
      launch_now: true,
    });
  };

  const handleCreateAndLaunch = async () => {
    if (!formData.title || !formData.subject || !formData.template_id || selectedLeadIds.length === 0) {
      setNotification({ type: 'error', message: 'Preencha todos os campos e selecione pelo menos 1 destinatário.' });
      return;
    }

    try {
      const created = await createCampaign(
        {
          title: formData.title,
          subject: formData.subject,
          sender_name: formData.sender_name,
          sender_email: formData.sender_email,
          reply_to: formData.reply_to,
          template_id: formData.template_id,
          target_audience_id: formData.target_audience_id || undefined,
          status: formData.launch_now ? 'sending' : 'draft',
          total_recipients: selectedLeadIds.length,
          rate_limit_per_second: formData.rate_limit_per_second,
        },
        selectedLeadIds
      );

      setIsCreateModalOpen(false);

      if (formData.launch_now) {
        try {
          confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } });
        } catch {}
        setNotification({ type: 'success', message: 'Campanha criada e motor de disparo Resend iniciado!' });
        await launchCampaign(created.id);
      } else {
        setNotification({ type: 'success', message: 'Campanha criada e salva como rascunho.' });
      }
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Erro ao criar campanha.' });
    }
  };

  // Template Handlers
  const handleOpenCreateTemplate = () => {
    setEditingTemplate(null);
    setTemplateFormData({
      title: '',
      subject: '',
      html_content: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
  <h2 style="color: #4f46e5;">Olá {{nome}},</h2>
  <p>Temos uma oferta especial para você na Universa TV.</p>
  <p style="text-align: center; margin: 24px 0;">
    <a href="https://api.whatsapp.com/send?phone=34600000000" style="background-color: #22c55e; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Ativar Teste 24h</a>
  </p>
</div>`,
    });
    setIsTemplateModalOpen(true);
  };

  const handleEditTemplate = (tmpl: MarketingTemplate) => {
    setEditingTemplate(tmpl);
    setTemplateFormData({
      title: tmpl.title,
      subject: tmpl.subject,
      html_content: tmpl.html_content,
    });
    setIsTemplateModalOpen(true);
  };

  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateFormData.title || !templateFormData.subject || !templateFormData.html_content) return;

    if (editingTemplate) {
      await updateTemplate(editingTemplate.id, {
        title: templateFormData.title,
        subject: templateFormData.subject,
        html_content: templateFormData.html_content,
      });
      setNotification({ type: 'success', message: 'Template atualizado com sucesso!' });
    } else {
      await addTemplate({
        title: templateFormData.title,
        subject: templateFormData.subject,
        html_content: templateFormData.html_content,
        variables: ['{{nome}}', '{{cidade}}', '{{link_descadastro}}'],
      });
      setNotification({ type: 'success', message: 'Novo template criado com sucesso!' });
    }
    setIsTemplateModalOpen(false);
  };

  // Audience Handlers
  const handleSaveNewAudience = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!audienceFormData.name.trim()) return;

    await addAudience({
      name: audienceFormData.name.trim(),
      description: audienceFormData.description.trim() || undefined,
      filters: {
        mx_valid_only: true,
        city: audienceFormData.city ? [audienceFormData.city] : undefined,
        niche: audienceFormData.niche ? [audienceFormData.niche] : undefined,
      },
      lead_count: leads.filter((l) => {
        if (!l.mx_valid || l.opted_out) return false;
        if (audienceFormData.city && l.city !== audienceFormData.city) return false;
        if (audienceFormData.niche && l.target_niche !== audienceFormData.niche) return false;
        return true;
      }).length,
    });

    setIsAudienceModalOpen(false);
    setNotification({ type: 'success', message: 'Público salvo com sucesso!' });
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
              ✉️
            </div>
            <h1 className={`text-2xl font-bold tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
              Campanhas de Marketing
            </h1>
          </div>
          <p className={`text-xs sm:text-sm ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
            Dispare e-mails HTML customizados e acompanhe o funil de e-mails em lote
          </p>
        </div>

        {/* Right Header Actions */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Tenant Selector */}
          <div
            className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold ${
              isLight ? 'border-slate-200 bg-slate-50 text-slate-700' : 'border-zinc-800 bg-zinc-900 text-zinc-300'
            }`}
          >
            <Building2 className="h-4 w-4 text-yellow-500" />
            <span>{tenant.name}</span>
          </div>

          {/* Dynamic Action Button based on active subtab */}
          {activeSubTab === 'campaigns' && (
            <button
              onClick={() => handleOpenWizard()}
              className="flex items-center gap-1.5 rounded-xl bg-yellow-500 hover:bg-yellow-400 px-4 py-2 text-xs font-bold text-slate-950 shadow-md shadow-yellow-500/20 transition-all cursor-pointer"
            >
              <Plus className="h-4 w-4 stroke-[3]" />
              <span>+ Nova Campanha</span>
            </button>
          )}

          {activeSubTab === 'templates' && (
            <button
              onClick={handleOpenCreateTemplate}
              className="flex items-center gap-1.5 rounded-xl bg-yellow-500 hover:bg-yellow-400 px-4 py-2 text-xs font-bold text-slate-950 shadow-md shadow-yellow-500/20 transition-all cursor-pointer"
            >
              <Plus className="h-4 w-4 stroke-[3]" />
              <span>+ Criar Template HTML</span>
            </button>
          )}

          {activeSubTab === 'audiences' && (
            <button
              onClick={() => setIsAudienceModalOpen(true)}
              className="flex items-center gap-1.5 rounded-xl bg-yellow-500 hover:bg-yellow-400 px-4 py-2 text-xs font-bold text-slate-950 shadow-md shadow-yellow-500/20 transition-all cursor-pointer"
            >
              <Plus className="h-4 w-4 stroke-[3]" />
              <span>+ Novo Público Salvo</span>
            </button>
          )}
        </div>
      </div>

      {/* Sub-Tabs Bar matching mcs-personal (Campanhas, Templates de E-mail, Públicos / Segmentos) */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-zinc-800 pb-2">
        <button
          onClick={() => setActiveSubTab('campaigns')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSubTab === 'campaigns'
              ? 'bg-yellow-500/15 text-yellow-500 border border-yellow-500/30'
              : isLight
              ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
          }`}
        >
          Campanhas ({campaigns.length})
        </button>

        <button
          onClick={() => setActiveSubTab('templates')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSubTab === 'templates'
              ? 'bg-yellow-500/15 text-yellow-500 border border-yellow-500/30'
              : isLight
              ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
          }`}
        >
          Templates de E-mail ({templates.length})
        </button>

        <button
          onClick={() => setActiveSubTab('audiences')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSubTab === 'audiences'
              ? 'bg-yellow-500/15 text-yellow-500 border border-yellow-500/30'
              : isLight
              ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
          }`}
        >
          Públicos / Segmentos ({audiences.length})
        </button>
      </div>

      {/* Notification Toast */}
      {notification && (
        <div
          className={`flex items-center justify-between rounded-xl p-4 text-xs font-semibold border ${
            notification.type === 'success'
              ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
              : 'bg-rose-500/10 text-rose-500 border-rose-500/20'
          }`}
        >
          <span>{notification.message}</span>
          <button onClick={() => setNotification(null)} className="opacity-70 hover:opacity-100 cursor-pointer">
            ✕ Fechar
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 1: CAMPANHAS (Cards Grid matching Screenshot 2) */}
      {/* ========================================================================= */}
      {activeSubTab === 'campaigns' && (
        <div className="space-y-4">
          {campaigns.length === 0 ? (
            <div
              className={`rounded-2xl border p-12 text-center space-y-3 ${
                isLight ? 'border-slate-200 bg-white' : 'border-zinc-800 bg-zinc-950/50'
              }`}
            >
              <div className="h-12 w-12 rounded-2xl bg-yellow-500/10 text-yellow-500 flex items-center justify-center mx-auto text-xl">
                ✉️
              </div>
              <h3 className={`font-bold text-sm ${isLight ? 'text-slate-900' : 'text-white'}`}>
                Nenhuma Campanha Criada Ainda
              </h3>
              <p className={`text-xs max-w-md mx-auto ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                Crie sua primeira campanha para enviar e-mails personalizados através do domínio verificado mail.universatv.com
              </p>
              <button
                onClick={() => handleOpenWizard()}
                className="inline-flex items-center gap-1.5 rounded-xl bg-yellow-500 hover:bg-yellow-400 px-4 py-2 text-xs font-bold text-slate-950 shadow-md cursor-pointer"
              >
                <Plus className="h-4 w-4 stroke-[3]" />
                <span>+ Criar Primeira Campanha</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {campaigns.map((camp) => {
                const tmpl = templates.find((t) => t.id === camp.template_id);
                const progressPercent = camp.total_recipients > 0 ? Math.round((camp.sent_count / camp.total_recipients) * 100) : 0;
                const queuePending = Math.max(0, camp.total_recipients - camp.sent_count);

                return (
                  <div
                    key={camp.id}
                    className={`rounded-2xl border p-5 flex flex-col justify-between space-y-4 transition-all hover:shadow-lg ${
                      isLight ? 'border-slate-200 bg-white hover:border-slate-300' : 'border-zinc-800 bg-zinc-950/70 hover:border-zinc-700'
                    }`}
                  >
                    {/* Top Row: Status Badge & Trash Icon */}
                    <div className="flex items-center justify-between">
                      <span
                        className={`rounded-md px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider ${
                          camp.status === 'completed'
                            ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                            : camp.status === 'sending'
                            ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 animate-pulse'
                            : 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20'
                        }`}
                      >
                        {camp.status === 'completed'
                          ? 'Concluído'
                          : camp.status === 'sending'
                          ? 'Enviando...'
                          : 'Rascunho'}
                      </span>

                      <button
                        onClick={() => deleteCampaign(camp.id)}
                        className="text-slate-400 hover:text-rose-500 transition-colors p-1"
                        title="Excluir campanha"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {/* Campaign Info */}
                    <div className="space-y-1">
                      <h3 className={`font-bold text-sm line-clamp-1 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                        {camp.title}
                      </h3>
                      <div className="flex items-center gap-1.5 text-xs text-slate-400">
                        <FileCode className="h-3.5 w-3.5 text-slate-400" />
                        <span className="truncate">Template: {tmpl?.title || 'Personalizado'}</span>
                      </div>
                      <span className="text-[10px] text-slate-500 block">
                        Criado em: {new Date(camp.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    {/* Public / Recipients & Progress Bar */}
                    <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-zinc-800/80">
                      <div className="flex items-center justify-between text-xs">
                        <span className={`font-medium ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
                          Público / Destinatários:
                        </span>
                        <span className={`font-bold ${isLight ? 'text-slate-800' : 'text-white'}`}>
                          {camp.total_recipients.toLocaleString()} leads
                        </span>
                      </div>

                      {/* Pill counters */}
                      <div className="flex items-center gap-2 text-[10px]">
                        <span className="rounded-md bg-emerald-500/10 text-emerald-500 px-2 py-0.5 font-bold">
                          ✓ {camp.sent_count.toLocaleString()} enviados
                        </span>
                        <span className="rounded-md bg-slate-500/10 text-slate-400 px-2 py-0.5 font-medium">
                          ⏳ {queuePending.toLocaleString()} na fila
                        </span>
                      </div>

                      {/* Progress bar */}
                      <div className="space-y-1">
                        <div className={`h-2 w-full rounded-full overflow-hidden ${isLight ? 'bg-slate-100' : 'bg-zinc-800'}`}>
                          <div
                            className="h-full bg-emerald-500 transition-all duration-300 rounded-full"
                            style={{ width: `${progressPercent}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-[10px] text-slate-400 font-medium">
                          <span>Progresso do Envio</span>
                          <span>{progressPercent}% ({camp.sent_count}/{camp.total_recipients})</span>
                        </div>
                      </div>
                    </div>

                    {/* Action buttons at bottom */}
                    <div className="pt-2 border-t border-slate-100 dark:border-zinc-800/80">
                      {camp.status === 'draft' || camp.status === 'paused' ? (
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => launchCampaign(camp.id)}
                            className="flex items-center justify-center gap-1.5 rounded-xl bg-yellow-500 hover:bg-yellow-400 py-2 text-xs font-bold text-slate-950 cursor-pointer shadow-xs transition-all"
                          >
                            <Play className="h-3.5 w-3.5 fill-current" />
                            <span>Disparar</span>
                          </button>
                          <button
                            onClick={() => launchCampaign(camp.id)}
                            className={`flex items-center justify-center gap-1.5 rounded-xl border py-2 text-xs font-semibold cursor-pointer transition-all ${
                              isLight ? 'border-slate-200 bg-slate-50 text-slate-700' : 'border-zinc-800 bg-zinc-900 text-zinc-300'
                            }`}
                          >
                            <Clock className="h-3.5 w-3.5" />
                            <span>Agendar</span>
                          </button>
                        </div>
                      ) : camp.status === 'sending' ? (
                        <button
                          onClick={() => pauseCampaign(camp.id)}
                          className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 py-2 text-xs font-bold text-white cursor-pointer shadow-xs transition-all"
                        >
                          <Pause className="h-3.5 w-3.5" />
                          <span>Pausar Disparo</span>
                        </button>
                      ) : (
                        <button
                          className={`w-full flex items-center justify-center gap-1.5 rounded-xl border py-2 text-xs font-semibold cursor-pointer transition-all ${
                            isLight ? 'border-slate-200 bg-slate-50 text-slate-700' : 'border-zinc-800 bg-zinc-900 text-zinc-300'
                          }`}
                        >
                          <Eye className="h-3.5 w-3.5 text-indigo-400" />
                          <span>Acompanhar Envios & Relatório</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: TEMPLATES DE E-MAIL (Cards Grid matching Screenshot 3) */}
      {/* ========================================================================= */}
      {activeSubTab === 'templates' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((tmpl) => (
              <div
                key={tmpl.id}
                className={`rounded-2xl border p-5 flex flex-col justify-between space-y-4 transition-all hover:shadow-lg ${
                  isLight ? 'border-slate-200 bg-white hover:border-slate-300' : 'border-zinc-800 bg-zinc-950/70 hover:border-zinc-700'
                }`}
              >
                {/* Header: HTML badge & Trash */}
                <div className="flex items-center justify-between">
                  <span className="rounded-md bg-slate-500/10 text-slate-400 border border-slate-500/20 px-2 py-0.5 text-[11px] font-mono font-bold">
                    &lt;&gt; HTML
                  </span>

                  <button
                    onClick={() => deleteTemplate(tmpl.id)}
                    className="text-slate-400 hover:text-rose-500 transition-colors p-1"
                    title="Excluir template"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Content info */}
                <div className="space-y-1.5">
                  <h3 className={`font-bold text-sm line-clamp-1 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                    {tmpl.title}
                  </h3>
                  <p className="text-xs text-slate-400 line-clamp-2">
                    <strong>Assunto:</strong> {tmpl.subject}
                  </p>
                  <span className="text-[10px] text-slate-500 block pt-1">
                    Atualizado em: {new Date(tmpl.updated_at || tmpl.created_at).toLocaleDateString()}
                  </span>
                </div>

                {/* Bottom Actions matching screenshot */}
                <div className="pt-3 border-t border-slate-100 dark:border-zinc-800/80 flex items-center justify-between gap-2">
                  <button
                    onClick={() => setPreviewingTemplate(tmpl)}
                    className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 font-medium cursor-pointer"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    <span>Visualizar</span>
                  </button>

                  <button
                    onClick={() => handleEditTemplate(tmpl)}
                    className="flex items-center gap-1.5 text-xs text-yellow-500 hover:text-yellow-400 font-bold cursor-pointer"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                    <span>Editar HTML</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: PÚBLICOS / SEGMENTOS (Cards Grid matching Screenshot 4) */}
      {/* ========================================================================= */}
      {activeSubTab === 'audiences' && (
        <div className="space-y-4">
          <div className="space-y-1">
            <h2 className={`text-base font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
              Segmentos e Públicos Reutilizáveis
            </h2>
            <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
              Crie e gerencie públicos filtrados para disparos rápidos e organizados em lotes
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {audiences.map((aud) => (
              <div
                key={aud.id}
                className={`rounded-2xl border p-5 flex flex-col justify-between space-y-4 transition-all hover:shadow-lg ${
                  isLight ? 'border-slate-200 bg-white hover:border-slate-300' : 'border-zinc-800 bg-zinc-950/70 hover:border-zinc-700'
                }`}
              >
                {/* Header: SEGMENTO & count badge & Trash */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="rounded-md bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                      SEGMENTO
                    </span>
                    <span className="rounded-md bg-emerald-500/10 text-emerald-500 px-2 py-0.5 text-[11px] font-bold">
                      {aud.lead_count ? aud.lead_count.toLocaleString() : '0'} leads
                    </span>
                  </div>

                  <button
                    onClick={() => deleteAudience(aud.id)}
                    className="text-slate-400 hover:text-rose-500 transition-colors p-1"
                    title="Excluir público"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Audience Title & Filter tags */}
                <div className="space-y-2">
                  <h3 className={`font-bold text-sm line-clamp-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                    {aud.name}
                  </h3>

                  {/* Filter details */}
                  <div className="space-y-1 text-[11px] text-slate-400">
                    {aud.filters.city && aud.filters.city.length > 0 && (
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="font-semibold text-slate-500">Cidades:</span>
                        <span className="truncate">{aud.filters.city.join(', ')}</span>
                      </div>
                    )}
                    {aud.filters.niche && aud.filters.niche.length > 0 && (
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="font-semibold text-slate-500">Nichos:</span>
                        <span className="truncate">{aud.filters.niche.join(', ')}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-slate-500">Filtro MX:</span>
                      <span className="text-emerald-500">✓ Apenas e-mails auditados</span>
                    </div>
                  </div>
                </div>

                {/* Bottom Actions matching screenshot */}
                <div className="pt-3 border-t border-slate-100 dark:border-zinc-800/80 flex items-center justify-between gap-2">
                  <button
                    onClick={() => {
                      if (onNavigateToLeads) onNavigateToLeads();
                    }}
                    className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 font-medium cursor-pointer"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    <span>Ver Leads</span>
                  </button>

                  <button
                    onClick={() => handleOpenWizard(aud.id)}
                    className="flex items-center gap-1.5 text-xs text-yellow-500 hover:text-yellow-400 font-bold cursor-pointer"
                  >
                    <span>Nova Campanha</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CRIADOR DE CAMPANHA (WIZARD EM 4 PASSOS) */}
      {/* ========================================================================= */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div
            className={`w-full max-w-2xl rounded-2xl border p-6 shadow-2xl space-y-5 ${
              isLight ? 'border-slate-200 bg-white' : 'border-zinc-800 bg-zinc-900'
            }`}
          >
            {/* Steps indicator */}
            <div className={`flex items-center justify-between border-b pb-3 ${isLight ? 'border-slate-200' : 'border-zinc-800'}`}>
              <h2 className={`text-base font-bold flex items-center gap-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                <Send className="h-5 w-5 text-yellow-500" />
                Criador de Campanhas - Passo {wizardStep} de 4
              </h2>

              <div className="flex items-center gap-1 text-xs">
                {[1, 2, 3, 4].map((step) => (
                  <div
                    key={step}
                    className={`h-6 w-6 rounded-full flex items-center justify-center font-bold text-xs ${
                      wizardStep === step
                        ? 'bg-yellow-500 text-slate-950'
                        : wizardStep > step
                        ? 'bg-emerald-500/20 text-emerald-500'
                        : isLight
                        ? 'bg-slate-100 text-slate-400'
                        : 'bg-zinc-800 text-zinc-500'
                    }`}
                  >
                    {step}
                  </div>
                ))}
              </div>
            </div>

            {/* Step 1: Detalhes & Remetente Oficial */}
            {wizardStep === 1 && (
              <div className="space-y-4">
                <div>
                  <label className={`block text-xs font-medium mb-1 ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
                    Nome da Campanha *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Ex: LaLiga Espanha - Rodada 24h"
                    className={`w-full rounded-xl border px-3 py-2 text-xs focus:outline-none ${
                      isLight ? 'border-slate-300 bg-slate-50 text-slate-900' : 'border-zinc-800 bg-zinc-950 text-white'
                    }`}
                  />
                </div>

                <div>
                  <label className={`block text-xs font-medium mb-1 ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
                    Assunto do E-mail *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    placeholder="Ex: ⚽ ¿Ver todo el fútbol en 4K? (Test 24h Gratis)"
                    className={`w-full rounded-xl border px-3 py-2 text-xs focus:outline-none ${
                      isLight ? 'border-slate-300 bg-slate-50 text-slate-900' : 'border-zinc-800 bg-zinc-950 text-white'
                    }`}
                  />
                </div>

                {/* Sender Identity Quick Cards */}
                <div>
                  <label className={`block text-xs font-medium mb-2 ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
                    Identidade Oficial de Disparo (mail.universatv.com) *
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {VERIFIED_SENDERS.map((s) => {
                      const isSelected = formData.sender_email === s.email;
                      return (
                        <div
                          key={s.id}
                          onClick={() =>
                            setFormData({
                              ...formData,
                              sender_name: s.name,
                              sender_email: s.email,
                              reply_to: s.reply_to,
                            })
                          }
                          className={`flex items-start gap-3 rounded-xl border p-3 cursor-pointer transition-all ${
                            isSelected
                              ? 'border-yellow-500 bg-yellow-500/10 ring-2 ring-yellow-500/40 shadow-sm'
                              : isLight
                              ? 'border-slate-200 bg-slate-50 hover:bg-slate-100/80'
                              : 'border-zinc-800 bg-zinc-950 hover:bg-zinc-800/60'
                          }`}
                        >
                          <span className="text-2xl mt-0.5">{s.flag}</span>
                          <div className="space-y-0.5 flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className={`text-xs font-bold truncate ${isSelected ? 'text-yellow-500' : isLight ? 'text-slate-900' : 'text-white'}`}>
                                {s.name}
                              </span>
                              {isSelected && <CheckCircle className="h-4 w-4 text-yellow-500 shrink-0" />}
                            </div>
                            <span className="text-[11px] text-zinc-400 font-mono block truncate">{s.email}</span>
                            <span className="text-[10px] text-zinc-500 block line-clamp-1">{s.description}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={`block text-xs font-medium mb-1 ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>Nome do Remetente</label>
                    <input
                      type="text"
                      value={formData.sender_name}
                      onChange={(e) => setFormData({ ...formData, sender_name: e.target.value })}
                      className={`w-full rounded-xl border px-3 py-2 text-xs focus:outline-none ${
                        isLight ? 'border-slate-300 bg-slate-50 text-slate-900' : 'border-zinc-800 bg-zinc-950 text-white'
                      }`}
                    />
                  </div>
                  <div>
                    <label className={`block text-xs font-medium mb-1 ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>E-mail de Disparo (Resend)</label>
                    <input
                      type="email"
                      value={formData.sender_email}
                      onChange={(e) => setFormData({ ...formData, sender_email: e.target.value })}
                      className={`w-full rounded-xl border px-3 py-2 text-xs focus:outline-none ${
                        isLight ? 'border-slate-300 bg-slate-50 text-slate-900' : 'border-zinc-800 bg-zinc-950 text-white'
                      }`}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Audiência e Destinatários */}
            {wizardStep === 2 && (
              <div className="space-y-4">
                <div>
                  <label className={`block text-xs font-medium mb-1 ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
                    Selecionar Segmento / Audiência Pré-definida
                  </label>
                  <select
                    value={formData.target_audience_id}
                    onChange={(e) => handleAudienceChange(e.target.value)}
                    className={`w-full rounded-xl border px-3 py-2 text-xs focus:outline-none ${
                      isLight ? 'border-slate-300 bg-slate-50 text-slate-900' : 'border-zinc-800 bg-zinc-950 text-white'
                    }`}
                  >
                    <option value="all">Todos os Leads MX Verificados ({leads.filter((l) => !l.opted_out).length.toLocaleString()} contatos)</option>
                    {audiences.map((aud) => (
                      <option key={aud.id} value={aud.id}>
                        {aud.name} ({aud.lead_count ? aud.lead_count.toLocaleString() : '0'} leads)
                      </option>
                    ))}
                  </select>
                </div>

                <div
                  className={`rounded-xl border p-4 text-xs ${
                    isLight ? 'border-slate-200 bg-slate-50 text-slate-700' : 'border-zinc-800 bg-zinc-950 text-zinc-300'
                  }`}
                >
                  <span className="font-bold block text-sm mb-1 text-emerald-500">
                    ✓ {selectedLeadIds.length.toLocaleString()} Leads Selecionados para este Disparo
                  </span>
                  <p className="text-[11px] text-slate-400">
                    O sistema só envia para leads com MX auditado que não solicitaram cancelamento (Opt-out).
                  </p>
                </div>
              </div>
            )}

            {/* Step 3: Template & Mensagem */}
            {wizardStep === 3 && (
              <div className="space-y-4">
                <div>
                  <label className={`block text-xs font-medium mb-1 ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
                    Escolher Template HTML
                  </label>
                  <select
                    value={formData.template_id}
                    onChange={(e) => {
                      const tmpl = templates.find((t) => t.id === e.target.value);
                      setFormData({
                        ...formData,
                        template_id: e.target.value,
                        subject: tmpl?.subject || formData.subject,
                      });
                    }}
                    className={`w-full rounded-xl border px-3 py-2 text-xs focus:outline-none ${
                      isLight ? 'border-slate-300 bg-slate-50 text-slate-900' : 'border-zinc-800 bg-zinc-950 text-white'
                    }`}
                  >
                    {templates.map((tmpl) => (
                      <option key={tmpl.id} value={tmpl.id}>
                        {tmpl.title}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Preview snippet */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-semibold text-slate-400">Prévia do Conteúdo:</span>
                  <div
                    className={`h-48 overflow-y-auto rounded-xl border p-3 text-xs ${
                      isLight ? 'border-slate-200 bg-slate-50 text-slate-800' : 'border-zinc-800 bg-zinc-950 text-zinc-300'
                    }`}
                    dangerouslySetInnerHTML={{
                      __html: templates.find((t) => t.id === formData.template_id)?.html_content || '',
                    }}
                  />
                </div>
              </div>
            )}

            {/* Step 4: Revisão & Início */}
            {wizardStep === 4 && (
              <div className="space-y-4 text-xs">
                <div
                  className={`rounded-xl border p-4 space-y-2 ${
                    isLight ? 'border-slate-200 bg-slate-50 text-slate-800' : 'border-zinc-800 bg-zinc-950 text-zinc-200'
                  }`}
                >
                  <h4 className="font-bold text-sm text-yellow-500">Resumo da Campanha</h4>
                  <p>
                    <strong>Nome:</strong> {formData.title}
                  </p>
                  <p>
                    <strong>Assunto:</strong> {formData.subject}
                  </p>
                  <p>
                    <strong>Remetente Oficial:</strong> {formData.sender_name} &lt;{formData.sender_email}&gt;
                  </p>
                  <p>
                    <strong>Destinatários:</strong> {selectedLeadIds.length.toLocaleString()} e-mails válidos
                  </p>
                  <p>
                    <strong>Taxa de Envio:</strong> {formData.rate_limit_per_second} envios / segundo (Anti-Spam Resend)
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="launch_now"
                    checked={formData.launch_now}
                    onChange={(e) => setFormData({ ...formData, launch_now: e.target.checked })}
                    className="h-4 w-4 rounded accent-yellow-500"
                  />
                  <label htmlFor="launch_now" className={`font-semibold cursor-pointer ${isLight ? 'text-slate-800' : 'text-zinc-200'}`}>
                    Iniciar disparos imediatamente após criar a campanha
                  </label>
                </div>
              </div>
            )}

            {/* Navigation buttons */}
            <div className={`flex items-center justify-between border-t pt-4 ${isLight ? 'border-slate-200' : 'border-zinc-800'}`}>
              <button
                type="button"
                onClick={() => {
                  if (wizardStep > 1) setWizardStep((prev) => (prev - 1) as any);
                  else setIsCreateModalOpen(false);
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                {wizardStep === 1 ? 'Cancelar' : 'Voltar'}
              </button>

              {wizardStep < 4 ? (
                <button
                  type="button"
                  onClick={() => setWizardStep((prev) => (prev + 1) as any)}
                  className="px-5 py-2 rounded-xl bg-yellow-500 hover:bg-yellow-400 text-slate-950 text-xs font-bold shadow-md cursor-pointer"
                >
                  Próximo Passo →
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleCreateAndLaunch}
                  className="px-6 py-2 rounded-xl bg-gradient-to-r from-yellow-500 to-amber-500 hover:opacity-95 text-slate-950 text-xs font-extrabold shadow-lg cursor-pointer"
                >
                  Confirmar & Iniciar Campanha
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CRIAR / EDITAR TEMPLATE */}
      {isTemplateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div
            className={`w-full max-w-2xl rounded-2xl border p-6 shadow-2xl space-y-4 ${
              isLight ? 'border-slate-200 bg-white' : 'border-zinc-800 bg-zinc-900'
            }`}
          >
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className={`font-bold text-sm ${isLight ? 'text-slate-900' : 'text-white'}`}>
                {editingTemplate ? 'Editar Template HTML' : 'Criar Novo Template HTML'}
              </h3>
              <button onClick={() => setIsTemplateModalOpen(false)} className="text-slate-400 hover:text-slate-200">
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveTemplate} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Título do Template</label>
                <input
                  type="text"
                  required
                  value={templateFormData.title}
                  onChange={(e) => setTemplateFormData({ ...templateFormData, title: e.target.value })}
                  placeholder="Ex: Oferta Especial 4K LaLiga"
                  className={`w-full rounded-xl border px-3 py-2 text-xs focus:outline-none ${
                    isLight ? 'border-slate-200 bg-slate-50 text-slate-900' : 'border-zinc-800 bg-zinc-950 text-white'
                  }`}
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Assunto Padrão</label>
                <input
                  type="text"
                  required
                  value={templateFormData.subject}
                  onChange={(e) => setTemplateFormData({ ...templateFormData, subject: e.target.value })}
                  placeholder="Ex: ⚽ Todos os jogos em 4K (Teste 24 Horas Grátis)"
                  className={`w-full rounded-xl border px-3 py-2 text-xs focus:outline-none ${
                    isLight ? 'border-slate-200 bg-slate-50 text-slate-900' : 'border-zinc-800 bg-zinc-950 text-white'
                  }`}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-slate-400">Código HTML do E-mail</label>
                  <span className="text-[10px] text-slate-500">Tags: &#123;&#123;nome&#125;&#125;, &#123;&#123;cidade&#125;&#125;, &#123;&#123;link_descadastro&#125;&#125;</span>
                </div>
                <textarea
                  rows={8}
                  required
                  value={templateFormData.html_content}
                  onChange={(e) => setTemplateFormData({ ...templateFormData, html_content: e.target.value })}
                  className={`w-full rounded-xl border p-3 font-mono text-[11px] focus:outline-none ${
                    isLight ? 'border-slate-200 bg-slate-50 text-slate-900' : 'border-zinc-800 bg-zinc-950 text-white'
                  }`}
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsTemplateModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-slate-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-bold"
                >
                  Salvar Template
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: PREVIEW DE TEMPLATE */}
      {previewingTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div
            className={`w-full max-w-2xl rounded-2xl border p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col ${
              isLight ? 'border-slate-200 bg-white' : 'border-zinc-800 bg-zinc-900'
            }`}
          >
            <div className="flex items-center justify-between border-b pb-3 shrink-0">
              <div>
                <h3 className={`font-bold text-sm ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  {previewingTemplate.title}
                </h3>
                <span className="text-xs text-slate-400">Assunto: {previewingTemplate.subject}</span>
              </div>
              <button onClick={() => setPreviewingTemplate(null)} className="text-slate-400 hover:text-slate-200">
                ✕
              </button>
            </div>

            <div
              className={`flex-1 overflow-y-auto p-4 rounded-xl border ${
                isLight ? 'border-slate-200 bg-slate-50' : 'border-zinc-800 bg-zinc-950'
              }`}
              dangerouslySetInnerHTML={{ __html: previewingTemplate.html_content }}
            />

            <div className="shrink-0 pt-2 flex justify-end">
              <button
                onClick={() => setPreviewingTemplate(null)}
                className="px-4 py-2 rounded-xl bg-yellow-500 text-slate-950 font-bold text-xs"
              >
                Fechar Prévia
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: NOVO PÚBLICO SALVO */}
      {isAudienceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div
            className={`w-full max-w-md rounded-2xl border p-6 shadow-2xl space-y-4 ${
              isLight ? 'border-slate-200 bg-white' : 'border-zinc-800 bg-zinc-900'
            }`}
          >
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className={`font-bold text-sm ${isLight ? 'text-slate-900' : 'text-white'}`}>
                Salvar Novo Segmento de Público
              </h3>
              <button onClick={() => setIsAudienceModalOpen(false)} className="text-slate-400 hover:text-slate-200">
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveNewAudience} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Nome do Segmento *</label>
                <input
                  type="text"
                  required
                  value={audienceFormData.name}
                  onChange={(e) => setAudienceFormData({ ...audienceFormData, name: e.target.value })}
                  placeholder="Ex: ⚽ Peñas LaLiga Madrid & Torcedores"
                  className={`w-full rounded-xl border px-3 py-2 text-xs focus:outline-none ${
                    isLight ? 'border-slate-200 bg-slate-50 text-slate-900' : 'border-zinc-800 bg-zinc-950 text-white'
                  }`}
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Mercado / País</label>
                <select
                  value={audienceFormData.country}
                  onChange={(e) => setAudienceFormData({ ...audienceFormData, country: e.target.value })}
                  className={`w-full rounded-xl border px-3 py-2 text-xs focus:outline-none ${
                    isLight ? 'border-slate-200 bg-slate-50 text-slate-900' : 'border-zinc-800 bg-zinc-950 text-white'
                  }`}
                >
                  <option value="Espanha">🇪🇸 Espanha</option>
                  <option value="Brasil">🇧🇷 Brasil</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Filtrar por Cidade (Opcional)</label>
                <input
                  type="text"
                  value={audienceFormData.city}
                  onChange={(e) => setAudienceFormData({ ...audienceFormData, city: e.target.value })}
                  placeholder="Ex: Madrid, Barcelona, São Paulo..."
                  className={`w-full rounded-xl border px-3 py-2 text-xs focus:outline-none ${
                    isLight ? 'border-slate-200 bg-slate-50 text-slate-900' : 'border-zinc-800 bg-zinc-950 text-white'
                  }`}
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAudienceModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-slate-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-bold"
                >
                  Salvar Segmento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
