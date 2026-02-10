import { useState, useCallback, useEffect } from 'react';
import type {
    ClinicalAppointment,
    MedicalProcedure,
    ClinicalCenter,
    AppointmentStatus,
    MedicalRequirement,
    RequirementBattery,
    ClinicalIndications,
    MedicalProfessional
} from '../../types/clinical';
import { supabase } from '../../lib/supabase';

export const useClinicalProcedures = () => {
    const [appointments, setAppointments] = useState<ClinicalAppointment[]>([]);
    const [catalog, setCatalog] = useState<MedicalProcedure[]>([]);
    const [centers, setCenters] = useState<ClinicalCenter[]>([]);
    const [requirements, setRequirements] = useState<MedicalRequirement[]>([]);
    const [batteries, setBatteries] = useState<RequirementBattery[]>([]);
    const [indications, setIndications] = useState<ClinicalIndications[]>([]);
    const [doctors, setDoctors] = useState<MedicalProfessional[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);

            // Fetch appointments with relations and documents
            const { data: appData, error: appError } = await supabase
                .from('clinical_appointments')
                .select(`
                    *,
                    procedure:medical_procedures_catalog(*),
                    center:clinical_centers(*),
                    documents:appointment_documents(
                        *,
                        requirement:medical_requirements(*)
                    )
                `)
                .order('appointment_date', { ascending: false });

            if (appError) throw appError;

            // Fetch Catalog, Centers, Requirements, Batteries, and all Indications
            const [catRes, centerRes, reqRes, battRes, indRes, docRes] = await Promise.all([
                supabase.from('medical_procedures_catalog').select('*').order('name'),
                supabase.from('clinical_centers').select('*').order('name'),
                supabase.from('medical_requirements').select('*').order('name'),
                supabase.from('requirement_batteries').select('*, requirements:medical_requirements(*)').order('name'),
                supabase.from('clinical_indications').select('*, procedure:medical_procedures_catalog(name), center:clinical_centers(name)'),
                supabase.from('professionals').select('*').order('name')
            ]);

            if (catRes.error) throw catRes.error;
            if (centerRes.error) throw centerRes.error;
            if (reqRes.error) throw reqRes.error;
            if (battRes.error) throw battRes.error;
            if (docRes.error) throw docRes.error;

            const professionalsList = docRes.data || [];

            setAppointments((appData || []).map((app: any) => ({
                id: app.id,
                patientName: app.patient_name,
                patientRut: app.patient_rut,
                patientEmail: app.patient_email,
                patientPhone: app.patient_phone,
                patientAddress: app.patient_address,
                patientBirthDate: app.patient_birth_date,
                healthcareProvider: app.healthcare_provider,
                referralInstitution: app.referral_institution,
                procedureId: app.procedure_id,
                procedure: app.procedure ? {
                    id: app.procedure.id,
                    code: app.procedure.code,
                    name: app.procedure.name,
                    description: app.procedure.description,
                    basePrice: app.procedure.base_price,
                    isActive: app.procedure.is_active
                } : undefined,
                doctorId: app.doctor_id,
                doctor: (() => {
                    const d = professionalsList.find((p: any) => p.id === app.doctor_id);
                    if (!d) return undefined;
                    return {
                        id: d.id,
                        name: `${d.name} ${d.last_name}`,
                        specialty: d.specialty || '',
                        rut: d.national_id || ''
                    };
                })(),
                centerId: app.center_id,
                center: app.center,
                appointmentDate: app.appointment_date,
                appointmentTime: app.appointment_time,
                status: app.status,
                checkoutStatus: app.checkout_status,
                logisticsStatus: app.logistics_status,
                medicalBackground: app.medical_background || { usesAnticoagulants: false, usesAspirin: false, observations: '' },
                documents: (app.documents || []).map((doc: any) => ({
                    id: doc.id,
                    appointmentId: doc.appointment_id,
                    requirementId: doc.requirement_id,
                    requirement: doc.requirement ? {
                        id: doc.requirement.id,
                        name: doc.requirement.name,
                        description: doc.requirement.description,
                        requirementType: doc.requirement.requirement_type,
                        isMandatory: doc.requirement.is_mandatory
                    } : undefined,
                    documentUrl: doc.document_url,
                    verified: doc.verified,
                    verifiedAt: doc.verified_at,
                    verifiedBy: doc.verified_by
                })),
                createdAt: app.created_at,
                updatedAt: app.updated_at
            })));

            setCatalog((catRes.data || []).map((p: any) => ({
                id: p.id,
                code: p.code,
                name: p.name,
                description: p.description,
                basePrice: p.base_price,
                isActive: p.is_active
            })));
            console.log('✅ Datos clínicos cargados:', {
                procedimientos: catRes.data?.length,
                requisitos: reqRes.data?.length,
                baterias: battRes.data?.length
            });

            setCenters(centerRes.data || []);
            setDoctors((docRes.data || []).map((d: any) => ({
                id: d.id,
                name: `${d.name} ${d.last_name}`,
                specialty: d.specialty || '',
                rut: d.national_id || ''
            })));

            setRequirements((reqRes.data || []).map((r: any) => ({
                id: r.id,
                name: r.name,
                description: r.description,
                requirementType: r.requirement_type,
                isMandatory: r.is_mandatory
            })));

            setBatteries((battRes.data || []).map((b: any) => ({
                id: b.id,
                name: b.name,
                description: b.description,
                requirements: (b.requirements || []).map((r: any) => ({
                    id: r.id,
                    name: r.name,
                    description: r.description,
                    requirementType: r.requirement_type,
                    isMandatory: r.is_mandatory
                }))
            })));

            setIndications((indRes.data || []).map((i: any) => ({
                id: i.id,
                procedureId: i.procedure_id,
                centerId: i.center_id,
                emailFormat: i.email_format,
                whatsappFormat: i.whatsapp_format,
                procedureName: i.procedure?.name,
                centerName: i.center?.name
            })));
        } catch (err: any) {
            console.error('❌ Error crítico en fetchData:', {
                message: err.message,
                details: err.details,
                hint: err.hint,
                code: err.code
            });
            setError(err.message || 'Error al cargar datos clínicos');
        } finally {
            setLoading(false);
        }
    }, [supabase]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const addAppointment = async (data: Partial<ClinicalAppointment>) => {
        try {
            const { data: newApp, error } = await supabase
                .from('clinical_appointments')
                .insert([{
                    patient_name: data.patientName,
                    patient_rut: data.patientRut,
                    patient_email: data.patientEmail,
                    patient_phone: data.patientPhone,
                    patient_address: data.patientAddress,
                    patient_birth_date: data.patientBirthDate,
                    healthcare_provider: data.healthcareProvider,
                    referral_institution: data.referralInstitution,
                    procedure_id: data.procedureId,
                    center_id: data.centerId,
                    appointment_date: data.appointmentDate,
                    appointment_time: data.appointmentTime,
                    status: 'scheduled',
                    logistics_status: data.logisticsStatus,
                    medical_background: data.medicalBackground,
                    doctor_id: data.doctorId,
                    checkout_status: false
                }])
                .select()
                .single();

            if (error) throw error;

            // Auto-link mandatory requirements
            const { data: mandatoryReqs } = await supabase
                .from('medical_requirements')
                .select('id')
                .eq('is_mandatory', true);

            if (mandatoryReqs && mandatoryReqs.length > 0) {
                const docPlaceholders = mandatoryReqs.map(r => ({
                    appointment_id: newApp.id,
                    requirement_id: r.id,
                    verified: false
                }));
                await supabase.from('appointment_documents').insert(docPlaceholders);
            }

            await fetchData();
            return { success: true, data: newApp };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    };

    const updateAppointment = async (id: string, data: Partial<ClinicalAppointment>) => {
        try {
            const { error } = await supabase
                .from('clinical_appointments')
                .update({
                    patient_name: data.patientName,
                    patient_rut: data.patientRut,
                    patient_email: data.patientEmail,
                    patient_phone: data.patientPhone,
                    patient_address: data.patientAddress,
                    patient_birth_date: data.patientBirthDate,
                    healthcare_provider: data.healthcareProvider,
                    referral_institution: data.referralInstitution,
                    procedure_id: data.procedureId,
                    center_id: data.centerId,
                    appointment_date: data.appointmentDate,
                    appointment_time: data.appointmentTime,
                    medical_background: data.medicalBackground,
                    doctor_id: data.doctorId,
                })
                .eq('id', id);

            if (error) throw error;
            await fetchData();
            return { success: true };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    };

    const verifyDocument = async (docId: string, verified: boolean, file?: File) => {
        try {
            let documentUrl: string | null = null;

            // If a file is provided, upload it to Supabase Storage
            if (file && verified) {
                const fileExt = file.name.split('.').pop() || 'pdf';
                const filePath = `clinical/${docId}_${Date.now()}.${fileExt}`;

                const { error: uploadError } = await supabase.storage
                    .from('documents')
                    .upload(filePath, file, {
                        cacheControl: '3600',
                        upsert: true
                    });

                if (uploadError) throw uploadError;

                const { data: urlData } = supabase.storage
                    .from('documents')
                    .getPublicUrl(filePath);

                documentUrl = urlData.publicUrl;
            }

            const updatePayload: Record<string, any> = {
                verified,
                verified_at: verified ? new Date().toISOString() : null
            };
            if (documentUrl) {
                updatePayload.document_url = documentUrl;
            }
            if (!verified) {
                updatePayload.document_url = null;
            }

            const { error } = await supabase
                .from('appointment_documents')
                .update(updatePayload)
                .eq('id', docId);

            if (error) throw error;
            await fetchData();
            return { success: true };
        } catch (err: any) {
            console.error('❌ Error verificando documento:', err.message || err);
            return { success: false, error: err.message };
        }
    };

    const updateAppointmentStatus = async (id: string, status: AppointmentStatus) => {
        try {
            const { error } = await supabase
                .from('clinical_appointments')
                .update({ status })
                .eq('id', id);

            if (error) throw error;
            setAppointments(prev => prev.map(a => a.id === id ? { ...a, status } : a));
            return { success: true };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    };

    const toggleCheckout = async (id: string, currentStatus: boolean) => {
        try {
            const { error } = await supabase
                .from('clinical_appointments')
                .update({ checkout_status: !currentStatus })
                .eq('id', id);

            if (error) throw error;
            await fetchData();
            return { success: true };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    };

    const getIndications = async (procedureId: string, centerId: string) => {
        try {
            const { data, error } = await supabase
                .from('clinical_indications')
                .select('*')
                .eq('procedure_id', procedureId)
                .eq('center_id', centerId)
                .single();

            if (error && error.code !== 'PGRST116') throw error;

            const mapped = data ? {
                id: data.id,
                procedureId: data.procedure_id,
                centerId: data.center_id,
                emailFormat: data.email_format,
                whatsappFormat: data.whatsapp_format
            } : null;

            return { success: true, data: mapped };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    };

    const upsertProcedure = async (procedure: Partial<MedicalProcedure>) => {
        try {
            const payload: any = {
                code: procedure.code,
                name: procedure.name,
                description: procedure.description,
                base_price: procedure.basePrice,
                is_active: procedure.isActive ?? true
            };
            if (procedure.id) payload.id = procedure.id;

            const { error } = await supabase
                .from('medical_procedures_catalog')
                .upsert([payload]);

            if (error) throw error;
            await fetchData();
            return { success: true };
        } catch (err: any) {
            console.error('❌ Error guardando procedimiento:', {
                message: err.message,
                details: err.details,
                hint: err.hint,
                code: err.code
            });
            return { success: false, error: err.message || 'Error desconocido' };
        }
    };

    const upsertIndications = async (ind: any) => {
        try {
            const payload: any = {
                procedure_id: ind.procedureId,
                center_id: ind.centerId,
                email_format: ind.emailFormat,
                whatsapp_format: ind.whatsappFormat
            };
            if (ind.id) payload.id = ind.id;

            const { error } = await supabase
                .from('clinical_indications')
                .upsert([payload]);

            if (error) throw error;
            await fetchData();
            return { success: true };
        } catch (err: any) {
            console.error('Error upserting indications:', err);
            return { success: false, error: err.message };
        }
    };

    const deleteIndications = async (id: string) => {
        try {
            const { error } = await supabase
                .from('clinical_indications')
                .delete()
                .eq('id', id);
            if (error) throw error;
            await fetchData();
            return { success: true };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    };

    const deleteProcedure = async (id: string) => {
        try {
            const { error } = await supabase
                .from('medical_procedures_catalog')
                .delete()
                .eq('id', id);
            if (error) throw error;
            await fetchData();
            return { success: true };
        } catch (err: any) {
            console.error('❌ Error eliminando procedimiento:', err.message || err);
            return { success: false, error: err.message || 'Error al eliminar' };
        }
    };

    const upsertRequirement = async (req: Partial<MedicalRequirement>) => {
        try {
            const payload: any = {
                name: req.name,
                description: req.description,
                requirement_type: req.requirementType,
                is_mandatory: req.isMandatory
            };
            if (req.id) payload.id = req.id;

            const { error } = await supabase
                .from('medical_requirements')
                .upsert([payload]);
            if (error) throw error;
            await fetchData();
            return { success: true };
        } catch (err: any) {
            console.error('Error upserting requirement:', err);
            return { success: false, error: err.message };
        }
    };

    const upsertBattery = async (batt: any) => {
        try {
            const payload: any = {
                name: batt.name,
                description: batt.description
            };
            if (batt.id) payload.id = batt.id;

            const { data: newBatt, error } = await supabase
                .from('requirement_batteries')
                .upsert([payload])
                .select()
                .single();

            if (error) throw error;

            // Handle requirement links if provided
            if (batt.requirementIds) {
                // Delete existing links
                await supabase
                    .from('battery_requirements')
                    .delete()
                    .eq('battery_id', newBatt.id);

                // Insert new links
                if (batt.requirementIds.length > 0) {
                    const links = batt.requirementIds.map((rid: string) => ({
                        battery_id: newBatt.id,
                        requirement_id: rid
                    }));
                    const { error: linkError } = await supabase
                        .from('battery_requirements')
                        .insert(links);
                    if (linkError) throw linkError;
                }
            }

            await fetchData();
            return { success: true };
        } catch (err: any) {
            console.error('Error upserting battery:', err);
            return { success: false, error: err.message };
        }
    };

    const deleteRequirement = async (id: string) => {
        try {
            const { error } = await supabase
                .from('medical_requirements')
                .delete()
                .eq('id', id);
            if (error) throw error;
            await fetchData();
            return { success: true };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    };

    const deleteBattery = async (id: string) => {
        try {
            const { error } = await supabase
                .from('requirement_batteries')
                .delete()
                .eq('id', id);
            if (error) throw error;
            await fetchData();
            return { success: true };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    };

    return {
        appointments,
        catalog,
        centers,
        requirements,
        batteries,
        loading,
        error,
        addAppointment,
        updateAppointment,
        updateAppointmentStatus,
        verifyDocument,
        toggleCheckout,
        getIndications,
        upsertProcedure,
        upsertIndications,
        deleteProcedure,
        deleteRequirement,
        deleteBattery,
        deleteIndications,
        indications,
        doctors,
        upsertRequirement,
        upsertBattery,
        refresh: fetchData
    };
};
