import React, { useState } from 'react';
import {
  FileCode,
  Plus,
  Monitor,
  Smartphone,
  Eye,
  Tag,
  Check,
  Code,
} from 'lucide-react';
import { useApp } from '../../shared/context/AppContext';
import type { MarketingTemplate, Lead } from '../../types';
import { interpolateEmailVariables } from '../../shared/services/resendService';

export const TemplatesView: React.FC = () => {
  const { templates, addTemplate, updateTemplate, leads } = useApp();

  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(
    templates[0]?.id || ''
  );
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [copiedTag, setCopiedTag] = useState<string | null>(null);

  // Active or Draft Template
  const activeTemplate = templates.find((t) => t.id === selectedTemplateId) || templates[0];

  const [formData, setFormData] = useState<Partial<MarketingTemplate>>({
    title: '',
    subject: '',
    html_content: '',
  });

  // Mock Lead for Live Preview
  const sampleLead: Lead = leads[0] || {
    id: 'sample_01',
    tenant_id: 'default',
    name: 'Carlos Eduardo Silveira',
    company_name: 'Nexus Logística S.A.',
    email: 'carlos.silveira@nexuslog.com.br',
    role: 'Diretor de Operações (COO)',
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
    { tag: '{{link_descadastro}}', label: 'Link de Opt-out', example: 'https://app.kotrik.com/opt-out' },
  ];

  const handleStartCreate = () => {
    setIsCreatingNew(true);
    setFormData({
      title: 'Novo Template de Prospecção',
      subject: 'Oportunidade para a {{empresa}}',
      html_content: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #18181b; line-height: 1.6; padding: 20px;">
  <p>Olá <strong>{{nome}}</strong>,</p>
  <p>Espero que este e-mail o encontre bem.</p>
  <p>Acompanho o trabalho da <strong>{{empresa}}</strong> em {{cidade}} e gostaria de compartilhar uma solução para impulsionar seus resultados operacionais.</p>
  <p>Podemos conversar brevemente esta semana?</p>
  <p style="margin-top: 24px;">Atenciosamente,<br><strong>Sua Equipe</strong></p>
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

  const currentContent = isCreatingNew
    ? formData.html_content || ''
    : formData.html_content !== undefined && formData.html_content !== ''
    ? formData.html_content
    : activeTemplate?.html_content || '';

  const currentSubject = isCreatingNew
    ? formData.subject || ''
    : formData.subject !== undefined && formData.subject !== ''
    ? formData.subject
    : activeTemplate?.subject || '';

  const interpolatedPreview = interpolateEmailVariables(currentContent, sampleLead);
  const interpolatedSubject = interpolateEmailVariables(currentSubject, sampleLead);

  const insertTagToEditor = (tag: string) => {
    setFormData((prev) => ({
      ...prev,
      html_content: (prev.html_content || currentContent) + ` ${tag} `,
    }));
    setCopiedTag(tag);
    setTimeout(() => setCopiedTag(null), 1500);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <FileCode className="h-6 w-6 text-purple-400" />
              Editor de Templates & Mensagens Dinâmicas
            </h1>
          </div>
          <p className="text-sm text-zinc-400 mt-1">
            Crie templates responsivos de alta entregabilidade com inserção dinâmica de variáveis e preview mobile.
          </p>
        </div>

        <button
          onClick={handleStartCreate}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-purple-500/20 hover:opacity-95 transition-all cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          Novo Template
        </button>
      </div>

      {/* Main Split Layout: Templates List + Editor + Live Preview */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Col (3 cols): Templates Selector */}
        <div className="lg:col-span-3 space-y-3">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 backdrop-blur-sm">
            <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-3">
              Modelos Salvos ({templates.length})
            </h2>
            <div className="space-y-2">
              {templates.map((tmpl) => {
                const isSelected = !isCreatingNew && activeTemplate?.id === tmpl.id;
                return (
                  <div
                    key={tmpl.id}
                    onClick={() => handleSelectTemplate(tmpl)}
                    className={`cursor-pointer rounded-xl p-3 border transition-all text-left ${
                      isSelected
                        ? 'border-indigo-500 bg-indigo-950/30 text-white shadow-sm'
                        : 'border-zinc-800 bg-zinc-950 hover:border-zinc-700 text-zinc-300'
                    }`}
                  >
                    <div className="font-semibold text-xs truncate">{tmpl.title}</div>
                    <div className="text-[11px] text-zinc-500 truncate mt-1">Assunto: {tmpl.subject}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Dynamic Tags Toolbox */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 backdrop-blur-sm space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-indigo-400">
              <Tag className="h-3.5 w-3.5" />
              Tags Dinâmicas (Clique para inserir)
            </div>
            <div className="space-y-1.5">
              {dynamicTags.map((item) => (
                <button
                  key={item.tag}
                  type="button"
                  onClick={() => insertTagToEditor(item.tag)}
                  className="w-full flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-950 px-2.5 py-1.5 text-left text-xs hover:border-indigo-500 hover:bg-indigo-950/20 transition-all group cursor-pointer"
                >
                  <span className="font-mono text-indigo-300 font-semibold text-[11px]">{item.tag}</span>
                  <span className="text-[10px] text-zinc-500 group-hover:text-zinc-300">
                    {copiedTag === item.tag ? <Check className="h-3 w-3 text-emerald-400" /> : item.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Center Col (5 cols): HTML / Text Code Editor */}
        <div className="lg:col-span-5 space-y-4">
          <form
            onSubmit={handleSave}
            className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 backdrop-blur-sm space-y-4"
          >
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Code className="h-4 w-4 text-indigo-400" />
                {isCreatingNew ? 'Criando Novo Template' : 'Editando Template'}
              </h2>

              <button
                type="submit"
                className="rounded-xl bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 transition-colors shadow-sm cursor-pointer"
              >
                Salvar Alterações
              </button>
            </div>

            {/* Template Title */}
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Título Interno do Template</label>
              <input
                type="text"
                required
                value={isCreatingNew ? formData.title : formData.title || activeTemplate?.title || ''}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
              />
            </div>

            {/* Subject */}
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">
                Linha de Assunto (Suporta Tags)
              </label>
              <input
                type="text"
                required
                value={isCreatingNew ? formData.subject : formData.subject || activeTemplate?.subject || ''}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                placeholder="Ex: Parceria estratégica com a {{empresa}}"
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
              />
            </div>

            {/* HTML Content Body */}
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Conteúdo HTML / E-mail</label>
              <textarea
                rows={16}
                required
                value={isCreatingNew ? formData.html_content : formData.html_content || activeTemplate?.html_content || ''}
                onChange={(e) => setFormData({ ...formData, html_content: e.target.value })}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-3 font-mono text-xs text-zinc-200 focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </form>
        </div>

        {/* Right Col (4 cols): Live Responsive Preview */}
        <div className="lg:col-span-4 space-y-4">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 backdrop-blur-sm space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                <Eye className="h-4 w-4 text-indigo-400" />
                Live Preview com Dados Reais
              </div>

              {/* Device Toggle */}
              <div className="flex rounded-lg bg-zinc-950 p-1 border border-zinc-800">
                <button
                  type="button"
                  onClick={() => setPreviewDevice('desktop')}
                  className={`p-1.5 rounded-md transition-all cursor-pointer ${
                    previewDevice === 'desktop' ? 'bg-zinc-800 text-white' : 'text-zinc-500'
                  }`}
                  title="Desktop Preview"
                >
                  <Monitor className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewDevice('mobile')}
                  className={`p-1.5 rounded-md transition-all cursor-pointer ${
                    previewDevice === 'mobile' ? 'bg-zinc-800 text-white' : 'text-zinc-500'
                  }`}
                  title="Mobile Preview (375px)"
                >
                  <Smartphone className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Email Header Preview Bar */}
            <div className="rounded-xl bg-zinc-950 p-3 border border-zinc-800 text-xs space-y-1">
              <div className="text-zinc-400 text-[11px]">
                <strong className="text-zinc-300">Para:</strong> {sampleLead.name} &lt;{sampleLead.email}&gt;
              </div>
              <div className="text-zinc-400 text-[11px]">
                <strong className="text-zinc-300">Assunto:</strong>{' '}
                <span className="text-white font-medium">{interpolatedSubject}</span>
              </div>
            </div>

            {/* Render Container */}
            <div className="flex justify-center bg-zinc-950/80 p-4 rounded-xl border border-zinc-800/80 overflow-hidden">
              <div
                className={`bg-white text-zinc-900 rounded-lg shadow-lg overflow-y-auto transition-all ${
                  previewDevice === 'mobile' ? 'w-[320px] min-h-[400px] text-xs' : 'w-full min-h-[400px]'
                }`}
                style={{ maxHeight: '520px' }}
              >
                <div
                  className="p-4"
                  dangerouslySetInnerHTML={{ __html: interpolatedPreview }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
