import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { UserPermissions } from './useAuth';

export type CargoTipo = 'clinico' | 'administrativo';

export interface Cargo {
    id:                 string;
    nombre:             string;
    descripcion:        string | null;
    color:             string | null;
    tipo:               CargoTipo;
    plantilla_permisos: Partial<UserPermissions>;
    activo:             boolean;
    created_at?:        string;
    updated_at?:        string;
}

export interface CargoInput {
    nombre:             string;
    descripcion?:       string | null;
    color?:             string | null;
    tipo:               CargoTipo;
    plantilla_permisos: Partial<UserPermissions>;
}

export const useCargos = () => {
    const [cargos, setCargos]   = useState<Cargo[]>([]);
    const [loading, setLoading] = useState(true);

    const listCargos = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('cargos')
                .select('*')
                .eq('activo', true)
                .order('nombre', { ascending: true });

            if (error) throw error;
            setCargos((data || []) as Cargo[]);
        } catch (err) {
            console.error('Error listando cargos:', err);
        } finally {
            setLoading(false);
        }
    };

    const createCargo = async (cargo: CargoInput) => {
        try {
            const { data, error } = await supabase.from('cargos').insert({
                nombre:             cargo.nombre,
                descripcion:        cargo.descripcion ?? null,
                color:              cargo.color ?? null,
                tipo:               cargo.tipo,
                plantilla_permisos: cargo.plantilla_permisos,
                activo:             true,
            }).select().single();
            if (error) throw error;
            await listCargos();
            return { success: true, cargo: data as Cargo };
        } catch (err: any) {
            console.error('Error creando cargo:', err);
            return { success: false, error: err.message };
        }
    };

    const updateCargo = async (id: string, campos: Partial<CargoInput>) => {
        try {
            const { error } = await supabase
                .from('cargos')
                .update({ ...campos, updated_at: new Date().toISOString() })
                .eq('id', id);
            if (error) throw error;
            await listCargos();
            return { success: true };
        } catch (err: any) {
            console.error('Error actualizando cargo:', err);
            return { success: false, error: err.message };
        }
    };

    // Baja lógica: NO se borra físicamente, solo se marca activo = false.
    const deactivateCargo = async (id: string) => {
        try {
            const { error } = await supabase
                .from('cargos')
                .update({ activo: false, updated_at: new Date().toISOString() })
                .eq('id', id);
            if (error) throw error;
            await listCargos();
            return { success: true };
        } catch (err: any) {
            console.error('Error desactivando cargo:', err);
            return { success: false, error: err.message };
        }
    };

    useEffect(() => {
        listCargos();
    }, []);

    return { cargos, loading, refresh: listCargos, listCargos, createCargo, updateCargo, deactivateCargo };
};
