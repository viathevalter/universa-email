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
  XCircle,
  Mail,
  Building2,
  MapPin,
  Trash2,
  BookmarkPlus,
  RefreshCw,
  ExternalLink,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';
import { useApp } from '../../shared/context/AppContext';
import type { LeadStatus, CompanySize } from '../../types';
import Papa from 'papaparse';

export const LeadsView: React.FC = () => {
  const {
    leads,
    addLead,
    updateLead,
    deleteLead,
    batchImportLeads,
    toggleOptOut,
    verifyLeadMx,
    addAudience,
  } = useApp();

  // View mode
  const [viewMode, setViewMode] = useState<'table' | 'kanban'>('table');

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedSize, setSelectedSize] = useState<string>('all');
  const [selectedProvince, setSelectedProvince] = useState<string>('all');
  const [onlyMxValid, setOnlyMxValid] = useState(false);
  const [excludeOptedOut, setExcludeOptedOut] = useState(false);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
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
    sector: '',
    role: '',
    company_size: 'Tier 2 (Mid-Market)' as CompanySize,
    city: 'São Paulo',
    province: 'SP',
    country: 'Brasil',
    tags: 'Decisor, B2B',
    status: 'new' as LeadStatus,
  });

  // CSV Import State
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvPreviewData, setCsvPreviewData] = useState<any[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Unique provinces list for filter
  const provinces = useMemo(() => {
    const set = new Set<string>();
    leads.forEach((l) => {
      if (l.province) set.add(l.province.toUpperCase());
    });
    return Array.from(set).sort();
  }, [leads]);

  // Filtered Leads
  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      if (selectedStatus !== 'all' && lead.status !== selectedStatus) return false;
      if (selectedSize !== 'all' && lead.company_size !== selectedSize) return false;
      if (selectedProvince !== 'all' && lead.province?.toUpperCase() !== selectedProvince) return false;
      if (onlyMxValid && !lead.mx_valid) return false;
      if (excludeOptedOut && lead.opted_out) return false;

      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matchName = lead.name.toLowerCase().includes(term);
        const matchEmail = lead.email.toLowerCase().includes(term);
        const matchComp = lead.company_name.toLowerCase().includes(term);
        const matchRole = (lead.role || '').toLowerCase().includes(term);
        return matchName || matchEmail || matchComp || matchRole;
      }
      return true;
    });
  }, [leads, selectedStatus, selectedSize, selectedProvince, onlyMxValid, excludeOptedOut, searchTerm]);

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
      setNotification({ type: 'success', message: 'Lead adicionado e validado com sucesso no CRM!' });
      setNewLead({
        name: '',
        company_name: '',
        email: '',
        phone: '',
        website: '',
        sector: '',
        role: '',
        company_size: 'Tier 2 (Mid-Market)',
        city: 'São Paulo',
        province: 'SP',
        country: 'Brasil',
        tags: 'Decisor, B2B',
        status: 'new',
      });
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Erro ao adicionar lead.' });
    }
  };

  // CSV File Handler
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCsvFile(file);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      preview: 5,
      complete: (results) => {
        setCsvPreviewData(results.data);
      },
    });
  };

  const handleExecuteCsvImport = () => {
    if (!csvFile) return;
    setIsImporting(true);

    Papa.parse(csvFile, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const rows = results.data as any[];
        const parsedLeads = rows.map((row) => ({
          name: row.name || row.nome || row.Nome || row.contato || 'Contato Comercial',
          company_name: row.company_name || row.empresa || row.Empresa || 'Empresa B2B',
          email: row.email || row.Email || row['E-mail'] || '',
          phone: row.phone || row.telefone || row.Telefone || '',
          website: row.website || row.site || '',
          sector: row.sector || row.setor || 'Geral',
          role: row.role || row.cargo || 'Diretoria / Gestão',
          company_size: (row.company_size || row.porte || 'Tier 2 (Mid-Market)') as CompanySize,
          city: row.city || row.cidade || 'São Paulo',
          province: row.province || row.estado || row.uf || 'SP',
          country: row.country || row.pais || 'Brasil',
          tags: ['Importado CSV', row.tag || 'B2B'].filter(Boolean),
          status: 'new' as LeadStatus,
          opted_out: false,
          mx_valid: true,
        })).filter((l) => l.email && l.email.includes('@'));

        const count = await batchImportLeads(parsedLeads);
        setIsImporting(false);
        setIsImportModalOpen(false);
        setCsvFile(null);
        setCsvPreviewData([]);
        setNotification({
          type: 'success',
          message: `Importação concluída! ${count} leads novos foram adicionados (duplicados ignorados automaticamente).`,
        });
      },
    });
  };

  // CSV Export Handler
  const handleExportCsv = () => {
    const csvContent = Papa.unparse(
      filteredLeads.map((l) => ({
        Nome: l.name,
        Empresa: l.company_name,
        Cargo: l.role,
        Email: l.email,
        Telefone: l.phone,
        Website: l.website,
        Setor: l.sector,
        Porte: l.company_size,
        Cidade: l.city,
        Estado: l.province,
        Status: l.status,
        OptOut: l.opted_out ? 'Sim' : 'Não',
        MX_Valido: l.mx_valid ? 'Sim' : 'Não',
      }))
    );

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `leads_kotrik_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Handle Save Smart Audience
  const handleSaveAudience = async () => {
    if (!audienceName.trim()) return;

    await addAudience({
      name: audienceName,
      description: audienceDesc || `Segmento com ${filteredLeads.length} leads filtrados`,
      filters: {
        status: selectedStatus !== 'all' ? [selectedStatus as LeadStatus] : undefined,
        company_size: selectedSize !== 'all' ? [selectedSize] : undefined,
        province: selectedProvince !== 'all' ? [selectedProvince] : undefined,
        mx_valid_only: onlyMxValid,
        exclude_opted_out: excludeOptedOut,
        search_query: searchTerm || undefined,
      },
      lead_count: filteredLeads.length,
    });

    setIsAudienceModalOpen(false);
    setAudienceName('');
    setAudienceDesc('');
    setNotification({ type: 'success', message: 'Audiência estratégica salva com sucesso!' });
  };

  // Kanban Status Columns
  const statusColumns: { id: LeadStatus; label: string; color: string }[] = [
    { id: 'new', label: 'Novo Lead', color: 'border-blue-500/30 bg-blue-500/10 text-blue-400' },
    { id: 'qualified', label: 'Qualificado', color: 'border-purple-500/30 bg-purple-500/10 text-purple-400' },
    { id: 'contacted', label: 'Contatado', color: 'border-amber-500/30 bg-amber-500/10 text-amber-400' },
    { id: 'replied', label: 'Respondeu', color: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400' },
    { id: 'converted', label: 'Convertido', color: 'border-teal-500/30 bg-teal-500/10 text-teal-400' },
  ];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <Users className="h-6 w-6 text-indigo-400" />
              Base Central de Leads & CRM
            </h1>
            <span className="rounded-full bg-indigo-500/10 px-2.5 py-0.5 text-xs font-semibold text-indigo-400 border border-indigo-500/20">
              {filteredLeads.length} de {leads.length} Leads
            </span>
          </div>
          <p className="text-sm text-zinc-400 mt-1">
            Gestão de contatos, segmentação inteligente, governança de opt-out e entregabilidade MX.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* View Toggle */}
          <div className="flex rounded-xl bg-zinc-900 p-1 border border-zinc-800">
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all cursor-pointer ${
                viewMode === 'table' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Table className="h-3.5 w-3.5" />
              Tabela
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all cursor-pointer ${
                viewMode === 'kanban' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Kanban className="h-3.5 w-3.5" />
              Kanban
            </button>
          </div>

          <button
            onClick={() => setIsImportModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-800 px-3.5 py-2 text-xs font-semibold text-zinc-200 hover:bg-zinc-700 transition-all cursor-pointer"
          >
            <Upload className="h-3.5 w-3.5" />
            Importar CSV
          </button>

          <button
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-800 px-3.5 py-2 text-xs font-semibold text-zinc-200 hover:bg-zinc-700 transition-all cursor-pointer"
          >
            <Download className="h-3.5 w-3.5" />
            Exportar CSV
          </button>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-indigo-500/20 hover:opacity-95 transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Novo Lead
          </button>
        </div>
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

      {/* Filters Bar & Smart Audience Button */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 backdrop-blur-sm space-y-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {/* Search Box */}
          <div className="relative lg:col-span-2">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nome, e-mail, empresa ou cargo..."
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950 pl-9 pr-3 py-2 text-xs text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
            />
          </div>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
          >
            <option value="all">Todos os Status</option>
            <option value="new">Novo Lead</option>
            <option value="qualified">Qualificado</option>
            <option value="contacted">Contatado</option>
            <option value="replied">Respondeu</option>
            <option value="converted">Convertido</option>
          </select>

          {/* Porte / Tier Filter */}
          <select
            value={selectedSize}
            onChange={(e) => setSelectedSize(e.target.value)}
            className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
          >
            <option value="all">Todos os Portes</option>
            <option value="Tier 1 (Enterprise)">Tier 1 (Enterprise)</option>
            <option value="Tier 2 (Mid-Market)">Tier 2 (Mid-Market)</option>
            <option value="Tier 3 (SMB / Small)">Tier 3 (SMB / Small)</option>
          </select>

          {/* Estado / UF Filter */}
          <select
            value={selectedProvince}
            onChange={(e) => setSelectedProvince(e.target.value)}
            className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
          >
            <option value="all">Todos os Estados</option>
            {provinces.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-zinc-800/60 text-xs">
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer text-zinc-300">
              <input
                type="checkbox"
                checked={onlyMxValid}
                onChange={(e) => setOnlyMxValid(e.target.checked)}
                className="rounded border-zinc-700 bg-zinc-800 text-indigo-600 focus:ring-0"
              />
              <span className="flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                Apenas MX Verificados
              </span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer text-zinc-300">
              <input
                type="checkbox"
                checked={excludeOptedOut}
                onChange={(e) => setExcludeOptedOut(e.target.checked)}
                className="rounded border-zinc-700 bg-zinc-800 text-indigo-600 focus:ring-0"
              />
              <span className="flex items-center gap-1">
                <ShieldAlert className="h-3.5 w-3.5 text-rose-400" />
                Ocultar Opt-outs (Descadastrados)
              </span>
            </label>
          </div>

          <button
            onClick={() => setIsAudienceModalOpen(true)}
            className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-400 hover:text-indigo-300 cursor-pointer"
          >
            <BookmarkPlus className="h-3.5 w-3.5" />
            Salvar Filtro como Audiência
          </button>
        </div>
      </div>

      {/* Main View: Table or Kanban */}
      {viewMode === 'table' ? (
        <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/60 backdrop-blur-sm">
          {filteredLeads.length === 0 ? (
            <div className="py-16 text-center">
              <Users className="mx-auto h-8 w-8 text-zinc-600 mb-3" />
              <h3 className="text-sm font-semibold text-zinc-300">Nenhum lead encontrado</h3>
              <p className="text-xs text-zinc-500 mt-1">Ajuste os filtros ou crie um novo lead.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-zinc-300">
                <thead className="border-b border-zinc-800 bg-zinc-950/60 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                  <tr>
                    <th className="p-4">Contato / Tomador</th>
                    <th className="p-4">Empresa & Porte</th>
                    <th className="p-4">E-mail & Entregabilidade</th>
                    <th className="p-4">Localização & Tags</th>
                    <th className="p-4">Status Funil</th>
                    <th className="p-4 text-center">Opt-out</th>
                    <th className="p-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {filteredLeads.map((lead) => (
                    <tr
                      key={lead.id}
                      className={`hover:bg-zinc-800/40 transition-colors ${
                        lead.opted_out ? 'opacity-60 bg-rose-950/10' : ''
                      }`}
                    >
                      {/* Contato */}
                      <td className="p-4">
                        <div className="font-semibold text-sm text-white">{lead.name}</div>
                        <div className="text-zinc-400 text-[11px] mt-0.5">{lead.role || 'Executivo'}</div>
                        {lead.phone && <div className="text-zinc-500 text-[10px] mt-0.5">{lead.phone}</div>}
                      </td>

                      {/* Empresa */}
                      <td className="p-4">
                        <div className="font-medium text-zinc-100 flex items-center gap-1.5">
                          <Building2 className="h-3.5 w-3.5 text-zinc-400" />
                          {lead.company_name}
                        </div>
                        <div className="mt-1 flex items-center gap-2">
                          <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-300 border border-zinc-700/60">
                            {lead.company_size || 'Tier 2'}
                          </span>
                          {lead.website && (
                            <a
                              href={lead.website}
                              target="_blank"
                              rel="noreferrer"
                              className="text-zinc-500 hover:text-indigo-400"
                            >
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </div>
                      </td>

                      {/* E-mail & MX */}
                      <td className="p-4">
                        <div className="font-mono text-zinc-200 flex items-center gap-1.5">
                          <Mail className="h-3 w-3 text-zinc-400" />
                          {lead.email}
                        </div>
                        <div className="mt-1.5 flex items-center gap-2">
                          {lead.mx_valid ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400 border border-emerald-500/20">
                              <CheckCircle2 className="h-3 w-3" />
                              MX OK
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2 py-0.5 text-[10px] font-medium text-rose-400 border border-rose-500/20">
                              <XCircle className="h-3 w-3" />
                              Sem MX
                            </span>
                          )}
                          <button
                            onClick={() => verifyLeadMx(lead.id)}
                            title="Re-verificar MX via DoH"
                            className="text-zinc-500 hover:text-indigo-400 transition-colors cursor-pointer"
                          >
                            <RefreshCw className="h-3 w-3" />
                          </button>
                        </div>
                      </td>

                      {/* Localização & Tags */}
                      <td className="p-4">
                        <div className="flex items-center gap-1 text-zinc-200">
                          <MapPin className="h-3 w-3 text-zinc-500" />
                          {lead.city || 'N/A'}, {lead.province || 'UF'}
                        </div>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {lead.tags.slice(0, 2).map((t, idx) => (
                            <span
                              key={idx}
                              className="rounded bg-indigo-500/10 px-1.5 py-0.2 text-[9px] font-medium text-indigo-300 border border-indigo-500/20"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="p-4">
                        <select
                          value={lead.status}
                          onChange={(e) => updateLead(lead.id, { status: e.target.value as LeadStatus })}
                          className="rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-1 text-xs text-zinc-200 focus:outline-none cursor-pointer"
                        >
                          <option value="new">Novo Lead</option>
                          <option value="qualified">Qualificado</option>
                          <option value="contacted">Contatado</option>
                          <option value="replied">Respondeu</option>
                          <option value="converted">Convertido</option>
                          <option value="unqualified">Desqualificado</option>
                        </select>
                      </td>

                      {/* Opt-out Toggle */}
                      <td className="p-4 text-center">
                        <button
                          onClick={() => toggleOptOut(lead.id)}
                          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold border transition-all cursor-pointer ${
                            lead.opted_out
                              ? 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                              : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:text-zinc-200'
                          }`}
                        >
                          {lead.opted_out ? 'Descadastrado' : 'Inscrito'}
                        </button>
                      </td>

                      {/* Ações */}
                      <td className="p-4 text-right">
                        <button
                          onClick={() => deleteLead(lead.id)}
                          title="Excluir Lead"
                          className="rounded-lg bg-zinc-800 p-1.5 text-zinc-400 hover:bg-rose-950/40 hover:text-rose-400 transition-all cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        /* Kanban View */
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-5">
          {statusColumns.map((col) => {
            const colLeads = filteredLeads.filter((l) => l.status === col.id);
            return (
              <div key={col.id} className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                  <span className="font-semibold text-xs text-white">{col.label}</span>
                  <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${col.color}`}>
                    {colLeads.length}
                  </span>
                </div>

                <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
                  {colLeads.map((lead) => (
                    <div
                      key={lead.id}
                      className="rounded-xl border border-zinc-800 bg-zinc-950 p-3 shadow-sm hover:border-zinc-700 transition-all"
                    >
                      <div className="font-semibold text-xs text-white truncate">{lead.name}</div>
                      <div className="text-[11px] text-zinc-400 truncate">{lead.company_name}</div>
                      <div className="text-[10px] text-zinc-500 font-mono mt-1 truncate">{lead.email}</div>

                      <div className="mt-2 flex items-center justify-between pt-2 border-t border-zinc-900 text-[10px]">
                        <span className="text-zinc-500">{lead.province || 'UF'}</span>
                        <select
                          value={lead.status}
                          onChange={(e) => updateLead(lead.id, { status: e.target.value as LeadStatus })}
                          className="rounded bg-zinc-900 px-1 py-0.5 text-[10px] text-zinc-300 border border-zinc-800 focus:outline-none"
                        >
                          <option value="new">Novo</option>
                          <option value="qualified">Qualificado</option>
                          <option value="contacted">Contatado</option>
                          <option value="replied">Respondeu</option>
                          <option value="converted">Convertido</option>
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Novo Lead */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Plus className="h-5 w-5 text-indigo-400" />
              Adicionar Lead Manualmente
            </h2>

            <form onSubmit={handleSaveLead} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">Nome Completo *</label>
                  <input
                    type="text"
                    required
                    value={newLead.name}
                    onChange={(e) => setNewLead({ ...newLead, name: e.target.value })}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">E-mail Corporativo *</label>
                  <input
                    type="email"
                    required
                    value={newLead.email}
                    onChange={(e) => setNewLead({ ...newLead, email: e.target.value })}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">Razão Social / Empresa *</label>
                  <input
                    type="text"
                    required
                    value={newLead.company_name}
                    onChange={(e) => setNewLead({ ...newLead, company_name: e.target.value })}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">Cargo / Posição</label>
                  <input
                    type="text"
                    value={newLead.role}
                    onChange={(e) => setNewLead({ ...newLead, role: e.target.value })}
                    placeholder="Ex: Diretor Comercial"
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">Porte</label>
                  <select
                    value={newLead.company_size}
                    onChange={(e) => setNewLead({ ...newLead, company_size: e.target.value as CompanySize })}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-white focus:outline-none"
                  >
                    <option value="Tier 1 (Enterprise)">Tier 1 (Enterprise)</option>
                    <option value="Tier 2 (Mid-Market)">Tier 2 (Mid-Market)</option>
                    <option value="Tier 3 (SMB / Small)">Tier 3 (SMB / Small)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">Cidade</label>
                  <input
                    type="text"
                    value={newLead.city}
                    onChange={(e) => setNewLead({ ...newLead, city: e.target.value })}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">Estado (UF)</label>
                  <input
                    type="text"
                    value={newLead.province}
                    onChange={(e) => setNewLead({ ...newLead, province: e.target.value })}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-2 text-xs font-semibold text-zinc-300 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 cursor-pointer"
                >
                  Salvar Lead
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Importar CSV */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Upload className="h-5 w-5 text-indigo-400" />
              Importar Lista de Leads via CSV
            </h2>
            <p className="text-xs text-zinc-400">
              Faça upload do seu arquivo CSV. O sistema identifica automaticamente colunas de Nome, Empresa, E-mail, Cargo e realiza deduplicação global.
            </p>

            <div className="rounded-xl border-2 border-dashed border-zinc-700 bg-zinc-950/50 p-6 text-center">
              <input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
                id="csv-upload-input"
              />
              <label
                htmlFor="csv-upload-input"
                className="cursor-pointer flex flex-col items-center justify-center"
              >
                <Upload className="h-8 w-8 text-zinc-500 mb-2" />
                <span className="text-xs font-semibold text-indigo-400">Clique para selecionar o arquivo CSV</span>
                <span className="text-[10px] text-zinc-500 mt-1">UTF-8 ou Latin-1 com separador vírgula ou ponto-e-vírgula</span>
              </label>
              {csvFile && (
                <div className="mt-3 text-xs font-medium text-emerald-400">
                  Arquivo selecionado: {csvFile.name} ({(csvFile.size / 1024).toFixed(1)} KB)
                </div>
              )}
            </div>

            {csvPreviewData.length > 0 && (
              <div className="rounded-lg bg-zinc-950 p-3 border border-zinc-800 text-[11px] text-zinc-300">
                <div className="font-semibold text-zinc-200 mb-1">Prévia dos primeiros registros:</div>
                <div className="space-y-1 max-h-24 overflow-y-auto">
                  {csvPreviewData.map((row, idx) => (
                    <div key={idx} className="truncate text-zinc-400">
                      {row.name || row.nome || 'Contato'} | {row.email || row.Email || 'E-mail'} | {row.company_name || row.empresa || 'Empresa'}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => {
                  setIsImportModalOpen(false);
                  setCsvFile(null);
                }}
                className="rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-2 text-xs font-semibold text-zinc-300 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={!csvFile || isImporting}
                onClick={handleExecuteCsvImport}
                className="rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50 cursor-pointer"
              >
                {isImporting ? 'Processando...' : 'Confirmar Importação'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Salvar Audiência */}
      {isAudienceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <BookmarkPlus className="h-5 w-5 text-indigo-400" />
              Salvar Audiência Dinâmica
            </h2>
            <p className="text-xs text-zinc-400">
              Este filtro atual ({filteredLeads.length} leads) ficará salvo para seleção rápida na criação de campanhas de email.
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Nome do Segmento / Audiência *</label>
                <input
                  type="text"
                  required
                  value={audienceName}
                  onChange={(e) => setAudienceName(e.target.value)}
                  placeholder="Ex: Tier 1 - Diretores de Indústria SP"
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-white focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Descrição</label>
                <input
                  type="text"
                  value={audienceDesc}
                  onChange={(e) => setAudienceDesc(e.target.value)}
                  placeholder="Objetivo deste público"
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-white focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => setIsAudienceModalOpen(false)}
                className="rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-2 text-xs font-semibold text-zinc-300 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveAudience}
                className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 cursor-pointer"
              >
                Salvar Audiência
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
