import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY || "");

export interface IdeaAnalysisResult {
    title: string;
    decision: "AVANZAR" | "DETENER" | "PIVOTAR";
    viabilityScore: number; // 0-25
    strategicJustification: string;

    // Módulo 1: Ficha Conceptual
    conceptualFile: {
        problem: string;
        solution: string;
        target: string;
        businessModel: string;
        valueProposition: string;
        criticalRisks: string;
    };

    // Módulo 2: Evaluación Estructurada
    scoringMatrix: {
        economicPotential: { score: number; justification: string };
        executionFeasibility: { score: number; justification: string };
        riskLevel: { score: number; justification: string }; // 5=Bajo, 1=Alto
        operationalComplexity: { score: number; justification: string };
        timeToMoney: { score: number; justification: string };
    };

    // Módulo 3: Análisis de Consistencia
    consistencyAnalysis: {
        synthesis: string;
        perspectives: {
            medical: string;
            engineering: string;
            financial: string;
            legal: string;
        };
    };
}

export const analyzeBrainstormingContent = async (title: string, content: string, isBase64 = false): Promise<IdeaAnalysisResult> => {
    const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

    const prompt = `
    ROL: Actúa como un Experto Analista de Proyectos de nivel Senior con visión estratégica para Holding Portezuelo.
    
    TAREA: Realizar un análisis exhaustivo de la "Lluvia de Ideas" proporcionada.
    
    REQUERIMIENTOS TÉCNICOS:
    1. Genera una Decisión Estratégica (AVANZAR, DETENER, PIVOTAR).
    2. Calcula un Score de Viabilidad total sobre 25 puntos (5 puntos por cada uno de los 5 criterios de la matriz).
    3. Completa la Ficha Conceptual con lenguaje profesional y directo.
    4. Realiza una Evaluación Estructurada puntuando de 1 a 5 cada criterio con su justificación.
    5. Ejecuta un Análisis de Consistencia desde 4 perspectivas clave: Médico, Ingeniería, Financiero y Legal.

    ESTRUCTURA JSON REQUERIDA (Responde EXCLUSIVAMENTE en este formato):
    {
        "title": "${title}",
        "decision": "AVANZAR" | "DETENER" | "PIVOTAR",
        "viabilityScore": number,
        "strategicJustification": "Texto largo con el razonamiento directivo",
        "conceptualFile": {
            "problem": "...",
            "solution": "...",
            "target": "...",
            "businessModel": "...",
            "valueProposition": "...",
            "criticalRisks": "..."
        },
        "scoringMatrix": {
            "economicPotential": { "score": 1-5, "justification": "..." },
            "executionFeasibility": { "score": 1-5, "justification": "..." },
            "riskLevel": { "score": 1-5, "justification": "..." },
            "operationalComplexity": { "score": 1-5, "justification": "..." },
            "timeToMoney": { "score": 1-5, "justification": "..." }
        },
        "consistencyAnalysis": {
            "synthesis": "Análisis de cruces y consistencia del proyecto",
            "perspectives": {
                "medical": "Análisis desde salud",
                "engineering": "Análisis desde tecnología/arquitectura",
                "financial": "Análisis de ROI/Costos",
                "legal": "Análisis regulatorio/privacidad"
            }
        }
    }
    `;

    let result;
    if (isBase64) {
        result = await model.generateContent([
            prompt,
            {
                inlineData: {
                    data: content,
                    mimeType: "application/pdf"
                }
            }
        ]);
    } else {
        result = await model.generateContent([prompt, content]);
    }

    const response = await result.response;
    const text = response.text();

    const jsonString = text.replace(/```json|```/g, "").trim();
    return JSON.parse(jsonString);
};

// Alias para mantener compatibilidad si es necesario, pero usaremos la nueva función
export const analyzeBrainstormingDocument = async (fileName: string, contentBase64: string): Promise<IdeaAnalysisResult> => {
    return analyzeBrainstormingContent(fileName, contentBase64, true);
};
