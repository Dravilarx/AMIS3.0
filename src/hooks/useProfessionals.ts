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
            setError(null);

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
                lastName: p.last_name,
                email: p.email,
                nationalId: p.national_id,
                nationality: p.nationality,
                birthDate: p.birth_date,
                joiningDate: p.joining_date,
                phone: p.phone,
                role: p.role,
                status: p.status,
                registrationExpiry: p.registration_expiry,
                university: p.university,
                registrationNumber: p.registration_number,
                specialty: p.specialty,
                subSpecialty: p.sub_specialty,
                team: p.team,
                username: p.username,
                signatureType: p.signature_type,
                residence: {
                    city: p.city,
                    region: p.region,
                    country: p.country
                },
                competencies: p.competencies || [],
                induction: p.induction,
                contracts: (p.contracts || []).map((c: any) => ({
                    company: c.company,
                    amount: Number(c.amount),
                    type: c.type
                })),
                is_deleted: p.is_deleted,
                archived_at: p.archived_at
            })) as any;

            setProfessionals(mappedData);
        } catch (err: any) {
            console.error('Error fetching professionals:', err);
            setError(err.message);
            setProfessionals([]);
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
                    last_name: professional.lastName,
                    email: professional.email,
                    national_id: professional.nationalId,
                    nationality: professional.nationality,
                    birth_date: professional.birthDate,
                    joining_date: professional.joiningDate,
                    phone: professional.phone,
                    role: professional.role,
                    status: professional.status,
                    registration_expiry: professional.registrationExpiry,
                    university: professional.university,
                    registration_number: professional.registrationNumber,
                    specialty: professional.specialty,
                    sub_specialty: professional.subSpecialty,
                    team: professional.team,
                    username: professional.username,
                    signature_type: professional.signatureType,
                    city: professional.residence?.city,
                    region: professional.residence?.region,
                    country: professional.residence?.country,
                    competencies: professional.competencies,
                    induction: professional.induction
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
                    last_name: professional.lastName,
                    email: professional.email,
                    national_id: professional.nationalId,
                    nationality: professional.nationality,
                    birth_date: professional.birthDate,
                    joining_date: professional.joiningDate,
                    phone: professional.phone,
                    role: professional.role,
                    status: professional.status,
                    registration_expiry: professional.registrationExpiry,
                    university: professional.university,
                    registration_number: professional.registrationNumber,
                    specialty: professional.specialty,
                    sub_specialty: professional.subSpecialty,
                    team: professional.team,
                    username: professional.username,
                    signature_type: professional.signatureType,
                    city: professional.residence?.city,
                    region: professional.residence?.region,
                    country: professional.residence?.country,
                    competencies: professional.competencies,
                    induction: professional.induction
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

    const archiveProfessional = async (id: string) => {
        try {
            setLoading(true);
            const { error } = await supabase
                .from('professionals')
                .update({
                    is_deleted: true,
                    archived_at: new Date().toISOString(),
                    status: 'inhabilitado'
                })
                .eq('id', id);

            if (error) throw error;
            await fetchProfessionals();
            return { success: true };
        } catch (err: any) {
            console.error('Error archiving professional:', err);
            return { success: false, error: err.message };
        } finally {
            setLoading(false);
        }
    };

    const duplicateProfessional = async (professional: Professional) => {
        try {
            setLoading(true);
            const { id, contracts, ...dataToClone } = professional;

            // 1. Insertar el clon del profesional (con nombre modificado)
            const { data: profData, error: profError } = await supabase
                .from('professionals')
                .insert([{
                    name: `${dataToClone.name} (Copia)`,
                    last_name: dataToClone.lastName,
                    email: `copy.${Date.now()}.${dataToClone.email}`,
                    national_id: `COPY-${dataToClone.nationalId}`,
                    nationality: dataToClone.nationality,
                    birth_date: dataToClone.birthDate,
                    joining_date: new Date().toISOString().split('T')[0],
                    phone: dataToClone.phone,
                    role: dataToClone.role,
                    status: 'active',
                    university: dataToClone.university,
                    specialty: dataToClone.specialty,
                    sub_specialty: dataToClone.subSpecialty,
                    team: dataToClone.team,
                    city: dataToClone.residence?.city,
                    region: dataToClone.residence?.region,
                    country: dataToClone.residence?.country,
                    competencies: dataToClone.competencies
                }])
                .select()
                .single();

            if (profError) throw profError;

            // 2. Insertar contratos clonados si existen
            if (contracts && contracts.length > 0) {
                const contractsToInsert = contracts.map(c => ({
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
            return { success: true, data: profData };
        } catch (err: any) {
            console.error('Error duplicating professional:', err);
            return { success: false, error: err.message };
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProfessionals();
    }, []);

    return {
        professionals: professionals.filter(p => !p.is_deleted),
        loading,
        error,
        refresh: fetchProfessionals,
        addProfessional,
        updateProfessional,
        archiveProfessional,
        duplicateProfessional
    };
};
