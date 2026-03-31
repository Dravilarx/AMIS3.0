export const config = {
  runtime: 'edge', // Optimizamos cold-starts y mantenemos compatibilidad con Vercel
};

// Como estamos en un Edge Worker aislado, creamos/importamos un cliente Supabase crudo
import { createClient } from '@supabase/supabase-js';

export default async function handler(request: Request) {
  // Manejo de CORS (Preflight)
  if (request.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  // Permitimos GET y POST
  if (request.method !== 'GET' && request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  try {
    // 1. Capa de Seguridad (Igual que en el Voice Engine)
    const authHeader = request.headers.get('Authorization');
    const INTERNAL_SECRET = process.env.AMIS_INTERNAL_API_KEY || 'DEV_SECRET_KEY_123';
    
    if (!authHeader || authHeader !== `Bearer ${INTERNAL_SECRET}`) {
       return new Response(JSON.stringify({ error: 'Acceso Denegado. API Key interna inválida.' }), { 
         status: 401,
         headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
       });
    }

    // 2. Extraer parámetros. Si es GET vienen por URL query; si es POST, del JSON body.
    let codigo_externo: string | null = null;
    let institucion_id: string | null = null;

    if (request.method === 'GET') {
      const url = new URL(request.url);
      codigo_externo = url.searchParams.get('codigo_externo');
      institucion_id = url.searchParams.get('institucion_id'); // Generalmente será el legacy_id (VPN)
    } else {
      const body = await request.json();
      codigo_externo = body.codigo_externo;
      institucion_id = body.institucion_id;
    }

    if (!codigo_externo || !institucion_id) {
       return new Response(JSON.stringify({ error: 'Faltan parámetros: codigo_externo e institucion_id' }), { 
         status: 400,
         headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
       });
    }

    // 3. Inicializar Cliente Supabase (Con variables de entorno de Vercel)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
    
    if (!supabaseUrl || !supabaseKey) {
        throw new Error("No hay credenciales de Supabase disponibles en el entorno Edge.");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // 4. Lógica de Traducción (Torre de Babel)
    // Buscamos en el procedure_mapping el código externo de ESA institución legacy
    // Y hacemos un Inner Join con el diccionario maestro para traernos el Título Oficial
    const { data: translation, error } = await supabase
       .from('procedure_mapping')
       .select(`
         codigo_externo,
         ris_institution_mapping!inner ( legacy_id ),
         master_procedures!inner ( titulo_oficial, codigo_amis, modalidad )
       `)
       .eq('codigo_externo', codigo_externo)
       .eq('ris_institution_mapping.legacy_id', Number(institucion_id))
       .maybeSingle();

    if (error) {
        throw new Error(`Error consultando el diccionario: ${error.message}`);
    }

    if (!translation || !translation.master_procedures) {
        return new Response(JSON.stringify({ 
            error: 'No hay traducción oficial mapeada para este código externo.', 
            original_code: codigo_externo 
        }), { 
            status: 404,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
    }

    // 5. Entregar El Título Traducido para Auto-inyección en el RIS Dashboard
    const responsePayload = { 
        success: true, 
        titulo_oficial: (translation.master_procedures as any).titulo_oficial,
        codigo_amis: (translation.master_procedures as any).codigo_amis,
        modalidad: (translation.master_procedures as any).modalidad
    };

    return new Response(JSON.stringify(responsePayload), {
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
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
}
