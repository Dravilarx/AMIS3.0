import React, { useState } from 'react';
import { X, ClipboardCheck, Check, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { PISOS, type ChecklistApertura, type RespuestaChecklist } from '../../hooks/useChecklistApertura';

const fmtFecha = (iso: string) =>
    new Date(iso + 'T00:00:00').toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' });

const RespuestaBadge: React.FC<{ valor: RespuestaChecklist }> = ({ valor }) => {
    if (valor === 'si') return (
        <span className="flex items-center gap-1 text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-success/10 text-success border border-success/20">
            <Check className="w-3 h-3" /> Sí
        </span>
    );
    if (valor === 'no') return (
        <span className="flex items-center gap-1 text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-danger/10 text-danger border border-danger/20">
            <X className="w-3 h-3" /> No
        </span>
    );
    if (valor === 'no_aplica') return (
        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-brand-border/20 text-brand-text/40 border border-brand-border/40">N/A</span>
    );
    return <span className="text-[10px] text-brand-text/20">—</span>;
};

interface Pregunta { label: string; valores: RespuestaChecklist[] }
interface SeccionPiso { titulo: string; preguntas: Pregunta[]; obs: string[]; obsLabel: string }

const seccionesPorPiso = (r: ChecklistApertura): SeccionPiso[] => [
    {
        titulo: 'Inicio de jornada',
        preguntas: [
            { label: 'Equipo presente', valores: r.equipoPresente },
            { label: 'Recepción preparada', valores: r.recepcionPreparada },
            { label: 'Computadores operativos', valores: r.computadoresOperativos },
            { label: 'Caja habilitada', valores: r.cajaHabilitada },
            { label: 'Atención en hora programada', valores: r.atencionHoraProgramada },
        ],
        obs: r.motivoDemora,
        obsLabel: 'Motivo de demora',
    },
    {
        titulo: 'Presentación del equipo',
        preguntas: [
            { label: 'Uniforme institucional', valores: r.uniformeInstitucional },
            { label: 'Credencial visible', valores: r.credencialVisible },
            { label: 'Presentación personal', valores: r.presentacionPersonal },
        ],
        obs: r.obsPresentacion,
        obsLabel: 'Observación',
    },
    {
        titulo: 'Estado del centro',
        preguntas: [
            { label: 'Recepción ordenada', valores: r.recepcionOrdenada },
            { label: 'Sala de espera limpia', valores: r.salaEsperaLimpia },
            { label: 'Box preparados', valores: r.boxPreparados },
            { label: 'Señalética visible', valores: r.senaleticaVisible },
            { label: 'Espacios libres', valores: r.espaciosLibres },
        ],
        obs: r.obsEstado,
        obsLabel: 'Observación',
    },
    {
        titulo: 'Atención al paciente',
        preguntas: [
            { label: 'Primer paciente oportuno', valores: r.primerPacienteOportuno },
            { label: 'Trato cordial', valores: r.tratoCordial },
            { label: 'Orientación entregada', valores: r.orientacionEntregada },
        ],
        obs: r.obsAtencion,
        obsLabel: 'Observación',
    },
];

const PROBLEMAS_GLOBALES: { key: keyof ChecklistApertura; label: string }[] = [
    { key: 'probFaltaPersonal', label: 'Falta de personal' },
    { key: 'probRetrasoAtencion', label: 'Retraso en atención' },
    { key: 'probInformatico', label: 'Problema informático' },
    { key: 'probFaltaInsumos', label: 'Falta de insumos' },
    { key: 'probCoordinacion', label: 'Problema de coordinación' },
    { key: 'probInstalaciones', label: 'Problema de instalaciones' },
];

const CampoGlobal: React.FC<{ label: string; valor: string | null }> = ({ label, valor }) => (
    <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-brand-text/30 mb-1">{label}</p>
        <p className="text-xs text-brand-text/70 whitespace-pre-wrap">{valor?.trim() ? valor : '—'}</p>
    </div>
);

// Detalle de un registro de checklist de apertura: 5 pisos en pestañas (cada
// uno con sus 4 secciones + observaciones), más la sección 5 (funcionamiento
// general, global) y los campos globales de cierre.
export const ChecklistDetalleModal: React.FC<{ registro: ChecklistApertura; onClose: () => void }> = ({ registro, onClose }) => {
    const [pisoActivo, setPisoActivo] = useState(0);
    const secciones = seccionesPorPiso(registro);

    const problemasMarcados = PROBLEMAS_GLOBALES.filter(p => registro[p.key] === true);

    return (
        <div className="fixed inset-0 z-[210] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
            <div className="w-full max-w-3xl max-h-[90vh] bg-brand-surface border border-brand-border rounded-3xl shadow-2xl overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-brand-border shrink-0">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-brand-primary/10 flex items-center justify-center shrink-0">
                            <ClipboardCheck className="w-4.5 h-4.5 text-brand-primary" />
                        </div>
                        <div className="min-w-0">
                            <h3 className="text-sm font-black text-brand-text uppercase tracking-tight">{fmtFecha(registro.fecha)}</h3>
                            <p className="text-[10px] text-brand-text/40 truncate">
                                {registro.sucursal} · {registro.inspector}{registro.horaLlegada ? ` · llegó ${registro.horaLlegada.slice(0, 5)}` : ''}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-xl hover:bg-brand-bg text-brand-text/30 hover:text-brand-text transition-colors shrink-0">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Pestañas por piso */}
                    <div className="flex items-center gap-2 flex-wrap">
                        {PISOS.map((piso, i) => (
                            <button
                                key={piso}
                                onClick={() => setPisoActivo(i)}
                                className={cn(
                                    'px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all',
                                    pisoActivo === i ? 'bg-brand-primary text-white' : 'bg-brand-bg text-brand-text/40 hover:text-brand-text'
                                )}
                            >
                                {piso}
                            </button>
                        ))}
                    </div>

                    {/* Secciones del piso activo */}
                    <div className="space-y-5">
                        {secciones.map(sec => (
                            <div key={sec.titulo} className="p-4 bg-brand-bg/50 border border-brand-border rounded-2xl space-y-2.5">
                                <p className="text-[10px] font-black uppercase tracking-widest text-brand-text/40">{sec.titulo}</p>
                                {sec.preguntas.map(p => (
                                    <div key={p.label} className="flex items-center justify-between gap-3">
                                        <span className="text-xs text-brand-text/70">{p.label}</span>
                                        <RespuestaBadge valor={p.valores[pisoActivo]} />
                                    </div>
                                ))}
                                {sec.obs[pisoActivo]?.trim() && (
                                    <div className="pt-2 mt-2 border-t border-brand-border/50">
                                        <p className="text-[9px] font-black uppercase tracking-widest text-brand-text/30 mb-0.5">{sec.obsLabel}</p>
                                        <p className="text-xs text-brand-text/60 italic">"{sec.obs[pisoActivo]}"</p>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Sección 5 — Funcionamiento general (global) */}
                    <div className="p-4 bg-brand-bg/50 border border-brand-border rounded-2xl space-y-3">
                        <p className="text-[10px] font-black uppercase tracking-widest text-brand-text/40">Funcionamiento general</p>
                        {registro.sinObservaciones ? (
                            <p className="flex items-center gap-1.5 text-xs font-bold text-success"><CheckCircle2 className="w-4 h-4" /> Sin observaciones</p>
                        ) : problemasMarcados.length === 0 ? (
                            <p className="text-xs text-brand-text/30">Sin problemas marcados</p>
                        ) : (
                            <div className="flex flex-wrap gap-1.5">
                                {problemasMarcados.map(p => (
                                    <span key={String(p.key)} className="flex items-center gap-1 text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-warning/10 text-warning border border-warning/20">
                                        <AlertTriangle className="w-3 h-3" /> {p.label}
                                    </span>
                                ))}
                            </div>
                        )}
                        {registro.comentariosFuncionamiento?.trim() && (
                            <p className="text-xs text-brand-text/60 italic">"{registro.comentariosFuncionamiento}"</p>
                        )}
                    </div>

                    {/* Campos globales de cierre */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <CampoGlobal label="Aspectos positivos" valor={registro.aspectosPositivos} />
                        <CampoGlobal label="Oportunidades de mejora" valor={registro.oportunidadesMejora} />
                        <CampoGlobal label="Observación general" valor={registro.observacionGeneral} />
                    </div>
                </div>
            </div>
        </div>
    );
};
