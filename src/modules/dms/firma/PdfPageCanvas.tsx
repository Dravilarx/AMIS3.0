import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { Loader2 } from 'lucide-react';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

// Carga un PDF (bytes ya descargados vía URL firmada) con pdfjs.
export const usePdfDocument = (bytes: ArrayBuffer | null) => {
    const [pdf, setPdf] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        if (!bytes) { setLoading(false); return; }
        setLoading(true);
        // pdfjs consume/transfiere el ArrayBuffer; se copia para no mutar el original.
        pdfjsLib.getDocument({ data: bytes.slice(0) }).promise
            .then(doc => { if (!cancelled) { setPdf(doc); setLoading(false); } })
            .catch(err => { console.error('Error cargando PDF:', err); if (!cancelled) { setError('No se pudo cargar el PDF'); setLoading(false); } });
        return () => { cancelled = true; };
    }, [bytes]);

    return { pdf, numPages: pdf?.numPages || 0, loading, error };
};

interface PdfPageCanvasProps {
    pdf: any;
    pageNum: number; // 1-based
    onRendered?: (sizePx: { width: number; height: number }) => void;
    children?: React.ReactNode; // overlays posicionados en fracciones sobre la página
}

// Renderiza UNA página a un tamaño fijo y expone su tamaño en píxeles CSS
// (idéntico al canvas mostrado) para que los overlays de fracción 0-1 calcen
// exactamente, sin importar el zoom/DPI interno de renderizado.
export const PdfPageCanvas: React.FC<PdfPageCanvasProps> = ({ pdf, pageNum, onRendered, children }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [rendering, setRendering] = useState(true);
    const [sizePx, setSizePx] = useState<{ width: number; height: number } | null>(null);

    const render = useCallback(async () => {
        if (!pdf || !canvasRef.current) return;
        setRendering(true);
        try {
            const page = await pdf.getPage(pageNum);
            const scale = 1.6; // buena resolución sin ser excesivamente pesado
            const viewport = page.getViewport({ scale });
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            await page.render({ canvasContext: ctx, viewport }).promise;
            const size = { width: viewport.width, height: viewport.height };
            setSizePx(size);
            onRendered?.(size);
        } catch (err) {
            console.error(`Error renderizando página ${pageNum}:`, err);
        } finally {
            setRendering(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pdf, pageNum]);

    useEffect(() => { render(); }, [render]);

    return (
        <div className="relative inline-block select-none" style={sizePx ? { width: sizePx.width, height: sizePx.height } : undefined}>
            <canvas ref={canvasRef} className="block max-w-full h-auto border border-brand-border rounded-lg shadow-sm" />
            {rendering && (
                <div className="absolute inset-0 flex items-center justify-center bg-brand-surface/80">
                    <Loader2 className="w-6 h-6 text-brand-primary animate-spin" />
                </div>
            )}
            {!rendering && sizePx && children}
        </div>
    );
};
