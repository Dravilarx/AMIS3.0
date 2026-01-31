import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Diagnóstico detallado para evitar pantalla negra en producción
if (!supabaseUrl || !supabaseAnonKey) {
    console.error("🚨 CRITICAL: Supabase credentials missing!");
    console.warn("Please check your Vercel Environment Variables: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set.");
}

export const supabase = createClient(
    supabaseUrl || '',
    supabaseAnonKey || ''
);
