import React, { useState, useEffect, useMemo } from 'react';
import { Building2, Inbox, BookOpen, Timer, ChevronDown, Eye } from 'lucide-react';
import { cn } from '../../lib/utils';
import { supabase } from '../../lib/supabase';
import { ProtocolosDashboard } from '../protocolos/ProtocolosDashboard';
import { SolicitudesInstitucionView } from './SolicitudesInstitucionView';
import { SlaInstitucionView } from './SlaInstitucionView';

interface Institucion {
    id:        string;
    legalName: string;
}

type PortalTab = 'solicitudes' | 'protocolos' | 'sla';

const TABS: { id: PortalTab; label: string; icon: React.ElementType }[] = [
    { id: 'solicitudes', label: 'Solicitudes',      icon: Inbox    },
    { id: 'protocolos',  label: 'Protocolos',       icon: BookOpen },
    { id: 'sla',         label: 'Cumplimiento SLA', icon: Timer    },
];

// ─── Componente principal ─────────────────────────────────────────────────────
export const PortalInstitucionalAdmin: React.FC = () => {
    const [instituciones, setInstituciones] = useState<Institucion[]>([]);
    const [selectedId, setSelectedId]       = useState('');
    const [activeTab, setActiveTab]         = useState<PortalTab>('solicitudes');

    // Lectura de la maestra institutions (mismo patrón que Solicitudes)
    useEffect(() => {
        const load = async () => {
            const { data, error } = await supabase
                .from('institutions')
                .select('id, legal_name')
                .order('legal_name');
            console.log('instituciones (portal):', data, 'error:', error);
            if (error) {
                console.error('[PortalInstitucional] Error cargando instituciones:', error);
            } else {
                setInstituciones((data || []).map((r: any) => ({ id: r.id, legalName: r.legal_name })));
            }
        };
        load();
    }, []);

    const selected = useMemo(() => instituciones.find(i => i.id === selectedId) ?? null, [instituciones, selectedId]);

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-black text-brand-text">Portal Institucional</h2>
                <p className="text-brand-text/40 text-sm flex items-center gap-1.5">
                    <Eye className="w-3.5 h-3.5" /> Vista admin — ver el portal tal como lo verá la institución
                </p>
            </div>

            {/* Selector de institución */}
            <div className="flex items-center gap-3 p-4 rounded-2xl border border-brand-border bg-brand-surface/40">
                <Building2 className="w-5 h-5 text-brand-primary shrink-0" />
                <div className="flex-1 max-w-md relative">
                    <select
                        value={selectedId}
                        onChange={e => setSelectedId(e.target.value)}
                        className="w-full appearance-none bg-brand-surface border border-brand-border rounded-xl pl-3 pr-10 py-2.5 text-sm font-semibold text-brand-text outline-none focus:border-brand-primary/50 focus:ring-1 focus:ring-brand-primary/20"
                    >
                        <option value="">Seleccionar institución...</option>
                        {instituciones.map(i => <option key={i.id} value={i.id}>{i.legalName}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-text/40 pointer-events-none" />
                </div>
                {selected && (
                    <span className="text-[10px] font-black uppercase tracking-widest text-brand-primary/70 flex items-center gap-1.5">
                        <Eye className="w-3.5 h-3.5" /> Viendo como {selected.legalName}
                    </span>
                )}
            </div>

            {/* Sin institución → invitación */}
            {!selected ? (
                <div className="flex flex-col items-center justify-center py-24 text-center gap-4 border border-dashed border-brand-border rounded-2xl">
                    <div className="w-20 h-20 rounded-3xl bg-brand-surface border border-brand-border flex items-center justify-center">
                        <Building2 className="w-8 h-8 text-brand-text/20" />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-brand-text/40">Selecciona una institución</p>
                        <p className="text-xs text-brand-text/20 mt-1">elige una arriba para ver su portal institucional</p>
                    </div>
                </div>
            ) : (
                <>
                    {/* Pestañas */}
                    <div className="flex gap-1 border-b border-brand-border pb-px">
                        {TABS.map(tab => {
                            const Icon = tab.icon; const active = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={cn(
                                        'flex items-center gap-1.5 px-4 py-2.5 rounded-t-xl text-xs font-bold uppercase tracking-wider border-b-2 -mb-px transition-all',
                                        active ? 'border-brand-primary text-brand-text bg-brand-surface' : 'border-transparent text-brand-text/40'
                                    )}
                                >
                                    <Icon className={cn('w-3.5 h-3.5', active ? 'text-brand-primary' : 'text-brand-text/30')} />
                                    {tab.label}
                                </button>
                            );
                        })}
                    </div>

                    {/* Contenido */}
                    {activeTab === 'solicitudes' && (
                        <SolicitudesInstitucionView key={selected.id} institucionId={selected.id} />
                    )}
                    {activeTab === 'protocolos' && (
                        // Protocolos son comunes a todas las instituciones — se reutiliza tal cual
                        <ProtocolosDashboard />
                    )}
                    {activeTab === 'sla' && (
                        <SlaInstitucionView key={selected.id} institucionId={selected.id} nombre={selected.legalName} />
                    )}
                </>
            )}
        </div>
    );
};
