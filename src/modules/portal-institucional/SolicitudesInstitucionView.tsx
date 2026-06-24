import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, ChevronRight, Lock, X, Inbox, UserCheck, FileText } from 'lucide-react';
import { cn } from '../../lib/utils';
import { supabase } from '../../lib/supabase';

// ─────────────────────────────────────────────────────────────────────────────
// Vista DE CARA A LA INSTITUCIÓN — privacidad crítica:
// NUNCA se expone medico_informante. Solo medico_validador.
// El medico_informante no se incluye siquiera en el select a Supabase.
// ─────────────────────────────────────────────────────────────────────────────

// Columnas que la institución PUEDE ver (sin medico_informante)
const COLUMNAS_INSTITUCION =
    'id, fecha_ingreso, tipo_solicitud, tipo_atencion, modalidad, fecha_examen, ' +
    'id_estudio, paciente, rut, detalle_solicitud, estado, medico_validador, ' +
    'resolucion, resolucion_texto, fecha_resolucion';

interface InstAddendum {
    id:               string;
    fechaIngreso?:    string;
    tipoSolicitud?:   string;
    tipoAtencion?:    string;
    modalidad?:       string;
    fechaExamen?:     string;
    idEstudio?:       string;
    paciente?:        string;
    rut?:             string;
    detalleSolicitud?: string;
    estado:           string;
    medicoValidador?: string;
    resolucion?:      string;
    resolucionTexto?: string;
    fechaResolucion?: string;
}

const mapInst = (r: any): InstAddendum => ({
    id:               r.id,
    fechaIngreso:     r.fecha_ingreso,
    tipoSolicitud:    r.tipo_solicitud,
    tipoAtencion:     r.tipo_atencion,
    modalidad:        r.modalidad,
    fechaExamen:      r.fecha_examen,
    idEstudio:        r.id_estudio,
    paciente:         r.paciente,
    rut:              r.rut,
    detalleSolicitud: r.detalle_solicitud,
    estado:           r.estado ?? 'Nueva',
    medicoValidador:  r.medico_validador,
    resolucion:       r.resolucion,
    resolucionTexto:  r.resolucion_texto,
    fechaResolucion:  r.fecha_resolucion,
});

const ESTADO_STYLE: Record<string, string> = {
    'Nueva':      'text-info    bg-info/10    border-info/20',
    'En proceso': 'text-warning bg-warning/10 border-warning/20',
    'Finalizada': 'text-success bg-success/10 border-success/20',
    'Rechazada':  'text-danger  bg-danger/10  border-danger/20',
};

const labelCls = 'text-[10px] font-black uppercase tracking-widest text-brand-text/50';
const fmtFecha = (iso?: string) =>
    iso ? new Date(iso).toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

// ─── Detalle (solo lectura, sin informante) ───────────────────────────────────
const DetalleModal: React.FC<{ item: InstAddendum; onClose: () => void }> = ({ item, onClose }) => {
    const cerrado = item.estado === 'Finalizada' || item.estado === 'Rechazada';

    const Field: React.FC<{ label: string; value?: string; sensitive?: boolean }> = ({ label, value, sensitive }) => (
        <div className="space-y-0.5">
            <p className={sensitive ? cn(labelCls, 'flex items-center gap-1 text-warning/70') : labelCls}>
                {sensitive && <Lock className="w-2.5 h-2.5" />}{label}
            </p>
            <p className="text-sm text-brand-text">{value || '—'}</p>
        </div>
    );

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <div className="bg-brand-bg border border-brand-border rounded-3xl w-full max-w-xl shadow-2xl animate-in zoom-in-95 duration-200 max-h-[92vh] flex flex-col">
                <div className="flex items-center justify-between px-6 py-4 border-b border-brand-border shrink-0">
                    <div className="flex items-center gap-3">
                        <span className={cn('text-[10px] font-black px-2.5 py-1 rounded-full border uppercase tracking-wider', ESTADO_STYLE[item.estado] ?? ESTADO_STYLE['Nueva'])}>{item.estado}</span>
                        <div>
                            <h2 className="text-base font-black text-brand-text">Solicitud · {item.idEstudio || 's/n'}</h2>
                            <p className="text-[10px] text-brand-text/40 uppercase tracking-wider">{item.tipoSolicitud || '—'}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-xl hover:bg-brand-surface text-brand-text/40 hover:text-brand-text transition-colors"><X className="w-5 h-5" /></button>
                </div>

                <div className="px-6 py-5 space-y-5 overflow-y-auto custom-scrollbar">
                    <div className="grid grid-cols-3 gap-4">
                        <Field label="Tipo atención" value={item.tipoAtencion} />
                        <Field label="Modalidad"     value={item.modalidad} />
                        <Field label="Fecha examen"  value={fmtFecha(item.fechaExamen)} />
                        <Field label="Paciente"      value={item.paciente} sensitive />
                        <Field label="RUT"           value={item.rut} sensitive />
                        <Field label="Ingreso"       value={fmtFecha(item.fechaIngreso)} />
                    </div>

                    {item.detalleSolicitud && (
                        <div className="space-y-0.5">
                            <p className={labelCls}>Detalle de la solicitud</p>
                            <p className="text-sm text-brand-text bg-brand-surface/50 border border-brand-border rounded-xl p-3 whitespace-pre-wrap">{item.detalleSolicitud}</p>
                        </div>
                    )}

                    {/* Solo médico validador — JAMÁS informante */}
                    {item.medicoValidador && (
                        <div className="flex items-center gap-2 text-sm">
                            <UserCheck className="w-4 h-4 text-brand-primary" />
                            <span className={labelCls}>Médico validador</span>
                            <span className="text-brand-text font-semibold">{item.medicoValidador}</span>
                        </div>
                    )}

                    {/* Resolución (si finalizada/rechazada) */}
                    {cerrado && (item.resolucion || item.resolucionTexto) && (
                        <div className={cn('rounded-2xl border p-4 space-y-2', item.estado === 'Rechazada' ? 'border-danger/30 bg-danger/5' : 'border-success/30 bg-success/5')}>
                            <div className="flex items-center gap-2">
                                <FileText className={cn('w-4 h-4', item.estado === 'Rechazada' ? 'text-danger' : 'text-success')} />
                                <p className="text-xs font-black uppercase tracking-wider text-brand-text">Resolución{item.resolucion ? `: ${item.resolucion}` : ''}</p>
                            </div>
                            {item.resolucionTexto && <p className="text-sm text-brand-text whitespace-pre-wrap">{item.resolucionTexto}</p>}
                            <div className="flex items-center gap-4 text-[10px] text-brand-text/50 pt-1">
                                {item.medicoValidador && <span className="flex items-center gap-1"><UserCheck className="w-3 h-3" /> {item.medicoValidador}</span>}
                                <span>{fmtFecha(item.fechaResolucion)}</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// ─── Vista principal ──────────────────────────────────────────────────────────
export const SolicitudesInstitucionView: React.FC<{ institucionId: string }> = ({ institucionId }) => {
    const [items, setItems]     = useState<InstAddendum[]>([]);
    const [loading, setLoading] = useState(true);
    const [detalle, setDetalle] = useState<InstAddendum | null>(null);

    const fetchAddendums = useCallback(async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('sol_addendum')
            .select(COLUMNAS_INSTITUCION)
            .eq('institucion_id', institucionId)
            .order('fecha_ingreso', { ascending: false });

        console.log('addendums institución:', data, 'error:', error);
        if (error) {
            console.error('[PortalInstitucional] Error cargando addendums:', error);
            setItems([]);
        } else {
            setItems((data || []).map(mapInst));
        }
        setLoading(false);
    }, [institucionId]);

    useEffect(() => { fetchAddendums(); }, [fetchAddendums]);

    if (loading) {
        return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 text-brand-primary animate-spin" /></div>;
    }

    if (items.length === 0) {
        return (
            <div className="text-center py-16 border border-dashed border-brand-border rounded-2xl">
                <Inbox className="w-12 h-12 text-brand-text/10 mx-auto mb-3" />
                <p className="text-sm text-brand-text/30">Esta institución no tiene solicitudes de addendum.</p>
            </div>
        );
    }

    return (
        <>
            <div className="rounded-2xl border border-brand-border overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-brand-surface/50 border-b border-brand-border">
                            {['Ingreso', 'Tipo solicitud', 'Paciente', 'Estado', 'Médico validador', 'Resolución', ''].map(h => (
                                <th key={h} className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-brand-text/40 whitespace-nowrap">{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-brand-border/30">
                        {items.map(item => (
                            <tr key={item.id} onClick={() => setDetalle(item)} className="border-b border-brand-border/50 hover:bg-brand-surface/30 transition-colors cursor-pointer">
                                <td className="px-4 py-3"><span className="text-[10px] font-mono text-brand-text/50">{fmtFecha(item.fechaIngreso)}</span></td>
                                <td className="px-4 py-3"><p className="text-xs text-brand-text/70 max-w-36 truncate">{item.tipoSolicitud || '—'}</p></td>
                                <td className="px-4 py-3"><span className="inline-flex items-center gap-1 text-xs text-warning/80"><Lock className="w-2.5 h-2.5" />{item.paciente || '—'}</span></td>
                                <td className="px-4 py-3"><span className={cn('text-[10px] font-black px-2 py-0.5 rounded-full border uppercase tracking-wider', ESTADO_STYLE[item.estado] ?? ESTADO_STYLE['Nueva'])}>{item.estado}</span></td>
                                <td className="px-4 py-3"><p className="text-xs text-brand-text/70">{item.medicoValidador || <span className="text-brand-text/30">—</span>}</p></td>
                                <td className="px-4 py-3"><p className="text-xs text-brand-text/60">{item.resolucion || <span className="text-brand-text/20">—</span>}</p></td>
                                <td className="px-4 py-3 text-right"><ChevronRight className="w-4 h-4 text-brand-text/30 ml-auto" /></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {detalle && <DetalleModal item={detalle} onClose={() => setDetalle(null)} />}
        </>
    );
};
