import { createClient } from '@supabase/supabase-js';

// Intentamos obtener las variables
const rawUrl = import.meta.env.VITE_SUPABASE_URL;
const rawKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Función para validar si es una URL real
const isValidUrl = (url: any) => {
    try {
        return url && typeof url === 'string' && url.startsWith('http');
    } catch {
        return false;
    }
};

const supabaseUrl = isValidUrl(rawUrl) ? rawUrl : 'https://provisional-error-preventer.supabase.co';
const supabaseAnonKey = (rawKey && rawKey.length > 10) ? rawKey : 'dummy-key';

// Exportamos el cliente de forma segura
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Log de diagnóstico silencioso para el programador
if (!isValidUrl(rawUrl)) {
    console.warn("⚠️ AMIS Engine: Supabase URL is missing or invalid. Check Environment Variables.");
}
