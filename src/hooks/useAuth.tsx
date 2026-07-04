import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';

// Roles jerárquicos (public.role_levels): SUPER_ADMIN, MANAGER, COORDINATOR, STAFF, OPERATOR.
// El rol ADMIN fue eliminado. Se conservan roles de aplicación no jerárquicos
// (VIEWER, ADMIN_SECRETARY, PARTNER, MED_CHIEF) usados por otros flujos.
export type UserRole = 'SUPER_ADMIN' | 'MANAGER' | 'COORDINATOR' | 'STAFF' | 'OPERATOR' | 'VIEWER' | 'ADMIN_SECRETARY' | 'PARTNER' | 'MED_CHIEF';

export interface ModulePermission {
    read: boolean;
    create: boolean;
    update: boolean;
    delete: boolean;
}

export interface UserPermissions {
    dashboard: ModulePermission;
    tenders: ModulePermission;
    staffing: ModulePermission;
    shifts: ModulePermission;
    logistics: ModulePermission;
    institutions: ModulePermission;
    clinical: ModulePermission;
    audit: ModulePermission;
    projects: ModulePermission;
    messaging: ModulePermission;
    dispatch: ModulePermission;
    dms: ModulePermission;
    ideation: ModulePermission;
    news: ModulePermission;
    stat_multiris: ModulePermission;
    admin_access: boolean;
    secretary_command?: ModulePermission;
}

interface User {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    app_role?: string;
    avatar?: string;
    permissions?: UserPermissions;
    clinical_role?: string;
    last_name?: string;
    supervisor_id?: string;
}

interface AuthContextType {
    user: User | null;
    loading: boolean;
    hasModuleAccess: (moduleId: string) => boolean;
    canPerform: (module: keyof UserPermissions, action: keyof ModulePermission) => boolean;
    isSuperAdmin: () => boolean;
    signOut: () => Promise<void>;
    isRecoveringPassword: boolean;
    setRecoveringPassword: (value: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ─────────────────────────────────────────────────────────────────────────────
// NOTA: Se eliminó DEFAULT_PERMISSIONS_BY_ROLE (plantilla de permisos por rol).
// El control de acceso real es SOLO profiles.permissions (matriz granular por
// módulo). Ningún "nivel de acceso" con nombre reinyecta permisos. El caso
// SUPER_ADMIN se resuelve en hasModuleAccess (acceso total). El CARGO aplica su
// plantilla UNA sola vez al crear el usuario (ver useAdminProfiles.createProfile).
// ─────────────────────────────────────────────────────────────────────────────

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [isRecoveringPassword, setRecoveringPassword] = useState(false);

    useEffect(() => {
        // Initial session check
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) {
                fetchUserProfile(session.user);
            } else {
                setUser(null);
                setLoading(false);
            }
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'PASSWORD_RECOVERY') {
                setRecoveringPassword(true);
            }
            if (event === 'SIGNED_IN' && session) {
                fetchUserProfile(session.user);
            } else if (event === 'SIGNED_OUT') {
                setUser(null);
                setLoading(false);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const fetchUserProfile = async (authUser: any) => {
        try {
            const { data: profile, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', authUser.id)
                .single();

            if (error) throw error;

            const role = (profile?.role as UserRole) || 'VIEWER';
            // Control de acceso = SOLO profiles.permissions. No se mezcla ninguna
            // plantilla por rol; lo que está en la matriz es lo que el usuario ve.
            const profilePerms = profile?.permissions || {};

            setUser({
                id: authUser.id,
                name: profile?.full_name || authUser.email.split('@')[0],
                email: authUser.email,
                role: role,
                app_role: profile?.role || role,
                avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${authUser.id}`,
                permissions: profilePerms,
                clinical_role: profile?.clinical_role,
                last_name: profile?.last_name,
                supervisor_id: profile?.supervisor_id
            });
        } catch (err) {
            console.error('Error fetching profile:', err);
            // Fallback user if profile fetch fails but auth session exists
            setUser({
                id: authUser.id,
                name: authUser.email.split('@')[0],
                email: authUser.email,
                role: 'VIEWER',
                avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${authUser.id}`,
                permissions: {} as UserPermissions
            });
        } finally {
            setLoading(false);
        }
    };

    const hasModuleAccess = (moduleId: string) => {
        if (!user || !user.permissions) return false;
        if (user.role === 'SUPER_ADMIN') return true;

        const perms = user.permissions as any;
        return perms[moduleId]?.read === true;
    };

    const canPerform = (module: keyof UserPermissions, action: keyof ModulePermission) => {
        if (!user || !user.permissions) return false;
        if (user.role === 'SUPER_ADMIN') return true;

        const modulePerms = user.permissions[module] as ModulePermission;
        return modulePerms?.[action] === true;
    };

    const isSuperAdmin = () =>
        user?.email === 'marcelo.avila@amis.global' ||
        user?.email === 'dravilarx@gmail.com' ||
        user?.role === 'SUPER_ADMIN';

    const signOut = async () => {
        try {
            await supabase.auth.signOut();
        } catch (err) {
            console.error('Error during Supabase signOut:', err);
        } finally {
            setUser(null);
            localStorage.clear();
            sessionStorage.clear();
        }
    };

    return (
        <AuthContext.Provider value={{ user, loading, hasModuleAccess, canPerform, isSuperAdmin, signOut, isRecoveringPassword, setRecoveringPassword }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
