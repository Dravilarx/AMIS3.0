import React, { useState } from 'react';
import { X, Plus, Trash2, Pencil, ChevronUp, ChevronDown, Loader2, Save, Info, FolderKanban } from 'lucide-react';
import { useNotionLinks, type NotionLink } from '../../hooks/useNotionLinks';

interface GestionarNotionLinksModalProps {
    onClose: () => void;
    onChanged: () => void; // refresca las pestañas del padre tras cualquier cambio
    notify: (msg: string, ok: boolean) => void;
}

const pareceUrlValida = (url: string) => /^https?:\/\/.+/i.test(url.trim());

// Pantalla de ajustes "Gestionar páginas de Notion" — solo Dirección (nivel 1),
// reforzado además por la propia RLS de notion_links (escritura nivel<=1).
export const GestionarNotionLinksModal: React.FC<GestionarNotionLinksModalProps> = ({ onClose, onChanged, notify }) => {
    const { links, loading, crearLink, actualizarLink, eliminarLink, moverLink } = useNotionLinks();

    const [nombreNuevo, setNombreNuevo] = useState('');
    const [urlNueva, setUrlNueva] = useState('');
    const [creando, setCreando] = useState(false);

    const [editandoId, setEditandoId] = useState<string | null>(null);
    const [editNombre, setEditNombre] = useState('');
    const [editUrl, setEditUrl] = useState('');
    const [guardandoEdit, setGuardandoEdit] = useState(false);

    const [moviendoId, setMoviendoId] = useState<string | null>(null);
    const [eliminandoId, setEliminandoId] = useState<string | null>(null);

    const reportarResultado = (res: { success: boolean; error?: string; rls?: boolean }, mensajeExito: string) => {
        if (res.success) {
            notify(mensajeExito, true);
            onChanged();
        } else {
            notify(res.rls ? 'No tienes permisos para esta acción' : (res.error || 'Ocurrió un error'), false);
        }
    };

    const handleCrear = async () => {
        if (!nombreNuevo.trim()) { notify('Ponle un nombre a la pestaña', false); return; }
        if (!pareceUrlValida(urlNueva)) { notify('La URL debe empezar con http:// o https://', false); return; }
        setCreando(true);
        const res = await crearLink(nombreNuevo, urlNueva);
        setCreando(false);
        if (res.success) { setNombreNuevo(''); setUrlNueva(''); }
        reportarResultado(res, 'Página agregada');
    };

    const iniciarEdicion = (l: NotionLink) => {
        setEditandoId(l.id);
        setEditNombre(l.nombre);
        setEditUrl(l.url);
    };

    const cancelarEdicion = () => setEditandoId(null);

    const handleGuardarEdicion = async (id: string) => {
        if (!editNombre.trim()) { notify('El nombre no puede quedar vacío', false); return; }
        if (!pareceUrlValida(editUrl)) { notify('La URL debe empezar con http:// o https://', false); return; }
        setGuardandoEdit(true);
        const res = await actualizarLink(id, { nombre: editNombre.trim(), url: editUrl.trim() });
        setGuardandoEdit(false);
        if (res.success) setEditandoId(null);
        reportarResultado(res, 'Página actualizada');
    };

    const handleEliminar = async (l: NotionLink) => {
        if (!window.confirm(`¿Eliminar la página "${l.nombre}"? Esto no borra nada en Notion, solo quita el acceso desde AMIS.`)) return;
        setEliminandoId(l.id);
        const res = await eliminarLink(l.id);
        setEliminandoId(null);
        reportarResultado(res, 'Página eliminada');
    };

    const handleMover = async (id: string, direccion: 'subir' | 'bajar') => {
        setMoviendoId(id);
        const res = await moverLink(id, direccion);
        setMoviendoId(null);
        if (res.success) onChanged();
        else notify(res.rls ? 'No tienes permisos para esta acción' : (res.error || 'No se pudo reordenar'), false);
    };

    return (
        <div className="fixed inset-0 z-[220] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
            <div className="w-full max-w-2xl max-h-[85vh] bg-brand-surface border border-brand-border rounded-3xl shadow-2xl overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between px-6 py-4 border-b border-brand-border shrink-0">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-brand-primary/10 flex items-center justify-center shrink-0">
                            <FolderKanban className="w-4.5 h-4.5 text-brand-primary" />
                        </div>
                        <div className="min-w-0">
                            <h3 className="text-sm font-black text-brand-text uppercase tracking-tight">Gestionar páginas de Notion</h3>
                            <p className="text-[10px] text-brand-text/40">Solo Dirección puede agregar, editar o quitar páginas</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-xl hover:bg-brand-bg text-brand-text/30 hover:text-brand-text transition-colors shrink-0">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-5">
                    {/* Ayuda */}
                    <div className="flex items-start gap-2 px-4 py-3 rounded-xl bg-brand-bg border border-brand-border text-brand-text/60">
                        <Info className="w-4 h-4 shrink-0 mt-0.5 text-info" />
                        <p className="text-[11px] font-bold leading-relaxed">
                            Para que una página de Notion se vea aquí dentro, en Notion debes abrirla → botón <span className="text-brand-text">Compartir</span> →
                            activar <span className="text-brand-text">"Compartir en la web"</span> → copiar ese enlace y pegarlo aquí.
                            Si no la compartes por web, solo funcionará el botón "Abrir en Notion".
                        </p>
                    </div>

                    {/* Agregar nueva */}
                    <div className="p-4 bg-brand-bg border border-brand-border rounded-2xl space-y-3">
                        <p className="text-[10px] font-black uppercase tracking-widest text-brand-text/40">Agregar página</p>
                        <div className="grid grid-cols-1 sm:grid-cols-[1fr_2fr] gap-2">
                            <input
                                value={nombreNuevo}
                                onChange={e => setNombreNuevo(e.target.value)}
                                placeholder="Nombre (ej: Proyectos y Tareas)"
                                className="px-3 py-2 text-xs rounded-xl border border-brand-border bg-brand-surface focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
                            />
                            <input
                                value={urlNueva}
                                onChange={e => setUrlNueva(e.target.value)}
                                placeholder="https://www.notion.so/..."
                                className="px-3 py-2 text-xs rounded-xl border border-brand-border bg-brand-surface focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
                            />
                        </div>
                        <button
                            onClick={handleCrear}
                            disabled={creando}
                            className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest bg-gradient-to-r from-brand-primary to-black text-white shadow-lg shadow-brand-primary/20 disabled:opacity-50"
                        >
                            {creando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                            Agregar
                        </button>
                    </div>

                    {/* Listado */}
                    <div className="space-y-2">
                        <p className="text-[10px] font-black uppercase tracking-widest text-brand-text/40">Páginas configuradas ({links.length})</p>
                        {loading ? (
                            <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 text-brand-primary animate-spin" /></div>
                        ) : links.length === 0 ? (
                            <p className="text-center text-brand-text/30 text-xs py-8 uppercase font-black tracking-widest">Sin páginas configuradas</p>
                        ) : (
                            <div className="space-y-2">
                                {links.map((l, i) => (
                                    <div key={l.id} className="p-3 bg-brand-bg/50 border border-brand-border rounded-xl">
                                        {editandoId === l.id ? (
                                            <div className="space-y-2">
                                                <input
                                                    value={editNombre}
                                                    onChange={e => setEditNombre(e.target.value)}
                                                    className="w-full px-3 py-2 text-xs rounded-lg border border-brand-border bg-brand-surface focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
                                                />
                                                <input
                                                    value={editUrl}
                                                    onChange={e => setEditUrl(e.target.value)}
                                                    className="w-full px-3 py-2 text-xs rounded-lg border border-brand-border bg-brand-surface focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
                                                />
                                                <div className="flex gap-2">
                                                    <button onClick={cancelarEdicion} className="flex-1 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border border-brand-border text-brand-text/50 hover:bg-brand-surface transition-all">
                                                        Cancelar
                                                    </button>
                                                    <button
                                                        onClick={() => handleGuardarEdicion(l.id)}
                                                        disabled={guardandoEdit}
                                                        className="flex-[2] flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest bg-brand-primary text-white disabled:opacity-50"
                                                    >
                                                        {guardandoEdit ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />} Guardar
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2">
                                                <div className="flex flex-col shrink-0">
                                                    <button
                                                        onClick={() => handleMover(l.id, 'subir')}
                                                        disabled={i === 0 || moviendoId === l.id}
                                                        className="p-0.5 rounded text-brand-text/30 hover:text-brand-primary disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                                                    >
                                                        <ChevronUp className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleMover(l.id, 'bajar')}
                                                        disabled={i === links.length - 1 || moviendoId === l.id}
                                                        className="p-0.5 rounded text-brand-text/30 hover:text-brand-primary disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                                                    >
                                                        <ChevronDown className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-xs font-bold text-brand-text truncate">{l.nombre}</p>
                                                    <p className="text-[10px] text-brand-text/30 truncate">{l.url}</p>
                                                </div>
                                                <div className="flex items-center gap-1 shrink-0">
                                                    <button onClick={() => iniciarEdicion(l)} title="Editar"
                                                        className="p-1.5 rounded-lg text-brand-text/30 hover:text-brand-primary hover:bg-brand-primary/10 transition-colors">
                                                        <Pencil className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button onClick={() => handleEliminar(l)} title="Eliminar" disabled={eliminandoId === l.id}
                                                        className="p-1.5 rounded-lg text-brand-text/30 hover:text-danger hover:bg-danger/10 transition-colors disabled:opacity-50">
                                                        {eliminandoId === l.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                                                    </button>
                                                </div>
                                            </div>
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
