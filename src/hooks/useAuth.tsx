import React, { createContext, useContext, useState, type ReactNode } from 'react';

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
    hasModuleAccess: (moduleId: string) => boolean;
    canPerform: (module: keyof UserPermissions, action: keyof ModulePermission) => boolean;
    isSuperAdmin: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Permisos por defecto para roles (como fallback)
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
        dms: { read: true, create: false, update: false, delete: false },
        ideation: { read: true, create: false, update: false, delete: false },
        admin_access: false
    }
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user] = useState<User>({
        id: '1',
        name: 'Marcelo Avila',
        email: 'marcelo.avila@amis.global',
        role: 'SUPER_ADMIN',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix',
        permissions: DEFAULT_PERMISSIONS_BY_ROLE['SUPER_ADMIN']
    });

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

    return (
        <AuthContext.Provider value={{ user, hasModuleAccess, canPerform, isSuperAdmin }}>
            {children}
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
