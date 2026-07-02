import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface HRManager {
    id: string;
    fullName: string;
    role: string;
}

export const useHRManagers = () => {
    const [managers, setManagers] = useState<HRManager[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchManagers = async () => {
        try {
            // Lee de profiles_publicos (sin rut/email) — evita exponer datos
            // sensibles de otros usuarios. Los roles coinciden con los reales
            // del sistema definidos en useAuth.tsx ('SUPER_ADMIN', 'ADMIN', 'MANAGER').
            const { data, error } = await supabase
                .from('profiles_publicos')
                .select('id, full_name, role')
                .in('role', ['SUPER_ADMIN', 'ADMIN', 'MANAGER'])
                .order('full_name', { ascending: true });

            if (error) throw error;

            setManagers(
                (data || []).map(m => ({
                    id:       m.id,
                    fullName: m.full_name || m.id,
                    role:     m.role,
                }))
            );
        } catch (err) {
            console.error('Error fetching HR Managers:', err);
            setManagers([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchManagers();
    }, []);

    return { managers, loading, refresh: fetchManagers };
};
