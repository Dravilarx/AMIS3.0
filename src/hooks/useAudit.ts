import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export const useAudit = () => {
    const [audits, setAudits] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchAudits = async () => {
        try {
            const { data } = await supabase
                .from('audit_reports')
                .select('*, projects(name)')
                .order('created_at', { ascending: false });
            if (data) setAudits(data);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAudits();
        const sub = supabase.channel('audit_changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'audit_reports' }, fetchAudits)
            .subscribe();
        return () => { supabase.removeChannel(sub); };
    }, []);

    const addAudit = async (audit: any) => {
        const { error } = await supabase.from('audit_reports').insert([audit]);
        if (!error) fetchAudits();
        return { success: !error, error };
    };

    return { audits, loading, addAudit, refresh: fetchAudits };
};
