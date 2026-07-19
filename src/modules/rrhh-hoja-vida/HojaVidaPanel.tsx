import React, { useState } from 'react';
import { Loader2, Ban, CornerDownRight, Plus, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useHojaVida, type TipoNota, type HojaVidaNota } from '../../hooks/useHojaVida';

// Panel INLINE de Hoja de Vida (bitácora RRHH). Se usa dentro de la pestaña
// "Hoja de Vida" de la ficha del profesional. Vive dentro de un <form> (el de
// la ficha), por eso TODOS los <button> llevan type="button": si no, dispararían
// el submit del formulario del profesional.
//
// persona_id = professionals.id (llega por props). El nombre de la persona lo
// pone la ficha en su propia cabecera; este panel no lo repite.

interface HojaVidaPanelProps {
    personaId: string;
}

const TIPO_META: Record<TipoNota, { label: string; color: string; bg: string; border: string }> = {
    positiva: { label: 'Positiva', color: '#3db3a0', bg: 'rgba(61,179,160,0.10)', border: 'rgba(61,179,160,0.25)' },
    negativa: { label: 'Negativa', color: '#c0392b', bg: 'rgba(192,57,43,0.10)', border: 'rgba(192,57,43,0.25)' },
    neutra:   { label: 'Neutra',   color: '#9a938c', bg: 'rgba(154,147,140,0.12)', border: 'rgba(154,147,140,0.30)' },
};

const fmtFechaHora = (iso: string) =>
    new Date(iso).toLocaleString('es-CL', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

const TipoBadge: React.FC<{ tipo: TipoNota }> = ({ tipo }) => {
    const m = TIPO_META[tipo];
    return (
        <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full border shrink-0"
            style={{ color: m.color, background: m.bg, borderColor: m.border }}>
            {m.label}
        </span>
    );
};

// Bloque de anulación (tachado + quién/cuándo/motivo).
const InfoAnulada: React.FC<{ nota: HojaVidaNota }> = ({ nota }) => (
    <p className="text-[10px] text-danger/80 font-bold mt-1.5 flex items-start gap-1">
        <Ban className="w-3 h-3 shrink-0 mt-px" />
        <span>
            Anulada por {nota.anuladaPorNombre || '—'}{nota.anuladaAt ? ` el ${fmtFechaHora(nota.anuladaAt)}` : ''}
            {nota.motivoAnulacion ? ` — motivo: ${nota.motivoAnulacion}` : ''}
        </span>
    </p>
);

// Modal chico para pedir el motivo de anulación (obligatorio).
const AnularPrompt: React.FC<{ onCancel: () => void; onConfirm: (motivo: string) => Promise<void>; saving: boolean }> = ({ onCancel, onConfirm, saving }) => {
    const [motivo, setMotivo] = useState('');
    return (
        <div className="fixed inset-0 z-[230] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onCancel}>
            <div className="w-full max-w-sm bg-brand-surface border border-brand-border rounded-2xl shadow-2xl p-5 space-y-3" onClick={(e) => e.stopPropagation()}>
                <p className="text-xs font-black uppercase tracking-widest text-brand-text flex items-center gap-1.5">
                    <Ban className="w-3.5 h-3.5 text-danger" /> Anular anotación
                </p>
                <p className="text-[11px] text-brand-text/50">La nota no se borra: queda tachada con este motivo. Es obligatorio.</p>
                <textarea value={motivo} onChange={(e) => setMotivo(e.target.value)} rows={3} autoFocus
                    placeholder="Motivo de la anulación..."
                    className="w-full bg-brand-bg border border-brand-border rounded-xl px-3 py-2 text-sm text-brand-text outline-none focus:border-brand-primary/40 resize-none" />
                <div className="flex gap-2">
                    <button type="button" onClick={onCancel} disabled={saving}
                        className="flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest border border-brand-border text-brand-text/50 hover:bg-brand-bg transition-all disabled:opacity-50">
                        Cancelar
                    </button>
                    <button type="button" onClick={() => onConfirm(motivo)} disabled={saving || !motivo.trim()}
                        className="flex-[2] flex items-center justify-center gap-1.5 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest bg-danger text-white disabled:opacity-50">
                        {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Ban className="w-3.5 h-3.5" />} Anular
                    </button>
                </div>
            </div>
        </div>
    );
};

// Una nota (con sus aclaratorias anidadas y sus acciones).
const NotaItem: React.FC<{
    nota: HojaVidaNota;
    onAnular: (id: string, motivo: string) => Promise<{ success: boolean; error?: string; rls?: boolean }>;
    onAclarar: (aclaraAId: string, texto: string) => Promise<{ success: boolean; error?: string; rls?: boolean }>;
    notify: (msg: string, ok: boolean) => void;
    esAclaratoria?: boolean;
}> = ({ nota, onAnular, onAclarar, notify, esAclaratoria }) => {
    const [mostrarAnular, setMostrarAnular] = useState(false);
    const [anulando, setAnulando] = useState(false);
    const [mostrarAclarar, setMostrarAclarar] = useState(false);
    const [textoAclara, setTextoAclara] = useState('');
    const [aclarando, setAclarando] = useState(false);

    const handleAnular = async (motivo: string) => {
        setAnulando(true);
        const res = await onAnular(nota.id, motivo);
        setAnulando(false);
        if (res.success) { setMostrarAnular(false); notify('Anotación anulada', true); }
        else notify(res.rls ? 'No tienes permisos para esta acción' : (res.error || 'No se pudo anular'), false);
    };

    const handleAclarar = async () => {
        if (!textoAclara.trim()) return;
        setAclarando(true);
        const res = await onAclarar(nota.id, textoAclara);
        setAclarando(false);
        if (res.success) { setTextoAclara(''); setMostrarAclarar(false); notify('Aclaratoria agregada', true); }
        else notify(res.rls ? 'No tienes permisos para esta acción' : (res.error || 'No se pudo aclarar'), false);
    };

    return (
        <div className={cn('rounded-xl border p-3', esAclaratoria ? 'bg-brand-bg/40 border-brand-border/60' : 'bg-brand-bg/60 border-brand-border')}>
            <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                        {esAclaratoria && <span className="text-[9px] font-black uppercase text-brand-text/40 flex items-center gap-1"><CornerDownRight className="w-3 h-3" /> Aclaratoria</span>}
                        <TipoBadge tipo={nota.tipo} />
                        <span className="text-[10px] text-brand-text/40">{nota.autorNombre} · {fmtFechaHora(nota.createdAt)}</span>
                    </div>
                    <p className={cn('text-sm text-brand-text/90 mt-1.5 whitespace-pre-wrap break-words', nota.anulada && 'line-through opacity-60')}>
                        {nota.texto}
                    </p>
                    {nota.anulada && <InfoAnulada nota={nota} />}
                </div>
            </div>

            {/* Acciones (solo notas no anuladas) */}
            {!nota.anulada && (
                <div className="flex items-center gap-3 mt-2">
                    <button type="button" onClick={() => setMostrarAnular(true)}
                        className="text-[10px] font-black uppercase tracking-widest text-brand-text/40 hover:text-danger transition-colors flex items-center gap-1">
                        <Ban className="w-3 h-3" /> Anular
                    </button>
                    <button type="button" onClick={() => setMostrarAclarar(v => !v)}
                        className="text-[10px] font-black uppercase tracking-widest text-brand-text/40 hover:text-brand-primary transition-colors flex items-center gap-1">
                        <CornerDownRight className="w-3 h-3" /> Aclarar
                    </button>
                </div>
            )}

            {/* Form de aclaratoria inline */}
            {mostrarAclarar && (
                <div className="mt-2 space-y-2">
                    <textarea value={textoAclara} onChange={(e) => setTextoAclara(e.target.value)} rows={2} autoFocus
                        placeholder="Aclaración o contexto adicional (se guarda como nota neutra ligada a esta)..."
                        className="w-full bg-brand-surface border border-brand-border rounded-lg px-3 py-2 text-xs text-brand-text outline-none focus:border-brand-primary/40 resize-none" />
                    <div className="flex gap-2">
                        <button type="button" onClick={() => { setMostrarAclarar(false); setTextoAclara(''); }}
                            className="flex-1 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border border-brand-border text-brand-text/50 hover:bg-brand-bg transition-all">
                            Cancelar
                        </button>
                        <button type="button" onClick={handleAclarar} disabled={aclarando || !textoAclara.trim()}
                            className="flex-[2] flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest bg-brand-primary text-white disabled:opacity-50">
                            {aclarando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />} Agregar aclaratoria
                        </button>
                    </div>
                </div>
            )}

            {/* Aclaratorias anidadas */}
            {nota.aclaratorias.length > 0 && (
                <div className="mt-2 pl-3 border-l-2 border-brand-border/60 space-y-2">
                    {nota.aclaratorias.map(a => (
                        <NotaItem key={a.id} nota={a} onAnular={onAnular} onAclarar={onAclarar} notify={notify} esAclaratoria />
                    ))}
                </div>
            )}

            {mostrarAnular && <AnularPrompt onCancel={() => setMostrarAnular(false)} onConfirm={handleAnular} saving={anulando} />}
        </div>
    );
};

// Hoja de Vida de una persona (bitácora de anotaciones): solo gerencia.
export const HojaVidaPanel: React.FC<HojaVidaPanelProps> = ({ personaId }) => {
    const { notas, loading, error, crearNota, anularNota } = useHojaVida(personaId);

    const [tipo, setTipo] = useState<TipoNota>('neutra');
    const [texto, setTexto] = useState('');
    const [guardando, setGuardando] = useState(false);
    const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

    const notify = (msg: string, ok: boolean) => { setToast({ msg, ok }); setTimeout(() => setToast(null), 3000); };

    const handleGuardar = async () => {
        if (!texto.trim()) { notify('Escribe el contenido de la anotación', false); return; }
        setGuardando(true);
        const res = await crearNota({ personaId, tipo, texto });
        setGuardando(false);
        if (res.success) { setTexto(''); setTipo('neutra'); notify('Anotación guardada', true); }
        else notify(res.rls ? 'No tienes permisos para esta acción' : (res.error || 'No se pudo guardar'), false);
    };

    const handleAclarar = (aclaraAId: string, textoAclara: string) =>
        crearNota({ personaId, tipo: 'neutra', texto: textoAclara, aclaraAId });

    return (
        <div className="space-y-5">
            {/* Nueva anotación */}
            <div className="p-4 bg-brand-bg border border-brand-border rounded-2xl space-y-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-brand-text/40">Nueva anotación</p>
                <div className="flex gap-2">
                    {(['positiva', 'negativa', 'neutra'] as TipoNota[]).map(t => {
                        const m = TIPO_META[t];
                        const activo = tipo === t;
                        return (
                            <button key={t} type="button" onClick={() => setTipo(t)}
                                className="flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all"
                                style={activo
                                    ? { color: '#fff', background: m.color, borderColor: m.color }
                                    : { color: m.color, background: m.bg, borderColor: m.border }}>
                                {m.label}
                            </button>
                        );
                    })}
                </div>
                <textarea value={texto} onChange={(e) => setTexto(e.target.value)} rows={3}
                    placeholder="Contenido de la anotación..."
                    className="w-full bg-brand-surface border border-brand-border rounded-xl px-3 py-2 text-sm text-brand-text outline-none focus:border-brand-primary/40 resize-none" />
                <button type="button" onClick={handleGuardar} disabled={guardando || !texto.trim()}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest bg-brand-primary text-white disabled:opacity-50 transition-all">
                    {guardando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Guardar anotación
                </button>
            </div>

            {/* Listado */}
            <div className="space-y-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-brand-text/40">Bitácora ({notas.length})</p>
                {loading ? (
                    <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 text-brand-primary animate-spin" /></div>
                ) : error ? (
                    <p className="text-center text-danger text-xs font-bold py-8">{error}</p>
                ) : notas.length === 0 ? (
                    <p className="text-center text-brand-text/30 text-xs py-10 uppercase font-black tracking-widest">Sin anotaciones</p>
                ) : (
                    <div className="space-y-2.5">
                        {notas.map(n => (
                            <NotaItem key={n.id} nota={n} onAnular={anularNota} onAclarar={handleAclarar} notify={notify} />
                        ))}
                    </div>
                )}
            </div>

            {toast && (
                <div className={cn(
                    'fixed bottom-4 right-4 z-[230] flex items-center gap-2 px-4 py-3 rounded-xl shadow-2xl border animate-in slide-in-from-bottom-4',
                    toast.ok ? 'bg-success/10 border-success/30 text-success' : 'bg-danger/10 border-danger/30 text-danger'
                )}>
                    {toast.ok ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                    <span className="text-xs font-bold">{toast.msg}</span>
                </div>
            )}
        </div>
    );
};
