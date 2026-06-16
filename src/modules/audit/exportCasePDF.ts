import { jsPDF } from 'jspdf';
import type { AuditCase, AuditTrailEntry } from '../../hooks/useAudit';

// ─── Etiquetas legibles ─────────────────────────────────────────────────────
const NONCONFORMITY_LABELS: Record<string, string> = {
    error_informe:  'Error de informe',
    retraso:        'Retraso',
    trato_paciente: 'Trato al paciente',
    administrativo: 'Administrativo',
    tecnico:        'Técnico',
    otro:           'Otro',
};

const SEVERITY_LABELS: Record<string, string> = {
    baja:    'Baja',
    media:   'Media',
    alta:    'Alta',
    critica: 'Crítica',
};

const STATUS_LABELS: Record<string, string> = {
    pending:   'Nuevo',
    reviewed:  'En Resolución',
    escalated: 'Escalado',
    completed: 'Completado',
};

const AGRAWALL_LABELS: Record<number, string> = {
    1: 'Correcto',
    2: 'Discrepancia Menor',
    3: 'Discrepancia Moderada',
    4: 'Discrepancia Grave',
};

const DOC_TYPE_LABELS: Record<string, string> = {
    informe:      'Informe Médico',
    orden_medica: 'Orden Médica',
    examen:       'Examen',
    correo:       'Correo Electrónico',
    otro:         'Otro Antecedente',
};

const fmtDate = (d?: string) => (d ? new Date(d).toLocaleDateString('es-CL') : '—');
const fmtDateTime = (d?: string) =>
    d ? new Date(d).toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' }) : '—';

/**
 * Genera y descarga el expediente completo de un caso de calidad en PDF.
 * Diseño sobrio y formal (texto negro sobre blanco) pensado para auditores externos.
 */
export async function exportCaseToPDF(
    auditCase: AuditCase,
    fetchTrail: (auditId: string) => Promise<AuditTrailEntry[]>
): Promise<void> {
    const trail = await fetchTrail(auditCase.id);

    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const pageW   = doc.internal.pageSize.getWidth();
    const pageH   = doc.internal.pageSize.getHeight();
    const marginX = 48;
    const contentW = pageW - marginX * 2;
    const bottom  = pageH - 56;
    let y = 56;

    // Asegura espacio vertical; si no cabe, salta de página
    const ensure = (needed: number) => {
        if (y + needed > bottom) {
            doc.addPage();
            y = 56;
        }
    };

    const sectionTitle = (title: string) => {
        ensure(34);
        y += 6;
        doc.setDrawColor(180);
        doc.setLineWidth(0.5);
        doc.line(marginX, y, marginX + contentW, y);
        y += 16;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(20);
        doc.text(title.toUpperCase(), marginX, y);
        y += 16;
    };

    // Párrafo con ajuste de línea y salto de página
    const paragraph = (text: string, opts: { size?: number; bold?: boolean; gray?: number; indent?: number } = {}) => {
        const size   = opts.size ?? 10;
        const indent = opts.indent ?? 0;
        doc.setFont('helvetica', opts.bold ? 'bold' : 'normal');
        doc.setFontSize(size);
        doc.setTextColor(opts.gray ?? 40);
        const lines = doc.splitTextToSize(text || '—', contentW - indent);
        const lineH = size * 1.35;
        for (const line of lines) {
            ensure(lineH);
            doc.text(line, marginX + indent, y);
            y += lineH;
        }
    };

    // Fila etiqueta: valor
    const field = (label: string, value: string) => {
        const lineH = 14;
        ensure(lineH);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(90);
        doc.text(`${label}:`, marginX, y);
        const labelW = doc.getTextWidth(`${label}:`) + 6;
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(20);
        const lines = doc.splitTextToSize(value || '—', contentW - labelW);
        doc.text(lines[0], marginX + labelW, y);
        y += lineH;
        for (let i = 1; i < lines.length; i++) {
            ensure(lineH);
            doc.text(lines[i], marginX + labelW, y);
            y += lineH;
        }
    };

    const gap = (h = 8) => { y += h; };

    // ── Encabezado ───────────────────────────────────────────────────────────
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(15);
    doc.text('AMIS 3.0 — Expediente de Caso de Calidad', marginX, y);
    y += 18;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(90);
    doc.text('SOCIEDAD DE RADIÓLOGOS DEL NORTE SpA · Holding Portezuelo', marginX, y);
    y += 13;
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text(`Documento generado el ${fmtDateTime(new Date().toISOString())}`, marginX, y);
    y += 6;

    // ── Identificación del caso ────────────────────────────────────────────────
    sectionTitle('Identificación del Caso');
    field('ID del caso', auditCase.id);
    field('Paciente', auditCase.patientName);
    field('RUT', auditCase.patientRut || '—');
    field('Proveedor / Institución', auditCase.providerName || auditCase.institution || '—');
    field('Médico responsable', auditCase.doctorName || '—');
    field('Tipo de no-conformidad', auditCase.nonconformityType ? (NONCONFORMITY_LABELS[auditCase.nonconformityType] || auditCase.nonconformityType) : '—');
    field('Gravedad', auditCase.severity ? (SEVERITY_LABELS[auditCase.severity] || auditCase.severity) : '—');
    field('Estado', STATUS_LABELS[auditCase.status] || auditCase.status);
    field('Fecha de solicitud', fmtDate(auditCase.requestDate));
    field('Fecha de resolución', fmtDate(auditCase.resolutionDate));

    // ── Descripción del problema ───────────────────────────────────────────────
    sectionTitle('Descripción del Problema');
    paragraph(auditCase.problemDescription || 'Sin descripción registrada.');

    // ── Solución propuesta ─────────────────────────────────────────────────────
    sectionTitle('Solución Propuesta');
    paragraph(auditCase.proposedSolution || 'Sin solución propuesta registrada.');

    // ── Acción correctiva (destacada) ──────────────────────────────────────────
    sectionTitle('Acción Correctiva Implementada');
    ensure(20);
    doc.setFillColor(244, 244, 244);
    doc.setDrawColor(160);
    {
        const text = auditCase.correctiveAction || 'Sin acción correctiva registrada.';
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        const lines = doc.splitTextToSize(text, contentW - 24);
        const lineH = 14;
        const boxH = lines.length * lineH + 16;
        ensure(boxH);
        doc.rect(marginX, y - 4, contentW, boxH, 'FD');
        doc.setTextColor(20);
        let yy = y + 12;
        for (const line of lines) {
            doc.text(line, marginX + 12, yy);
            yy += lineH;
        }
        y += boxH + 4;
    }

    // ── Clasificación Agrawall ─────────────────────────────────────────────────
    sectionTitle('Clasificación Agrawall');
    if (auditCase.agrawallLevel) {
        field('Nivel', `N${auditCase.agrawallLevel} — ${AGRAWALL_LABELS[auditCase.agrawallLevel] || ''}`);
        gap(2);
        paragraph('Razonamiento:', { bold: true, size: 9, gray: 90 });
        paragraph(auditCase.agrawallReasoning || '—');
        if (auditCase.agrawallFindings && auditCase.agrawallFindings.length > 0) {
            gap(4);
            paragraph('Hallazgos:', { bold: true, size: 9, gray: 90 });
            auditCase.agrawallFindings.forEach(f => paragraph(`•  ${f}`, { indent: 8 }));
        }
    } else {
        paragraph('Sin clasificación Agrawall registrada.');
    }

    // ── Comunicaciones ─────────────────────────────────────────────────────────
    sectionTitle('Comunicaciones');
    if (auditCase.communications.length === 0) {
        paragraph('Sin comunicaciones registradas.');
    } else {
        [...auditCase.communications]
            .sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime())
            .forEach(c => {
                const dir = c.direction === 'sent' ? 'Enviado' : 'Recibido';
                const who = c.direction === 'sent' ? `Para: ${c.toEmail || '—'}` : `De: ${c.fromEmail || '—'}`;
                paragraph(`[${dir}] ${c.subject}`, { bold: true, size: 9.5 });
                paragraph(`${who}  ·  ${fmtDateTime(c.sentAt)}`, { size: 8.5, gray: 110 });
                gap(4);
            });
    }

    // ── Documentos adjuntos ────────────────────────────────────────────────────
    sectionTitle('Documentos Adjuntos');
    if (auditCase.documents.length === 0) {
        paragraph('Sin documentos adjuntos.');
    } else {
        auditCase.documents.forEach(d => {
            paragraph(`•  ${d.fileName}  (${DOC_TYPE_LABELS[d.docType] || d.docType})`, { size: 9.5, indent: 4 });
        });
    }

    // ── Bitácora completa ──────────────────────────────────────────────────────
    sectionTitle('Bitácora de Trazabilidad');
    paragraph('Registro permanente e inmutable de todos los movimientos del caso.', { size: 8.5, gray: 110 });
    gap(4);
    if (trail.length === 0) {
        paragraph('Sin movimientos registrados.');
    } else {
        trail.forEach(t => {
            paragraph(t.action, { bold: true, size: 9.5 });
            let meta = `${t.userName || 'Sistema'}  ·  ${fmtDateTime(t.createdAt)}`;
            if (t.oldValue || t.newValue) {
                meta += `   (${t.oldValue || '—'} → ${t.newValue || '—'})`;
            }
            paragraph(meta, { size: 8.5, gray: 110 });
            gap(4);
        });
    }

    // ── Pie de página en todas las páginas ─────────────────────────────────────
    const generatedAt = fmtDateTime(new Date().toISOString());
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setDrawColor(200);
        doc.setLineWidth(0.5);
        doc.line(marginX, pageH - 42, pageW - marginX, pageH - 42);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(130);
        doc.text(`Documento generado automáticamente por AMIS 3.0  ·  ${generatedAt}`, marginX, pageH - 30);
        doc.text('CONFIDENCIAL — Uso exclusivo de auditoría. Prohibida su divulgación sin autorización.', marginX, pageH - 20);
        doc.text(`Página ${i} de ${totalPages}`, pageW - marginX, pageH - 20, { align: 'right' });
    }

    // ── Descarga ───────────────────────────────────────────────────────────────
    const safeName = auditCase.patientName.replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ ]/g, '').trim().replace(/\s+/g, '_');
    const dateStr  = new Date().toISOString().split('T')[0];
    doc.save(`Expediente_Calidad_${safeName || 'Caso'}_${dateStr}.pdf`);
}
