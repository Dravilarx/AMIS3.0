import React, { useState, useCallback, useRef } from 'react';
import {
    X, Upload, FileSpreadsheet, FileText, CheckCircle2, AlertTriangle,
    Loader2, Info, ChevronDown, ChevronUp, Table2, Download, Camera, Sparkles
} from 'lucide-react';
import { cn } from '../lib/utils';
import * as XLSX from 'xlsx';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Gemini AI instance for PDF/Image extraction
const GEMINI_KEY = import.meta.env.VITE_GEMINI_API_KEY as string;
const genAI = GEMINI_KEY ? new GoogleGenerativeAI(GEMINI_KEY) : null;

// ── Extracción con IA (Gemini Vision) ─────────────────────────────────

async function extractWithAI(
    file: File,
    columnDefs: { key: string; excelHeader: string; label: string; required: boolean }[]
): Promise<Record<string, string>[]> {
    if (!genAI) throw new Error('API key de Gemini no configurada (VITE_GEMINI_API_KEY)');

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const isImage = file.type.startsWith('image/');
    let base64: string;
    let mimeType: string;

    if (isImage) {
        // ── Redimensionar imagen para evitar atasco ──
        const MAX_SIDE = 1600;
        const QUALITY = 0.8;

        const img = new Image();
        const objectUrl = URL.createObjectURL(file);
        await new Promise<void>((resolve, reject) => {
            img.onload = () => resolve();
            img.onerror = () => reject(new Error('No se pudo leer la imagen'));
            img.src = objectUrl;
        });

        let { width, height } = img;
        if (width > MAX_SIDE || height > MAX_SIDE) {
            const ratio = Math.min(MAX_SIDE / width, MAX_SIDE / height);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, width, height);
        URL.revokeObjectURL(objectUrl);

        // Convert to compressed JPEG
        const dataUrl = canvas.toDataURL('image/jpeg', QUALITY);
        base64 = dataUrl.split(',')[1];
        mimeType = 'image/jpeg';

        // eslint-disable-next-line no-console
        console.log(`[BulkUpload] Imagen redimensionada: ${img.naturalWidth}x${img.naturalHeight} → ${width}x${height} (~${Math.round(base64.length * 0.75 / 1024)}KB)`);
    } else {
        // PDF u otro: enviar tal cual
        const buffer = await file.arrayBuffer();
        base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
        mimeType = file.type || 'application/pdf';
    }

    const columnDescription = columnDefs.map(c =>
        `- "${c.excelHeader}" (${c.label})${c.required ? ' [REQUERIDO]' : ''}`
    ).join('\n');

    const prompt = `Analiza este documento/imagen y extrae TODOS los registros de datos que encuentres.

Las columnas esperadas son:
${columnDescription}

Reglas:
1. Devuelve un JSON array de objetos. Cada objeto usa las keys exactas de los encabezados ("excelHeader") listados arriba.
2. Si un campo no se encuentra, usa string vacío "".
3. Extrae TODOS los registros/filas que puedas identificar.
4. NO envuelvas la respuesta en markdown. Responde SOLO con el JSON array.
5. Si no encuentras datos tabulares, devuelve un array vacío [].

Responde SOLO con el JSON array:`;

    let result;
    try {
        result = await model.generateContent([
            { text: prompt },
            { inlineData: { mimeType, data: base64 } }
        ]);
    } catch (apiErr: any) {
        const msg = apiErr?.message || '';
        if (msg.includes('429') || msg.includes('quota')) {
            throw new Error('⚠️ Cuota de Gemini agotada. La extracción con IA no está disponible en este momento. Intente más tarde o use un archivo Excel/CSV.');
        }
        if (msg.includes('403') || msg.includes('permission')) {
            throw new Error('⚠️ Sin autorización para usar Gemini. Verifique la API key en la configuración.');
        }
        throw new Error(`Error de IA: ${msg.slice(0, 150)}`);
    }

    const text = result.response.text().trim();

    // Clean potential markdown wrapping
    const jsonStr = text.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim();

    try {
        const parsed = JSON.parse(jsonStr);
        if (!Array.isArray(parsed)) throw new Error('La IA no devolvió un array');
        return parsed;
    } catch {
        throw new Error(`No se pudo parsear la respuesta de la IA. Texto recibido: ${text.slice(0, 200)}...`);
    }
}

// ── Extract text from PDF using basic approach ────────────────────────
async function extractPdfText(file: File): Promise<string> {
    // Use pdfjs-dist for text extraction
    const pdfjsLib = await import('pdfjs-dist');
    // Use bundled worker
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

    const buffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;

    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const pageText = content.items.map((item: any) => item.str).join(' ');
        fullText += pageText + '\n';
    }
    return fullText;
}

// ── Types ─────────────────────────────────────────────────────────────

export interface ColumnDef {
    key: string;           // ID interno (camelCase)
    excelHeader: string;   // Nombre EXACTO de la columna en el archivo
    label: string;         // Label humano en español
    required: boolean;
    example: string;
    description?: string;
}

export interface ParsedRow {
    _rowNum: number;
    _valid: boolean;
    _errors: string[];
    [key: string]: any;
}

export interface BulkUploadResult {
    total: number;
    success: number;
    failed: number;
    errors: { row: number; message: string }[];
}

export interface BulkUploadModalProps {
    title: string;
    subtitle: string;
    icon: React.ReactNode;
    columns: ColumnDef[];
    onUpload: (rows: Record<string, any>[]) => Promise<BulkUploadResult>;
    onClose: () => void;
    onSuccess?: () => void;
}

// ── Parser de tablas Markdown (Notion export) ─────────────────────────

function parseMarkdownTable(md: string): Record<string, string>[] {
    const lines = md.split('\n').map(l => l.trim()).filter(Boolean);
    const rows: Record<string, string>[] = [];
    let headers: string[] = [];
    let inTable = false;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Detectar línea de tabla (empieza y termina con |)
        if (line.startsWith('|') && line.endsWith('|')) {
            const cells = line.split('|').slice(1, -1).map(c => c.trim());

            // ¿Es la línea separadora? (|---|---|)
            if (cells.every(c => /^[-:]+$/.test(c))) {
                inTable = true;
                continue;
            }

            // Si no tenemos headers todavía, esta es la línea de headers
            if (!inTable && headers.length === 0) {
                headers = cells;
                continue;
            }

            // Fila de datos
            if (inTable && headers.length > 0) {
                const row: Record<string, string> = {};
                cells.forEach((cell, idx) => {
                    if (idx < headers.length) {
                        row[headers[idx]] = cell;
                    }
                });
                rows.push(row);
            }
        } else {
            // Si salimos de una tabla, reset para buscar la siguiente
            if (inTable && headers.length > 0 && rows.length > 0) {
                break; // Usamos la primera tabla encontrada
            }
            inTable = false;
            headers = [];
        }
    }

    // Si el MD es un export de Notion con propiedades por sección
    // (formato: "**Nombre**: valor\n")
    if (rows.length === 0) {
        const notionRows = parseNotionPropFormat(md);
        if (notionRows.length > 0) return notionRows;
    }

    return rows;
}

/** Parse Notion property-list format (cada registro separado por HR o headers) */
function parseNotionPropFormat(md: string): Record<string, string>[] {
    // Split by horizontal rules or level-1/2 headers 
    const blocks = md.split(/(?:^---+$|^#{1,2}\s)/m).filter(b => b.trim());
    const rows: Record<string, string>[] = [];

    for (const block of blocks) {
        const row: Record<string, string> = {};
        // Match "**Key**: Value" or "Key: Value" patterns
        const propRegex = /\*{0,2}([^*:]+?)\*{0,2}\s*[:：]\s*(.+)/g;
        let match;
        while ((match = propRegex.exec(block)) !== null) {
            const key = match[1].trim();
            const val = match[2].trim();
            if (key && val && val !== '-' && val !== 'N/A') {
                row[key] = val;
            }
        }
        if (Object.keys(row).length > 0) {
            rows.push(row);
        }
    }

    return rows;
}

// ── Normalizar nombres de header ──────────────────────────────────────

function normalizeHeader(h: string): string {
    return h
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Quitar acentos
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')                        // Solo alfanuméricos
        .trim();
}

function mapHeaders(
    rawHeaders: string[],
    columnDefs: ColumnDef[]
): Record<string, string> {
    const mapping: Record<string, string> = {};

    for (const col of columnDefs) {
        const normalizedExpected = normalizeHeader(col.excelHeader);
        const normalizedLabel = normalizeHeader(col.label);

        const matchIdx = rawHeaders.findIndex(h => {
            const nh = normalizeHeader(h);
            return nh === normalizedExpected || nh === normalizedLabel || nh === normalizeHeader(col.key);
        });

        if (matchIdx >= 0) {
            mapping[rawHeaders[matchIdx]] = col.key;
        }
    }

    return mapping;
}

// ── Componente Principal ──────────────────────────────────────────────

export const BulkUploadModal: React.FC<BulkUploadModalProps> = ({
    title,
    subtitle,
    icon,
    columns,
    onUpload,
    onClose,
    onSuccess,
}) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [step, setStep] = useState<'upload' | 'preview' | 'processing' | 'done'>('upload');
    const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
    const [rawHeaders, setRawHeaders] = useState<string[]>([]);
    const [headerMapping, setHeaderMapping] = useState<Record<string, string>>({});
    const [fileName, setFileName] = useState('');
    const [fileFormat, setFileFormat] = useState<'excel' | 'csv' | 'markdown' | 'pdf' | 'image'>('excel');
    const [parseError, setParseError] = useState<string | null>(null);
    const [aiProcessing, setAiProcessing] = useState(false);
    const [result, setResult] = useState<BulkUploadResult | null>(null);
    const [showColumnGuide, setShowColumnGuide] = useState(true);

    // ── File Parsing ──

    const processFile = useCallback(async (file: File) => {
        setParseError(null);
        setFileName(file.name);
        const ext = file.name.split('.').pop()?.toLowerCase();

        try {
            let rawData: Record<string, string>[] = [];
            let detectedHeaders: string[] = [];

            if (ext === 'md' || ext === 'markdown' || ext === 'txt') {
                // ── Markdown / Notion ──
                setFileFormat('markdown');
                const text = await file.text();
                rawData = parseMarkdownTable(text);

                if (rawData.length === 0) {
                    setParseError('No se encontró ninguna tabla en el archivo Markdown. Asegúrese de exportar desde Notion en formato de tabla.');
                    return;
                }
                detectedHeaders = Object.keys(rawData[0]);

            } else if (ext === 'csv') {
                // ── CSV ──
                setFileFormat('csv');
                const text = await file.text();
                const workbook = XLSX.read(text, { type: 'string' });
                const sheet = workbook.Sheets[workbook.SheetNames[0]];
                rawData = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { raw: false, defval: '' });
                detectedHeaders = rawData.length > 0 ? Object.keys(rawData[0]) : [];

            } else if (ext === 'xlsx' || ext === 'xls') {
                // ── Excel ──
                setFileFormat('excel');
                const buffer = await file.arrayBuffer();
                const workbook = XLSX.read(buffer);
                const sheet = workbook.Sheets[workbook.SheetNames[0]];
                rawData = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { raw: false, defval: '' });
                detectedHeaders = rawData.length > 0 ? Object.keys(rawData[0]) : [];

            } else if (ext === 'pdf') {
                // ── PDF ──
                setFileFormat('pdf');

                // Try text extraction first
                let usedAI = false;
                try {
                    const pdfText = await extractPdfText(file);
                    // Check if there's table-like content (vertical bars or tab-separated)
                    if (pdfText.includes('|') || pdfText.includes('\t')) {
                        rawData = parseMarkdownTable(pdfText);
                    }
                    if (rawData.length === 0) {
                        // Fallback: try to parse as delimited text
                        const lines = pdfText.split('\n').filter(l => l.trim());
                        if (lines.length > 1) {
                            // Try tab-delimited
                            const headers = lines[0].split('\t').map(h => h.trim()).filter(Boolean);
                            if (headers.length >= 2) {
                                rawData = lines.slice(1).map(line => {
                                    const vals = line.split('\t');
                                    const row: Record<string, string> = {};
                                    headers.forEach((h, i) => { row[h] = (vals[i] || '').trim(); });
                                    return row;
                                });
                            }
                        }
                    }
                } catch {
                    // PDF text extraction failed, will use AI
                }

                // If no structured data found, use Gemini AI
                if (rawData.length === 0) {
                    setAiProcessing(true);
                    try {
                        rawData = await extractWithAI(file, columns);
                        usedAI = true;
                    } finally {
                        setAiProcessing(false);
                    }
                }

                if (rawData.length === 0) {
                    setParseError('No se pudieron extraer datos del PDF. Intente con un formato Excel o CSV.');
                    return;
                }
                detectedHeaders = Object.keys(rawData[0]);
                if (usedAI) {
                    // eslint-disable-next-line no-console
                    console.log('[BulkUpload] Datos extraídos con IA:', rawData.length, 'registros');
                }

            } else if (['jpg', 'jpeg', 'png', 'webp', 'heic'].includes(ext || '')) {
                // ── Imagen → Extracción con IA ──
                setFileFormat('image');
                setAiProcessing(true);
                try {
                    rawData = await extractWithAI(file, columns);
                } finally {
                    setAiProcessing(false);
                }

                if (rawData.length === 0) {
                    setParseError('La IA no pudo extraer datos de la imagen. Asegúrese de que la imagen contenga una tabla legible.');
                    return;
                }
                detectedHeaders = Object.keys(rawData[0]);
                // eslint-disable-next-line no-console
                console.log('[BulkUpload] Imagen procesada con IA:', rawData.length, 'registros');

            } else {
                setParseError(`Formato no soportado: .${ext}. Use .xlsx, .csv, .md, .pdf o una imagen.`);
                return;
            }

            if (rawData.length === 0) {
                setParseError('El archivo no contiene datos. Verifique que tenga al menos una fila de datos.');
                return;
            }

            // Mapear headers
            const mapping = mapHeaders(detectedHeaders, columns);
            setRawHeaders(detectedHeaders);
            setHeaderMapping(mapping);

            // Validar filas
            const validated = rawData.map((row, idx): ParsedRow => {
                const mapped: ParsedRow = { _rowNum: idx + 2, _valid: true, _errors: [] };

                // Mapear cada campo usando el mapping
                for (const [rawH, key] of Object.entries(mapping)) {
                    mapped[key] = (row[rawH] || '').toString().trim();
                }

                // Validar campos requeridos
                for (const col of columns) {
                    if (col.required && !mapped[col.key]) {
                        mapped._valid = false;
                        mapped._errors.push(`Falta "${col.excelHeader}"`);
                    }
                }

                return mapped;
            });

            setParsedRows(validated);
            setStep('preview');

        } catch (err: any) {
            console.error('Error parsing file:', err);
            setParseError(`Error al leer el archivo: ${err.message}`);
        }
    }, [columns]);

    // ── Drag & Drop ──

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => setIsDragging(false);

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) processFile(file);
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) processFile(file);
    };

    // ── Upload ──

    const handleUpload = async () => {
        const validRows = parsedRows.filter(r => r._valid);
        if (validRows.length === 0) return;

        setStep('processing');

        try {
            // Limpiar campos internos antes de enviar
            const cleanRows = validRows.map(r => {
                const { _rowNum, _valid, _errors, ...data } = r;
                return data;
            });

            const uploadResult = await onUpload(cleanRows);
            setResult(uploadResult);
            setStep('done');
        } catch (err: any) {
            setResult({
                total: validRows.length,
                success: 0,
                failed: validRows.length,
                errors: [{ row: 0, message: err.message }]
            });
            setStep('done');
        }
    };

    // ── Template Download ──

    const downloadTemplate = () => {
        const headers = columns.map(c => c.excelHeader);
        const examples = columns.map(c => c.example);

        const ws = XLSX.utils.aoa_to_sheet([headers, examples]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Plantilla');
        XLSX.writeFile(wb, `plantilla_${title.toLowerCase().replace(/\s+/g, '_')}.xlsx`);
    };

    // ── Stats ──
    const validCount = parsedRows.filter(r => r._valid).length;
    const invalidCount = parsedRows.filter(r => !r._valid).length;
    const mappedCount = Object.keys(headerMapping).length;
    const unmappedHeaders = rawHeaders.filter(h => !headerMapping[h]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

            <div className="relative w-full max-w-4xl bg-prevenort-bg border border-prevenort-border rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-300 max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-prevenort-border flex-shrink-0">
                    <div className="flex items-center gap-3">
                        {icon}
                        <div>
                            <span className="text-[9px] font-black text-blue-400 uppercase tracking-[0.3em]">{subtitle}</span>
                            <h3 className="text-lg font-black text-prevenort-text tracking-tight">{title}</h3>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {/* Steps indicator */}
                        <div className="flex items-center gap-1 mr-4">
                            {['upload', 'preview', 'done'].map((s, i) => (
                                <React.Fragment key={s}>
                                    <div className={cn(
                                        'w-2 h-2 rounded-full transition-all',
                                        step === s || (['upload', 'preview', 'processing', 'done'].indexOf(step) > i)
                                            ? 'bg-blue-400' : 'bg-prevenort-border'
                                    )} />
                                    {i < 2 && <div className={cn(
                                        'w-6 h-0.5 transition-all',
                                        ['upload', 'preview', 'processing', 'done'].indexOf(step) > i
                                            ? 'bg-blue-400' : 'bg-prevenort-border'
                                    )} />}
                                </React.Fragment>
                            ))}
                        </div>
                        <button onClick={onClose} className="p-2 bg-prevenort-surface hover:bg-prevenort-surface/80 rounded-xl transition-colors">
                            <X className="w-4 h-4 text-prevenort-text/40" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto px-6 py-5">
                    {/* ═══ STEP: UPLOAD ═══ */}
                    {step === 'upload' && (
                        <div className="space-y-5">
                            {/* Guía de columnas */}
                            <div className="bg-prevenort-surface/50 border border-prevenort-border rounded-2xl overflow-hidden">
                                <button
                                    onClick={() => setShowColumnGuide(!showColumnGuide)}
                                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-prevenort-surface/80 transition-colors"
                                >
                                    <div className="flex items-center gap-2">
                                        <Info className="w-4 h-4 text-blue-400" />
                                        <span className="text-xs font-black text-prevenort-text/60 uppercase tracking-wider">
                                            Formato de columnas requerido
                                        </span>
                                        <span className="text-[9px] px-2 py-0.5 bg-blue-500/10 text-blue-400 rounded-full border border-blue-500/20 font-bold">
                                            {columns.filter(c => c.required).length} obligatoria{columns.filter(c => c.required).length !== 1 ? 's' : ''}
                                        </span>
                                    </div>
                                    {showColumnGuide ? <ChevronUp className="w-4 h-4 text-prevenort-text/30" /> : <ChevronDown className="w-4 h-4 text-prevenort-text/30" />}
                                </button>

                                {showColumnGuide && (
                                    <div className="px-4 pb-4 space-y-2">
                                        <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-500/5 border border-amber-500/15 mb-3">
                                            <Info className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" />
                                            <p className="text-[10px] text-amber-300/80 leading-relaxed">
                                                Las columnas son <strong className="text-amber-300">flexibles</strong>: se aceptan mayúsculas, minúsculas y con/sin acentos.
                                                Por ejemplo, <code className="font-mono bg-amber-500/10 px-1 rounded">rut</code>, <code className="font-mono bg-amber-500/10 px-1 rounded">RUT</code> y <code className="font-mono bg-amber-500/10 px-1 rounded">Rut</code> son equivalentes.
                                                Solo la(s) columna(s) marcada(s) como <span className="text-red-400 font-bold">REQ</span> son obligatorias.
                                            </p>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
                                            {columns.map(col => {
                                                // Generar variantes visuales del nombre
                                                const header = col.excelHeader;
                                                const variants = [
                                                    header.toLowerCase(),
                                                    header.toUpperCase(),
                                                    header.charAt(0).toUpperCase() + header.slice(1).toLowerCase()
                                                ].filter((v, i, arr) => arr.indexOf(v) === i); // Deduplicar

                                                return (
                                                    <div
                                                        key={col.key}
                                                        className={cn(
                                                            'flex flex-col gap-1 px-3 py-2 rounded-xl border text-xs',
                                                            col.required
                                                                ? 'bg-blue-500/5 border-blue-500/15'
                                                                : 'bg-prevenort-surface/30 border-prevenort-border/50'
                                                        )}
                                                    >
                                                        <div className="flex items-center gap-2">
                                                            <code className={cn(
                                                                'font-mono font-bold text-[10px] px-1.5 py-0.5 rounded',
                                                                col.required ? 'bg-blue-500/15 text-blue-400' : 'bg-prevenort-surface text-prevenort-text/40'
                                                            )}>
                                                                {col.excelHeader}
                                                            </code>
                                                            {col.required && (
                                                                <span className="text-[8px] font-black text-red-400 uppercase">req</span>
                                                            )}
                                                            <span className="text-prevenort-text/30 flex-1 truncate">{col.label}</span>
                                                            <span className="text-prevenort-text/15 text-[9px] italic truncate max-w-[120px]">ej: {col.example}</span>
                                                        </div>
                                                        {variants.length > 1 && (
                                                            <div className="flex items-center gap-1 ml-0.5">
                                                                <span className="text-[8px] text-prevenort-text/20">acepta:</span>
                                                                {variants.map((v, i) => (
                                                                    <code key={i} className="text-[8px] font-mono text-prevenort-text/25 bg-prevenort-surface/50 px-1 py-px rounded">
                                                                        {v}
                                                                    </code>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        {/* Botón descargar plantilla */}
                                        <button
                                            onClick={downloadTemplate}
                                            className="flex items-center gap-2 mt-3 px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 rounded-xl text-xs font-bold transition-all"
                                        >
                                            <Download className="w-3.5 h-3.5" />
                                            Descargar Plantilla Excel
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Zona de drop */}
                            <div
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={handleDrop}
                                onClick={() => fileInputRef.current?.click()}
                                className={cn(
                                    'relative border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-300',
                                    isDragging
                                        ? 'border-blue-400 bg-blue-500/5 scale-[1.01]'
                                        : 'border-prevenort-border hover:border-prevenort-text/20 hover:bg-prevenort-surface/30'
                                )}
                            >
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".xlsx,.xls,.csv,.md,.markdown,.txt,.pdf,.jpg,.jpeg,.png,.webp,.heic"
                                    onChange={handleFileSelect}
                                    className="hidden"
                                />

                                <div className={cn(
                                    'w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center transition-all',
                                    isDragging ? 'bg-blue-500/15 border border-blue-500/30' : 'bg-prevenort-surface border border-prevenort-border'
                                )}>
                                    <Upload className={cn('w-7 h-7 transition-colors', isDragging ? 'text-blue-400' : 'text-prevenort-text/20')} />
                                </div>

                                <p className="text-sm font-bold text-prevenort-text/60 mb-1">
                                    {isDragging ? 'Suelte el archivo aquí' : 'Arrastre un archivo o haga clic para seleccionar'}
                                </p>
                                <p className="text-[10px] text-prevenort-text/25">
                                    Formatos: <code className="bg-prevenort-surface px-1 rounded">.xlsx</code>{' '}
                                    <code className="bg-prevenort-surface px-1 rounded">.csv</code>{' '}
                                    <code className="bg-prevenort-surface px-1 rounded">.md</code>{' '}
                                    <code className="bg-prevenort-surface px-1 rounded">.pdf</code>{' '}
                                    <code className="bg-prevenort-surface px-1 rounded">.jpg/.png</code>{' '}
                                    <span className="text-prevenort-text/15">(IA extrae automáticamente)</span>
                                </p>

                                {/* Formato badges */}
                                <div className="flex items-center justify-center gap-3 mt-4">
                                    {[
                                        { icon: FileSpreadsheet, label: 'Excel', color: 'text-emerald-400' },
                                        { icon: Table2, label: 'CSV', color: 'text-blue-400' },
                                        { icon: FileText, label: 'Notion MD', color: 'text-purple-400' },
                                        { icon: FileText, label: 'PDF', color: 'text-red-400' },
                                        { icon: Camera, label: 'Foto/Imagen', color: 'text-amber-400' },
                                    ].map(({ icon: Icon, label, color }) => (
                                        <div key={label} className="flex items-center gap-1 text-[9px] text-prevenort-text/20">
                                            <Icon className={cn('w-3 h-3', color)} />
                                            <span>{label}</span>
                                        </div>
                                    ))}
                                </div>

                                {/* Indicador de procesamiento IA */}
                                {aiProcessing && (
                                    <div className="mt-4 flex items-center justify-center gap-2 p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl">
                                        <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
                                        <span className="text-xs font-bold text-amber-400">Extrayendo datos con IA (Gemini)...</span>
                                        <Loader2 className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                                    </div>
                                )}
                            </div>

                            {/* Error de parseo */}
                            {parseError && (
                                <div className="flex items-start gap-3 p-4 bg-red-500/5 border border-red-500/20 rounded-xl">
                                    <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-xs font-bold text-red-400">Error al procesar el archivo</p>
                                        <p className="text-[10px] text-red-400/60 mt-1">{parseError}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ═══ STEP: PREVIEW ═══ */}
                    {step === 'preview' && (
                        <div className="space-y-4">
                            {/* Info bar */}
                            <div className="flex items-center justify-between flex-wrap gap-3">
                                <div className="flex items-center gap-3">
                                    <div className={cn(
                                        'p-2 rounded-xl',
                                        fileFormat === 'excel' ? 'bg-emerald-500/10' :
                                            fileFormat === 'csv' ? 'bg-blue-500/10' : 'bg-purple-500/10'
                                    )}>
                                        {fileFormat === 'excel' ? <FileSpreadsheet className="w-4 h-4 text-emerald-400" /> :
                                            fileFormat === 'csv' ? <Table2 className="w-4 h-4 text-blue-400" /> :
                                                <FileText className="w-4 h-4 text-purple-400" />}
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-prevenort-text/70">{fileName}</p>
                                        <p className="text-[9px] text-prevenort-text/30">
                                            {parsedRows.length} filas · {mappedCount}/{columns.length} columnas mapeadas
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-black bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                        <CheckCircle2 className="w-3 h-3" /> {validCount} válidas
                                    </span>
                                    {invalidCount > 0 && (
                                        <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-black bg-red-500/10 text-red-400 border border-red-500/20">
                                            <AlertTriangle className="w-3 h-3" /> {invalidCount} con errores
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Columnas no mapeadas */}
                            {unmappedHeaders.length > 0 && (
                                <div className="flex items-start gap-2 p-3 bg-amber-500/5 border border-amber-500/15 rounded-xl">
                                    <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-[10px] font-bold text-amber-400">Columnas no reconocidas (serán ignoradas):</p>
                                        <div className="flex flex-wrap gap-1 mt-1">
                                            {unmappedHeaders.map(h => (
                                                <code key={h} className="text-[9px] px-1.5 py-0.5 bg-amber-500/10 text-amber-400/60 rounded">{h}</code>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Mapeo de columnas */}
                            <div className="bg-prevenort-surface/30 border border-prevenort-border rounded-xl p-3">
                                <p className="text-[9px] font-black text-prevenort-text/20 uppercase tracking-widest mb-2">Mapeo de columnas detectado</p>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-1.5">
                                    {columns.map(col => {
                                        const mappedFrom = Object.entries(headerMapping).find(([, v]) => v === col.key)?.[0];
                                        return (
                                            <div key={col.key} className={cn(
                                                'flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[10px] border',
                                                mappedFrom
                                                    ? 'bg-emerald-500/5 border-emerald-500/15 text-emerald-400'
                                                    : col.required
                                                        ? 'bg-red-500/5 border-red-500/15 text-red-400'
                                                        : 'bg-prevenort-surface/20 border-prevenort-border/30 text-prevenort-text/20'
                                            )}>
                                                {mappedFrom ? (
                                                    <CheckCircle2 className="w-3 h-3 flex-shrink-0" />
                                                ) : (
                                                    <X className="w-3 h-3 flex-shrink-0 opacity-40" />
                                                )}
                                                <span className="font-bold truncate">{col.excelHeader}</span>
                                                {mappedFrom && mappedFrom !== col.excelHeader && (
                                                    <span className="text-[8px] opacity-50">← {mappedFrom}</span>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Tabla de datos */}
                            <div className="border border-prevenort-border rounded-xl overflow-hidden">
                                <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
                                    <table className="w-full text-[10px]">
                                        <thead className="bg-prevenort-surface/80 sticky top-0 z-10">
                                            <tr>
                                                <th className="px-2 py-2 text-left font-black text-prevenort-text/30 uppercase tracking-wider">#</th>
                                                <th className="px-2 py-2 text-center font-black text-prevenort-text/30 uppercase tracking-wider w-8">✓</th>
                                                {columns.filter(c => headerMapping[Object.entries(headerMapping).find(([, v]) => v === c.key)?.[0] || ''] !== undefined || c.required).map(col => (
                                                    <th key={col.key} className="px-2 py-2 text-left font-black text-prevenort-text/30 uppercase tracking-wider whitespace-nowrap">
                                                        {col.label}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-prevenort-border/30">
                                            {parsedRows.slice(0, 50).map((row, idx) => (
                                                <tr key={idx} className={cn(
                                                    'transition-colors',
                                                    !row._valid ? 'bg-red-500/3' : 'hover:bg-prevenort-surface/30'
                                                )}>
                                                    <td className="px-2 py-1.5 text-prevenort-text/20 font-mono">{row._rowNum}</td>
                                                    <td className="px-2 py-1.5 text-center">
                                                        {row._valid
                                                            ? <CheckCircle2 className="w-3 h-3 text-emerald-400 mx-auto" />
                                                            : <AlertTriangle className="w-3 h-3 text-red-400 mx-auto" />
                                                        }
                                                    </td>
                                                    {columns.filter(c => headerMapping[Object.entries(headerMapping).find(([, v]) => v === c.key)?.[0] || ''] !== undefined || c.required).map(col => (
                                                        <td key={col.key} className={cn(
                                                            'px-2 py-1.5 text-prevenort-text/60 max-w-[150px] truncate',
                                                            col.required && !row[col.key] && 'text-red-400 italic'
                                                        )}>
                                                            {row[col.key] || (col.required ? '⚠ vacío' : '—')}
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                {parsedRows.length > 50 && (
                                    <div className="px-3 py-2 bg-prevenort-surface/50 border-t border-prevenort-border text-[9px] text-prevenort-text/20 text-center">
                                        Mostrando 50 de {parsedRows.length} filas
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ═══ STEP: PROCESSING ═══ */}
                    {step === 'processing' && (
                        <div className="flex flex-col items-center justify-center py-16">
                            <Loader2 className="w-12 h-12 text-blue-400 animate-spin mb-4" />
                            <p className="text-sm font-bold text-prevenort-text/60">Procesando {validCount} registros...</p>
                            <p className="text-[10px] text-prevenort-text/25 mt-1">Esto puede tomar unos segundos</p>
                        </div>
                    )}

                    {/* ═══ STEP: DONE ═══ */}
                    {step === 'done' && result && (
                        <div className="space-y-5">
                            <div className="text-center py-6">
                                <div className={cn(
                                    'w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center',
                                    result.failed === 0
                                        ? 'bg-emerald-500/10 border border-emerald-500/20'
                                        : 'bg-amber-500/10 border border-amber-500/20'
                                )}>
                                    {result.failed === 0
                                        ? <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                                        : <AlertTriangle className="w-8 h-8 text-amber-400" />
                                    }
                                </div>

                                <h4 className="text-lg font-black text-prevenort-text mb-2">
                                    {result.failed === 0 ? 'Carga Completada' : 'Carga con Observaciones'}
                                </h4>

                                <div className="flex items-center justify-center gap-6 mt-4">
                                    <div className="text-center">
                                        <p className="text-3xl font-black text-emerald-400 font-mono">{result.success}</p>
                                        <p className="text-[9px] font-black text-prevenort-text/20 uppercase tracking-widest">Exitosos</p>
                                    </div>
                                    <div className="w-px h-10 bg-prevenort-border" />
                                    <div className="text-center">
                                        <p className={cn('text-3xl font-black font-mono', result.failed > 0 ? 'text-red-400' : 'text-prevenort-text/20')}>{result.failed}</p>
                                        <p className="text-[9px] font-black text-prevenort-text/20 uppercase tracking-widest">Fallidos</p>
                                    </div>
                                    <div className="w-px h-10 bg-prevenort-border" />
                                    <div className="text-center">
                                        <p className="text-3xl font-black text-blue-400 font-mono">{result.total}</p>
                                        <p className="text-[9px] font-black text-prevenort-text/20 uppercase tracking-widest">Total</p>
                                    </div>
                                </div>
                            </div>

                            {/* Errores detallados */}
                            {result.errors.length > 0 && (
                                <div className="bg-red-500/5 border border-red-500/15 rounded-xl p-4 max-h-[200px] overflow-y-auto">
                                    <p className="text-[9px] font-black text-red-400 uppercase tracking-widest mb-2">Detalle de Errores</p>
                                    <div className="space-y-1">
                                        {result.errors.map((err, i) => (
                                            <div key={i} className="flex items-start gap-2 text-[10px]">
                                                <span className="text-red-400/40 font-mono">Fila {err.row}:</span>
                                                <span className="text-red-400/60">{err.message}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-6 py-4 border-t border-prevenort-border flex-shrink-0">
                    <div className="text-[9px] text-prevenort-text/15">
                        {step === 'preview' && `${validCount} registro${validCount !== 1 ? 's' : ''} listo${validCount !== 1 ? 's' : ''} para cargar`}
                    </div>
                    <div className="flex items-center gap-3">
                        {step === 'upload' && (
                            <button onClick={onClose} className="px-4 py-2 text-xs font-bold text-prevenort-text/40 hover:text-prevenort-text/60 transition-colors">
                                Cancelar
                            </button>
                        )}
                        {step === 'preview' && (
                            <>
                                <button
                                    onClick={() => { setStep('upload'); setParsedRows([]); setParseError(null); }}
                                    className="px-4 py-2 text-xs font-bold text-prevenort-text/40 hover:text-prevenort-text/60 transition-colors"
                                >
                                    ← Volver
                                </button>
                                <button
                                    onClick={handleUpload}
                                    disabled={validCount === 0}
                                    className={cn(
                                        'flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-tight transition-all',
                                        validCount > 0
                                            ? 'bg-prevenort-primary hover:bg-prevenort-primary/90 text-white shadow-xl shadow-prevenort-primary/20 border border-prevenort-primary/30'
                                            : 'bg-prevenort-surface text-prevenort-text/20 cursor-not-allowed'
                                    )}
                                >
                                    <Upload className="w-3.5 h-3.5" />
                                    Cargar {validCount} Registros
                                </button>
                            </>
                        )}
                        {step === 'done' && (
                            <button
                                onClick={() => { onSuccess?.(); onClose(); }}
                                className="flex items-center gap-2 px-5 py-2.5 bg-prevenort-primary hover:bg-prevenort-primary/90 text-white rounded-xl font-black text-xs uppercase tracking-tight transition-all shadow-xl shadow-prevenort-primary/20"
                            >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Finalizar
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
