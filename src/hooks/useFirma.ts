import { useState, useEffect, useCallback } from 'react';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { supabase } from '../lib/supabase';
import { getSignedDocumentUrl, extractDocumentPath } from '../lib/storageUrls';
import { obtenerRubricaDeUsuario } from './useRubrica';
import { logDocumentAccess } from './useDocuments';
import type { SolicitudRow, FirmanteRow, EstadoSolicitud } from '../types/firma';

// ─── Helpers de mapeo ─────────────────────────────────────────────────────────
const mapFirmante = (f: any, nombresPorId: Map<string, string>): FirmanteRow => ({
    id: f.id,
    solicitudId: f.solicitud_id,
    userId: f.user_id,
    userName: nombresPorId.get(f.user_id) || 'Usuario desconocido',
    pagina: f.pagina,
    posX: Number(f.pos_x),
    posY: Number(f.pos_y),
    ancho: Number(f.ancho),
    alto: Number(f.alto),
    estado: f.estado,
    firmadoAt: f.firmado_at,
    fingerprint: f.fingerprint,
});

const resolverNombres = async (ids: string[]): Promise<Map<string, string>> => {
    const unique = Array.from(new Set(ids.filter(Boolean)));
    if (unique.length === 0) return new Map();
    const { data } = await supabase.from('profiles_publicos').select('id, full_name').in('id', unique);
    return new Map((data || []).map((p: any) => [p.id, p.full_name]));
};

// ─── Audit ID: sha-256(documentId+userId+timestamp), primeros 16 hex ─────────
export const generarAuditId = async (documentId: string, userId: string, timestamp: string): Promise<string> => {
    const data = new TextEncoder().encode(`${documentId}${userId}${timestamp}`);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hex = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
    return hex.slice(0, 16);
};

// Solicitud más reciente de un documento (cualquier estado), para la sección
// de seguimiento en el modal de versiones.
export const obtenerSolicitudDeDocumento = async (documentId: string): Promise<SolicitudRow | null> => {
    const { data, error } = await supabase
        .from('doc_firma_solicitudes')
        .select('id, document_id, solicitante, mensaje, plazo, estado, created_at, firmantes:doc_firma_firmantes(*)')
        .eq('document_id', documentId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
    if (error || !data) { if (error) console.error('Error obteniendo solicitud del documento:', error); return null; }

    const nombresPorId = await resolverNombres([data.solicitante, ...(data.firmantes || []).map((f: any) => f.user_id)]);
    return {
        id: data.id,
        documentId: data.document_id,
        solicitante: data.solicitante,
        solicitanteName: nombresPorId.get(data.solicitante),
        mensaje: data.mensaje,
        plazo: data.plazo,
        estado: data.estado,
        createdAt: data.created_at,
        firmantes: (data.firmantes || []).map((f: any) => mapFirmante(f, nombresPorId)),
    };
};

// ─── Listado de usuarios activos (para elegir firmantes) ─────────────────────
export const buscarUsuariosActivos = async (term: string): Promise<{ id: string; fullName: string }[]> => {
    let q = supabase.from('profiles_publicos').select('id, full_name').eq('is_deleted', false).order('full_name').limit(30);
    if (term.trim().length >= 2) q = q.ilike('full_name', `%${term.trim()}%`);
    const { data, error } = await q;
    if (error) { console.error('Error buscando usuarios:', error); return []; }
    return (data || []).map((p: any) => ({ id: p.id, fullName: p.full_name }));
};

// ─── Hook principal ───────────────────────────────────────────────────────────
export const useFirma = () => {
    // Solicitudes PENDIENTES por documento (para badges "En firma X/Y" en las tarjetas).
    const [solicitudesPorDocumento, setSolicitudesPorDocumento] = useState<Map<string, SolicitudRow>>(new Map());
    // Firmantes pendientes para MÍ (sección "Pendientes de firma" del sidebar).
    const [pendientesParaMi, setPendientesParaMi] = useState<(FirmanteRow & { documentTitle: string; documentUrl: string; solicitud: SolicitudRow })[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchTodo = useCallback(async () => {
        try {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();

            const { data: solicitudes, error: solErr } = await supabase
                .from('doc_firma_solicitudes')
                .select('id, document_id, solicitante, mensaje, plazo, estado, created_at, firmantes:doc_firma_firmantes(*)')
                .eq('estado', 'pendiente');
            if (solErr) throw solErr;

            const rows = solicitudes || [];
            const allIds = rows.flatMap((s: any) => [s.solicitante, ...(s.firmantes || []).map((f: any) => f.user_id)]);
            const nombresPorId = await resolverNombres(allIds);

            const solicitudesMapeadas: SolicitudRow[] = rows.map((s: any) => ({
                id: s.id,
                documentId: s.document_id,
                solicitante: s.solicitante,
                solicitanteName: nombresPorId.get(s.solicitante),
                mensaje: s.mensaje,
                plazo: s.plazo,
                estado: s.estado,
                createdAt: s.created_at,
                firmantes: (s.firmantes || []).map((f: any) => mapFirmante(f, nombresPorId)),
            }));

            const porDoc = new Map<string, SolicitudRow>();
            solicitudesMapeadas.forEach(s => porDoc.set(s.documentId, s));
            setSolicitudesPorDocumento(porDoc);

            // Mis pendientes: documentos asociados, para mostrar título/url en el sidebar.
            const myPend = solicitudesMapeadas.flatMap(s =>
                s.firmantes.filter(f => f.userId === user?.id && f.estado === 'pendiente').map(f => ({ ...f, solicitud: s }))
            );
            if (myPend.length > 0) {
                const docIds = Array.from(new Set(myPend.map(p => p.solicitud.documentId)));
                const { data: docs } = await supabase.from('documents').select('id, title, url').in('id', docIds);
                const docsById = new Map((docs || []).map((d: any) => [d.id, d]));
                setPendientesParaMi(myPend.map(p => ({
                    ...p,
                    documentTitle: docsById.get(p.solicitud.documentId)?.title || 'Documento',
                    documentUrl: docsById.get(p.solicitud.documentId)?.url || '',
                })));
            } else {
                setPendientesParaMi([]);
            }
        } catch (err) {
            console.error('Error cargando solicitudes de firma:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchTodo(); }, [fetchTodo]);

    // Crea la solicitud + un firmante por recuadro posicionado.
    const crearSolicitud = async (params: {
        documentId: string;
        mensaje?: string;
        plazo: string;
        firmantes: { userId: string; pagina: number; posX: number; posY: number; ancho: number; alto: number }[];
    }): Promise<{ success: boolean; solicitudId?: string; error?: string }> => {
        try {
            if (params.firmantes.length === 0) return { success: false, error: 'Agrega al menos un firmante' };
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return { success: false, error: 'No hay sesión activa' };

            const { data: sol, error: solErr } = await supabase
                .from('doc_firma_solicitudes')
                .insert({ document_id: params.documentId, solicitante: user.id, mensaje: params.mensaje || null, plazo: params.plazo, estado: 'pendiente' })
                .select('id')
                .single();
            if (solErr) throw solErr;

            const rows = params.firmantes.map(f => ({
                solicitud_id: sol.id,
                user_id: f.userId,
                pagina: f.pagina,
                pos_x: f.posX,
                pos_y: f.posY,
                ancho: f.ancho,
                alto: f.alto,
                estado: 'pendiente',
            }));
            const { error: firErr } = await supabase.from('doc_firma_firmantes').insert(rows);
            if (firErr) throw firErr;

            await fetchTodo();
            return { success: true, solicitudId: sol.id };
        } catch (err: any) {
            console.error('Error creando solicitud de firma:', err);
            return { success: false, error: err.message || 'No se pudo crear la solicitud' };
        }
    };

    const anularSolicitud = async (id: string): Promise<{ success: boolean; error?: string }> => {
        try {
            const { error } = await supabase.from('doc_firma_solicitudes').update({ estado: 'anulada' as EstadoSolicitud }).eq('id', id);
            if (error) throw error;
            await fetchTodo();
            return { success: true };
        } catch (err: any) {
            console.error('Error anulando solicitud:', err);
            return { success: false, error: err.message || 'No se pudo anular la solicitud' };
        }
    };

    // ── Fase 3: firmar ────────────────────────────────────────────────────────
    // Estampa la rúbrica + metadatos en el recuadro del firmante y actualiza
    // documents.url con bloqueo optimista (reintenta hasta 3 veces si otro
    // firmante estampó en el intertanto).
    const firmarDocumento = async (
        solicitud: SolicitudRow,
        miFirmante: FirmanteRow,
        documentCategory: string,
    ): Promise<{ success: boolean; error?: string }> => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { success: false, error: 'No hay sesión activa' };

        const { path: rubricaPath, bytes: rubricaBytes } = await obtenerRubricaDeUsuario(user.id);
        if (!rubricaPath || !rubricaBytes) {
            return { success: false, error: 'No tienes una rúbrica registrada' };
        }

        for (let intento = 0; intento < 3; intento++) {
            try {
                // a. Releer documents.url actual (por si otro firmante estampó recién).
                const { data: docRow, error: docErr } = await supabase
                    .from('documents')
                    .select('url')
                    .eq('id', solicitud.documentId)
                    .single();
                if (docErr) throw docErr;
                const urlActual: string = docRow.url;

                // b. Descargar y estampar.
                const signedUrl = await getSignedDocumentUrl(urlActual);
                if (!signedUrl) throw new Error('No se pudo acceder al documento');
                const pdfBytes = await (await fetch(signedUrl)).arrayBuffer();
                const pdfDoc = await PDFDocument.load(pdfBytes);
                const pages = pdfDoc.getPages();
                const page = pages[miFirmante.pagina];
                if (!page) throw new Error('La página del recuadro ya no existe en el documento');

                const { width: pageW, height: pageH } = page.getSize();
                const boxW = miFirmante.ancho * pageW;
                const boxH = miFirmante.alto * pageH;
                const boxX = miFirmante.posX * pageW;
                // Conversión de coordenadas: fracciones con origen arriba-izquierda → pdf-lib origen abajo-izquierda.
                const boxYBottom = pageH * (1 - miFirmante.posY - miFirmante.alto);

                const now = new Date();
                const auditId = await generarAuditId(solicitud.documentId, user.id, now.toISOString());

                const rubricaImg = await pdfDoc.embedPng(rubricaBytes);
                const escala = Math.min(boxW / rubricaImg.width, boxH / rubricaImg.height);
                const imgW = rubricaImg.width * escala;
                const imgH = rubricaImg.height * escala;
                page.drawImage(rubricaImg, {
                    x: boxX + (boxW - imgW) / 2,
                    y: boxYBottom + (boxH - imgH),
                    width: imgW,
                    height: imgH,
                });

                const textFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
                const nombreCompleto = user.email || 'Usuario AMIS';
                const { data: perfil } = await supabase.from('profiles_publicos').select('full_name').eq('id', user.id).maybeSingle();
                const nombreMostrado = perfil?.full_name || nombreCompleto;
                const fechaHora = now.toLocaleString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

                let ty = boxYBottom - 8;
                const lineas = [nombreMostrado, fechaHora, `Audit ID: ${auditId}`];
                for (const linea of lineas) {
                    page.drawText(linea, { x: boxX, y: ty, size: 6, font: textFont, color: rgb(0.35, 0.35, 0.35) });
                    ty -= 8;
                }

                // c. Subir a ruta NUEVA (el trigger de versionado archiva la anterior)
                //    y UPDATE optimista condicionado a que url no haya cambiado.
                const modifiedBytes = await pdfDoc.save();
                const fileExt = (extractDocumentPath(urlActual) ?? urlActual).split('.').pop();
                const newPath = `${documentCategory || 'other'}/firmado-${Date.now()}.${fileExt}`;
                const { error: uploadErr } = await supabase.storage.from('documents').upload(newPath, modifiedBytes, { contentType: 'application/pdf' });
                if (uploadErr) throw uploadErr;

                // ¿Soy el último firmante pendiente?
                const otrosFirmantesPendientes = solicitud.firmantes.filter(f => f.id !== miFirmante.id && f.estado === 'pendiente');
                const esUltimo = otrosFirmantesPendientes.length === 0;

                const updatePayload: Record<string, any> = { url: newPath };
                if (esUltimo) {
                    const nombresTodos = solicitud.firmantes.map(f => f.userId === user.id ? nombreMostrado : (f.userName || 'Firmante'));
                    updatePayload.signed = true;
                    updatePayload.signed_at = now.toISOString();
                    updatePayload.signer_name = nombresTodos.join(', ');
                }

                const { data: updData, error: updErr } = await supabase
                    .from('documents')
                    .update(updatePayload)
                    .eq('id', solicitud.documentId)
                    .eq('url', urlActual)
                    .select('id');
                if (updErr) throw updErr;

                if (!updData || updData.length === 0) {
                    // Carrera: otro firmante actualizó url primero. Reintentar.
                    continue;
                }

                // d. Marcar mi firmante como firmado.
                const { error: firErr } = await supabase
                    .from('doc_firma_firmantes')
                    .update({ estado: 'firmado', firmado_at: now.toISOString(), fingerprint: auditId })
                    .eq('id', miFirmante.id);
                if (firErr) throw firErr;

                // e. Log + refresh.
                logDocumentAccess(solicitud.documentId, 'firmar');
                await fetchTodo();
                return { success: true };
            } catch (err: any) {
                if (intento === 2) {
                    console.error('Error firmando documento:', err);
                    return { success: false, error: err.message || 'No se pudo firmar el documento' };
                }
                // reintentar
            }
        }
        return { success: false, error: 'Conflicto al firmar (otro firmante estampó al mismo tiempo). Intenta de nuevo.' };
    };

    return {
        solicitudesPorDocumento,
        pendientesParaMi,
        loading,
        crearSolicitud,
        anularSolicitud,
        firmarDocumento,
        refresh: fetchTodo,
    };
};
