import React, { useState } from 'react';
import {
  Send,
  Plus,
  Play,
  Pause,
  CheckCircle,
  Gauge,
} from 'lucide-react';
import { useApp } from '../../shared/context/AppContext';
import confetti from 'canvas-confetti';

export const CampaignsView: React.FC = () => {
  const {
    tenant,
    campaigns,
    campaignQueue,
    templates,
    leads,
    audiences,
    createCampaign,
    launchCampaign,
    pauseCampaign,
    theme,
  } = useApp();

  const isLight = theme === 'light';

  // Modal / Wizard state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3 | 4>(1);

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    subject: '',
    sender_name: tenant.sender_name || 'Time UniversaEmail',
    sender_email: tenant.marketing_sender_email || 'contato@universaemail.com',
    reply_to: 'suporte@universaemail.com',
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
      setSelectedLeadIds(leads.filter((l) => !l.opted_out).map((l) => l.id));
      return;
    }

    const aud = audiences.find((a) => a.id === audienceId);
    if (!aud) return;

    const filtered = leads.filter((lead) => {
      if (lead.opted_out) return false;
      if (aud.filters.company_size && !aud.filters.company_size.includes(lead.company_size as any)) return false;
      if (aud.filters.province && !aud.filters.province.includes(lead.province as any)) return false;
      if (aud.filters.mx_valid_only && !lead.mx_valid) return false;
      return true;
    });

    setSelectedLeadIds(filtered.map((l) => l.id));
  };

  const handleOpenWizard = () => {
    setIsCreateModalOpen(true);
    setWizardStep(1);
    setSelectedLeadIds(leads.filter((l) => !l.opted_out && l.mx_valid).map((l) => l.id));
    setFormData({
      title: 'Disparo B2B - Novos Leads Qualificados',
      subject: templates[0]?.subject || 'Oportunidade Comercial',
      sender_name: tenant.sender_name || 'Time UniversaEmail',
      sender_email: tenant.marketing_sender_email || 'contato@universaemail.com',
      reply_to: 'suporte@universaemail.com',
      template_id: templates[0]?.id || '',
      target_audience_id: '',
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
        launchCampaign(created.id);
        try {
          confetti({ particleCount: 70, spread: 80, origin: { y: 0.6 } });
        } catch {
          // Ignora se canvas não estiver disponível
        }
        setNotification({ type: 'success', message: 'Campanha criada e disparo iniciado via Resend!' });
      } else {
        setNotification({ type: 'success', message: 'Campanha criada e enfileirada como rascunho.' });
      }
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Erro ao criar campanha.' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className={`text-2xl font-bold tracking-tight flex items-center gap-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>
              <Send className="h-6 w-6 text-indigo-500" />
              Campanhas & Motor de Disparo Resend
            </h1>
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-semibold border ${
                isLight ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
              }`}
            >
              {campaigns.length} Campanhas
            </span>
          </div>
          <p className={`text-sm mt-1 ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
            Disparo com rate limiting inteligente, fila assíncrona resiliente e acompanhamento em tempo real.
          </p>
        </div>

        <button
          onClick={handleOpenWizard}
          className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-indigo-500/20 hover:opacity-95 transition-all cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          Criar Nova Campanha
        </button>
      </div>

      {/* Notification Toast */}
      {notification && (
        <div
          className={`flex items-center justify-between rounded-xl p-4 text-sm border ${
            notification.type === 'success'
              ? isLight
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-emerald-950/40 text-emerald-300 border-emerald-800/60'
              : isLight
              ? 'bg-rose-50 text-rose-800 border-rose-200'
              : 'bg-rose-950/40 text-rose-300 border-rose-800/60'
          }`}
        >
          <span>{notification.message}</span>
          <button onClick={() => setNotification(null)} className="text-xs opacity-70 hover:opacity-100 cursor-pointer">
            ✕ Fechar
          </button>
        </div>
      )}

      {/* Campaigns List */}
      <div className="space-y-4">
        {campaigns.length === 0 ? (
          <div
            className={`rounded-2xl border p-12 text-center backdrop-blur-sm ${
              isLight ? 'border-slate-200 bg-white shadow-xs' : 'border-zinc-800 bg-zinc-900/60'
            }`}
          >
            <Send className="mx-auto h-8 w-8 text-slate-400 mb-3" />
            <h3 className={`text-sm font-semibold ${isLight ? 'text-slate-800' : 'text-zinc-200'}`}>Nenhuma campanha criada</h3>
            <p className={`text-xs mt-1 max-w-sm mx-auto ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
              Dispare emails para seus leads segmentados usando a conexão com a API do Resend.
            </p>
            <button
              onClick={handleOpenWizard}
              className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 cursor-pointer shadow-xs"
            >
              <Plus className="h-4 w-4" />
              Criar Primeira Campanha
            </button>
          </div>
        ) : (
          campaigns.map((camp) => {
            const queue = campaignQueue[camp.id] || [];
            const progressPercent =
              camp.total_recipients > 0 ? Math.round((camp.sent_count / camp.total_recipients) * 100) : 0;

            return (
              <div
                key={camp.id}
                className={`rounded-2xl border p-6 backdrop-blur-sm shadow-xs space-y-4 transition-all ${
                  isLight ? 'border-slate-200 bg-white' : 'border-zinc-800 bg-zinc-900/60'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className={`text-base font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>{camp.title}</h3>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-semibold border ${
                          camp.status === 'completed'
                            ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                            : camp.status === 'sending'
                            ? 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20 animate-pulse'
                            : camp.status === 'paused'
                            ? 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                            : isLight
                            ? 'bg-slate-100 text-slate-600 border-slate-200'
                            : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                        }`}
                      >
                        {camp.status === 'completed'
                          ? 'Concluída'
                          : camp.status === 'sending'
                          ? 'Enviando Lote...'
                          : camp.status === 'paused'
                          ? 'Pausada'
                          : 'Rascunho'}
                      </span>
                    </div>
                    <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                      Assunto: <strong className={isLight ? 'text-slate-700' : 'text-zinc-300'}>{camp.subject}</strong> • Remetente:{' '}
                      {camp.sender_name} &lt;{camp.sender_email}&gt;
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {camp.status === 'draft' || camp.status === 'paused' ? (
                      <button
                        onClick={() => launchCampaign(camp.id)}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-500 cursor-pointer shadow-xs"
                      >
                        <Play className="h-3.5 w-3.5" />
                        {camp.status === 'paused' ? 'Retomar Envio' : 'Iniciar Disparo'}
                      </button>
                    ) : camp.status === 'sending' ? (
                      <button
                        onClick={() => pauseCampaign(camp.id)}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-amber-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-amber-500 cursor-pointer shadow-xs"
                      >
                        <Pause className="h-3.5 w-3.5" />
                        Pausar
                      </button>
                    ) : (
                      <div className="flex items-center gap-1 text-xs text-emerald-500 font-semibold">
                        <CheckCircle className="h-4 w-4" />
                        Finalizado
                      </div>
                    )}
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1.5">
                  <div className={`flex justify-between text-xs font-medium ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
                    <span>
                      Progresso do Disparo: {camp.sent_count} de {camp.total_recipients} e-mails
                    </span>
                    <span>{progressPercent}%</span>
                  </div>
                  <div className={`h-2.5 w-full overflow-hidden rounded-full ${isLight ? 'bg-slate-100' : 'bg-zinc-800'}`}>
                    <div
                      className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 transition-all duration-300 rounded-full"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>

                {/* Campaign Analytics Stats */}
                <div
                  className={`grid grid-cols-2 gap-3 sm:grid-cols-4 rounded-xl border p-3.5 text-xs ${
                    isLight ? 'border-slate-200 bg-slate-50' : 'border-zinc-800/80 bg-zinc-950/60'
                  }`}
                >
                  <div>
                    <span className={isLight ? 'text-slate-400 block' : 'text-zinc-500 block'}>Entregues</span>
                    <span className={`font-bold text-sm ${isLight ? 'text-slate-900' : 'text-white'}`}>{camp.delivered_count}</span>
                  </div>
                  <div>
                    <span className={isLight ? 'text-slate-400 block' : 'text-zinc-500 block'}>Aberturas</span>
                    <span className="font-bold text-sm text-emerald-500">{camp.opened_count}</span>
                  </div>
                  <div>
                    <span className={isLight ? 'text-slate-400 block' : 'text-zinc-500 block'}>Cliques</span>
                    <span className="font-bold text-sm text-indigo-500">{camp.clicked_count}</span>
                  </div>
                  <div>
                    <span className={isLight ? 'text-slate-400 block' : 'text-zinc-500 block'}>Taxa Resend</span>
                    <span className={`font-semibold ${isLight ? 'text-slate-700' : 'text-zinc-300'}`}>{camp.rate_limit_per_second || 2} emails/seg</span>
                  </div>
                </div>

                {/* Live Queue Items Drawer */}
                {queue.length > 0 && (
                  <details className="text-xs group">
                    <summary className={`cursor-pointer font-semibold transition-colors ${isLight ? 'text-indigo-600 hover:text-indigo-700' : 'text-indigo-400 hover:text-indigo-300'}`}>
                      Ver Fila Individual de Disparos ({queue.length} contatos)
                    </summary>
                    <div
                      className={`mt-3 max-h-48 overflow-y-auto rounded-xl border p-2 divide-y ${
                        isLight
                          ? 'border-slate-200 bg-white divide-slate-100'
                          : 'border-zinc-800 bg-zinc-950 divide-zinc-800/60'
                      }`}
                    >
                      {queue.map((item) => (
                        <div key={item.id} className="py-1.5 px-2 flex items-center justify-between">
                          <div>
                            <span className={`font-semibold ${isLight ? 'text-slate-800' : 'text-zinc-200'}`}>{item.lead_name}</span>
                            <span className={`text-[11px] ml-2 ${isLight ? 'text-slate-400' : 'text-zinc-500'}`}>({item.lead_email})</span>
                          </div>
                          <span
                            className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                              item.status === 'sent'
                                ? 'bg-emerald-500/10 text-emerald-500'
                                : item.status === 'sending'
                                ? 'bg-indigo-500/10 text-indigo-500'
                                : item.status === 'failed'
                                ? 'bg-rose-500/10 text-rose-500'
                                : isLight
                                ? 'bg-slate-100 text-slate-500'
                                : 'bg-zinc-800 text-zinc-400'
                            }`}
                          >
                            {item.status === 'sent'
                              ? 'Enviado'
                              : item.status === 'sending'
                              ? 'Enviando'
                              : item.status === 'failed'
                              ? 'Falhou'
                              : 'Pendente'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </details>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Wizard Modal: Criar Campanha */}
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
                <Send className="h-5 w-5 text-indigo-500" />
                Criador de Campanhas - Passo {wizardStep} de 4
              </h2>

              <div className="flex items-center gap-1 text-xs">
                {[1, 2, 3, 4].map((step) => (
                  <div
                    key={step}
                    className={`h-6 w-6 rounded-full flex items-center justify-center font-bold text-xs ${
                      wizardStep === step
                        ? 'bg-indigo-600 text-white'
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

            {/* Step 1: Detalhes & Remetente */}
            {wizardStep === 1 && (
              <div className="space-y-4">
                <div>
                  <label className={`block text-xs font-medium mb-1 ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>Nome da Campanha *</label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Ex: Prospecção Q3 - Indústrias SP"
                    className={`w-full rounded-xl border px-3 py-2 text-xs focus:outline-none ${
                      isLight ? 'border-slate-300 bg-slate-50 text-slate-900' : 'border-zinc-800 bg-zinc-950 text-white'
                    }`}
                  />
                </div>

                <div>
                  <label className={`block text-xs font-medium mb-1 ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>Assunto do E-mail *</label>
                  <input
                    type="text"
                    required
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    placeholder="Ex: Oportunidade para a {{empresa}}"
                    className={`w-full rounded-xl border px-3 py-2 text-xs focus:outline-none ${
                      isLight ? 'border-slate-300 bg-slate-50 text-slate-900' : 'border-zinc-800 bg-zinc-950 text-white'
                    }`}
                  />
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
                    <option value="all">Todos os Leads MX Verificados ({leads.filter((l) => !l.opted_out).length} contatos)</option>
                    {audiences.map((aud) => (
                      <option key={aud.id} value={aud.id}>
                        {aud.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div
                  className={`rounded-xl border p-4 text-xs space-y-2 ${
                    isLight ? 'border-slate-200 bg-slate-50' : 'border-zinc-800 bg-zinc-950'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={isLight ? 'text-slate-600 font-semibold' : 'text-zinc-400 font-semibold'}>Total de Destinatários Selecionados:</span>
                    <span className="font-bold text-sm text-indigo-500">{selectedLeadIds.length} leads</span>
                  </div>
                  <p className={`text-[11px] ${isLight ? 'text-slate-500' : 'text-zinc-500'}`}>
                    Contatos descadastrados (opt-out) são bloqueados automaticamente pelo sistema de governança.
                  </p>
                </div>
              </div>
            )}

            {/* Step 3: Seleção do Template */}
            {wizardStep === 3 && (
              <div className="space-y-4">
                <div>
                  <label className={`block text-xs font-medium mb-1 ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>Escolha o Template de E-mail</label>
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

                {/* Template Preview */}
                {templates.find((t) => t.id === formData.template_id) && (
                  <div
                    className={`rounded-xl border p-3 text-xs max-h-40 overflow-y-auto ${
                      isLight ? 'border-slate-200 bg-slate-50 text-slate-700' : 'border-zinc-800 bg-zinc-950 text-zinc-300'
                    }`}
                  >
                    <div className={`font-semibold mb-1 ${isLight ? 'text-slate-900' : 'text-white'}`}>Prévia do Conteúdo:</div>
                    <div
                      dangerouslySetInnerHTML={{
                        __html: templates.find((t) => t.id === formData.template_id)?.html_content || '',
                      }}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Step 4: Configuração de Disparo & Lançamento */}
            {wizardStep === 4 && (
              <div className="space-y-4">
                <div
                  className={`rounded-xl border p-4 text-xs space-y-3 ${
                    isLight ? 'border-slate-200 bg-slate-50' : 'border-zinc-800 bg-zinc-950'
                  }`}
                >
                  <div className="flex items-center gap-2 text-indigo-500 font-bold">
                    <Gauge className="h-4 w-4" />
                    <span>Controle de Vazão Resend (Rate Limiting)</span>
                  </div>
                  <div>
                    <label className={`block text-[11px] mb-1 ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>Taxa de Envios por Segundo</label>
                    <select
                      value={formData.rate_limit_per_second}
                      onChange={(e) => setFormData({ ...formData, rate_limit_per_second: Number(e.target.value) })}
                      className={`w-full rounded-lg border px-3 py-2 text-xs focus:outline-none ${
                        isLight ? 'border-slate-300 bg-white text-slate-900' : 'border-zinc-800 bg-zinc-900 text-white'
                      }`}
                    >
                      <option value={1}>1 e-mail / segundo (Recomendado para Cold Email)</option>
                      <option value={2}>2 e-mails / segundo (Padrão Resend)</option>
                      <option value={5}>5 e-mails / segundo (Alta Velocidade)</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="launch_now_check"
                    checked={formData.launch_now}
                    onChange={(e) => setFormData({ ...formData, launch_now: e.target.checked })}
                    className="rounded border-slate-300 bg-white text-indigo-600 focus:ring-0 cursor-pointer"
                  />
                  <label htmlFor="launch_now_check" className={`text-xs font-semibold cursor-pointer ${isLight ? 'text-slate-800' : 'text-white'}`}>
                    Iniciar processamento da fila imediatamente após salvar
                  </label>
                </div>
              </div>
            )}

            {/* Wizard Navigation Footer */}
            <div className={`flex items-center justify-between pt-3 border-t ${isLight ? 'border-slate-200' : 'border-zinc-800'}`}>
              <button
                type="button"
                onClick={() => {
                  if (wizardStep > 1) {
                    setWizardStep((prev) => (prev - 1) as any);
                  } else {
                    setIsCreateModalOpen(false);
                  }
                }}
                className={`rounded-xl border px-4 py-2 text-xs font-semibold cursor-pointer ${
                  isLight
                    ? 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                    : 'border-zinc-700 bg-zinc-800 text-zinc-300'
                }`}
              >
                {wizardStep === 1 ? 'Cancelar' : 'Voltar'}
              </button>

              {wizardStep < 4 ? (
                <button
                  type="button"
                  onClick={() => setWizardStep((prev) => (prev + 1) as any)}
                  className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 cursor-pointer shadow-xs"
                >
                  Próximo Passo →
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleCreateAndLaunch}
                  className="rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-2 text-xs font-semibold text-white shadow-lg shadow-emerald-500/20 hover:opacity-95 cursor-pointer"
                >
                  Finalizar & Disparar Campanha
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
