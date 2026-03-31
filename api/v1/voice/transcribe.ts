export const config = {
  runtime: 'edge', // Usamos el Edge Runtime de Vercel/Next.js para procesar Streams y FormData fácilmente
};

const MEDICAL_PROMPT = "Este es un dictado médico radiológico. Términos esperados: diagnóstico, hallazgos, sugerente, resonancia magnética, tomografía computarizada, ecografía, radiografía, contraste, gadolinio, T1, T2, FLAIR, hiperintenso, hipointenso, isointenso, nódulo, quiste, tumor, tumoración, masa, lesión, parénquima, edema, calcificación, arteria, vena, distal, proximal, medial, lateral, sagital, coronal, axial, discreta escoliosis, etc.";

export default async function handler(request: Request) {
  // CORS Helper para permitir preflight requests
  if (request.method === 'OPTIONS') {
    return new Response('ok', {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  try {
    // 1. Capa de Seguridad: Validar un secreto interno que solo nuestras Apps autorizadas conocen
    const authHeader = request.headers.get('Authorization');
    const INTERNAL_SECRET = process.env.AMIS_INTERNAL_API_KEY || 'DEV_SECRET_KEY_123';
    
    if (!authHeader || authHeader !== `Bearer ${INTERNAL_SECRET}`) {
       return new Response(JSON.stringify({ error: 'Acceso Denegado. API Key interna inválida.' }), { 
         status: 401,
         headers: { 'Content-Type': 'application/json' }
       });
    }

    // 2. Extracción de Credenciales Groq
    const GROQ_API_KEY = process.env.GROQ_API_KEY;
    if (!GROQ_API_KEY) {
      throw new Error('La clave GROQ_API_KEY no está configurada en Vercel.');
    }

    // 3. Procesamiento del FormData enviado por el front-end (Audio)
    const formData = await request.formData();
    const audioFile = formData.get('file');

    if (!audioFile || !(audioFile instanceof File)) {
      return new Response(JSON.stringify({ error: 'No se encontró archivo de audio válido en el FormData' }), { status: 400 });
    }

    // 4. Preparación y reenvío directo del stream hacia Groq (Proxy Fast)
    const groqFormData = new FormData();
    groqFormData.append('file', audioFile);
    groqFormData.append('model', 'whisper-large-v3');
    groqFormData.append('response_format', 'json');
    groqFormData.append('language', 'es'); // Forzar Español
    groqFormData.append('prompt', MEDICAL_PROMPT); // Capa de Inteligencia Médica
    groqFormData.append('temperature', '0.0'); // Consistencia absoluta

    // 5. Llamado al backend ultra-rápido de Groq Open AI
    const groqResponse = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`
      },
      body: groqFormData
    });

    if (!groqResponse.ok) {
      const errBody = await groqResponse.text();
      console.error("Groq API Error:", errBody);
      throw new Error(`Error en transcripción externa: HTTP ${groqResponse.status}`);
    }

    // 6. Respuesta JSON del API Route requerida: { "text": "..." }
    const transcription = await groqResponse.json();

    return new Response(JSON.stringify({ text: transcription.text }), {
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });

  } catch (error: any) {
    console.error("API Route Error:", error);
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
