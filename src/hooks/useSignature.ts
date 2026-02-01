import { supabase } from '../lib/supabase';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import type { Document } from '../types/communication';
import { useAuth } from './useAuth';

export const useSignature = () => {
    const { user } = useAuth();

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
        signatures: Array<{ x: number, y: number, pageIndex?: number }>,
        size: 'small' | 'medium' | 'large' = 'medium',
        color: 'blue' | 'black' | 'gray' = 'blue'
    ) => {
        try {
            // 1. Descargar PDF
            const response = await fetch(doc.url);
            const pdfBytes = await response.arrayBuffer();
            const pdfDoc = await PDFDocument.load(pdfBytes);

            // Registrar fuentes estándar
            const signatureFont = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic);
            const textFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

            // Mapeo de tamaños y colores (Fase 1)
            const sizeMap = {
                small: { width: 160, height: 40, fontSize: 18, textSize: 5 },
                medium: { width: 200, height: 50, fontSize: 24, textSize: 6 },
                large: { width: 240, height: 60, fontSize: 30, textSize: 7 }
            };
            const colorMap = {
                blue: rgb(0.145, 0.388, 0.922), // rgb(37, 99, 235)
                black: rgb(0, 0, 0),
                gray: rgb(0.42, 0.447, 0.502) // rgb(107, 114, 128)
            };

            const dimensions = sizeMap[size];
            const signatureColor = colorMap[color];

            const pages = pdfDoc.getPages();

            for (const sig of signatures) {
                const { x, y } = sig;

                // Lógica de Posicionamiento Inteligente corregida
                // Dividimos el scroll total (100%) por el número de páginas
                const pagePercent = 100 / pages.length;

                // Encontrar el índice de página: y / pagePercent
                // Ejemplo: 2 páginas, pagePercent = 50. Si y = 75, target = 1.
                const targetPageIndex = Math.min(Math.floor(y / pagePercent), pages.length - 1);
                const targetPage = pages[targetPageIndex];
                const { width, height } = targetPage.getSize();

                // Calcular Y local dentro de la página elegida
                // y % pagePercent nos da cuánto ha avanzado en esa página específica
                const localYRelative = (y % pagePercent) / pagePercent; // 0 a 1

                // PDF-lib usa y=0 como fondo de página. 
                // En UI, y=0 es arriba. Por lo tanto, invertimos.
                const posX = (x / 100) * width;
                const posY = height - (localYRelative * height);

                const fingerprint = `AMIS-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

                // Dibujar Sello de Firma con personalización
                targetPage.drawRectangle({
                    x: posX - dimensions.width / 2,
                    y: posY - dimensions.height / 2,
                    width: dimensions.width,
                    height: dimensions.height,
                    color: rgb(0.95, 0.97, 1),
                    opacity: 0.8,
                });

                targetPage.drawText(signerName, {
                    x: posX - (dimensions.width / 2) + 10,
                    y: posY + (dimensions.height / 4),
                    size: dimensions.fontSize,
                    font: signatureFont,
                    color: signatureColor,
                });

                targetPage.drawText(`Firmado digitalmente: ${new Date().toLocaleString()}`, {
                    x: posX - (dimensions.width / 2) + 10,
                    y: posY - (dimensions.height / 4),
                    size: dimensions.textSize,
                    font: textFont,
                    color: rgb(0.4, 0.4, 0.4),
                });

                targetPage.drawText(`VERIFICACIÓN: ${fingerprint}`, {
                    x: posX - (dimensions.width / 2) + 10,
                    y: posY - (dimensions.height / 2) + 5,
                    size: dimensions.textSize - 1,
                    font: textFont,
                    color: rgb(0.5, 0.5, 0.5),
                });

                // Registrar cada firma individualmente en el historial
                await supabase
                    .from('document_signatures')
                    .insert({
                        document_id: doc.id,
                        signer_name: signerName,
                        fingerprint,
                        x_pos: x,
                        y_pos: y,
                        page_index: targetPageIndex,
                        signer_role: user?.role || 'operator',
                        user_id: user?.id,
                        size,
                        color
                    });
            }

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

            // 6. Actualizar Documento Principal
            const timestamp = Date.now();
            const newUrl = doc.url.split('?')[0] + `?v=${timestamp}`;

            const { error: updateError } = await supabase
                .from('documents')
                .update({
                    signed: true,
                    url: newUrl,
                    signer_name: signerName,
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

    const requestSignature = async (documentId: string, role: string) => {
        try {
            const { data, error } = await supabase
                .from('document_signature_requests')
                .insert({
                    document_id: documentId,
                    signer_role: role,
                    requested_by: (await supabase.auth.getUser()).data.user?.id
                })
                .select()
                .single();

            if (error) throw error;
            return { success: true, data };
        } catch (err: any) {
            console.error('Error requesting signature:', err);
            return { success: false, error: err.message };
        }
    };

    return { signNativeDocument, signPDFDocument, requestSignature };
};


