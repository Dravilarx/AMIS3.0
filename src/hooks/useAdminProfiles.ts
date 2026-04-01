import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { UserRole, UserPermissions } from './useAuth';

export interface AdminProfile {
    id: string;
    email: string;
    full_name: string;
    role: UserRole;
    permissions?: UserPermissions;
}

export const useAdminProfiles = () => {
    const [profiles, setProfiles] = useState<AdminProfile[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchProfiles = async () => {
        try {
            setLoading(true);
            // Intentamos traer los perfiles. Si la columna 'permissions' no existe, 
            // supabase fallará, así que seleccionamos lo básico primero.
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setProfiles(data || []);
        } catch (err) {
            console.error('Error fetching admin profiles:', err);
        } finally {
            setLoading(false);
        }
    };

    const updateProfile = async (id: string, updates: { role?: UserRole; permissions?: AdminProfile['permissions'] }) => {
        try {
            setLoading(true);
            const { error } = await supabase
                .from('profiles')
                .update(updates)
                .eq('id', id);

            if (error) throw error;
            await fetchProfiles();
            return { success: true };
        } catch (err: any) {
            console.error('Error updating profile:', err);
            return { success: false, error: err.message };
        } finally {
            setLoading(false);
        }
    };

    const deleteProfile = async (id: string) => {
        try {
            setLoading(true);
            const { error: profileError } = await supabase
                .from('profiles')
                .delete()
                .eq('id', id);

            if (profileError) throw profileError;
            
            await fetchProfiles();
            return { success: true };
        } catch (err: any) {
            console.error('Error deleting profile:', err);
            return { success: false, error: err.message };
        } finally {
            setLoading(false);
        }
    };

    const createProfile = async (email: string, password: string, fullName: string, role: UserRole) => {
        try {
            setLoading(true);
            // Default permissions based on role
            const defaultPerms = role === 'ADMIN' || role === 'SUPER_ADMIN' ? {} : {};

            // 1. Crear usuario en Auth
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: fullName,
                        role: role
                    }
                }
            });

            if (authError) throw authError;
            if (!authData.user) throw new Error('No se pudo crear el usuario.');

            // 2. Crear perfil en public.profiles (por si no hay trigger)
            const { error: profileError } = await supabase
                .from('profiles')
                .upsert({
                    id: authData.user.id,
                    email: email,
                    full_name: fullName,
                    role: role,
                    permissions: defaultPerms
                });

            if (profileError) console.warn('Aviso: El perfil podría crearse vía trigger, error ignoreable:', profileError);

            await fetchProfiles();
            return { success: true };
        } catch (err: any) {
            console.error('Error creating profile:', err);
            return { success: false, error: err.message };
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProfiles();
    }, []);

    return { profiles, loading, refresh: fetchProfiles, createProfile, updateProfile, deleteProfile };
};
