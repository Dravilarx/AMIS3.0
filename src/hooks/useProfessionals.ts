import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Professional } from '../types/core';

export const useProfessionals = () => {
    const [professionals, setProfessionals] = useState<Professional[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchProfessionals = async () => {
        try {
            setLoading(true);
            // Traemos profesionales con sus contratos unidos (join)
            const { data, error: supabaseError } = await supabase
                .from('professionals')
                .select(`
                    *,
                    contracts (*)
                `);

            if (supabaseError) throw supabaseError;

            // Mapeo de snake_case (DB) a camelCase (UI Types)
            const mappedData: Professional[] = (data || []).map(p => ({
                id: p.id,
                name: p.name,
                email: p.email,
                nationalId: p.national_id,
                role: p.role,
                status: p.status,
                registrationExpiry: p.registration_expiry,
                residence: {
                    city: p.city,
                    region: p.region
                },
                competencies: p.competencies || [],
                contracts: (p.contracts || []).map((c: any) => ({
                    company: c.company,
                    amount: Number(c.amount),
                    type: c.type
                }))
            }));

            setProfessionals(mappedData);
        } catch (err: any) {
            console.error('Error fetching professionals:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const addProfessional = async (professional: Omit<Professional, 'id'>) => {
        try {
            setLoading(true);

            // 1. Insertar el profesional
            const { data: profData, error: profError } = await supabase
                .from('professionals')
                .insert([{
                    name: professional.name,
                    email: professional.email,
                    national_id: professional.nationalId,
                    role: professional.role,
                    status: professional.status,
                    registration_expiry: professional.registrationExpiry,
                    city: professional.residence.city,
                    region: professional.residence.region,
                    competencies: professional.competencies
                }])
                .select()
                .single();

            if (profError) throw profError;

            // 2. Insertar contratos si existen
            if (professional.contracts && professional.contracts.length > 0) {
                const contractsToInsert = professional.contracts.map(c => ({
                    professional_id: profData.id,
                    company: c.company,
                    amount: c.amount,
                    type: c.type
                }));

                const { error: contractsError } = await supabase
                    .from('contracts')
                    .insert(contractsToInsert);

                if (contractsError) throw contractsError;
            }

            await fetchProfessionals();
            return { success: true };
        } catch (err: any) {
            console.error('Error adding professional:', err);
            return { success: false, error: err.message };
        } finally {
            setLoading(false);
        }
    };

    const updateProfessional = async (id: string, professional: Omit<Professional, 'id'>) => {
        try {
            setLoading(true);

            // 1. Actualizar el profesional
            const { error: profError } = await supabase
                .from('professionals')
                .update({
                    name: professional.name,
                    email: professional.email,
                    national_id: professional.nationalId,
                    role: professional.role,
                    status: professional.status,
                    registration_expiry: professional.registrationExpiry,
                    city: professional.residence.city,
                    region: professional.residence.region,
                    competencies: professional.competencies
                })
                .eq('id', id);

            if (profError) throw profError;

            // 2. Sincronizar contratos (Borrar antiguos e insertar nuevos)
            const { error: deleteError } = await supabase
                .from('contracts')
                .delete()
                .eq('professional_id', id);

            if (deleteError) throw deleteError;

            if (professional.contracts && professional.contracts.length > 0) {
                const contractsToInsert = professional.contracts.map(c => ({
                    professional_id: id,
                    company: c.company,
                    amount: c.amount,
                    type: c.type
                }));

                const { error: contractsError } = await supabase
                    .from('contracts')
                    .insert(contractsToInsert);

                if (contractsError) throw contractsError;
            }

            await fetchProfessionals();
            return { success: true };
        } catch (err: any) {
            console.error('Error updating professional:', err);
            return { success: false, error: err.message };
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProfessionals();
    }, []);

    return { professionals, loading, error, refresh: fetchProfessionals, addProfessional, updateProfessional };
};
