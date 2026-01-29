import { getGeminiModel } from '../../lib/gemini';
import type { AgrawallLevel } from '../../types/audit';

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
