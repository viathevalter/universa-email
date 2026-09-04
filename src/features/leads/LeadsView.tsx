import React, { useState, useMemo } from 'react';
import {
  Users,
  Search,
  Download,
  Upload,
  Plus,
  Table,
  Kanban,
  CheckCircle2,
  Trash2,
  BookmarkPlus,
  RefreshCw,
  ExternalLink,
  Edit,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  Phone,
  MessageSquare,
  Globe,
  Settings,
  Copy,
  Check,
  Send,
  X,
  Sparkles,
} from 'lucide-react';
import { useApp } from '../../shared/context/AppContext';
import type { Lead, LeadStatus, CompanySize, CRMStage } from '../../types';
import Papa from 'papaparse';
import confetti from 'canvas-confetti';

const InstagramIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
  </svg>
);

const FacebookIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
  </svg>
);

type SortField = 'name' | 'email' | 'company_name' | 'city' | 'status' | 'mx_valid' | 'created_at';
type SortDirection = 'asc' | 'desc';

interface LeadsViewProps {
  onNavigateToCampaigns?: (audienceId?: string) => void;
}

const DEFAULT_STAGES: CRMStage[] = [
  {
    id: 'new',
    name: 'Novo Lead',
    color: 'from-blue-500 to-indigo-600',
    border_color: 'border-blue-500/30',
    badge_bg: 'bg-blue-500/10 dark:bg-blue-500/20',
    badge_text: 'text-blue-600 dark:text-blue-400',
  },
  {
    id: 'qualified',
    name: 'Qualificado',
    color: 'from-purple-500 to-indigo-600',
    border_color: 'border-purple-500/30',
    badge_bg: 'bg-purple-500/10 dark:bg-purple-500/20',
    badge_text: 'text-purple-600 dark:text-purple-400',
  },
  {
    id: 'contacted',
    name: 'Em Campanha',
    color: 'from-amber-500 to-orange-600',
    border_color: 'border-amber-500/30',
    badge_bg: 'bg-amber-500/10 dark:bg-amber-500/20',
    badge_text: 'text-amber-600 dark:text-amber-400',
  },
  {
    id: 'replied',
    name: 'Respondeu / WhatsApp',
    color: 'from-teal-500 to-emerald-600',
    border_color: 'border-teal-500/30',
    badge_bg: 'bg-teal-500/10 dark:bg-teal-500/20',
    badge_text: 'text-teal-600 dark:text-teal-400',
  },
  {
    id: 'converted',
    name: 'Assinante / Convertido',
    color: 'from-emerald-500 to-green-600',
    border_color: 'border-emerald-500/30',
    badge_bg: 'bg-emerald-500/10 dark:bg-emerald-500/20',
    badge_text: 'text-emerald-600 dark:text-emerald-400',
  },
  {
    id: 'unqualified',
    name: 'Sem Interesse',
    color: 'from-zinc-500 to-slate-600',
    border_color: 'border-zinc-500/30',
    badge_bg: 'bg-zinc-500/10 dark:bg-zinc-500/20',
    badge_text: 'text-zinc-600 dark:text-zinc-400',
  },
];

export const LeadsView: React.FC<LeadsViewProps> = ({ onNavigateToCampaigns }) => {
  const {
    leads,
    addLead,
    updateLead,
    deleteLead,
    deleteMultipleLeads,
    batchImportLeads,
    restoreFull202kDatabase,
    verifyAllPendingMx,
    audiences,
    addAudience,
    deleteAudience,
    syncWithSupabase,
    theme,
  } = useApp();

  const isLight = theme === 'light';

  // Restore 202k state
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreProgress, setRestoreProgress] = useState(0);

  // View mode
  const [viewMode, setViewMode] = useState<'table' | 'kanban'>('table');

  // Search & Filters state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSocial, setSelectedSocial] = useState<string>('all');
  const [selectedNiche, setSelectedNiche] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedCity, setSelectedCity] = useState<string>('all');
  const [onlyMxValid, setOnlyMxValid] = useState(false);
  const [excludeOptedOut, setExcludeOptedOut] = useState(false);

  // Sorting state
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Pagination state (Table)
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);

  // Kanban column pagination caps (for ultra performance with 200k+ leads)
  const [kanbanVisibleCounts, setKanbanVisibleCounts] = useState<Record<string, number>>({
    new: 30,
    qualified: 30,
    contacted: 30,
    replied: 30,
    converted: 30,
    unqualified: 30,
  });

  // Selection state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);

  // Custom Stages State
  const [crmStages, setCrmStages] = useState<CRMStage[]>(() => {
    try {
      const saved = localStorage.getItem('universa_crm_stages');
      return saved ? JSON.parse(saved) : DEFAULT_STAGES;
    } catch {
      return DEFAULT_STAGES;
    }
  });

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isAudienceModalOpen, setIsAudienceModalOpen] = useState(false);
  const [isAudiencesListModalOpen, setIsAudiencesListModalOpen] = useState(false);
  const [isStagesModalOpen, setIsStagesModalOpen] = useState(false);

  // Form states
  const [audienceName, setAudienceName] = useState('');
  const [audienceDesc, setAudienceDesc] = useState('');

  const [newLead, setNewLead] = useState({
    name: '',
    company_name: '',
    email: '',
    phone: '',
    website: '',
    source_url: '',
    sector: 'Streaming & Esportes B2C',
    role: 'Torcedor LaLiga / Aficionado TV',
    company_size: 'B2C (Consumidor)' as CompanySize,
    city: 'Madrid',
    province: 'Comunidad de Madrid',
    country: 'Espanha',
    tags: 'LaLiga, Teste 24h, Instagram',
    status: 'new' as LeadStatus,
  });

  // CSV Import State
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvPreviewData, setCsvPreviewData] = useState<any[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Copy helper
  const handleCopyEmail = (email: string) => {
    navigator.clipboard.writeText(email);
    setCopiedEmail(email);
    setTimeout(() => setCopiedEmail(null), 2000);
  };

  // Helper to detect social media platform
  const detectSocialPlatform = (lead: Lead): { platform: string; icon: React.ReactNode; label: string; color: string } => {
    const url = (lead.source_url || '').toLowerCase();
    const tags = (lead.tags || []).join(' ').toLowerCase();

    if (url.includes('instagram') || tags.includes('instagram')) {
      return { platform: 'instagram', icon: <InstagramIcon className="h-3.5 w-3.5 text-pink-500" />, label: 'Instagram', color: 'border-pink-500/20 bg-pink-500/10 text-pink-500' };
    }
    if (url.includes('facebook') || tags.includes('facebook')) {
      return { platform: 'facebook', icon: <FacebookIcon className="h-3.5 w-3.5 text-blue-500" />, label: 'Facebook', color: 'border-blue-500/20 bg-blue-500/10 text-blue-500' };
    }
    if (url.includes('foro') || url.includes('mundoplus') || tags.includes('foro') || tags.includes('foros')) {
      return { platform: 'foros', icon: <MessageSquare className="h-3.5 w-3.5 text-amber-500" />, label: 'Fórum TV', color: 'border-amber-500/20 bg-amber-500/10 text-amber-500' };
    }
    if (url.includes('pena') || url.includes('peña') || lead.company_name?.toLowerCase().includes('peña') || tags.includes('peña') || tags.includes('pena')) {
      return { platform: 'penas', icon: <Globe className="h-3.5 w-3.5 text-emerald-500" />, label: 'Peña Oficial', color: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-500' };
    }
    return { platform: 'web', icon: <Globe className="h-3.5 w-3.5 text-indigo-500" />, label: 'Google / Web', color: 'border-indigo-500/20 bg-indigo-500/10 text-indigo-500' };
  };

  // KPIs Calculations
  const kpis = useMemo(() => {
    const total = leads.length;
    const mxValid = leads.filter((l) => l.mx_valid).length;
    const instagram = leads.filter((l) => (l.source_url || '').toLowerCase().includes('instagram') || (l.tags || []).some((t) => t.toLowerCase().includes('instagram'))).length;
    const facebook = leads.filter((l) => (l.source_url || '').toLowerCase().includes('facebook') || (l.tags || []).some((t) => t.toLowerCase().includes('facebook'))).length;
    const foros = leads.filter((l) => (l.source_url || '').toLowerCase().includes('foro') || (l.tags || []).some((t) => t.toLowerCase().includes('foro'))).length;
    const laliga = leads.filter((l) => l.target_niche === 'laliga_es' || (l.role || '').toLowerCase().includes('laliga') || (l.company_name || '').toLowerCase().includes('peña')).length;
    const brasileiros = leads.filter((l) => l.target_niche === 'brasileiros_es' || (l.tags || []).some((t) => t.toLowerCase().includes('brasileiro'))).length;

    return { total, mxValid, instagram, facebook, foros, laliga, brasileiros };
  }, [leads]);

  // Unique Cities for Filter
  const availableCities = useMemo(() => {
    const citiesSet = new Set<string>();
    for (const lead of leads) {
      if (lead.city && lead.city.trim()) {
        citiesSet.add(lead.city.trim());
      }
    }
    return Array.from(citiesSet).sort();
  }, [leads]);

  // Filtered & Sorted Leads
  const filteredAndSortedLeads = useMemo(() => {
    const result = leads.filter((lead) => {
      // Search term
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const nameMatch = lead.name?.toLowerCase().includes(query);
        const emailMatch = lead.email?.toLowerCase().includes(query);
        const companyMatch = lead.company_name?.toLowerCase().includes(query);
        const cityMatch = lead.city?.toLowerCase().includes(query);
        const phoneMatch = lead.phone?.toLowerCase().includes(query);
        const roleMatch = lead.role?.toLowerCase().includes(query);
        const tagsMatch = lead.tags?.some((t) => t.toLowerCase().includes(query));

        if (!nameMatch && !emailMatch && !companyMatch && !cityMatch && !phoneMatch && !roleMatch && !tagsMatch) {
          return false;
        }
      }

      // Social Platform filter
      if (selectedSocial !== 'all') {
        const platform = detectSocialPlatform(lead).platform;
        if (platform !== selectedSocial) return false;
      }

      // Niche filter
      if (selectedNiche !== 'all') {
        if (selectedNiche === 'laliga_es' && lead.target_niche !== 'laliga_es' && !lead.role?.toLowerCase().includes('laliga') && !lead.company_name?.toLowerCase().includes('peña')) return false;
        if (selectedNiche === 'brasileiros_es' && lead.target_niche !== 'brasileiros_es' && !lead.tags?.some((t) => t.toLowerCase().includes('brasileiro'))) return false;
        if (selectedNiche === 'cine_series_es' && lead.target_niche !== 'cine_series_es' && !lead.role?.toLowerCase().includes('cine') && !lead.role?.toLowerCase().includes('serie')) return false;
      }

      // Status filter
      if (selectedStatus !== 'all' && lead.status !== selectedStatus) {
        return false;
      }

      // City filter
      if (selectedCity !== 'all' && lead.city !== selectedCity) {
        return false;
      }

      // MX Valid only
      if (onlyMxValid && !lead.mx_valid) {
        return false;
      }

      // Exclude opted out
      if (excludeOptedOut && lead.opted_out) {
        return false;
      }

      return true;
    });

    // Sorting
    result.sort((a, b) => {
      let aVal = a[sortField] || '';
      let bVal = b[sortField] || '';

      if (typeof aVal === 'string') aVal = aVal.toLowerCase();
      if (typeof bVal === 'string') bVal = bVal.toLowerCase();

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [leads, searchTerm, selectedSocial, selectedNiche, selectedStatus, selectedCity, onlyMxValid, excludeOptedOut, sortField, sortDirection]);

  // Grouped Leads for Kanban (High Performance)
  const kanbanGroupedLeads = useMemo(() => {
    const groups: Record<string, Lead[]> = {
      new: [],
      qualified: [],
      contacted: [],
      replied: [],
      converted: [],
      unqualified: [],
    };

    for (const lead of filteredAndSortedLeads) {
      const statusKey = lead.status || 'new';
      if (groups[statusKey]) {
        groups[statusKey].push(lead);
      } else {
        groups.new.push(lead);
      }
    }
    return groups;
  }, [filteredAndSortedLeads]);

  // Pagination for Table
  const totalPages = Math.max(1, Math.ceil(filteredAndSortedLeads.length / itemsPerPage));
  const paginatedLeads = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredAndSortedLeads.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredAndSortedLeads, currentPage, itemsPerPage]);

  // Selection handlers
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(paginatedLeads.map((l) => l.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (confirm(`Deseja realmente excluir os ${selectedIds.length} leads selecionados?`)) {
      await deleteMultipleLeads(selectedIds);
      setSelectedIds([]);
      setNotification({ type: 'success', message: `${selectedIds.length} leads excluídos com sucesso.` });
    }
  };

  const handleBulkStatusChange = async (newStatus: LeadStatus) => {
    if (selectedIds.length === 0) return;
    for (const id of selectedIds) {
      await updateLead(id, { status: newStatus });
    }
    setSelectedIds([]);
    setNotification({ type: 'success', message: `${selectedIds.length} leads atualizados para ${newStatus}.` });
  };

  // Sort handler
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // CSV Export
  const handleExportCSV = () => {
    const dataToExport = filteredAndSortedLeads.map((lead) => ({
      Nome: lead.name,
      Empresa_Clube: lead.company_name,
      Email: lead.email,
      WhatsApp: lead.phone || '',
      Rede_Social_Origem: detectSocialPlatform(lead).label,
      URL_Fonte: lead.source_url || '',
      Cidade: lead.city || '',
      Provincia: lead.province || '',
      Status_CRM: lead.status,
      MX_Valido: lead.mx_valid ? 'Sim' : 'Nao',
      MX_Servidor: lead.mx_record || '',
      Tags: (lead.tags || []).join(', '),
      Criado_Em: lead.created_at,
    }));

    const csv = Papa.unparse(dataToExport);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `leads_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setNotification({ type: 'success', message: `${dataToExport.length} leads exportados com sucesso!` });
  };

  // CSV Import handler
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvFile(file);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        setCsvPreviewData(results.data.slice(0, 5));
      },
    });
  };

  const handleImportCSVSubmit = async () => {
    if (!csvFile) return;
    setIsImporting(true);

    Papa.parse(csvFile, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const rawRows: any[] = results.data;
        const leadsToImport = rawRows
          .map((row) => ({
            name: row.Nome || row.name || row.Nombre || row.nome || 'Consumidor',
            company_name: row.Empresa_Clube || row.company || row.club || 'Consumidor B2C',
            email: (row.Email || row.email || row.correo || '').trim(),
            phone: row.WhatsApp || row.phone || row.telefone || '',
            website: row.Website || row.website || '',
            source_url: row.URL_Fonte || row.source || '',
            sector: row.Setor || row.sector || 'Streaming & Esportes B2C',
            role: row.Cargo || row.role || 'Consumidor / Aficionado TV',
            company_size: 'B2C (Consumidor)',
            city: row.Cidade || row.city || row.ciudad || 'Madrid',
            province: row.Provincia || row.province || 'Espanha',
            country: 'Espanha',
            tags: row.Tags ? row.Tags.split(',').map((t: string) => t.trim()) : ['Importação CSV'],
            status: 'new' as LeadStatus,
            opted_out: false,
            mx_valid: true,
          }))
          .filter((l) => l.email && l.email.includes('@'));

        const count = await batchImportLeads(leadsToImport);
        setIsImporting(false);
        setIsImportModalOpen(false);
        setCsvFile(null);
        setCsvPreviewData([]);
        setNotification({ type: 'success', message: `${count} leads importados com sucesso do CSV!` });
        confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
      },
    });
  };

  // Restore 202k Database Handler
  const handleRestore202k = async () => {
    setIsRestoring(true);
    try {
      const count = await restoreFull202kDatabase(202000, (p) => setRestoreProgress(p));
      confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
      setNotification({
        type: 'success',
        message: `Base de ${count.toLocaleString()} leads carregada e salva com sucesso no IndexedDB!`,
      });
    } catch (e) {
      setNotification({ type: 'error', message: 'Erro ao carregar base de leads.' });
    } finally {
      setIsRestoring(false);
    }
  };

  // Add Lead Submit
  const handleSaveLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLead.email.trim()) return;

    await addLead({
      name: newLead.name || 'Consumidor',
      company_name: newLead.company_name || 'Consumidor B2C',
      email: newLead.email.trim(),
      phone: newLead.phone,
      website: newLead.website,
      source_url: newLead.source_url,
      sector: newLead.sector,
      role: newLead.role,
      company_size: newLead.company_size,
      city: newLead.city,
      province: newLead.province,
      country: newLead.country,
      tags: newLead.tags.split(',').map((t) => t.trim()).filter(Boolean),
      status: newLead.status,
      opted_out: false,
    });

    setIsAddModalOpen(false);
    setNewLead({
      name: '',
      company_name: '',
      email: '',
      phone: '',
      website: '',
      source_url: '',
      sector: 'Streaming & Esportes B2C',
      role: 'Torcedor LaLiga / Aficionado TV',
      company_size: 'B2C (Consumidor)',
      city: 'Madrid',
      province: 'Comunidad de Madrid',
      country: 'Espanha',
      tags: 'LaLiga, Teste 24h, Instagram',
      status: 'new',
    });
    setNotification({ type: 'success', message: 'Lead adicionado com sucesso!' });
  };

  // Update Lead Submit (CRUD)
  const handleUpdateLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLead) return;

    await updateLead(editingLead.id, {
      name: editingLead.name,
      company_name: editingLead.company_name,
      email: editingLead.email,
      phone: editingLead.phone,
      website: editingLead.website,
      source_url: editingLead.source_url,
      sector: editingLead.sector,
      role: editingLead.role,
      company_size: editingLead.company_size,
      city: editingLead.city,
      province: editingLead.province,
      status: editingLead.status,
      opted_out: editingLead.opted_out,
      tags: editingLead.tags,
    });

    setIsEditModalOpen(false);
    setEditingLead(null);
    setNotification({ type: 'success', message: 'Lead atualizado com sucesso!' });
  };

  // Save Audience Submit
  const handleSaveAudience = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!audienceName.trim()) return;

    await addAudience({
      name: audienceName,
      description: audienceDesc || `Público segmentado com ${filteredAndSortedLeads.length} leads`,
      filters: {
        status: selectedStatus !== 'all' ? [selectedStatus as LeadStatus] : undefined,
        city: selectedCity !== 'all' ? [selectedCity] : undefined,
        social_platform: selectedSocial !== 'all' ? [selectedSocial] : undefined,
        niche: selectedNiche !== 'all' ? [selectedNiche] : undefined,
        mx_valid_only: onlyMxValid,
        exclude_opted_out: excludeOptedOut,
      },
      lead_count: filteredAndSortedLeads.length,
    });

    setIsAudienceModalOpen(false);
    setAudienceName('');
    setAudienceDesc('');
    setNotification({ type: 'success', message: 'Público segmentado salvo com sucesso!' });
    confetti({ particleCount: 60, spread: 70, origin: { y: 0.5 } });
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed bottom-5 right-5 z-50 flex items-center justify-between gap-3 rounded-xl p-4 shadow-2xl transition-all border ${
            notification.type === 'success'
              ? 'bg-emerald-600 text-white border-emerald-500 shadow-emerald-500/20'
              : 'bg-rose-600 text-white border-rose-500 shadow-rose-500/20'
          }`}
        >
          <span className="text-xs font-bold">{notification.message}</span>
          <button onClick={() => setNotification(null)} className="rounded-md p-1 hover:bg-white/20">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Header with Title & Primary Actions */}
      <div
        className={`flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-2xl p-5 sm:p-6 border transition-all shadow-xs ${
          isLight
            ? 'border-indigo-100 bg-gradient-to-r from-white via-indigo-50/20 to-purple-50/30'
            : 'border-zinc-800/80 bg-gradient-to-r from-zinc-900 via-zinc-900/90 to-purple-950/20'
        }`}
      >
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-indigo-600/10 px-2.5 py-0.5 text-xs font-semibold text-indigo-500 border border-indigo-500/20">
              <Users className="h-3.5 w-3.5" />
              Base Central de Leads & CRM
            </span>
            <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-bold text-emerald-500 border border-emerald-500/20">
              {kpis.mxValid.toLocaleString()} E-mails MX Válidos
            </span>
          </div>
          <h1 className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
            Gerenciamento de Leads ({leads.length.toLocaleString()} Contatos)
          </h1>
          <p className={`text-xs sm:text-sm ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
            Central profissional de inteligência, segmentação de públicos para campanhas e CRM de alta performance.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleRestore202k}
            disabled={isRestoring}
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-indigo-600 p-2.5 text-xs font-bold text-white shadow-lg shadow-orange-500/20 hover:opacity-95 transition-all cursor-pointer"
            title="Carregar / Restaurar base completa de 202.000 leads segmentados da Espanha"
          >
            <Sparkles className="h-4 w-4" />
            <span>{isRestoring ? `Carregando 202k (${restoreProgress}%)...` : '⚡ Carregar 202.000 Leads'}</span>
          </button>

          <button
            onClick={() => syncWithSupabase()}
            className={`flex items-center gap-1.5 rounded-xl border p-2.5 text-xs font-semibold transition-all cursor-pointer ${
              isLight ? 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50' : 'border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
            }`}
            title="Sincronizar com banco de dados Supabase"
          >
            <RefreshCw className="h-4 w-4 text-indigo-500" />
            <span className="hidden sm:inline">Sincronizar Banco</span>
          </button>

          <button
            onClick={async () => {
              const count = await verifyAllPendingMx();
              setNotification({ type: 'success', message: `${count} leads auditados via DoH MX com sucesso!` });
            }}
            className={`flex items-center gap-1.5 rounded-xl border p-2.5 text-xs font-semibold transition-all cursor-pointer ${
              isLight ? 'border-emerald-200 bg-emerald-50/50 text-emerald-700 hover:bg-emerald-50' : 'border-emerald-500/30 bg-emerald-950/20 text-emerald-400 hover:bg-emerald-950/40'
            }`}
            title="Auditar MX de todos os leads pendentes"
          >
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            <span>Auditar MX</span>
          </button>

          <button
            onClick={() => setIsAudiencesListModalOpen(true)}
            className={`flex items-center gap-1.5 rounded-xl border p-2.5 text-xs font-semibold transition-all cursor-pointer ${
              isLight ? 'border-purple-200 bg-purple-50/50 text-purple-700 hover:bg-purple-50' : 'border-purple-500/30 bg-purple-950/20 text-purple-400 hover:bg-purple-950/40'
            }`}
          >
            <BookmarkPlus className="h-4 w-4 text-purple-500" />
            <span>Públicos ({audiences.length})</span>
          </button>

          <button
            onClick={handleExportCSV}
            disabled={filteredAndSortedLeads.length === 0}
            className={`flex items-center gap-1.5 rounded-xl border p-2.5 text-xs font-semibold transition-all cursor-pointer ${
              isLight ? 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50' : 'border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
            }`}
          >
            <Download className="h-4 w-4 text-emerald-500" />
            <span>Exportar CSV</span>
          </button>

          <button
            onClick={() => setIsImportModalOpen(true)}
            className={`flex items-center gap-1.5 rounded-xl border p-2.5 text-xs font-semibold transition-all cursor-pointer ${
              isLight ? 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50' : 'border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
            }`}
          >
            <Upload className="h-4 w-4 text-indigo-500" />
            <span>Importar</span>
          </button>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-pink-500 to-indigo-600 p-2.5 text-xs font-bold text-white shadow-lg shadow-indigo-500/20 hover:opacity-95 transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>+ Novo Lead</span>
          </button>
        </div>
      </div>

      {/* INTERACTIVE ANALYTICAL KPIS (CLICK TO FILTER) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
        {/* Total Leads */}
        <div
          onClick={() => {
            setSelectedSocial('all');
            setSelectedNiche('all');
            setSelectedStatus('all');
            setSelectedCity('all');
            setOnlyMxValid(false);
          }}
          className={`p-3.5 rounded-2xl border cursor-pointer transition-all hover:scale-[1.02] shadow-xs ${
            selectedSocial === 'all' && selectedNiche === 'all' && !onlyMxValid
              ? 'border-indigo-500 bg-indigo-500/10 ring-2 ring-indigo-500/20'
              : isLight
              ? 'border-slate-200/80 bg-white hover:border-indigo-300'
              : 'border-zinc-800/80 bg-zinc-900/90 hover:border-indigo-500/40'
          }`}
        >
          <div className="flex items-center justify-between text-indigo-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total</span>
            <Users className="h-4 w-4" />
          </div>
          <p className={`text-lg sm:text-xl font-extrabold ${isLight ? 'text-slate-900' : 'text-white'}`}>
            {kpis.total.toLocaleString()}
          </p>
          <p className="text-[10px] text-zinc-500 mt-0.5">Base Completa</p>
        </div>

        {/* MX Válidos */}
        <div
          onClick={() => setOnlyMxValid((prev) => !prev)}
          className={`p-3.5 rounded-2xl border cursor-pointer transition-all hover:scale-[1.02] shadow-xs ${
            onlyMxValid
              ? 'border-emerald-500 bg-emerald-500/10 ring-2 ring-emerald-500/20'
              : isLight
              ? 'border-slate-200/80 bg-white hover:border-emerald-300'
              : 'border-zinc-800/80 bg-zinc-900/90 hover:border-emerald-500/40'
          }`}
        >
          <div className="flex items-center justify-between text-emerald-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">MX Válidos</span>
            <CheckCircle2 className="h-4 w-4" />
          </div>
          <p className={`text-lg sm:text-xl font-extrabold ${isLight ? 'text-slate-900' : 'text-white'}`}>
            {kpis.mxValid.toLocaleString()}
          </p>
          <p className="text-[10px] text-emerald-600 font-medium mt-0.5">
            {kpis.total > 0 ? `${((kpis.mxValid / kpis.total) * 100).toFixed(0)}% Entregáveis` : '100%'}
          </p>
        </div>

        {/* Instagram Bios */}
        <div
          onClick={() => setSelectedSocial((prev) => (prev === 'instagram' ? 'all' : 'instagram'))}
          className={`p-3.5 rounded-2xl border cursor-pointer transition-all hover:scale-[1.02] shadow-xs ${
            selectedSocial === 'instagram'
              ? 'border-pink-500 bg-pink-500/10 ring-2 ring-pink-500/20'
              : isLight
              ? 'border-slate-200/80 bg-white hover:border-pink-300'
              : 'border-zinc-800/80 bg-zinc-900/90 hover:border-pink-500/40'
          }`}
        >
          <div className="flex items-center justify-between text-pink-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Instagram</span>
            <InstagramIcon className="h-4 w-4" />
          </div>
          <p className={`text-lg sm:text-xl font-extrabold ${isLight ? 'text-slate-900' : 'text-white'}`}>
            {kpis.instagram.toLocaleString()}
          </p>
          <p className="text-[10px] text-zinc-500 mt-0.5">Bios & Posts</p>
        </div>

        {/* Facebook Grupos */}
        <div
          onClick={() => setSelectedSocial((prev) => (prev === 'facebook' ? 'all' : 'facebook'))}
          className={`p-3.5 rounded-2xl border cursor-pointer transition-all hover:scale-[1.02] shadow-xs ${
            selectedSocial === 'facebook'
              ? 'border-blue-500 bg-blue-500/10 ring-2 ring-blue-500/20'
              : isLight
              ? 'border-slate-200/80 bg-white hover:border-blue-300'
              : 'border-zinc-800/80 bg-zinc-900/90 hover:border-blue-500/40'
          }`}
        >
          <div className="flex items-center justify-between text-blue-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Facebook</span>
            <FacebookIcon className="h-4 w-4" />
          </div>
          <p className={`text-lg sm:text-xl font-extrabold ${isLight ? 'text-slate-900' : 'text-white'}`}>
            {kpis.facebook.toLocaleString()}
          </p>
          <p className="text-[10px] text-zinc-500 mt-0.5">Grupos Espanha</p>
        </div>

        {/* Fóruns & TV 4K */}
        <div
          onClick={() => setSelectedSocial((prev) => (prev === 'foros' ? 'all' : 'foros'))}
          className={`p-3.5 rounded-2xl border cursor-pointer transition-all hover:scale-[1.02] shadow-xs ${
            selectedSocial === 'foros'
              ? 'border-amber-500 bg-amber-500/10 ring-2 ring-amber-500/20'
              : isLight
              ? 'border-slate-200/80 bg-white hover:border-amber-300'
              : 'border-zinc-800/80 bg-zinc-900/90 hover:border-amber-500/40'
          }`}
        >
          <div className="flex items-center justify-between text-amber-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Fóruns TV</span>
            <MessageSquare className="h-4 w-4" />
          </div>
          <p className={`text-lg sm:text-xl font-extrabold ${isLight ? 'text-slate-900' : 'text-white'}`}>
            {kpis.foros.toLocaleString()}
          </p>
          <p className="text-[10px] text-zinc-500 mt-0.5">ForoCoches/MundoPlus</p>
        </div>

        {/* LaLiga & Peñas */}
        <div
          onClick={() => setSelectedNiche((prev) => (prev === 'laliga_es' ? 'all' : 'laliga_es'))}
          className={`p-3.5 rounded-2xl border cursor-pointer transition-all hover:scale-[1.02] shadow-xs ${
            selectedNiche === 'laliga_es'
              ? 'border-teal-500 bg-teal-500/10 ring-2 ring-teal-500/20'
              : isLight
              ? 'border-slate-200/80 bg-white hover:border-teal-300'
              : 'border-zinc-800/80 bg-zinc-900/90 hover:border-teal-500/40'
          }`}
        >
          <div className="flex items-center justify-between text-teal-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">⚽ LaLiga</span>
            <Globe className="h-4 w-4" />
          </div>
          <p className={`text-lg sm:text-xl font-extrabold ${isLight ? 'text-slate-900' : 'text-white'}`}>
            {kpis.laliga.toLocaleString()}
          </p>
          <p className="text-[10px] text-zinc-500 mt-0.5">Peñas & Torcidas</p>
        </div>

        {/* Brasileiros Espanha */}
        <div
          onClick={() => setSelectedNiche((prev) => (prev === 'brasileiros_es' ? 'all' : 'brasileiros_es'))}
          className={`p-3.5 rounded-2xl border cursor-pointer transition-all hover:scale-[1.02] shadow-xs ${
            selectedNiche === 'brasileiros_es'
              ? 'border-green-500 bg-green-500/10 ring-2 ring-green-500/20'
              : isLight
              ? 'border-slate-200/80 bg-white hover:border-green-300'
              : 'border-zinc-800/80 bg-zinc-900/90 hover:border-green-500/40'
          }`}
        >
          <div className="flex items-center justify-between text-green-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">🇧🇷 BR Espanha</span>
            <Globe className="h-4 w-4" />
          </div>
          <p className={`text-lg sm:text-xl font-extrabold ${isLight ? 'text-slate-900' : 'text-white'}`}>
            {kpis.brasileiros.toLocaleString()}
          </p>
          <p className="text-[10px] text-zinc-500 mt-0.5">Comunidades BR</p>
        </div>
      </div>

      {/* FILTER TOOLBAR & SEGMENTATION CONTROLS */}
      <div
        className={`rounded-2xl p-4 border transition-all space-y-3.5 ${
          isLight ? 'border-slate-200/80 bg-white' : 'border-zinc-800/80 bg-zinc-900/90'
        }`}
      >
        {/* Row 1: Search Input & Multi-Dropdowns */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Buscar por nome, e-mail, telefone, clube, rede social, cidade..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className={`w-full rounded-xl border pl-10 pr-4 py-2.5 text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500 transition-all ${
                isLight ? 'border-slate-200 bg-slate-50 text-slate-900' : 'border-zinc-700 bg-zinc-800 text-white'
              }`}
            />
          </div>

          {/* Social Media Origin Dropdown */}
          <select
            value={selectedSocial}
            onChange={(e) => {
              setSelectedSocial(e.target.value);
              setCurrentPage(1);
            }}
            className={`rounded-xl border px-3 py-2.5 text-xs font-semibold focus:outline-hidden cursor-pointer ${
              isLight ? 'border-slate-200 bg-slate-50 text-slate-800' : 'border-zinc-700 bg-zinc-800 text-zinc-200'
            }`}
          >
            <option value="all">Todas as Redes</option>
            <option value="instagram">📸 Instagram</option>
            <option value="facebook">👥 Facebook Grupos</option>
            <option value="foros">💬 Fóruns TV 4K</option>
            <option value="penas">🏟️ Peñas Oficiais</option>
            <option value="web">🌐 Google / Web</option>
          </select>

          {/* Niche / Community Dropdown */}
          <select
            value={selectedNiche}
            onChange={(e) => {
              setSelectedNiche(e.target.value);
              setCurrentPage(1);
            }}
            className={`rounded-xl border px-3 py-2.5 text-xs font-semibold focus:outline-hidden cursor-pointer ${
              isLight ? 'border-slate-200 bg-slate-50 text-slate-800' : 'border-zinc-700 bg-zinc-800 text-zinc-200'
            }`}
          >
            <option value="all">Todos os Nichos</option>
            <option value="laliga_es">⚽ LaLiga & Futebol</option>
            <option value="cine_series_es">🎬 Séries & Cine 4K</option>
            <option value="brasileiros_es">🇧🇷 Brasileiros Espanha</option>
          </select>

          {/* Status Dropdown */}
          <select
            value={selectedStatus}
            onChange={(e) => {
              setSelectedStatus(e.target.value);
              setCurrentPage(1);
            }}
            className={`rounded-xl border px-3 py-2.5 text-xs font-semibold focus:outline-hidden cursor-pointer ${
              isLight ? 'border-slate-200 bg-slate-50 text-slate-800' : 'border-zinc-700 bg-zinc-800 text-zinc-200'
            }`}
          >
            <option value="all">Todos os Status CRM</option>
            <option value="new">Novo Lead</option>
            <option value="qualified">Qualificado</option>
            <option value="contacted">Em Campanha</option>
            <option value="replied">Respondeu / WhatsApp</option>
            <option value="converted">Assinante Ativo</option>
            <option value="unqualified">Sem Interesse</option>
          </select>

          {/* City Dropdown */}
          <select
            value={selectedCity}
            onChange={(e) => {
              setSelectedCity(e.target.value);
              setCurrentPage(1);
            }}
            className={`rounded-xl border px-3 py-2.5 text-xs font-semibold focus:outline-hidden cursor-pointer max-w-[170px] truncate ${
              isLight ? 'border-slate-200 bg-slate-50 text-slate-800' : 'border-zinc-700 bg-zinc-800 text-zinc-200'
            }`}
          >
            <option value="all">Todas as Cidades</option>
            {availableCities.map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </select>

          {/* Table / Kanban View Toggle */}
          <div
            className={`flex items-center rounded-xl p-1 border shrink-0 ${
              isLight ? 'border-slate-200 bg-slate-100' : 'border-zinc-800 bg-zinc-950'
            }`}
          >
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : isLight
                  ? 'text-slate-600 hover:text-slate-900'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Table className="h-3.5 w-3.5" />
              <span>Tabela</span>
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'kanban'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : isLight
                  ? 'text-slate-600 hover:text-slate-900'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Kanban className="h-3.5 w-3.5" />
              <span>Kanban</span>
            </button>
          </div>
        </div>

        {/* Row 2: Checkboxes & Audience Creator Action */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 border-t border-slate-100 dark:border-zinc-800/60 text-xs">
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={onlyMxValid}
                onChange={(e) => setOnlyMxValid(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
              />
              <span className={`font-semibold ${isLight ? 'text-slate-700' : 'text-zinc-300'}`}>
                Apenas E-mails com MX Válido
              </span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={excludeOptedOut}
                onChange={(e) => setExcludeOptedOut(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
              <span className={`font-semibold ${isLight ? 'text-slate-700' : 'text-zinc-300'}`}>
                Ocultar Descadastrados (Opt-out)
              </span>
            </label>

            {/* Kanban Stages Config Button */}
            {viewMode === 'kanban' && (
              <button
                onClick={() => setIsStagesModalOpen(true)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-500 hover:underline cursor-pointer ml-auto"
              >
                <Settings className="h-3.5 w-3.5" />
                <span>Customizar Etapas do Funil</span>
              </button>
            )}
          </div>

          {/* SAVE ACTIVE FILTER AS AUDIENCE BUTTON */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => {
                setAudienceName(
                  `${selectedSocial !== 'all' ? selectedSocial.toUpperCase() : 'GERAL'} - ${
                    selectedCity !== 'all' ? selectedCity : 'Espanha'
                  } (${filteredAndSortedLeads.length.toLocaleString()} leads)`
                );
                setIsAudienceModalOpen(true);
              }}
              disabled={filteredAndSortedLeads.length === 0}
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:opacity-95 transition-all cursor-pointer"
            >
              <BookmarkPlus className="h-3.5 w-3.5" />
              <span>Salvar Filtro como Público ({filteredAndSortedLeads.length.toLocaleString()})</span>
            </button>
          </div>
        </div>
      </div>

      {/* BULK SELECTION ACTIONS BAR */}
      {selectedIds.length > 0 && (
        <div
          className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl p-3.5 border shadow-lg transition-all animate-in fade-in slide-in-from-top-2 ${
            isLight
              ? 'border-indigo-200 bg-indigo-50/90 text-indigo-950'
              : 'border-indigo-500/40 bg-indigo-950/80 text-indigo-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-[11px] font-bold text-white">
              {selectedIds.length}
            </span>
            <span className="text-xs font-bold">Leads Selecionados</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => handleBulkStatusChange('qualified')}
              className="rounded-lg bg-purple-600 hover:bg-purple-700 px-3 py-1.5 text-xs font-semibold text-white transition-all cursor-pointer"
            >
              Marcar como Qualificados
            </button>
            <button
              onClick={() => handleBulkStatusChange('contacted')}
              className="rounded-lg bg-amber-600 hover:bg-amber-700 px-3 py-1.5 text-xs font-semibold text-white transition-all cursor-pointer"
            >
              Marcar Em Campanha
            </button>
            <button
              onClick={handleBulkDelete}
              className="flex items-center gap-1 rounded-lg bg-rose-600 hover:bg-rose-700 px-3 py-1.5 text-xs font-semibold text-white transition-all cursor-pointer"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Excluir ({selectedIds.length})</span>
            </button>
            <button
              onClick={() => setSelectedIds([])}
              className="rounded-lg border border-zinc-500/30 px-3 py-1.5 text-xs font-semibold hover:bg-white/10 transition-all cursor-pointer"
            >
              Desmarcar
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. TABLE VIEW (COMPACT, HIGH-DENSITY, INTERNAL MOUSE SCROLL)              */}
      {/* ========================================================================= */}
      {viewMode === 'table' && (
        <div
          className={`rounded-2xl border shadow-xs transition-all overflow-hidden ${
            isLight ? 'border-slate-200/80 bg-white' : 'border-zinc-800/80 bg-zinc-900/90'
          }`}
        >
          {/* Scrollable Table Container */}
          <div className="max-h-[620px] overflow-y-auto overflow-x-auto scrollbar-thin">
            <table className="w-full text-left text-xs border-collapse">
              <thead
                className={`sticky top-0 z-10 text-[11px] font-bold uppercase tracking-wider border-b ${
                  isLight
                    ? 'bg-slate-100/95 text-slate-600 border-slate-200/80 backdrop-blur-md'
                    : 'bg-zinc-950/95 text-zinc-400 border-zinc-800/80 backdrop-blur-md'
                }`}
              >
                <tr>
                  <th className="w-10 py-3 px-3.5 text-center">
                    <input
                      type="checkbox"
                      onChange={handleSelectAll}
                      checked={paginatedLeads.length > 0 && selectedIds.length === paginatedLeads.length}
                      className="h-3.5 w-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                  </th>
                  <th
                    onClick={() => handleSort('name')}
                    className="py-3 px-3.5 cursor-pointer hover:text-indigo-500 transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Consumidor / Perfil / Clube</span>
                      {sortField === 'name' ? (
                        sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                      ) : (
                        <ArrowUpDown className="h-3 w-3 opacity-40" />
                      )}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('email')}
                    className="py-3 px-3.5 cursor-pointer hover:text-indigo-500 transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>E-mail & Auditoria DoH MX</span>
                      {sortField === 'email' ? (
                        sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                      ) : (
                        <ArrowUpDown className="h-3 w-3 opacity-40" />
                      )}
                    </div>
                  </th>
                  <th className="py-3 px-3.5">Rede Social / Origem</th>
                  <th className="py-3 px-3.5">WhatsApp / Telefone</th>
                  <th
                    onClick={() => handleSort('city')}
                    className="py-3 px-3.5 cursor-pointer hover:text-indigo-500 transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Cidade / Espanha</span>
                      {sortField === 'city' ? (
                        sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                      ) : (
                        <ArrowUpDown className="h-3 w-3 opacity-40" />
                      )}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('status')}
                    className="py-3 px-3.5 cursor-pointer hover:text-indigo-500 transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Status CRM</span>
                      {sortField === 'status' ? (
                        sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                      ) : (
                        <ArrowUpDown className="h-3 w-3 opacity-40" />
                      )}
                    </div>
                  </th>
                  <th className="py-3 px-3.5 text-right">Ações (CRUD)</th>
                </tr>
              </thead>

              <tbody className={`divide-y ${isLight ? 'divide-slate-100 text-slate-800' : 'divide-zinc-800/60 text-zinc-200'}`}>
                {paginatedLeads.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-zinc-500">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Users className="h-8 w-8 opacity-30 text-indigo-500" />
                        <p className="text-sm font-semibold">Nenhum lead encontrado com os filtros atuais.</p>
                        <p className="text-xs text-zinc-400">Tente ajustar a busca ou limpar os filtros.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedLeads.map((lead) => {
                    const isSelected = selectedIds.includes(lead.id);
                    const socialInfo = detectSocialPlatform(lead);

                    return (
                      <tr
                        key={lead.id}
                        className={`transition-colors hover:bg-indigo-50/30 dark:hover:bg-indigo-950/20 ${
                          isSelected ? (isLight ? 'bg-indigo-50/60' : 'bg-indigo-950/40') : ''
                        }`}
                      >
                        {/* Checkbox */}
                        <td className="py-2.5 px-3.5 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelect(lead.id)}
                            className="h-3.5 w-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                          />
                        </td>

                        {/* Nome / Perfil / Clube */}
                        <td className="py-2.5 px-3.5">
                          <div className="space-y-0.5">
                            <div className="font-bold text-xs flex items-center gap-1.5">
                              <span>{lead.name}</span>
                              {lead.opted_out && (
                                <span className="rounded-md bg-rose-500/10 px-1.5 py-0.2 text-[10px] font-bold text-rose-500">
                                  Opt-out
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate max-w-[220px]">
                              {lead.company_name}
                            </div>
                            {lead.role && (
                              <div className="text-[10px] text-indigo-500 dark:text-indigo-400 font-medium">
                                {lead.role}
                              </div>
                            )}
                          </div>
                        </td>

                        {/* E-mail & Auditoria DoH MX */}
                        <td className="py-2.5 px-3.5">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 font-mono text-xs">
                              <span className="truncate max-w-[220px]">{lead.email}</span>
                              <button
                                onClick={() => handleCopyEmail(lead.email)}
                                className="rounded p-0.5 text-zinc-400 hover:text-indigo-500 cursor-pointer transition-colors"
                                title="Copiar e-mail"
                              >
                                {copiedEmail === lead.email ? (
                                  <Check className="h-3 w-3 text-emerald-500" />
                                ) : (
                                  <Copy className="h-3 w-3" />
                                )}
                              </button>
                            </div>
                            <div>
                              {lead.mx_valid ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-500 border border-emerald-500/20">
                                  <CheckCircle2 className="h-2.5 w-2.5" />
                                  MX Válido {lead.mx_record ? `(${lead.mx_record.slice(0, 16)})` : ''}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2 py-0.5 text-[10px] font-bold text-rose-500 border border-rose-500/20">
                                  MX Inativo
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Rede Social / Origem */}
                        <td className="py-2.5 px-3.5">
                          <div className="space-y-1">
                            <span
                              className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold border ${socialInfo.color}`}
                            >
                              {socialInfo.icon}
                              <span>{socialInfo.label}</span>
                            </span>
                            {lead.source_url && (
                              <a
                                href={lead.source_url}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-1 text-[10px] text-zinc-400 hover:text-indigo-500 truncate max-w-[140px]"
                                title={lead.source_url}
                              >
                                <span>Ver Fonte</span>
                                <ExternalLink className="h-2.5 w-2.5" />
                              </a>
                            )}
                          </div>
                        </td>

                        {/* WhatsApp / Telefone */}
                        <td className="py-2.5 px-3.5">
                          {lead.phone ? (
                            <a
                              href={`https://wa.me/${lead.phone.replace(/\D/g, '')}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/10 px-2.5 py-1 text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition-all"
                            >
                              <Phone className="h-3 w-3" />
                              <span>{lead.phone}</span>
                            </a>
                          ) : (
                            <span className="text-zinc-400 text-[11px]">—</span>
                          )}
                        </td>

                        {/* Cidade / Província */}
                        <td className="py-2.5 px-3.5">
                          <div className="space-y-0.5">
                            <div className="font-semibold text-xs">{lead.city || 'Madrid'}</div>
                            <div className="text-[10px] text-zinc-400">{lead.province || 'Espanha'}</div>
                          </div>
                        </td>

                        {/* Status CRM Dropdown */}
                        <td className="py-2.5 px-3.5">
                          <select
                            value={lead.status}
                            onChange={(e) => updateLead(lead.id, { status: e.target.value as LeadStatus })}
                            className={`rounded-lg border px-2 py-1 text-[11px] font-bold focus:outline-hidden cursor-pointer ${
                              lead.status === 'converted'
                                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-500'
                                : lead.status === 'replied'
                                ? 'border-teal-500/40 bg-teal-500/10 text-teal-500'
                                : lead.status === 'contacted'
                                ? 'border-amber-500/40 bg-amber-500/10 text-amber-500'
                                : lead.status === 'qualified'
                                ? 'border-purple-500/40 bg-purple-500/10 text-purple-500'
                                : lead.status === 'unqualified'
                                ? 'border-zinc-500/40 bg-zinc-500/10 text-zinc-500'
                                : 'border-blue-500/40 bg-blue-500/10 text-blue-500'
                            }`}
                          >
                            <option value="new">Novo Lead</option>
                            <option value="qualified">Qualificado</option>
                            <option value="contacted">Em Campanha</option>
                            <option value="replied">Respondeu</option>
                            <option value="converted">Convertido</option>
                            <option value="unqualified">Sem Interesse</option>
                          </select>
                        </td>

                        {/* Ações (CRUD) */}
                        <td className="py-2.5 px-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => {
                                setEditingLead(lead);
                                setIsEditModalOpen(true);
                              }}
                              className="rounded-lg p-1.5 text-zinc-400 hover:bg-indigo-500/10 hover:text-indigo-500 transition-colors cursor-pointer"
                              title="Editar Lead (CRUD)"
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                if (confirm(`Excluir o lead ${lead.name}?`)) {
                                  deleteLead(lead.id);
                                  setNotification({ type: 'success', message: 'Lead excluído.' });
                                }
                              }}
                              className="rounded-lg p-1.5 text-zinc-400 hover:bg-rose-500/10 hover:text-rose-500 transition-colors cursor-pointer"
                              title="Excluir Lead"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Table Pagination Footer */}
          <div
            className={`flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 border-t text-xs ${
              isLight ? 'border-slate-200/80 bg-slate-50/50' : 'border-zinc-800/80 bg-zinc-950/50'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="text-zinc-500">
                Mostrando{' '}
                <strong className={isLight ? 'text-slate-800' : 'text-white'}>
                  {filteredAndSortedLeads.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}
                </strong>{' '}
                a{' '}
                <strong className={isLight ? 'text-slate-800' : 'text-white'}>
                  {Math.min(currentPage * itemsPerPage, filteredAndSortedLeads.length)}
                </strong>{' '}
                de{' '}
                <strong className={isLight ? 'text-slate-800' : 'text-white'}>
                  {filteredAndSortedLeads.length.toLocaleString()}
                </strong>{' '}
                leads filtrados
              </span>

              <span className="text-zinc-400">•</span>

              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className={`rounded-lg border px-2 py-1 text-xs font-semibold focus:outline-hidden cursor-pointer ${
                  isLight ? 'border-slate-200 bg-white' : 'border-zinc-700 bg-zinc-800 text-white'
                }`}
              >
                <option value={50}>50 por página</option>
                <option value={100}>100 por página</option>
                <option value={250}>250 por página</option>
                <option value={500}>500 por página</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-semibold disabled:opacity-40 transition-all cursor-pointer"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                <span>Anterior</span>
              </button>

              <span className="px-2 font-bold text-xs">
                Página {currentPage} de {totalPages}
              </span>

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-semibold disabled:opacity-40 transition-all cursor-pointer"
              >
                <span>Próxima</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. KANBAN BOARD VIEW (HIGH PERFORMANCE PAGINATED CARDS PER COLUMN)        */}
      {/* ========================================================================= */}
      {viewMode === 'kanban' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6 gap-4 items-start">
          {crmStages.map((stage) => {
            const stageLeads = kanbanGroupedLeads[stage.id] || [];
            const visibleCount = kanbanVisibleCounts[stage.id] || 30;
            const displayedCards = stageLeads.slice(0, visibleCount);

            return (
              <div
                key={stage.id}
                className={`rounded-2xl border flex flex-col max-h-[750px] shadow-xs transition-all ${
                  isLight ? 'border-slate-200/80 bg-slate-50/50' : 'border-zinc-800/80 bg-zinc-900/60'
                }`}
              >
                {/* Column Header */}
                <div
                  className={`p-3.5 border-b rounded-t-2xl flex items-center justify-between bg-gradient-to-r ${stage.color} text-white`}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-xs tracking-tight">{stage.name}</span>
                  </div>
                  <span className="rounded-full bg-white/20 px-2 py-0.5 text-[11px] font-black">
                    {stageLeads.length.toLocaleString()}
                  </span>
                </div>

                {/* Cards Container with Internal Scroll */}
                <div className="p-2.5 space-y-2.5 overflow-y-auto max-h-[640px] scrollbar-thin flex-1">
                  {displayedCards.length === 0 ? (
                    <div className="py-8 text-center text-zinc-400 text-xs font-medium">
                      Nenhum lead nesta etapa
                    </div>
                  ) : (
                    displayedCards.map((lead) => {
                      const socialInfo = detectSocialPlatform(lead);

                      return (
                        <div
                          key={lead.id}
                          className={`p-3 rounded-xl border transition-all hover:scale-[1.01] space-y-2 shadow-xs ${
                            isLight
                              ? 'border-slate-200 bg-white text-slate-800 hover:border-indigo-300'
                              : 'border-zinc-800 bg-zinc-900 text-zinc-200 hover:border-indigo-500/40'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="font-bold text-xs leading-tight">{lead.name}</div>
                            <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-bold border ${socialInfo.color}`}>
                              {socialInfo.icon}
                              <span>{socialInfo.label}</span>
                            </span>
                          </div>

                          <div className="text-[11px] text-zinc-500 truncate">{lead.company_name}</div>

                          <div className="flex items-center justify-between text-[10px]">
                            <span className="font-mono text-zinc-400 truncate max-w-[150px]">{lead.email}</span>
                            {lead.mx_valid && <span className="text-emerald-500 font-bold">✓ MX</span>}
                          </div>

                          {lead.phone && (
                            <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono font-semibold flex items-center gap-1">
                              <Phone className="h-2.5 w-2.5" />
                              <span>{lead.phone}</span>
                            </div>
                          )}

                          {/* Quick Stage Move Dropdown & Edit */}
                          <div className={`pt-1.5 border-t flex items-center justify-between gap-1 ${isLight ? 'border-slate-100' : 'border-zinc-800/60'}`}>
                            <select
                              value={lead.status}
                              onChange={(e) => updateLead(lead.id, { status: e.target.value as LeadStatus })}
                              className={`rounded-md border px-1.5 py-0.5 text-[10px] font-semibold cursor-pointer max-w-[120px] ${
                                isLight
                                  ? 'border-slate-200 bg-slate-50 text-slate-800'
                                  : 'border-zinc-700 bg-zinc-800 text-zinc-200'
                              }`}
                            >
                              <option value="new">Novo Lead</option>
                              <option value="qualified">Qualificado</option>
                              <option value="contacted">Em Campanha</option>
                              <option value="replied">Respondeu</option>
                              <option value="converted">Convertido</option>
                              <option value="unqualified">Sem Interesse</option>
                            </select>

                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => {
                                  setEditingLead(lead);
                                  setIsEditModalOpen(true);
                                }}
                                className="p-1 rounded text-zinc-400 hover:text-indigo-500"
                                title="Editar"
                              >
                                <Edit className="h-3 w-3" />
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm(`Excluir ${lead.name}?`)) deleteLead(lead.id);
                                }}
                                className="p-1 rounded text-zinc-400 hover:text-rose-500"
                                title="Excluir"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}

                  {/* Load More Button for this Column */}
                  {stageLeads.length > visibleCount && (
                    <button
                      onClick={() =>
                        setKanbanVisibleCounts((prev) => ({
                          ...prev,
                          [stage.id]: (prev[stage.id] || 30) + 50,
                        }))
                      }
                      className="w-full py-2 rounded-xl border border-dashed border-indigo-500/40 text-indigo-500 hover:bg-indigo-500/10 text-xs font-bold transition-all cursor-pointer"
                    >
                      + Carregar Mais (+50 de {(stageLeads.length - visibleCount).toLocaleString()})
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODALS SECTION                                                            */}
      {/* ========================================================================= */}

      {/* 1. EDIT LEAD (CRUD) MODAL */}
      {isEditModalOpen && editingLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div
            className={`w-full max-w-lg rounded-2xl border p-6 shadow-2xl transition-all ${
              isLight ? 'border-slate-200 bg-white text-slate-900' : 'border-zinc-800 bg-zinc-900 text-white'
            }`}
          >
            <div className={`flex items-center justify-between pb-3 border-b ${isLight ? 'border-slate-200' : 'border-zinc-800'}`}>
              <div className="flex items-center gap-2">
                <Edit className="h-5 w-5 text-indigo-500" />
                <h3 className={`text-lg font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>Editar Lead (CRUD)</h3>
              </div>
              <button
                onClick={() => {
                  setIsEditModalOpen(false);
                  setEditingLead(null);
                }}
                className={`rounded-lg p-1 cursor-pointer transition-colors ${
                  isLight ? 'text-slate-400 hover:text-slate-700' : 'text-zinc-400 hover:text-white'
                }`}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateLeadSubmit} className="space-y-3.5 pt-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`text-xs font-semibold ${isLight ? 'text-slate-700' : 'text-zinc-300'}`}>Nome do Consumidor</label>
                  <input
                    type="text"
                    value={editingLead.name}
                    onChange={(e) => setEditingLead({ ...editingLead, name: e.target.value })}
                    className={`w-full mt-1 rounded-xl border px-3 py-2 text-xs focus:outline-none ${
                      isLight ? 'border-slate-300 bg-white text-slate-900 focus:ring-2 focus:ring-indigo-500' : 'border-zinc-700 bg-zinc-800 text-white focus:ring-2 focus:ring-indigo-500'
                    }`}
                    required
                  />
                </div>

                <div>
                  <label className={`text-xs font-semibold ${isLight ? 'text-slate-700' : 'text-zinc-300'}`}>E-mail</label>
                  <input
                    type="email"
                    value={editingLead.email}
                    onChange={(e) => setEditingLead({ ...editingLead, email: e.target.value })}
                    className={`w-full mt-1 rounded-xl border px-3 py-2 text-xs focus:outline-none ${
                      isLight ? 'border-slate-300 bg-white text-slate-900 focus:ring-2 focus:ring-indigo-500' : 'border-zinc-700 bg-zinc-800 text-white focus:ring-2 focus:ring-indigo-500'
                    }`}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`text-xs font-semibold ${isLight ? 'text-slate-700' : 'text-zinc-300'}`}>Perfil / Comunidade / Clube</label>
                  <input
                    type="text"
                    value={editingLead.company_name}
                    onChange={(e) => setEditingLead({ ...editingLead, company_name: e.target.value })}
                    className={`w-full mt-1 rounded-xl border px-3 py-2 text-xs focus:outline-none ${
                      isLight ? 'border-slate-300 bg-white text-slate-900' : 'border-zinc-700 bg-zinc-800 text-white'
                    }`}
                  />
                </div>

                <div>
                  <label className={`text-xs font-semibold ${isLight ? 'text-slate-700' : 'text-zinc-300'}`}>WhatsApp / Telefone (+34)</label>
                  <input
                    type="text"
                    value={editingLead.phone || ''}
                    onChange={(e) => setEditingLead({ ...editingLead, phone: e.target.value })}
                    placeholder="+34 600 000 000"
                    className={`w-full mt-1 rounded-xl border px-3 py-2 text-xs focus:outline-none ${
                      isLight ? 'border-slate-300 bg-white text-slate-900' : 'border-zinc-700 bg-zinc-800 text-white'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`text-xs font-semibold ${isLight ? 'text-slate-700' : 'text-zinc-300'}`}>Cidade (Espanha)</label>
                  <input
                    type="text"
                    value={editingLead.city || ''}
                    onChange={(e) => setEditingLead({ ...editingLead, city: e.target.value })}
                    className={`w-full mt-1 rounded-xl border px-3 py-2 text-xs focus:outline-none ${
                      isLight ? 'border-slate-300 bg-white text-slate-900' : 'border-zinc-700 bg-zinc-800 text-white'
                    }`}
                  />
                </div>

                <div>
                  <label className={`text-xs font-semibold ${isLight ? 'text-slate-700' : 'text-zinc-300'}`}>Status no CRM</label>
                  <select
                    value={editingLead.status}
                    onChange={(e) => setEditingLead({ ...editingLead, status: e.target.value as LeadStatus })}
                    className={`w-full mt-1 rounded-xl border px-3 py-2 text-xs focus:outline-none cursor-pointer ${
                      isLight ? 'border-slate-300 bg-white text-slate-900' : 'border-zinc-700 bg-zinc-800 text-white'
                    }`}
                  >
                    <option value="new">Novo Lead</option>
                    <option value="qualified">Qualificado</option>
                    <option value="contacted">Em Campanha</option>
                    <option value="replied">Respondeu</option>
                    <option value="converted">Convertido</option>
                    <option value="unqualified">Sem Interesse</option>
                  </select>
                </div>
              </div>

              <div>
                <label className={`text-xs font-semibold ${isLight ? 'text-slate-700' : 'text-zinc-300'}`}>URL da Fonte / Rede Social</label>
                <input
                  type="text"
                  value={editingLead.source_url || ''}
                  onChange={(e) => setEditingLead({ ...editingLead, source_url: e.target.value })}
                  placeholder="https://instagram.com/..."
                  className={`w-full mt-1 rounded-xl border px-3 py-2 text-xs focus:outline-none ${
                    isLight ? 'border-slate-300 bg-white text-slate-900' : 'border-zinc-700 bg-zinc-800 text-white'
                  }`}
                />
              </div>

              <div>
                <label className={`text-xs font-semibold ${isLight ? 'text-slate-700' : 'text-zinc-300'}`}>Tags (separadas por vírgula)</label>
                <input
                  type="text"
                  value={(editingLead.tags || []).join(', ')}
                  onChange={(e) =>
                    setEditingLead({
                      ...editingLead,
                      tags: e.target.value.split(',').map((t) => t.trim()),
                    })
                  }
                  className={`w-full mt-1 rounded-xl border px-3 py-2 text-xs focus:outline-none ${
                    isLight ? 'border-slate-300 bg-white text-slate-900' : 'border-zinc-700 bg-zinc-800 text-white'
                  }`}
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="optout-edit"
                  checked={editingLead.opted_out}
                  onChange={(e) => setEditingLead({ ...editingLead, opted_out: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500 cursor-pointer"
                />
                <label htmlFor="optout-edit" className={`text-xs cursor-pointer ${isLight ? 'text-slate-700' : 'text-zinc-300'}`}>
                  Marcar como Descadastrado (Opt-out)
                </label>
              </div>

              <div className={`flex items-center justify-end gap-2 pt-3 border-t ${isLight ? 'border-slate-200' : 'border-zinc-800'}`}>
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className={`rounded-xl border px-4 py-2 text-xs font-semibold cursor-pointer ${
                    isLight ? 'border-slate-300 text-slate-700 hover:bg-slate-100' : 'border-zinc-700 text-zinc-300 hover:bg-zinc-800'
                  }`}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-indigo-600 hover:bg-indigo-500 px-5 py-2 text-xs font-bold text-white shadow-lg cursor-pointer"
                >
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. ADD NEW LEAD MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div
            className={`w-full max-w-lg rounded-2xl border p-6 shadow-2xl transition-all ${
              isLight ? 'border-slate-200 bg-white text-slate-900' : 'border-zinc-800 bg-zinc-900 text-white'
            }`}
          >
            <div className={`flex items-center justify-between pb-3 border-b ${isLight ? 'border-slate-200' : 'border-zinc-800'}`}>
              <div className="flex items-center gap-2">
                <Plus className="h-5 w-5 text-indigo-500" />
                <h3 className={`text-lg font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>Cadastrar Novo Lead</h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className={`rounded-lg p-1 cursor-pointer transition-colors ${
                  isLight ? 'text-slate-400 hover:text-slate-700' : 'text-zinc-400 hover:text-white'
                }`}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveLead} className="space-y-3.5 pt-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`text-xs font-semibold ${isLight ? 'text-slate-700' : 'text-zinc-300'}`}>Nome do Consumidor</label>
                  <input
                    type="text"
                    value={newLead.name}
                    onChange={(e) => setNewLead({ ...newLead, name: e.target.value })}
                    placeholder="Ex: Carlos Martínez"
                    className={`w-full mt-1 rounded-xl border px-3 py-2 text-xs focus:outline-none ${
                      isLight ? 'border-slate-300 bg-white text-slate-900 focus:ring-2 focus:ring-indigo-500' : 'border-zinc-700 bg-zinc-800 text-white focus:ring-2 focus:ring-indigo-500'
                    }`}
                    required
                  />
                </div>

                <div>
                  <label className={`text-xs font-semibold ${isLight ? 'text-slate-700' : 'text-zinc-300'}`}>E-mail *</label>
                  <input
                    type="email"
                    value={newLead.email}
                    onChange={(e) => setNewLead({ ...newLead, email: e.target.value })}
                    placeholder="carlos@gmail.com"
                    className={`w-full mt-1 rounded-xl border px-3 py-2 text-xs focus:outline-none ${
                      isLight ? 'border-slate-300 bg-white text-slate-900 focus:ring-2 focus:ring-indigo-500' : 'border-zinc-700 bg-zinc-800 text-white focus:ring-2 focus:ring-indigo-500'
                    }`}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`text-xs font-semibold ${isLight ? 'text-slate-700' : 'text-zinc-300'}`}>Clube / Comunidade</label>
                  <input
                    type="text"
                    value={newLead.company_name}
                    onChange={(e) => setNewLead({ ...newLead, company_name: e.target.value })}
                    placeholder="Ex: Peña Madridista"
                    className={`w-full mt-1 rounded-xl border px-3 py-2 text-xs focus:outline-none ${
                      isLight ? 'border-slate-300 bg-white text-slate-900' : 'border-zinc-700 bg-zinc-800 text-white'
                    }`}
                  />
                </div>

                <div>
                  <label className={`text-xs font-semibold ${isLight ? 'text-slate-700' : 'text-zinc-300'}`}>WhatsApp / Telefone (+34)</label>
                  <input
                    type="text"
                    value={newLead.phone}
                    onChange={(e) => setNewLead({ ...newLead, phone: e.target.value })}
                    placeholder="+34 612 345 678"
                    className={`w-full mt-1 rounded-xl border px-3 py-2 text-xs focus:outline-none ${
                      isLight ? 'border-slate-300 bg-white text-slate-900' : 'border-zinc-700 bg-zinc-800 text-white'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`text-xs font-semibold ${isLight ? 'text-slate-700' : 'text-zinc-300'}`}>Cidade (Espanha)</label>
                  <input
                    type="text"
                    value={newLead.city}
                    onChange={(e) => setNewLead({ ...newLead, city: e.target.value })}
                    className={`w-full mt-1 rounded-xl border px-3 py-2 text-xs focus:outline-none ${
                      isLight ? 'border-slate-300 bg-white text-slate-900' : 'border-zinc-700 bg-zinc-800 text-white'
                    }`}
                  />
                </div>

                <div>
                  <label className={`text-xs font-semibold ${isLight ? 'text-slate-700' : 'text-zinc-300'}`}>Status Inicial CRM</label>
                  <select
                    value={newLead.status}
                    onChange={(e) => setNewLead({ ...newLead, status: e.target.value as LeadStatus })}
                    className={`w-full mt-1 rounded-xl border px-3 py-2 text-xs focus:outline-none cursor-pointer ${
                      isLight ? 'border-slate-300 bg-white text-slate-900' : 'border-zinc-700 bg-zinc-800 text-white'
                    }`}
                  >
                    <option value="new">Novo Lead</option>
                    <option value="qualified">Qualificado</option>
                  </select>
                </div>
              </div>

              <div>
                <label className={`text-xs font-semibold ${isLight ? 'text-slate-700' : 'text-zinc-300'}`}>Tags (separadas por vírgula)</label>
                <input
                  type="text"
                  value={newLead.tags}
                  onChange={(e) => setNewLead({ ...newLead, tags: e.target.value })}
                  placeholder="LaLiga, Instagram, Teste 24h"
                  className={`w-full mt-1 rounded-xl border px-3 py-2 text-xs focus:outline-none ${
                    isLight ? 'border-slate-300 bg-white text-slate-900' : 'border-zinc-700 bg-zinc-800 text-white'
                  }`}
                />
              </div>

              <div className={`flex items-center justify-end gap-2 pt-3 border-t ${isLight ? 'border-slate-200' : 'border-zinc-800'}`}>
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className={`rounded-xl border px-4 py-2 text-xs font-semibold cursor-pointer ${
                    isLight ? 'border-slate-300 text-slate-700 hover:bg-slate-100' : 'border-zinc-700 text-zinc-300 hover:bg-zinc-800'
                  }`}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-indigo-600 hover:bg-indigo-500 px-5 py-2 text-xs font-bold text-white shadow-lg cursor-pointer"
                >
                  Cadastrar Lead
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. SAVE AUDIENCE MODAL */}
      {isAudienceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div
            className={`w-full max-w-md rounded-2xl border p-6 shadow-2xl transition-all ${
              isLight ? 'border-slate-200 bg-white text-slate-900' : 'border-zinc-800 bg-zinc-900 text-white'
            }`}
          >
            <div className={`flex items-center justify-between pb-3 border-b ${isLight ? 'border-slate-200' : 'border-zinc-800'}`}>
              <div className="flex items-center gap-2">
                <BookmarkPlus className="h-5 w-5 text-purple-500" />
                <h3 className={`text-lg font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>Salvar Segmentação de Público</h3>
              </div>
              <button
                onClick={() => setIsAudienceModalOpen(false)}
                className={`rounded-lg p-1 cursor-pointer transition-colors ${
                  isLight ? 'text-slate-400 hover:text-slate-700' : 'text-zinc-400 hover:text-white'
                }`}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className={`mb-4 rounded-xl border p-3 text-xs ${
              isLight ? 'bg-purple-50 border-purple-200 text-purple-800' : 'bg-purple-500/10 border-purple-500/20 text-purple-300'
            }`}>
              <div className={`font-bold ${isLight ? 'text-purple-900' : 'text-purple-400'}`}>Total Pré-Calculado do Segmento:</div>
              <div className={`text-lg font-extrabold mt-0.5 ${isLight ? 'text-purple-950' : 'text-white'}`}>
                {filteredAndSortedLeads.length.toLocaleString()} Leads Prontos para Campanha
              </div>
            </div>

            <form onSubmit={handleSaveAudience} className="space-y-3.5">
              <div>
                <label className={`text-xs font-semibold ${isLight ? 'text-slate-700' : 'text-zinc-300'}`}>Nome do Público</label>
                <input
                  type="text"
                  value={audienceName}
                  onChange={(e) => setAudienceName(e.target.value)}
                  placeholder="Ex: Torcedores LaLiga Instagram - Madrid & Barcelona"
                  className={`w-full mt-1 rounded-xl border px-3 py-2 text-xs focus:outline-none ${
                    isLight ? 'border-slate-300 bg-white text-slate-900 focus:ring-2 focus:ring-purple-500' : 'border-zinc-700 bg-zinc-800 text-white focus:ring-2 focus:ring-purple-500'
                  }`}
                  required
                />
              </div>

              <div>
                <label className={`text-xs font-semibold ${isLight ? 'text-slate-700' : 'text-zinc-300'}`}>Descrição / Objetivo da Campanha</label>
                <textarea
                  value={audienceDesc}
                  onChange={(e) => setAudienceDesc(e.target.value)}
                  placeholder="Ex: Disparo do template de 24h para aficionados de futebol na Espanha"
                  rows={3}
                  className={`w-full mt-1 rounded-xl border px-3 py-2 text-xs focus:outline-none ${
                    isLight ? 'border-slate-300 bg-white text-slate-900' : 'border-zinc-700 bg-zinc-800 text-white'
                  }`}
                />
              </div>

              <div className={`flex items-center justify-end gap-2 pt-3 border-t ${isLight ? 'border-slate-200' : 'border-zinc-800'}`}>
                <button
                  type="button"
                  onClick={() => setIsAudienceModalOpen(false)}
                  className={`rounded-xl border px-4 py-2 text-xs font-semibold cursor-pointer ${
                    isLight ? 'border-slate-300 text-slate-700 hover:bg-slate-100' : 'border-zinc-700 text-zinc-300 hover:bg-zinc-800'
                  }`}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:opacity-95 px-5 py-2 text-xs font-bold text-white shadow-lg cursor-pointer"
                >
                  Salvar Público
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. SAVED AUDIENCES LIST DRAWER / MODAL */}
      {isAudiencesListModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div
            className={`w-full max-w-2xl rounded-2xl border p-6 shadow-2xl transition-all ${
              isLight ? 'border-slate-200 bg-white text-slate-900' : 'border-zinc-800 bg-zinc-900 text-white'
            }`}
          >
            <div className={`flex items-center justify-between pb-3 border-b ${isLight ? 'border-slate-200' : 'border-zinc-800'}`}>
              <div className="flex items-center gap-2">
                <BookmarkPlus className="h-5 w-5 text-purple-500" />
                <h3 className={`text-lg font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>Públicos Segmentados Salvos ({audiences.length})</h3>
              </div>
              <button
                onClick={() => setIsAudiencesListModalOpen(false)}
                className={`rounded-lg p-1 cursor-pointer transition-colors ${
                  isLight ? 'text-slate-400 hover:text-slate-700' : 'text-zinc-400 hover:text-white'
                }`}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="max-h-[400px] overflow-y-auto space-y-3 scrollbar-thin">
              {audiences.length === 0 ? (
                <div className="py-12 text-center text-zinc-500">
                  <BookmarkPlus className="h-8 w-8 mx-auto mb-2 opacity-30 text-purple-500" />
                  <p className="text-sm font-semibold">Nenhum público salvo ainda.</p>
                  <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>Filtre a galeria e clique em "Salvar Filtro como Público".</p>
                </div>
              ) : (
                audiences.map((aud) => (
                  <div
                    key={aud.id}
                    className={`p-4 rounded-xl border flex items-center justify-between gap-4 transition-all ${
                      isLight ? 'border-slate-200 bg-slate-50' : 'border-zinc-800 bg-zinc-950'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="font-bold text-sm text-indigo-500">{aud.name}</div>
                      {aud.description && <div className={`text-xs ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>{aud.description}</div>}
                      <div className={`flex items-center gap-2 text-[10px] pt-1 ${isLight ? 'text-slate-500' : 'text-zinc-500'}`}>
                        <span className="rounded bg-indigo-500/10 px-2 py-0.5 font-bold text-indigo-500">
                          {aud.lead_count ? aud.lead_count.toLocaleString() : 'Todos'} Leads
                        </span>
                        <span>Criado em {new Date(aud.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {onNavigateToCampaigns && (
                        <button
                          onClick={() => {
                            setIsAudiencesListModalOpen(false);
                            onNavigateToCampaigns(aud.id);
                          }}
                          className="flex items-center gap-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 px-3 py-1.5 text-xs font-bold text-white shadow-xs cursor-pointer"
                        >
                          <Send className="h-3 w-3" />
                          <span>Disparar Campanha</span>
                        </button>
                      )}
                      <button
                        onClick={() => {
                          if (confirm(`Excluir o público "${aud.name}"?`)) deleteAudience(aud.id);
                        }}
                        className="rounded-lg p-1.5 text-zinc-400 hover:bg-rose-500/10 hover:text-rose-500 cursor-pointer"
                        title="Excluir Público"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* 5. CSV IMPORT MODAL */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div
            className={`w-full max-w-md rounded-2xl border p-6 shadow-2xl transition-all ${
              isLight ? 'border-slate-200 bg-white text-slate-900' : 'border-zinc-800 bg-zinc-900 text-white'
            }`}
          >
            <div className={`flex items-center justify-between pb-3 border-b ${isLight ? 'border-slate-200' : 'border-zinc-800'}`}>
              <div className="flex items-center gap-2">
                <Upload className="h-5 w-5 text-indigo-500" />
                <h3 className={`text-lg font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>Importar Lista de Leads (CSV)</h3>
              </div>
              <button
                onClick={() => setIsImportModalOpen(false)}
                className={`rounded-lg p-1 cursor-pointer transition-colors ${
                  isLight ? 'text-slate-400 hover:text-slate-700' : 'text-zinc-400 hover:text-white'
                }`}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 pt-3">
              <div
                className={`rounded-xl border-2 border-dashed p-6 text-center transition-colors ${
                  isLight
                    ? 'border-slate-300 bg-slate-50 hover:bg-slate-100/80 hover:border-indigo-400'
                    : 'border-zinc-700 bg-zinc-950/40 hover:border-indigo-500'
                }`}
              >
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="hidden"
                  id="csv-upload"
                />
                <label htmlFor="csv-upload" className="cursor-pointer flex flex-col items-center gap-2">
                  <Upload className="h-8 w-8 text-indigo-500" />
                  <span className={`text-xs font-semibold ${isLight ? 'text-slate-800' : 'text-white'}`}>Clique para selecionar arquivo .CSV</span>
                  <span className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>Colunas: Nome, Email, WhatsApp, Cidade, Clube</span>
                </label>
              </div>

              {csvFile && (
                <div className={`p-3 rounded-xl border text-xs ${
                  isLight ? 'bg-indigo-50 border-indigo-200 text-indigo-800' : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-300'
                }`}>
                  <span className="font-bold">Arquivo selecionado:</span> {csvFile.name}
                </div>
              )}

              {csvPreviewData.length > 0 && (
                <div className="text-[11px] space-y-1">
                  <div className={`font-bold ${isLight ? 'text-slate-700' : 'text-zinc-300'}`}>Prévia das primeiras linhas:</div>
                  <div
                    className={`max-h-24 overflow-y-auto rounded-lg p-2 font-mono text-[10px] border ${
                      isLight ? 'bg-slate-100 border-slate-200 text-slate-800' : 'bg-zinc-950 border-zinc-800 text-zinc-300'
                    }`}
                  >
                    {csvPreviewData.map((row, i) => (
                      <div key={i} className="truncate">
                        {row.Nome || row.name || 'Sem nome'} • {row.Email || row.email}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className={`flex items-center justify-end gap-2 pt-2 border-t ${isLight ? 'border-slate-200' : 'border-zinc-800'}`}>
                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(false)}
                  className={`rounded-xl border px-4 py-2 text-xs font-semibold cursor-pointer ${
                    isLight ? 'border-slate-300 text-slate-700 hover:bg-slate-100' : 'border-zinc-700 text-zinc-300 hover:bg-zinc-800'
                  }`}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleImportCSVSubmit}
                  disabled={!csvFile || isImporting}
                  className="rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 px-5 py-2 text-xs font-bold text-white shadow-lg cursor-pointer"
                >
                  {isImporting ? 'Importando...' : 'Iniciar Importação'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. CUSTOM KANBAN STAGES MODAL */}
      {isStagesModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div
            className={`w-full max-w-lg rounded-2xl border p-6 shadow-2xl transition-all ${
              isLight ? 'border-slate-200 bg-white text-slate-900' : 'border-zinc-800 bg-zinc-900 text-white'
            }`}
          >
            <div className={`flex items-center justify-between pb-3 border-b ${isLight ? 'border-slate-200' : 'border-zinc-800'}`}>
              <div className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-indigo-500" />
                <h3 className={`text-lg font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>Customizar Etapas do Funil (Kanban)</h3>
              </div>
              <button
                onClick={() => setIsStagesModalOpen(false)}
                className={`rounded-lg p-1 cursor-pointer transition-colors ${
                  isLight ? 'text-slate-400 hover:text-slate-700' : 'text-zinc-400 hover:text-white'
                }`}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 max-h-[350px] overflow-y-auto scrollbar-thin pt-3">
              {crmStages.map((stg, index) => (
                <div
                  key={stg.id}
                  className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${
                    isLight ? 'border-slate-200 bg-slate-50' : 'border-zinc-800 bg-zinc-950'
                  }`}
                >
                  <div className="flex items-center gap-2 flex-1">
                    <span className={`text-xs font-bold ${isLight ? 'text-slate-400' : 'text-zinc-500'}`}>#{index + 1}</span>
                    <input
                      type="text"
                      value={stg.name}
                      onChange={(e) => {
                        const newName = e.target.value;
                        setCrmStages((prev) =>
                          prev.map((s) => (s.id === stg.id ? { ...s, name: newName } : s))
                        );
                      }}
                      className={`flex-1 rounded-lg border px-2.5 py-1 text-xs focus:outline-none ${
                        isLight ? 'border-slate-300 bg-white text-slate-900' : 'border-zinc-700 bg-zinc-800 text-white'
                      }`}
                    />
                  </div>
                  <div className={`h-4 w-4 rounded-full bg-gradient-to-r ${stg.color}`} />
                </div>
              ))}
            </div>

            <div className={`flex items-center justify-between pt-4 border-t mt-4 ${isLight ? 'border-slate-200' : 'border-zinc-800'}`}>
              <button
                type="button"
                onClick={() => {
                  setCrmStages(DEFAULT_STAGES);
                  localStorage.removeItem('universa_crm_stages');
                  setNotification({ type: 'success', message: 'Etapas restauradas para o padrão!' });
                }}
                className={`text-xs underline cursor-pointer ${isLight ? 'text-slate-500 hover:text-slate-900' : 'text-zinc-400 hover:text-zinc-200'}`}
              >
                Restaurar Padrão
              </button>
              <button
                onClick={() => {
                  localStorage.setItem('universa_crm_stages', JSON.stringify(crmStages));
                  setIsStagesModalOpen(false);
                  setNotification({ type: 'success', message: 'Etapas do Kanban salvas com sucesso!' });
                }}
                className="rounded-xl bg-indigo-600 hover:bg-indigo-500 px-5 py-2 text-xs font-bold text-white shadow-lg cursor-pointer"
              >
                Salvar Etapas
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
