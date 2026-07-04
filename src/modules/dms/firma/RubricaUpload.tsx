import React, { useState, useRef, useEffect, useCallback } from 'react';
import { UploadCloud, Image as ImageIcon, AlertTriangle, Save, Loader2, X } from 'lucide-react';
import { cn } from '../../../lib/utils';

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_WORKING_DIM = 1600; // resolución de trabajo (calidad suficiente, procesamiento rápido)
const MAX_EXPORT_WIDTH = 1200;
const MIN_RECT_SIZE = 0.05;
const TIPOS_ACEPTADOS = ['image/png', 'image/jpeg'];

interface Rect { left: number; top: number; right: number; bottom: number }
const RECT_COMPLETO: Rect = { left: 0, top: 0, right: 1, bottom: 1 };

type Corner = 'tl' | 'tr' | 'bl' | 'br';

interface RubricaUploadProps {
    onGuardar: (blob: Blob) => Promise<{ success: boolean; error?: string }>;
    onGuardado?: () => void;
}

// Recorta al bounding box de píxeles no-transparentes (con margen), para que
// el PNG exportado no lleve área vacía alrededor del trazo.
const recortarAContenido = (canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext('2d')!;
    const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let minX = width, minY = height, maxX = -1, maxY = -1;
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            if (data[(y * width + x) * 4 + 3] > 8) {
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
            }
        }
    }
    if (maxX < 0) return { x: 0, y: 0, w: canvas.width, h: canvas.height };
    const pad = 4;
    const x = Math.max(0, minX - pad);
    const y = Math.max(0, minY - pad);
    return { x, y, w: Math.min(canvas.width, maxX + pad) - x, h: Math.min(canvas.height, maxY + pad) - y };
};

// Pestaña "Subir imagen": carga de foto/escaneo de la firma real, recorte
// manual (4 esquinas arrastrables) y limpieza de fondo (blanco → transparente).
export const RubricaUpload: React.FC<RubricaUploadProps> = ({ onGuardar, onGuardado }) => {
    const workingCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const processedCanvasRef = useRef<HTMLCanvasElement>(null);
    const previewCanvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const originalDataRef = useRef<ImageData | null>(null);
    const draggingRef = useRef<Corner | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [dims, setDims] = useState<{ w: number; h: number } | null>(null);
    const [rect, setRect] = useState<Rect>(RECT_COMPLETO);
    const [tolerancia, setTolerancia] = useState(25);
    const [dragOver, setDragOver] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [guardando, setGuardando] = useState(false);

    const cargarArchivo = (file: File) => {
        setError(null);
        if (!TIPOS_ACEPTADOS.includes(file.type)) { setError('Solo se aceptan imágenes PNG o JPG'); return; }
        if (file.size > MAX_FILE_SIZE) { setError('La imagen no puede superar 10MB'); return; }

        const img = new Image();
        img.onload = () => {
            const scale = Math.min(1, MAX_WORKING_DIM / Math.max(img.naturalWidth, img.naturalHeight));
            const w = Math.round(img.naturalWidth * scale);
            const h = Math.round(img.naturalHeight * scale);
            if (!workingCanvasRef.current) workingCanvasRef.current = document.createElement('canvas');
            const canvas = workingCanvasRef.current;
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d')!;
            ctx.drawImage(img, 0, 0, w, h);
            originalDataRef.current = ctx.getImageData(0, 0, w, h);
            setRect(RECT_COMPLETO);
            setDims({ w, h });
            URL.revokeObjectURL(img.src);
        };
        img.onerror = () => setError('No se pudo cargar la imagen');
        img.src = URL.createObjectURL(file);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (file) cargarArchivo(file);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files?.[0];
        if (file) cargarArchivo(file);
    };

    // Reprocesa SIEMPRE desde los píxeles originales (nunca degrada sobre lo ya procesado).
    const reprocesar = useCallback(() => {
        const original = originalDataRef.current;
        const processed = processedCanvasRef.current;
        if (!original || !processed) return;
        const out = new ImageData(new Uint8ClampedArray(original.data), original.width, original.height);
        const umbral = 255 - tolerancia * 1.6; // 0 → 255 (sin recorte), 100 → 95 (agresivo)
        const banda = 40; // suaviza el borde de la tinta cerca del umbral
        for (let i = 0; i < out.data.length; i += 4) {
            const lum = 0.299 * out.data[i] + 0.587 * out.data[i + 1] + 0.114 * out.data[i + 2];
            let factor = 1;
            if (lum >= umbral) factor = 0;
            else if (lum >= umbral - banda) factor = (umbral - lum) / banda;
            out.data[i + 3] = Math.round(out.data[i + 3] * factor);
        }
        processed.width = out.width;
        processed.height = out.height;
        processed.getContext('2d')!.putImageData(out, 0, 0);
    }, [tolerancia]);

    const dibujarPreview = useCallback(() => {
        const preview = previewCanvasRef.current;
        const processed = processedCanvasRef.current;
        if (!preview || !processed || !processed.width) return;
        const ctx = preview.getContext('2d')!;
        const PW = preview.width, PH = preview.height;
        ctx.clearRect(0, 0, PW, PH);
        ctx.fillStyle = '#f5f5f0';
        ctx.fillRect(0, 0, PW, PH);
        ctx.strokeStyle = '#ddd8cd';
        ctx.lineWidth = 1;
        for (let i = 0; i < 5; i++) {
            const y = 16 + i * 15;
            ctx.beginPath();
            ctx.moveTo(14, y);
            ctx.lineTo(PW - 14 - (i === 4 ? 70 : 0), y);
            ctx.stroke();
        }

        const sx = rect.left * processed.width, sy = rect.top * processed.height;
        const sw = (rect.right - rect.left) * processed.width, sh = (rect.bottom - rect.top) * processed.height;
        if (sw <= 0 || sh <= 0) return;
        const sigW = PW * 0.34, sigH = PH * 0.24;
        const sigX = PW - sigW - 18, sigY = PH - sigH - 14;
        const ratio = Math.min(sigW / sw, sigH / sh);
        const dw = sw * ratio, dh = sh * ratio;
        ctx.drawImage(processed, sx, sy, sw, sh, sigX + (sigW - dw) / 2, sigY + (sigH - dh) / 2, dw, dh);
    }, [rect]);

    useEffect(() => { if (dims) reprocesar(); }, [dims, tolerancia, reprocesar]);
    useEffect(() => { if (dims) dibujarPreview(); }, [dims, tolerancia, rect, dibujarPreview]);

    const onHandlePointerDown = (corner: Corner) => (e: React.PointerEvent) => {
        e.stopPropagation();
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        draggingRef.current = corner;
    };

    const onContainerPointerMove = (e: React.PointerEvent) => {
        const corner = draggingRef.current;
        if (!corner || !containerRef.current) return;
        const r = containerRef.current.getBoundingClientRect();
        const fx = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
        const fy = Math.max(0, Math.min(1, (e.clientY - r.top) / r.height));
        setRect(prev => {
            const next = { ...prev };
            if (corner === 'tl') { next.left = Math.min(fx, prev.right - MIN_RECT_SIZE); next.top = Math.min(fy, prev.bottom - MIN_RECT_SIZE); }
            if (corner === 'tr') { next.right = Math.max(fx, prev.left + MIN_RECT_SIZE); next.top = Math.min(fy, prev.bottom - MIN_RECT_SIZE); }
            if (corner === 'bl') { next.left = Math.min(fx, prev.right - MIN_RECT_SIZE); next.bottom = Math.max(fy, prev.top + MIN_RECT_SIZE); }
            if (corner === 'br') { next.right = Math.max(fx, prev.left + MIN_RECT_SIZE); next.bottom = Math.max(fy, prev.top + MIN_RECT_SIZE); }
            return next;
        });
    };

    const onContainerPointerUp = () => { draggingRef.current = null; };

    const handleGuardar = async () => {
        const processed = processedCanvasRef.current;
        if (!processed || !processed.width) return;
        setGuardando(true);
        setError(null);
        try {
            const sx = Math.round(rect.left * processed.width);
            const sy = Math.round(rect.top * processed.height);
            const sw = Math.max(1, Math.round((rect.right - rect.left) * processed.width));
            const sh = Math.max(1, Math.round((rect.bottom - rect.top) * processed.height));

            const cropCanvas = document.createElement('canvas');
            cropCanvas.width = sw;
            cropCanvas.height = sh;
            cropCanvas.getContext('2d')!.drawImage(processed, sx, sy, sw, sh, 0, 0, sw, sh);

            const bbox = recortarAContenido(cropCanvas);
            const bboxCanvas = document.createElement('canvas');
            bboxCanvas.width = bbox.w;
            bboxCanvas.height = bbox.h;
            bboxCanvas.getContext('2d')!.drawImage(cropCanvas, bbox.x, bbox.y, bbox.w, bbox.h, 0, 0, bbox.w, bbox.h);

            let finalCanvas = bboxCanvas;
            if (bboxCanvas.width > MAX_EXPORT_WIDTH) {
                const scale = MAX_EXPORT_WIDTH / bboxCanvas.width;
                const scaled = document.createElement('canvas');
                scaled.width = MAX_EXPORT_WIDTH;
                scaled.height = Math.round(bboxCanvas.height * scale);
                scaled.getContext('2d')!.drawImage(bboxCanvas, 0, 0, scaled.width, scaled.height);
                finalCanvas = scaled;
            }

            const blob: Blob | null = await new Promise(resolve => finalCanvas.toBlob(resolve, 'image/png'));
            if (!blob) throw new Error('No se pudo generar la imagen');

            const res = await onGuardar(blob);
            if (res.success) onGuardado?.();
            else setError(res.error || 'No se pudo guardar la rúbrica');
        } catch (err: any) {
            setError(err.message || 'No se pudo guardar la rúbrica');
        } finally {
            setGuardando(false);
        }
    };

    const cambiarImagen = () => {
        setDims(null);
        originalDataRef.current = null;
        setRect(RECT_COMPLETO);
        setError(null);
    };

    if (!dims) {
        return (
            <div className="space-y-3">
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleInputChange} />
                <div
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}
                    className={cn(
                        'flex flex-col items-center justify-center gap-3 py-14 border-2 border-dashed rounded-2xl cursor-pointer transition-all',
                        dragOver ? 'border-brand-primary bg-brand-primary/5' : 'border-brand-border hover:border-brand-primary/40'
                    )}
                >
                    <UploadCloud className="w-8 h-8 text-brand-text/25" />
                    <div className="text-center">
                        <p className="text-xs font-bold text-brand-text/60">Arrastra una foto de tu firma, o toca para elegir</p>
                        <p className="text-[10px] text-brand-text/30 mt-1">PNG o JPG, máx. 10MB — también puedes usar la cámara</p>
                    </div>
                </div>
                {error && <p className="text-danger text-[11px] font-bold px-1 flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5" /> {error}</p>}
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <p className="text-[10px] font-black uppercase tracking-widest text-brand-text/30">Recorta y limpia el fondo</p>
                <button onClick={cambiarImagen} className="flex items-center gap-1 text-[10px] font-bold text-brand-text/40 hover:text-danger transition-colors">
                    <X className="w-3 h-3" /> Cambiar imagen
                </button>
            </div>

            <div
                ref={containerRef}
                onPointerMove={onContainerPointerMove}
                onPointerUp={onContainerPointerUp}
                className="relative mx-auto select-none rounded-xl overflow-hidden border border-brand-border"
                style={{
                    aspectRatio: `${dims.w} / ${dims.h}`,
                    maxWidth: '100%',
                    backgroundImage: 'repeating-conic-gradient(#e5e3da 0% 25%, #f4f3ee 0% 50%)',
                    backgroundSize: '16px 16px',
                    touchAction: 'none',
                }}
            >
                <canvas ref={processedCanvasRef} className="block w-full h-full" />

                {/* Marco de recorte */}
                <div
                    className="absolute border-2 border-brand-primary/80 pointer-events-none"
                    style={{
                        left: `${rect.left * 100}%`, top: `${rect.top * 100}%`,
                        width: `${(rect.right - rect.left) * 100}%`, height: `${(rect.bottom - rect.top) * 100}%`,
                    }}
                />
                {([
                    ['tl', rect.left, rect.top],
                    ['tr', rect.right, rect.top],
                    ['bl', rect.left, rect.bottom],
                    ['br', rect.right, rect.bottom],
                ] as [Corner, number, number][]).map(([corner, x, y]) => (
                    <div
                        key={corner}
                        onPointerDown={onHandlePointerDown(corner)}
                        className="absolute w-5 h-5 -ml-2.5 -mt-2.5 rounded-full bg-brand-primary border-2 border-white shadow-md cursor-move"
                        style={{ left: `${x * 100}%`, top: `${y * 100}%`, touchAction: 'none' }}
                    />
                ))}
            </div>

            <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black uppercase tracking-widest text-brand-text/30">Limpieza de fondo</label>
                    <span className="text-[10px] font-bold text-brand-text/40">{tolerancia}</span>
                </div>
                <input type="range" min={0} max={100} value={tolerancia} onChange={(e) => setTolerancia(Number(e.target.value))} className="w-full accent-brand-primary" />
            </div>

            <div className="space-y-1.5">
                <p className="text-[10px] font-black uppercase tracking-widest text-brand-text/30 flex items-center gap-1.5">
                    <ImageIcon className="w-3 h-3" /> Vista previa sobre documento
                </p>
                <canvas ref={previewCanvasRef} width={320} height={140} className="w-full h-auto rounded-lg border border-brand-border" />
            </div>

            {error && <p className="text-danger text-[11px] font-bold px-1 flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5" /> {error}</p>}

            <button
                onClick={handleGuardar}
                disabled={guardando}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest bg-gradient-to-r from-brand-primary to-black text-white shadow-lg shadow-brand-primary/20 disabled:opacity-50"
            >
                {guardando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {guardando ? 'Guardando...' : 'Guardar rúbrica'}
            </button>
        </div>
    );
};
