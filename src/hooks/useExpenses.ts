import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface Expense {
    id: string;
    vendor: string;
    date: string;
    amount: number;
    category: string;
    status: 'pending' | 'verified' | 'rejected';
    tax_id: string;
}

export const useExpenses = () => {
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchExpenses = async () => {
        try {
            const { data, error } = await supabase
                .from('expenses')
                .select('*')
                .order('date', { ascending: false });

            if (data) setExpenses(data.map(e => ({
                id: e.id,
                vendor: e.vendor,
                date: e.date,
                amount: Number(e.amount),
                category: e.category,
                status: e.status,
                tax_id: e.tax_id
            })));
        } catch (err) {
            console.error('Error fetching expenses:', err);
        } finally {
            setLoading(false);
        }
    };

    const addExpense = async (expense: Partial<Expense>) => {
        const { error } = await supabase.from('expenses').insert([expense]);
        if (!error) fetchExpenses();
        return { success: !error, error };
    };

    useEffect(() => {
        fetchExpenses();

        // Suscripción Realtime
        const channel = supabase
            .channel('realtime_expenses')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses' }, fetchExpenses)
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, []);

    return { expenses, loading, addExpense, refresh: fetchExpenses };
};
