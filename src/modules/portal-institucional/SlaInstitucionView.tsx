import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, Timer, Unlink, Percent, Database, Layers } from 'lucide-react';
import { cn } from '../../lib/utils';
import { supabase } from '../../lib/supabase';

interface SlaRule {
    institucion:    string | null;
    modalidad:      string | null;
    tipo:           string;
    target_minutes: number;
}

interface MergedRule extends SlaRule {
    source: 'own' | 'global';
}

// 60→"1 h", 120→"2 h", 1440→"24 h"; si no es múltiplo de 60, deja minutos
const fmtTarget = (min: number): string => {
    if (min == null) return '—';
    if (min % 60 === 0) return `${min / 60} h`;
    return `${min} min`;
};

const TIPO_LABEL: Record<string, string> = {
    URG: 'Urgencia', HOSP: 'Hospitalizado', AMB: 'Ambulatorio',
    ONC: 'Oncológico', UTI: 'UTI / Crítico', MUT: 'Mutual',
    H: 'Hospitalizado', A: 'Ambulatorio',
};

export const SlaInstitucionView: React.FC<{ institucionId: string; nombre: string }> = ({ institucionId, nombre }) => {
    const [loading, setLoading]   = useState(true);
    const [codes, setCodes]       = useState<string[]>([]);
    const [unlinked, setUnlinked] = useState(false);
    const [rules, setRules]       = useState<MergedRule[]>([]);

    const load = useCallback(async () => {
        setLoading(true);
        setUnlinked(false);
        setRules([]);

        // 1. Traducir institución → código(s) RISPACS vía el traductor de equivalencias
        const { data: mapData, error: mapError } = await supabase
            .from('multiris_name_mapping')
            .select('raw_name')
            .eq('category', 'institucion')
            .eq('formal_id', institucionId);

        console.log('sla institución (códigos):', mapData, 'error:', mapError);

        const rispacsCodes = (mapData || []).map((r: any) => r.raw_name).filter(Boolean);
        setCodes(rispacsCodes);

        if (mapError) {
            console.error('[PortalInstitucional/SLA] Error traduciendo institución:', mapError);
            setLoading(false);
            return;
        }
        if (rispacsCodes.length === 0) {
            setUnlinked(true);
            setLoading(false);
            return;
        }

        // 2. Reglas propias (por código) + globales (institucion null)
        const [ownRes, globalRes] = await Promise.all([
            supabase.from('multiris_sla_config').select('institucion, modalidad, tipo, target_minutes').in('institucion', rispacsCodes),
            supabase.from('multiris_sla_config').select('institucion, modalidad, tipo, target_minutes').is('institucion', null),
        ]);

        console.log('sla institución:', { own: ownRes.data, global: globalRes.data }, 'error:', ownRes.error || globalRes.error);

        if (ownRes.error || globalRes.error) {
            console.error('[PortalInstitucional/SLA] Error cargando reglas:', ownRes.error || globalRes.error);
            setLoading(false);
            return;
        }

        // 3. Merge por tipo + modalidad: propia gana, global como fallback
        const key = (r: SlaRule) => `${r.tipo}||${r.modalidad ?? ''}`;
        const map = new Map<string, MergedRule>();
        for (const g of (globalRes.data || []) as SlaRule[]) map.set(key(g), { ...g, source: 'global' });
        for (const o of (ownRes.data || []) as SlaRule[])    map.set(key(o), { ...o, source: 'own' });

        const merged = Array.from(map.values()).sort((a, b) =>
            a.tipo.localeCompare(b.tipo) || (a.modalidad ?? '').localeCompare(b.modalidad ?? '')
        );
        setRules(merged);
        setLoading(false);
    }, [institucionId]);

    useEffect(() => { load(); }, [load]);

    if (loading) {
        return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 text-brand-primary animate-spin" /></div>;
    }

    // Institución sin vincular en el traductor
    if (unlinked) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center gap-4 border border-dashed border-amber-400/30 rounded-2xl bg-amber-400/5">
                <div className="w-16 h-16 rounded-3xl bg-brand-surface border border-amber-400/20 flex items-center justify-center">
                    <Unlink className="w-7 h-7 text-amber-400/70" />
                </div>
                <div className="max-w-md">
                    <p className="text-sm font-black text-amber-400/80">Institución no vinculada en el traductor</p>
                    <p className="text-xs text-brand-text/40 mt-1.5">
                        Esta institución todavía no está vinculada en el traductor (Stat Multiris → Equivalencias).
                        Vincúlala para ver su SLA.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-5">
            {/* Encabezado */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                    <Timer className="w-5 h-5 text-brand-primary" />
                    <h3 className="text-lg font-black text-brand-text">SLA de {nombre}</h3>
                </div>
                {codes.length > 0 && (
                    <span className="text-[10px] font-mono text-brand-text/30 flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5" /> {codes.join(', ')}
                    </span>
                )}
            </div>

            {/* Tabla de reglas */}
            {rules.length === 0 ? (
                <div className="text-center py-14 border border-dashed border-brand-border rounded-2xl">
                    <Timer className="w-12 h-12 text-brand-text/10 mx-auto mb-3" />
                    <p className="text-sm text-brand-text/30">No hay reglas de SLA pactadas (ni propias ni globales).</p>
                </div>
            ) : (
                <div className="rounded-2xl border border-brand-border overflow-hidden">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-brand-surface/50 border-b border-brand-border">
                                {['Tipo', 'Modalidad', 'Objetivo', 'Origen'].map(h => (
                                    <th key={h} className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-brand-text/40 whitespace-nowrap">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-brand-border/30">
                            {rules.map((r, i) => (
                                <tr key={i} className="border-b border-brand-border/50 hover:bg-brand-surface/30 transition-colors">
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-black text-brand-text font-mono">{r.tipo}</span>
                                            {TIPO_LABEL[r.tipo] && <span className="text-[10px] text-brand-text/40">{TIPO_LABEL[r.tipo]}</span>}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={cn('text-xs', r.modalidad ? 'text-brand-text/70' : 'text-brand-text/35 italic')}>
                                            {r.modalidad || 'Todas'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className="text-sm font-black text-brand-primary">{fmtTarget(r.target_minutes)}</span>
                                    </td>
                                    <td className="px-4 py-3">
                                        {r.source === 'global' ? (
                                            <span className="text-[9px] font-bold uppercase tracking-wider text-brand-text/30 bg-brand-border/20 border border-brand-border/40 px-2 py-0.5 rounded-full">global</span>
                                        ) : (
                                            <span className="text-[9px] font-bold uppercase tracking-wider text-success/70 bg-success/10 border border-success/20 px-2 py-0.5 rounded-full">propia</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Cumplimiento (%) — placeholder honesto */}
            <div className="flex items-start gap-4 p-5 rounded-2xl border border-brand-border bg-brand-surface/40">
                <div className="w-12 h-12 rounded-2xl bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center shrink-0">
                    <Percent className="w-5 h-5 text-brand-primary/70" />
                </div>
                <div className="flex-1">
                    <p className="text-sm font-black text-brand-text">Cumplimiento (%)</p>
                    <p className="text-xs text-brand-text/40 mt-1 flex items-center gap-1.5">
                        <Database className="w-3.5 h-3.5 text-brand-text/30" />
                        Se calculará con los datos de producción de MultiRis.
                    </p>
                    <p className="text-[10px] text-brand-text/25 mt-1.5">
                        Por ahora esta vista muestra solo las reglas pactadas; el porcentaje real es una fase posterior.
                    </p>
                </div>
            </div>
        </div>
    );
};
