import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export const useClinical = () => {
    const [procedures, setProcedures] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchProcedures = async () => {
        try {
            const { data } = await supabase
                .from('clinical_procedures')
                .select('*, professionals(name)')
                .order('start_time', { ascending: false });
            if (data) setProcedures(data);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProcedures();
        const sub = supabase.channel('clinical_changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'clinical_procedures' }, fetchProcedures)
            .subscribe();
        return () => { supabase.removeChannel(sub); };
    }, []);

    return { procedures, loading, refresh: fetchProcedures };
};
