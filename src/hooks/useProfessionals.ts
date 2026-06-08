import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Professional } from '../types/core';

// ─────────────────────────────────────────────────────────────────────────────
// UTILIDADES INTERNAS
// ─────────────────────────────────────────────────────────────────────────────

const orNull = (v: string | undefined | null): string | null =>
    v && v.trim() !== '' ? v.trim() : null;

/**
 * Valida un RUT chileno (algoritmo módulo 11).
 * Exportada para usarla también en ProfessionalModal.
 */
export function validateRUT(rut: string): boolean {
    if (!rut || typeof rut !== 'string') return false;
    const clean = rut.replace(/[^0-9kK]/g, '').toUpperCase();
    if (clean.length < 2) return false;
    const body = clean.slice(0, -1);
    const dv   = clean.slice(-1);
    if (!/^\d{7,8}$/.test(body)) return false;
    let sum = 0;
    let multiplier = 2;
    for (let i = body.length - 1; i >= 0; i--) {
        sum += parseInt(body[i], 10) * multiplier;
        multiplier = multiplier === 7 ? 2 : multiplier + 1;
    }
    const remainder = 11 - (sum % 11);
    const expected  = remainder === 11 ? '0' : remainder === 10 ? 'K' : String(remainder);
    return dv === expected;
}

const mapRow = (p: any): Professional => ({
    id:                 p.id,
    name:               p.name,
    lastName:           p.last_name,
    email:              p.email,
    nationalId:         p.national_id,
    nationality:        p.nationality,
    birthDate:          p.birth_date,
    joiningDate:        p.joining_date,
    phone:              p.phone,
    role:               p.role,
    status:             p.status,
    isActive:           p.is_active ?? true,
    registrationExpiry: p.registration_expiry,
    university:         p.university,
    registrationNumber: p.registration_number,
    specialty:          p.specialty,
    subSpecialty:       p.sub_specialty,
    team:               p.team,
    username:           p.username,
    signatureType:      p.signature_type,
    associatedWith:     p.associated_with,
    clinicalRole:       p.clinical_role ?? 'MED_STAFF',
    supervisorId:       p.supervisor_id ?? undefined,
    publicNameAllowed:  p.public_name_allowed ?? true,
    residence: {
        city:    p.city,
        region:  p.region,
        country: p.country,
    },
    competencies: p.competencies || [],
    induction:    p.induction,
    photoUrl:     p.photo_url,
    infoStatus:   p.info_status || 'incomplete',
    isVerified:   p.is_verified || false,
    contracts: (p.contracts || []).map((c: any) => ({
        company: c.company,
        amount:  Number(c.amount),
        type:    c.type,
    })),
    is_deleted:  p.is_deleted,
    archived_at: p.archived_at,
});

const buildProfRow = (p: Omit<Professional, 'id' | 'contracts'>) => ({
    name:                orNull(p.name) ?? p.name,
    last_name:           orNull(p.lastName),
    email:               orNull(p.email),
    national_id:         orNull(p.nationalId),
    nationality:         orNull(p.nationality),
    birth_date:          orNull(p.birthDate),
    joining_date:        orNull(p.joiningDate),
    phone:               orNull(p.phone),
    role:                orNull(p.role),
    status:              p.status,
    is_active:           p.isActive ?? true,
    university:          orNull(p.university),
    registration_number: orNull(p.registrationNumber),
    specialty:           orNull(p.specialty),
    sub_specialty:       orNull(p.subSpecialty),
    team:                orNull(p.team),
    username:            orNull(p.username),
    signature_type:      orNull(p.signatureType),
    associated_with:     orNull(p.associatedWith),
    city:                orNull(p.residence?.city),
    region:              orNull(p.residence?.region),
    country:             orNull(p.residence?.country),
    competencies:        p.competencies,
    induction:           p.induction,
    photo_url:           orNull(p.photoUrl),
    info_status:         p.infoStatus || 'incomplete',
    is_verified:         p.isVerified || false,
});

// ─────────────────────────────────────────────────────────────────────────────
// HOOK
// ─────────────────────────────────────────────────────────────────────────────

export const useProfessionals = () => {
    const [professionals, setProfessionals] = useState<Professional[]>([]);
    const [loading, setLoading]             = useState(true);
    const [error, setError]                 = useState<string | null>(null);

    const fetchProfessionals = async () => {
        try {
            setLoading(true);
            setError(null);
            const { data, error: supabaseError } = await supabase
                .from('professionals')
                .select(`*, contracts (*)`);
            if (supabaseError) throw supabaseError;
            setProfessionals((data || []).map(mapRow));
        } catch (err: any) {
            console.error('Error fetching professionals:', err);
            setError(err.message);
            setProfessionals([]);
        } finally {
            setLoading(false);
        }
    };

    // ── Crear ──────────────────────────────────────────────────────────────────
    const addProfessional = async (professional: Omit<Professional, 'id'>) => {
        if (professional.nationalId && !validateRUT(professional.nationalId)) {
            return { success: false, error: 'RUT inválido. Verifica el dígito verificador.' };
        }
        try {
            const { data: profData, error: profError } = await supabase
                .from('professionals')
                .insert([buildProfRow(professional)])
                .select()
                .single();
            if (profError) throw profError;
            if (professional.contracts?.length) {
                const { error: contractsError } = await supabase
                    .from('contracts')
                    .insert(professional.contracts.map(c => ({
                        professional_id: profData.id,
                        company: c.company,
                        amount:  c.amount,
                        type:    c.type,
                    })));
                if (contractsError) throw contractsError;
            }
            await fetchProfessionals();
            return { success: true };
        } catch (err: any) {
            console.error('Error adding professional:', err);
            return { success: false, error: err.message };
        }
    };

    // ── Actualizar (con diff de contratos) ────────────────────────────────────
    const updateProfessional = async (id: string, professional: Omit<Professional, 'id'>) => {
        if (professional.nationalId && !validateRUT(professional.nationalId)) {
            return { success: false, error: 'RUT inválido. Verifica el dígito verificador.' };
        }
        try {
            setLoading(true);

            // 1. Actualizar datos del profesional
            const { error: profError } = await supabase
                .from('professionals')
                .update(buildProfRow(professional))
                .eq('id', id);
            if (profError) throw profError;

            // 2. Diff de contratos — solo toca lo que cambió
            const { data: currentContracts, error: fetchError } = await supabase
                .from('contracts')
                .select('id, company, type, amount')
                .eq('professional_id', id);
            if (fetchError) throw fetchError;

            const incomingContracts  = professional.contracts ?? [];
            const incomingKeys = new Set(incomingContracts.map(c => `${c.company}|${c.type}`));
            const currentKeys  = new Set((currentContracts || []).map((c: any) => `${c.company}|${c.type}`));

            const toDelete = (currentContracts || []).filter(
                (c: any) => !incomingKeys.has(`${c.company}|${c.type}`)
            );
            const toInsert = incomingContracts.filter(
                c => !currentKeys.has(`${c.company}|${c.type}`)
            );

            if (toDelete.length > 0) {
                const { error: deleteError } = await supabase
                    .from('contracts')
                    .delete()
                    .in('id', toDelete.map((c: any) => c.id));
                if (deleteError) throw deleteError;
            }
            if (toInsert.length > 0) {
                const { error: insertError } = await supabase
                    .from('contracts')
                    .insert(toInsert.map(c => ({
                        professional_id: id,
                        company: c.company,
                        amount:  c.amount,
                        type:    c.type,
                    })));
                if (insertError) throw insertError;
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

    // ── Archivar — SOFT DELETE ─────────────────────────────────────────────────
    const archiveProfessional = async (id: string) => {
        try {
            setLoading(true);
            const { error } = await supabase
                .from('professionals')
                .update({
                    is_deleted:  true,
                    archived_at: new Date().toISOString(),
                    is_active:   false,
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

    // ── Restaurar ──────────────────────────────────────────────────────────────
    const restoreProfessional = async (id: string) => {
        try {
            setLoading(true);
            const { error } = await supabase
                .from('professionals')
                .update({
                    is_deleted:  false,
                    archived_at: null,
                    is_active:   true,
                })
                .eq('id', id);
            if (error) throw error;
            await fetchProfessionals();
            return { success: true };
        } catch (err: any) {
            console.error('Error restoring professional:', err);
            return { success: false, error: err.message };
        } finally {
            setLoading(false);
        }
    };

    // ── Duplicar ───────────────────────────────────────────────────────────────
    const duplicateProfessional = async (professional: Professional) => {
        try {
            setLoading(true);
            const { id, contracts, ...dataToClone } = professional;
            const { data: profData, error: profError } = await supabase
                .from('professionals')
                .insert([{
                    ...buildProfRow(dataToClone),
                    name:         `${dataToClone.name} (Copia)`,
                    email:        `copy.${Date.now()}.${dataToClone.email}`,
                    national_id:  `COPY-${dataToClone.nationalId}`,
                    joining_date: new Date().toISOString().split('T')[0],
                    status:       'active',
                    is_active:    true,
                    info_status:  'incomplete',
                    is_verified:  false,
                }])
                .select()
                .single();
            if (profError) throw profError;
            if (contracts?.length) {
                const { error: contractsError } = await supabase
                    .from('contracts')
                    .insert(contracts.map(c => ({
                        professional_id: profData.id,
                        company: c.company,
                        amount:  c.amount,
                        type:    c.type,
                    })));
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
        professionals:        professionals.filter(p => !p.is_deleted),
        allProfessionals:     professionals,
        loading,
        error,
        refresh:              fetchProfessionals,
        addProfessional,
        updateProfessional,
        archiveProfessional,
        restoreProfessional,
        duplicateProfessional,
        validateRUT,
    };
};
