import { supabase } from '../lib/supabase';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import type { Document } from '../types/communication';

export const useSignature = () => {

    // Función para generar un fingerprint único (Hash simple para auditoría)
    const generateFingerprint = () => {
        return Array.from(crypto.getRandomValues(new Uint8Array(16)))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    };

    const signNativeDocument = async (doc: Document, signerName: string, styleId: string) => {
        try {
            // 1. Obtener contenido actual
            const response = await fetch(doc.url);
            let content = await response.text();

            const fingerprint = generateFingerprint();
            const date = new Date().toLocaleString();

            // 2. Definir estilos de firma (Sincronizados con el modal)
            const fonts: Record<string, string> = {
                '1': "'Great Vibes', cursive",
                '2': "'Dancing Script', cursive",
                '3': "'Homemade Apple', cursive",
                '4': "'Alex Brush', cursive"
            };

            const selectedFont = fonts[styleId] || fonts['1'];

            // 3. Inyectar bloque de firma al final del HTML
            const signatureHTML = `
                <div id="amis-signature-block" style="margin-top: 50px; padding-top: 20px; border-top: 1px solid #eee; font-family: sans-serif;">
                    <div style="display: flex; flex-direction: column; align-items: flex-start; gap: 5px;">
                        <span style="font-family: ${selectedFont}; font-size: 32px; color: #3b82f6;">${signerName}</span>
                        <div style="height: 1px; width: 200px; background: #eee; margin: 10px 0;"></div>
                        <span style="font-size: 14px; font-weight: bold; color: #333;">${signerName}</span>
                        <span style="font-size: 10px; color: #999; text-transform: uppercase; letter-spacing: 1px;">Firmado Electrónicamente vía AMIS 3.0</span>
                        <span style="font-size: 9px; color: #ccc;">Audit ID: ${fingerprint} | Fecha: ${date}</span>
                    </div>
                </div>
            `;

            // Insertar antes del cierre de body si existe, sino al final
            if (content.includes('</body>')) {
                content = content.replace('</body>', `${signatureHTML}</body>`);
            } else {
                content += signatureHTML;
            }

            // 4. Re-subir al storage (sobreescribir)
            const filePath = doc.url.split('/storage/v1/object/public/documents/')[1];
            const blob = new Blob([content], { type: 'text/html' });

            const { error: uploadError } = await supabase.storage
                .from('documents')
                .upload(filePath, blob, {
                    contentType: 'text/html',
                    upsert: true
                });

            if (uploadError) throw uploadError;

            // 5. Actualizar metadata en DB
            const { error: dbError } = await supabase
                .from('documents')
                .update({
                    signed: true,
                    signed_at: new Date().toISOString(),
                    signer_name: signerName,
                    signature_fingerprint: fingerprint
                })
                .eq('id', doc.id);

            if (dbError) throw dbError;

            return { success: true };
        } catch (err: any) {
            console.error('Error signing native doc:', err);
            return { success: false, error: err.message };
        }
    };

    const signPDFDocument = async (
        doc: Document,
        signerName: string,
        options: { x?: number, y?: number, pageIndex?: number } = {}
    ) => {
        try {
            // 1. Verificar permisos (Workflow)
            // Por ahora simulamos el rol 'admin'. En producción vendría del Auth context.
            const userRole = 'admin';

            // 2. Descargar PDF
            const response = await fetch(doc.url);
            const pdfBytes = await response.arrayBuffer();
            const pdfDoc = await PDFDocument.load(pdfBytes);

            // Registrar fuentes estándar
            const signatureFont = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic);
            const textFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

            const pages = pdfDoc.getPages();

            // Lógica de Posicionamiento Inteligente
            // Si x e y vienen como porcentajes (0-100)
            const { x = 50, y = 90, pageIndex = 0 } = options;

            // Determinar qué página firmar basado en la posición Y si es un documento largo
            // En nuestro visor, y=0 es el tope del documento total.
            // Si el PDF tiene N páginas, cada página ocupa 100/N por ciento del scroll total.
            const pagePercent = 100 / pages.length;
            const targetPageIndex = Math.min(Math.floor(y / pagePercent), pages.length - 1);
            const targetPage = pages[targetPageIndex];
            const { width, height } = targetPage.getSize();

            // Convertir porcentaje global a porcentaje local de la página
            const localYPercent = ((y % pagePercent) / pagePercent) * 100;

            // Mapeo PDF: x=0 (izq), y=0 (abajo)
            const posX = (x / 100) * width;
            const posY = height - ((localYPercent / 100) * height); // Invertimos Y para PDF-lib

            // Dibujar Sello de Firma
            const signatureText = signerName;
            const dateText = `Firmado digitalmente: ${new Date().toLocaleString()}`;
            const fingerprint = `AMIS-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

            // Fondo sutil
            targetPage.drawRectangle({
                x: posX - 100,
                y: posY - 25,
                width: 200,
                height: 50,
                color: rgb(0.95, 0.97, 1),
                opacity: 0.8,
            });

            // Texto de Firma
            targetPage.drawText(signatureText, {
                x: posX - 90,
                y: posY + 5,
                size: 24,
                font: signatureFont,
                color: rgb(0.1, 0.2, 0.6),
            });

            // Metadatos
            targetPage.drawText(dateText, {
                x: posX - 90,
                y: posY - 10,
                size: 6,
                font: textFont,
                color: rgb(0.4, 0.4, 0.4),
            });

            targetPage.drawText(`VERIFICACIÓN: ${fingerprint}`, {
                x: posX - 90,
                y: posY - 18,
                size: 5,
                font: textFont,
                color: rgb(0.5, 0.5, 0.5),
            });

            // 4. Guardar y Re-subir
            const modifiedPdfBytes = await pdfDoc.save();
            const filePath = doc.url.split('/storage/v1/object/public/documents/')[1].split('?')[0];

            const { error: uploadError } = await supabase.storage
                .from('documents')
                .upload(filePath, modifiedPdfBytes, {
                    contentType: 'application/pdf',
                    upsert: true,
                    cacheControl: '0'
                });

            if (uploadError) throw uploadError;

            // 5. Registrar en Historial de Firmas
            const { error: sigError } = await supabase
                .from('document_signatures')
                .insert({
                    document_id: doc.id,
                    signer_name: signerName,
                    fingerprint,
                    x_pos: x,
                    y_pos: y,
                    page_index: targetPageIndex,
                    signer_role: userRole
                });

            if (sigError) throw sigError;

            // 6. Actualizar Documento Principal
            const timestamp = Date.now();
            const newUrl = doc.url.split('?')[0] + `?v=${timestamp}`;

            const { error: updateError } = await supabase
                .from('documents')
                .update({
                    signed: true,
                    url: newUrl,
                    signer_name: signerName, // Último firmante
                    status: 'signed'
                })
                .eq('id', doc.id);

            if (updateError) throw updateError;

            return { success: true, url: newUrl };
        } catch (err: any) {
            console.error('Error signing PDF:', err);
            return { success: false, error: err.message };
        }
    };

    return { signNativeDocument, signPDFDocument };
};
