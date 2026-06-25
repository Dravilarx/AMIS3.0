import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Inicialización limpia de Supabase
export const supabase = createClient(
    supabaseUrl || '',
    supabaseAnonKey || '',
    {
        auth: {
            persistSession: true,
            storageKey: 'amis3-auth-token', // 🚀 Evita conflictos con Prevenort en localhost
            autoRefreshToken: true,
        }
    }
);

// ─────────────────────────────────────────────────────────────────────────────
// Cliente AISLADO para crear usuarios desde el panel admin.
// signUp() inicia sesión como el usuario creado; si usáramos el cliente principal
// eso reemplazaría la sesión del admin. Este cliente NO persiste sesión
// (persistSession:false), así el alta de un tecnólogo no expulsa al administrador.
// ─────────────────────────────────────────────────────────────────────────────
export const supabaseSignup = createClient(
    supabaseUrl || '',
    supabaseAnonKey || '',
    {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
            storageKey: 'amis3-signup-temp',
        }
    }
);

// Log de advertencia solo para desarrollo
if (import.meta.env.DEV && (!supabaseUrl || !supabaseAnonKey)) {
    console.warn('⚠️ Supabase credentials missing! Check your .env file.');
}
