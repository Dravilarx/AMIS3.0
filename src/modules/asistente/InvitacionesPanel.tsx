import React, { useState, useEffect, useRef } from 'react';
import {
    Send, UserPlus, Search, Loader2, CheckCircle2, Copy, Link as LinkIcon,
    Stethoscope, Building2, X, Info, Users,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { SmartCombobox } from '../../components/ui/SmartCombobox';
import { useAsistente, type DoctorLite, type NuevoMedico } from './useAsistente';

const inputCls = 'w-full bg-brand-surface border border-brand-border rounded-xl px-3 py-2.5 text-sm text-brand-text outline-none focus:border-brand-primary/50 focus:ring-1 focus:ring-brand-primary/20 placeholder:text-brand-text/30';
const labelCls = 'text-[10px] font-black uppercase tracking-widest text-brand-text/50';

const ESTADO_BADGE: Record<string, string> = {
    pendiente: 'text-info    bg-info/10    border-info/20',
    usada:     'text-success bg-success/10 border-success/20',
    revocada:  'text-danger  bg-danger/10  border-danger/20',
};

const fmtFecha = (iso?: string) =>
    iso ? new Date(iso).toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

const EMPTY_NUEVO: NuevoMedico = {
    name: '', last_name: '', email: '', phone_number: '', hospital_name: '', specialty: '', rut: '',
};

export const InvitacionesPanel: React.FC = () => {
    const { institutions, invitaciones, loading, error, buscarMedicos, crearInvitacion } = useAsistente();

    // Selección de centro
    const [institutionId, setInstitutionId] = useState('');

    // Modo médico: buscar existente vs crear nuevo
    const [modoMedico, setModoMedico] = useState<'buscar' | 'nuevo'>('buscar');

    // Búsqueda de médico existente
    const [busqueda, setBusqueda] = useState('');
    const [resultados, setResultados] = useState<DoctorLite[]>([]);
    const [buscando, setBuscando] = useState(false);
    const [medicoSel, setMedicoSel] = useState<DoctorLite | null>(null);

    // Formulario nuevo médico
    const [nuevo, setNuevo] = useState<NuevoMedico>(EMPTY_NUEVO);

    // Generación
    const [generando, setGenerando] = useState(false);
    const [genError, setGenError] = useState<string | null>(null);
    const [linkGenerado, setLinkGenerado] = useState<string | null>(null);
    const [copiado, setCopiado] = useState(false);

    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const centroOptions = institutions.map(i => ({ id: i.id, label: i.nombre }));

    // Búsqueda con debounce
    useEffect(() => {
        if (modoMedico !== 'buscar') return;
        if (medicoSel) return; // ya hay uno elegido, no re-buscar
        if (debounceRef.current) clearTimeout(debounceRef.current);
        const term = busqueda.trim();
        if (term.length < 2) { setResultados([]); return; }
        setBuscando(true);
        debounceRef.current = setTimeout(async () => {
            const res = await buscarMedicos(term);
            setResultados(res);
            setBuscando(false);
        }, 300);
        return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    }, [busqueda, modoMedico, medicoSel, buscarMedicos]);

    const seleccionarMedico = (d: DoctorLite) => {
        setMedicoSel(d);
        setResultados([]);
        setBusqueda(`${d.name} ${d.lastName}`.trim());
    };

    const limpiarMedicoSel = () => {
        setMedicoSel(null);
        setBusqueda('');
        setResultados([]);
    };

    // Validación mínima para habilitar el botón
    const nuevoValido =
        nuevo.name.trim() !== '' &&
        nuevo.last_name.trim() !== '' &&
        nuevo.phone_number.trim() !== '' &&
        nuevo.hospital_name.trim() !== '';

    const puedeGenerar =
        institutionId !== '' &&
        (modoMedico === 'buscar' ? !!medicoSel : nuevoValido) &&
        !generando;

    const resetTrasGenerar = () => {
        setInstitutionId('');
        setModoMedico('buscar');
        limpiarMedicoSel();
        setNuevo(EMPTY_NUEVO);
    };

    const handleGenerar = async () => {
        setGenError(null);
        setLinkGenerado(null);
        setGenerando(true);
        try {
            const res = await crearInvitacion({
                institutionId,
                medicoExistenteId: modoMedico === 'buscar' ? medicoSel?.id : null,
                nuevoMedico: modoMedico === 'nuevo' ? nuevo : null,
            });
            if (res.success && res.token) {
                setLinkGenerado(`${window.location.origin}/m/${res.token}`);
                resetTrasGenerar();
            } else {
                setGenError(res.error || 'No se pudo generar la invitación');
            }
        } finally {
            setGenerando(false);
        }
    };

    const copiarLink = async () => {
        if (!linkGenerado) return;
        await navigator.clipboard.writeText(linkGenerado);
        setCopiado(true);
        setTimeout(() => setCopiado(false), 2000);
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Card: Invitar médico */}
            <div className="bg-brand-surface border border-brand-border rounded-[2rem] p-8 shadow-xl space-y-8">
                <div className="flex items-center gap-3 border-b border-brand-border pb-4">
                    <UserPlus className="w-5 h-5 text-brand-primary" />
                    <h2 className="text-sm font-black text-brand-text/60 uppercase tracking-[0.2em]">Invitar médico</h2>
                </div>

                {/* 1. Centro */}
                <div className="space-y-2.5">
                    <label className={labelCls}>
                        <span className="flex items-center gap-2"><Building2 className="w-3.5 h-3.5" /> Centro <span className="text-danger">*</span></span>
                    </label>
                    <SmartCombobox
                        options={centroOptions}
                        value={institutionId}
                        onChange={setInstitutionId}
                        placeholder="Buscar centro..."
                        storageKey="amis_asistente_centros"
                    />
                </div>

                {/* 2. Médico */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <label className={labelCls}>
                            <span className="flex items-center gap-2"><Stethoscope className="w-3.5 h-3.5" /> Médico remitente <span className="text-danger">*</span></span>
                        </label>
                        <div className="flex items-center gap-1 p-1 bg-brand-bg rounded-xl border border-brand-border">
                            <button
                                type="button"
                                onClick={() => { setModoMedico('buscar'); setGenError(null); }}
                                className={cn(
                                    'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all',
                                    modoMedico === 'buscar' ? 'bg-brand-primary text-white shadow-sm' : 'text-brand-text/40 hover:text-brand-text'
                                )}
                            >
                                <Search className="w-3 h-3" /> Existente
                            </button>
                            <button
                                type="button"
                                onClick={() => { setModoMedico('nuevo'); setGenError(null); limpiarMedicoSel(); }}
                                className={cn(
                                    'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all',
                                    modoMedico === 'nuevo' ? 'bg-brand-primary text-white shadow-sm' : 'text-brand-text/40 hover:text-brand-text'
                                )}
                            >
                                <UserPlus className="w-3 h-3" /> Crear nuevo
                            </button>
                        </div>
                    </div>

                    {/* Buscar existente */}
                    {modoMedico === 'buscar' && (
                        <div className="relative">
                            {medicoSel ? (
                                <div className="flex items-center justify-between gap-3 px-4 py-3 bg-brand-bg border border-brand-primary/30 rounded-xl">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="w-9 h-9 rounded-xl bg-brand-primary/10 flex items-center justify-center flex-shrink-0">
                                            <Stethoscope className="w-4 h-4 text-brand-primary" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-bold text-brand-text truncate">{medicoSel.name} {medicoSel.lastName}</p>
                                            <p className="text-[10px] text-brand-text/40 truncate">
                                                {[medicoSel.specialty, medicoSel.email, medicoSel.hospitalName].filter(Boolean).join(' · ') || 'Médico externo'}
                                            </p>
                                        </div>
                                    </div>
                                    <button type="button" onClick={limpiarMedicoSel} className="p-1.5 hover:bg-brand-surface rounded-lg text-brand-text/30 hover:text-danger transition-colors flex-shrink-0">
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <div className="relative">
                                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-text/30" />
                                        <input
                                            value={busqueda}
                                            onChange={(e) => setBusqueda(e.target.value)}
                                            placeholder="Buscar por nombre, apellido o email (mín. 2 caracteres)..."
                                            className={cn(inputCls, 'pl-11')}
                                        />
                                        {buscando && <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-primary animate-spin" />}
                                    </div>
                                    {resultados.length > 0 && (
                                        <div className="absolute top-[calc(100%+0.5rem)] left-0 w-full bg-brand-surface border border-brand-border rounded-2xl shadow-2xl overflow-hidden z-[100] max-h-72 overflow-y-auto animate-in fade-in slide-in-from-top-2">
                                            {resultados.map(d => (
                                                <button
                                                    key={d.id}
                                                    type="button"
                                                    onClick={() => seleccionarMedico(d)}
                                                    className="w-full text-left px-4 py-3 hover:bg-brand-bg transition-colors flex flex-col border-b border-brand-border/40 last:border-b-0"
                                                >
                                                    <span className="text-sm font-bold text-brand-text">{d.name} {d.lastName}</span>
                                                    <span className="text-[10px] text-brand-text/40">
                                                        {[d.specialty, d.email, d.hospitalName].filter(Boolean).join(' · ') || 'Médico externo'}
                                                    </span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                    {busqueda.trim().length >= 2 && !buscando && resultados.length === 0 && (
                                        <p className="text-[11px] text-brand-text/40 px-1 pt-2">
                                            Sin coincidencias. Usa <button type="button" onClick={() => { setModoMedico('nuevo'); limpiarMedicoSel(); }} className="text-brand-primary font-bold underline">Crear nuevo</button> para registrarlo.
                                        </p>
                                    )}
                                </>
                            )}
                        </div>
                    )}

                    {/* Crear nuevo */}
                    {modoMedico === 'nuevo' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-5 bg-brand-bg/50 border border-brand-border rounded-2xl">
                            <div className="space-y-1.5">
                                <label className={labelCls}>Nombre <span className="text-danger">*</span></label>
                                <input value={nuevo.name} onChange={e => setNuevo(p => ({ ...p, name: e.target.value }))} className={inputCls} placeholder="Ej: Juan" />
                            </div>
                            <div className="space-y-1.5">
                                <label className={labelCls}>Apellido <span className="text-danger">*</span></label>
                                <input value={nuevo.last_name} onChange={e => setNuevo(p => ({ ...p, last_name: e.target.value }))} className={inputCls} placeholder="Ej: Pérez" />
                            </div>
                            <div className="space-y-1.5">
                                <label className={labelCls}>Teléfono <span className="text-danger">*</span></label>
                                <input value={nuevo.phone_number} onChange={e => setNuevo(p => ({ ...p, phone_number: e.target.value }))} className={inputCls} placeholder="+56 9 1234 5678" />
                            </div>
                            <div className="space-y-1.5">
                                <label className={labelCls}>Hospital / Institución de origen <span className="text-danger">*</span></label>
                                <input value={nuevo.hospital_name} onChange={e => setNuevo(p => ({ ...p, hospital_name: e.target.value }))} className={inputCls} placeholder="Ej: Hospital Regional" />
                            </div>
                            <div className="space-y-1.5">
                                <label className={labelCls}>Email</label>
                                <input type="email" value={nuevo.email} onChange={e => setNuevo(p => ({ ...p, email: e.target.value }))} className={inputCls} placeholder="medico@correo.cl" />
                            </div>
                            <div className="space-y-1.5">
                                <label className={labelCls}>Especialidad</label>
                                <input value={nuevo.specialty} onChange={e => setNuevo(p => ({ ...p, specialty: e.target.value }))} className={inputCls} placeholder="Ej: Radiología" />
                            </div>
                            <div className="space-y-1.5">
                                <label className={labelCls}>RUT</label>
                                <input value={nuevo.rut} onChange={e => setNuevo(p => ({ ...p, rut: e.target.value }))} className={inputCls} placeholder="12.345.678-9" />
                            </div>
                        </div>
                    )}
                </div>

                {/* Error de generación */}
                {genError && (
                    <div className="p-4 bg-danger/10 border border-danger/20 rounded-xl text-danger text-[11px] font-black uppercase tracking-widest flex items-center gap-3">
                        <div className="w-2 h-2 bg-danger rounded-full animate-pulse" />
                        {genError}
                    </div>
                )}

                {/* Botón generar */}
                <button
                    type="button"
                    onClick={handleGenerar}
                    disabled={!puedeGenerar}
                    className={cn(
                        'w-full py-4 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3',
                        puedeGenerar
                            ? 'bg-gradient-to-r from-brand-primary to-black text-white shadow-xl shadow-brand-primary/20 hover:scale-[1.01] active:scale-[0.99]'
                            : 'bg-brand-bg text-brand-text/20 cursor-not-allowed border border-brand-border'
                    )}
                >
                    {generando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    {generando ? 'Generando...' : 'Generar invitación'}
                </button>

                {/* Link generado */}
                {linkGenerado && (
                    <div className="p-6 bg-success/5 border border-success/20 rounded-2xl space-y-4 animate-in zoom-in-95 duration-300">
                        <div className="flex items-center gap-2 text-success">
                            <CheckCircle2 className="w-5 h-5" />
                            <h3 className="text-sm font-black uppercase tracking-widest">Invitación generada</h3>
                        </div>
                        <div className="flex items-center gap-2 px-4 py-3 bg-brand-bg border border-brand-border rounded-xl">
                            <LinkIcon className="w-4 h-4 text-brand-text/30 flex-shrink-0" />
                            <span className="text-[11px] text-brand-text/70 font-mono truncate flex-1">{linkGenerado}</span>
                            <button
                                type="button"
                                onClick={copiarLink}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-primary text-white rounded-lg text-[10px] font-black uppercase tracking-wider hover:brightness-110 transition-all flex-shrink-0"
                            >
                                {copiado ? <CheckCircle2 className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                {copiado ? 'Copiado' : 'Copiar link'}
                            </button>
                        </div>
                        <div className="flex items-start gap-2 text-[10px] text-brand-text/50 leading-relaxed">
                            <Info className="w-3.5 h-3.5 text-warning flex-shrink-0 mt-0.5" />
                            <p>
                                La app del médico (ruta <span className="font-mono text-brand-text/70">/m/:token</span>) aún no existe.
                                Este link funcionará cuando esa app se construya.
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* Lista de invitaciones recientes */}
            <div className="bg-brand-surface border border-brand-border rounded-[2rem] p-8 shadow-xl space-y-5">
                <div className="flex items-center gap-3 border-b border-brand-border pb-4">
                    <Users className="w-5 h-5 text-brand-primary" />
                    <h2 className="text-sm font-black text-brand-text/60 uppercase tracking-[0.2em]">Últimas invitaciones</h2>
                </div>

                {loading ? (
                    <div className="flex justify-center py-10">
                        <Loader2 className="w-6 h-6 text-brand-primary animate-spin" />
                    </div>
                ) : error ? (
                    <p className="text-center text-danger text-xs py-8">{error}</p>
                ) : invitaciones.length === 0 ? (
                    <p className="text-center text-brand-text/30 text-xs py-10 uppercase font-black tracking-widest">Aún no hay invitaciones generadas</p>
                ) : (
                    <div className="space-y-2">
                        {invitaciones.map(inv => (
                            <div key={inv.id} className="flex items-center justify-between gap-4 px-4 py-3 bg-brand-bg/50 border border-brand-border rounded-xl">
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-bold text-brand-text truncate">{inv.medico}</p>
                                    <p className="text-[10px] text-brand-text/40 truncate">{inv.centro}</p>
                                </div>
                                <span className={cn(
                                    'text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border flex-shrink-0',
                                    ESTADO_BADGE[inv.estado] || 'text-brand-text/40 bg-brand-bg border-brand-border'
                                )}>
                                    {inv.estado}
                                </span>
                                <span className="text-[10px] text-brand-text/40 font-mono flex-shrink-0 w-32 text-right">{fmtFecha(inv.creadaAt)}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
