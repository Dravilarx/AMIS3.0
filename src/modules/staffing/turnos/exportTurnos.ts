// ─────────────────────────────────────────────────────────────────────────────
// Exportación de la rotativa mensual a PDF (jsPDF) y Excel (SheetJS/xlsx).
// Recibe una matriz ya resuelta (apellidos por celda) para no depender de la UI.
// ─────────────────────────────────────────────────────────────────────────────
import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';
import type { TurnoPuesto } from '../../../types/turnos';

export interface ExportFila {
    fecha: string;          // 'YYYY-MM-DD'
    diaLabel: string;       // 'Lun 03'
    finDeSemana: boolean;
    celdas: Record<string, string[]>; // puestoId -> apellidos
}

export interface ExportData {
    anio: number;
    mes: number; // 1-12
    mesLabel: string;
    puestos: TurnoPuesto[];
    filas: ExportFila[];
}

const cellText = (apellidos: string[]): string => apellidos.join(' / ');

// ─── PDF ─────────────────────────────────────────────────────────────────────
export function exportarPDF(data: ExportData): void {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const marginX = 8;
    const top = 18;

    // Título
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(`Rotativa de Turnos — ${data.mesLabel} ${data.anio}`, marginX, 12);

    const usableW = pageW - marginX * 2;
    const dateColW = 26;
    const puestoColW = (usableW - dateColW) / data.puestos.length;
    const bottom = pageH - 8;
    const headerH = 8;
    const rowH = Math.min(7, (bottom - top - headerH) / Math.max(data.filas.length, 1));

    // Encabezado de columnas
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setFillColor(30, 30, 30);
    doc.setTextColor(255, 255, 255);
    doc.rect(marginX, top, dateColW, headerH, 'F');
    doc.text('Fecha', marginX + 1.5, top + headerH - 2.5);
    data.puestos.forEach((p, i) => {
        const x = marginX + dateColW + i * puestoColW;
        doc.rect(x, top, puestoColW, headerH, 'F');
        doc.text(p.nombre, x + 1.5, top + headerH - 2.5, { maxWidth: puestoColW - 3 });
    });

    // Filas
    doc.setTextColor(20, 20, 20);
    data.filas.forEach((fila, r) => {
        const y = top + headerH + r * rowH;

        // Columna fecha
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.5);
        if (fila.finDeSemana) doc.setFillColor(235, 235, 235);
        else doc.setFillColor(250, 250, 250);
        doc.rect(marginX, y, dateColW, rowH, 'F');
        doc.setDrawColor(210, 210, 210);
        doc.rect(marginX, y, dateColW, rowH, 'S');
        doc.text(fila.diaLabel, marginX + 1.5, y + rowH - 2);

        // Celdas de puestos
        doc.setFont('helvetica', 'normal');
        data.puestos.forEach((p, i) => {
            const x = marginX + dateColW + i * puestoColW;
            if (fila.finDeSemana) { doc.setFillColor(243, 243, 243); doc.rect(x, y, puestoColW, rowH, 'F'); }
            doc.setDrawColor(210, 210, 210);
            doc.rect(x, y, puestoColW, rowH, 'S');
            const txt = cellText(fila.celdas[p.id] || []);
            if (txt) doc.text(txt, x + 1.5, y + rowH - 2, { maxWidth: puestoColW - 3 });
        });
    });

    doc.save(`Rotativa_Turnos_${data.mesLabel}_${data.anio}.pdf`);
}

// ─── Excel ───────────────────────────────────────────────────────────────────
export function exportarExcel(data: ExportData): void {
    const header = ['Fecha', ...data.puestos.map(p => p.nombre)];
    const rows = data.filas.map(fila => [
        fila.diaLabel,
        ...data.puestos.map(p => cellText(fila.celdas[p.id] || [])),
    ]);
    const aoa = [header, ...rows];

    const ws = XLSX.utils.aoa_to_sheet(aoa);
    // Anchos de columna aproximados
    ws['!cols'] = [{ wch: 12 }, ...data.puestos.map(() => ({ wch: 20 }))];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `${data.mesLabel} ${data.anio}`.substring(0, 31));
    XLSX.writeFile(wb, `Rotativa_Turnos_${data.mesLabel}_${data.anio}.xlsx`);
}
