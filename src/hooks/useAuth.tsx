import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';

export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'MANAGER' | 'OPERATOR' | 'VIEWER';

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
    logistics: ModulePermission;
    clinical: ModulePermission;
    audit: ModulePermission;
    projects: ModulePermission;
    messaging: ModulePermission;
    dms: ModulePermission;
    ideation: ModulePermission;
    admin_access: boolean;
}

interface User {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    avatar?: string;
    permissions?: UserPermissions;
}

interface AuthContextType {
    user: User | null;
    loading: boolean;
    hasModuleAccess: (moduleId: string) => boolean;
    canPerform: (module: keyof UserPermissions, action: keyof ModulePermission) => boolean;
    isSuperAdmin: () => boolean;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEFAULT_PERMISSIONS_BY_ROLE: Record<UserRole, UserPermissions> = {
    'SUPER_ADMIN': {
        dashboard: { read: true, create: true, update: true, delete: true },
        tenders: { read: true, create: true, update: true, delete: true },
        staffing: { read: true, create: true, update: true, delete: true },
        logistics: { read: true, create: true, update: true, delete: true },
        clinical: { read: true, create: true, update: true, delete: true },
        audit: { read: true, create: true, update: true, delete: true },
        projects: { read: true, create: true, update: true, delete: true },
        messaging: { read: true, create: true, update: true, delete: true },
        dms: { read: true, create: true, update: true, delete: true },
        ideation: { read: true, create: true, update: true, delete: true },
        admin_access: true
    },
    'ADMIN': {
        dashboard: { read: true, create: true, update: true, delete: true },
        tenders: { read: true, create: true, update: true, delete: true },
        staffing: { read: true, create: true, update: true, delete: true },
        logistics: { read: true, create: true, update: true, delete: true },
        clinical: { read: true, create: true, update: true, delete: true },
        audit: { read: true, create: true, update: true, delete: true },
        projects: { read: true, create: true, update: true, delete: true },
        messaging: { read: true, create: true, update: true, delete: true },
        dms: { read: true, create: true, update: true, delete: true },
        ideation: { read: true, create: true, update: true, delete: true },
        admin_access: false
    },
    'MANAGER': {
        dashboard: { read: true, create: true, update: true, delete: false },
        tenders: { read: true, create: true, update: true, delete: false },
        staffing: { read: true, create: true, update: true, delete: false },
        logistics: { read: true, create: true, update: true, delete: false },
        clinical: { read: true, create: true, update: true, delete: false },
        audit: { read: true, create: true, update: true, delete: false },
        projects: { read: true, create: true, update: true, delete: false },
        messaging: { read: true, create: true, update: true, delete: true },
        dms: { read: true, create: true, update: true, delete: false },
        ideation: { read: true, create: true, update: true, delete: true },
        admin_access: false
    },
    'OPERATOR': {
        dashboard: { read: true, create: false, update: false, delete: false },
        tenders: { read: true, create: false, update: false, delete: false },
        staffing: { read: true, create: false, update: false, delete: false },
        logistics: { read: true, create: true, update: true, delete: false },
        clinical: { read: true, create: true, update: true, delete: false },
        audit: { read: true, create: false, update: false, delete: false },
        projects: { read: true, create: true, update: true, delete: false },
        messaging: { read: true, create: true, update: true, delete: false },
        dms: { read: true, create: false, update: false, delete: false },
        ideation: { read: true, create: true, update: true, delete: false },
        admin_access: false
    },
    'VIEWER': {
        dashboard: { read: true, create: false, update: false, delete: false },
        tenders: { read: true, create: false, update: false, delete: false },
        staffing: { read: true, create: false, update: false, delete: false },
        logistics: { read: true, create: false, update: false, delete: false },
        clinical: { read: true, create: false, update: false, delete: false },
        audit: { read: true, create: false, update: false, delete: false },
        projects: { read: true, create: false, update: false, delete: false },
        messaging: { read: true, create: false, update: false, delete: false },
        dms: { read: true, create: true, update: false, delete: false },
        ideation: { read: true, create: false, update: false, delete: false },
        admin_access: false
    }
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Initial session check
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) {
                fetchUserProfile(session.user);
            } else {
                setLoading(false);
            }
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
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

            setUser({
                id: authUser.id,
                name: profile?.full_name || authUser.email.split('@')[0],
                email: authUser.email,
                role: role,
                avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${authUser.id}`,
                permissions: DEFAULT_PERMISSIONS_BY_ROLE[role]
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
                permissions: DEFAULT_PERMISSIONS_BY_ROLE['VIEWER']
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

    const isSuperAdmin = () => user?.email === 'marcelo.avila@amis.global';

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
        <AuthContext.Provider value={{ user, loading, hasModuleAccess, canPerform, isSuperAdmin, signOut }}>
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
