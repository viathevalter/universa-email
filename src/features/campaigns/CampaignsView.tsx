import React, { useState } from 'react';
import {
  Send,
  Plus,
  Play,
  Pause,
  CheckCircle2,
  XCircle,
  Clock,
  Users,
  ShieldCheck,
  ArrowRight,
  Sparkles,
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
  } = useApp();

  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3 | 4>(1);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(
    campaigns[0]?.id || null
  );

  // Wizard form data
  const [formData, setFormData] = useState({
    title: 'Campanha de Prospecção Q3',
    subject: 'Oportunidade de expansão comercial para a {{empresa}}',
    sender_name: tenant.sender_name || 'Comercial Kotrik',
    sender_email: tenant.marketing_sender_email || 'contato@kotrik.com.br',
    reply_to: 'suporte@kotrik.com.br',
    template_id: templates[0]?.id || '',
    target_type: 'all' as 'all' | 'audience' | 'mx_only',
    selected_audience_id: audiences[0]?.id || '',
    rate_limit_per_second: 2,
  });

  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Active campaign in queue monitor
  const activeCampaign = campaigns.find((c) => c.id === selectedCampaignId) || campaigns[0];
  const activeQueue = selectedCampaignId ? campaignQueue[selectedCampaignId] || [] : [];

  // Compute eligible leads for the campaign wizard
  const eligibleLeads = leads.filter((lead) => {
    if (lead.opted_out) return false;
    if (formData.target_type === 'mx_only') return lead.mx_valid;
    if (formData.target_type === 'audience') {
      const aud = audiences.find((a) => a.id === formData.selected_audience_id);
      if (!aud) return true;
      if (aud.filters.company_size && !aud.filters.company_size.includes(lead.company_size as string)) return false;
      if (aud.filters.province && !aud.filters.province.includes(lead.province || '')) return false;
      if (aud.filters.mx_valid_only && !lead.mx_valid) return false;
    }
    return true;
  });

  const handleCreateAndLaunch = async (autoStart: boolean) => {
    try {
      const targetIds = eligibleLeads.map((l) => l.id);
      const created = await createCampaign(
        {
          template_id: formData.template_id,
          title: formData.title,
          subject: formData.subject,
          sender_name: formData.sender_name,
          sender_email: formData.sender_email,
          reply_to: formData.reply_to,
          status: 'draft',
          rate_limit_per_second: formData.rate_limit_per_second,
          total_recipients: targetIds.length,
        },
        targetIds
      );

      setIsWizardOpen(false);
      setWizardStep(1);
      setSelectedCampaignId(created.id);

      if (autoStart) {
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
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <Send className="h-6 w-6 text-indigo-400" />
              Gestão de Campanhas & Motor de Disparos Resend
            </h1>
          </div>
          <p className="text-sm text-zinc-400 mt-1">
            Controle de taxa seguro (Rate Limiting), monitor de fila em tempo real e rastreamento de entregabilidade.
          </p>
        </div>

        <button
          onClick={() => {
            setIsWizardOpen(true);
            setWizardStep(1);
          }}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 via-purple-600 to-pink-600 px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-indigo-500/20 hover:opacity-95 transition-all cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          Nova Campanha
        </button>
      </div>

      {/* Notification Toast */}
      {notification && (
        <div
          className={`flex items-center justify-between rounded-xl p-4 text-sm border ${
            notification.type === 'success'
              ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/60'
              : 'bg-rose-950/40 text-rose-300 border-rose-800/60'
          }`}
        >
          <span>{notification.message}</span>
          <button onClick={() => setNotification(null)} className="text-xs opacity-70 hover:opacity-100">
            ✕ Fechar
          </button>
        </div>
      )}

      {/* Campaigns Grid & Queue Section */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left 4 Cols: Campaigns List */}
        <div className="lg:col-span-4 space-y-4">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 backdrop-blur-sm">
            <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-3">
              Suas Campanhas ({campaigns.length})
            </h2>

            {campaigns.length === 0 ? (
              <div className="text-center py-8 text-xs text-zinc-500">
                Nenhuma campanha criada ainda. Clique em "Nova Campanha" para começar.
              </div>
            ) : (
              <div className="space-y-2.5">
                {campaigns.map((camp) => {
                  const isSelected = activeCampaign?.id === camp.id;
                  const progress =
                    camp.total_recipients > 0
                      ? Math.round((camp.sent_count / camp.total_recipients) * 100)
                      : 0;

                  return (
                    <div
                      key={camp.id}
                      onClick={() => setSelectedCampaignId(camp.id)}
                      className={`cursor-pointer rounded-xl p-3.5 border transition-all text-left space-y-2 ${
                        isSelected
                          ? 'border-indigo-500 bg-indigo-950/30 text-white shadow-sm'
                          : 'border-zinc-800 bg-zinc-950 hover:border-zinc-700 text-zinc-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="font-semibold text-xs truncate max-w-[180px]">{camp.title}</div>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            camp.status === 'completed'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : camp.status === 'sending'
                              ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 animate-pulse'
                              : 'bg-zinc-800 text-zinc-400'
                          }`}
                        >
                          {camp.status === 'completed' ? 'Concluída' : camp.status === 'sending' ? 'Enviando...' : camp.status}
                        </span>
                      </div>

                      {/* Progress Bar */}
                      <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-indigo-500 h-1.5 rounded-full transition-all duration-300"
                          style={{ width: `${progress}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-zinc-400 pt-1">
                        <span>{camp.sent_count} / {camp.total_recipients} envios</span>
                        <span>{progress}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right 8 Cols: Active Campaign Queue Monitor */}
        <div className="lg:col-span-8 space-y-4">
          {activeCampaign ? (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 backdrop-blur-sm space-y-6">
              {/* Campaign Header & Control */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-800 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-white">{activeCampaign.title}</h2>
                    <span className="rounded bg-zinc-800 px-2 py-0.5 text-xs text-zinc-300">
                      Taxa: {activeCampaign.rate_limit_per_second} emails/seg
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 mt-1">
                    Assunto: <strong className="text-zinc-200">{activeCampaign.subject}</strong> | Remetente:{' '}
                    <strong className="text-zinc-200">{activeCampaign.sender_email}</strong>
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {activeCampaign.status !== 'sending' && activeCampaign.status !== 'completed' && (
                    <button
                      onClick={() => launchCampaign(activeCampaign.id)}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-500 shadow-sm cursor-pointer"
                    >
                      <Play className="h-3.5 w-3.5" />
                      Iniciar Disparos
                    </button>
                  )}
                  {activeCampaign.status === 'sending' && (
                    <button
                      onClick={() => pauseCampaign(activeCampaign.id)}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-amber-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-amber-500 shadow-sm cursor-pointer"
                    >
                      <Pause className="h-3.5 w-3.5" />
                      Pausar
                    </button>
                  )}
                </div>
              </div>

              {/* Live Metric Stats Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-xl bg-zinc-950 p-3 border border-zinc-800 text-center">
                  <div className="text-xs text-zinc-400">Total na Fila</div>
                  <div className="text-xl font-bold text-white mt-1">{activeCampaign.total_recipients}</div>
                </div>
                <div className="rounded-xl bg-zinc-950 p-3 border border-zinc-800 text-center">
                  <div className="text-xs text-emerald-400">Entregues</div>
                  <div className="text-xl font-bold text-emerald-400 mt-1">{activeCampaign.delivered_count}</div>
                </div>
                <div className="rounded-xl bg-zinc-950 p-3 border border-zinc-800 text-center">
                  <div className="text-xs text-purple-400">Aberturas</div>
                  <div className="text-xl font-bold text-purple-400 mt-1">{activeCampaign.opened_count}</div>
                </div>
                <div className="rounded-xl bg-zinc-950 p-3 border border-zinc-800 text-center">
                  <div className="text-xs text-rose-400">Falhas / Rejeições</div>
                  <div className="text-xl font-bold text-rose-400 mt-1">{activeCampaign.failed_count}</div>
                </div>
              </div>

              {/* Queue Items Table */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-3 flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5 text-indigo-400" />
                  Monitor da Fila em Tempo Real (`marketing_campaign_queue`)
                </h3>

                <div className="overflow-x-auto rounded-xl border border-zinc-800">
                  <table className="w-full text-left text-xs text-zinc-300">
                    <thead className="bg-zinc-950 text-[11px] font-semibold text-zinc-400 border-b border-zinc-800">
                      <tr>
                        <th className="p-3">Destinatário & Empresa</th>
                        <th className="p-3">E-mail</th>
                        <th className="p-3">Status</th>
                        <th className="p-3">Resend ID</th>
                        <th className="p-3 text-right">Horário Envio</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/60 bg-zinc-950/40">
                      {activeQueue.map((item) => (
                        <tr key={item.id} className="hover:bg-zinc-800/30">
                          <td className="p-3 font-medium text-white">
                            {item.lead_name}
                            <span className="text-[11px] text-zinc-400 block">{item.company_name}</span>
                          </td>
                          <td className="p-3 font-mono text-zinc-300">{item.lead_email}</td>
                          <td className="p-3">
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                                item.status === 'sent'
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                  : item.status === 'sending'
                                  ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 animate-pulse'
                                  : item.status === 'failed'
                                  ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                  : 'bg-zinc-800 text-zinc-400'
                              }`}
                            >
                              {item.status === 'sent' && <CheckCircle2 className="h-3 w-3" />}
                              {item.status === 'failed' && <XCircle className="h-3 w-3" />}
                              {item.status}
                            </span>
                            {item.error_message && (
                              <div className="text-[10px] text-rose-400 mt-0.5">{item.error_message}</div>
                            )}
                          </td>
                          <td className="p-3 font-mono text-[11px] text-zinc-500">
                            {item.resend_email_id ? item.resend_email_id.slice(0, 14) + '...' : '-'}
                          </td>
                          <td className="p-3 text-right text-zinc-400 text-[11px]">
                            {item.sent_at ? new Date(item.sent_at).toLocaleTimeString() : 'Aguardando'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/40 p-12 text-center">
              <Send className="mx-auto h-8 w-8 text-zinc-600 mb-3" />
              <h3 className="text-sm font-semibold text-zinc-300">Nenhuma campanha selecionada</h3>
              <p className="text-xs text-zinc-500 mt-1">
                Crie ou selecione uma campanha para visualizar o progresso dos envios.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Wizard Modal: Nova Campanha */}
      {isWizardOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl space-y-6">
            {/* Step Indicators */}
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <div>
                <h2 className="text-lg font-bold text-white">Criar Nova Campanha de Email</h2>
                <p className="text-xs text-zinc-400">Passo {wizardStep} de 4</p>
              </div>

              <div className="flex items-center gap-2">
                {[1, 2, 3, 4].map((step) => (
                  <div
                    key={step}
                    className={`h-2 rounded-full transition-all ${
                      wizardStep === step ? 'w-8 bg-indigo-500' : wizardStep > step ? 'w-4 bg-emerald-500' : 'w-4 bg-zinc-800'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Step 1: Detalhes do Envio */}
            {wizardStep === 1 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">Título Interno da Campanha *</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">Linha de Assunto (Subject) *</label>
                  <input
                    type="text"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-white focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1">Nome do Remetente</label>
                    <input
                      type="text"
                      value={formData.sender_name}
                      onChange={(e) => setFormData({ ...formData, sender_name: e.target.value })}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1">E-mail do Remetente (SPF/DKIM)</label>
                    <input
                      type="email"
                      value={formData.sender_email}
                      onChange={(e) => setFormData({ ...formData, sender_email: e.target.value })}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-white focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">Controle de Taxa (Rate Limit)</label>
                  <select
                    value={formData.rate_limit_per_second}
                    onChange={(e) => setFormData({ ...formData, rate_limit_per_second: Number(e.target.value) })}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-white focus:outline-none"
                  >
                    <option value={1}>1 e-mail por segundo (Máxima reputação)</option>
                    <option value={2}>2 e-mails por segundo (Recomendado Resend)</option>
                    <option value={5}>5 e-mails por segundo (Rápido)</option>
                  </select>
                </div>
              </div>
            )}

            {/* Step 2: Seleção de Público / Audiência */}
            {wizardStep === 2 && (
              <div className="space-y-4">
                <label className="block text-xs font-medium text-zinc-400 mb-1">Selecione o Público-Alvo</label>

                <div className="grid grid-cols-3 gap-3">
                  <div
                    onClick={() => setFormData({ ...formData, target_type: 'all' })}
                    className={`cursor-pointer rounded-xl p-3 border text-center transition-all ${
                      formData.target_type === 'all'
                        ? 'border-indigo-500 bg-indigo-950/30 text-white'
                        : 'border-zinc-800 bg-zinc-950 text-zinc-400'
                    }`}
                  >
                    <Users className="h-5 w-5 mx-auto mb-1 text-indigo-400" />
                    <div className="font-semibold text-xs">Todos os Leads</div>
                    <div className="text-[10px] text-zinc-500 mt-0.5">{leads.filter((l) => !l.opted_out).length} contatos</div>
                  </div>

                  <div
                    onClick={() => setFormData({ ...formData, target_type: 'mx_only' })}
                    className={`cursor-pointer rounded-xl p-3 border text-center transition-all ${
                      formData.target_type === 'mx_only'
                        ? 'border-indigo-500 bg-indigo-950/30 text-white'
                        : 'border-zinc-800 bg-zinc-950 text-zinc-400'
                    }`}
                  >
                    <ShieldCheck className="h-5 w-5 mx-auto mb-1 text-emerald-400" />
                    <div className="font-semibold text-xs">Apenas MX Válidos</div>
                    <div className="text-[10px] text-zinc-500 mt-0.5">{leads.filter((l) => l.mx_valid && !l.opted_out).length} contatos</div>
                  </div>

                  <div
                    onClick={() => setFormData({ ...formData, target_type: 'audience' })}
                    className={`cursor-pointer rounded-xl p-3 border text-center transition-all ${
                      formData.target_type === 'audience'
                        ? 'border-indigo-500 bg-indigo-950/30 text-white'
                        : 'border-zinc-800 bg-zinc-950 text-zinc-400'
                    }`}
                  >
                    <Sparkles className="h-5 w-5 mx-auto mb-1 text-purple-400" />
                    <div className="font-semibold text-xs">Audiência Salva</div>
                    <div className="text-[10px] text-zinc-500 mt-0.5">{audiences.length} listas</div>
                  </div>
                </div>

                {formData.target_type === 'audience' && (
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1">Escolha a Audiência</label>
                    <select
                      value={formData.selected_audience_id}
                      onChange={(e) => setFormData({ ...formData, selected_audience_id: e.target.value })}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-white focus:outline-none"
                    >
                      {audiences.map((aud) => (
                        <option key={aud.id} value={aud.id}>
                          {aud.name} ({aud.lead_count || '0'} leads)
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="rounded-xl bg-indigo-950/20 border border-indigo-900/50 p-4 text-xs text-indigo-300">
                  Total de destinatários aptos para este disparo: <strong>{eligibleLeads.length} leads</strong> (Opt-outs excluídos automaticamente).
                </div>
              </div>
            )}

            {/* Step 3: Seleção do Template */}
            {wizardStep === 3 && (
              <div className="space-y-4">
                <label className="block text-xs font-medium text-zinc-400 mb-1">Escolha o Template de Email</label>
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {templates.map((tmpl) => {
                    const isSelected = formData.template_id === tmpl.id;
                    return (
                      <div
                        key={tmpl.id}
                        onClick={() => setFormData({ ...formData, template_id: tmpl.id })}
                        className={`cursor-pointer rounded-xl p-3 border transition-all text-left ${
                          isSelected
                            ? 'border-indigo-500 bg-indigo-950/40 text-white'
                            : 'border-zinc-800 bg-zinc-950 text-zinc-300'
                        }`}
                      >
                        <div className="font-semibold text-xs flex items-center justify-between">
                          <span>{tmpl.title}</span>
                          {isSelected && <CheckCircle2 className="h-4 w-4 text-indigo-400" />}
                        </div>
                        <div className="text-[11px] text-zinc-400 mt-1">Assunto: {tmpl.subject}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Step 4: Resumo & Confirmação */}
            {wizardStep === 4 && (
              <div className="space-y-4 text-xs">
                <div className="rounded-xl bg-zinc-950 p-4 border border-zinc-800 space-y-2">
                  <div className="font-semibold text-sm text-white mb-2">Resumo da Campanha</div>
                  <div className="flex justify-between text-zinc-400">
                    <span>Título:</span>
                    <span className="text-white font-medium">{formData.title}</span>
                  </div>
                  <div className="flex justify-between text-zinc-400">
                    <span>Assunto:</span>
                    <span className="text-white font-medium">{formData.subject}</span>
                  </div>
                  <div className="flex justify-between text-zinc-400">
                    <span>Remetente:</span>
                    <span className="text-white font-medium">{formData.sender_name} &lt;{formData.sender_email}&gt;</span>
                  </div>
                  <div className="flex justify-between text-zinc-400">
                    <span>Destinatários:</span>
                    <span className="text-emerald-400 font-bold">{eligibleLeads.length} leads</span>
                  </div>
                  <div className="flex justify-between text-zinc-400">
                    <span>Velocidade de Envio:</span>
                    <span className="text-indigo-400 font-medium">{formData.rate_limit_per_second} disparos/seg</span>
                  </div>
                </div>
              </div>
            )}

            {/* Wizard Navigation Footer */}
            <div className="flex items-center justify-between pt-4 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => {
                  if (wizardStep === 1) setIsWizardOpen(false);
                  else setWizardStep((prev) => (prev - 1) as any);
                }}
                className="rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-2 text-xs font-semibold text-zinc-300 cursor-pointer"
              >
                {wizardStep === 1 ? 'Cancelar' : 'Voltar'}
              </button>

              {wizardStep < 4 ? (
                <button
                  type="button"
                  onClick={() => setWizardStep((prev) => (prev + 1) as any)}
                  className="inline-flex items-center gap-1 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 cursor-pointer"
                >
                  <span>Avançar</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleCreateAndLaunch(false)}
                    className="rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-2 text-xs font-semibold text-zinc-300 hover:bg-zinc-700 cursor-pointer"
                  >
                    Salvar como Rascunho
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCreateAndLaunch(true)}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-emerald-500/20 hover:opacity-95 cursor-pointer"
                  >
                    <Send className="h-3.5 w-3.5" />
                    Iniciar Envio Agora
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
