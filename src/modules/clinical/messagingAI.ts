import { getGeminiModel } from '../../lib/gemini';

export interface SmartMessageRequest {
    patientName: string;
    examType: string;
    location: string;
}

/**
 * Genera instrucciones preparatorias personalizadas usando Gemini.
 * Mezcla lógica médica (instrucción del examen) con logística de la sede.
 */
export async function generatePrepInstructions(req: SmartMessageRequest): Promise<string> {
    const model = getGeminiModel('gemini-1.5-flash');

    const prompt = `
    Eres el asistente inteligente de AMIS 3.0 para Holding Portezuelo.
    Debes generar un mensaje de WhatsApp/Mail para un paciente que tiene un procedimiento pronto.
    
    PATIENTE: ${req.patientName}
    EXAMEN: ${req.examType}
    SEDE: ${req.location}
    
    REGLAS DEL MENSAJE:
    1. Tono: Profesional, empático y premium.
    2. Contenido Médico: Incluye instrucciones básicas según el tipo de examen (ej. ayuno para TC con contraste, ropa cómoda para RM, etc.).
    3. Contenido Logístico: Menciona la sede "${req.location}" y solicita llegar 15 minutos antes.
    4. Formato: Máximo 3 párrafos cortos.
    5. Idioma: Español.
    
    Devuelve solo el texto del mensaje.
  `;

    try {
        const result = await model.generateContent(prompt);
        return result.response.text();
    } catch (error) {
        console.error('Error generating smart message:', error);
        return `Estimado/a ${req.patientName}, le recordamos su cita para el examen ${req.examType} en la sede ${req.location}. Por favor llegue 15 minutos antes.`;
    }
}
