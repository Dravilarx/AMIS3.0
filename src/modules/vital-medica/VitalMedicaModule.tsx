import React, { useState, useMemo } from 'react';
import { ClipboardCheck, Loader2, AlertCircle, CheckCircle2, AlertTriangle, Filter, User } from 'lucide-react';
import { useChecklistApertura, SUPERVISORES, type ChecklistApertura } from '../../hooks/useChecklistApertura';
import { ChecklistDetalleModal } from './ChecklistDetalleModal';

const PROB_KEYS: (keyof ChecklistApertura)[] = [
    'probFaltaPersonal', 'probRetrasoAtencion', 'probInformatico',
    'probFaltaInsumos', 'probCoordinacion', 'probInstalaciones',
];

const contarProblemas = (r: ChecklistApertura) => PROB_KEYS.filter(k => r[k] === true).length;

const fmtFechaCorta = (iso: string) =>
    new Date(iso + 'T00:00:00').toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' });

// Módulo "Vital Médica": dashboard de solo lectura sobre checklist_apertura_centros
// (la tabla que ya alimenta la app standalone de checklist). Acceso restringido
// vía profiles.permissions.vital_medica (RLS ya lo refuerza en la BD).
export const VitalMedicaModule: React.FC = () => {
    const { registros, loading, error, refresh } = useChecklistApertura();

    const [detalle, setDetalle] = useState<ChecklistApertura | null>(null);
    const [desde, setDesde] = useState('');
    const [hasta, setHasta] = useState('');
    const [supervisor, setSupervisor] = useState('');

    const registrosFiltrados = useMemo(() => registros.filter(r =>
        (!desde || r.fecha >= desde) &&
        (!hasta || r.fecha <= hasta) &&
        (!supervisor || r.inspector === supervisor)
    ), [registros, desde, hasta, supervisor]);

    const limpiarFiltros = () => { setDesde(''); setHasta(''); setSupervisor(''); };
    const hayFiltros = !!(desde || hasta || supervisor);

    return (
        <div className="space-y-4 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-brand-primary to-black flex items-center justify-center shadow-lg shadow-brand-primary/20 shrink-0">
                    <ClipboardCheck className="w-5 h-5 text-white" />
                </div>
                <div>
                    <h2 className="text-xl font-black text-brand-text uppercase tracking-tighter leading-none">Vital Médica</h2>
                    <p className="text-[10px] text-brand-text/30 font-mono mt-1">Checklist de apertura de centro</p>
                </div>
            </div>

            {/* Filtros */}
            <div className="flex flex-wrap items-end gap-3 p-4 bg-brand-surface border border-brand-border rounded-2xl">
                <div className="flex items-center gap-1.5 text-brand-text/40 mb-1.5">
                    <Filter className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Filtros</span>
                </div>
                <div>
                    <label className="block text-[9px] font-black uppercase tracking-widest text-brand-text/30 mb-1">Desde</label>
                    <input type="date" value={desde} onChange={e => setDesde(e.target.value)}
                        className="bg-brand-bg border border-brand-border rounded-lg px-3 py-1.5 text-xs text-brand-text outline-none" />
                </div>
                <div>
                    <label className="block text-[9px] font-black uppercase tracking-widest text-brand-text/30 mb-1">Hasta</label>
                    <input type="date" value={hasta} onChange={e => setHasta(e.target.value)}
                        className="bg-brand-bg border border-brand-border rounded-lg px-3 py-1.5 text-xs text-brand-text outline-none" />
                </div>
                <div>
                    <label className="block text-[9px] font-black uppercase tracking-widest text-brand-text/30 mb-1">Supervisor</label>
                    <select value={supervisor} onChange={e => setSupervisor(e.target.value)}
                        className="bg-brand-bg border border-brand-border rounded-lg px-3 py-1.5 text-xs text-brand-text outline-none appearance-none min-w-[10rem]">
                        <option value="">Todos</option>
                        {SUPERVISORES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
                {hayFiltros && (
                    <button onClick={limpiarFiltros}
                        className="text-[10px] font-black uppercase text-danger hover:bg-danger/10 px-2 py-1.5 rounded-lg transition-colors">
                        Limpiar
                    </button>
                )}
                <span className="ml-auto text-[10px] text-brand-text/30 font-mono">{registrosFiltrados.length} registro{registrosFiltrados.length === 1 ? '' : 's'}</span>
            </div>

            {/* Listado */}
            {loading ? (
                <div className="flex flex-col items-center justify-center min-h-[300px] gap-4">
                    <Loader2 className="w-8 h-8 text-brand-primary animate-spin" />
                    <p className="text-brand-text/30 text-xs font-mono animate-pulse">Cargando registros...</p>
                </div>
            ) : error ? (
                <div className="card-premium border-red-500/20 bg-red-500/5 p-12 text-center">
                    <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-4" />
                    <p className="text-red-400 font-bold mb-4">{error}</p>
                    <button onClick={() => refresh()}
                        className="px-6 py-2 bg-brand-surface border border-brand-border rounded-xl text-xs font-bold uppercase text-brand-text">
                        Reintentar
                    </button>
                </div>
            ) : (
                <div className="rounded-2xl border border-brand-border overflow-hidden">
                    {registrosFiltrados.length === 0 ? (
                        <p className="px-4 py-10 text-center text-xs text-brand-text/30 uppercase font-black tracking-widest">
                            {registros.length === 0 ? 'Sin registros de checklist aún' : 'Sin resultados para estos filtros'}
                        </p>
                    ) : (
                        <table className="w-full text-left border-collapse">
                            <thead><tr className="bg-brand-surface/30 border-b border-brand-border">
                                {['Fecha', 'Sucursal', 'Supervisor', 'Llegada', 'Resultado'].map(h => (
                                    <th key={h} className="px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-brand-text/40 whitespace-nowrap">{h}</th>
                                ))}
                            </tr></thead>
                            <tbody className="divide-y divide-brand-border/30">
                                {registrosFiltrados.map(r => {
                                    const problemas = contarProblemas(r);
                                    return (
                                        <tr key={r.id} onClick={() => setDetalle(r)}
                                            className="hover:bg-brand-surface/40 transition-colors cursor-pointer">
                                            <td className="px-4 py-2.5 text-xs text-brand-text/70 whitespace-nowrap">{fmtFechaCorta(r.fecha)}</td>
                                            <td className="px-4 py-2.5 text-xs font-bold text-brand-text">{r.sucursal}</td>
                                            <td className="px-4 py-2.5 text-xs text-brand-text/70">
                                                <span className="flex items-center gap-1"><User className="w-3 h-3 text-brand-text/30" />{r.inspector}</span>
                                            </td>
                                            <td className="px-4 py-2.5 text-[10px] font-mono text-brand-text/50">{r.horaLlegada ? r.horaLlegada.slice(0, 5) : '—'}</td>
                                            <td className="px-4 py-2.5">
                                                {r.sinObservaciones ? (
                                                    <span className="flex items-center gap-1 w-fit text-[9px] font-black px-2 py-0.5 rounded-full border uppercase tracking-wider text-success bg-success/10 border-success/20">
                                                        <CheckCircle2 className="w-2.5 h-2.5" /> Sin observaciones
                                                    </span>
                                                ) : problemas > 0 ? (
                                                    <span className="flex items-center gap-1 w-fit text-[9px] font-black px-2 py-0.5 rounded-full border uppercase tracking-wider text-warning bg-warning/10 border-warning/20">
                                                        <AlertTriangle className="w-2.5 h-2.5" /> {problemas} problema{problemas === 1 ? '' : 's'}
                                                    </span>
                                                ) : (
                                                    <span className="text-[9px] font-black px-2 py-0.5 rounded-full border uppercase tracking-wider text-brand-text/40 bg-brand-border/20 border-brand-border/40">
                                                        Revisado
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            )}

            {detalle && <ChecklistDetalleModal registro={detalle} onClose={() => setDetalle(null)} />}
        </div>
    );
};
