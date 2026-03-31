import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Prompt médico para orientar a Whisper al contexto radiológico
const MEDICAL_PROMPT = "Este es un dictado médico radiológico. Términos esperados: diagnóstico, hallazgos, sugerente, resonancia magnética, tomografía computarizada, ecografía, radiografía, contraste, gadolinio, T1, T2, FLAIR, hiperintenso, hipointenso, isointenso, nódulo, quiste, tumor, tumoración, masa, lesión, parénquima, edema, calcificación, arteria, vena, distal, proximal, medial, lateral, sagital, coronal, axial, etc.";

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        if (!GROQ_API_KEY) {
            throw new Error('La clave GROQ_API_KEY no está configurada.');
        }

        const formData = await req.formData();
        const audioFile = formData.get('file');

        if (!audioFile || !(audioFile instanceof File)) {
            return new Response(JSON.stringify({ error: 'No se encontró un archivo de audio válido en el campo "file".' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        // Construir el FormData proxy para enviárselo a Groq
        const groqFormData = new FormData();
        groqFormData.append('file', audioFile);
        groqFormData.append('model', 'whisper-large-v3');
        groqFormData.append('response_format', 'json');
        groqFormData.append('language', 'es');
        groqFormData.append('prompt', MEDICAL_PROMPT);
        groqFormData.append('temperature', '0.0'); // 0.0 para mayor precisión médica

        console.log(`Enviando audio a Groq (Tamaño: ${audioFile.size} bytes)...`);

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
            throw new Error(`Error from Groq API: ${groqResponse.status}`);
        }

        const transcription = await groqResponse.json();

        return new Response(JSON.stringify({ 
            success: true, 
            text: transcription.text 
        }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

    } catch (error: any) {
        console.error("Transcription Error:", error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
});
