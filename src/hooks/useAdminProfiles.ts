import { useState, useEffect } from 'react';
import { supabase, supabaseSignup } from '../lib/supabase';
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

            // Aplica cargo en un perfil (best-effort: la columna puede no existir).
            const aplicarCargo = async (profileId: string) => {
                if (!cargo) return;
                const { error: cargoIdErr } = await supabase
                    .from('profiles')
                    .update({ cargo_id: cargo.id })
                    .eq('id', profileId);
                if (cargoIdErr) {
                    const { error: cargoTxtErr } = await supabase
                        .from('profiles')
                        .update({ cargo: cargo.nombre })
                        .eq('id', profileId);
                    if (cargoTxtErr) {
                        console.warn('No se pudo guardar el cargo en el perfil (columna inexistente):', cargoTxtErr.message);
                    }
                }
            };

            // 0. ¿Ya existe un perfil con ese email? (incluye los archivados/soft-deleted)
            //    Si existe, lo REACTIVAMOS en vez de fallar con "usuario ya registrado".
            const { data: existing } = await supabase
                .from('profiles')
                .select('id')
                .eq('email', email)
                .maybeSingle();

            if (existing) {
                const updates: Record<string, any> = {
                    is_deleted:  false,
                    archived_at: null,
                    full_name:   fullName,
                    role,
                };
                if (permissions) updates.permissions = permissions;

                const { error: reactErr } = await supabase
                    .from('profiles')
                    .update(updates)
                    .eq('id', existing.id);
                if (reactErr) throw reactErr;

                await aplicarCargo(existing.id);
                await fetchProfiles();
                // La contraseña previa se mantiene (no se puede resetear desde el cliente).
                return { success: true, reactivated: true };
            }

            // 1. Crear usuario en Auth usando el cliente AISLADO (no toca la sesión del admin).
            const { data: authData, error: authError } = await supabaseSignup.auth.signUp({
                email,
                password,
                options: {
                    data: { full_name: fullName, role }
                }
            });

            if (authError) throw authError;
            if (!authData.user) throw new Error('No se pudo crear el usuario.');

            // 2. Upsert en profiles. Se hace con el cliente AISLADO (sesión = usuario nuevo),
            //    así el id coincide con auth.uid() para las políticas RLS.
            const baseProfile: Record<string, any> = {
                id:         authData.user.id,
                email,
                full_name:  fullName,
                role,
                is_deleted: false,
            };
            if (permissions) baseProfile.permissions = permissions;

            const { error: profileError } = await supabaseSignup
                .from('profiles')
                .upsert(baseProfile);

            if (profileError) {
                console.warn('Perfil posiblemente creado vía trigger:', profileError);
            }

            // 3. Cargo (best-effort) y limpieza de la sesión temporal del cliente aislado.
            await aplicarCargo(authData.user.id);
            await supabaseSignup.auth.signOut();

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

        // Realtime: refresca el panel cuando cambian los perfiles (alta/edición/baja)
        const sub = supabase
            .channel('profiles_changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, fetchProfiles)
            .subscribe();

        return () => { supabase.removeChannel(sub); };
    }, []);

    return { profiles, loading, refresh: fetchProfiles, createProfile, updateProfile, deleteProfile };
};
