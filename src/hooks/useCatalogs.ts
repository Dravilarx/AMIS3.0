import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface CatalogItem {
    id:       string;
    label:    string;
    isActive: boolean;
}

const mapItem = (r: any): CatalogItem => ({
    id:       r.id,
    label:    r.label,
    isActive: r.is_active,
});

const useCatalog = (table: 'catalog_roles' | 'catalog_teams') => {
    const [items, setItems]   = useState<CatalogItem[]>([]);
    const [loading, setLoading] = useState(true);

    const fetch = async () => {
        setLoading(true);
        const { data } = await supabase
            .from(table)
            .select('id, label, is_active')
            .eq('is_active', true)
            .order('label');
        setItems((data || []).map(mapItem));
        setLoading(false);
    };

    const add = async (label: string) => {
        const clean = label.trim();
        if (!clean) return { success: false, error: 'El nombre no puede estar vacío.' };
        const { error } = await supabase
            .from(table)
            .insert({ label: clean });
        if (error) return { success: false, error: error.message };
        await fetch();
        return { success: true };
    };

    const remove = async (id: string) => {
        const { error } = await supabase
            .from(table)
            .update({ is_active: false })
            .eq('id', id);
        if (error) return { success: false, error: error.message };
        await fetch();
        return { success: true };
    };

    const rename = async (id: string, newLabel: string) => {
        const clean = newLabel.trim();
        if (!clean) return { success: false, error: 'El nombre no puede estar vacío.' };
        const { error } = await supabase
            .from(table)
            .update({ label: clean })
            .eq('id', id);
        if (error) return { success: false, error: error.message };
        await fetch();
        return { success: true };
    };

    useEffect(() => { fetch(); }, []);

    return { items, loading, add, remove, rename, refresh: fetch };
};

export const useRoles  = () => useCatalog('catalog_roles');
export const useTeams  = () => useCatalog('catalog_teams');
