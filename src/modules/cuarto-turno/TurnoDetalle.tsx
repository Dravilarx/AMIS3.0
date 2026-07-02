import React, { useState, useEffect } from 'react';
import {
    ArrowLeft, Loader2, User, Clock, CheckCircle2, XCircle, Lock,
    AlertTriangle, Timer, ShieldAlert, Wrench,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';

// ─────────────────────────────────────────────────────────────────────────────
// Detalle de turno (página completa, solo lectura).
// Privacidad de paciente/rut (ct_casos_criticos): el control es a nivel de
// CONSULTA según el rol del usuario. Si NO es jefatura, esos campos NO se
// seleccionan (no salen del servidor), no solo se ocultan en el render.
// ─────────────────────────────────────────────────────────────────────────────

const SEVERIDAD_STYLE: Record<string, string> = {
    'Baja':    'text-brand-text/60 bg-brand-border/20 border-brand-border/40',
    'Media':   'text-info    bg-info/10    border-info/20',
    'Alta':    'text-warning bg-warning/10 border-warning/20',
    'Crítica': 'text-danger  bg-danger/10  border-danger/20',
};

const fmtFecha = (iso?: string) =>
    iso ? new Date(iso + (iso.length === 10 ? 'T00:00:00' : '')).toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

const SevBadge: React.FC<{ sev?: string }> = ({ sev }) => sev ? (
    <span className={cn('text-[9px] font-black px-2 py-0.5 rounded-full border uppercase tracking-wider', SEVERIDAD_STYLE[sev] ?? 'text-brand-text/50 border-brand-border')}>{sev}</span>
) : <span className="text-brand-text/30">—</span>;

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
    <div className="space-y-0.5">
        <p className="text-[9px] font-black uppercase tracking-widest text-brand-text/40">{label}</p>
        <p className="text-sm text-brand-text">{children}</p>
    </div>
);

const Section: React.FC<{ title: string; icon: React.ElementType; count: number; children: React.ReactNode }> =
    ({ title, icon: Icon, count, children }) => (
        <div className="rounded-2xl border border-brand-border overflow-hidden">
            <div className="px-4 py-3 border-b border-brand-border bg-brand-surface/50 flex items-center gap-2">
                <Icon className="w-4 h-4 text-brand-primary" />
                <h3 className="text-xs font-black uppercase tracking-wide text-brand-text">{title}</h3>
                <span className="text-[10px] font-mono text-brand-text/30">{count}</span>
            </div>
            {children}
        </div>
    );

const Empty: React.FC = () => <p className="px-4 py-6 text-center text-xs text-brand-text/30">Sin incidencias en este turno.</p>;

const th = 'px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-brand-text/40 whitespace-nowrap';
const td = 'px-4 py-2.5 text-xs text-brand-text/70 align-top';

// Bloque de texto libre completo (detalle, acción tomada, etc.), en su propia
// línea debajo de la fila: sin truncar, con wrap, altura libre según contenido.
const DetalleBlock: React.FC<{ label: string; texto?: string | null }> = ({ label, texto }) =>
    !texto ? null : (
        <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-brand-text/30 mb-0.5">{label}</p>
            <p className="text-xs text-brand-text/80 whitespace-pre-wrap break-words leading-relaxed">{texto}</p>
        </div>
    );

const DetalleRow: React.FC<{ colSpan: number; children: React.ReactNode }> = ({ colSpan, children }) => (
    <tr className="bg-brand-surface/10">
        <td colSpan={colSpan} className="px-4 pb-3 pt-0 space-y-2">{children}</td>
    </tr>
);

export const TurnoDetalle: React.FC<{ turnoId: string; onVolver: () => void }> = ({ turnoId, onVolver }) => {
    const { user } = useAuth();

    // Criterio de jefatura/dirección (mismo que el bot): role o clinical_role.
    const esJefatura =
        ['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(user?.role ?? '') ||
        user?.clinical_role === 'MED_CHIEF';

    const [loading, setLoading]   = useState(true);
    const [turno, setTurno]       = useState<any | null>(null);
    const [tecnologo, setTecnologo] = useState<string>('—');
    const [personal, setPersonal] = useState<any[]>([]);
    const [sla, setSla]           = useState<any[]>([]);
    const [casos, setCasos]       = useState<any[]>([]);
    const [tecnicas, setTecnicas] = useState<any[]>([]);

    useEffect(() => {
        let cancel = false;
        (async () => {
            setLoading(true);

            // 1. Turno por id
            const { data: t } = await supabase.from('ct_turnos').select('*').eq('id', turnoId).maybeSingle();

            // 2. Tecnólogo (created_by → profiles_publicos, sin rut/email)
            let tecno = '—';
            if (t?.created_by) {
                const { data: p } = await supabase.from('profiles_publicos').select('full_name').eq('id', t.created_by).maybeSingle();
                tecno = p?.full_name || '—';
            }

            // 3. Incidencias por id_turno.
            //    ct_casos_criticos: SELECT distinto según rol (privacidad a nivel de consulta).
            const casosCols = esJefatura
                ? '*'
                : 'id, id_turno, fecha, institucion, modalidad, id_estudio, fuera_plazo, minutos_retraso, medico_responsable, severidad, detalle, created_by, created_at';

            const [perRes, slaRes, casosRes, tecRes] = await Promise.all([
                supabase.from('ct_incid_personal').select('*').eq('id_turno', turnoId).order('fecha', { ascending: false }),
                supabase.from('ct_incid_sla').select('*').eq('id_turno', turnoId).order('fecha', { ascending: false }),
                supabase.from('ct_casos_criticos').select(casosCols).eq('id_turno', turnoId).order('fecha', { ascending: false }),
                supabase.from('ct_incid_tecnicas').select('*').eq('id_turno', turnoId).order('fecha', { ascending: false }),
            ]);

            console.log('detalle turno:', { t, perRes, slaRes, casosRes, tecRes });

            if (cancel) return;
            setTurno(t ?? null);
            setTecnologo(tecno);
            setPersonal(perRes.data ?? []);
            setSla(slaRes.data ?? []);
            setCasos((casosRes.data as any[]) ?? []);
            setTecnicas(tecRes.data ?? []);
            setLoading(false);
        })();
        return () => { cancel = true; };
    }, [turnoId, esJefatura]);

    const cerrado = (turno?.estado ?? 'abierto') === 'cerrado';

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Barra superior */}
            <button onClick={onVolver}
                className="flex items-center gap-2 px-4 py-2 rounded-xl border border-brand-border text-brand-text/60 text-[10px] font-black uppercase tracking-wider hover:text-brand-text hover:border-brand-primary/30 transition-all">
                <ArrowLeft className="w-4 h-4" /> Volver
            </button>

            {loading ? (
                <div className="flex items-center justify-center py-24"><Loader2 className="w-8 h-8 text-brand-primary animate-spin" /></div>
            ) : !turno ? (
                <div className="text-center py-16 border border-dashed border-brand-border rounded-2xl">
                    <p className="text-sm text-brand-text/40">No se encontró el turno.</p>
                </div>
            ) : (
                <>
                    {/* Encabezado del turno */}
                    <div className="rounded-3xl border border-brand-border bg-brand-surface/40 p-6 space-y-5">
                        <div className="flex flex-wrap items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-2xl flex items-center justify-center border bg-brand-primary/10 border-brand-primary/20 text-brand-primary">
                                    <Clock className="w-6 h-6" />
                                </div>
                                <div>
                                    <h1 className="text-xl font-black text-brand-text">Turno {turno.tipo_turno}</h1>
                                    <p className="text-xs text-brand-text/50 mt-0.5">{fmtFecha(turno.fecha)} · {turno.hora_inicio ?? '?'}–{turno.hora_fin ?? '?'}</p>
                                    <p className="text-[10px] text-brand-text/40 flex items-center gap-1 mt-0.5"><User className="w-3 h-3" /> Tecnólogo: {tecnologo}</p>
                                </div>
                            </div>
                            <span className={cn('text-[10px] font-black px-2.5 py-1 rounded-full border uppercase tracking-wider', cerrado ? 'text-brand-text/50 bg-brand-border/20 border-brand-border/40' : 'text-success bg-success/10 border-success/20')}>
                                {cerrado ? 'Cerrado' : 'Abierto'}
                            </span>
                        </div>

                        {/* Contadores */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2 border-t border-brand-border">
                            <Field label="Recibidos">{turno.recibidos ?? '—'}{turno.recibidos_fueraplazo != null ? <span className="text-warning text-xs"> · {turno.recibidos_fueraplazo} f/plazo</span> : ''}</Field>
                            <Field label="Entregados">{turno.entregados ?? '—'}{turno.entregados_fueraplazo != null ? <span className="text-warning text-xs"> · {turno.entregados_fueraplazo} f/plazo</span> : ''}</Field>
                            <Field label="Estabilizado">
                                {turno.estabilizado
                                    ? <span className="inline-flex items-center gap-1 text-success"><CheckCircle2 className="w-3.5 h-3.5" /> Sí{turno.hora_estabilizacion ? ` · ${turno.hora_estabilizacion}` : ''}</span>
                                    : <span className="inline-flex items-center gap-1 text-brand-text/40"><XCircle className="w-3.5 h-3.5" /> No</span>}
                            </Field>
                            <Field label="Apoyo médico extra">{turno.apoyo_medico_extra ? 'Sí' : 'No'}</Field>
                        </div>
                        {turno.observaciones && (
                            <div className="pt-2 border-t border-brand-border">
                                <p className="text-[9px] font-black uppercase tracking-widest text-brand-text/40 mb-1">Observaciones</p>
                                <p className="text-sm text-brand-text/80 whitespace-pre-wrap">{turno.observaciones}</p>
                            </div>
                        )}
                    </div>

                    {/* PERSONAL */}
                    <Section title="Incidencias de Personal" icon={AlertTriangle} count={personal.length}>
                        {personal.length === 0 ? <Empty /> : (
                            <table className="w-full text-left border-collapse table-fixed">
                                <thead><tr className="bg-brand-surface/30 border-b border-brand-border">{['Tipo', 'Médico', 'Bloque', 'Causa', 'Min. atraso', 'Severidad'].map(h => <th key={h} className={th}>{h}</th>)}</tr></thead>
                                <tbody className="divide-y divide-brand-border/30">
                                    {personal.map(i => (
                                        <React.Fragment key={i.id}>
                                            <tr className="hover:bg-brand-surface/20">
                                                <td className={cn(td, 'break-words')}>{i.tipo_incidencia || '—'}</td>
                                                <td className={cn(td, 'break-words')}>{i.medico || '—'}</td>
                                                <td className={cn(td, 'break-words')}>{i.bloque_horario || '—'}</td>
                                                <td className={cn(td, 'break-words')}>{i.causa || '—'}</td>
                                                <td className={td}>{i.minutos_atraso ?? '—'}</td>
                                                <td className={td}><SevBadge sev={i.severidad} /></td>
                                            </tr>
                                            {i.detalle && (
                                                <DetalleRow colSpan={6}>
                                                    <DetalleBlock label="Detalle" texto={i.detalle} />
                                                </DetalleRow>
                                            )}
                                        </React.Fragment>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </Section>

                    {/* SLA */}
                    <Section title="Desviaciones SLA" icon={Timer} count={sla.length}>
                        {sla.length === 0 ? <Empty /> : (
                            <table className="w-full text-left border-collapse table-fixed">
                                <thead><tr className="bg-brand-surface/30 border-b border-brand-border">{['Tipo', 'Médico', 'Modalidad', 'Min. exceso', 'Severidad'].map(h => <th key={h} className={th}>{h}</th>)}</tr></thead>
                                <tbody className="divide-y divide-brand-border/30">
                                    {sla.map(i => (
                                        <React.Fragment key={i.id}>
                                            <tr className="hover:bg-brand-surface/20">
                                                <td className={cn(td, 'break-words')}>{i.tipo_desviacion || '—'}</td>
                                                <td className={cn(td, 'break-words')}>{i.medico || '—'}</td>
                                                <td className={cn(td, 'break-words')}>{i.modalidad || '—'}</td>
                                                <td className={td}>{i.minutos_exceso ?? '—'}</td>
                                                <td className={td}><SevBadge sev={i.severidad} /></td>
                                            </tr>
                                            {i.detalle && (
                                                <DetalleRow colSpan={5}>
                                                    <DetalleBlock label="Detalle" texto={i.detalle} />
                                                </DetalleRow>
                                            )}
                                        </React.Fragment>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </Section>

                    {/* INCIDENTE GRAVE DEL TURNO (antes "Casos Críticos") — paciente/rut solo si jefatura (controlado en el SELECT) */}
                    <Section title="Incidente grave del turno" icon={ShieldAlert} count={casos.length}>
                        {!esJefatura && (
                            <div className="flex items-center gap-2 px-4 py-2 bg-warning/5 border-b border-warning/20">
                                <Lock className="w-3.5 h-3.5 text-warning/70 shrink-0" />
                                <p className="text-[9px] font-bold uppercase tracking-wider text-warning/60">Datos de paciente (nombre/RUT) protegidos por rol — no se solicitan al servidor</p>
                            </div>
                        )}
                        {casos.length === 0 ? <Empty /> : (
                            <table className="w-full text-left border-collapse table-fixed">
                                <thead><tr className="bg-brand-surface/30 border-b border-brand-border">
                                    {(esJefatura
                                        ? ['Institución', 'N° Acceso', 'Severidad', 'Paciente', 'RUT', 'Modalidad', 'Fuera plazo', 'Min. retraso', 'Médico resp.']
                                        : ['Institución', 'N° Acceso', 'Severidad', 'Modalidad', 'Fuera plazo', 'Min. retraso', 'Médico resp.']
                                    ).map(h => <th key={h} className={th}>{h}</th>)}
                                </tr></thead>
                                <tbody className="divide-y divide-brand-border/30">
                                    {casos.map(i => (
                                        <React.Fragment key={i.id}>
                                            <tr className="hover:bg-brand-surface/20">
                                                <td className={cn(td, 'break-words')}>{i.institucion || '—'}</td>
                                                <td className={cn(td, 'break-words')}>{i.id_estudio || '—'}</td>
                                                <td className={td}><SevBadge sev={i.severidad} /></td>
                                                {esJefatura && <td className={cn(td, 'text-warning/80 break-words')}><span className="inline-flex items-center gap-1"><Lock className="w-2.5 h-2.5 shrink-0" />{i.paciente || '—'}</span></td>}
                                                {esJefatura && <td className={cn(td, 'text-warning/80 break-words')}>{i.rut || '—'}</td>}
                                                <td className={cn(td, 'break-words')}>{i.modalidad || '—'}</td>
                                                <td className={td}>{i.fuera_plazo ? <span className="text-danger font-bold">Sí</span> : 'No'}</td>
                                                <td className={td}>{i.minutos_retraso ?? '—'}</td>
                                                <td className={cn(td, 'break-words')}>{i.medico_responsable || '—'}</td>
                                            </tr>
                                            {i.detalle && (
                                                <DetalleRow colSpan={esJefatura ? 9 : 7}>
                                                    <DetalleBlock label="Detalle" texto={i.detalle} />
                                                </DetalleRow>
                                            )}
                                        </React.Fragment>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </Section>

                    {/* TÉCNICAS */}
                    <Section title="Incidencias Técnicas" icon={Wrench} count={tecnicas.length}>
                        {tecnicas.length === 0 ? <Empty /> : (
                            <table className="w-full text-left border-collapse table-fixed">
                                <thead><tr className="bg-brand-surface/30 border-b border-brand-border">{['Categoría', 'Centro', 'Sistema', 'Estado', 'Severidad'].map(h => <th key={h} className={th}>{h}</th>)}</tr></thead>
                                <tbody className="divide-y divide-brand-border/30">
                                    {tecnicas.map(i => (
                                        <React.Fragment key={i.id}>
                                            <tr className="hover:bg-brand-surface/20">
                                                <td className={cn(td, 'break-words')}>{i.categoria_tecnica || '—'}</td>
                                                <td className={cn(td, 'break-words')}>{i.centro_afectado || '—'}</td>
                                                <td className={cn(td, 'break-words')}>{i.sistema || '—'}</td>
                                                <td className={cn(td, 'break-words')}>{i.estado || '—'}</td>
                                                <td className={td}><SevBadge sev={i.severidad} /></td>
                                            </tr>
                                            {(i.detalle || i.accion_tomada) && (
                                                <DetalleRow colSpan={5}>
                                                    <DetalleBlock label="Detalle" texto={i.detalle} />
                                                    <DetalleBlock label="Acción tomada" texto={i.accion_tomada} />
                                                </DetalleRow>
                                            )}
                                        </React.Fragment>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </Section>
                </>
            )}
        </div>
    );
};
