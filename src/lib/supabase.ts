import { createClient } from '@supabase/supabase-js';

// Usamos valores temporales que no rompan la inicialización si las variables faltan
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Si faltan las variables, usamos un valor que no lance "Invalid URL" pero que indique el error en consola
const safeUrl = supabaseUrl && supabaseUrl.startsWith('http') ? supabaseUrl : 'https://missing-url.supabase.co';
const safeKey = supabaseAnonKey || 'missing-key';

if (!supabaseUrl || !supabaseAnonKey) {
    console.error("🚨 CRITICAL: Credenciales de Supabase no encontradas en el entorno.");
}

export const supabase = createClient(safeUrl, safeKey);
