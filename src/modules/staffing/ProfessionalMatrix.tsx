import React, { useState, useMemo } from 'react';
import { MapPin, Briefcase, GraduationCap, Search, Plus, Filter, LayoutGrid, List, Loader2, Upload, Users, ChevronDown, ChevronUp, X, CheckSquare, Square, ToggleLeft, ToggleRight, Trash2, ArrowUpDown, CheckCircle2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useCapacityPlanning } from './useCapacityPlanning';
import { useProfessionals } from '../../hooks/useProfessionals';
import type { Professional } from '../../types/core';

import { useTenders } from '../../hooks/useTenders';

import { ProfessionalModal } from './ProfessionalModal';
import { BulkUploadModal, type ColumnDef } from '../../components/BulkUploadModal';

const CURRENT_SEDE_CITY = 'Santiago';

type SortField = 'name' | 'role' | 'team' | 'city' | 'status';
type SortDir = 'asc' | 'desc';

export const ProfessionalMatrix: React.FC = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentProfessional, setCurrentProfessional] = useState<Professional | null>(null);
    const [isBulkOpen, setIsBulkOpen] = useState(false);
    const [viewingPhoto, setViewingPhoto] = useState<string | null>(null);

    // ── Filtros ──
    const [filterRole, setFilterRole] = useState<string>('all');
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [filterTeam, setFilterTeam] = useState<string>('all');
    const [showFilters, setShowFilters] = useState(false);

    // ── Ordenamiento ──
    const [sortField, setSortField] = useState<SortField>('name');
    const [sortDir, setSortDir] = useState<SortDir>('asc');

    // ── Selección masiva ──
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isBulkActing, setIsBulkActing] = useState(false);
    const [bulkTeamValue, setBulkTeamValue] = useState<string>('');

    // ── Columnas para carga masiva de RRHH ──
    const BULK_HR_COLUMNS: ColumnDef[] = [
        { key: 'name', excelHeader: 'nombre', label: 'Nombre', required: true, example: 'Juan' },
        { key: 'lastName', excelHeader: 'apellido', label: 'Apellido', required: true, example: 'Pérez' },
        { key: 'nationalId', excelHeader: 'rut', label: 'RUT', required: false, example: '12.345.678-9' },
        { key: 'email', excelHeader: 'email', label: 'Email', required: false, example: 'jperez@ejemplo.cl' },
        { key: 'phone', excelHeader: 'telefono', label: 'Teléfono', required: false, example: '+56912345678' },
        { key: 'role', excelHeader: 'cargo', label: 'Cargo/Rol', required: false, example: 'Radiólogo', description: 'Médico, Tecnólogo Médico, Administración, Ejecutivo, TENS, Enfermera, Ingeniero, Radiólogo, Secretaria' },
        { key: 'nationality', excelHeader: 'nacionalidad', label: 'Nacionalidad', required: false, example: 'Chilena' },
        { key: 'birthDate', excelHeader: 'fecha_nacimiento', label: 'Fecha de Nacimiento', required: false, example: '1985-06-15' },
        { key: 'joiningDate', excelHeader: 'fecha_ingreso', label: 'Fecha de Ingreso', required: false, example: '2023-01-01' },
        { key: 'university', excelHeader: 'universidad', label: 'Universidad', required: false, example: 'U. de Chile' },
        { key: 'registrationNumber', excelHeader: 'n_registro', label: 'Nº Registro', required: false, example: '12345' },
        { key: 'specialty', excelHeader: 'especialidad', label: 'Especialidad', required: false, example: 'Radiología' },
        { key: 'subSpecialty', excelHeader: 'subespecialidad', label: 'Subespecialidad', required: false, example: 'Neurorradiología' },
        { key: 'team', excelHeader: 'equipo', label: 'Equipo', required: false, example: 'Equipo A' },
        { key: 'city', excelHeader: 'ciudad', label: 'Ciudad de Residencia', required: false, example: 'Santiago' },
        { key: 'region', excelHeader: 'region', label: 'Región', required: false, example: 'Metropolitana' },
        { key: 'competencies', excelHeader: 'competencias', label: 'Competencias (separadas por coma)', required: false, example: 'RM Próstata, TC Coronario' },
    ];

    const { professionals, loading, error, addProfessional, updateProfessional, archiveProfessional } = useProfessionals();
    const { tenders } = useTenders();

    const { utilizationRate, capacityGap, isOverloaded } = useCapacityPlanning(professionals, tenders);

    // ── Opciones únicas para filtros ──
    const uniqueRoles = useMemo(() => [...new Set(professionals.map(p => p.role).filter(Boolean))].sort(), [professionals]);
    const uniqueTeams = useMemo(() => [...new Set(professionals.map(p => p.team).filter(Boolean))].sort(), [professionals]);

    const handleEdit = (prof: Professional) => {
        setCurrentProfessional(prof);
        setIsModalOpen(true);
    };

    const handleSave = async (data: Omit<Professional, 'id'>) => {
        if (currentProfessional) {
            return await updateProfessional(currentProfessional.id, data);
        } else {
            return await addProfessional(data);
        }
    };

    // ── Búsqueda mejorada: nombre, apellido, email, RUT, rol, especialidad, equipo ──
    const filteredAndSorted = useMemo(() => {
        const term = searchTerm.toLowerCase().trim();

        let result = professionals.filter(p => {
            // Búsqueda global
            if (term) {
                const searchable = [
                    p.name, p.lastName, p.email, p.nationalId,
                    p.role, p.specialty, p.subSpecialty, p.team,
                    p.residence?.city, p.residence?.region,
                    ...(p.competencies || [])
                ].filter(Boolean).join(' ').toLowerCase();
                if (!searchable.includes(term)) return false;
            }

            // Filtro por rol
            if (filterRole !== 'all' && p.role !== filterRole) return false;

            // Filtro por estado activo
            if (filterStatus === 'active' && p.isActive === false) return false;
            if (filterStatus === 'inactive' && p.isActive !== false) return false;

            // Filtro por equipo
            if (filterTeam !== 'all' && (p.team || '') !== filterTeam) return false;

            return true;
        });

        // Ordenamiento
        result.sort((a, b) => {
            let valA = '', valB = '';
            switch (sortField) {
                case 'name': valA = `${a.name} ${a.lastName}`.toLowerCase(); valB = `${b.name} ${b.lastName}`.toLowerCase(); break;
                case 'role': valA = (a.role || '').toLowerCase(); valB = (b.role || '').toLowerCase(); break;
                case 'team': valA = (a.team || '').toLowerCase(); valB = (b.team || '').toLowerCase(); break;
                case 'city': valA = (a.residence?.city || '').toLowerCase(); valB = (b.residence?.city || '').toLowerCase(); break;
                case 'status': valA = a.isActive === false ? 'z' : 'a'; valB = b.isActive === false ? 'z' : 'a'; break;
            }
            const cmp = valA.localeCompare(valB);
            return sortDir === 'asc' ? cmp : -cmp;
        });

        return result;
    }, [professionals, searchTerm, filterRole, filterStatus, filterTeam, sortField, sortDir]);

    // ── Selección masiva ──
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
            setSelectedIds(new Set(filteredAndSorted.map(p => p.id)));
        }
    };

    const handleBulkAction = async (action: 'activate' | 'deactivate' | 'delete') => {
        if (selectedIds.size === 0) return;
        setIsBulkActing(true);
        try {
            const promises = Array.from(selectedIds).map(async (id) => {
                const prof = professionals.find(p => p.id === id);
                if (!prof) return;
                if (action === 'activate') {
                    await updateProfessional(id, { ...prof, isActive: true });
                } else if (action === 'deactivate') {
                    await updateProfessional(id, { ...prof, isActive: false });
                } else if (action === 'delete') {
                    await archiveProfessional(id);
                }
            });
            await Promise.all(promises);
            setSelectedIds(new Set());
        } catch (err) {
            console.error('Bulk action error:', err);
        } finally {
            setIsBulkActing(false);
        }
    };

    const handleBulkAssignTeam = async () => {
        if (selectedIds.size === 0 || !bulkTeamValue.trim()) return;
        setIsBulkActing(true);
        try {
            const promises = Array.from(selectedIds).map(async (id) => {
                const prof = professionals.find(p => p.id === id);
                if (!prof) return;
                await updateProfessional(id, { ...prof, team: bulkTeamValue.trim() });
            });
            await Promise.all(promises);
            setSelectedIds(new Set());
            setBulkTeamValue('');
        } catch (err) {
            console.error('Bulk assign team error:', err);
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
        if (sortField !== field) return <ArrowUpDown className="w-3 h-3 text-prevenort-text/20" />;
        return sortDir === 'asc' ? <ChevronUp className="w-3 h-3 text-info" /> : <ChevronDown className="w-3 h-3 text-info" />;
    };

    const activeFiltersCount = [filterRole !== 'all', filterStatus !== 'all', filterTeam !== 'all'].filter(Boolean).length;

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
                <Loader2 className="w-8 h-8 text-info animate-spin" />
                <p className="text-prevenort-text/40 animate-pulse">Sincronizando con Holding Portezuelo...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="card-premium border-danger/20 bg-danger/5 text-center py-12">
                <p className="text-danger font-bold mb-2">Error de Conexión</p>
                <p className="text-prevenort-text/40 text-sm mb-6">{error}</p>
                <button
                    onClick={() => window.location.reload()}
                    className="px-4 py-2 bg-prevenort-surface hover:bg-prevenort-primary/10 border border-prevenort-border rounded-lg transition-colors text-sm text-prevenort-text"
                >
                    Reintentar conexión
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="card-premium">
                    <p className="text-[10px] text-prevenort-text/40 uppercase font-bold tracking-widest mb-1">Utilización del Staff</p>
                    <div className="flex items-center justify-between">
                        <span className={cn("text-2xl font-black", isOverloaded ? "text-danger" : "text-success")}>
                            {utilizationRate.toFixed(1)}%
                        </span>
                        <div className="w-24 h-2 bg-prevenort-surface rounded-full overflow-hidden">
                            <div className={cn("h-full transition-all", isOverloaded ? "bg-danger" : "bg-success")} style={{ width: `${Math.min(utilizationRate, 100)}%` }} />
                        </div>
                    </div>
                </div>
                <div className="card-premium">
                    <p className="text-[10px] text-prevenort-text/40 uppercase font-bold tracking-widest mb-1">Gap de Cobertura</p>
                    <div className="flex items-center justify-between">
                        <span className="text-2xl font-black text-prevenort-text">{capacityGap > 0 ? `+${capacityGap.toFixed(0)}h` : `${capacityGap.toFixed(0)}h`}</span>
                        <span className="text-[10px] text-prevenort-text/40">Disponible p/ mes</span>
                    </div>
                </div>
                <div className="card-premium bg-info/5 border-info/20">
                    <p className="text-[10px] text-info uppercase font-bold tracking-widest mb-1">Sugerencia AI (Agrawall)</p>
                    <p className="text-xs text-info/80 italic">"Se recomienda contratar 1 Radiólogo adicional para cubrir la licitación TEN-001 sin sobrecargar al equipo actual."</p>
                </div>
            </div>

            {/* ── TOOLBAR ── */}
            <div className="flex flex-col gap-3">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-2xl font-bold text-prevenort-text">Matriz de Profesionales</h2>
                        <p className="text-prevenort-text/40 text-sm">
                            {filteredAndSorted.length} de {professionals.length} profesionales
                            {selectedIds.size > 0 && <span className="text-info font-bold"> · {selectedIds.size} seleccionado(s)</span>}
                        </p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-prevenort-text/20" />
                            <input
                                type="text"
                                placeholder="Buscar nombre, apellido, RUT, email, rol..."
                                className="bg-prevenort-surface border border-prevenort-border rounded-lg pl-10 pr-4 py-2 text-sm text-prevenort-text focus:outline-none focus:border-info/50 w-80 transition-all"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                            {searchTerm && (
                                <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                                    <X className="w-3.5 h-3.5 text-prevenort-text/30 hover:text-prevenort-text" />
                                </button>
                            )}
                        </div>
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className={cn(
                                "p-2 border rounded-lg transition-colors relative",
                                showFilters || activeFiltersCount > 0
                                    ? "bg-info/10 border-info/30 text-info"
                                    : "bg-prevenort-surface border-prevenort-border text-prevenort-text/60 hover:bg-prevenort-primary/10"
                            )}
                        >
                            <Filter className="w-4 h-4" />
                            {activeFiltersCount > 0 && (
                                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-info text-white text-[9px] font-black rounded-full flex items-center justify-center">
                                    {activeFiltersCount}
                                </span>
                            )}
                        </button>
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
                            onClick={() => setIsBulkOpen(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-prevenort-surface border border-prevenort-border hover:border-prevenort-text/20 rounded-lg transition-all font-medium text-sm text-prevenort-text/60"
                        >
                            <Upload className="w-4 h-4" />
                            <span>Carga Masiva</span>
                        </button>
                        <button
                            onClick={() => {
                                setCurrentProfessional(null);
                                setIsModalOpen(true);
                            }}
                            className="flex items-center gap-2 px-4 py-2 bg-prevenort-text text-prevenort-bg hover:opacity-90 rounded-lg transition-all font-medium text-sm"
                        >
                            <Plus className="w-4 h-4" />
                            <span>Añadir Profesional</span>
                        </button>
                    </div>
                </div>

                {/* ── PANEL DE FILTROS ── */}
                {showFilters && (
                    <div className="flex flex-wrap items-center gap-3 p-3 bg-prevenort-surface/50 border border-prevenort-border rounded-xl animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="flex items-center gap-2">
                            <label className="text-[10px] uppercase font-bold text-prevenort-text/40 tracking-widest">Rol</label>
                            <select
                                value={filterRole}
                                onChange={e => setFilterRole(e.target.value)}
                                className="bg-prevenort-bg border border-prevenort-border rounded-lg px-3 py-1.5 text-xs text-prevenort-text focus:border-info/50 outline-none appearance-none"
                            >
                                <option value="all">Todos</option>
                                {uniqueRoles.map(r => <option key={r} value={r}>{r}</option>)}
                            </select>
                        </div>
                        <div className="flex items-center gap-2">
                            <label className="text-[10px] uppercase font-bold text-prevenort-text/40 tracking-widest">Estado</label>
                            <select
                                value={filterStatus}
                                onChange={e => setFilterStatus(e.target.value)}
                                className="bg-prevenort-bg border border-prevenort-border rounded-lg px-3 py-1.5 text-xs text-prevenort-text focus:border-info/50 outline-none appearance-none"
                            >
                                <option value="all">Todos</option>
                                <option value="active">Activos</option>
                                <option value="inactive">Inactivos</option>
                            </select>
                        </div>
                        <div className="flex items-center gap-2">
                            <label className="text-[10px] uppercase font-bold text-prevenort-text/40 tracking-widest">Equipo</label>
                            <select
                                value={filterTeam}
                                onChange={e => setFilterTeam(e.target.value)}
                                className="bg-prevenort-bg border border-prevenort-border rounded-lg px-3 py-1.5 text-xs text-prevenort-text focus:border-info/50 outline-none appearance-none"
                            >
                                <option value="all">Todos</option>
                                {uniqueTeams.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>
                        {activeFiltersCount > 0 && (
                            <button
                                onClick={() => { setFilterRole('all'); setFilterStatus('all'); setFilterTeam('all'); }}
                                className="text-[10px] uppercase font-bold text-red-400 hover:text-red-300 tracking-widest flex items-center gap-1"
                            >
                                <X className="w-3 h-3" /> Limpiar filtros
                            </button>
                        )}
                    </div>
                )}

                {/* ── BARRA DE ACCIONES MASIVAS ── */}
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
                            onClick={() => { if (confirm(`¿Eliminar ${selectedIds.size} profesional(es)?`)) handleBulkAction('delete'); }}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-[10px] font-bold uppercase hover:bg-red-500/20 transition-all disabled:opacity-50"
                        >
                            <Trash2 className="w-3.5 h-3.5" /> Eliminar
                        </button>
                        <div className="h-4 w-px bg-info/20" />
                        <div className="flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5 text-purple-400" />
                            <select
                                value={bulkTeamValue}
                                onChange={e => setBulkTeamValue(e.target.value)}
                                className="bg-prevenort-bg border border-purple-500/20 rounded-lg px-2 py-1 text-[10px] text-prevenort-text focus:border-purple-500/50 outline-none appearance-none"
                            >
                                <option value="">Asignar Equipo...</option>
                                {uniqueTeams.map(t => <option key={t} value={t}>{t}</option>)}
                                <option value="__new__">+ Nuevo equipo</option>
                            </select>
                            {bulkTeamValue === '__new__' && (
                                <input
                                    type="text"
                                    placeholder="Nombre del equipo"
                                    className="bg-prevenort-bg border border-purple-500/20 rounded-lg px-2 py-1 text-[10px] text-prevenort-text w-28 focus:border-purple-500/50 outline-none"
                                    onKeyDown={e => {
                                        if (e.key === 'Enter') {
                                            const val = (e.target as HTMLInputElement).value.trim();
                                            if (val) { setBulkTeamValue(val); }
                                        }
                                    }}
                                    onBlur={e => {
                                        const val = e.target.value.trim();
                                        if (val) { setBulkTeamValue(val); }
                                    }}
                                />
                            )}
                            {bulkTeamValue && bulkTeamValue !== '__new__' && (
                                <button
                                    disabled={isBulkActing}
                                    onClick={handleBulkAssignTeam}
                                    className="flex items-center gap-1 px-2.5 py-1 bg-purple-500/10 border border-purple-500/20 text-purple-400 rounded-lg text-[10px] font-bold uppercase hover:bg-purple-500/20 transition-all disabled:opacity-50"
                                >
                                    Aplicar
                                </button>
                            )}
                        </div>
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
            </div>

            {/* ── VISTA LISTA (WORKLIST COMPACTA) ── */}
            {viewMode === 'list' ? (
                <div className="bg-prevenort-surface/30 border border-prevenort-border rounded-2xl overflow-hidden">
                    {/* Header de tabla */}
                    <div className="grid grid-cols-[40px_1fr_140px_120px_140px_100px_80px] gap-2 px-4 py-2.5 bg-prevenort-surface/50 border-b border-prevenort-border text-[10px] uppercase font-bold text-prevenort-text/40 tracking-widest">
                        <div className="flex items-center justify-center">
                            <button onClick={toggleSelectAll} className="hover:text-prevenort-text transition-colors">
                                {selectedIds.size === filteredAndSorted.length && filteredAndSorted.length > 0
                                    ? <CheckSquare className="w-4 h-4 text-info" />
                                    : <Square className="w-4 h-4" />
                                }
                            </button>
                        </div>
                        <button onClick={() => handleSortToggle('name')} className="flex items-center gap-1 hover:text-prevenort-text transition-colors text-left">
                            Nombre <SortIcon field="name" />
                        </button>
                        <button onClick={() => handleSortToggle('role')} className="flex items-center gap-1 hover:text-prevenort-text transition-colors">
                            Rol <SortIcon field="role" />
                        </button>
                        <button onClick={() => handleSortToggle('team')} className="flex items-center gap-1 hover:text-prevenort-text transition-colors">
                            Equipo <SortIcon field="team" />
                        </button>
                        <button onClick={() => handleSortToggle('city')} className="flex items-center gap-1 hover:text-prevenort-text transition-colors">
                            Ciudad <SortIcon field="city" />
                        </button>
                        <div>Contratos</div>
                        <button onClick={() => handleSortToggle('status')} className="flex items-center gap-1 hover:text-prevenort-text transition-colors justify-center">
                            Estado <SortIcon field="status" />
                        </button>
                    </div>

                    {/* Filas de datos */}
                    {filteredAndSorted.length === 0 ? (
                        <div className="text-center py-12 text-prevenort-text/30 text-sm">Sin resultados</div>
                    ) : (
                        filteredAndSorted.map((prof) => {
                            const isActive = prof.isActive !== false;
                            const isSelected = selectedIds.has(prof.id);
                            return (
                                <div
                                    key={prof.id}
                                    className={cn(
                                        "grid grid-cols-[40px_1fr_140px_120px_140px_100px_80px] gap-2 px-4 py-2 border-b border-prevenort-border/50 hover:bg-prevenort-surface/30 transition-colors cursor-pointer items-center group",
                                        isSelected && "bg-info/5",
                                        !isActive && "opacity-60"
                                    )}
                                >
                                    <div className="flex items-center justify-center" onClick={(e) => { e.stopPropagation(); toggleSelect(prof.id); }}>
                                        {isSelected
                                            ? <CheckSquare className="w-4 h-4 text-info" />
                                            : <Square className="w-4 h-4 text-prevenort-text/20 group-hover:text-prevenort-text/40" />
                                        }
                                    </div>
                                    <div className="flex items-center gap-3 min-w-0" onClick={() => handleEdit(prof)}>
                                        <div className={cn(
                                            "w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-sm font-bold overflow-hidden",
                                            isActive
                                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                                                : "bg-red-500/10 text-red-400 border border-red-500/30"
                                        )}>
                                            {prof.photoUrl ? (
                                                <img src={prof.photoUrl} alt={prof.name} className="w-full h-full object-cover" />
                                            ) : (
                                                prof.name[0]
                                            )}
                                        </div>
                                        <div className="min-w-0">
                                            <p className={cn(
                                                "text-sm font-semibold truncate",
                                                isActive ? "text-prevenort-text group-hover:text-info" : "text-prevenort-text/50 line-through decoration-red-500/30"
                                            )}>
                                                {prof.name} {prof.lastName}
                                            </p>
                                            <p className="text-[10px] text-prevenort-text/30 truncate font-mono">{prof.nationalId} · {prof.email}</p>
                                        </div>
                                    </div>
                                    <div className="text-xs text-prevenort-text/60 truncate" onClick={() => handleEdit(prof)}>{prof.role}</div>
                                    <div className="text-xs text-prevenort-text/40 truncate" onClick={() => handleEdit(prof)}>{prof.team || '—'}</div>
                                    <div className="text-xs text-prevenort-text/40 truncate" onClick={() => handleEdit(prof)}>
                                        <span className="flex items-center gap-1">
                                            <MapPin className="w-3 h-3 text-prevenort-text/20 flex-shrink-0" />
                                            {prof.residence?.city || '—'}
                                        </span>
                                    </div>
                                    <div className="text-xs text-prevenort-text/40" onClick={() => handleEdit(prof)}>{prof.contracts?.length || 0}</div>
                                    <div className="flex justify-center" onClick={() => handleEdit(prof)}>
                                        <span className={cn(
                                            "text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider",
                                            isActive
                                                ? "text-emerald-400 bg-emerald-500/10 border border-emerald-500/20"
                                                : "text-red-400 bg-red-500/10 border border-red-500/20"
                                        )}>
                                            {isActive ? 'Activo' : 'Inactivo'}
                                        </span>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            ) : (
                /* ── VISTA GRID ── */
                <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
                    {filteredAndSorted.map((prof) => {
                        const isActive = prof.isActive !== false;
                        const isSelected = selectedIds.has(prof.id);
                        return (
                            <div
                                key={prof.id}
                                className={cn(
                                    "card-premium group transition-all duration-300 cursor-pointer relative",
                                    isActive
                                        ? "ring-2 ring-emerald-500/40 hover:ring-emerald-400/60 shadow-[0_0_15px_-3px_rgba(16,185,129,0.2)] hover:shadow-[0_0_20px_-3px_rgba(16,185,129,0.35)]"
                                        : "ring-2 ring-red-500/40 hover:ring-red-400/60 shadow-[0_0_15px_-3px_rgba(239,68,68,0.2)] hover:shadow-[0_0_20px_-3px_rgba(239,68,68,0.35)] opacity-75",
                                    isSelected && "ring-info ring-2 bg-info/5"
                                )}
                            >
                                {/* Checkbox de selección */}
                                <button
                                    onClick={(e) => { e.stopPropagation(); toggleSelect(prof.id); }}
                                    className="absolute top-3 left-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    {isSelected
                                        ? <CheckSquare className="w-5 h-5 text-info" />
                                        : <Square className="w-5 h-5 text-prevenort-text/30 hover:text-prevenort-text/60" />
                                    }
                                </button>

                                <div className="flex flex-col space-y-4" onClick={() => handleEdit(prof)}>
                                    <div className="flex items-start justify-between">
                                        <div className="relative">
                                            {prof.photoUrl ? (
                                                <img
                                                    src={prof.photoUrl}
                                                    alt={prof.name}
                                                    className={cn("w-12 h-12 rounded-full object-cover cursor-pointer hover:opacity-80 transition-opacity", isActive ? "border-2 border-emerald-500/50" : "border-2 border-red-500/50")}
                                                    onClick={(e) => { e.stopPropagation(); setViewingPhoto(prof.photoUrl!); }}
                                                />
                                            ) : (
                                                <div className={cn(
                                                    "w-12 h-12 rounded-full bg-gradient-to-br from-prevenort-surface to-prevenort-surface/50 flex items-center justify-center text-xl font-bold text-prevenort-text",
                                                    isActive
                                                        ? "border-2 border-emerald-500/50"
                                                        : "border-2 border-red-500/50"
                                                )}>
                                                    {prof.name[0]}
                                                </div>
                                            )}
                                            <span className={cn(
                                                "absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-prevenort-bg",
                                                isActive ? "bg-emerald-500" : "bg-red-500"
                                            )} title={isActive ? 'Activo' : 'Inactivo'} />
                                        </div>
                                        <div className="flex flex-col items-end gap-1">
                                            <span className={cn(
                                                "text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider",
                                                isActive
                                                    ? "text-emerald-400 bg-emerald-500/10 border border-emerald-500/20"
                                                    : "text-red-400 bg-red-500/10 border border-red-500/20"
                                            )}>
                                                {isActive ? '● ACTIVO' : '● INACTIVO'}
                                            </span>
                                            {prof.infoStatus === 'complete' ? (
                                                <span className="text-[9px] font-black text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider">Info Completa</span>
                                            ) : (
                                                <span className="text-[9px] font-black text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider">Info Incompleta</span>
                                            )}
                                            {prof.isVerified && (
                                                <span className="flex items-center gap-1 text-[9px] font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider">
                                                    <CheckCircle2 className="w-3 h-3" /> Verificado
                                                </span>
                                            )}
                                            {prof.contracts?.[0] && (
                                                <span className="text-[10px] font-bold text-info bg-info/10 px-2 py-0.5 rounded uppercase tracking-wider">
                                                    {prof.contracts[0].company}
                                                </span>
                                            )}
                                            {prof.residence?.city !== CURRENT_SEDE_CITY && prof.residence?.city && (
                                                <span className="text-[8px] font-black text-amber-500 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded-full uppercase tracking-tighter animate-pulse">
                                                    REQUIERE TRASLADO
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <h4 className={cn(
                                                    "font-bold text-lg transition-colors",
                                                    isActive
                                                        ? "text-prevenort-text group-hover:text-info"
                                                        : "text-prevenort-text/50 group-hover:text-red-400 line-through decoration-red-500/30"
                                                )}>
                                                    {prof.name} {prof.lastName}
                                                </h4>
                                                <span className="text-[10px] text-prevenort-text/20 font-mono">{prof.nationalId}</span>
                                            </div>
                                            <p className="text-prevenort-text/40 text-xs mb-4">{prof.role} • {prof.email}</p>
                                        </div>

                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2 text-xs text-prevenort-text/60">
                                                <MapPin className="w-3 h-3 text-prevenort-text/20" />
                                                <span>{prof.residence?.city || '—'}, {prof.residence?.region || ''}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-xs text-prevenort-text/60">
                                                <Briefcase className="w-3 h-3 text-prevenort-text/20" />
                                                <span>{prof.contracts?.length || 0} Contrato(s) • {prof.team || 'Sin Equipo'}</span>
                                            </div>
                                        </div>

                                        <div className="pt-4 border-t border-prevenort-border">
                                            <div className="flex items-center gap-2 mb-2">
                                                <GraduationCap className="w-3 h-3 text-prevenort-text/20" />
                                                <span className="text-[10px] uppercase font-bold text-prevenort-text/40 tracking-widest">Competencias</span>
                                            </div>
                                            <div className="flex flex-wrap gap-1">
                                                {prof.competencies.map((comp, i) => (
                                                    <span key={i} className="text-[9px] bg-prevenort-surface border border-prevenort-border px-1.5 py-0.5 rounded text-prevenort-text/80">
                                                        {comp}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            <ProfessionalModal
                isOpen={isModalOpen}
                initialData={currentProfessional}
                existingProfessionals={professionals}
                onClose={() => {
                    setIsModalOpen(false);
                    setCurrentProfessional(null);
                }}
                onSave={handleSave}
                onDelete={archiveProfessional}
            />

            {/* ── Modal Carga Masiva RRHH ── */}
            {isBulkOpen && (
                <BulkUploadModal
                    title="Carga Masiva de Personal"
                    subtitle="Recursos Humanos"
                    icon={<Users className="w-6 h-6 text-purple-400" />}
                    columns={BULK_HR_COLUMNS}
                    onClose={() => setIsBulkOpen(false)}
                    onSuccess={() => window.location.reload()}
                    onUpload={async (rows) => {
                        let success = 0;
                        let failed = 0;
                        const errors: { row: number; message: string }[] = [];

                        for (let i = 0; i < rows.length; i++) {
                            const row = rows[i];
                            try {
                                const competencies = row.competencies
                                    ? row.competencies.split(',').map((c: string) => c.trim()).filter(Boolean)
                                    : [];

                                const result = await addProfessional({
                                    name: row.name,
                                    lastName: row.lastName || '',
                                    email: row.email || `${(row.name || '').toLowerCase().replace(/\s+/g, '.')}@pendiente.cl`,
                                    nationalId: row.nationalId || '',
                                    nationality: row.nationality || 'Chilena',
                                    birthDate: row.birthDate || '',
                                    joiningDate: row.joiningDate || new Date().toISOString().split('T')[0],
                                    phone: row.phone || '',
                                    role: (row.role || 'Radiólogo') as any,
                                    status: 'active',
                                    isActive: true,
                                    university: row.university || undefined,
                                    registrationNumber: row.registrationNumber || undefined,
                                    specialty: row.specialty || undefined,
                                    subSpecialty: row.subSpecialty || undefined,
                                    team: row.team || undefined,
                                    residence: {
                                        city: row.city || 'Santiago',
                                        region: row.region || 'Metropolitana',
                                        country: 'Chile',
                                    },
                                    competencies,
                                    contracts: [],
                                });
                                if (result.success) success++;
                                else {
                                    failed++;
                                    errors.push({ row: i + 2, message: result.error || 'Error desconocido' });
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

            {/* Modal superpuesto para ver foto grande */}
            {viewingPhoto && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setViewingPhoto(null)}>
                    <div className="relative max-w-2xl max-h-[80vh] bg-prevenort-surface rounded-2xl overflow-hidden border border-prevenort-border shadow-2xl animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                        <div className="absolute top-4 right-4 flex gap-2">
                            <button onClick={() => setViewingPhoto(null)} className="p-2 bg-black/50 hover:bg-black/80 text-white rounded-full transition-colors backdrop-blur-md">
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        <img src={viewingPhoto} alt="Fotografía del Profesional" className="w-full h-full object-contain max-h-[80vh] scale-100" />
                    </div>
                </div>
            )}
        </div>
    );
};
