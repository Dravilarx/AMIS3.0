import React, { useState, useEffect, useRef } from 'react';
import { Loader2, ExternalLink, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useSignedUrl } from '../../lib/storageUrls';

interface PDFPreviewHoverProps {
    url:      string;   // ruta interna del bucket documents (o URL heredada)
    title:    string;
    children: React.ReactNode;
}

export const PDFPreviewHover: React.FC<PDFPreviewHoverProps> = ({ url, title, children }) => {
    const [showPreview, setShowPreview]   = useState(false);
    const [isLoading,   setIsLoading]     = useState(false);
    const [previewMode, setPreviewMode]   = useState<'hover' | 'modal'>('hover');
    const timerRef                        = useRef<ReturnType<typeof setTimeout> | null>(null);
    const containerRef                    = useRef<HTMLDivElement>(null);

    // La detección de tipo usa la ruta/URL original (conserva la extensión);
    // el src real de render es la URL firmada del bucket privado.
    const { url: signedUrl } = useSignedUrl(url);

    const isPDF   = url.toLowerCase().includes('.pdf') ||
                    url.toLowerCase().includes('pdf');
    const isImage = /\.(jpg|jpeg|png|webp|gif)(\?|$)/i.test(url);
    const isHTML  = url.toLowerCase().includes('.html');

    const canPreview = isPDF || isImage || isHTML;

    const handleMouseEnter = () => {
        if (!canPreview) return;
        timerRef.current = setTimeout(() => {
            setIsLoading(true);
            setShowPreview(true);
            setPreviewMode('hover');
        }, 600);
    };

    const handleMouseLeave = () => {
        if (timerRef.current) clearTimeout(timerRef.current);
        if (previewMode === 'hover') setShowPreview(false);
    };

    const handleClick = (e: React.MouseEvent) => {
        if (!canPreview) return;
        e.preventDefault();
        e.stopPropagation();
        setShowPreview(true);
        setPreviewMode('modal');
        setIsLoading(true);
    };

    useEffect(() => {
        return () => { if (timerRef.current) clearTimeout(timerRef.current); };
    }, []);

    return (
        <>
            <div
                ref={containerRef}
                className="relative cursor-pointer"
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                onClick={handleClick}
            >
                {children}

                {/* Hover preview */}
                {showPreview && previewMode === 'hover' && (
                    <div className={cn(
                        'absolute z-50 left-1/2 -translate-x-1/2 bottom-full mb-3',
                        'w-72 h-96 bg-brand-surface border border-brand-border rounded-2xl overflow-hidden shadow-2xl',
                        'animate-in fade-in zoom-in-95 duration-200 pointer-events-none'
                    )}>
                        {isLoading && (
                            <div className="absolute inset-0 flex items-center justify-center bg-brand-surface z-10">
                                <Loader2 className="w-6 h-6 text-brand-primary animate-spin" />
                            </div>
                        )}
                        <iframe
                            src={signedUrl ? (isPDF ? `${signedUrl}#toolbar=0&navpanes=0` : signedUrl) : undefined}
                            className="w-full h-full border-0"
                            title={title}
                            onLoad={() => setIsLoading(false)}
                        />
                        <div className="absolute bottom-0 left-0 right-0 px-3 py-2 bg-gradient-to-t from-brand-bg to-transparent">
                            <p className="text-[9px] font-bold text-brand-text/40 uppercase tracking-widest truncate">{title}</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Modal fullscreen */}
            {showPreview && previewMode === 'modal' && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="w-full max-w-5xl h-[90vh] bg-brand-surface border border-brand-border rounded-3xl overflow-hidden flex flex-col shadow-2xl">
                        {/* Header */}
                        <div className="flex items-center justify-between px-5 py-3 border-b border-brand-border flex-shrink-0">
                            <p className="text-sm font-bold text-brand-text truncate flex-1">{title}</p>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => signedUrl && window.open(signedUrl, '_blank')}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-surface border border-brand-border rounded-lg text-xs font-bold text-brand-text hover:bg-brand-primary/10 transition-all"
                                >
                                    <ExternalLink className="w-3.5 h-3.5" /> Abrir
                                </button>
                                <button
                                    onClick={() => { setShowPreview(false); setIsLoading(false); }}
                                    className="p-2 rounded-xl hover:bg-brand-surface text-brand-text/40 hover:text-brand-text transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* Visor */}
                        <div className="flex-1 relative overflow-hidden">
                            {isLoading && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center bg-brand-surface z-10 gap-3">
                                    <Loader2 className="w-8 h-8 text-brand-primary animate-spin" />
                                    <p className="text-xs text-brand-text/30 animate-pulse">Cargando documento...</p>
                                </div>
                            )}
                            {isImage ? (
                                <img
                                    src={signedUrl || undefined}
                                    alt={title}
                                    className="w-full h-full object-contain"
                                    onLoad={() => setIsLoading(false)}
                                />
                            ) : (
                                <iframe
                                    src={signedUrl ? (isPDF ? `${signedUrl}#toolbar=1&navpanes=1` : signedUrl) : undefined}
                                    className="w-full h-full border-0"
                                    title={title}
                                    onLoad={() => setIsLoading(false)}
                                />
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};
