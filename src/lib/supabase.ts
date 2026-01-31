import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Si las llaves están llegando, esto funcionará. 
// Si no, el escudo en App.tsx detendrá la ejecución con un mensaje claro.
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
