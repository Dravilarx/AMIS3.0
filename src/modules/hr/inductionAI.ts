import { getGeminiModel } from '../../lib/gemini';

export interface DocumentValidationResult {
    isValid: boolean;
    confidence: number;
    observation: string;
    extractedExpiryDate?: string;
    mismatchFields: string[];
}

/**
 * Validador Inteligente de Documentos para Inducción (Agrawall AI)
 */
export async function validateInductionDocument(
    file: File,
    requirementLabel: string,
    professionalName: string,
    professionalId: string
): Promise<DocumentValidationResult> {
    const model = getGeminiModel('gemini-1.5-flash');

    try {
        const filePart = await fileToGenerativePart(file);

        const prompt = `
        ROL: Auditor de Documentación de RRHH para Acreditación de Salud.
        TAREA: Validar si el documento adjunto corresponde a lo solicitado.

        DATOS DEL PROFESIONAL:
        - Nombre: ${professionalName}
        - RUT/DNI: ${professionalId}

        REQUERIMIENTO A SATISFACER:
        - "${requirementLabel}"

        INSTRUCCIONES:
        1. Analiza el contenido del documento.
        2. Verifica si el nombre o identificación en el documento coincide con los datos del profesional.
        3. Determina si el tipo de documento es el correcto para el requerimiento (ej: si piden Título, no debe ser una Cédula).
        4. Busca fechas de vencimiento o caducidad.

        RESPONDE EXCLUSIVAMENTE EN JSON:
        {
          "isValid": boolean,
          "confidence": number (0-1),
          "observation": "Breve explicación del resultado",
          "extractedExpiryDate": "YYYY-MM-DD" (si aplica y se encuentra),
          "mismatchFields": ["nombre", "rut", "tipo_documento"] (incluye los que no coincidan)
        }
        `;

        const result = await model.generateContent([prompt, filePart]);
        const response = await result.response;
        const text = response.text().trim();
        const jsonString = text.replace(/```json|```/g, "").trim();

        return JSON.parse(jsonString) as DocumentValidationResult;
    } catch (error) {
        console.error('Error en validación AI:', error);
        return {
            isValid: true, // Fail safe o neutral
            confidence: 0,
            observation: 'No se pudo realizar la validación automática por IA.',
            mismatchFields: []
        };
    }
}

async function fileToGenerativePart(file: File): Promise<{ inlineData: { data: string; mimeType: string } }> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64data = reader.result as string;
            const base64 = base64data.split(',')[1];
            resolve({
                inlineData: {
                    data: base64,
                    mimeType: file.type
                }
            });
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}
