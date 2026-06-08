import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface HRManager {
    id: string;
    fullName: string;
    email: string;
    role: string;
}

export const useHRManagers = () => {
    const [managers, setManagers] = useState<HRManager[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchManagers = async () => {
        try {
            // BUG #1 CORREGIDO: Se agrega 'email' al SELECT — existía en la tabla
            // pero no se pedía, dejando el campo siempre vacío.
            //
            // BUG #2 CORREGIDO: Los roles eran 'ADM', 'Manager', 'RRHH' —
            // ninguno coincide con los roles reales del sistema definidos en
            // useAuth.tsx ('SUPER_ADMIN', 'ADMIN', 'MANAGER').
            // Resultado anterior: lista de managers siempre vacía.
            const { data, error } = await supabase
                .from('profiles')
                .select('id, full_name, email, role')
                .in('role', ['SUPER_ADMIN', 'ADMIN', 'MANAGER'])
                .order('full_name', { ascending: true });

            if (error) throw error;

            setManagers(
                (data || []).map(m => ({
                    id:       m.id,
                    fullName: m.full_name || m.email,
                    email:    m.email || '',
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
