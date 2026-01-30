import { getGeminiModel } from '../../lib/gemini';
import type { AgrawallLevel } from '../../types/audit';
import { GoogleGenerativeAI } from '@google/generative-ai';

export interface AgrawallAnalysis {
    score: AgrawallLevel;
    reasoning: string;
    findings: string[];
}

/**
 * Clasificador de Informes Médicos basado en la Escala de Agrawall (1-4).
 */
export async function analyzeClinicalReport(reportText: string): Promise<AgrawallAnalysis> {
    const model = getGeminiModel();

    const prompt = `
    Eres un experto en auditoría clínica de Holding Portezuelo. 
    Tu tarea es analizar el siguiente informe radiológico/clínico y clasificarlo en la Escala de Agrawall (1 a 4).

    DEFINICIÓN DE LA ESCALA DE AGRAWALL:
    - Nivel 1: Estudio normal, sin hallazgos patológicos.
    - Nivel 2: Hallazgos menores o incidentales que no requieren seguimiento inmediato.
    - Nivel 3: Hallazgos significativos que requieren seguimiento médico o estudios adicionales.
    - Nivel 4: Hallazgos críticos o de emergencia que requieren acción inmediata (ej. neumotórax, sangrado activo, ACV agudo).

    INFORME CLÍNICO A ANALIZAR:
    """
    ${reportText}
    """

    RESPUESTA REQUERIDA (JSON):
    Debes responder ÚNICAMENTE con un objeto JSON con la siguiente estructura:
    {
      "score": <number 1-4>,
      "reasoning": "<breve explicación de por qué esa puntuación>",
      "findings": ["<hallazgo 1>", "<hallazgo 2>"]
    }
  `;

    try {
        const result = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: {
                responseMimeType: "application/json",
            }
        });
        const text = result.response.text().trim();
        return JSON.parse(text) as AgrawallAnalysis;
    } catch (error) {
        console.error('Error analyzing Agrawall Scale:', error);
        return {
            score: 1,
            reasoning: 'Error en procesamiento IA (Fallback a Nivel 1)',
            findings: ['No se pudieron extraer hallazgos']
        };
    }
}

/**
 * Analiza un PDF de informe clínico usando Gemini File API
 */
export async function analyzeClinicalReportFromPDF(pdfFile: File): Promise<AgrawallAnalysis> {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error('Gemini API key not configured');
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    try {
        // Convert File to base64
        const fileData = await fileToGenerativePart(pdfFile);

        const model = getGeminiModel('gemini-3-flash-preview');

        const prompt = `
        ROL: Experto en Auditoría Clínica Senior de Holding Portezuelo.
        TAREA: Analizar el informe médico adjunto (PDF) y clasificarlo según la Escala de Agrawall.

        DEFINICIÓN ESCALA AGRAWALL (1-4):
        - 1: Informe Correcto (Sin discrepancia).
        - 2: Discrepancia Menor (Sin importancia clínica).
        - 3: Discrepancia Moderada (Importancia clínica potencial).
        - 4: Discrepancia Grave (Importancia clínica real).

        REQUISITO: Debes analizar el PDF y devolver un objeto JSON estructurado.
        
        FORMATO JSON (Responde EXCLUSIVAMENTE en este formato):
        {
          "score": number (1, 2, 3 o 4),
          "reasoning": "Texto breve explicando el razonamiento médico",
          "findings": ["hallazgo 1", "hallazgo 2"]
        }
        `;

        console.log('[Gemini 3] Iniciando análisis Agrawall PDF...');
        const result = await model.generateContent([
            prompt,
            fileData
        ]);

        const response = await result.response;
        const text = response.text().trim();
        console.log('[Gemini 3] Respuesta recibida:', text);

        // Limpieza de formato markdown si existe
        const jsonString = text.replace(/```json|```/g, "").trim();
        return JSON.parse(jsonString) as AgrawallAnalysis;
    } catch (error) {
        console.error('Error detallado en análisis Agrawall:', error);
        throw error;
    }
}

/**
 * Convierte un File a formato GenerativePart para Gemini
 */
async function fileToGenerativePart(file: File): Promise<{ inlineData: { data: string; mimeType: string } }> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64data = reader.result as string;
            // Remove the data URL prefix (e.g., "data:application/pdf;base64,")
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
