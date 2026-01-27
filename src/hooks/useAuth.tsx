import React, { createContext, useContext, useState, type ReactNode } from 'react';

export type UserRole = 'ARCHITECT' | 'COORDINATOR' | 'AUDITOR';

interface User {
    id: string;
    name: string;
    role: UserRole;
    avatar?: string;
}

interface AuthContextType {
    user: User | null;
    setRole: (role: UserRole) => void;
    hasPermission: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
    'ARCHITECT': ['all'],
    'COORDINATOR': ['view_dashboard', 'manage_staffing', 'view_tenders', 'messaging'],
    'AUDITOR': ['view_dashboard', 'clinical_workflow', 'audit_dashboard'],
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User>({
        id: '1',
        name: 'Arquitecto Jefe',
        role: 'ARCHITECT',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix'
    });

    const setRole = (role: UserRole) => {
        setUser(prev => ({ ...prev, role }));
    };

    const hasPermission = (permission: string) => {
        if (!user) return false;
        const permissions = ROLE_PERMISSIONS[user.role];
        return permissions.includes('all') || permissions.includes(permission);
    };

    return (
        <AuthContext.Provider value={{ user, setRole, hasPermission }}>
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
