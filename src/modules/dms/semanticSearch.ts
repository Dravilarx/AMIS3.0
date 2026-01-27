import { getGeminiModel } from '../../lib/gemini';
import type { Document } from '../../types/communication';

/**
 * Realiza una búsqueda semántica en una lista de documentos usando Gemini.
 * Devuelve los IDs de los documentos más relevantes para el query.
 */
export async function searchDocumentsSemantically(query: string, documents: Document[]): Promise<string[]> {
    const model = getGeminiModel();

    const docContext = documents.map(d => ({
        id: d.id,
        title: d.title,
        summary: d.contentSummary,
        category: d.category
    }));

    const prompt = `
    Actúa como un experto en gestión documental clínica y legal.
    Tu tarea es clasificar y filtrar documentos basados en una consulta de búsqueda semántica.
    
    CONSULTA DEL USUARIO: "${query}"
    
    DOCUMENTOS DISPONIBLES:
    ${JSON.stringify(docContext, null, 2)}
    
    REGLAS:
    1. Identifica qué documentos son semánticamente relevantes para la consulta.
    2. Considera sinónimos (ej: "exámenes" -> "clínico", "contrato" -> "legal").
    3. Devuelve ÚNICAMENTE un array JSON con los IDs de los documentos relevantes, ordenados por relevancia.
    4. Si no hay nada relevante, devuelve [].
    
    RESPUESTA (JSON ARRAY):
  `;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text().trim();

        // Limpiar posible formato markdown
        const jsonString = text.replace(/```json|```/g, '').trim();
        return JSON.parse(jsonString);
    } catch (error) {
        console.error('Error in semantic search:', error);
        // Fallback simple: búsqueda por texto en título/resumen
        return documents
            .filter(d =>
                d.title.toLowerCase().includes(query.toLowerCase()) ||
                d.contentSummary.toLowerCase().includes(query.toLowerCase())
            )
            .map(d => d.id);
    }
}
