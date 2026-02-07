import React, { useState, useEffect } from 'react';
import { Building2, Plus, Search, Filter, AlertTriangle, FileText, Users, Shield, TrendingUp, Loader2, ChevronRight, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useInstitutions } from '../../hooks/useInstitutions';
import { InstitutionModal } from './InstitutionModal';
import { InstitutionDetailPanel } from './InstitutionDetailPanel';
import type { Institution, InstitutionType, Criticality } from '../../types/institutions';

export const InstitutionsDashboard: React.FC = () => {
    const { institutions, loading, error, fetchInstitutions, deleteInstitution } = useInstitutions();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingInstitution, setEditingInstitution] = useState<Institution | null>(null);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState<InstitutionType | 'all'>('all');
    const [filterCriticality, setFilterCriticality] = useState<Criticality | 'all'>('all');

    // ── KPIs ──
    const totalActive = institutions.filter(i => i.isActive).length;
    const totalContracts = institutions.reduce((sum, i) => sum + (i.activeContracts || 0), 0);
    const expiringContracts = institutions.reduce((sum, i) => {
        return sum + (i.contracts || []).filter(c => c.status === 'active' && c.daysUntilExpiry !== undefined && c.daysUntilExpiry <= 90 && c.daysUntilExpiry > 0).length;
    }, 0);
    const criticalCount = institutions.filter(i => i.criticality === 'critica' || i.criticality === 'alta').length;

    // ── Filtrado ──
    const filtered = institutions.filter(inst => {
        const matchesSearch = searchQuery === '' ||
            inst.legalName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            inst.rut?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            inst.commercialName?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesType = filterType === 'all' || inst.institutionType === filterType;
        const matchesCrit = filterCriticality === 'all' || inst.criticality === filterCriticality;
        return matchesSearch && matchesType && matchesCrit;
    });

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

    const handleModalClose = () => {
        setIsModalOpen(false);
        setEditingInstitution(null);
    };

    const handleModalSuccess = () => {
        handleModalClose();
        fetchInstitutions();
    };

    const getCriticalityBadge = (c: Criticality) => {
        const map: Record<Criticality, { label: string; cls: string }> = {
            baja: { label: 'Baja', cls: 'text-white/40 bg-white/5 border-white/10' },
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
            <p className="text-white/40 font-mono text-sm">Cargando clientes institucionales...</p>
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
                    <h2 className="text-3xl font-black text-white tracking-tighter uppercase">Clientes Institucionales</h2>
                </div>
                <button
                    onClick={() => { setEditingInstitution(null); setIsModalOpen(true); }}
                    className="flex items-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-black text-xs uppercase tracking-tight transition-all shadow-xl shadow-blue-500/20 border border-blue-400/30"
                >
                    <Plus className="w-4 h-4" />
                    Nueva Institución
                </button>
            </div>

            {/* ── KPI Cards ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: 'Clientes Activos', value: totalActive, icon: Building2, color: 'text-blue-400', glow: 'shadow-blue-500/10' },
                    { label: 'Contratos Vigentes', value: totalContracts, icon: FileText, color: 'text-emerald-400', glow: 'shadow-emerald-500/10' },
                    { label: 'Por Vencer (< 90d)', value: expiringContracts, icon: AlertTriangle, color: expiringContracts > 0 ? 'text-amber-400' : 'text-white/40', glow: 'shadow-amber-500/10' },
                    { label: 'Criticidad Alta/Crítica', value: criticalCount, icon: Shield, color: criticalCount > 0 ? 'text-red-400' : 'text-white/40', glow: 'shadow-red-500/10' },
                ].map(({ label, value, icon: Icon, color, glow }) => (
                    <div key={label} className={cn('card-premium group hover:scale-[1.02] transition-all', glow)}>
                        <div className="flex items-center justify-between mb-3">
                            <Icon className={cn('w-5 h-5', color)} />
                            <span className={cn('text-3xl font-black font-mono', color)}>{value}</span>
                        </div>
                        <p className="text-[9px] font-black text-white/30 uppercase tracking-widest group-hover:text-white/50 transition-colors">{label}</p>
                    </div>
                ))}
            </div>

            {/* ── Filtros y Búsqueda ── */}
            <div className="flex flex-col md:flex-row gap-3">
                <div className="relative flex-1 group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-hover:text-blue-400 transition-colors" />
                    <input
                        type="text"
                        placeholder="Buscar por nombre, RUT o razón social..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-blue-500/50 transition-all hover:bg-white/[0.08] text-white/80"
                    />
                    {searchQuery && (
                        <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                            <X className="w-3.5 h-3.5 text-white/30 hover:text-white/60" />
                        </button>
                    )}
                </div>
                <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value as InstitutionType | 'all')}
                    className="bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white/60 focus:outline-none focus:border-blue-500/50"
                >
                    <option value="all" className="bg-[#0a0a0a]">Todos los tipos</option>
                    <option value="publico" className="bg-[#0a0a0a]">Público</option>
                    <option value="privado" className="bg-[#0a0a0a]">Privado</option>
                    <option value="mixto" className="bg-[#0a0a0a]">Mixto</option>
                </select>
                <select
                    value={filterCriticality}
                    onChange={(e) => setFilterCriticality(e.target.value as Criticality | 'all')}
                    className="bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white/60 focus:outline-none focus:border-blue-500/50"
                >
                    <option value="all" className="bg-[#0a0a0a]">Toda criticidad</option>
                    <option value="baja" className="bg-[#0a0a0a]">Baja</option>
                    <option value="media" className="bg-[#0a0a0a]">Media</option>
                    <option value="alta" className="bg-[#0a0a0a]">Alta</option>
                    <option value="critica" className="bg-[#0a0a0a]">Crítica</option>
                </select>
            </div>

            {/* ── Grid de Instituciones ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                {filtered.length === 0 ? (
                    <div className="col-span-full p-12 text-center card-premium border-white/5">
                        <Building2 className="w-12 h-12 text-white/10 mx-auto mb-4" />
                        <p className="text-white/40 italic text-sm">
                            {searchQuery ? 'No se encontraron instituciones con ese criterio.' : 'No hay instituciones registradas aún.'}
                        </p>
                    </div>
                ) : filtered.map(inst => (
                    <div
                        key={inst.id}
                        onClick={() => setSelectedId(inst.id)}
                        className={cn(
                            'card-premium cursor-pointer group hover:scale-[1.01] transition-all duration-300 relative overflow-hidden',
                            selectedId === inst.id && 'border-blue-500/40 shadow-[0_0_30px_rgba(59,130,246,0.1)]'
                        )}
                    >
                        {/* Glow accent */}
                        <div className={cn(
                            'absolute top-0 right-0 w-20 h-20 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500',
                            inst.criticality === 'critica' ? 'bg-red-500/20' :
                                inst.criticality === 'alta' ? 'bg-amber-500/20' : 'bg-blue-500/20'
                        )} />

                        <div className="relative">
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-sm font-black text-white/90 truncate group-hover:text-blue-400 transition-colors">
                                        {inst.legalName}
                                    </h3>
                                    {inst.commercialName && inst.commercialName !== inst.legalName && (
                                        <p className="text-[10px] text-white/30 truncate">{inst.commercialName}</p>
                                    )}
                                </div>
                                <ChevronRight className="w-4 h-4 text-white/10 group-hover:text-white/40 flex-shrink-0 transition-all group-hover:translate-x-0.5" />
                            </div>

                            <div className="flex items-center gap-2 mb-4 flex-wrap">
                                {getTypeBadge(inst.institutionType)}
                                {getCriticalityBadge(inst.criticality)}
                                {inst.rut && (
                                    <span className="text-[9px] text-white/20 font-mono">{inst.rut}</span>
                                )}
                            </div>

                            <div className="grid grid-cols-3 gap-3 pt-3 border-t border-white/5">
                                <div className="text-center">
                                    <p className="text-lg font-black text-white/80 font-mono">{inst.activeContracts || 0}</p>
                                    <p className="text-[8px] text-white/20 uppercase tracking-widest">Contratos</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-lg font-black text-white/80 font-mono">{inst.contacts?.length || '—'}</p>
                                    <p className="text-[8px] text-white/20 uppercase tracking-widest">Contactos</p>
                                </div>
                                <div className="text-center">
                                    <p className={cn('text-lg font-black font-mono', inst.city ? 'text-white/80' : 'text-white/20')}>
                                        {inst.city || '—'}
                                    </p>
                                    <p className="text-[8px] text-white/20 uppercase tracking-widest">Ciudad</p>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

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
        </div>
    );
};
