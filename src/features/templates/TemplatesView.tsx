import React, { useState, useEffect } from 'react';
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
  RotateCcw,
  Sparkles,
  Search,
} from 'lucide-react';
import { useApp } from '../../shared/context/AppContext';
import { interpolateEmailVariables } from '../../shared/services/resendService';
import type { MarketingTemplate, Lead } from '../../types';

export const TemplatesView: React.FC = () => {
  const {
    templates,
    addTemplate,
    updateTemplate,
    deleteTemplate,
    resetTemplatesToOfficial,
    leads,
    theme,
  } = useApp();

  const isLight = theme === 'light';

  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(
    templates[0]?.id || ''
  );
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [copiedTag, setCopiedTag] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  const activeTemplate = templates.find((t) => t.id === selectedTemplateId) || templates[0];

  // Form State
  const [formData, setFormData] = useState({
    title: activeTemplate?.title || '',
    subject: activeTemplate?.subject || '',
    html_content: activeTemplate?.html_content || '',
  });

  // Keep form in sync when activeTemplate changes
  useEffect(() => {
    if (activeTemplate && !isCreatingNew) {
      setFormData({
        title: activeTemplate.title,
        subject: activeTemplate.subject,
        html_content: activeTemplate.html_content,
      });
    }
  }, [activeTemplate?.id, isCreatingNew]);

  // Sample Lead for Live Preview interpolation
  const sampleLead: Lead = leads[0] || {
    id: 'sample_lead',
    tenant_id: '00000000-0000-0000-0000-000000000001',
    name: 'Alejandro Martínez',
    company_name: 'Aficionado LaLiga (Madrid)',
    email: 'alejandro.martinez@gmail.com',
    phone: '+34 612 34 56 78',
    website: '',
    sector: 'Streaming & Esportes',
    role: 'Consumidor B2C',
    company_size: 'B2C (Consumidor)',
    city: 'Madrid',
    province: 'Comunidad de Madrid',
    country: 'Espanha',
    tags: ['LaLiga', 'Futebol ES'],
    status: 'qualified',
    opted_out: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const dynamicTags = [
    { tag: '{{nome}}', label: 'Nome do Destinatário', example: sampleLead.name },
    { tag: '{{cidade}}', label: 'Cidade / Região', example: sampleLead.city },
    { tag: '{{pais}}', label: 'País', example: sampleLead.country },
    { tag: '{{link_descadastro}}', label: 'Link de Cancelamento / Opt-out (RGPD)', example: 'https://universaemail.com/opt-out' },
  ];

  const categories = [
    { id: 'all', label: 'Todos os Templates' },
    { id: 'futbol_laliga', label: '⚽ LaLiga & Futebol' },
    { id: 'real_madrid', label: '👑 Real Madrid' },
    { id: 'barcelona', label: '🔵🔴 FC Barcelona' },
    { id: 'motores_f1', label: '🏎️ F1 & Motores' },
    { id: 'cine_series', label: '🎬 Cine & Series' },
    { id: 'latinos_europa', label: '🌎 Latinos na Europa' },
    { id: 'multidispositivo', label: '📺 Multidispositivo' },
    { id: 'b2c_br', label: '🇧🇷 Brasil & Brasileirão' },
  ];

  const filteredTemplates = templates.filter((t) => {
    const matchesCategory =
      selectedCategory === 'all' ||
      t.category === selectedCategory ||
      (selectedCategory === 'futbol_laliga' && (t.title.includes('LaLiga') || t.title.includes('Fútbol'))) ||
      (selectedCategory === 'real_madrid' && t.title.includes('Real Madrid')) ||
      (selectedCategory === 'barcelona' && (t.title.includes('Barça') || t.title.includes('Barcelona'))) ||
      (selectedCategory === 'motores_f1' && (t.title.includes('Fórmula 1') || t.title.includes('MotoGP'))) ||
      (selectedCategory === 'cine_series' && (t.title.includes('Cine') || t.title.includes('Series'))) ||
      (selectedCategory === 'latinos_europa' && (t.title.includes('Latinos') || t.title.includes('Latino'))) ||
      (selectedCategory === 'multidispositivo' && t.title.includes('Multidispositivo')) ||
      (selectedCategory === 'b2c_br' && (t.title.includes('[BR]') || t.title.includes('Brasil')));

    const matchesSearch =
      !searchTerm ||
      t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.subject.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesCategory && matchesSearch;
  });

  const handleStartCreate = () => {
    setIsCreatingNew(true);
    setFormData({
      title: 'Novo Template UniversaTV',
      subject: '⚽ Ver contenido en 4K sin cortes (Prueba 24 Horas Gratis)',
      html_content: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #18181b; line-height: 1.6; padding: 20px;">
  <p>Hola <strong>{{nome}}</strong>,</p>
  <p>¿Cansado de pagar de más por la televisión? En <strong>UniversaTV</strong> tienes acceso completo en 4K.</p>
  <p>Pide tu prueba gratis de 24 horas por WhatsApp sin compromiso.</p>
  <p>Atentamente,<br><strong>Carlos Ventas - UniversaTV España</strong></p>
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

  const handleResetToOfficial = async () => {
    if (
      window.confirm(
        'Deseja carregar e restaurar o pacote oficial com os 8 templates de alta conversão da UniversaTV?'
      )
    ) {
      setIsResetting(true);
      await resetTemplatesToOfficial();
      setTimeout(() => {
        setIsResetting(false);
        if (templates[0]) {
          setSelectedTemplateId(templates[0].id);
        }
      }, 300);
    }
  };

  // Interpolated Preview Content
  const previewSubject = interpolateEmailVariables(formData.subject, sampleLead);
  const previewHtml = interpolateEmailVariables(formData.html_content, sampleLead);

  const isBrazilTemplate =
    activeTemplate?.category === 'b2c_br' ||
    formData.title.includes('[BR]') ||
    formData.title.includes('Brasil');

  const senderPreview = isBrazilTemplate
    ? 'Jackson Vendas - Universa TV Brasil <jackson_vendas@mail.universatv.com>'
    : 'Carlos Ventas - Universa TV España <carlos_ventas@mail.universatv.com>';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className={`text-2xl font-bold tracking-tight flex items-center gap-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>
              <FileCode className="h-6 w-6 text-orange-500" />
              Templates de Alta Conversão UniversaTV
            </h1>
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-semibold border ${
                isLight ? 'bg-orange-50 text-orange-700 border-orange-200' : 'bg-orange-500/10 text-orange-400 border-orange-500/20'
              }`}
            >
              {templates.length} Modelos
            </span>
          </div>
          <p className={`text-sm mt-1 ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
            Templates formatados para máxima entrega na caixa de entrada (Gmail, Outlook) com textos de alta conversão e CTA para WhatsApp.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleResetToOfficial}
            disabled={isResetting}
            title="Recarrega todos os 8 templates oficiais da UniversaTV com logo e links atualizados"
            className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-semibold transition-all cursor-pointer ${
              isLight
                ? 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50 shadow-xs'
                : 'border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800'
            }`}
          >
            <RotateCcw className={`h-3.5 w-3.5 text-orange-500 ${isResetting ? 'animate-spin' : ''}`} />
            Restaurar Oficiais
          </button>

          <button
            onClick={handleStartCreate}
            className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-orange-500/20 hover:opacity-95 transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Novo Template
          </button>
        </div>
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
            <div className="flex items-center justify-between mb-2">
              <h2 className={`text-xs font-bold uppercase tracking-wider ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
                Segmentos UniversaTV
              </h2>
              <span className="text-[11px] text-orange-500 font-semibold flex items-center gap-1">
                <Sparkles className="h-3 w-3" /> 4K & WhatsApp
              </span>
            </div>

            {/* Filter Search */}
            <div className="relative mb-3">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar template..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full rounded-lg pl-8 pr-2.5 py-1.5 text-xs border focus:outline-none ${
                  isLight ? 'border-slate-200 bg-slate-50 text-slate-900' : 'border-zinc-800 bg-zinc-950 text-white'
                }`}
              />
            </div>

            {/* Category Pill Selector */}
            <div className="flex flex-wrap gap-1 mb-3">
              {categories.slice(0, 5).map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`text-[10px] px-2 py-0.5 rounded-md font-medium transition-all cursor-pointer ${
                    selectedCategory === cat.id
                      ? 'bg-orange-500 text-white shadow-xs'
                      : isLight
                      ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            <div className="space-y-2 max-h-[460px] overflow-y-auto scrollbar-thin pr-0.5">
              {filteredTemplates.map((tmpl) => {
                const isSelected = tmpl.id === selectedTemplateId && !isCreatingNew;
                return (
                  <div
                    key={tmpl.id}
                    onClick={() => handleSelectTemplate(tmpl)}
                    className={`rounded-xl border p-3 cursor-pointer transition-all ${
                      isSelected
                        ? isLight
                          ? 'border-orange-400 bg-orange-50/70 shadow-xs ring-1 ring-orange-400/40'
                          : 'border-orange-500/50 bg-orange-500/10 shadow-xs ring-1 ring-orange-500/30'
                        : isLight
                        ? 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                        : 'border-zinc-800/80 bg-zinc-950/40 hover:bg-zinc-800/40'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <h3 className={`font-semibold text-xs truncate ${isSelected ? 'text-orange-600 dark:text-orange-400 font-bold' : isLight ? 'text-slate-800' : 'text-zinc-200'}`}>
                        {tmpl.title}
                      </h3>
                      {templates.length > 1 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm(`Excluir o template "${tmpl.title}"?`)) {
                              deleteTemplate(tmpl.id);
                            }
                          }}
                          className={`opacity-40 hover:opacity-100 transition-opacity p-1 ${isLight ? 'text-slate-400 hover:text-rose-600' : 'text-zinc-500 hover:text-rose-400'}`}
                          title="Excluir"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                    <div className={`text-[11px] mt-1 truncate ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                      {tmpl.subject}
                    </div>
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
            <div className="flex items-center gap-1.5 mb-2 text-orange-500">
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
                      ? 'border-slate-200 bg-slate-50 hover:bg-orange-50 hover:border-orange-200 text-slate-800'
                      : 'border-zinc-800 bg-zinc-950/60 hover:bg-orange-950/20 hover:border-orange-500/30 text-zinc-300'
                  }`}
                >
                  <div>
                    <span className="font-mono text-orange-500 font-semibold">{tagItem.tag}</span>
                    <span className={`block text-[10px] ${isLight ? 'text-slate-500' : 'text-zinc-500'}`}>
                      {tagItem.label}
                    </span>
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
                className="inline-flex items-center gap-1.5 rounded-xl bg-orange-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-orange-500 cursor-pointer shadow-xs"
              >
                <Save className="h-3.5 w-3.5" />
                Salvar
              </button>
            </div>

            <div>
              <label className={`block text-xs font-medium mb-1 ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
                Nome Interno do Template
              </label>
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
                placeholder="Ex: ⚽ ¿Ver todo el fútbol en 4K? (Prueba 24h gratis)"
                className={`w-full rounded-xl border px-3 py-2 text-xs focus:outline-none ${
                  isLight
                    ? 'border-slate-300 bg-slate-50 text-slate-900 placeholder-slate-400'
                    : 'border-zinc-800 bg-zinc-950 text-white placeholder-zinc-500'
                }`}
              />
            </div>

            <div>
              <label className={`block text-xs font-medium mb-1 ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
                Corpo do E-mail (HTML & Formato de Alta Entregabilidade)
              </label>
              <textarea
                required
                rows={17}
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
                <Eye className="h-4 w-4 text-orange-500" />
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
                        ? 'bg-white text-slate-900 shadow-xs font-semibold'
                        : 'bg-zinc-800 text-white font-semibold'
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
                        ? 'bg-white text-slate-900 shadow-xs font-semibold'
                        : 'bg-zinc-800 text-white font-semibold'
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
                  <span className={isLight ? 'text-slate-400 font-semibold' : 'text-zinc-500 font-semibold'}>De:</span>{' '}
                  <span className="font-semibold">{senderPreview}</span>
                </div>
                <div>
                  <span className={isLight ? 'text-slate-400 font-semibold' : 'text-zinc-500 font-semibold'}>Para:</span>{' '}
                  {sampleLead.name} &lt;{sampleLead.email}&gt;
                </div>
                <div className={`font-semibold pt-1 border-t ${isLight ? 'border-slate-200 text-slate-900' : 'border-zinc-800 text-white'}`}>
                  <span className={isLight ? 'text-slate-400 font-normal' : 'text-zinc-500 font-normal'}>Assunto:</span>{' '}
                  {previewSubject}
                </div>
              </div>

              {/* Rendered Body */}
              <div
                className={`mx-auto rounded-xl border bg-white text-zinc-900 p-2 sm:p-4 overflow-y-auto shadow-inner transition-all ${
                  previewDevice === 'mobile' ? 'max-w-[360px] text-xs' : 'w-full min-h-[440px]'
                }`}
                style={{ minHeight: '440px' }}
                dangerouslySetInnerHTML={{ __html: previewHtml }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
