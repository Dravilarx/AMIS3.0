import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY || "");

export interface IdeaAnalysisResult {
    title: string;
    executiveSummary: string;
    strategicAnalysis: {
        swot: { strengths: string[], weaknesses: string[], opportunities: string[], threats: string[] };
        viability: string;
        strategicAlignment: string;
    };
    functionalGaps: string[];
    kpis: { name: string, value: string }[];
    conclusions: string[];
}

export const analyzeBrainstormingDocument = async (fileName: string, contentBase64: string): Promise<IdeaAnalysisResult> => {
    const model = genAI.getGenerativeModel({ model: "gemini-3.0-flash" });

    const prompt = `
    ROL: Actúa como un Experto Analista de Proyectos de nivel Senior con visión estratégica.
    
    TAREA: Realizar un análisis exhaustivo del documento adjunto ("Lluvia de Ideas").
    
    AUDIENCIA: Ejecutivos C-Level (Medicina, Ingeniería, Finanzas y Legal).
    
    REQUERIMIENTOS TÉCNICOS:
    1. Extracción Parametrizada: Identifica ideas, riesgos, recursos y plazos.
    2. Cruces y Consistencia: Señala contradicciones o lagunas de información.
    3. Metodología: Aplica FODA y evaluación de viabilidad.
    4. Formato: Presenta resultados claros, concisos y accionables (KPIs).

    RESPONDE EXCLUSIVAMENTE EN FORMATO JSON con esta estructura:
    {
        "title": "Nombre del proyecto/idea",
        "executiveSummary": "Resumen de alto nivel para directivos",
        "strategicAnalysis": {
            "swot": { "strengths": [], "weaknesses": [], "opportunities": [], "threats": [] },
            "viability": "Análisis de factibilidad técnica/económica",
            "strategicAlignment": "Impacto estratégico"
        },
        "functionalGaps": ["Lagunas detectadas"],
        "kpis": [{ "name": "KPI", "value": "Valor" }],
        "conclusions": ["Conclusión ejecutiva"]
    }
    `;

    const result = await model.generateContent([
        prompt,
        {
            inlineData: {
                data: contentBase64,
                mimeType: "application/pdf"
            }
        }
    ]);

    const response = await result.response;
    const text = response.text();

    // Limpieza de posibles tags de markdown que Gemini a veces añade
    const jsonString = text.replace(/```json|```/g, "").trim();
    return JSON.parse(jsonString);
};
