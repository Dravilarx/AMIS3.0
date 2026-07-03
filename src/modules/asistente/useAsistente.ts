import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';

// ─── Tipos ────────────────────────────────────────────────────────────────────
export interface AsistenteInstitution {
    id: string;
    nombre: string; // commercial_name || legal_name
}

export interface DoctorLite {
    id: string;
    name: string;
    lastName: string;
    email: string | null;
    phoneNumber: string;
    hospitalName: string;
    specialty: string | null;
    rut: string | null;
}

export interface NuevoMedico {
    name: string;
    last_name: string;
    email?: string;
    phone_number: string;
    hospital_name: string;
    specialty?: string;
    rut?: string;
}

export interface InvitacionRow {
    id: string;
    estado: string;
    token: string;
    creadaAt: string;
    medico: string;
    centro: string;
}

export interface CrearInvitacionParams {
    institutionId: string;
    medicoExistenteId?: string | null;
    nuevoMedico?: NuevoMedico | null;
}

export const useAsistente = () => {
    const [institutions, setInstitutions] = useState<AsistenteInstitution[]>([]);
    const [invitaciones, setInvitaciones] = useState<InvitacionRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const [instRes, invRes] = await Promise.all([
                supabase
                    .from('institutions')
                    .select('id, legal_name, commercial_name')
                    .order('legal_name'),
                supabase
                    .from('comm_invitaciones')
                    .select(`
                        id, estado, token, creada_at,
                        medico:external_doctors(name, last_name),
                        centro:institutions(legal_name, commercial_name)
                    `)
                    .order('creada_at', { ascending: false })
                    .limit(20),
            ]);

            if (instRes.error) throw instRes.error;
            if (invRes.error) throw invRes.error;

            setInstitutions((instRes.data || []).map((i: any) => ({
                id: i.id,
                nombre: i.commercial_name || i.legal_name,
            })));

            setInvitaciones((invRes.data || []).map((r: any) => ({
                id: r.id,
                estado: r.estado,
                token: r.token,
                creadaAt: r.creada_at,
                medico: r.medico ? `${r.medico.name} ${r.medico.last_name ?? ''}`.trim() : '—',
                centro: r.centro ? (r.centro.commercial_name || r.centro.legal_name) : '—',
            })));
        } catch (err: any) {
            console.error('Error cargando datos del asistente:', err);
            setError(err.message || 'Error cargando datos del asistente');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Búsqueda en vivo de médicos existentes (por nombre, apellido o email)
    const buscarMedicos = useCallback(async (term: string): Promise<DoctorLite[]> => {
        const t = term.trim();
        if (t.length < 2) return [];
        const like = `%${t}%`;
        const { data, error: searchErr } = await supabase
            .from('external_doctors')
            .select('id, name, last_name, email, phone_number, hospital_name, specialty, rut')
            .or(`name.ilike.${like},last_name.ilike.${like},email.ilike.${like}`)
            .order('name')
            .limit(15);
        if (searchErr) {
            console.error('Error buscando médicos:', searchErr);
            return [];
        }
        return (data || []).map((d: any) => ({
            id: d.id,
            name: d.name,
            lastName: d.last_name,
            email: d.email,
            phoneNumber: d.phone_number,
            hospitalName: d.hospital_name,
            specialty: d.specialty,
            rut: d.rut,
        }));
    }, []);

    // Flujo completo de generación de invitación (pasos a–d del plan)
    const crearInvitacion = async (
        params: CrearInvitacionParams
    ): Promise<{ success: boolean; token?: string; error?: string }> => {
        try {
            const { institutionId, medicoExistenteId, nuevoMedico } = params;
            if (!institutionId) return { success: false, error: 'Selecciona un centro' };

            // a. Resolver médico: nuevo (insert) o existente (id directo)
            let doctorId = medicoExistenteId || null;
            if (!doctorId) {
                if (!nuevoMedico) return { success: false, error: 'Falta seleccionar o crear un médico' };
                const { data: newDoc, error: docErr } = await supabase
                    .from('external_doctors')
                    .insert({
                        name: nuevoMedico.name,
                        last_name: nuevoMedico.last_name,
                        email: nuevoMedico.email || null,
                        phone_number: nuevoMedico.phone_number,
                        hospital_name: nuevoMedico.hospital_name,
                        specialty: nuevoMedico.specialty || null,
                        rut: nuevoMedico.rut || null,
                    })
                    .select('id')
                    .single();
                if (docErr) throw docErr;
                doctorId = newDoc.id;
            }

            // b. Tenant (hay uno solo)
            const { data: tenant, error: tenErr } = await supabase
                .from('comm_tenants')
                .select('id')
                .limit(1)
                .single();
            if (tenErr) throw tenErr;

            // uid autenticado → autorizado_por (patrón supabase.auth.getUser())
            const { data: { user } } = await supabase.auth.getUser();

            // c. Upsert autorización. Respeta UNIQUE(external_doctor_id, institution_id):
            //    si el médico ya está autorizado en ese centro, actualiza la fila
            //    existente a estado='autorizado' (idempotente, no lanza error).
            const { error: mcErr } = await supabase
                .from('comm_medico_centro')
                .upsert(
                    {
                        tenant_id: tenant.id,
                        external_doctor_id: doctorId,
                        institution_id: institutionId,
                        estado: 'autorizado',
                        autorizado_por: user?.id ?? null,
                    },
                    { onConflict: 'external_doctor_id,institution_id' }
                );
            if (mcErr) throw mcErr;

            // d. Invitación (el token uuid lo genera la DB por defecto)
            const { data: inv, error: invErr } = await supabase
                .from('comm_invitaciones')
                .insert({
                    tenant_id: tenant.id,
                    external_doctor_id: doctorId,
                    institution_id: institutionId,
                })
                .select('token')
                .single();
            if (invErr) throw invErr;

            await fetchData();
            return { success: true, token: inv.token };
        } catch (err: any) {
            console.error('Error generando invitación:', err);
            return { success: false, error: err.message || 'Error generando invitación' };
        }
    };

    return {
        institutions,
        invitaciones,
        loading,
        error,
        buscarMedicos,
        crearInvitacion,
        refresh: fetchData,
    };
};
