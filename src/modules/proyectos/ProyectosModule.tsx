import React, { useState } from 'react';
import { FolderKanban, ExternalLink, FileText, Settings, Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useMyLevel } from '../../lib/accessLevels';
import { useNotionLinks } from '../../hooks/useNotionLinks';
import { GestionarNotionLinksModal } from './GestionarNotionLinksModal';

// Módulo "Proyectos": tarjetas-botón, una por página de Notion configurada.
// AMIS no lee ni entiende el contenido — cada tarjeta solo abre la página en
// una pestaña nueva. No se intenta embeber Notion (rechaza el iframe de forma
// inconsistente), por eso no hay visor interno.
export const ProyectosModule: React.FC = () => {
    const { level, loading: levelLoading } = useMyLevel();
    const { links, loading, refresh } = useNotionLinks();

    const [showGestionar, setShowGestionar] = useState(false);
    const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

    const showToast = (msg: string, ok: boolean) => {
        setToast({ msg, ok });
        setTimeout(() => setToast(null), 3500);
    };

    const abrirLink = (url: string) => window.open(url, '_blank', 'noopener,noreferrer');

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
                        <p className="text-[10px] text-brand-text/30 font-mono mt-1">Accesos directos a páginas de Notion</p>
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
                                <p className="text-brand-text/40 text-xs mt-1 max-w-sm">Agrega el enlace de una página compartida por web de Notion para acceder a ella aquí.</p>
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
                /* ── Cuadrícula de tarjetas ── */
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {links.map(l => (
                        <button
                            key={l.id}
                            onClick={() => abrirLink(l.url)}
                            title={l.nombre}
                            className={cn(
                                'group flex flex-col items-start justify-between text-left p-5 min-h-[120px] min-w-[220px]',
                                'bg-brand-surface border border-brand-border rounded-2xl shadow-sm',
                                'hover:border-brand-primary/40 hover:shadow-lg hover:shadow-brand-primary/10 hover:-translate-y-0.5',
                                'transition-all duration-200'
                            )}
                        >
                            <div className="w-10 h-10 rounded-xl bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center mb-3 group-hover:bg-brand-primary/20 transition-colors">
                                <FileText className="w-5 h-5 text-brand-primary" />
                            </div>
                            <div className="w-full">
                                <p className="text-base font-black text-brand-text leading-tight truncate">{l.nombre}</p>
                                <p className="flex items-center gap-1 text-[11px] text-brand-text/40 font-bold mt-1 group-hover:text-brand-primary transition-colors">
                                    Abrir en Notion <ExternalLink className="w-3 h-3" />
                                </p>
                            </div>
                        </button>
                    ))}
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
