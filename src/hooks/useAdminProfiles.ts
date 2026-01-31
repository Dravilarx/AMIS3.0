import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { UserRole, UserPermissions } from './useAuth';

export interface AdminProfile {
    id: string;
    full_name: string;
    email: string;
    role: UserRole;
    permissions?: UserPermissions;
    created_at?: string;
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

    const updateProfile = async (id: string, updates: Partial<AdminProfile>) => {
        try {
            // Protección Marcelo: Nunca cambiar rol de marcelo.avila@amis.global vía UI general
            const { data: current } = await supabase.from('profiles').select('email').eq('id', id).single();
            if (current?.email === 'marcelo.avila@amis.global' && updates.role) {
                throw new Error('No se puede cambiar el rol del Super Administrador Vitalicio.');
            }

            const { error } = await supabase
                .from('profiles')
                .update(updates)
                .eq('id', id);

            if (error) throw error;
            await fetchProfiles();
            return { success: true };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    };

    const deleteProfile = async (id: string) => {
        try {
            const { data: current } = await supabase.from('profiles').select('email').eq('id', id).single();
            if (current?.email === 'marcelo.avila@amis.global') {
                throw new Error('Marcelo Avila es un usuario vitalicio y no puede ser eliminado.');
            }

            const { error } = await supabase
                .from('profiles')
                .delete()
                .eq('id', id);

            if (error) throw error;
            await fetchProfiles();
            return { success: true };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    };

    useEffect(() => {
        fetchProfiles();
    }, []);

    return { profiles, loading, refresh: fetchProfiles, updateProfile, deleteProfile };
};
