import React, { useState, useMemo } from 'react';
import { Search, User, ChevronRight, Home, FileText, Briefcase, Award } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useProfessionals } from '../../hooks/useProfessionals';
import type { Professional } from '../../types/core';
import type { PortalView } from './PortalMedicoLayout';
import { PortalMedicoDashboard } from './PortalMedicoDashboard';
import {
    MisDocumentosView,
    MisContratosView,
    MisCompetenciasView,
} from './PortalMedicoViews';

// ─── Pestañas del panel derecho ───────────────────────────────────────────────
type AdminPortalTab = 'inicio' | 'documentos' | 'contratos' | 'competencias';

const ADMIN_TABS: { id: AdminPortalTab; label: string; icon: React.ElementType }[] = [
    { id: 'inicio',       label: 'Inicio',        icon: Home      },
    { id: 'documentos',   label: 'Documentos',    icon: FileText  },
    { id: 'contratos',    label: 'Contratos',     icon: Briefcase },
    { id: 'competencias', label: 'Competencias',  icon: Award     },
];

// ─── Indicador de estado ──────────────────────────────────────────────────────
const INFO_STATUS_DOT: Record<string, string> = {
    complete:   'bg-emerald-400',
    pending:    'bg-amber-400',
    incomplete: 'bg-red-400',
};

// ─── Avatar con iniciales ─────────────────────────────────────────────────────
const ProfAvatar: React.FC<{ prof: Professional; size?: 'sm' | 'md' }> = ({ prof, size = 'md' }) => {
    const initials = `${prof.name[0] ?? ''}${prof.lastName[0] ?? ''}`.toUpperCase();
    return (
        <div className={cn(
            'rounded-2xl flex items-center justify-center font-black text-brand-primary bg-brand-primary/10 border border-brand-primary/20 shrink-0',
            size === 'sm' ? 'w-9 h-9 text-xs' : 'w-11 h-11 text-sm'
        )}>
            {prof.photoUrl
                ? <img src={prof.photoUrl} alt={prof.name} className="w-full h-full object-cover rounded-2xl" />
                : initials
            }
        </div>
    );
};

// ─── Tarjeta de médico ────────────────────────────────────────────────────────
const ProfCard: React.FC<{
    prof:     Professional;
    selected: boolean;
    onClick:  () => void;
}> = ({ prof, selected, onClick }) => {
    const dotColor = INFO_STATUS_DOT[prof.infoStatus ?? 'incomplete'] ?? INFO_STATUS_DOT.incomplete;
    return (
        <button
            onClick={onClick}
            className={cn(
                'w-full flex items-center gap-3 px-3 py-3 rounded-2xl border text-left transition-all group',
                selected
                    ? 'bg-brand-primary/10 border-brand-primary/30 text-brand-text'
                    : 'bg-brand-surface border-brand-border hover:bg-brand-surface-hover hover:border-brand-border'
            )}
        >
            <ProfAvatar prof={prof} size="sm" />
            <div className="flex-1 min-w-0">
                <p className={cn(
                    'text-xs font-bold truncate transition-colors',
                    selected ? 'text-brand-primary' : 'text-brand-text group-hover:text-brand-primary'
                )}>
                    {prof.name} {prof.lastName}
                </p>
                <p className="text-[10px] text-brand-text/40 truncate mt-0.5">
                    {prof.specialty ?? prof.role}
                </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
                <span className={cn('w-2 h-2 rounded-full', dotColor)} />
                {selected && <ChevronRight className="w-3.5 h-3.5 text-brand-primary" />}
            </div>
        </button>
    );
};

// ─── Estado vacío ─────────────────────────────────────────────────────────────
const EmptySelection: React.FC = () => (
    <div className="flex flex-col items-center justify-center h-full gap-5 text-center py-20">
        <div className="w-20 h-20 rounded-3xl bg-brand-surface border border-brand-border flex items-center justify-center">
            <User className="w-8 h-8 text-brand-text/20" />
        </div>
        <div>
            <p className="text-sm font-bold text-brand-text/40">Selecciona un médico</p>
            <p className="text-xs text-brand-text/20 mt-1">para ver su portal tal como él lo ve</p>
        </div>
    </div>
);

// ─── Panel del portal embebido ────────────────────────────────────────────────
const EmbeddedPortal: React.FC<{ prof: Professional }> = ({ prof }) => {
    const [activeTab, setActiveTab] = useState<AdminPortalTab>('inicio');

    // Mapea vistas del portal nativo a pestañas del admin
    const handlePortalNavigate = (view: PortalView) => {
        const map: Partial<Record<PortalView, AdminPortalTab>> = {
            documentos:   'documentos',
            contratos:    'contratos',
            competencias: 'competencias',
        };
        const target = map[view];
        if (target) setActiveTab(target);
    };

    const renderTab = () => {
        switch (activeTab) {
            case 'inicio':
                return (
                    <PortalMedicoDashboard
                        onNavigate={handlePortalNavigate}
                        targetEmail={prof.email}
                    />
                );
            case 'documentos':
                return <MisDocumentosView targetEmail={prof.email} />;
            case 'contratos':
                return <MisContratosView targetEmail={prof.email} />;
            case 'competencias':
                return (
                    <MisCompetenciasView
                        onNavigate={handlePortalNavigate}
                        targetEmail={prof.email}
                    />
                );
        }
    };

    return (
        <div className="flex flex-col h-full">
            {/* Encabezado del portal */}
            <div className="px-6 py-4 border-b border-brand-border bg-brand-surface/50">
                <div className="flex items-center gap-3">
                    <ProfAvatar prof={prof} size="md" />
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-brand-primary/70">
                            Vista del portal
                        </p>
                        <h3 className="text-base font-black text-brand-text leading-tight">
                            {prof.name} {prof.lastName}
                        </h3>
                        <p className="text-[10px] text-brand-text/40 mt-0.5">
                            {prof.email}
                        </p>
                    </div>
                    <div className="ml-auto">
                        <span className={cn(
                            'text-[9px] font-black px-2.5 py-1 rounded-full border uppercase tracking-wider',
                            prof.infoStatus === 'complete'
                                ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                                : prof.infoStatus === 'pending'
                                ? 'text-amber-400 bg-amber-500/10 border-amber-500/20'
                                : 'text-red-400 bg-red-500/10 border-red-500/20'
                        )}>
                            {prof.infoStatus === 'complete' ? 'Perfil completo'
                                : prof.infoStatus === 'pending' ? 'Pendiente revisión'
                                : 'Perfil incompleto'}
                        </span>
                    </div>
                </div>

                {/* Sub-navegación */}
                <div className="flex gap-1 mt-4">
                    {ADMIN_TABS.map(tab => {
                        const Icon = tab.icon;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={cn(
                                    'flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all',
                                    activeTab === tab.id
                                        ? 'bg-brand-primary text-white shadow-sm shadow-brand-primary/30'
                                        : 'text-brand-text/40 hover:text-brand-text hover:bg-brand-surface'
                                )}
                            >
                                <Icon className="w-3.5 h-3.5" />
                                {tab.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Contenido de la pestaña */}
            <div className="flex-1 overflow-y-auto px-6 py-6 custom-scrollbar">
                {renderTab()}
            </div>
        </div>
    );
};

// ─── Componente principal ─────────────────────────────────────────────────────
export const PortalMedicosAdmin: React.FC = () => {
    const { professionals, loading } = useProfessionals();
    const [search,   setSearch]   = useState('');
    const [selected, setSelected] = useState<Professional | null>(null);

    const filtered = useMemo(() => {
        const q = search.toLowerCase().trim();
        if (!q) return professionals;
        return professionals.filter(p =>
            `${p.name} ${p.lastName}`.toLowerCase().includes(q) ||
            (p.nationalId || '').toLowerCase().includes(q) ||
            (p.email || '').toLowerCase().includes(q)
        );
    }, [professionals, search]);

    return (
        <div className="flex h-[calc(100vh-120px)] gap-0 rounded-3xl border border-brand-border overflow-hidden bg-brand-bg animate-in fade-in duration-500">

            {/* ── Panel izquierdo — Lista de médicos ── */}
            <div className="w-72 shrink-0 flex flex-col border-r border-brand-border bg-brand-surface/40">
                <div className="p-4 border-b border-brand-border">
                    <h2 className="text-xs font-black uppercase tracking-widest text-brand-text/60 mb-3">
                        Profesionales
                    </h2>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-brand-text/30" />
                        <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Nombre, RUT o correo..."
                            className="w-full bg-brand-bg border border-brand-border rounded-xl pl-9 pr-3 py-2 text-xs text-brand-text outline-none focus:border-brand-primary/50 focus:ring-1 focus:ring-brand-primary/20 placeholder:text-brand-text/20"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-3 space-y-1.5 custom-scrollbar">
                    {loading ? (
                        <div className="flex flex-col gap-2 mt-2">
                            {[1, 2, 3, 4, 5].map(i => (
                                <div key={i} className="h-[58px] rounded-2xl bg-brand-border/30 animate-pulse" />
                            ))}
                        </div>
                    ) : filtered.length === 0 ? (
                        <p className="text-center text-[10px] text-brand-text/30 py-8">Sin resultados.</p>
                    ) : filtered.map(prof => (
                        <ProfCard
                            key={prof.id}
                            prof={prof}
                            selected={selected?.id === prof.id}
                            onClick={() => setSelected(prof)}
                        />
                    ))}
                </div>

                <div className="px-4 py-3 border-t border-brand-border">
                    <p className="text-[10px] font-mono text-brand-text/30">
                        {filtered.length} de {professionals.length} médicos
                    </p>
                </div>
            </div>

            {/* ── Panel derecho — Portal embebido ── */}
            <div className="flex-1 min-w-0 bg-brand-bg">
                {selected
                    ? <EmbeddedPortal key={selected.id} prof={selected} />
                    : <EmptySelection />
                }
            </div>
        </div>
    );
};
