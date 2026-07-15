import React, { useState } from 'react';
import { X, Mailbox, Plus, Ban, Copy, Loader2, AlertTriangle, Check, KeyRound } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useUploadLinks } from '../../hooks/useUploadLinks';
import { timeAgo } from '../../lib/timeAgo';
import type { DocumentFolder } from '../../hooks/useFolders';

interface BuzonesAdminModalProps {
    folders: DocumentFolder[];
    onClose: () => void;
    notify: (msg: string, ok: boolean) => void;
}

const pinValido = (v: string) => /^\d{4,6}$/.test(v);

// Administración de "Buzones de subida externa": crear/listar/revocar links
// secretos + PIN para que terceros sin cuenta suban archivos a una carpeta
// puntual del Archivo Digital. Solo nivel <= 2 (verificado además por RLS).
export const BuzonesAdminModal: React.FC<BuzonesAdminModalProps> = ({ folders, onClose, notify }) => {
    const { links, loading, crearBuzon, revocarBuzon } = useUploadLinks();

    const [mostrarForm, setMostrarForm] = useState(false);
    const [etiqueta, setEtiqueta] = useState('');
    const [folderId, setFolderId] = useState(folders[0]?.id || '');
    const [pin, setPin] = useState('');
    const [pinConfirm, setPinConfirm] = useState('');
    const [creando, setCreando] = useState(false);
    const [linkCreado, setLinkCreado] = useState<{ etiqueta: string; url: string } | null>(null);
    const [copiado, setCopiado] = useState(false);
    const [revocandoId, setRevocandoId] = useState<string | null>(null);

    const resetForm = () => {
        setEtiqueta('');
        setFolderId(folders[0]?.id || '');
        setPin('');
        setPinConfirm('');
    };

    const handleCrear = async () => {
        if (!etiqueta.trim()) { notify('Ponle una etiqueta al buzón', false); return; }
        if (!folderId) { notify('Elige una carpeta destino', false); return; }
        if (!pinValido(pin)) { notify('La clave debe tener 4 a 6 dígitos', false); return; }
        if (pin !== pinConfirm) { notify('Las claves no coinciden', false); return; }

        setCreando(true);
        const res = await crearBuzon(etiqueta, folderId, pin);
        setCreando(false);

        if (res.success && res.token) {
            const url = `${window.location.origin}/buzon/${res.token}`;
            setLinkCreado({ etiqueta: etiqueta.trim(), url });
            resetForm();
            setMostrarForm(false);
        } else {
            notify(res.rls ? 'No tienes permisos para esta acción' : (res.error || 'No se pudo crear el buzón'), false);
        }
    };

    const handleCopiar = async (url: string) => {
        try {
            await navigator.clipboard.writeText(url);
            setCopiado(true);
            setTimeout(() => setCopiado(false), 2000);
        } catch {
            notify('No se pudo copiar. Selecciona y copia el link manualmente.', false);
        }
    };

    const handleRevocar = async (id: string, etiqueta: string) => {
        if (!window.confirm(`¿Revocar el buzón "${etiqueta}"? El link deja de funcionar de inmediato — quien lo tenga ya no podrá subir nada.`)) return;
        setRevocandoId(id);
        const res = await revocarBuzon(id);
        setRevocandoId(null);
        if (res.success) notify('Buzón revocado', true);
        else notify(res.rls ? 'No tienes permisos para esta acción' : (res.error || 'No se pudo revocar'), false);
    };

    return (
        <div className="fixed inset-0 z-[210] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
            <div className="w-full max-w-2xl max-h-[85vh] bg-brand-surface border border-brand-border rounded-3xl shadow-2xl overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between px-6 py-4 border-b border-brand-border shrink-0">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-brand-primary/10 flex items-center justify-center shrink-0">
                            <Mailbox className="w-4.5 h-4.5 text-brand-primary" />
                        </div>
                        <div className="min-w-0">
                            <h3 className="text-sm font-black text-brand-text uppercase tracking-tight">Buzones de subida externa</h3>
                            <p className="text-[10px] text-brand-text/40">Links + clave para que terceros sin cuenta suban archivos</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-xl hover:bg-brand-bg text-brand-text/30 hover:text-brand-text transition-colors shrink-0">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-5">
                    {/* Link recién creado */}
                    {linkCreado && (
                        <div className="p-4 bg-success/5 border border-success/20 rounded-2xl space-y-3">
                            <p className="text-[11px] font-black uppercase tracking-widest text-success flex items-center gap-1.5">
                                <Check className="w-3.5 h-3.5" /> Buzón "{linkCreado.etiqueta}" creado
                            </p>
                            <div className="flex items-center gap-2">
                                <input readOnly value={linkCreado.url} onFocus={(e) => e.target.select()}
                                    className="flex-1 bg-brand-bg border border-brand-border rounded-lg px-3 py-2 text-xs font-mono text-brand-text outline-none" />
                                <button onClick={() => handleCopiar(linkCreado.url)}
                                    className="flex items-center gap-1.5 px-3 py-2 bg-brand-primary text-white rounded-lg text-[10px] font-black uppercase tracking-widest shrink-0">
                                    {copiado ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />} {copiado ? 'Copiado' : 'Copiar link'}
                                </button>
                            </div>
                            <p className="flex items-start gap-1.5 text-[10px] font-bold text-warning/90 leading-relaxed">
                                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                                Guarda este link. La clave NO se puede recuperar después: si se te olvida, revoca el buzón y crea uno nuevo.
                            </p>
                            <button onClick={() => setLinkCreado(null)} className="text-[10px] font-black uppercase text-brand-text/40 hover:text-brand-text transition-colors">
                                Cerrar aviso
                            </button>
                        </div>
                    )}

                    {/* Crear buzón */}
                    {mostrarForm ? (
                        <div className="p-4 bg-brand-bg border border-brand-border rounded-2xl space-y-3">
                            <p className="text-[10px] font-black uppercase tracking-widest text-brand-text/40">Nuevo buzón</p>
                            <div className="space-y-1.5">
                                <label className="text-[10px] text-brand-text/40 uppercase font-black tracking-widest ml-1">Etiqueta</label>
                                <input value={etiqueta} onChange={(e) => setEtiqueta(e.target.value)} placeholder="Ej: Abogado externo"
                                    className="w-full bg-brand-surface border border-brand-border rounded-xl px-3 py-2 text-sm text-brand-text outline-none focus:border-brand-primary/40" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] text-brand-text/40 uppercase font-black tracking-widest ml-1">Carpeta destino</label>
                                <select value={folderId} onChange={(e) => setFolderId(e.target.value)}
                                    className="w-full bg-brand-surface border border-brand-border rounded-xl px-3 py-2 text-sm text-brand-text outline-none appearance-none">
                                    {folders.length === 0 && <option value="">Sin carpetas disponibles</option>}
                                    {folders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] text-brand-text/40 uppercase font-black tracking-widest ml-1 flex items-center gap-1">
                                        <KeyRound className="w-3 h-3" /> Clave (4-6 dígitos)
                                    </label>
                                    <input type="text" inputMode="numeric" value={pin} maxLength={6}
                                        onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                                        className="w-full bg-brand-surface border border-brand-border rounded-xl px-3 py-2 text-sm text-brand-text outline-none focus:border-brand-primary/40 tracking-widest" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] text-brand-text/40 uppercase font-black tracking-widest ml-1">Confirmar clave</label>
                                    <input type="text" inputMode="numeric" value={pinConfirm} maxLength={6}
                                        onChange={(e) => setPinConfirm(e.target.value.replace(/\D/g, ''))}
                                        className="w-full bg-brand-surface border border-brand-border rounded-xl px-3 py-2 text-sm text-brand-text outline-none focus:border-brand-primary/40 tracking-widest" />
                                </div>
                            </div>
                            <div className="flex gap-2 pt-1">
                                <button onClick={() => { setMostrarForm(false); resetForm(); }}
                                    className="flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest border border-brand-border text-brand-text/50 hover:bg-brand-surface transition-all">
                                    Cancelar
                                </button>
                                <button onClick={handleCrear} disabled={creando}
                                    className="flex-[2] flex items-center justify-center gap-2 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest bg-brand-primary text-white disabled:opacity-50">
                                    {creando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />} Crear buzón
                                </button>
                            </div>
                        </div>
                    ) : (
                        <button onClick={() => setMostrarForm(true)}
                            className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-brand-border rounded-2xl text-[11px] font-black uppercase tracking-widest text-brand-text/40 hover:border-brand-primary/40 hover:text-brand-primary transition-all">
                            <Plus className="w-4 h-4" /> Crear buzón
                        </button>
                    )}

                    {/* Listado */}
                    <div className="space-y-2">
                        <p className="text-[10px] font-black uppercase tracking-widest text-brand-text/40">Buzones existentes ({links.length})</p>
                        {loading ? (
                            <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 text-brand-primary animate-spin" /></div>
                        ) : links.length === 0 ? (
                            <p className="text-center text-brand-text/30 text-xs py-8 uppercase font-black tracking-widest">Sin buzones creados</p>
                        ) : (
                            <div className="space-y-2">
                                {links.map(l => (
                                    <div key={l.id} className="p-3 bg-brand-bg/50 border border-brand-border rounded-xl flex items-center gap-3">
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2">
                                                <p className="text-xs font-bold text-brand-text truncate">{l.etiqueta}</p>
                                                <span className={cn(
                                                    'text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full shrink-0',
                                                    l.activo ? 'bg-success/10 text-success' : 'bg-brand-text/10 text-brand-text/40'
                                                )}>
                                                    {l.activo ? 'Activo' : 'Revocado'}
                                                </span>
                                            </div>
                                            <p className="text-[10px] text-brand-text/40 truncate">
                                                {l.folderName} · {l.uploadsCount} archivo{l.uploadsCount === 1 ? '' : 's'} recibido{l.uploadsCount === 1 ? '' : 's'}
                                                {l.lastUsedAt && ` · último uso ${timeAgo(l.lastUsedAt)}`}
                                            </p>
                                            <p className="text-[9px] text-brand-text/25 truncate">
                                                Creado por {l.createdByName || '—'} · {timeAgo(l.createdAt)}
                                            </p>
                                        </div>
                                        {l.activo && (
                                            <button onClick={() => handleRevocar(l.id, l.etiqueta)} disabled={revocandoId === l.id} title="Revocar"
                                                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-danger/30 text-danger hover:bg-danger/10 transition-all text-[10px] font-black uppercase tracking-widest shrink-0 disabled:opacity-50">
                                                {revocandoId === l.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Ban className="w-3.5 h-3.5" />} Revocar
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
