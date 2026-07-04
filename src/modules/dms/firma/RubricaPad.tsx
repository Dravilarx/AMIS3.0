import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Eraser, Save, Loader2, PenTool } from 'lucide-react';
import { cn } from '../../../lib/utils';

interface RubricaPadProps {
    onGuardar: (blob: Blob) => Promise<{ success: boolean; error?: string }>;
    onGuardado?: () => void;
    compact?: boolean;
}

const CANVAS_W = 900;
const CANVAS_H = 310; // ~40% más alto que la versión anterior (220 → 310)
const PADDING = 12; // margen alrededor del recorte final

interface Punto { x: number; y: number }

// Canvas de firma: trazo con Pointer Events (mouse + touch + lápiz en un solo
// código), recorte al bounding box del dibujo y exportación a PNG transparente.
export const RubricaPad: React.FC<RubricaPadProps> = ({ onGuardar, onGuardado, compact }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const drawingRef = useRef(false);
    const lastPointRef = useRef<Punto | null>(null);
    const boundsRef = useRef<{ minX: number; minY: number; maxX: number; maxY: number } | null>(null);

    const [hasDrawn, setHasDrawn] = useState(false);
    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        canvas.width = CANVAS_W;
        canvas.height = CANVAS_H;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.clearRect(0, 0, CANVAS_W, CANVAS_H); // fondo transparente (no rellenar)
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.lineWidth = 2.75;
            ctx.strokeStyle = '#1a1a1a';
        }
    }, []);

    const getLocalPoint = (e: React.PointerEvent<HTMLCanvasElement>): Punto => {
        const rect = canvasRef.current!.getBoundingClientRect();
        return {
            x: ((e.clientX - rect.left) / rect.width) * CANVAS_W,
            y: ((e.clientY - rect.top) / rect.height) * CANVAS_H,
        };
    };

    const trackBounds = (p: Punto) => {
        const b = boundsRef.current;
        if (!b) {
            boundsRef.current = { minX: p.x, minY: p.y, maxX: p.x, maxY: p.y };
        } else {
            b.minX = Math.min(b.minX, p.x);
            b.minY = Math.min(b.minY, p.y);
            b.maxX = Math.max(b.maxX, p.x);
            b.maxY = Math.max(b.maxY, p.y);
        }
    };

    const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
        canvasRef.current?.setPointerCapture(e.pointerId);
        drawingRef.current = true;
        const p = getLocalPoint(e);
        lastPointRef.current = p;
        trackBounds(p);
        setHasDrawn(true);
    };

    const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
        if (!drawingRef.current) return;
        const ctx = canvasRef.current?.getContext('2d');
        const last = lastPointRef.current;
        if (!ctx || !last) return;
        const p = getLocalPoint(e);
        // Suavizado simple: curva cuadrática entre el punto medio anterior y el actual.
        const mid = { x: (last.x + p.x) / 2, y: (last.y + p.y) / 2 };
        ctx.beginPath();
        ctx.moveTo(last.x, last.y);
        ctx.quadraticCurveTo(last.x, last.y, mid.x, mid.y);
        ctx.stroke();
        trackBounds(p);
        lastPointRef.current = p;
    };

    const handlePointerUp = () => { drawingRef.current = false; lastPointRef.current = null; };

    const limpiar = () => {
        const ctx = canvasRef.current?.getContext('2d');
        ctx?.clearRect(0, 0, CANVAS_W, CANVAS_H);
        boundsRef.current = null;
        setHasDrawn(false);
        setError(null);
    };

    const guardar = useCallback(async () => {
        const canvas = canvasRef.current;
        const bounds = boundsRef.current;
        if (!canvas || !bounds) return;
        setGuardando(true);
        setError(null);
        try {
            const x = Math.max(0, bounds.minX - PADDING);
            const y = Math.max(0, bounds.minY - PADDING);
            const w = Math.min(CANVAS_W, bounds.maxX + PADDING) - x;
            const h = Math.min(CANVAS_H, bounds.maxY + PADDING) - y;

            const cropped = document.createElement('canvas');
            cropped.width = w;
            cropped.height = h;
            const cctx = cropped.getContext('2d');
            cctx?.drawImage(canvas, x, y, w, h, 0, 0, w, h);

            const blob: Blob | null = await new Promise(resolve => cropped.toBlob(resolve, 'image/png'));
            if (!blob) throw new Error('No se pudo generar la imagen');

            const res = await onGuardar(blob);
            if (res.success) {
                onGuardado?.();
            } else {
                setError(res.error || 'No se pudo guardar la rúbrica');
            }
        } catch (err: any) {
            setError(err.message || 'No se pudo guardar la rúbrica');
        } finally {
            setGuardando(false);
        }
    }, [onGuardar, onGuardado]);

    return (
        <div className="space-y-3">
            {!compact && (
                <div className="flex items-center gap-2 text-brand-text/50">
                    <PenTool className="w-4 h-4" />
                    <p className="text-[11px] font-bold uppercase tracking-widest">Dibuja tu rúbrica en el recuadro</p>
                </div>
            )}
            <div className="relative bg-white rounded-2xl border-2 border-dashed border-brand-border overflow-hidden shadow-inner" style={{ touchAction: 'none' }}>
                <canvas
                    ref={canvasRef}
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerLeave={handlePointerUp}
                    className="w-full h-auto block cursor-crosshair"
                    style={{ aspectRatio: `${CANVAS_W} / ${CANVAS_H}`, touchAction: 'none' }}
                />
                {/* Línea guía punteada horizontal, ayuda a alinear la firma */}
                <div className="absolute left-0 right-0 pointer-events-none" style={{ top: `${(0.68 * CANVAS_H / CANVAS_H) * 100}%` }}>
                    <div className="border-t-2 border-dashed border-brand-text/15 mx-6" />
                </div>
                {!hasDrawn && (
                    <p className="absolute inset-0 flex items-center justify-center text-brand-text/20 text-sm font-bold pointer-events-none">
                        Firma aquí
                    </p>
                )}
            </div>

            {error && <p className="text-danger text-[11px] font-bold px-1">{error}</p>}

            <div className="flex gap-3">
                <button
                    type="button"
                    onClick={limpiar}
                    disabled={guardando}
                    className="flex-1 flex items-center justify-center gap-2 py-3 border border-brand-border rounded-xl text-[11px] font-black uppercase tracking-widest text-brand-text/50 hover:bg-brand-bg transition-all disabled:opacity-50"
                >
                    <Eraser className="w-4 h-4" /> Limpiar
                </button>
                <button
                    type="button"
                    onClick={guardar}
                    disabled={!hasDrawn || guardando}
                    className={cn(
                        'flex-[2] flex items-center justify-center gap-2 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all',
                        hasDrawn && !guardando
                            ? 'bg-gradient-to-r from-brand-primary to-black text-white shadow-lg shadow-brand-primary/20'
                            : 'bg-brand-bg text-brand-text/20 cursor-not-allowed border border-brand-border'
                    )}
                >
                    {guardando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    {guardando ? 'Guardando...' : 'Guardar rúbrica'}
                </button>
            </div>
        </div>
    );
};
