import React, { useState, useEffect, useRef, useMemo } from 'react';
import { FolderKanban, ExternalLink, Settings, Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useMyLevel } from '../../lib/accessLevels';
import { useNotionLinks } from '../../hooks/useNotionLinks';
import { GestionarNotionLinksModal } from './GestionarNotionLinksModal';

// Módulo "Proyectos": muestra páginas de Notion embebidas dentro de AMIS vía
// iframe. AMIS no lee ni entiende el contenido — solo lo presenta. El usuario
// trabaja directamente en el Notion embebido.
export const ProyectosModule: React.FC = () => {
    const { level, loading: levelLoading } = useMyLevel();
    const { links, loading, refresh } = useNotionLinks();

    const [activeId, setActiveId] = useState<string | null>(null);
    const [showGestionar, setShowGestionar] = useState(false);
    const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

    const showToast = (msg: string, ok: boolean) => {
        setToast({ msg, ok });
        setTimeout(() => setToast(null), 3500);
    };

    // La pestaña activa se mantiene si sigue existiendo tras un cambio en la
    // lista; si no, cae a la primera.
    useEffect(() => {
        if (links.length === 0) { setActiveId(null); return; }
        if (!activeId || !links.some(l => l.id === activeId)) {
            setActiveId(links[0].id);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [links]);

    const activeLink = useMemo(() => links.find(l => l.id === activeId) || null, [links, activeId]);

    // Detección best-effort de fallo de embebido (X-Frame-Options bloqueando la
    // página): no hay forma 100% confiable desde el frontend, así que se combina
    // onError con un timeout de carga; el botón "Abrir en Notion" SIEMPRE está
    // visible como salida, sin depender de que la detección acierte.
    const [posibleFallo, setPosibleFallo] = useState(false);
    const loadedRef = useRef(false);

    useEffect(() => {
        loadedRef.current = false;
        setPosibleFallo(false);
        if (!activeLink) return;
        const t = setTimeout(() => { if (!loadedRef.current) setPosibleFallo(true); }, 6000);
        return () => clearTimeout(t);
    }, [activeLink?.url]);

    const handleIframeLoad = () => { loadedRef.current = true; setPosibleFallo(false); };
    const handleIframeError = () => { setPosibleFallo(true); };

    if (levelLoading || loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
                <Loader2 className="w-10 h-10 text-brand-primary animate-spin" />
                <p className="text-brand-text/30 text-xs font-mono animate-pulse">Cargando Proyectos...</p>
            </div>
        );
    }

    return (
        <div className="space-y-4 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-brand-primary to-black flex items-center justify-center shadow-lg shadow-brand-primary/20 shrink-0">
                        <FolderKanban className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-brand-text uppercase tracking-tighter leading-none">Proyectos</h2>
                        <p className="text-[10px] text-brand-text/30 font-mono mt-1">Páginas de Notion embebidas</p>
                    </div>
                </div>
                {level <= 1 && links.length > 0 && (
                    <button
                        onClick={() => setShowGestionar(true)}
                        className="flex items-center gap-2 px-3 py-2 bg-brand-surface border border-brand-border rounded-xl text-xs font-bold uppercase text-brand-text hover:bg-brand-primary/10 transition-all"
                    >
                        <Settings className="w-3.5 h-3.5 text-brand-primary" /> Gestionar páginas
                    </button>
                )}
            </div>

            {links.length === 0 ? (
                /* ── Estado vacío ── */
                <div className="card-premium flex flex-col items-center justify-center text-center py-20 gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center">
                        <FolderKanban className="w-8 h-8 text-brand-primary" />
                    </div>
                    {level <= 1 ? (
                        <>
                            <div>
                                <p className="text-brand-text font-bold text-sm">Aún no hay páginas de Notion configuradas</p>
                                <p className="text-brand-text/40 text-xs mt-1 max-w-sm">Agrega el enlace de una página compartida por web de Notion para verla aquí dentro.</p>
                            </div>
                            <button
                                onClick={() => setShowGestionar(true)}
                                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest bg-gradient-to-r from-brand-primary to-black text-white shadow-lg shadow-brand-primary/20"
                            >
                                Agregar primera página de Notion
                            </button>
                        </>
                    ) : (
                        <p className="text-brand-text/40 text-sm max-w-sm">Aún no hay páginas configuradas. Pídele a Dirección que agregue una.</p>
                    )}
                </div>
            ) : (
                /* ── Pestañas + visor ── */
                <div className="space-y-3">
                    <div className="flex items-center gap-2 flex-wrap border-b border-brand-border pb-2">
                        {links.map(l => (
                            <button
                                key={l.id}
                                onClick={() => setActiveId(l.id)}
                                className={cn(
                                    'px-4 py-2 rounded-t-xl text-xs font-bold uppercase tracking-wide transition-all truncate max-w-[220px]',
                                    activeId === l.id
                                        ? 'bg-brand-primary text-white shadow-md'
                                        : 'bg-brand-surface text-brand-text/50 hover:text-brand-text hover:bg-brand-primary/5'
                                )}
                                title={l.nombre}
                            >
                                {l.nombre}
                            </button>
                        ))}
                    </div>

                    {activeLink && (
                        <div className="space-y-2">
                            <div className="flex items-center justify-between gap-2">
                                {posibleFallo ? (
                                    <p className="flex items-center gap-1.5 text-[11px] font-bold text-warning">
                                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                                        Esta página puede no permitirse mostrar embebida. Si la ves en blanco, usa "Abrir en Notion".
                                    </p>
                                ) : <span />}
                                <a
                                    href={activeLink.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-surface border border-brand-border rounded-lg text-[11px] font-bold text-brand-text hover:bg-brand-primary/10 transition-all shrink-0"
                                >
                                    <ExternalLink className="w-3.5 h-3.5" /> Abrir en Notion
                                </a>
                            </div>

                            <div
                                className="w-full rounded-2xl border border-brand-border overflow-hidden bg-brand-surface shadow-xl"
                                style={{ height: 'calc(100vh - 320px)', minHeight: '480px' }}
                            >
                                <iframe
                                    key={activeLink.id}
                                    src={activeLink.url}
                                    title={activeLink.nombre}
                                    className="w-full h-full border-0"
                                    sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
                                    onLoad={handleIframeLoad}
                                    onError={handleIframeError}
                                />
                            </div>
                        </div>
                    )}
                </div>
            )}

            {showGestionar && (
                <GestionarNotionLinksModal
                    onClose={() => setShowGestionar(false)}
                    onChanged={refresh}
                    notify={showToast}
                />
            )}

            {toast && (
                <div className={cn(
                    'fixed bottom-6 right-6 z-[300] flex items-center gap-2 px-4 py-3 rounded-xl shadow-2xl border animate-in slide-in-from-bottom-4',
                    toast.ok ? 'bg-success/10 border-success/30 text-success' : 'bg-danger/10 border-danger/30 text-danger'
                )}>
                    {toast.ok ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                    <span className="text-xs font-bold">{toast.msg}</span>
                </div>
            )}
        </div>
    );
};
