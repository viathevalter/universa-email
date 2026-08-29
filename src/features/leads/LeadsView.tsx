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
  Mail,
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
} from 'lucide-react';
import { useApp } from '../../shared/context/AppContext';
import type { Lead, LeadStatus, CompanySize } from '../../types';
import Papa from 'papaparse';
import confetti from 'canvas-confetti';

type SortField = 'name' | 'email' | 'company_name' | 'city' | 'status' | 'mx_valid' | 'created_at';
type SortDirection = 'asc' | 'desc';

export const LeadsView: React.FC = () => {
  const {
    leads,
    addLead,
    updateLead,
    deleteLead,
    deleteMultipleLeads,
    clearAllLeads,
    batchImportLeads,
    verifyLeadMx,
    verifyAllPendingMx,
    addAudience,
    syncWithSupabase,
    theme,
  } = useApp();

  const isLight = theme === 'light';

  // View mode
  const [viewMode, setViewMode] = useState<'table' | 'kanban'>('table');

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedCity, setSelectedCity] = useState<string>('all');
  const [onlyMxValid, setOnlyMxValid] = useState(false);
  const [excludeOptedOut, setExcludeOptedOut] = useState(false);

  // Sorting state
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);

  // Selection state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isAudienceModalOpen, setIsAudienceModalOpen] = useState(false);
  const [audienceName, setAudienceName] = useState('');
  const [audienceDesc, setAudienceDesc] = useState('');

  // New Lead Form state
  const [newLead, setNewLead] = useState({
    name: '',
    company_name: '',
    email: '',
    phone: '',
    website: '',
    sector: 'Streaming & Esportes B2C',
    role: 'Consumidor / Aficionado TV',
    company_size: 'B2C (Consumidor)' as CompanySize,
    city: 'Madrid',
    province: 'Comunidad de Madrid',
    country: 'Espanha',
    tags: 'LaLiga, Teste 24h',
    status: 'new' as LeadStatus,
  });

  // CSV Import State
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvPreviewData, setCsvPreviewData] = useState<any[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Unique cities list for filter
  const cities = useMemo(() => {
    const set = new Set<string>();
    leads.forEach((l) => {
      if (l.city) set.add(l.city);
    });
    return Array.from(set).sort();
  }, [leads]);

  // Filtered and Sorted Leads
  const filteredAndSortedLeads = useMemo(() => {
    const result = leads.filter((lead) => {
      if (selectedStatus !== 'all' && lead.status !== selectedStatus) return false;
      if (selectedCity !== 'all' && lead.city !== selectedCity) return false;
      if (onlyMxValid && !lead.mx_valid) return false;
      if (excludeOptedOut && lead.opted_out) return false;

      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matchName = lead.name.toLowerCase().includes(term);
        const matchEmail = lead.email.toLowerCase().includes(term);
        const matchComp = lead.company_name.toLowerCase().includes(term);
        const matchCity = (lead.city || '').toLowerCase().includes(term);
        const matchTags = (lead.tags || []).some((t) => t.toLowerCase().includes(term));
        return matchName || matchEmail || matchComp || matchCity || matchTags;
      }
      return true;
    });

    // Sorting
    result.sort((a, b) => {
      let valA: any = a[sortField] || '';
      let valB: any = b[sortField] || '';

      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [leads, selectedStatus, selectedCity, onlyMxValid, excludeOptedOut, searchTerm, sortField, sortDirection]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredAndSortedLeads.length / itemsPerPage));
  const paginatedLeads = filteredAndSortedLeads.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === paginatedLeads.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(paginatedLeads.map((l) => l.id));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return;
    if (confirm(`Tem certeza que deseja excluir os ${selectedIds.length} leads selecionados?`)) {
      await deleteMultipleLeads(selectedIds);
      setSelectedIds([]);
      setNotification({ type: 'success', message: 'Leads excluídos com sucesso!' });
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    const dataToExport = filteredAndSortedLeads.map((l) => ({
      Nome: l.name,
      Email: l.email,
      Telefone: l.phone || '',
      Empresa_Perfil: l.company_name,
      Cidade: l.city || '',
      Provincia: l.province || '',
      Pais: l.country || '',
      Status: l.status,
      MX_Valido: l.mx_valid ? 'SIM' : 'NAO',
      MX_Host: l.mx_record || '',
      Fonte_URL: l.source_url || '',
      Tags: (l.tags || []).join(', '),
      OptOut: l.opted_out ? 'SIM' : 'NAO',
      Criado_Em: l.created_at,
    }));

    const csv = Papa.unparse(dataToExport);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `leads_universa_export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    try {
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
    } catch {}
  };

  // Handle Save Lead
  const handleSaveLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLead.name || !newLead.email || !newLead.company_name) return;

    try {
      await addLead({
        name: newLead.name,
        company_name: newLead.company_name,
        email: newLead.email,
        phone: newLead.phone,
        website: newLead.website,
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
      setNotification({ type: 'success', message: 'Lead adicionado e validado via DoH MX com sucesso!' });
      setNewLead({
        name: '',
        company_name: '',
        email: '',
        phone: '',
        website: '',
        sector: 'Streaming & Esportes B2C',
        role: 'Consumidor / Aficionado TV',
        company_size: 'B2C (Consumidor)',
        city: 'Madrid',
        province: 'Comunidad de Madrid',
        country: 'Espanha',
        tags: 'LaLiga, Teste 24h',
        status: 'new',
      });
    } catch {
      setNotification({ type: 'error', message: 'Erro ao cadastrar lead.' });
    }
  };

  // Handle Update Lead (Edit CRUD)
  const handleUpdateLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLead) return;

    try {
      await updateLead(editingLead.id, {
        name: editingLead.name,
        company_name: editingLead.company_name,
        email: editingLead.email,
        phone: editingLead.phone,
        website: editingLead.website,
        sector: editingLead.sector,
        role: editingLead.role,
        city: editingLead.city,
        province: editingLead.province,
        country: editingLead.country,
        tags: editingLead.tags,
        status: editingLead.status,
        opted_out: editingLead.opted_out,
      });

      setIsEditModalOpen(false);
      setEditingLead(null);
      setNotification({ type: 'success', message: 'Lead atualizado com sucesso!' });
    } catch {
      setNotification({ type: 'error', message: 'Erro ao atualizar lead.' });
    }
  };

  // Handle CSV Selection
  const handleCsvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCsvFile(file);
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          setCsvPreviewData(results.data.slice(0, 5));
        },
      });
    }
  };

  // Process CSV Import
  const handleProcessCsvImport = async () => {
    if (!csvFile) return;

    setIsImporting(true);
    Papa.parse(csvFile, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const rawData = results.data as any[];
        const formattedLeads = rawData.map((row) => ({
          name: row.nome || row.Nome || row.name || row.Name || 'Consumidor',
          company_name: row.empresa || row.Empresa || row.perfil || row.Perfil || 'Consumidor B2C',
          email: (row.email || row.Email || row['e-mail'] || '').toLowerCase().trim(),
          phone: row.telefone || row.Telefone || row.whatsapp || row.WhatsApp || row.phone,
          website: row.site || row.website || row.Website,
          sector: row.setor || row.Setor || row.nicho || 'Streaming & Esportes',
          role: row.cargo || row.Cargo || 'Consumidor B2C',
          company_size: 'B2C (Consumidor)' as CompanySize,
          city: row.cidade || row.Cidade || row.city || 'Madrid',
          province: row.provincia || row.Provincia || row.estado || 'Espanha',
          country: row.pais || row.Pais || 'Espanha',
          tags: row.tags ? row.tags.split(',').map((t: string) => t.trim()) : ['Importação CSV'],
          status: 'new' as LeadStatus,
          opted_out: false,
        })).filter((l) => l.email && l.email.includes('@'));

        const count = await batchImportLeads(formattedLeads);
        setIsImporting(false);
        setIsImportModalOpen(false);
        setCsvFile(null);
        setCsvPreviewData([]);

        try {
          confetti({ particleCount: 80, spread: 80, origin: { y: 0.6 } });
        } catch {}

        setNotification({
          type: 'success',
          message: `${count} leads foram importados e validados no CRM com sucesso!`,
        });
      },
    });
  };

  // Save Segment Audience
  const handleSaveAudience = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!audienceName.trim()) return;

    await addAudience({
      name: audienceName,
      description: audienceDesc,
      filters: {
        status: selectedStatus !== 'all' ? [selectedStatus as LeadStatus] : undefined,
        province: selectedCity !== 'all' ? [selectedCity] : undefined,
        mx_valid_only: onlyMxValid,
        exclude_opted_out: excludeOptedOut,
      },
      lead_count: filteredAndSortedLeads.length,
    });

    setIsAudienceModalOpen(false);
    setAudienceName('');
    setAudienceDesc('');
    setNotification({ type: 'success', message: 'Segmentação de público salva com sucesso!' });
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div
        className={`flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 rounded-2xl border p-6 backdrop-blur-sm shadow-xl transition-all ${
          isLight
            ? 'border-indigo-100 bg-gradient-to-r from-white via-indigo-50/30 to-purple-50/40'
            : 'border-zinc-800 bg-gradient-to-r from-zinc-900 via-zinc-900/90 to-purple-950/20'
        }`}
      >
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-indigo-600/10 px-2.5 py-0.5 text-xs font-semibold text-indigo-500 border border-indigo-500/20">
              <Users className="h-3.5 w-3.5" />
              Base Central de Leads & CRM
            </span>
            <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-bold text-emerald-500 border border-emerald-500/20">
              {leads.filter((l) => l.mx_valid).length.toLocaleString()} E-mails com MX Válido
            </span>
          </div>
          <h1 className={`text-2xl sm:text-3xl font-bold tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
            Gerenciamento de Leads ({leads.length.toLocaleString()} Contatos)
          </h1>
          <p className={`text-xs sm:text-sm ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
            Galeria com scroll interno de alta performance, filtros combinados, ordenação dinâmica e CRUD completo.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => syncWithSupabase()}
            className={`flex items-center gap-1.5 rounded-xl border p-2.5 text-xs font-semibold transition-all cursor-pointer ${
              isLight ? 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50' : 'border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
            }`}
            title="Sincronizar com banco de dados Supabase"
          >
            <RefreshCw className="h-4 w-4 text-indigo-500" />
            <span>Sincronizar Banco</span>
          </button>

          <button
            onClick={handleExportCSV}
            disabled={filteredAndSortedLeads.length === 0}
            className={`flex items-center gap-1.5 rounded-xl border p-2.5 text-xs font-semibold transition-all cursor-pointer ${
              isLight ? 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50' : 'border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
            }`}
          >
            <Download className="h-4 w-4 text-emerald-500" />
            <span>Exportar CSV ({filteredAndSortedLeads.length.toLocaleString()})</span>
          </button>

          <button
            onClick={() => setIsImportModalOpen(true)}
            className={`flex items-center gap-1.5 rounded-xl border p-2.5 text-xs font-semibold transition-all cursor-pointer ${
              isLight ? 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50' : 'border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
            }`}
          >
            <Upload className="h-4 w-4 text-indigo-500" />
            <span>Importar CSV</span>
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
            <span>Auditar MX em Massa</span>
          </button>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-pink-500 to-indigo-600 p-2.5 text-xs font-bold text-white shadow-lg shadow-indigo-500/20 hover:opacity-95 transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>+ Novo Lead</span>
          </button>

          {leads.length > 0 && (
            <button
              onClick={() => {
                if (confirm('Deseja limpar todos os leads desta base local?')) {
                  clearAllLeads();
                  setNotification({ type: 'success', message: 'Base de leads limpa com sucesso!' });
                }
              }}
              className={`flex items-center gap-1.5 rounded-xl border p-2.5 text-xs font-semibold transition-all cursor-pointer ${
                isLight
                  ? 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100'
                  : 'border-rose-900/40 bg-rose-950/30 text-rose-400 hover:bg-rose-900/50'
              }`}
              title="Limpar todos os leads"
            >
              <Trash2 className="h-4 w-4" />
              <span>Limpar Base</span>
            </button>
          )}
        </div>
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

      {/* Search & Multi-Filter Control Bar */}
      <div
        className={`rounded-2xl border p-4 backdrop-blur-sm shadow-sm space-y-3 ${
          isLight ? 'border-slate-200 bg-white' : 'border-zinc-800 bg-zinc-900/70'
        }`}
      >
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className={`absolute left-3 top-2.5 h-4 w-4 ${isLight ? 'text-slate-400' : 'text-zinc-500'}`} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Buscar por nome, e-mail, perfil, cidade, tags..."
              className={`w-full rounded-xl border pl-9 pr-4 py-2 text-xs focus:outline-none ${
                isLight ? 'border-slate-300 bg-slate-50 text-slate-900' : 'border-zinc-800 bg-zinc-950 text-white'
              }`}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Filter Status */}
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setCurrentPage(1);
              }}
              className={`rounded-xl border px-3 py-2 text-xs focus:outline-none ${
                isLight ? 'border-slate-300 bg-slate-50 text-slate-900' : 'border-zinc-800 bg-zinc-950 text-white'
              }`}
            >
              <option value="all">Todos os Status</option>
              <option value="new">Novo Lead</option>
              <option value="qualified">Qualificado</option>
              <option value="contacted">Em Campanha</option>
              <option value="replied">Respondeu</option>
              <option value="converted">Cliente Ativo</option>
              <option value="unqualified">Sem Interesse</option>
            </select>

            {/* Filter City */}
            <select
              value={selectedCity}
              onChange={(e) => {
                setSelectedCity(e.target.value);
                setCurrentPage(1);
              }}
              className={`rounded-xl border px-3 py-2 text-xs focus:outline-none ${
                isLight ? 'border-slate-300 bg-slate-50 text-slate-900' : 'border-zinc-800 bg-zinc-950 text-white'
              }`}
            >
              <option value="all">Todas as Cidades</option>
              {cities.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            {/* View Switcher */}
            <div className={`flex rounded-xl p-1 border text-xs ${isLight ? 'bg-slate-100 border-slate-200' : 'bg-zinc-900 border-zinc-800'}`}>
              <button
                onClick={() => setViewMode('table')}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1 font-semibold transition-all cursor-pointer ${
                  viewMode === 'table'
                    ? isLight
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'bg-zinc-800 text-white'
                    : isLight
                    ? 'text-slate-600'
                    : 'text-zinc-400'
                }`}
              >
                <Table className="h-3.5 w-3.5" />
                <span>Tabela</span>
              </button>
              <button
                onClick={() => setViewMode('kanban')}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1 font-semibold transition-all cursor-pointer ${
                  viewMode === 'kanban'
                    ? isLight
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'bg-zinc-800 text-white'
                    : isLight
                    ? 'text-slate-600'
                    : 'text-zinc-400'
                }`}
              >
                <Kanban className="h-3.5 w-3.5" />
                <span>Kanban</span>
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-zinc-800/40 text-xs">
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={onlyMxValid}
                onChange={(e) => {
                  setOnlyMxValid(e.target.checked);
                  setCurrentPage(1);
                }}
                className="rounded border-slate-300 text-indigo-600 focus:ring-0"
              />
              <span className={isLight ? 'text-slate-700' : 'text-zinc-300'}>Apenas MX Válido</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={excludeOptedOut}
                onChange={(e) => {
                  setExcludeOptedOut(e.target.checked);
                  setCurrentPage(1);
                }}
                className="rounded border-slate-300 text-indigo-600 focus:ring-0"
              />
              <span className={isLight ? 'text-slate-700' : 'text-zinc-300'}>Ocultar Descadastrados</span>
            </label>
          </div>

          <div className="flex items-center gap-3">
            {selectedIds.length > 0 && (
              <button
                onClick={handleDeleteSelected}
                className="flex items-center gap-1 text-rose-500 hover:text-rose-400 font-bold cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Excluir ({selectedIds.length}) Selecionados</span>
              </button>
            )}

            <button
              onClick={() => setIsAudienceModalOpen(true)}
              className="flex items-center gap-1 text-indigo-500 hover:text-indigo-400 font-semibold cursor-pointer"
            >
              <BookmarkPlus className="h-3.5 w-3.5" />
              <span>Salvar Filtro como Audiência</span>
            </button>
          </div>
        </div>
      </div>

      {/* VIEW: TABLE COM SCROLL INTERNO & CABEÇALHO FIXO */}
      {viewMode === 'table' && (
        <div
          className={`rounded-2xl border backdrop-blur-sm overflow-hidden shadow-sm ${
            isLight ? 'border-slate-200 bg-white' : 'border-zinc-800 bg-zinc-900/60'
          }`}
        >
          {filteredAndSortedLeads.length === 0 ? (
            <div className="py-16 text-center">
              <Users className="mx-auto h-8 w-8 text-slate-400 mb-3" />
              <h3 className={`text-sm font-semibold ${isLight ? 'text-slate-800' : 'text-zinc-300'}`}>
                Nenhum lead encontrado com os filtros atuais
              </h3>
              <p className={`text-xs mt-1 ${isLight ? 'text-slate-500' : 'text-zinc-500'}`}>
                Converta leads da tela <strong>"IA Lead Machine"</strong> ou importe um arquivo CSV.
              </p>
            </div>
          ) : (
            <div>
              {/* SCROLL CONTAINER INTERNO COM ALTURA MÁXIMA */}
              <div className="max-h-[620px] overflow-y-auto overflow-x-auto scrollbar-thin">
                <table className={`w-full text-left text-xs ${isLight ? 'text-slate-700' : 'text-zinc-300'}`}>
                  {/* STICKY HEADER */}
                  <thead
                    className={`sticky top-0 z-10 border-b text-[11px] font-semibold uppercase tracking-wider ${
                      isLight ? 'border-slate-200 bg-slate-100 text-slate-700 shadow-xs' : 'border-zinc-800 bg-zinc-950 text-zinc-300 shadow-xs'
                    }`}
                  >
                    <tr>
                      <th className="p-3.5 w-10">
                        <input
                          type="checkbox"
                          checked={selectedIds.length > 0 && selectedIds.length === paginatedLeads.length}
                          onChange={toggleSelectAll}
                          className="rounded border-slate-300 text-indigo-600 focus:ring-0 cursor-pointer"
                        />
                      </th>

                      {/* Nome / Consumidor */}
                      <th
                        onClick={() => handleSort('name')}
                        className="p-3.5 cursor-pointer hover:text-indigo-500 select-none"
                      >
                        <div className="flex items-center gap-1">
                          <span>Nome / Perfil</span>
                          {sortField === 'name' ? (
                            sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                          ) : (
                            <ArrowUpDown className="h-3 w-3 opacity-40" />
                          )}
                        </div>
                      </th>

                      {/* E-mail */}
                      <th
                        onClick={() => handleSort('email')}
                        className="p-3.5 cursor-pointer hover:text-indigo-500 select-none"
                      >
                        <div className="flex items-center gap-1">
                          <span>E-mail & Auditoria DoH</span>
                          {sortField === 'email' ? (
                            sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                          ) : (
                            <ArrowUpDown className="h-3 w-3 opacity-40" />
                          )}
                        </div>
                      </th>

                      {/* Telefone */}
                      <th className="p-3.5">Telefone / WhatsApp</th>

                      {/* Cidade */}
                      <th
                        onClick={() => handleSort('city')}
                        className="p-3.5 cursor-pointer hover:text-indigo-500 select-none"
                      >
                        <div className="flex items-center gap-1">
                          <span>Cidade / Espanha</span>
                          {sortField === 'city' ? (
                            sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                          ) : (
                            <ArrowUpDown className="h-3 w-3 opacity-40" />
                          )}
                        </div>
                      </th>

                      {/* Status */}
                      <th
                        onClick={() => handleSort('status')}
                        className="p-3.5 cursor-pointer hover:text-indigo-500 select-none"
                      >
                        <div className="flex items-center gap-1">
                          <span>Status CRM</span>
                          {sortField === 'status' ? (
                            sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                          ) : (
                            <ArrowUpDown className="h-3 w-3 opacity-40" />
                          )}
                        </div>
                      </th>

                      {/* Fonte */}
                      <th className="p-3.5">Fonte Real</th>

                      {/* Ações */}
                      <th className="p-3.5 text-right">Ações (CRUD)</th>
                    </tr>
                  </thead>

                  <tbody className={`divide-y ${isLight ? 'divide-slate-100' : 'divide-zinc-800/60'}`}>
                    {paginatedLeads.map((lead) => {
                      const isSelected = selectedIds.includes(lead.id);
                      return (
                        <tr
                          key={lead.id}
                          className={`transition-colors ${
                            isSelected
                              ? isLight
                                ? 'bg-indigo-50/60'
                                : 'bg-indigo-950/20'
                              : isLight
                              ? 'hover:bg-slate-50/80'
                              : 'hover:bg-zinc-800/40'
                          }`}
                        >
                          <td className="p-3.5">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelectOne(lead.id)}
                              className="rounded border-slate-300 text-indigo-600 focus:ring-0 cursor-pointer"
                            />
                          </td>

                          {/* Nome & Perfil */}
                          <td className="p-3.5">
                            <div className={`font-semibold text-sm ${isLight ? 'text-slate-900' : 'text-white'}`}>
                              {lead.name}
                            </div>
                            <div className={`text-[11px] ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                              {lead.company_name}
                            </div>
                            {lead.tags && lead.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {lead.tags.slice(0, 2).map((t, idx) => (
                                  <span
                                    key={idx}
                                    className="rounded bg-indigo-500/10 px-1.5 py-0.2 text-[9px] font-medium text-indigo-500"
                                  >
                                    {t}
                                  </span>
                                ))}
                              </div>
                            )}
                          </td>

                          {/* Email & DoH MX */}
                          <td className="p-3.5">
                            <div className="font-mono flex items-center gap-1.5">
                              <Mail className="h-3 w-3 text-slate-400" />
                              <span className={lead.opted_out ? 'line-through text-rose-500' : ''}>{lead.email}</span>
                            </div>
                            <div className="mt-1 flex items-center gap-1.5">
                              {lead.mx_valid ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-500 border border-emerald-500/20">
                                  <CheckCircle2 className="h-3 w-3" />
                                  MX Válido
                                </span>
                              ) : (
                                <button
                                  onClick={() => verifyLeadMx(lead.id)}
                                  className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-500 hover:bg-amber-500/20 cursor-pointer"
                                >
                                  <RefreshCw className="h-3 w-3" />
                                  Auditar MX
                                </button>
                              )}
                              {lead.opted_out && (
                                <span className="rounded-full bg-rose-500/10 px-2 py-0.5 text-[10px] font-medium text-rose-500">
                                  Opt-out
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Telefone */}
                          <td className="p-3.5">
                            {lead.phone ? (
                              <div className="inline-flex items-center gap-1 rounded bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-600">
                                <Phone className="h-3 w-3" />
                                {lead.phone}
                              </div>
                            ) : (
                              <span className={`text-[11px] ${isLight ? 'text-slate-400' : 'text-zinc-500'}`}>-</span>
                            )}
                          </td>

                          {/* Cidade */}
                          <td className="p-3.5">
                            <div className="font-medium">{lead.city || 'Espanha'}</div>
                            <div className={`text-[10px] ${isLight ? 'text-slate-400' : 'text-zinc-500'}`}>{lead.province}</div>
                          </td>

                          {/* Status */}
                          <td className="p-3.5">
                            <select
                              value={lead.status}
                              onChange={(e) => updateLead(lead.id, { status: e.target.value as LeadStatus })}
                              className={`rounded-lg border px-2 py-1 text-[11px] font-semibold focus:outline-none cursor-pointer ${
                                lead.status === 'qualified'
                                  ? 'bg-indigo-500/10 text-indigo-500 border-indigo-500/30'
                                  : lead.status === 'converted'
                                  ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'
                                  : lead.status === 'contacted'
                                  ? 'bg-purple-500/10 text-purple-500 border-purple-500/30'
                                  : lead.status === 'unqualified'
                                  ? 'bg-rose-500/10 text-rose-500 border-rose-500/30'
                                  : 'bg-zinc-500/10 text-zinc-400 border-zinc-500/30'
                              }`}
                            >
                              <option value="new">Novo Lead</option>
                              <option value="qualified">Qualificado</option>
                              <option value="contacted">Em Campanha</option>
                              <option value="replied">Respondeu</option>
                              <option value="converted">Cliente Ativo</option>
                              <option value="unqualified">Sem Interesse</option>
                            </select>
                          </td>

                          {/* Fonte Real */}
                          <td className="p-3.5">
                            {lead.source_url ? (
                              <a
                                href={lead.source_url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-[11px] text-indigo-500 hover:underline max-w-[120px] truncate"
                              >
                                <ExternalLink className="h-3 w-3 shrink-0" />
                                <span className="truncate">{lead.source_url.replace('https://', '')}</span>
                              </a>
                            ) : (
                              <span className={`text-[10px] ${isLight ? 'text-slate-400' : 'text-zinc-500'}`}>Captura IA</span>
                            )}
                          </td>

                          {/* Ações (CRUD) */}
                          <td className="p-3.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Botão Editar Lead */}
                              <button
                                onClick={() => {
                                  setEditingLead(lead);
                                  setIsEditModalOpen(true);
                                }}
                                title="Editar Lead (CRUD)"
                                className="rounded-lg bg-indigo-600/15 p-1.5 text-indigo-600 hover:bg-indigo-600 hover:text-white transition-all cursor-pointer"
                              >
                                <Edit className="h-3.5 w-3.5" />
                              </button>

                              {/* Excluir Lead */}
                              <button
                                onClick={() => deleteLead(lead.id)}
                                title="Excluir Lead"
                                className={`rounded-lg p-1.5 transition-all cursor-pointer ${
                                  isLight
                                    ? 'bg-slate-100 text-slate-500 hover:bg-rose-50 hover:text-rose-600'
                                    : 'bg-zinc-800 text-zinc-400 hover:bg-rose-950/40 hover:text-rose-400'
                                }`}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* CONTROLES DE PAGINAÇÃO & QUANTIDADE POR PÁGINA */}
              <div className={`p-4 border-t flex flex-col sm:flex-row items-center justify-between gap-3 text-xs ${isLight ? 'border-slate-100 text-slate-600' : 'border-zinc-800 text-zinc-400'}`}>
                <div className="flex items-center gap-3">
                  <div>
                    Mostrando <strong>{(currentPage - 1) * itemsPerPage + 1}</strong> a <strong>{Math.min(currentPage * itemsPerPage, filteredAndSortedLeads.length)}</strong> de <strong>{filteredAndSortedLeads.length.toLocaleString()}</strong> leads
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span>Exibir:</span>
                    <select
                      value={itemsPerPage}
                      onChange={(e) => {
                        setItemsPerPage(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      className={`rounded-lg border px-2 py-1 text-xs focus:outline-none ${
                        isLight ? 'border-slate-300 bg-white' : 'border-zinc-800 bg-zinc-900 text-white'
                      }`}
                    >
                      <option value={50}>50 por página</option>
                      <option value={100}>100 por página</option>
                      <option value={250}>250 por página</option>
                      <option value={500}>500 por página</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className={`flex items-center gap-1 rounded-lg border px-3 py-1.5 font-semibold disabled:opacity-40 cursor-pointer ${
                      isLight ? 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700' : 'border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-zinc-200'
                    }`}
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                    <span>Anterior</span>
                  </button>

                  <span className="px-2 font-bold">
                    Página {currentPage} de {totalPages}
                  </span>

                  <button
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className={`flex items-center gap-1 rounded-lg border px-3 py-1.5 font-semibold disabled:opacity-40 cursor-pointer ${
                      isLight ? 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700' : 'border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-zinc-200'
                    }`}
                  >
                    <span>Próxima</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* VIEW: KANBAN BOARD */}
      {viewMode === 'kanban' && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {[
            { id: 'new', title: 'Novos Leads', color: 'indigo' },
            { id: 'qualified', title: 'Qualificados', color: 'purple' },
            { id: 'contacted', title: 'Em Campanha', color: 'blue' },
            { id: 'converted', title: 'Clientes Ativos', color: 'emerald' },
            { id: 'unqualified', title: 'Sem Interesse', color: 'rose' },
          ].map((col) => {
            const colLeads = filteredAndSortedLeads.filter((l) => l.status === col.id);
            return (
              <div
                key={col.id}
                className={`rounded-2xl border p-4 flex flex-col max-h-[600px] ${
                  isLight ? 'border-slate-200 bg-white' : 'border-zinc-800 bg-zinc-900/60'
                }`}
              >
                <div className="flex items-center justify-between pb-3 border-b border-zinc-800/40">
                  <h3 className="font-bold text-xs">{col.title}</h3>
                  <span className="rounded-full bg-zinc-500/10 px-2 py-0.5 text-[10px] font-bold">
                    {colLeads.length}
                  </span>
                </div>

                <div className="mt-3 space-y-2.5 overflow-y-auto pr-1 flex-1 scrollbar-thin">
                  {colLeads.map((lead) => (
                    <div
                      key={lead.id}
                      className={`p-3 rounded-xl border space-y-1.5 transition-all ${
                        isLight ? 'border-slate-200 bg-slate-50 hover:bg-white' : 'border-zinc-800 bg-zinc-950/60 hover:border-zinc-700'
                      }`}
                    >
                      <div className="font-semibold text-xs">{lead.name}</div>
                      <div className="text-[11px] text-zinc-400 truncate">{lead.email}</div>
                      <div className="flex items-center justify-between text-[10px] pt-1">
                        <span className="text-indigo-500 font-medium">{lead.city}</span>
                        <button
                          onClick={() => {
                            setEditingLead(lead);
                            setIsEditModalOpen(true);
                          }}
                          className="text-zinc-500 hover:text-indigo-500 cursor-pointer"
                        >
                          <Edit className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL 1: EDITAR LEAD (CRUD COMPLETO) */}
      {isEditModalOpen && editingLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div
            className={`w-full max-w-2xl rounded-2xl border p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto ${
              isLight ? 'border-slate-200 bg-white text-slate-900' : 'border-zinc-800 bg-zinc-900 text-white'
            }`}
          >
            <div className="flex items-center justify-between border-b pb-3 border-zinc-800">
              <div className="flex items-center gap-2">
                <Edit className="h-5 w-5 text-indigo-500" />
                <h2 className="text-base font-bold">Editar Lead (CRUD)</h2>
              </div>
              <button
                onClick={() => {
                  setIsEditModalOpen(false);
                  setEditingLead(null);
                }}
                className="text-xs opacity-60 hover:opacity-100 cursor-pointer"
              >
                ✕ Fechar
              </button>
            </div>

            <form onSubmit={handleUpdateLeadSubmit} className="space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium mb-1">Nome do Consumidor</label>
                  <input
                    type="text"
                    value={editingLead.name}
                    onChange={(e) => setEditingLead({ ...editingLead, name: e.target.value })}
                    className={`w-full rounded-xl border p-2.5 text-xs focus:outline-none ${
                      isLight ? 'border-slate-300 bg-slate-50' : 'border-zinc-800 bg-zinc-950'
                    }`}
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1">E-mail</label>
                  <input
                    type="email"
                    value={editingLead.email}
                    onChange={(e) => setEditingLead({ ...editingLead, email: e.target.value })}
                    className={`w-full rounded-xl border p-2.5 text-xs focus:outline-none ${
                      isLight ? 'border-slate-300 bg-slate-50' : 'border-zinc-800 bg-zinc-950'
                    }`}
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1">Perfil / Comunidade / Clube</label>
                  <input
                    type="text"
                    value={editingLead.company_name}
                    onChange={(e) => setEditingLead({ ...editingLead, company_name: e.target.value })}
                    className={`w-full rounded-xl border p-2.5 text-xs focus:outline-none ${
                      isLight ? 'border-slate-300 bg-slate-50' : 'border-zinc-800 bg-zinc-950'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1">WhatsApp / Telefone (+34)</label>
                  <input
                    type="text"
                    value={editingLead.phone || ''}
                    onChange={(e) => setEditingLead({ ...editingLead, phone: e.target.value })}
                    className={`w-full rounded-xl border p-2.5 text-xs focus:outline-none ${
                      isLight ? 'border-slate-300 bg-slate-50' : 'border-zinc-800 bg-zinc-950'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1">Cidade (Espanha)</label>
                  <input
                    type="text"
                    value={editingLead.city || ''}
                    onChange={(e) => setEditingLead({ ...editingLead, city: e.target.value })}
                    className={`w-full rounded-xl border p-2.5 text-xs focus:outline-none ${
                      isLight ? 'border-slate-300 bg-slate-50' : 'border-zinc-800 bg-zinc-950'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1">Status no CRM</label>
                  <select
                    value={editingLead.status}
                    onChange={(e) => setEditingLead({ ...editingLead, status: e.target.value as LeadStatus })}
                    className={`w-full rounded-xl border p-2.5 text-xs focus:outline-none ${
                      isLight ? 'border-slate-300 bg-slate-50' : 'border-zinc-800 bg-zinc-950'
                    }`}
                  >
                    <option value="new">Novo Lead</option>
                    <option value="qualified">Qualificado</option>
                    <option value="contacted">Em Campanha</option>
                    <option value="replied">Respondeu</option>
                    <option value="converted">Cliente Ativo</option>
                    <option value="unqualified">Sem Interesse</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">Tags (separadas por vírgula)</label>
                <input
                  type="text"
                  value={(editingLead.tags || []).join(', ')}
                  onChange={(e) =>
                    setEditingLead({
                      ...editingLead,
                      tags: e.target.value.split(',').map((t) => t.trim()).filter(Boolean),
                    })
                  }
                  className={`w-full rounded-xl border p-2.5 text-xs focus:outline-none ${
                    isLight ? 'border-slate-300 bg-slate-50' : 'border-zinc-800 bg-zinc-950'
                  }`}
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <label className="flex items-center gap-2 text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingLead.opted_out}
                    onChange={(e) => setEditingLead({ ...editingLead, opted_out: e.target.checked })}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-0"
                  />
                  <span>Marcar como Descadastrado (Opt-out)</span>
                </label>
              </div>

              <div className={`flex items-center justify-between pt-3 border-t ${isLight ? 'border-slate-200' : 'border-zinc-800'}`}>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setEditingLead(null);
                  }}
                  className={`rounded-xl border px-4 py-2 text-xs font-semibold cursor-pointer ${
                    isLight ? 'border-slate-300 bg-white text-slate-700' : 'border-zinc-700 bg-zinc-800 text-zinc-300'
                  }`}
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="rounded-xl bg-indigo-600 px-5 py-2 text-xs font-bold text-white hover:bg-indigo-500 transition-all cursor-pointer"
                >
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: NOVO LEAD */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div
            className={`w-full max-w-2xl rounded-2xl border p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto ${
              isLight ? 'border-slate-200 bg-white text-slate-900' : 'border-zinc-800 bg-zinc-900 text-white'
            }`}
          >
            <div className="flex items-center justify-between border-b pb-3 border-zinc-800">
              <div className="flex items-center gap-2">
                <Plus className="h-5 w-5 text-indigo-500" />
                <h2 className="text-base font-bold">Adicionar Novo Lead ao CRM</h2>
              </div>
              <button onClick={() => setIsAddModalOpen(false)} className="text-xs opacity-60 hover:opacity-100 cursor-pointer">
                ✕ Fechar
              </button>
            </div>

            <form onSubmit={handleSaveLead} className="space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium mb-1">Nome</label>
                  <input
                    type="text"
                    value={newLead.name}
                    onChange={(e) => setNewLead({ ...newLead, name: e.target.value })}
                    placeholder="Ex: Carlos Santana"
                    className={`w-full rounded-xl border p-2.5 text-xs focus:outline-none ${
                      isLight ? 'border-slate-300 bg-slate-50' : 'border-zinc-800 bg-zinc-950'
                    }`}
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1">E-mail</label>
                  <input
                    type="email"
                    value={newLead.email}
                    onChange={(e) => setNewLead({ ...newLead, email: e.target.value })}
                    placeholder="carlos@gmail.com"
                    className={`w-full rounded-xl border p-2.5 text-xs focus:outline-none ${
                      isLight ? 'border-slate-300 bg-slate-50' : 'border-zinc-800 bg-zinc-950'
                    }`}
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1">Perfil / Clube / Peña</label>
                  <input
                    type="text"
                    value={newLead.company_name}
                    onChange={(e) => setNewLead({ ...newLead, company_name: e.target.value })}
                    placeholder="Ex: Torcedor Real Madrid"
                    className={`w-full rounded-xl border p-2.5 text-xs focus:outline-none ${
                      isLight ? 'border-slate-300 bg-slate-50' : 'border-zinc-800 bg-zinc-950'
                    }`}
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1">WhatsApp / Telefone</label>
                  <input
                    type="text"
                    value={newLead.phone}
                    onChange={(e) => setNewLead({ ...newLead, phone: e.target.value })}
                    placeholder="+34 600 000 000"
                    className={`w-full rounded-xl border p-2.5 text-xs focus:outline-none ${
                      isLight ? 'border-slate-300 bg-slate-50' : 'border-zinc-800 bg-zinc-950'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1">Cidade</label>
                  <input
                    type="text"
                    value={newLead.city}
                    onChange={(e) => setNewLead({ ...newLead, city: e.target.value })}
                    className={`w-full rounded-xl border p-2.5 text-xs focus:outline-none ${
                      isLight ? 'border-slate-300 bg-slate-50' : 'border-zinc-800 bg-zinc-950'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1">Tags</label>
                  <input
                    type="text"
                    value={newLead.tags}
                    onChange={(e) => setNewLead({ ...newLead, tags: e.target.value })}
                    className={`w-full rounded-xl border p-2.5 text-xs focus:outline-none ${
                      isLight ? 'border-slate-300 bg-slate-50' : 'border-zinc-800 bg-zinc-950'
                    }`}
                  />
                </div>
              </div>

              <div className={`flex items-center justify-between pt-3 border-t ${isLight ? 'border-slate-200' : 'border-zinc-800'}`}>
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className={`rounded-xl border px-4 py-2 text-xs font-semibold cursor-pointer ${
                    isLight ? 'border-slate-300 bg-white text-slate-700' : 'border-zinc-700 bg-zinc-800 text-zinc-300'
                  }`}
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="rounded-xl bg-indigo-600 px-5 py-2 text-xs font-bold text-white hover:bg-indigo-500 transition-all cursor-pointer"
                >
                  Adicionar Lead
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: IMPORTAR CSV */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div
            className={`w-full max-w-xl rounded-2xl border p-6 shadow-2xl space-y-4 ${
              isLight ? 'border-slate-200 bg-white text-slate-900' : 'border-zinc-800 bg-zinc-900 text-white'
            }`}
          >
            <div className="flex items-center justify-between border-b pb-3 border-zinc-800">
              <div className="flex items-center gap-2">
                <Upload className="h-5 w-5 text-indigo-500" />
                <h2 className="text-base font-bold">Importação em Massa via Arquivo CSV</h2>
              </div>
              <button onClick={() => setIsImportModalOpen(false)} className="text-xs opacity-60 hover:opacity-100 cursor-pointer">
                ✕ Fechar
              </button>
            </div>

            <div className={`rounded-xl border-2 border-dashed p-6 text-center ${isLight ? 'border-slate-300 bg-slate-50' : 'border-zinc-700 bg-zinc-950'}`}>
              <Upload className="mx-auto h-8 w-8 text-indigo-500 mb-2" />
              <p className="text-xs font-semibold">Arraste seu arquivo CSV ou clique para selecionar</p>
              <p className="text-[11px] text-zinc-500 mt-1">Colunas aceitas: Nome, Email, Telefone, Perfil, Cidade, Tags</p>
              <input type="file" accept=".csv" onChange={handleCsvChange} className="mt-3 text-xs" />
            </div>

            {csvPreviewData.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs font-semibold">Prévia das primeiras 5 linhas:</span>
                <div className={`p-2 rounded-lg font-mono text-[10px] overflow-x-auto ${isLight ? 'bg-slate-100' : 'bg-zinc-950'}`}>
                  {JSON.stringify(csvPreviewData, null, 2)}
                </div>
              </div>
            )}

            <div className={`flex items-center justify-between pt-3 border-t ${isLight ? 'border-slate-200' : 'border-zinc-800'}`}>
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                className={`rounded-xl border px-4 py-2 text-xs font-semibold cursor-pointer ${
                  isLight ? 'border-slate-300 bg-white text-slate-700' : 'border-zinc-700 bg-zinc-800 text-zinc-300'
                }`}
              >
                Cancelar
              </button>

              <button
                type="button"
                disabled={!csvFile || isImporting}
                onClick={handleProcessCsvImport}
                className="rounded-xl bg-indigo-600 px-5 py-2 text-xs font-bold text-white hover:bg-indigo-500 disabled:opacity-50 cursor-pointer"
              >
                {isImporting ? 'Processando...' : 'Iniciar Importação'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: SALVAR AUDIÊNCIA */}
      {isAudienceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div
            className={`w-full max-w-md rounded-2xl border p-6 shadow-2xl space-y-4 ${
              isLight ? 'border-slate-200 bg-white text-slate-900' : 'border-zinc-800 bg-zinc-900 text-white'
            }`}
          >
            <div className="flex items-center justify-between border-b pb-3 border-zinc-800">
              <h2 className="text-base font-bold">Salvar Audiência Filtrada</h2>
              <button onClick={() => setIsAudienceModalOpen(false)} className="text-xs opacity-60 hover:opacity-100 cursor-pointer">
                ✕ Fechar
              </button>
            </div>

            <form onSubmit={handleSaveAudience} className="space-y-3">
              <div>
                <label className="block text-xs font-medium mb-1">Nome do Segmento</label>
                <input
                  type="text"
                  value={audienceName}
                  onChange={(e) => setAudienceName(e.target.value)}
                  placeholder="Ex: Torcedores LaLiga Madrid (MX Válido)"
                  className={`w-full rounded-xl border p-2.5 text-xs focus:outline-none ${
                    isLight ? 'border-slate-300 bg-slate-50' : 'border-zinc-800 bg-zinc-950'
                  }`}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">Descrição</label>
                <input
                  type="text"
                  value={audienceDesc}
                  onChange={(e) => setAudienceDesc(e.target.value)}
                  placeholder="Ex: Leads qualificados com MX ativo em Madrid"
                  className={`w-full rounded-xl border p-2.5 text-xs focus:outline-none ${
                    isLight ? 'border-slate-300 bg-slate-50' : 'border-zinc-800 bg-zinc-950'
                  }`}
                />
              </div>

              <div className="text-xs text-indigo-500 font-semibold pt-1">
                Leads selecionados neste filtro: {filteredAndSortedLeads.length.toLocaleString()}
              </div>

              <div className={`flex items-center justify-between pt-3 border-t ${isLight ? 'border-slate-200' : 'border-zinc-800'}`}>
                <button
                  type="button"
                  onClick={() => setIsAudienceModalOpen(false)}
                  className={`rounded-xl border px-4 py-2 text-xs font-semibold cursor-pointer ${
                    isLight ? 'border-slate-300 bg-white text-slate-700' : 'border-zinc-700 bg-zinc-800 text-zinc-300'
                  }`}
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="rounded-xl bg-indigo-600 px-5 py-2 text-xs font-bold text-white hover:bg-indigo-500 cursor-pointer"
                >
                  Salvar Audiência
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
