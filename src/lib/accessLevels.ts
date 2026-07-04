// ─────────────────────────────────────────────────────────────────────────────
// Niveles de acceso jerárquico (espejo de public.role_levels en la BD).
//
// Regla: MENOR nivel = MÁS acceso.
//   SUPER_ADMIN → 1 → Dirección
//   MANAGER     → 2 → Jefatura
//   COORDINATOR → 3 → Coordinación
//   STAFF       → 4 → Secretaría
//   OPERATOR    → 5 → Operativo
//
// El rol ADMIN ya NO existe. Roles sin nivel (VIEWER, ADMIN_SECRETARY, etc.)
// caen a 99 (equivalente a get_my_level() = 99 en la BD).
//
// El frontend solo REFLEJA las reglas; la autorización real vive en RLS.
// ─────────────────────────────────────────────────────────────────────────────
import { useAuth } from '../hooks/useAuth';

export const NO_LEVEL = 99;

export const ROLE_LEVELS: Record<string, { nivel: number; etiqueta: string }> = {
    SUPER_ADMIN: { nivel: 1, etiqueta: 'Dirección' },
    MANAGER:     { nivel: 2, etiqueta: 'Jefatura' },
    COORDINATOR: { nivel: 3, etiqueta: 'Coordinación' },
    STAFF:       { nivel: 4, etiqueta: 'Secretaría' },
    OPERATOR:    { nivel: 5, etiqueta: 'Operativo' },
};

// Orden de mayor a menor acceso (para selectores).
export const ROLE_LEVEL_ORDER: string[] = ['SUPER_ADMIN', 'MANAGER', 'COORDINATOR', 'STAFF', 'OPERATOR'];

// Niveles 1–5 para los selectores de "Permisos de carpetas" ("nivel N o superior puede").
export const NIVEL_OPTIONS: { nivel: number; etiqueta: string }[] = ROLE_LEVEL_ORDER.map(role => ({
    nivel: ROLE_LEVELS[role].nivel,
    etiqueta: ROLE_LEVELS[role].etiqueta,
}));

export function getLevelForRole(role?: string | null): number {
    if (!role) return NO_LEVEL;
    return ROLE_LEVELS[role]?.nivel ?? NO_LEVEL;
}

export function getLabelForRole(role?: string | null): string {
    if (!role) return 'Sin nivel';
    return ROLE_LEVELS[role]?.etiqueta ?? 'Sin nivel';
}

// Hook basado en el perfil ya cargado en el contexto de auth.
export function useMyLevel(): { level: number; label: string; loading: boolean } {
    const { user, loading } = useAuth();
    return {
        level: getLevelForRole(user?.role),
        label: getLabelForRole(user?.role),
        loading,
    };
}
