import React, { useState, useMemo } from 'react';
import { History, Loader2, User, ChevronRight } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface TurnoHistRow {
    id:          string;
    fecha:       string;
    tipoTurno:   string;
    horaInicio?: string;
    horaFin?:    string;
    createdBy?:  string;
    recibidos?:  number;
    entregados?: number;
    estado?:     string;
}

const fmtFecha = (iso?: string) =>
    iso ? new Date(iso + (iso.length === 10 ? 'T00:00:00' : '')).toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

type ColumnaOrden = 'fecha' | 'tecnologo';
type Direccion = 'asc' | 'desc';

// Historial de turnos con tecnólogo (cruce created_by → profiles).
// Las filas son clicables → abren la vista de detalle del turno.
export const HistorialTurnos: React.FC<{
    turnos: TurnoHistRow[];
    loading: boolean;
    resolveTecnologo: (id?: string) => string;
    onOpen: (id: string) => void;
}> = ({ turnos, loading, resolveTecnologo, onOpen }) => {
    // Por defecto: fecha descendente, igual al orden que ya trae la BD.
    const [orden, setOrden] = useState<{ columna: ColumnaOrden; direccion: Direccion }>({ columna: 'fecha', direccion: 'desc' });

    const toggleOrden = (columna: ColumnaOrden) => {
        setOrden(prev => prev.columna === columna
            ? { columna, direccion: prev.direccion === 'asc' ? 'desc' : 'asc' }
            : { columna, direccion: 'desc' });
    };

    const turnosOrdenados = useMemo(() => {
        const signo = orden.direccion === 'asc' ? 1 : -1;
        const copia = [...turnos];
        copia.sort((a, b) => {
            if (orden.columna === 'fecha') {
                return signo * (new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
            }
            return signo * resolveTecnologo(a.createdBy).localeCompare(resolveTecnologo(b.createdBy), 'es');
        });
        return copia;
    }, [turnos, orden, resolveTecnologo]);

    const FlechaOrden = ({ columna }: { columna: ColumnaOrden }) =>
        orden.columna === columna ? <span className="ml-1">{orden.direccion === 'asc' ? '▲' : '▼'}</span> : null;

    return (
    <div className="rounded-2xl border border-brand-border overflow-hidden">
        <div className="px-4 py-3 border-b border-brand-border bg-brand-surface/50 flex items-center gap-2">
            <History className="w-4 h-4 text-brand-primary" />
            <h3 className="text-xs font-black uppercase tracking-wide text-brand-text">Historial de turnos</h3>
        </div>
        {loading ? (
            <div className="flex items-center justify-center py-10"><Loader2 className="w-6 h-6 text-brand-primary animate-spin" /></div>
        ) : turnos.length === 0 ? (
            <p className="px-4 py-8 text-center text-xs text-brand-text/30">Sin turnos registrados.</p>
        ) : (
            <table className="w-full text-left border-collapse">
                <thead><tr className="bg-brand-surface/30 border-b border-brand-border">
                    <th onClick={() => toggleOrden('fecha')}
                        className="px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-brand-text/40 whitespace-nowrap cursor-pointer select-none hover:text-brand-text/70 transition-colors">
                        Fecha<FlechaOrden columna="fecha" />
                    </th>
                    {['Tipo', 'Horario'].map(h => (
                        <th key={h} className="px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-brand-text/40 whitespace-nowrap">{h}</th>
                    ))}
                    <th onClick={() => toggleOrden('tecnologo')}
                        className="px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-brand-text/40 whitespace-nowrap cursor-pointer select-none hover:text-brand-text/70 transition-colors">
                        Tecnólogo<FlechaOrden columna="tecnologo" />
                    </th>
                    {['Recibidos', 'Entregados', 'Estado', ''].map(h => (
                        <th key={h} className="px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-brand-text/40 whitespace-nowrap">{h}</th>
                    ))}
                </tr></thead>
                <tbody className="divide-y divide-brand-border/30">
                    {turnosOrdenados.map(t => (
                        <tr key={t.id} onClick={() => onOpen(t.id)}
                            className="hover:bg-brand-surface/40 transition-colors cursor-pointer group">
                            <td className="px-4 py-2.5 text-xs text-brand-text/70 whitespace-nowrap">{fmtFecha(t.fecha)}</td>
                            <td className="px-4 py-2.5 text-xs font-bold text-brand-text">{t.tipoTurno}</td>
                            <td className="px-4 py-2.5 text-[10px] font-mono text-brand-text/50">{t.horaInicio ?? '?'}–{t.horaFin ?? '?'}</td>
                            <td className="px-4 py-2.5 text-xs text-brand-text/70"><span className="flex items-center gap-1"><User className="w-3 h-3 text-brand-text/30" />{resolveTecnologo(t.createdBy)}</span></td>
                            <td className="px-4 py-2.5 text-xs text-brand-text/70">{t.recibidos ?? '—'}</td>
                            <td className="px-4 py-2.5 text-xs text-brand-text/70">{t.entregados ?? '—'}</td>
                            <td className="px-4 py-2.5">
                                <span className={cn('text-[9px] font-black px-2 py-0.5 rounded-full border uppercase tracking-wider', (t.estado ?? 'abierto') === 'cerrado' ? 'text-brand-text/50 bg-brand-border/20 border-brand-border/40' : 'text-success bg-success/10 border-success/20')}>
                                    {(t.estado ?? 'abierto') === 'cerrado' ? 'Cerrado' : 'Abierto'}
                                </span>
                            </td>
                            <td className="px-4 py-2.5 text-right"><ChevronRight className="w-4 h-4 text-brand-text/20 group-hover:text-brand-primary transition-colors ml-auto" /></td>
                        </tr>
                    ))}
                </tbody>
            </table>
        )}
    </div>
    );
};
