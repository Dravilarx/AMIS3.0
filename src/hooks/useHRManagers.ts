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
            const { data, error } = await supabase
                .from('profiles')
                .select('id, full_name, role')
                .in('role', ['ADM', 'Manager', 'RRHH']);

            if (error) throw error;

            if (data && data.length > 0) {
                setManagers(data.map(m => ({
                    id: m.id,
                    fullName: m.full_name,
                    email: '', // El email se maneja en auth.users, no en profiles por defecto
                    role: m.role
                })));
            } else {
                setManagers([]);
            }
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
