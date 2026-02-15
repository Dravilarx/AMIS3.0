import React, { useState, useMemo } from 'react';
import { Building2, Plus, Search, AlertTriangle, FileText, Shield, Loader2, ChevronRight, X, Upload, LayoutGrid, List, CheckSquare, Square, Trash2, ToggleLeft, ToggleRight, ArrowUpDown, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useInstitutions } from '../../hooks/useInstitutions';
import { InstitutionModal } from './InstitutionModal';
import { InstitutionDetailPanel } from './InstitutionDetailPanel';
import type { Institution, InstitutionType, Criticality } from '../../types/institutions';
import { INSTITUTION_CATEGORIES } from '../../types/institutions';
import { BulkUploadModal, type ColumnDef } from '../../components/BulkUploadModal';

type SortField = 'legalName' | 'institutionCategory' | 'city' | 'criticality' | 'institutionType';
type SortDir = 'asc' | 'desc';

export const InstitutionsDashboard: React.FC = () => {
    const { institutions, loading, error, fetchInstitutions, deleteInstitution, addInstitution, updateInstitution } = useInstitutions();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingInstitution, setEditingInstitution] = useState<Institution | null>(null);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState<InstitutionType | 'all'>('all');
    const [filterCriticality, setFilterCriticality] = useState<Criticality | 'all'>('all');
    const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

    // ── Selección masiva ──
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isBulkActing, setIsBulkActing] = useState(false);

    // ── Ordenamiento ──
    const [sortField, setSortField] = useState<SortField>('legalName');
    const [sortDir, setSortDir] = useState<SortDir>('asc');

    // ── Columnas para carga masiva ──
    const BULK_COLUMNS: ColumnDef[] = [
        { key: 'legalName', excelHeader: 'razon_social', label: 'Razón Social', required: true, example: 'Clínica Las Condes S.A.' },
        { key: 'commercialName', excelHeader: 'nombre_comercial', label: 'Nombre Comercial', required: false, example: 'Clínica Las Condes' },
        { key: 'rut', excelHeader: 'rut', label: 'RUT', required: false, example: '76.123.456-7' },
        { key: 'institutionCategory', excelHeader: 'categoria', label: 'Categoría', required: false, example: 'clinica', description: 'clinica, hospital, municipalidad, servicio_salud, sar, centro_medico, laboratorio, clinica_dental, centro_imagen, mutual, isapre, fonasa, otro' },
        { key: 'institutionType', excelHeader: 'tipo', label: 'Tipo (público/privado/mixto)', required: false, example: 'privado' },
        { key: 'sector', excelHeader: 'sector', label: 'Sector', required: false, example: 'salud' },
        { key: 'address', excelHeader: 'direccion', label: 'Dirección', required: false, example: 'Av. Las Condes 12461' },
        { key: 'city', excelHeader: 'ciudad', label: 'Ciudad', required: false, example: 'Santiago' },
        { key: 'region', excelHeader: 'region', label: 'Región', required: false, example: 'Metropolitana' },
        { key: 'criticality', excelHeader: 'criticidad', label: 'Criticidad', required: false, example: 'media', description: 'baja, media, alta, critica' },
        { key: 'notes', excelHeader: 'notas', label: 'Notas', required: false, example: 'Convenio vigente 2026' },
    ];

    // ── KPIs ──
    const totalActive = institutions.filter(i => i.isActive).length;
    const totalContracts = institutions.reduce((sum, i) => sum + (i.activeContracts || 0), 0);
    const expiringContracts = institutions.reduce((sum, i) => {
        return sum + (i.contracts || []).filter(c => c.status === 'active' && c.daysUntilExpiry !== undefined && c.daysUntilExpiry <= 90 && c.daysUntilExpiry > 0).length;
    }, 0);
    const criticalCount = institutions.filter(i => i.criticality === 'critica' || i.criticality === 'alta').length;

    // ── Filtrado y Ordenamiento ──
    const filteredAndSorted = useMemo(() => {
        let result = institutions.filter(inst => {
            const q = searchQuery.toLowerCase();
            const matchesSearch = searchQuery === '' ||
                inst.legalName.toLowerCase().includes(q) ||
                inst.rut?.toLowerCase().includes(q) ||
                inst.commercialName?.toLowerCase().includes(q) ||
                inst.institutionCode?.toLowerCase().includes(q) ||
                inst.city?.toLowerCase().includes(q) ||
                inst.region?.toLowerCase().includes(q);
            const matchesType = filterType === 'all' || inst.institutionType === filterType;
            const matchesCrit = filterCriticality === 'all' || inst.criticality === filterCriticality;
            return matchesSearch && matchesType && matchesCrit;
        });

        result.sort((a, b) => {
            const aVal = (a[sortField] || '').toString().toLowerCase();
            const bVal = (b[sortField] || '').toString().toLowerCase();
            return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
        });

        return result;
    }, [institutions, searchQuery, filterType, filterCriticality, sortField, sortDir]);

    // ── Handlers ──
    const handleEdit = (inst: Institution) => {
        setEditingInstitution(inst);
        setIsModalOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (confirm('¿Está seguro que desea eliminar esta institución? Esta acción es irreversible.')) {
            await deleteInstitution(id);
            if (selectedId === id) setSelectedId(null);
        }
    };

    const handleModalClose = () => { setIsModalOpen(false); setEditingInstitution(null); };
    const handleModalSuccess = () => { handleModalClose(); fetchInstitutions(); };

    const toggleSelect = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    };

    const toggleSelectAll = () => {
        if (selectedIds.size === filteredAndSorted.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filteredAndSorted.map(i => i.id)));
        }
    };

    const handleBulkAction = async (action: 'activate' | 'deactivate' | 'delete') => {
        if (selectedIds.size === 0) return;
        if (action === 'delete' && !confirm(`¿Eliminar ${selectedIds.size} institución(es)? Esta acción es irreversible.`)) return;
        setIsBulkActing(true);
        try {
            const promises = Array.from(selectedIds).map(async (id) => {
                if (action === 'activate') {
                    await updateInstitution(id, { isActive: true });
                } else if (action === 'deactivate') {
                    await updateInstitution(id, { isActive: false });
                } else if (action === 'delete') {
                    await deleteInstitution(id);
                }
            });
            await Promise.all(promises);
            setSelectedIds(new Set());
            fetchInstitutions();
        } catch (err) {
            console.error('Bulk action error:', err);
        } finally {
            setIsBulkActing(false);
        }
    };

    const handleSortToggle = (field: SortField) => {
        if (sortField === field) {
            setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDir('asc');
        }
    };

    const SortIcon = ({ field }: { field: SortField }) => {
        if (sortField !== field) return <ArrowUpDown className="w-3 h-3 opacity-30" />;
        return sortDir === 'asc' ? <ChevronUp className="w-3 h-3 text-info" /> : <ChevronDown className="w-3 h-3 text-info" />;
    };

    const getCriticalityBadge = (c: Criticality) => {
        const map: Record<Criticality, { label: string; cls: string }> = {
            baja: { label: 'Baja', cls: 'text-prevenort-text/40 bg-prevenort-surface border-prevenort-border' },
            media: { label: 'Media', cls: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
            alta: { label: 'Alta', cls: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
            critica: { label: 'Crítica', cls: 'text-red-400 bg-red-500/10 border-red-500/20' },
        };
        const { label, cls } = map[c];
        return <span className={cn('px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border', cls)}>{label}</span>;
    };

    const getTypeBadge = (t: InstitutionType) => {
        const map: Record<InstitutionType, string> = {
            publico: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
            privado: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
            mixto: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
        };
        return <span className={cn('px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border', map[t])}>{t}</span>;
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center h-96">
            <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-4" />
            <p className="text-prevenort-text/40 font-mono text-sm">Cargando clientes institucionales...</p>
        </div>
    );

    if (error) return (
        <div className="p-12 text-center card-premium border-red-500/20">
            <p className="text-red-400">Error al cargar instituciones: {error}</p>
        </div>
    );

    return (
        <div className="space-y-6 animate-in fade-in duration-700">
            {/* ── Header ── */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <span className="text-[10px] font-black text-blue-400 uppercase tracking-[0.3em]">Gestión Institucional</span>
                    <h2 className="text-3xl font-black text-prevenort-text tracking-tighter uppercase">Clientes Institucionales</h2>
                </div>
                <div className="flex items-center gap-2">
                    {/* Toggle vista */}
                    <div className="flex border border-prevenort-border rounded-lg overflow-hidden">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={cn("p-2 transition-colors", viewMode === 'grid' ? "bg-prevenort-primary/10 text-prevenort-text" : "bg-transparent text-prevenort-text/40 hover:text-prevenort-text")}
                        >
                            <LayoutGrid className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={cn("p-2 transition-colors", viewMode === 'list' ? "bg-prevenort-primary/10 text-prevenort-text" : "bg-transparent text-prevenort-text/40 hover:text-prevenort-text")}
                        >
                            <List className="w-4 h-4" />
                        </button>
                    </div>
                    <button
                        onClick={() => setIsBulkModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-3 bg-prevenort-surface hover:bg-prevenort-surface/80 text-prevenort-text/60 rounded-xl font-black text-xs uppercase tracking-tight transition-all border border-prevenort-border hover:border-prevenort-text/20"
                    >
                        <Upload className="w-4 h-4" />
                        Carga Masiva
                    </button>
                    <button
                        onClick={() => { setEditingInstitution(null); setIsModalOpen(true); }}
                        className="flex items-center gap-2 px-5 py-3 bg-prevenort-primary hover:bg-prevenort-primary/90 text-white rounded-xl font-black text-xs uppercase tracking-tight transition-all shadow-xl shadow-prevenort-primary/20 border border-prevenort-primary/30"
                    >
                        <Plus className="w-4 h-4" />
                        Nueva Institución
                    </button>
                </div>
            </div>

            {/* ── KPI Cards ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: 'Clientes Activos', value: totalActive, icon: Building2, color: 'text-blue-400', glow: 'shadow-blue-500/10' },
                    { label: 'Contratos Vigentes', value: totalContracts, icon: FileText, color: 'text-emerald-400', glow: 'shadow-emerald-500/10' },
                    { label: 'Por Vencer (< 90d)', value: expiringContracts, icon: AlertTriangle, color: expiringContracts > 0 ? 'text-amber-400' : 'text-prevenort-text/40', glow: 'shadow-amber-500/10' },
                    { label: 'Criticidad Alta/Crítica', value: criticalCount, icon: Shield, color: criticalCount > 0 ? 'text-red-400' : 'text-prevenort-text/40', glow: 'shadow-red-500/10' },
                ].map(({ label, value, icon: Icon, color, glow }) => (
                    <div key={label} className={cn('card-premium group hover:scale-[1.02] transition-all', glow)}>
                        <div className="flex items-center justify-between mb-3">
                            <Icon className={cn('w-5 h-5', color)} />
                            <span className={cn('text-3xl font-black font-mono', color)}>{value}</span>
                        </div>
                        <p className="text-[9px] font-black text-prevenort-text/30 uppercase tracking-widest group-hover:text-prevenort-text/50 transition-colors">{label}</p>
                    </div>
                ))}
            </div>

            {/* ── Filtros y Búsqueda ── */}
            <div className="flex flex-col md:flex-row gap-3">
                <div className="relative flex-1 group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-prevenort-text/20 group-hover:text-info transition-colors" />
                    <input
                        type="text"
                        placeholder="Buscar por nombre, RUT, código, ciudad..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-prevenort-surface border border-prevenort-border rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-info/50 transition-all hover:bg-prevenort-surface/80 text-prevenort-text/80"
                    />
                    {searchQuery && (
                        <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                            <X className="w-3.5 h-3.5 text-prevenort-text/30 hover:text-prevenort-text/60" />
                        </button>
                    )}
                </div>
                <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value as InstitutionType | 'all')}
                    className="bg-prevenort-surface border border-prevenort-border rounded-xl px-3 py-2.5 text-xs text-prevenort-text/60 focus:outline-none focus:border-info/50 appearance-none"
                >
                    <option value="all" className="bg-prevenort-bg">Todos los tipos</option>
                    <option value="publico" className="bg-prevenort-bg">Público</option>
                    <option value="privado" className="bg-prevenort-bg">Privado</option>
                    <option value="mixto" className="bg-prevenort-bg">Mixto</option>
                </select>
                <select
                    value={filterCriticality}
                    onChange={(e) => setFilterCriticality(e.target.value as Criticality | 'all')}
                    className="bg-prevenort-surface border border-prevenort-border rounded-xl px-3 py-2.5 text-xs text-prevenort-text/60 focus:outline-none focus:border-info/50 appearance-none"
                >
                    <option value="all" className="bg-prevenort-bg">Toda criticidad</option>
                    <option value="baja" className="bg-prevenort-bg">Baja</option>
                    <option value="media" className="bg-prevenort-bg">Media</option>
                    <option value="alta" className="bg-prevenort-bg">Alta</option>
                    <option value="critica" className="bg-prevenort-bg">Crítica</option>
                </select>
            </div>

            {/* ── Barra de Acciones Masivas ── */}
            {selectedIds.size > 0 && (
                <div className="flex items-center gap-3 p-3 bg-info/5 border border-info/20 rounded-xl animate-in fade-in slide-in-from-top-2 duration-200">
                    <span className="text-xs font-bold text-info">{selectedIds.size} seleccionado(s)</span>
                    <div className="h-4 w-px bg-info/20" />
                    <button
                        disabled={isBulkActing}
                        onClick={() => handleBulkAction('activate')}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg text-[10px] font-bold uppercase hover:bg-emerald-500/20 transition-all disabled:opacity-50"
                    >
                        <ToggleRight className="w-3.5 h-3.5" /> Activar
                    </button>
                    <button
                        disabled={isBulkActing}
                        onClick={() => handleBulkAction('deactivate')}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-lg text-[10px] font-bold uppercase hover:bg-amber-500/20 transition-all disabled:opacity-50"
                    >
                        <ToggleLeft className="w-3.5 h-3.5" /> Desactivar
                    </button>
                    <button
                        disabled={isBulkActing}
                        onClick={() => handleBulkAction('delete')}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-[10px] font-bold uppercase hover:bg-red-500/20 transition-all disabled:opacity-50"
                    >
                        <Trash2 className="w-3.5 h-3.5" /> Eliminar
                    </button>
                    <div className="flex-1" />
                    <button
                        onClick={() => setSelectedIds(new Set())}
                        className="text-[10px] text-prevenort-text/40 hover:text-prevenort-text uppercase font-bold"
                    >
                        Cancelar selección
                    </button>
                    {isBulkActing && <Loader2 className="w-4 h-4 text-info animate-spin" />}
                </div>
            )}

            {/* ── VISTA LISTA (WORKLIST COMPACTA) ── */}
            {viewMode === 'list' ? (
                <div className="bg-prevenort-surface/30 border border-prevenort-border rounded-2xl overflow-hidden">
                    {/* Header de tabla */}
                    <div className="grid grid-cols-[40px_1fr_130px_130px_120px_100px_90px] gap-2 px-4 py-2.5 bg-prevenort-surface/50 border-b border-prevenort-border text-[10px] uppercase font-bold text-prevenort-text/40 tracking-widest">
                        <div className="flex items-center justify-center">
                            <button onClick={toggleSelectAll} className="hover:text-prevenort-text transition-colors">
                                {selectedIds.size === filteredAndSorted.length && filteredAndSorted.length > 0
                                    ? <CheckSquare className="w-4 h-4 text-info" />
                                    : <Square className="w-4 h-4" />
                                }
                            </button>
                        </div>
                        <button onClick={() => handleSortToggle('legalName')} className="flex items-center gap-1 hover:text-prevenort-text transition-colors">
                            Institución <SortIcon field="legalName" />
                        </button>
                        <button onClick={() => handleSortToggle('institutionCategory')} className="flex items-center gap-1 hover:text-prevenort-text transition-colors">
                            Categoría <SortIcon field="institutionCategory" />
                        </button>
                        <button onClick={() => handleSortToggle('institutionType')} className="flex items-center gap-1 hover:text-prevenort-text transition-colors">
                            Tipo <SortIcon field="institutionType" />
                        </button>
                        <button onClick={() => handleSortToggle('city')} className="flex items-center gap-1 hover:text-prevenort-text transition-colors">
                            Ciudad <SortIcon field="city" />
                        </button>
                        <div>Contratos</div>
                        <button onClick={() => handleSortToggle('criticality')} className="flex items-center gap-1 hover:text-prevenort-text transition-colors">
                            Criticidad <SortIcon field="criticality" />
                        </button>
                    </div>

                    {/* Filas */}
                    {filteredAndSorted.length === 0 ? (
                        <div className="p-12 text-center">
                            <Building2 className="w-10 h-10 text-prevenort-text/10 mx-auto mb-3" />
                            <p className="text-prevenort-text/30 text-sm italic">Sin resultados</p>
                        </div>
                    ) : filteredAndSorted.map(inst => {
                        const isSelected = selectedIds.has(inst.id);
                        const cat = INSTITUTION_CATEGORIES.find(c => c.value === inst.institutionCategory);
                        return (
                            <div
                                key={inst.id}
                                className={cn(
                                    'grid grid-cols-[40px_1fr_130px_130px_120px_100px_90px] gap-2 px-4 py-2.5 border-b border-prevenort-border/30 items-center hover:bg-prevenort-surface/40 transition-colors cursor-pointer text-xs',
                                    isSelected && 'bg-info/5'
                                )}
                            >
                                <div className="flex items-center justify-center" onClick={(e) => { e.stopPropagation(); toggleSelect(inst.id); }}>
                                    {isSelected
                                        ? <CheckSquare className="w-4 h-4 text-info" />
                                        : <Square className="w-4 h-4 text-prevenort-text/20 hover:text-prevenort-text/40" />
                                    }
                                </div>
                                <div className="min-w-0" onClick={() => setSelectedId(inst.id)}>
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-prevenort-text/80 truncate">{inst.legalName}</span>
                                        {inst.institutionCode && (
                                            <span className="text-[9px] font-mono text-prevenort-text/30 bg-prevenort-surface px-1.5 py-0.5 rounded border border-prevenort-border flex-shrink-0">{inst.institutionCode}</span>
                                        )}
                                    </div>
                                    {inst.commercialName && inst.commercialName !== inst.legalName && (
                                        <p className="text-[10px] text-prevenort-text/25 truncate">{inst.commercialName}</p>
                                    )}
                                </div>
                                <div className="text-prevenort-text/50" onClick={() => setSelectedId(inst.id)}>
                                    {cat && (
                                        <span className="flex items-center gap-1 text-[10px]">
                                            <span>{cat.icon}</span>
                                            <span className="truncate">{cat.label}</span>
                                        </span>
                                    )}
                                </div>
                                <div onClick={() => setSelectedId(inst.id)}>
                                    {getTypeBadge(inst.institutionType)}
                                </div>
                                <div className="text-prevenort-text/50 truncate" onClick={() => setSelectedId(inst.id)}>
                                    {inst.city || '—'}
                                </div>
                                <div className="text-prevenort-text/50 font-mono text-center" onClick={() => setSelectedId(inst.id)}>
                                    {inst.activeContracts || 0}
                                </div>
                                <div onClick={() => setSelectedId(inst.id)}>
                                    {getCriticalityBadge(inst.criticality)}
                                </div>
                            </div>
                        );
                    })}

                    {/* Footer */}
                    <div className="px-4 py-2 bg-prevenort-surface/30 border-t border-prevenort-border">
                        <span className="text-[10px] text-prevenort-text/25 font-bold">
                            {filteredAndSorted.length} institución(es)
                            {searchQuery && ` • Búsqueda: "${searchQuery}"`}
                        </span>
                    </div>
                </div>
            ) : (
                /* ── VISTA GRID ── */
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                    {filteredAndSorted.length === 0 ? (
                        <div className="col-span-full p-12 text-center card-premium border-prevenort-border">
                            <Building2 className="w-12 h-12 text-prevenort-text/10 mx-auto mb-4" />
                            <p className="text-prevenort-text/40 italic text-sm">
                                {searchQuery ? 'No se encontraron instituciones con ese criterio.' : 'No hay instituciones registradas aún.'}
                            </p>
                        </div>
                    ) : filteredAndSorted.map(inst => {
                        const isSelected = selectedIds.has(inst.id);
                        return (
                            <div
                                key={inst.id}
                                className={cn(
                                    'card-premium cursor-pointer group hover:scale-[1.01] transition-all duration-300 relative overflow-hidden',
                                    isSelected && 'border-info/40 shadow-[0_0_20px_rgba(59,130,246,0.1)]',
                                    selectedId === inst.id && 'border-blue-500/40 shadow-[0_0_30px_rgba(59,130,246,0.1)]'
                                )}
                            >
                                {/* Checkbox */}
                                <button
                                    className="absolute top-3 left-3 z-10"
                                    onClick={(e) => { e.stopPropagation(); toggleSelect(inst.id); }}
                                >
                                    {isSelected
                                        ? <CheckSquare className="w-4 h-4 text-info" />
                                        : <Square className="w-4 h-4 text-prevenort-text/15 group-hover:text-prevenort-text/30 transition-colors" />
                                    }
                                </button>

                                {/* Glow accent */}
                                <div className={cn(
                                    'absolute top-0 right-0 w-20 h-20 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500',
                                    inst.criticality === 'critica' ? 'bg-red-500/20' :
                                        inst.criticality === 'alta' ? 'bg-amber-500/20' : 'bg-blue-500/20'
                                )} />

                                <div className="relative pl-6" onClick={() => setSelectedId(inst.id)}>
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex-1 min-w-0">
                                            <h3 className="text-sm font-black text-prevenort-text/90 truncate group-hover:text-info transition-colors">
                                                {inst.legalName}
                                            </h3>
                                            {inst.commercialName && inst.commercialName !== inst.legalName && (
                                                <p className="text-[10px] text-prevenort-text/30 truncate">{inst.commercialName}</p>
                                            )}
                                        </div>
                                        <ChevronRight className="w-4 h-4 text-prevenort-text/10 group-hover:text-prevenort-text/40 flex-shrink-0 transition-all group-hover:translate-x-0.5" />
                                    </div>

                                    <div className="flex items-center gap-2 mb-4 flex-wrap">
                                        {inst.institutionCode && (
                                            <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border bg-prevenort-surface text-prevenort-text/60 border-prevenort-border font-mono">
                                                {inst.institutionCode}
                                            </span>
                                        )}
                                        {(() => {
                                            const cat = INSTITUTION_CATEGORIES.find(c => c.value === inst.institutionCategory);
                                            return cat ? (
                                                <span className="text-[9px] flex items-center gap-1 text-prevenort-text/30">
                                                    <span>{cat.icon}</span>
                                                    <span className="font-bold">{cat.label}</span>
                                                </span>
                                            ) : null;
                                        })()}
                                        {getTypeBadge(inst.institutionType)}
                                        {getCriticalityBadge(inst.criticality)}
                                    </div>

                                    <div className="grid grid-cols-3 gap-3 pt-3 border-t border-prevenort-border/50">
                                        <div className="text-center">
                                            <p className="text-lg font-black text-prevenort-text/80 font-mono">{inst.activeContracts || 0}</p>
                                            <p className="text-[8px] text-prevenort-text/20 uppercase tracking-widest">Contratos</p>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-lg font-black text-prevenort-text/80 font-mono">{inst.contacts?.length || '—'}</p>
                                            <p className="text-[8px] text-prevenort-text/20 uppercase tracking-widest">Contactos</p>
                                        </div>
                                        <div className="text-center">
                                            <p className={cn('text-lg font-black font-mono', inst.city ? 'text-prevenort-text/80' : 'text-prevenort-text/20')}>
                                                {inst.city || '—'}
                                            </p>
                                            <p className="text-[8px] text-prevenort-text/20 uppercase tracking-widest">Ciudad</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ── Modal Crear/Editar ── */}
            {isModalOpen && (
                <InstitutionModal
                    institution={editingInstitution}
                    onClose={handleModalClose}
                    onSuccess={handleModalSuccess}
                />
            )}

            {/* ── Panel de Detalle ── */}
            {selectedId && (
                <InstitutionDetailPanel
                    institutionId={selectedId}
                    onClose={() => setSelectedId(null)}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                />
            )}

            {/* ── Modal Carga Masiva ── */}
            {isBulkModalOpen && (
                <BulkUploadModal
                    title="Carga Masiva de Instituciones"
                    subtitle="Redes & Centros"
                    icon={<Building2 className="w-6 h-6 text-blue-400" />}
                    columns={BULK_COLUMNS}
                    onClose={() => setIsBulkModalOpen(false)}
                    onSuccess={fetchInstitutions}
                    onUpload={async (rows) => {
                        let success = 0;
                        let failed = 0;
                        const errors: { row: number; message: string }[] = [];

                        for (let i = 0; i < rows.length; i++) {
                            const row = rows[i];
                            try {
                                const result = await addInstitution({
                                    legalName: row.legalName,
                                    commercialName: row.commercialName || undefined,
                                    rut: row.rut || undefined,
                                    institutionCategory: (row.institutionCategory || 'otro') as any,
                                    institutionType: (row.institutionType || 'privado') as any,
                                    sector: row.sector || 'salud',
                                    address: row.address || undefined,
                                    city: row.city || undefined,
                                    region: row.region || undefined,
                                    criticality: (row.criticality || 'media') as any,
                                    notes: row.notes || undefined,
                                });
                                if (result.success) success++;
                                else {
                                    failed++;
                                    errors.push({ row: i + 2, message: result.error?.message || 'Error desconocido' });
                                }
                            } catch (err: any) {
                                failed++;
                                errors.push({ row: i + 2, message: err.message });
                            }
                        }

                        return { total: rows.length, success, failed, errors };
                    }}
                />
            )}
        </div>
    );
};
