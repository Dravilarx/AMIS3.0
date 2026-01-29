import { getGeminiModel } from '../../lib/gemini';
import type { Tender } from '../../types/tenders';

/**
 * Servicio de IA para el módulo de Licitaciones.
 * Utiliza Gemini para extraer datos estructurados de documentos de bases de licitación.
 */
export async function parseTenderPDF(pdfBase64: string): Promise<Partial<Tender>> {
    const model = getGeminiModel('gemini-3.0-flash');

    const prompt = `
    Analiza este documento de bases de licitación y extrae la información para completar la Matriz de Riesgo AMIS 3.0.
    
    IMPORTANTE: DEVUELVE ÚNICAMENTE EL OBJETO JSON, SIN FORMATO MARKDOWN NI OTRO TEXTO.
    
    Estructura JSON requerida:
    {
      "identificacion": { "modalidad": string, "tipoServicio": string, "duracion": string },
      "volumen": { "total": number, "urgencia": number, "hospitalizado": number, "ambulante": number },
      "riesgoSLA": { "escala": number (0-8), "impacto": string },
      "multas": { "caidaSistema": number, "errorDiagnostico": number, "confidencialidad": number, "topePorcentualContrato": number },
      "integracion": { "dicom": boolean, "hl7": boolean, "risPacs": boolean, "servidorOnPrem": boolean },
      "economia": { "presupuestoTotal": number, "precioUnitarioHabil": number, "precioUnitarioUrgencia": number }
    }
    
    Reglas de Negocio:
    1. Si un valor no está presente, estima un valor prudente o deja null. 
    2. Para riesgoSLA.escala usa esta regla: SLA < 2h (muy crítico) = 8, 2-4h = 7, 4-6h = 6, 6-12h = 4, >12h = 2.
    3. modalidad: 'Telemedicina', 'Presencial' o 'Híbrido'.
    4. tipoServicio: Nombre descriptivo (ej: 'Radiología de Urgencia').
  `;

    try {
        const result = await model.generateContent({
            contents: [{
                role: 'user',
                parts: [
                    { text: prompt },
                    {
                        inlineData: {
                            data: pdfBase64,
                            mimeType: 'application/pdf',
                        },
                    },
                ],
            }],
            generationConfig: {
                responseMimeType: "application/json",
            }
        });
        const text = result.response.text();

        // Limpiar el texto para obtener solo el JSON
        const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const jsonMatch = cleanText.match(/\{[\s\S]*\}/);

        if (!jsonMatch) {
            console.error('Gemini no devolvió un JSON válido:', text);
            throw new Error('La respuesta de la IA no tiene el formato correcto.');
        }

        return JSON.parse(jsonMatch[0]);
    } catch (error) {
        console.error('Error parsing tender with Gemini:', error);
        throw error;
    }
}
