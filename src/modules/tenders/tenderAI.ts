import { getGeminiModel } from '../../lib/gemini';
import type { Tender } from '../../types/tenders';

/**
 * Servicio de IA para el módulo de Licitaciones.
 * Utiliza Gemini para extraer datos estructurados de documentos de bases de licitación.
 */
export async function parseTenderPDF(pdfBase64: string): Promise<Partial<Tender>> {
    const model = getGeminiModel('gemini-1.5-flash');

    const prompt = `
    Analiza este documento de bases de licitación y extrae la información para completar la Matriz de Riesgo AMIS 3.0.
    Devuelve un objeto JSON con la siguiente estructura exacta:
    {
      "identificacion": { "modalidad": string, "tipoServicio": string, "duracion": string },
      "volumen": { "total": number, "urgencia": number, "hospitalizado": number, "ambulante": number },
      "riesgoSLA": { "escala": number (0-8), "impacto": string },
      "multas": { "caidaSistema": number, "errorDiagnostico": number, "confidencialidad": number, "topePorcentualContrato": number },
      "integracion": { "dicom": boolean, "hl7": boolean, "risPacs": boolean, "servidorOnPrem": boolean },
      "economia": { "presupuestoTotal": number, "precioUnitarioHabil": number, "precioUnitarioUrgencia": number }
    }
    Si un valor no está presente, estima un valor prudente o deja null. 
    Para riesgoSLA.escala usa esta regla: <2h=8, 2-4h=7, 4-6h=6, 6-12h=4, >12h=2.
  `;

    try {
        const result = await model.generateContent([
            prompt,
            {
                inlineData: {
                    data: pdfBase64,
                    mimeType: 'application/pdf',
                },
            },
        ]);
        const text = result.response.text();
        // Extraer JSON del texto (por si Gemini añade markdown blocks)
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        return jsonMatch ? JSON.parse(jsonMatch[0]) : {};
    } catch (error) {
        console.error('Error parsing tender with Gemini:', error);
        throw new Error('No se pudo procesar el documento con IA.');
    }
}
