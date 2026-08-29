import React, { useState } from 'react';
import {
  FileCode,
  Plus,
  Trash2,
  Save,
  Monitor,
  Smartphone,
  Eye,
  Tag,
  Copy,
  Check,
} from 'lucide-react';
import { useApp } from '../../shared/context/AppContext';
import { interpolateEmailVariables } from '../../shared/services/resendService';
import type { MarketingTemplate, Lead } from '../../types';

export const TemplatesView: React.FC = () => {
  const { templates, addTemplate, updateTemplate, deleteTemplate, leads, theme } = useApp();

  const isLight = theme === 'light';

  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(
    templates[0]?.id || ''
  );
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [copiedTag, setCopiedTag] = useState<string | null>(null);

  const activeTemplate = templates.find((t) => t.id === selectedTemplateId) || templates[0];

  // Form State
  const [formData, setFormData] = useState({
    title: activeTemplate?.title || '',
    subject: activeTemplate?.subject || '',
    html_content: activeTemplate?.html_content || '',
  });

  // Sample Lead for Live Preview interpolation
  const sampleLead: Lead = leads[0] || {
    id: 'sample_lead',
    tenant_id: '00000000-0000-0000-0000-000000000001',
    name: 'Carlos Eduardo Silveira',
    company_name: 'Nexus Logística e Transportes',
    email: 'carlos.silveira@nexuslog.com.br',
    phone: '+55 (11) 98765-4321',
    website: 'https://nexuslog.com.br',
    sector: 'Logística & Transportes',
    role: 'Diretor de Operações (COO)',
    company_size: 'Tier 1 (Enterprise)',
    city: 'São Paulo',
    province: 'SP',
    country: 'Brasil',
    tags: ['B2B'],
    status: 'qualified',
    opted_out: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const dynamicTags = [
    { tag: '{{nome}}', label: 'Nome do Contato', example: sampleLead.name },
    { tag: '{{empresa}}', label: 'Nome da Empresa', example: sampleLead.company_name },
    { tag: '{{cargo}}', label: 'Cargo / Posição', example: sampleLead.role },
    { tag: '{{cidade}}', label: 'Cidade', example: sampleLead.city },
    { tag: '{{link_descadastro}}', label: 'Link de Opt-out', example: 'https://universaemail.com/opt-out' },
  ];

  const handleStartCreate = () => {
    setIsCreatingNew(true);
    setFormData({
      title: 'Novo Template de Prospecção',
      subject: 'Oportunidade para a {{empresa}}',
      html_content: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #18181b; line-height: 1.6; padding: 20px;">
  <p>Olá <strong>{{nome}}</strong>,</p>
  <p>Espero que este e-mail o encontre bem. Acompanho o trabalho da <strong>{{empresa}}</strong> em {{cidade}} e gostaria de compartilhar uma solução para otimizar seus resultados.</p>
  <p>Podemos agendar uma breve conversa de 10 minutos?</p>
  <p>Atenciosamente,<br><strong>Equipe Comercial</strong></p>
</div>`,
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.subject || !formData.html_content) return;

    if (isCreatingNew) {
      const created = await addTemplate({
        title: formData.title,
        subject: formData.subject,
        html_content: formData.html_content,
        variables: dynamicTags.map((t) => t.tag),
      });
      setIsCreatingNew(false);
      setSelectedTemplateId(created.id);
    } else if (activeTemplate) {
      await updateTemplate(activeTemplate.id, {
        title: formData.title || activeTemplate.title,
        subject: formData.subject || activeTemplate.subject,
        html_content: formData.html_content || activeTemplate.html_content,
      });
    }
  };

  const handleSelectTemplate = (tmpl: MarketingTemplate) => {
    setIsCreatingNew(false);
    setSelectedTemplateId(tmpl.id);
    setFormData({
      title: tmpl.title,
      subject: tmpl.subject,
      html_content: tmpl.html_content,
    });
  };

  const insertTag = (tag: string) => {
    setFormData((prev) => ({
      ...prev,
      html_content: prev.html_content + ` ${tag} `,
    }));
    setCopiedTag(tag);
    setTimeout(() => setCopiedTag(null), 1500);
  };

  // Interpolated Preview Content
  const previewSubject = interpolateEmailVariables(formData.subject, sampleLead);
  const previewHtml = interpolateEmailVariables(formData.html_content, sampleLead);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className={`text-2xl font-bold tracking-tight flex items-center gap-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>
              <FileCode className="h-6 w-6 text-indigo-500" />
              Editor de Templates & Variáveis Dinâmicas
            </h1>
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-semibold border ${
                isLight ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
              }`}
            >
              {templates.length} Modelos
            </span>
          </div>
          <p className={`text-sm mt-1 ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
            Crie emails altamente personalizados com tags dinâmicas e teste a renderização em tempo real para Desktop e Mobile.
          </p>
        </div>

        <button
          onClick={handleStartCreate}
          className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-indigo-500/20 hover:opacity-95 transition-all cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          Novo Template
        </button>
      </div>

      {/* Main Grid: Sidebar + Editor + Live Preview */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Templates List Sidebar (3 cols) */}
        <div className="lg:col-span-3 space-y-3">
          <div
            className={`rounded-2xl border p-4 backdrop-blur-sm shadow-xs ${
              isLight ? 'border-slate-200 bg-white' : 'border-zinc-800 bg-zinc-900/60'
            }`}
          >
            <h2 className={`text-xs font-bold uppercase tracking-wider mb-3 ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
              Seus Templates
            </h2>
            <div className="space-y-2">
              {templates.map((tmpl) => {
                const isSelected = tmpl.id === selectedTemplateId && !isCreatingNew;
                return (
                  <div
                    key={tmpl.id}
                    onClick={() => handleSelectTemplate(tmpl)}
                    className={`rounded-xl border p-3 cursor-pointer transition-all ${
                      isSelected
                        ? isLight
                          ? 'border-indigo-400 bg-indigo-50/70 shadow-xs'
                          : 'border-indigo-500/50 bg-indigo-500/10 shadow-xs'
                        : isLight
                        ? 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                        : 'border-zinc-800/80 bg-zinc-950/40 hover:bg-zinc-800/40'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <h3 className={`font-semibold text-xs truncate ${isSelected ? 'text-indigo-600' : isLight ? 'text-slate-800' : 'text-zinc-200'}`}>
                        {tmpl.title}
                      </h3>
                      {templates.length > 1 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteTemplate(tmpl.id);
                          }}
                          className={`opacity-60 hover:opacity-100 transition-opacity p-1 ${isLight ? 'text-slate-400 hover:text-rose-600' : 'text-zinc-500 hover:text-rose-400'}`}
                          title="Excluir"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                    <div className={`text-[11px] mt-1 truncate ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>{tmpl.subject}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Dynamic Tags Toolbox */}
          <div
            className={`rounded-2xl border p-4 backdrop-blur-sm ${
              isLight ? 'border-slate-200 bg-white shadow-xs' : 'border-zinc-800 bg-zinc-900/60'
            }`}
          >
            <div className="flex items-center gap-1.5 mb-2 text-indigo-500">
              <Tag className="h-4 w-4" />
              <h2 className="text-xs font-bold uppercase tracking-wider">Tags Dinâmicas</h2>
            </div>
            <p className={`text-[11px] mb-3 ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
              Clique para inserir no conteúdo do e-mail:
            </p>
            <div className="space-y-2">
              {dynamicTags.map((tagItem) => (
                <button
                  key={tagItem.tag}
                  type="button"
                  onClick={() => insertTag(tagItem.tag)}
                  className={`w-full flex items-center justify-between rounded-lg border p-2 text-left transition-all text-xs cursor-pointer ${
                    isLight
                      ? 'border-slate-200 bg-slate-50 hover:bg-indigo-50 hover:border-indigo-200 text-slate-800'
                      : 'border-zinc-800 bg-zinc-950/60 hover:bg-indigo-950/20 hover:border-indigo-500/30 text-zinc-300'
                  }`}
                >
                  <div>
                    <span className="font-mono text-indigo-500 font-semibold">{tagItem.tag}</span>
                    <span className={`block text-[10px] ${isLight ? 'text-slate-500' : 'text-zinc-500'}`}>{tagItem.label}</span>
                  </div>
                  {copiedTag === tagItem.tag ? (
                    <Check className="h-3.5 w-3.5 text-emerald-500" />
                  ) : (
                    <Copy className="h-3.5 w-3.5 opacity-40 hover:opacity-100" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Editor Form (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <form
            onSubmit={handleSave}
            className={`rounded-2xl border p-5 backdrop-blur-sm shadow-xs space-y-4 ${
              isLight ? 'border-slate-200 bg-white' : 'border-zinc-800 bg-zinc-900/60'
            }`}
          >
            <div className="flex items-center justify-between">
              <h2 className={`text-sm font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                {isCreatingNew ? 'Criando Novo Template' : 'Editar Template'}
              </h2>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 cursor-pointer shadow-xs"
              >
                <Save className="h-3.5 w-3.5" />
                Salvar
              </button>
            </div>

            <div>
              <label className={`block text-xs font-medium mb-1 ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>Nome Interno do Template</label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className={`w-full rounded-xl border px-3 py-2 text-xs focus:outline-none ${
                  isLight
                    ? 'border-slate-300 bg-slate-50 text-slate-900'
                    : 'border-zinc-800 bg-zinc-950 text-white'
                }`}
              />
            </div>

            <div>
              <label className={`block text-xs font-medium mb-1 ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
                Assunto do E-mail (Suporta Tags)
              </label>
              <input
                type="text"
                required
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                placeholder="Ex: Parceria com a {{empresa}}"
                className={`w-full rounded-xl border px-3 py-2 text-xs focus:outline-none ${
                  isLight
                    ? 'border-slate-300 bg-slate-50 text-slate-900 placeholder-slate-400'
                    : 'border-zinc-800 bg-zinc-950 text-white placeholder-zinc-500'
                }`}
              />
            </div>

            <div>
              <label className={`block text-xs font-medium mb-1 ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
                Corpo do E-mail (HTML & Texto)
              </label>
              <textarea
                required
                rows={16}
                value={formData.html_content}
                onChange={(e) => setFormData({ ...formData, html_content: e.target.value })}
                className={`w-full rounded-xl border p-3 font-mono text-xs focus:outline-none leading-relaxed ${
                  isLight
                    ? 'border-slate-300 bg-slate-50 text-slate-900'
                    : 'border-zinc-800 bg-zinc-950 text-zinc-200'
                }`}
              />
            </div>
          </form>
        </div>

        {/* Live Preview Panel (5 cols) */}
        <div className="lg:col-span-5 space-y-3">
          <div
            className={`rounded-2xl border p-5 backdrop-blur-sm shadow-xs ${
              isLight ? 'border-slate-200 bg-white' : 'border-zinc-800 bg-zinc-900/60'
            }`}
          >
            {/* Preview Toolbar */}
            <div className={`flex items-center justify-between pb-3 border-b ${isLight ? 'border-slate-200' : 'border-zinc-800'}`}>
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-indigo-500" />
                <span className={`text-xs font-bold uppercase tracking-wider ${isLight ? 'text-slate-800' : 'text-zinc-300'}`}>
                  Live Preview com Dados Reais
                </span>
              </div>

              <div className={`flex rounded-lg p-1 border text-xs ${isLight ? 'bg-slate-100 border-slate-200' : 'bg-zinc-950 border-zinc-800'}`}>
                <button
                  onClick={() => setPreviewDevice('desktop')}
                  className={`flex items-center gap-1 rounded-md px-2 py-1 transition-all cursor-pointer ${
                    previewDevice === 'desktop'
                      ? isLight
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'bg-zinc-800 text-white'
                      : isLight
                      ? 'text-slate-600'
                      : 'text-zinc-400'
                  }`}
                >
                  <Monitor className="h-3 w-3" />
                  Desktop
                </button>
                <button
                  onClick={() => setPreviewDevice('mobile')}
                  className={`flex items-center gap-1 rounded-md px-2 py-1 transition-all cursor-pointer ${
                    previewDevice === 'mobile'
                      ? isLight
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'bg-zinc-800 text-white'
                      : isLight
                      ? 'text-slate-600'
                      : 'text-zinc-400'
                  }`}
                >
                  <Smartphone className="h-3 w-3" />
                  Mobile
                </button>
              </div>
            </div>

            {/* Email Client Simulation Frame */}
            <div className="mt-4 space-y-3">
              {/* Header Details */}
              <div
                className={`rounded-xl border p-3 text-xs space-y-1 ${
                  isLight ? 'border-slate-200 bg-slate-50 text-slate-700' : 'border-zinc-800 bg-zinc-950 text-zinc-300'
                }`}
              >
                <div>
                  <span className={isLight ? 'text-slate-400 font-semibold' : 'text-zinc-500 font-semibold'}>De:</span> Time UniversaEmail &lt;contato@universaemail.com&gt;
                </div>
                <div>
                  <span className={isLight ? 'text-slate-400 font-semibold' : 'text-zinc-500 font-semibold'}>Para:</span> {sampleLead.name} &lt;{sampleLead.email}&gt;
                </div>
                <div className={`font-semibold pt-1 border-t ${isLight ? 'border-slate-200 text-slate-900' : 'border-zinc-800 text-white'}`}>
                  <span className={isLight ? 'text-slate-400 font-normal' : 'text-zinc-500 font-normal'}>Assunto:</span> {previewSubject}
                </div>
              </div>

              {/* Rendered Body */}
              <div
                className={`mx-auto rounded-xl border bg-white text-zinc-900 p-6 overflow-y-auto shadow-inner transition-all ${
                  previewDevice === 'mobile' ? 'max-w-[340px] text-xs' : 'w-full min-h-[380px]'
                }`}
                style={{ minHeight: '380px' }}
                dangerouslySetInnerHTML={{ __html: previewHtml }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
