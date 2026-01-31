import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import type { DocumentBattery } from '../../types/communication';

export function useBatteries() {
    const [batteries, setBatteries] = useState<DocumentBattery[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchBatteries = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('document_batteries')
                .select('*')
                .order('name', { ascending: true });

            if (error) throw error;

            if (data) {
                // Mapeo si los nombres de columnas en DB son snake_case
                setBatteries(data.map(b => ({
                    id: b.id,
                    name: b.name,
                    description: b.description,
                    requirements: b.requirements || []
                })));
            }
        } catch (err) {
            console.error('Error fetching batteries:', err);
            setBatteries([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBatteries();
    }, []);

    const addBattery = async (battery: Omit<DocumentBattery, 'id'>) => {
        try {
            const { data, error } = await supabase
                .from('document_batteries')
                .insert([{
                    name: battery.name,
                    description: battery.description,
                    requirements: battery.requirements
                }])
                .select()
                .single();

            if (error) throw error;
            if (data) {
                const newBat = { id: data.id, ...battery };
                setBatteries(prev => [...prev, newBat]);
                return newBat;
            }
        } catch (err) {
            console.error('Error adding battery:', err);
        }
    };

    const updateBattery = async (id: string, updates: Partial<DocumentBattery>) => {
        try {
            const { error } = await supabase
                .from('document_batteries')
                .update({
                    name: updates.name,
                    description: updates.description,
                    requirements: updates.requirements
                })
                .eq('id', id);

            if (error) throw error;
            setBatteries(prev => prev.map(b => b.id === id ? { ...b, ...updates } : b));
        } catch (err) {
            console.error('Error updating battery:', err);
        }
    };

    const deleteBattery = async (id: string) => {
        try {
            const { error } = await supabase
                .from('document_batteries')
                .delete()
                .eq('id', id);

            if (error) throw error;
            setBatteries(prev => prev.filter(b => b.id !== id));
        } catch (err) {
            console.error('Error deleting battery:', err);
        }
    };

    return {
        batteries,
        loading,
        addBattery,
        updateBattery,
        deleteBattery,
        refresh: fetchBatteries
    };
}
