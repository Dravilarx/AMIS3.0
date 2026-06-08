import { useState } from 'react';
import JSZip from 'jszip';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

export interface ExportDoc {
    professionalId: string;
    professionalName: string;
    docType:  string;
    docLabel: string;
    fileUrl:  string;
    fileName: string;
}

export type ExportMode = 'pdf' | 'zip_by_professional' | 'zip_by_doc';

const sanitize = (str: string) =>
    str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9_\-]/g, '_');

const fetchBytes = async (url: string): Promise<Uint8Array | null> => {
    try {
        const res = await fetch(url);
        if (!res.ok) return null;
        const buf = await res.arrayBuffer();
        return new Uint8Array(buf);
    } catch {
        return null;
    }
};

const isPDF = (fileName: string) =>
    fileName.toLowerCase().endsWith('.pdf');

const isImage = (fileName: string) =>
    /\.(jpg|jpeg|png|webp)$/i.test(fileName);

export const useTenderExport = () => {
    const [exporting, setExporting] = useState(false);
    const [progress,  setProgress]  = useState(0);

    // ── PDF Consolidado ────────────────────────────────────────────────────────
    const exportPDF = async (
        docs:        ExportDoc[],
        tenderName:  string,
    ) => {
        setExporting(true);
        setProgress(0);
        try {
            const merged = await PDFDocument.create();
            const font   = await merged.embedFont(StandardFonts.HelveticaBold);

            let current = 0;

            for (const doc of docs) {
                current++;
                setProgress(Math.round((current / docs.length) * 100));

                // Portada separadora por médico + documento
                const sep = merged.addPage([595, 842]);
                sep.drawRectangle({ x: 0, y: 0, width: 595, height: 842, color: rgb(0.05, 0.05, 0.08) });
                sep.drawText(doc.professionalName, { x: 50, y: 700, size: 28, font, color: rgb(1, 1, 1) });
                sep.drawText(doc.docLabel,         { x: 50, y: 660, size: 16, font, color: rgb(0.6, 0.6, 0.7) });
                sep.drawText(`Licitación: ${tenderName}`, { x: 50, y: 80, size: 10, font, color: rgb(0.3, 0.3, 0.4) });
                sep.drawText(new Date().toLocaleDateString('es-CL'), { x: 50, y: 60, size: 10, font, color: rgb(0.3, 0.3, 0.4) });

                const bytes = await fetchBytes(doc.fileUrl);
                if (!bytes) continue;

                if (isPDF(doc.fileName)) {
                    try {
                        const src   = await PDFDocument.load(bytes, { ignoreEncryption: true });
                        const pages = await merged.copyPages(src, src.getPageIndices());
                        pages.forEach(p => merged.addPage(p));
                    } catch { /* PDF encriptado o corrupto — se omite */ }
                } else if (isImage(doc.fileName)) {
                    try {
                        const page = merged.addPage([595, 842]);
                        const img  = doc.fileName.toLowerCase().endsWith('.png')
                            ? await merged.embedPng(bytes)
                            : await merged.embedJpg(bytes);
                        const { width, height } = img.scaleToFit(495, 692);
                        page.drawImage(img, {
                            x: (595 - width)  / 2,
                            y: (842 - height) / 2,
                            width, height,
                        });
                    } catch { /* imagen inválida */ }
                }
            }

            const pdfBytes = await merged.save();
            downloadBlob(
                new Blob([pdfBytes as any], { type: 'application/pdf' }),
                `Licitacion_${sanitize(tenderName)}_consolidado.pdf`
            );
        } finally {
            setExporting(false);
            setProgress(0);
        }
    };

    // ── ZIP por médico ─────────────────────────────────────────────────────────
    const exportZipByProfessional = async (
        docs:       ExportDoc[],
        tenderName: string,
    ) => {
        setExporting(true);
        setProgress(0);
        try {
            const zip     = new JSZip();
            const total   = docs.length;
            let   current = 0;

            for (const doc of docs) {
                current++;
                setProgress(Math.round((current / total) * 100));
                const bytes = await fetchBytes(doc.fileUrl);
                if (!bytes) continue;
                const folder   = sanitize(doc.professionalName);
                const ext      = doc.fileName.split('.').pop() || 'pdf';
                const fileName = `${sanitize(doc.docLabel)}.${ext}`;
                zip.folder(folder)!.file(fileName, bytes);
            }

            const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
            downloadBlob(blob, `Licitacion_${sanitize(tenderName)}_por_medico.zip`);
        } finally {
            setExporting(false);
            setProgress(0);
        }
    };

    // ── ZIP por documento ──────────────────────────────────────────────────────
    const exportZipByDoc = async (
        docs:       ExportDoc[],
        tenderName: string,
    ) => {
        setExporting(true);
        setProgress(0);
        try {
            const zip     = new JSZip();
            const total   = docs.length;
            let   current = 0;

            for (const doc of docs) {
                current++;
                setProgress(Math.round((current / total) * 100));
                const bytes = await fetchBytes(doc.fileUrl);
                if (!bytes) continue;
                const folder   = sanitize(doc.docLabel);
                const ext      = doc.fileName.split('.').pop() || 'pdf';
                const fileName = `${sanitize(doc.professionalName)}.${ext}`;
                zip.folder(folder)!.file(fileName, bytes);
            }

            const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
            downloadBlob(blob, `Licitacion_${sanitize(tenderName)}_por_documento.zip`);
        } finally {
            setExporting(false);
            setProgress(0);
        }
    };

    return {
        exporting,
        progress,
        exportPDF,
        exportZipByProfessional,
        exportZipByDoc,
    };
};

// ── Utilidad de descarga ───────────────────────────────────────────────────────
function downloadBlob(blob: Blob, fileName: string) {
    const url = URL.createObjectURL(blob);
    const a   = document.createElement('a');
    a.href     = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
