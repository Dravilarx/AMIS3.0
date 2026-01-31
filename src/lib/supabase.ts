import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase credentials missing. Check your .env file.');
}

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Diagnóstico rápido en producción
if (!supabaseUrl || !supabaseAnonKey) {
    console.error("🚨 Supabase credentials missing! Check Vercel Env Vars.");
}

export const supabase = createClient(
    supabaseUrl || '',
    supabaseAnonKey || ''
);
