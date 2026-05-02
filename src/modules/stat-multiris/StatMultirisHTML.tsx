import React, { useState } from 'react';
import { Globe, ExternalLink, RefreshCw, Maximize2, Minimize2 } from 'lucide-react';

export const StatMultirisHTML: React.FC = () => {
    const [iframeKey, setIframeKey] = useState(0);
    const [isFullscreen, setIsFullscreen] = useState(false);

    const handleRefresh = () => setIframeKey(prev => prev + 1);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-primary to-black shadow-xl shadow-orange-500/20 flex items-center justify-center">
                        <Globe className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-brand-text tracking-tight">
                            Stat Multiris <span className="text-brand-primary">(HTML)</span>
                        </h1>
                        <p className="text-xs text-brand-text/40 font-semibold uppercase tracking-widest mt-0.5">
                            Vista web embebida · Modo Prueba Paralela
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {/* Pill de estado */}
                    <div className="flex items-center gap-2 px-4 py-2 bg-brand-surface border border-brand-border rounded-2xl">
                        <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                        <span className="text-xs font-bold text-brand-text/60 uppercase tracking-widest">En Vivo</span>
                    </div>

                    <button
                        onClick={handleRefresh}
                        className="p-3 bg-brand-surface border border-brand-border rounded-2xl hover:border-brand-primary/30 hover:text-brand-primary text-brand-text/40 transition-all group"
                        title="Recargar iframe"
                    >
                        <RefreshCw className="w-4 h-4 group-hover:rotate-180 transition-transform duration-500" />
                    </button>

                    <button
                        onClick={() => setIsFullscreen(prev => !prev)}
                        className="p-3 bg-brand-surface border border-brand-border rounded-2xl hover:border-brand-primary/30 hover:text-brand-primary text-brand-text/40 transition-all"
                        title={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
                    >
                        {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                    </button>

                    <a
                        href="https://example.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-3 bg-brand-surface border border-brand-border rounded-2xl hover:border-brand-primary/30 hover:text-brand-primary text-brand-text/40 transition-all"
                        title="Abrir en pestaña nueva"
                    >
                        <ExternalLink className="w-4 h-4" />
                    </a>
                </div>
            </div>

            {/* Grid contenedor — arquitectura lista para 1 o 2 iframes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* Tarjeta principal — ocupa todo el ancho */}
                <div className="col-span-full bg-brand-surface border border-brand-border rounded-3xl shadow-2xl shadow-black/20 overflow-hidden transition-all duration-300">

                    {/* Barra de URL decorativa */}
                    <div className="flex items-center gap-3 px-5 py-3.5 border-b border-brand-border bg-brand-bg/50">
                        <div className="flex items-center gap-1.5">
                            <div className="w-3 h-3 rounded-full bg-danger/60" />
                            <div className="w-3 h-3 rounded-full bg-warning/60" />
                            <div className="w-3 h-3 rounded-full bg-success/60" />
                        </div>
                        <div className="flex-1 flex items-center gap-2 bg-brand-surface border border-brand-border rounded-xl px-4 py-1.5 ml-2">
                            <Globe className="w-3 h-3 text-brand-text/30 flex-shrink-0" />
                            <span className="text-xs text-brand-text/40 font-mono truncate select-none">
                                https://example.com
                            </span>
                        </div>
                    </div>

                    {/* iFrame */}
                    <iframe
                        key={iframeKey}
                        src="https://example.com"
                        title="Dashboard Estadísticas"
                        className="w-full border-0"
                        style={{ minHeight: isFullscreen ? 'calc(100vh - 220px)' : '700px' }}
                        allow="fullscreen"
                        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                    />
                </div>

            </div>

            {/* Footer informativo */}
            <div className="flex items-center justify-between text-[11px] text-brand-text/30 px-1">
                <span className="font-semibold uppercase tracking-widest">
                    🧪 Modo Shadowing — El módulo original Stat Multiris permanece intacto
                </span>
                <span className="font-mono">
                    iframe · sandbox activo
                </span>
            </div>
        </div>
    );
};
