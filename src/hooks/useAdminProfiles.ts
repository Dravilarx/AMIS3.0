import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { UserRole, UserPermissions } from './useAuth';

export interface AdminProfile {
    id: string;
    email: string;
    full_name: string;
    role: UserRole;
    permissions?: UserPermissions;
    is_deleted?: boolean;
    archived_at?: string | null;
}

export const useAdminProfiles = () => {
    const [profiles, setProfiles]   = useState<AdminProfile[]>([]);
    const [loading, setLoading]     = useState(true);

    const fetchProfiles = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('is_deleted', false)
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

    /**
     * BUG CORREGIDO: Antes hacía .delete() → hard delete irreversible.
     * Ahora hace soft delete: is_deleted=true + archived_at=now().
     * El perfil desaparece de la lista pero queda en DB para auditoría.
     */
    const deleteProfile = async (id: string) => {
        try {
            setLoading(true);
            const { error } = await supabase
                .from('profiles')
                .update({
                    is_deleted:  true,
                    archived_at: new Date().toISOString(),
                })
                .eq('id', id);

            if (error) throw error;
            await fetchProfiles();
            return { success: true };
        } catch (err: any) {
            console.error('Error deleting profile:', err);
            return { success: false, error: err.message };
        } finally {
            setLoading(false);
        }
    };

    const createProfile = async (
        email: string,
        password: string,
        fullName: string,
        role: UserRole,
        permissions?: UserPermissions,            // plantilla_permisos del cargo (punto de partida, editable luego)
        cargo?: { id: string; nombre: string },   // cargo elegido (etiqueta)
    ) => {
        try {
            setLoading(true);

            // 1. Crear usuario en Auth
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: { full_name: fullName, role }
                }
            });

            if (authError) throw authError;
            if (!authData.user) throw new Error('No se pudo crear el usuario.');

            // 2. Upsert en profiles (por si no hay trigger automático).
            //    Aplicamos la plantilla de permisos del cargo como permisos iniciales.
            const baseProfile: Record<string, any> = {
                id:         authData.user.id,
                email,
                full_name:  fullName,
                role,
                is_deleted: false,
            };
            if (permissions) baseProfile.permissions = permissions;

            const { error: profileError } = await supabase
                .from('profiles')
                .upsert(baseProfile);

            if (profileError) {
                console.warn('Perfil posiblemente creado vía trigger:', profileError);
            }

            // 3. Guardar el cargo en el perfil (best-effort: la columna puede no existir).
            //    Probamos cargo_id; si falla, caemos a un campo de texto 'cargo'.
            if (cargo) {
                const { error: cargoIdErr } = await supabase
                    .from('profiles')
                    .update({ cargo_id: cargo.id })
                    .eq('id', authData.user.id);

                if (cargoIdErr) {
                    const { error: cargoTxtErr } = await supabase
                        .from('profiles')
                        .update({ cargo: cargo.nombre })
                        .eq('id', authData.user.id);
                    if (cargoTxtErr) {
                        console.warn('No se pudo guardar el cargo en el perfil (columna inexistente):', cargoTxtErr.message);
                    }
                }
            }

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
