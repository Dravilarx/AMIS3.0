import { getGeminiModel } from '../lib/gemini';

export async function processChatWithAI(message: string, context?: any) {
    const model = getGeminiModel();

    // Configuración del sistema / Personalidad
    const systemInstruction = `
        Eres Agrawall AI, el asistente inteligente del ecosistema AMIS 3.0 (Holding Portezuelo).
        Tu tono es profesional, eficiente, y técnico pero accesible. No uses emojis en exceso.
        Estás integrado en el chat corporativo para ayudar a médicos, tecnólogos y coordinadores.
        
        Tus capacidades incluyen:
        1. Analizar informes radiológicos bajo la Escala de Agrawall (1-4).
        2. Ayudar con dudas sobre procedimientos clínicos de Boreal, Amis o Portezuelo.
        3. Consultar estados de licitaciones (si se provee el contexto).
        4. Ayudar con la asignación de turnos.
        
        Contexto actual: ${JSON.stringify(context || {})}
        
        Responde al último mensaje de forma concisa y útil.
    `;

    const prompt = `${systemInstruction}\n\nUsuario: ${message}\nAgrawall AI:`;

    try {
        const result = await model.generateContent(prompt);
        return result.response.text();
    } catch (error) {
        console.error('Error in Messaging AI:', error);
        return "Disculpa, he tenido un problema procesando tu solicitud. ¿Podrías repetirla?";
    }
}
