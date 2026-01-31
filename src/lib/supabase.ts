import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Si no hay URL, usamos una de esquema válido (https) para que la librería no lance error de ejecución
// pero obviamente no conectará a nada real hasta que la variable esté en Vercel.
const finalUrl = (supabaseUrl && supabaseUrl.length > 10) ? supabaseUrl : 'https://placeholder-to-prevent-crash.supabase.co';
const finalKey = (supabaseAnonKey && supabaseAnonKey.length > 10) ? supabaseAnonKey : 'placeholder-key';

export const supabase = createClient(finalUrl, finalKey);

if (!supabaseUrl || !supabaseAnonKey) {
    console.error("🚨 DIAGNÓSTICO: VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY están vacías.");
}
