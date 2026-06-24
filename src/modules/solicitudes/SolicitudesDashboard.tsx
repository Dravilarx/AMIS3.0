import React, { useState, useRef, useMemo } from 'react';
import {
    Plus, X, Loader2, CheckCircle2, Lock,
    Paperclip, ImageOff, ChevronRight, RotateCcw, CheckCheck,
    AlertCircle, Inbox, FileSignature, Search, Stethoscope,
    ClipboardCheck, UserCheck, Ban, Copy, Bell, FileText,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAuth } from '../../hooks/useAuth';
import {
    useSolicitudes,
    type StandByItem,
    type Institucion,
    type CatalogoSol,
    type AddendumItem,
    type Medico,
} from '../../hooks/useSolicitudes';

// ─── Constantes de estado (Stand By) ──────────────────────────────────────────
const ESTADO_CONFIG: Record<string, { label: string; badge: string; dot: string }> = {
    'En Stand By': { label: 'En Stand By', badge: 'text-danger    bg-danger/10    border-danger/20',     dot: 'bg-danger'    },
    'Devuelto':    { label: 'Devuelto',    badge: 'text-amber-400 bg-amber-400/10 border-amber-400/20',  dot: 'bg-amber-400' },
    'Resuelto':    { label: 'Resuelto',    badge: 'text-success   bg-success/10   border-success/20',     dot: 'bg-success'   },
};

// ─── Constantes de estado (Addendum) ──────────────────────────────────────────
const ADD_ESTADO_STYLE: Record<string, string> = {
    'Nueva':      'text-info    bg-info/10    border-info/20',
    'En proceso': 'text-warning bg-warning/10 border-warning/20',
    'Finalizada': 'text-success bg-success/10 border-success/20',
    'Rechazada':  'text-danger  bg-danger/10  border-danger/20',
};

const inputCls = 'w-full bg-brand-surface border border-brand-border rounded-xl px-3 py-2.5 text-sm text-brand-text outline-none focus:border-brand-primary/50 focus:ring-1 focus:ring-brand-primary/20';
const labelCls = 'text-[10px] font-black uppercase tracking-widest text-brand-text/50';
const sensitiveLbl = cn(labelCls, 'flex items-center gap-1.5 text-warning/70');

const fmtFecha = (iso?: string) =>
    iso ? new Date(iso).toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

// ─── Banner datos sensibles ───────────────────────────────────────────────────
const SensitiveBanner: React.FC = () => (
    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-warning/5 border border-warning/20">
        <Lock className="w-3.5 h-3.5 text-warning/70 shrink-0" />
        <p className="text-[9px] font-bold uppercase tracking-wider text-warning/60">
            Paciente y RUT son datos sensibles — manejo confidencial
        </p>
    </div>
);

// ─── Switch ───────────────────────────────────────────────────────────────────
const Switch: React.FC<{ checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }> = ({ checked, onChange, disabled }) => (
    <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
            'relative w-10 h-5 rounded-full transition-colors shrink-0 disabled:opacity-40',
            checked ? 'bg-brand-primary' : 'bg-brand-border'
        )}
    >
        <span className={cn('absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform', checked && 'translate-x-5')} />
    </button>
);

// ═══════════════════════════════════════════════════════════════════════════════
// STAND BY
// ═══════════════════════════════════════════════════════════════════════════════
const NuevoStandByModal: React.FC<{
    onClose:       () => void;
    onSuccess:     () => void;
    instituciones: Institucion[];
    motivos:       CatalogoSol[];
    addStandBy:    (payload: any, files: File[]) => Promise<{ success: boolean; error: any }>;
}> = ({ onClose, onSuccess, instituciones, motivos, addStandBy }) => {
    const [saving,  setSaving]  = useState(false);
    const [error,   setError]   = useState<string | null>(null);
    const [files,   setFiles]   = useState<File[]>([]);
    const fileRef = useRef<HTMLInputElement>(null);

    const [form, setForm] = useState({
        idEstudio: '', institucionId: '', modalidad: '', paciente: '', rut: '', motivo: '', comentario: '',
    });
    const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

    const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) setFiles(prev => [...prev, ...Array.from(e.target.files!)]);
    };
    const removeFile = (i: number) => setFiles(prev => prev.filter((_, j) => j !== i));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.idEstudio.trim()) { setError('El N° de estudio es obligatorio.'); return; }
        setSaving(true); setError(null);
        const { success, error: err } = await addStandBy({
            idEstudio:     form.idEstudio.trim(),
            institucionId: form.institucionId || undefined,
            modalidad:     form.modalidad     || undefined,
            paciente:      form.paciente      || undefined,
            rut:           form.rut           || undefined,
            motivo:        form.motivo        || undefined,
            comentario:    form.comentario    || undefined,
        }, files);
        setSaving(false);
        if (success) { onSuccess(); onClose(); }
        else setError(err?.message || 'Error al guardar.');
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <div className="bg-brand-bg border border-brand-border rounded-3xl w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
                <div className="flex items-center justify-between px-6 py-4 border-b border-brand-border shrink-0">
                    <div>
                        <h2 className="text-base font-black text-brand-text">Nuevo Stand By</h2>
                        <p className="text-[10px] text-brand-text/40 mt-0.5 uppercase tracking-wider">Solicitudes — CT</p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-xl hover:bg-brand-surface text-brand-text/40 hover:text-brand-text transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4 overflow-y-auto custom-scrollbar">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className={labelCls}>N° Estudio / Accession *</label>
                            <input type="text" required value={form.idEstudio} onChange={e => set('idEstudio', e.target.value)} placeholder="ej. ACC-00123" className={inputCls} />
                        </div>
                        <div className="space-y-1.5">
                            <label className={labelCls}>Institución</label>
                            <select value={form.institucionId} onChange={e => set('institucionId', e.target.value)} className={inputCls + ' appearance-none'}>
                                <option value="">Seleccionar...</option>
                                {instituciones.map(i => <option key={i.id} value={i.id}>{i.legalName}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className={labelCls}>Modalidad</label>
                            <input type="text" value={form.modalidad} onChange={e => set('modalidad', e.target.value)} placeholder="ej. TC, RM, RX" className={inputCls} />
                        </div>
                        <div className="space-y-1.5">
                            <label className={labelCls}>Motivo</label>
                            <select value={form.motivo} onChange={e => set('motivo', e.target.value)} className={inputCls + ' appearance-none'}>
                                <option value="">Seleccionar...</option>
                                {motivos.map(m => <option key={m.id} value={m.valor}>{m.valor}</option>)}
                            </select>
                        </div>
                    </div>

                    <SensitiveBanner />

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className={sensitiveLbl}><Lock className="w-3 h-3" /> Paciente</label>
                            <input type="text" value={form.paciente} onChange={e => set('paciente', e.target.value)} placeholder="Nombre completo" className={inputCls} autoComplete="off" />
                        </div>
                        <div className="space-y-1.5">
                            <label className={sensitiveLbl}><Lock className="w-3 h-3" /> RUT</label>
                            <input type="text" value={form.rut} onChange={e => set('rut', e.target.value)} placeholder="12.345.678-9" className={inputCls} autoComplete="off" />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className={labelCls}>Comentario</label>
                        <textarea rows={3} value={form.comentario} onChange={e => set('comentario', e.target.value)} placeholder="Observaciones adicionales..." className={inputCls + ' resize-none placeholder:text-brand-text/20'} />
                    </div>

                    <div className="space-y-2">
                        <label className={cn(labelCls, 'flex items-center gap-1.5')}><Paperclip className="w-3 h-3" /> Adjuntos (imágenes)</label>
                        <button type="button" onClick={() => fileRef.current?.click()} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-brand-border text-brand-text/40 text-xs font-bold hover:border-brand-primary/40 hover:text-brand-primary transition-all">
                            <Plus className="w-3.5 h-3.5" /> Agregar imágenes
                        </button>
                        <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFiles} />
                        {files.length > 0 && (
                            <div className="grid grid-cols-3 gap-2">
                                {files.map((f, i) => (
                                    <div key={i} className="relative group rounded-xl overflow-hidden border border-brand-border bg-brand-surface aspect-square">
                                        <img src={URL.createObjectURL(f)} alt={f.name} className="w-full h-full object-cover" />
                                        <button type="button" onClick={() => removeFile(i)} className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><X className="w-3 h-3" /></button>
                                        <p className="absolute bottom-0 left-0 right-0 px-1 py-0.5 bg-black/60 text-white text-[9px] truncate">{f.name}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {error && <div className="p-3 bg-danger/10 border border-danger/20 rounded-xl"><p className="text-[10px] font-bold text-danger uppercase tracking-wider text-center">{error}</p></div>}

                    <div className="flex gap-3 pt-1">
                        <button type="button" onClick={onClose} className="flex-1 py-3 rounded-2xl border border-brand-border text-brand-text/60 text-[11px] font-black uppercase tracking-wider hover:bg-brand-surface transition-all">Cancelar</button>
                        <button type="submit" disabled={saving} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-brand-primary text-white text-[11px] font-black uppercase tracking-wider hover:brightness-110 transition-all disabled:opacity-50 shadow-lg shadow-brand-primary/20">
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                            {saving ? 'Guardando...' : 'Registrar'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const StandByRow: React.FC<{
    item: StandByItem; instituMap: Record<string, string>; onCambio: (id: string, estado: string) => void; updating: boolean;
}> = ({ item, instituMap, onCambio, updating }) => {
    const estadoCfg = ESTADO_CONFIG[item.estado] ?? ESTADO_CONFIG['En Stand By'];
    return (
        <tr className="border-b border-brand-border/50 hover:bg-brand-surface/30 transition-colors group">
            <td className="px-4 py-3 whitespace-nowrap">
                <div className="flex items-center gap-2">
                    <span className={cn('text-[10px] font-black px-2 py-0.5 rounded-full border uppercase tracking-wider', estadoCfg.badge)}>{item.estado}</span>
                    {item.prioridad && item.estado === 'Resuelto' && <CheckCheck className="w-3.5 h-3.5 text-success" />}
                </div>
            </td>
            <td className="px-4 py-3"><span className="text-xs font-mono font-bold text-brand-text">{item.idEstudio || '—'}</span></td>
            <td className="px-4 py-3"><p className="text-xs text-brand-text/70">{item.institucionId ? (instituMap[item.institucionId] ?? item.institucionId) : '—'}</p></td>
            <td className="px-4 py-3"><p className="text-xs text-brand-text/70 max-w-36 truncate">{item.motivo || '—'}</p></td>
            <td className="px-4 py-3 text-center">
                {item.adjuntos && item.adjuntos.length > 0
                    ? <span className="inline-flex items-center gap-1 text-[10px] font-bold text-brand-primary"><Paperclip className="w-3 h-3" />{item.adjuntos.length}</span>
                    : <ImageOff className="w-3.5 h-3.5 text-brand-text/20 mx-auto" />}
            </td>
            <td className="px-4 py-3"><span className="text-[10px] font-mono text-brand-text/50">{fmtFecha(item.fechaEnvio)}</span></td>
            <td className="px-4 py-3">
                <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    {item.estado === 'En Stand By' && (
                        <button disabled={updating} onClick={() => onCambio(item.id, 'Devuelto')} className="flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-400/10 text-amber-400 border border-amber-400/20 text-[9px] font-black uppercase tracking-wider hover:bg-amber-400/20 transition-all disabled:opacity-40"><ChevronRight className="w-3 h-3" /> Devolver</button>
                    )}
                    {item.estado === 'Devuelto' && (
                        <>
                            <button disabled={updating} onClick={() => onCambio(item.id, 'En Stand By')} className="flex items-center gap-1 px-2 py-1 rounded-lg bg-danger/10 text-danger border border-danger/20 text-[9px] font-black uppercase tracking-wider hover:bg-danger/20 transition-all disabled:opacity-40"><RotateCcw className="w-3 h-3" /> Rechazar</button>
                            <button disabled={updating} onClick={() => onCambio(item.id, 'Resuelto')} className="flex items-center gap-1 px-2 py-1 rounded-lg bg-success/10 text-success border border-success/20 text-[9px] font-black uppercase tracking-wider hover:bg-success/20 transition-all disabled:opacity-40"><CheckCheck className="w-3 h-3" /> Resolver</button>
                        </>
                    )}
                    {item.estado === 'Resuelto' && <span className="flex items-center gap-1 text-[9px] font-black text-success/60 uppercase tracking-wider"><CheckCheck className="w-3 h-3" /> Cerrado</span>}
                </div>
            </td>
        </tr>
    );
};

// ═══════════════════════════════════════════════════════════════════════════════
// ADDENDUM — Modal nueva solicitud
// ═══════════════════════════════════════════════════════════════════════════════
const NuevaSolicitudModal: React.FC<{
    onClose:       () => void;
    instituciones: Institucion[];
    tipos:         CatalogoSol[];
    atenciones:    CatalogoSol[];
    addAddendum:   (payload: any) => Promise<{ success: boolean; error: any }>;
}> = ({ onClose, instituciones, tipos, atenciones, addAddendum }) => {
    const [saving, setSaving] = useState(false);
    const [error,  setError]  = useState<string | null>(null);
    const [form, setForm] = useState({
        institucionId: '', tipoSolicitud: '', tipoAtencion: '', modalidad: '', fechaExamen: '',
        idEstudio: '', paciente: '', rut: '', detalleSolicitud: '',
        medicoInformante: '', medicoValidador: '', medicoSolicitante: '',
    });
    const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true); setError(null);
        const { success, error: err } = await addAddendum({
            institucionId:     form.institucionId     || undefined,
            tipoSolicitud:     form.tipoSolicitud     || undefined,
            tipoAtencion:      form.tipoAtencion      || undefined,
            modalidad:         form.modalidad         || undefined,
            fechaExamen:       form.fechaExamen       || undefined,
            idEstudio:         form.idEstudio         || undefined,
            paciente:          form.paciente          || undefined,
            rut:               form.rut               || undefined,
            detalleSolicitud:  form.detalleSolicitud  || undefined,
            medicoInformante:  form.medicoInformante  || undefined,
            medicoValidador:   form.medicoValidador   || undefined,
            medicoSolicitante: form.medicoSolicitante || undefined,
        });
        setSaving(false);
        if (success) onClose();
        else setError(err?.message || 'Error al guardar.');
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <div className="bg-brand-bg border border-brand-border rounded-3xl w-full max-w-2xl shadow-2xl animate-in zoom-in-95 duration-200 max-h-[92vh] flex flex-col">
                <div className="flex items-center justify-between px-6 py-4 border-b border-brand-border shrink-0">
                    <div>
                        <h2 className="text-base font-black text-brand-text">Nueva Solicitud de Addendum</h2>
                        <p className="text-[10px] text-brand-text/40 mt-0.5 uppercase tracking-wider">Carga manual — luego la alimenta MultiRis</p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-xl hover:bg-brand-surface text-brand-text/40 hover:text-brand-text transition-colors"><X className="w-5 h-5" /></button>
                </div>

                <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4 overflow-y-auto custom-scrollbar">
                    {/* Institución + Tipo solicitud */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className={labelCls}>Institución</label>
                            <select value={form.institucionId} onChange={e => set('institucionId', e.target.value)} className={inputCls + ' appearance-none'}>
                                <option value="">Seleccionar...</option>
                                {instituciones.map(i => <option key={i.id} value={i.id}>{i.legalName}</option>)}
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className={labelCls}>Tipo de solicitud</label>
                            <select value={form.tipoSolicitud} onChange={e => set('tipoSolicitud', e.target.value)} className={inputCls + ' appearance-none'}>
                                <option value="">Seleccionar...</option>
                                {tipos.map(t => <option key={t.id} value={t.valor}>{t.valor}</option>)}
                            </select>
                        </div>
                    </div>

                    {/* Tipo atención + Modalidad */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className={labelCls}>Tipo de atención</label>
                            <select value={form.tipoAtencion} onChange={e => set('tipoAtencion', e.target.value)} className={inputCls + ' appearance-none'}>
                                <option value="">Seleccionar...</option>
                                {atenciones.map(a => <option key={a.id} value={a.valor}>{a.valor}</option>)}
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className={labelCls}>Modalidad</label>
                            <input type="text" value={form.modalidad} onChange={e => set('modalidad', e.target.value)} placeholder="ej. TC, RM, RX" className={inputCls} />
                        </div>
                    </div>

                    {/* Fecha examen + N° estudio */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className={labelCls}>Fecha del examen</label>
                            <input type="date" value={form.fechaExamen} onChange={e => set('fechaExamen', e.target.value)} className={inputCls} />
                        </div>
                        <div className="space-y-1.5">
                            <label className={labelCls}>N° Estudio / Accession</label>
                            <input type="text" value={form.idEstudio} onChange={e => set('idEstudio', e.target.value)} placeholder="ej. ACC-00123" className={inputCls} />
                        </div>
                    </div>

                    <SensitiveBanner />

                    {/* Paciente + RUT */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className={sensitiveLbl}><Lock className="w-3 h-3" /> Paciente</label>
                            <input type="text" value={form.paciente} onChange={e => set('paciente', e.target.value)} placeholder="Nombre completo" className={inputCls} autoComplete="off" />
                        </div>
                        <div className="space-y-1.5">
                            <label className={sensitiveLbl}><Lock className="w-3 h-3" /> RUT</label>
                            <input type="text" value={form.rut} onChange={e => set('rut', e.target.value)} placeholder="12.345.678-9" className={inputCls} autoComplete="off" />
                        </div>
                    </div>

                    {/* Detalle */}
                    <div className="space-y-1.5">
                        <label className={labelCls}>Detalle de la solicitud</label>
                        <textarea rows={3} value={form.detalleSolicitud} onChange={e => set('detalleSolicitud', e.target.value)} placeholder="Qué solicita el centro..." className={inputCls + ' resize-none placeholder:text-brand-text/20'} />
                    </div>

                    {/* Roles del informe original */}
                    <div className="pt-1">
                        <p className="text-[10px] font-black uppercase tracking-widest text-brand-text/40 mb-3">Roles del informe original</p>
                        <div className="grid grid-cols-3 gap-3">
                            <div className="space-y-1.5">
                                <label className={labelCls}>Médico informante</label>
                                <input type="text" value={form.medicoInformante} onChange={e => set('medicoInformante', e.target.value)} placeholder="Nombre" className={inputCls} />
                            </div>
                            <div className="space-y-1.5">
                                <label className={labelCls}>Médico validador</label>
                                <input type="text" value={form.medicoValidador} onChange={e => set('medicoValidador', e.target.value)} placeholder="Nombre" className={inputCls} />
                            </div>
                            <div className="space-y-1.5">
                                <label className={labelCls}>Médico solicitante</label>
                                <input type="text" value={form.medicoSolicitante} onChange={e => set('medicoSolicitante', e.target.value)} placeholder="Nombre" className={inputCls} />
                            </div>
                        </div>
                    </div>

                    {error && <div className="p-3 bg-danger/10 border border-danger/20 rounded-xl"><p className="text-[10px] font-bold text-danger uppercase tracking-wider text-center">{error}</p></div>}

                    <div className="flex gap-3 pt-1">
                        <button type="button" onClick={onClose} className="flex-1 py-3 rounded-2xl border border-brand-border text-brand-text/60 text-[11px] font-black uppercase tracking-wider hover:bg-brand-surface transition-all">Cancelar</button>
                        <button type="submit" disabled={saving} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-brand-primary text-white text-[11px] font-black uppercase tracking-wider hover:brightness-110 transition-all disabled:opacity-50 shadow-lg shadow-brand-primary/20">
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                            {saving ? 'Guardando...' : 'Registrar'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// ═══════════════════════════════════════════════════════════════════════════════
// ADDENDUM — Panel de detalle (triaje + resolución)
// ═══════════════════════════════════════════════════════════════════════════════
type ResForm = null | 'addendum' | 'rechazo' | 'segunda';

const DetalleAddendumModal: React.FC<{
    item:            AddendumItem;
    onClose:         () => void;
    instituMap:      Record<string, string>;
    medicoMap:       Record<string, string>;
    medicos:         Medico[];
    clasificaciones: CatalogoSol[];
    currentUserName: string;
    actions: {
        setClasificacion:       (id: string, c: string) => Promise<any>;
        resolverAdministrativo: (id: string) => Promise<any>;
        asignarMedico:          (id: string, m: string) => Promise<any>;
        resolverAddendum:       (id: string, texto: string, firma: string) => Promise<any>;
        rechazarAddendum:       (id: string, texto: string) => Promise<any>;
        segundaOpinion:         (id: string, texto: string, firma: string) => Promise<any>;
        setNotificarCritica:    (id: string, v: boolean) => Promise<any>;
    };
}> = ({ item, onClose, instituMap, medicoMap, medicos, clasificaciones, currentUserName, actions }) => {
    const [busy, setBusy]                 = useState(false);
    const [clasif, setClasif]             = useState(item.clasificacion ?? '');
    const [medicoSel, setMedicoSel]       = useState('');
    const [resForm, setResForm]           = useState<ResForm>(null);
    const [resTexto, setResTexto]         = useState('');
    const [resMedico, setResMedico]       = useState('');
    const [critica, setCritica]           = useState(item.notificarCritica);

    const cerrado = item.estado === 'Finalizada' || item.estado === 'Rechazada';
    const enProceso = item.estado === 'En proceso';
    const esAdministrativo = clasif === 'Administrativo';
    const esMedico = clasif === 'Médico';

    const run = async (fn: () => Promise<any>) => { setBusy(true); await fn(); setBusy(false); onClose(); };

    const handleClasif = async (v: string) => {
        setClasif(v);
        if (v) { setBusy(true); await actions.setClasificacion(item.id, v); setBusy(false); }
    };
    const handleCritica = async (v: boolean) => {
        setCritica(v); setBusy(true); await actions.setNotificarCritica(item.id, v); setBusy(false);
    };

    const submitRes = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!resTexto.trim()) return;
        if (resForm === 'addendum')  await run(() => actions.resolverAddendum(item.id, resTexto.trim(), currentUserName));
        if (resForm === 'rechazo')   await run(() => actions.rechazarAddendum(item.id, resTexto.trim()));
        if (resForm === 'segunda')   await run(() => actions.segundaOpinion(item.id, resTexto.trim(), resMedico || currentUserName));
    };

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
            <div className="bg-brand-bg border border-brand-border rounded-3xl w-full max-w-2xl shadow-2xl animate-in zoom-in-95 duration-200 max-h-[92vh] flex flex-col">
                <div className="flex items-center justify-between px-6 py-4 border-b border-brand-border shrink-0">
                    <div className="flex items-center gap-3">
                        <span className={cn('text-[10px] font-black px-2.5 py-1 rounded-full border uppercase tracking-wider', ADD_ESTADO_STYLE[item.estado] ?? ADD_ESTADO_STYLE['Nueva'])}>{item.estado}</span>
                        <div>
                            <h2 className="text-base font-black text-brand-text">Addendum · {item.idEstudio || 's/n'}</h2>
                            <p className="text-[10px] text-brand-text/40 uppercase tracking-wider">{item.institucionId ? instituMap[item.institucionId] : '—'}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-xl hover:bg-brand-surface text-brand-text/40 hover:text-brand-text transition-colors"><X className="w-5 h-5" /></button>
                </div>

                <div className="px-6 py-5 space-y-5 overflow-y-auto custom-scrollbar">
                    {/* Datos */}
                    <div className="grid grid-cols-3 gap-4">
                        <Field label="Tipo solicitud" value={item.tipoSolicitud} />
                        <Field label="Tipo atención"  value={item.tipoAtencion} />
                        <Field label="Modalidad"       value={item.modalidad} />
                        <Field label="Fecha examen"    value={fmtFecha(item.fechaExamen)} />
                        <Field label="Paciente"        value={item.paciente} sensitive />
                        <Field label="RUT"             value={item.rut} sensitive />
                    </div>
                    {item.detalleSolicitud && (
                        <div className="space-y-0.5">
                            <p className={labelCls}>Detalle de la solicitud</p>
                            <p className="text-sm text-brand-text bg-brand-surface/50 border border-brand-border rounded-xl p-3 whitespace-pre-wrap">{item.detalleSolicitud}</p>
                        </div>
                    )}
                    <div className="grid grid-cols-3 gap-4">
                        <Field label="Informante"  value={item.medicoInformante} />
                        <Field label="Validador"   value={item.medicoValidador} />
                        <Field label="Solicitante" value={item.medicoSolicitante} />
                    </div>

                    {/* Notificar crítica */}
                    <div className="flex items-center justify-between px-4 py-3 rounded-xl border border-brand-border bg-brand-surface/40">
                        <div className="flex items-center gap-2">
                            <Bell className="w-4 h-4 text-warning" />
                            <span className="text-xs font-bold text-brand-text">Notificar como crítica</span>
                        </div>
                        <Switch checked={critica} onChange={handleCritica} disabled={busy} />
                    </div>

                    {/* ─── Resolución cerrada (solo lectura) ─── */}
                    {cerrado && (
                        <div className={cn('rounded-2xl border p-4 space-y-2', item.estado === 'Rechazada' ? 'border-danger/30 bg-danger/5' : 'border-success/30 bg-success/5')}>
                            <div className="flex items-center gap-2">
                                <FileSignature className={cn('w-4 h-4', item.estado === 'Rechazada' ? 'text-danger' : 'text-success')} />
                                <p className="text-xs font-black uppercase tracking-wider text-brand-text">Resolución: {item.resolucion}</p>
                            </div>
                            {item.resolucion === 'Rechazo' && (
                                <p className="text-[10px] font-bold text-danger/80 flex items-center gap-1"><Ban className="w-3 h-3" /> Queda registrado en el sistema pero NO se imprime en el informe.</p>
                            )}
                            <p className="text-sm text-brand-text whitespace-pre-wrap">{item.resolucionTexto}</p>
                            <div className="flex items-center gap-4 text-[10px] text-brand-text/50 pt-1">
                                {item.medicoResolucion && <span className="flex items-center gap-1"><FileSignature className="w-3 h-3" /> {item.medicoResolucion}</span>}
                                <span>{fmtFecha(item.fechaResolucion)}</span>
                            </div>
                        </div>
                    )}

                    {/* ─── TRIAJE (secretaria) ─── */}
                    {!cerrado && (
                        <div className="rounded-2xl border border-brand-border p-4 space-y-3">
                            <div className="flex items-center gap-2">
                                <ClipboardCheck className="w-4 h-4 text-brand-primary" />
                                <p className="text-xs font-black uppercase tracking-wider text-brand-text">Triaje</p>
                            </div>
                            <div className="space-y-1.5">
                                <label className={labelCls}>Clasificación</label>
                                <select value={clasif} onChange={e => handleClasif(e.target.value)} disabled={busy || enProceso} className={inputCls + ' appearance-none'}>
                                    <option value="">Seleccionar...</option>
                                    {clasificaciones.map(c => <option key={c.id} value={c.valor}>{c.valor}</option>)}
                                </select>
                            </div>

                            {esAdministrativo && !enProceso && (
                                <button disabled={busy} onClick={() => run(() => actions.resolverAdministrativo(item.id))} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-success text-white text-[11px] font-black uppercase tracking-wider hover:brightness-110 transition-all disabled:opacity-50">
                                    <UserCheck className="w-4 h-4" /> Resolver (administrativo)
                                </button>
                            )}

                            {esMedico && !enProceso && (
                                <div className="space-y-2">
                                    <label className={labelCls}>Médico asignado</label>
                                    <select value={medicoSel} onChange={e => setMedicoSel(e.target.value)} disabled={busy} className={inputCls + ' appearance-none'}>
                                        <option value="">Seleccionar médico...</option>
                                        {medicos.map(m => <option key={m.id} value={m.id}>{m.nombre}{m.specialty ? ` · ${m.specialty}` : ''}</option>)}
                                    </select>
                                    <button disabled={busy || !medicoSel} onClick={() => run(() => actions.asignarMedico(item.id, medicoSel))} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-brand-primary text-white text-[11px] font-black uppercase tracking-wider hover:brightness-110 transition-all disabled:opacity-50">
                                        <Stethoscope className="w-4 h-4" /> Asignar
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ─── RESOLUCIÓN (médico asignado) ─── */}
                    {enProceso && (
                        <div className="rounded-2xl border border-brand-border p-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Stethoscope className="w-4 h-4 text-brand-primary" />
                                    <p className="text-xs font-black uppercase tracking-wider text-brand-text">Resolución</p>
                                </div>
                                {item.medicoAsignadoId && <span className="text-[10px] text-brand-text/50">Asignado a {medicoMap[item.medicoAsignadoId] ?? '—'}</span>}
                            </div>

                            {!resForm && (
                                <div className="grid grid-cols-3 gap-2">
                                    <button onClick={() => { setResForm('addendum'); setResTexto(''); }} className="flex flex-col items-center gap-1 py-3 rounded-xl bg-success/10 text-success border border-success/20 text-[10px] font-black uppercase tracking-wider hover:bg-success/20 transition-all"><FileSignature className="w-4 h-4" /> Realizar Addendum</button>
                                    <button onClick={() => { setResForm('rechazo'); setResTexto(''); }} className="flex flex-col items-center gap-1 py-3 rounded-xl bg-danger/10 text-danger border border-danger/20 text-[10px] font-black uppercase tracking-wider hover:bg-danger/20 transition-all"><Ban className="w-4 h-4" /> Rechazar</button>
                                    <button onClick={() => { setResForm('segunda'); setResTexto(''); setResMedico(''); }} className="flex flex-col items-center gap-1 py-3 rounded-xl bg-info/10 text-info border border-info/20 text-[10px] font-black uppercase tracking-wider hover:bg-info/20 transition-all"><Copy className="w-4 h-4" /> Segunda opinión</button>
                                </div>
                            )}

                            {resForm && (
                                <form onSubmit={submitRes} className="space-y-3">
                                    {resForm === 'addendum' && (
                                        <p className="text-[10px] text-brand-text/50 flex items-center gap-1"><FileText className="w-3 h-3" /> El texto se agrega al final del informe. Firma: <span className="font-bold text-brand-text">{currentUserName}</span></p>
                                    )}
                                    {resForm === 'rechazo' && (
                                        <p className="text-[10px] font-bold text-danger/80 flex items-center gap-1"><Ban className="w-3 h-3" /> Comentario interno. Queda registrado pero NO se imprime en el informe.</p>
                                    )}
                                    {resForm === 'segunda' && (
                                        <>
                                            <p className="text-[10px] text-brand-text/50 flex items-center gap-1"><Copy className="w-3 h-3" /> Se asocia al mismo N° de estudio, sin prestación nueva.</p>
                                            <div className="space-y-1.5">
                                                <label className={labelCls}>Médico que emite</label>
                                                <select value={resMedico} onChange={e => setResMedico(e.target.value)} className={inputCls + ' appearance-none'}>
                                                    <option value="">{currentUserName} (yo)</option>
                                                    {medicos.map(m => <option key={m.id} value={m.nombre}>{m.nombre}</option>)}
                                                </select>
                                            </div>
                                        </>
                                    )}
                                    <div className="space-y-1.5">
                                        <label className={labelCls}>
                                            {resForm === 'addendum' ? 'Texto del addendum' : resForm === 'rechazo' ? 'Comentario interno' : 'Cuerpo del informe nuevo'}
                                        </label>
                                        <textarea rows={4} value={resTexto} onChange={e => setResTexto(e.target.value)} required className={inputCls + ' resize-none'} />
                                    </div>
                                    <div className="flex gap-2">
                                        <button type="button" onClick={() => setResForm(null)} className="flex-1 py-2.5 rounded-xl border border-brand-border text-brand-text/60 text-[11px] font-black uppercase tracking-wider hover:bg-brand-surface transition-all">Volver</button>
                                        <button type="submit" disabled={busy || !resTexto.trim()} className={cn('flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-white text-[11px] font-black uppercase tracking-wider hover:brightness-110 transition-all disabled:opacity-50',
                                            resForm === 'rechazo' ? 'bg-danger' : resForm === 'segunda' ? 'bg-info' : 'bg-success')}>
                                            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} Confirmar
                                        </button>
                                    </div>
                                </form>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const AddendumRow: React.FC<{
    item: AddendumItem; instituMap: Record<string, string>; medicoMap: Record<string, string>; onOpen: (i: AddendumItem) => void;
}> = ({ item, instituMap, medicoMap, onOpen }) => (
    <tr onClick={() => onOpen(item)} className="border-b border-brand-border/50 hover:bg-brand-surface/30 transition-colors cursor-pointer">
        <td className="px-4 py-3 whitespace-nowrap">
            <div className="flex items-center gap-2">
                <span className={cn('text-[10px] font-black px-2 py-0.5 rounded-full border uppercase tracking-wider', ADD_ESTADO_STYLE[item.estado] ?? ADD_ESTADO_STYLE['Nueva'])}>{item.estado}</span>
                {item.notificarCritica && <Bell className="w-3 h-3 text-warning" />}
            </div>
        </td>
        <td className="px-4 py-3"><p className="text-xs text-brand-text/70">{item.institucionId ? (instituMap[item.institucionId] ?? item.institucionId) : '—'}</p></td>
        <td className="px-4 py-3"><span className="inline-flex items-center gap-1 text-xs text-warning/80"><Lock className="w-2.5 h-2.5" />{item.paciente || '—'}</span></td>
        <td className="px-4 py-3"><p className="text-xs text-brand-text/70 max-w-36 truncate">{item.tipoSolicitud || '—'}</p></td>
        <td className="px-4 py-3"><p className="text-xs text-brand-text/70">{item.medicoAsignadoId ? (medicoMap[item.medicoAsignadoId] ?? '—') : <span className="text-brand-text/30">Sin asignar</span>}</p></td>
        <td className="px-4 py-3"><span className="text-[10px] font-mono text-brand-text/50">{fmtFecha(item.fechaIngreso)}</span></td>
        <td className="px-4 py-3 text-right"><ChevronRight className="w-4 h-4 text-brand-text/30 ml-auto" /></td>
    </tr>
);

// ═══════════════════════════════════════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════════
const TABS = [
    { id: 'standby'  as const, label: 'Stand By', icon: AlertCircle   },
    { id: 'addendum' as const, label: 'Addendum', icon: FileSignature },
];

export const SolicitudesDashboard: React.FC = () => {
    const s = useSolicitudes();
    const { user } = useAuth();
    const currentUserName = user?.name || user?.email || 'Usuario';

    const [activeTab, setActiveTab] = useState<'standby' | 'addendum'>('standby');
    const [showStandByModal, setShowStandByModal] = useState(false);
    const [showAddModal,     setShowAddModal]     = useState(false);
    const [updating,         setUpdating]         = useState(false);
    const [detalle,          setDetalle]          = useState<AddendumItem | null>(null);

    // Filtros addendum
    const [fInstitucion, setFInstitucion] = useState('');
    const [fEstado,      setFEstado]      = useState('');
    const [fMedico,      setFMedico]      = useState('');
    const [filtros,      setFiltros]      = useState({ institucion: '', estado: '', medico: '' });

    const instituMap = useMemo(() => Object.fromEntries(s.instituciones.map(i => [i.id, i.legalName])), [s.instituciones]);
    const medicoMap  = useMemo(() => Object.fromEntries(s.medicos.map(m => [m.id, m.nombre])), [s.medicos]);

    // KPIs Stand By
    const enStandBy = s.standByItems.filter(i => i.estado === 'En Stand By').length;
    const devueltos = s.standByItems.filter(i => i.estado === 'Devuelto').length;
    const resueltos = s.standByItems.filter(i => i.estado === 'Resuelto').length;

    // KPIs Addendum
    const kNueva     = s.addendums.filter(a => a.estado === 'Nueva').length;
    const kProceso   = s.addendums.filter(a => a.estado === 'En proceso').length;
    const kFinalizada = s.addendums.filter(a => a.estado === 'Finalizada').length;
    const kRechazada = s.addendums.filter(a => a.estado === 'Rechazada').length;

    const addendumsFiltrados = useMemo(() => s.addendums.filter(a =>
        (!filtros.institucion || a.institucionId === filtros.institucion) &&
        (!filtros.estado      || a.estado === filtros.estado) &&
        (!filtros.medico      || a.medicoAsignadoId === filtros.medico)
    ), [s.addendums, filtros]);

    const handleCambioEstado = async (id: string, nuevoEstado: string) => {
        setUpdating(true); await s.updateEstado(id, nuevoEstado); setUpdating(false);
    };

    // El detalle abierto se re-sincroniza con la lista tras cada acción
    const detalleVivo = detalle ? (s.addendums.find(a => a.id === detalle.id) ?? null) : null;

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-black text-brand-text">Solicitudes</h2>
                    <p className="text-brand-text/40 text-sm">Gestión de solicitudes, stand by y addendum — CT</p>
                </div>
                {activeTab === 'standby' ? (
                    <button onClick={() => setShowStandByModal(true)} className="flex items-center gap-2 px-5 py-2.5 bg-danger text-white rounded-xl font-black text-xs uppercase tracking-wider hover:brightness-110 transition-all shadow-lg shadow-danger/20">
                        <Plus className="w-4 h-4" /> Nuevo Stand By
                    </button>
                ) : (
                    <button onClick={() => setShowAddModal(true)} className="flex items-center gap-2 px-5 py-2.5 bg-brand-primary text-white rounded-xl font-black text-xs uppercase tracking-wider hover:brightness-110 transition-all shadow-lg shadow-brand-primary/20">
                        <Plus className="w-4 h-4" /> Nueva solicitud
                    </button>
                )}
            </div>

            {/* KPIs */}
            {activeTab === 'standby' ? (
                <div className="grid grid-cols-3 gap-4">
                    <div className="flex items-center gap-4 px-5 py-4 rounded-2xl border bg-danger/5 border-danger/20"><span className="text-3xl font-black text-danger">{enStandBy}</span><div><p className="text-[9px] font-black uppercase tracking-widest text-danger/70 leading-tight">En Stand By</p><p className="text-[9px] text-brand-text/30 mt-0.5">Pendientes</p></div></div>
                    <div className="flex items-center gap-4 px-5 py-4 rounded-2xl border bg-amber-400/5 border-amber-400/20"><span className="text-3xl font-black text-amber-400">{devueltos}</span><div><p className="text-[9px] font-black uppercase tracking-widest text-amber-400/70 leading-tight">Devueltos</p><p className="text-[9px] text-brand-text/30 mt-0.5">En revisión</p></div></div>
                    <div className="flex items-center gap-4 px-5 py-4 rounded-2xl border bg-success/5 border-success/20"><span className="text-3xl font-black text-success">{resueltos}</span><div><p className="text-[9px] font-black uppercase tracking-widest text-success/70 leading-tight">Resueltos</p><p className="text-[9px] text-brand-text/30 mt-0.5">Cerrados</p></div></div>
                </div>
            ) : (
                <div className="grid grid-cols-4 gap-4">
                    <div className="flex items-center gap-4 px-5 py-4 rounded-2xl border bg-info/5 border-info/20"><span className="text-3xl font-black text-info">{kNueva}</span><div><p className="text-[9px] font-black uppercase tracking-widest text-info/70 leading-tight">Nuevas</p></div></div>
                    <div className="flex items-center gap-4 px-5 py-4 rounded-2xl border bg-warning/5 border-warning/20"><span className="text-3xl font-black text-warning">{kProceso}</span><div><p className="text-[9px] font-black uppercase tracking-widest text-warning/70 leading-tight">En proceso</p></div></div>
                    <div className="flex items-center gap-4 px-5 py-4 rounded-2xl border bg-success/5 border-success/20"><span className="text-3xl font-black text-success">{kFinalizada}</span><div><p className="text-[9px] font-black uppercase tracking-widest text-success/70 leading-tight">Finalizadas</p></div></div>
                    <div className="flex items-center gap-4 px-5 py-4 rounded-2xl border bg-danger/5 border-danger/20"><span className="text-3xl font-black text-danger">{kRechazada}</span><div><p className="text-[9px] font-black uppercase tracking-widest text-danger/70 leading-tight">Rechazadas</p></div></div>
                </div>
            )}

            {/* Pestañas */}
            <div className="flex gap-1 border-b border-brand-border pb-px">
                {TABS.map(tab => {
                    const Icon = tab.icon; const active = activeTab === tab.id;
                    return (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={cn('flex items-center gap-1.5 px-4 py-2.5 rounded-t-xl text-xs font-bold uppercase tracking-wider border-b-2 -mb-px transition-all', active ? 'border-brand-primary text-brand-text bg-brand-surface' : 'border-transparent text-brand-text/40')}>
                            <Icon className={cn('w-3.5 h-3.5', active ? 'text-brand-primary' : 'text-brand-text/30')} />
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* ─── STAND BY ─── */}
            {activeTab === 'standby' && (
                s.loading ? (
                    <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 text-brand-primary animate-spin" /></div>
                ) : s.standByItems.length === 0 ? (
                    <div className="text-center py-16 border border-dashed border-brand-border rounded-2xl"><Inbox className="w-12 h-12 text-brand-text/10 mx-auto mb-3" /><p className="text-sm text-brand-text/30">Sin solicitudes en stand by.</p></div>
                ) : (
                    <div className="rounded-2xl border border-brand-border overflow-hidden">
                        <table className="w-full text-left border-collapse">
                            <thead><tr className="bg-brand-surface/50 border-b border-brand-border">{['Estado', 'N° Estudio', 'Institución', 'Motivo', 'Adj.', 'Fecha envío', ''].map(h => <th key={h} className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-brand-text/40 whitespace-nowrap">{h}</th>)}</tr></thead>
                            <tbody className="divide-y divide-brand-border/30">
                                {s.standByItems.map(item => <StandByRow key={item.id} item={item} instituMap={instituMap} onCambio={handleCambioEstado} updating={updating} />)}
                            </tbody>
                        </table>
                    </div>
                )
            )}

            {/* ─── ADDENDUM ─── */}
            {activeTab === 'addendum' && (
                <>
                    {/* Filtros */}
                    <div className="flex flex-wrap items-end gap-3 p-4 rounded-2xl border border-brand-border bg-brand-surface/40">
                        <div className="space-y-1.5 flex-1 min-w-44">
                            <label className={labelCls}>Institución</label>
                            <select value={fInstitucion} onChange={e => setFInstitucion(e.target.value)} className={inputCls + ' appearance-none'}>
                                <option value="">Todas</option>
                                {s.instituciones.map(i => <option key={i.id} value={i.id}>{i.legalName}</option>)}
                            </select>
                        </div>
                        <div className="space-y-1.5 flex-1 min-w-40">
                            <label className={labelCls}>Estado</label>
                            <select value={fEstado} onChange={e => setFEstado(e.target.value)} className={inputCls + ' appearance-none'}>
                                <option value="">Todos</option>
                                {s.addEstados.map(e => <option key={e.id} value={e.valor}>{e.valor}</option>)}
                            </select>
                        </div>
                        <div className="space-y-1.5 flex-1 min-w-44">
                            <label className={labelCls}>Médico asignado</label>
                            <select value={fMedico} onChange={e => setFMedico(e.target.value)} className={inputCls + ' appearance-none'}>
                                <option value="">Todos</option>
                                {s.medicos.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
                            </select>
                        </div>
                        <button onClick={() => setFiltros({ institucion: fInstitucion, estado: fEstado, medico: fMedico })} className="flex items-center gap-2 px-5 py-2.5 bg-brand-primary text-white rounded-xl font-black text-xs uppercase tracking-wider hover:brightness-110 transition-all shadow-lg shadow-brand-primary/20">
                            <Search className="w-4 h-4" /> Buscar
                        </button>
                    </div>

                    {s.loadingAdd ? (
                        <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 text-brand-primary animate-spin" /></div>
                    ) : addendumsFiltrados.length === 0 ? (
                        <div className="text-center py-16 border border-dashed border-brand-border rounded-2xl"><FileSignature className="w-12 h-12 text-brand-text/10 mx-auto mb-3" /><p className="text-sm text-brand-text/30">Sin solicitudes de addendum.</p></div>
                    ) : (
                        <div className="rounded-2xl border border-brand-border overflow-hidden">
                            <table className="w-full text-left border-collapse">
                                <thead><tr className="bg-brand-surface/50 border-b border-brand-border">{['Estado', 'Institución', 'Paciente', 'Tipo solicitud', 'Médico asignado', 'Ingreso', ''].map(h => <th key={h} className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-brand-text/40 whitespace-nowrap">{h}</th>)}</tr></thead>
                                <tbody className="divide-y divide-brand-border/30">
                                    {addendumsFiltrados.map(item => <AddendumRow key={item.id} item={item} instituMap={instituMap} medicoMap={medicoMap} onOpen={setDetalle} />)}
                                </tbody>
                            </table>
                        </div>
                    )}
                </>
            )}

            {/* Modales */}
            {showStandByModal && (
                <NuevoStandByModal onClose={() => setShowStandByModal(false)} onSuccess={() => {}} instituciones={s.instituciones} motivos={s.motivos} addStandBy={s.addStandBy} />
            )}
            {showAddModal && (
                <NuevaSolicitudModal onClose={() => setShowAddModal(false)} instituciones={s.instituciones} tipos={s.addTipos} atenciones={s.addAtenciones} addAddendum={s.addAddendum} />
            )}
            {detalleVivo && (
                <DetalleAddendumModal
                    item={detalleVivo}
                    onClose={() => setDetalle(null)}
                    instituMap={instituMap}
                    medicoMap={medicoMap}
                    medicos={s.medicos}
                    clasificaciones={s.addClasificaciones}
                    currentUserName={currentUserName}
                    actions={{
                        setClasificacion:       s.setClasificacion,
                        resolverAdministrativo: s.resolverAdministrativo,
                        asignarMedico:          s.asignarMedico,
                        resolverAddendum:       s.resolverAddendum,
                        rechazarAddendum:       s.rechazarAddendum,
                        segundaOpinion:         s.segundaOpinion,
                        setNotificarCritica:    s.setNotificarCritica,
                    }}
                />
            )}
        </div>
    );
};
