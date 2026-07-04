import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface AuditDocument {
    id:         string;
    auditId:    string;
    docType:    'informe' | 'orden_medica' | 'examen' | 'correo' | 'otro';
    fileName:   string;
    fileUrl:    string;
    uploadedAt: string;
    notes?:     string;
}

export interface AuditCommunication {
    id:             string;
    auditId:        string;
    direction:      'received' | 'sent';
    subject:        string;
    body:           string;
    fromEmail?:     string;
    toEmail?:       string;
    sentAt:         string;
    hasAttachment:  boolean;
}

export interface AuditTrailEntry {
    id:           string;
    auditId:      string;
    action:       string;
    fieldChanged?: string;
    oldValue?:    string;
    newValue?:    string;
    userId?:      string;
    userName?:    string;
    createdAt:    string;
}

export interface AuditCase {
    id:               string;
    patientName:      string;
    patientRut?:      string;
    institution?:     string;
    doctorId?:        string;
    doctorName?:      string;
    requestType:      string;
    requestDate:      string;
    resolutionDate?:  string;
    status:           'pending' | 'reviewed' | 'escalated' | 'completed';
    agrawallLevel?:   number;
    agrawallReasoning?: string;
    agrawallFindings:   string[];
    observations?:    string;
    measuresTaken?:   string;
    reportContent?:   string;
    complianceDetails?: Record<string, any>;
    nonconformityType?: string;
    severity?:        string;
    providerName?:    string;
    problemDescription?: string;
    proposedSolution?: string;
    correctiveAction?: string;
    kanbanColumn?:    string;
    documents:        AuditDocument[];
    communications:   AuditCommunication[];
    createdAt:        string;
}

const mapCase = (r: any): AuditCase => ({
    id:               r.id,
    patientName:      r.patient_name,
    patientRut:       r.patient_rut,
    institution:      r.institution || r.compliance_details?.institution,
    doctorId:         r.doctor_id,
    doctorName:       r.doctor_name || r.professionals?.name,
    requestType:      r.request_type || r.compliance_details?.requestType || 'Radiología',
    requestDate:      r.request_date || r.created_at,
    resolutionDate:   r.resolution_date,
    status:           r.status,
    agrawallLevel:    r.agrawall_level || r.score,
    agrawallReasoning: r.agrawall_reasoning || r.compliance_details?.aiClassificationReason,
    agrawallFindings:  Array.isArray(r.agrawall_findings) ? r.agrawall_findings
                        : typeof r.anomalies === 'string' ? r.anomalies.split('\n').filter(Boolean)
                        : [],
    observations:     r.observations,
    measuresTaken:    r.measures_taken,
    reportContent:    r.reportContent,
    complianceDetails: r.compliance_details,
    nonconformityType: r.nonconformity_type,
    severity:         r.severity,
    providerName:     r.provider_name,
    problemDescription: r.problem_description,
    proposedSolution: r.proposed_solution,
    correctiveAction: r.corrective_action,
    kanbanColumn:     r.kanban_column || 'nuevo',
    documents:        (r.audit_documents || []).map((d: any) => ({
        id:         d.id,
        auditId:    d.audit_id,
        docType:    d.doc_type,
        fileName:   d.file_name,
        fileUrl:    d.file_url,
        uploadedAt: d.uploaded_at,
        notes:      d.notes,
    })),
    communications:   (r.audit_communications || []).map((c: any) => ({
        id:            c.id,
        auditId:       c.audit_id,
        direction:     c.direction,
        subject:       c.subject,
        body:          c.body,
        from_email:     c.fromEmail || null,
        to_email:       c.toEmail   || null,
        sentAt:        c.sent_at,
        hasAttachment: c.has_attachment,
    })),
    createdAt: r.created_at,
});

export const useAudit = () => {
    const [cases,   setCases]   = useState<AuditCase[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchCases = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('audit_reports')
                .select(`
                    *,
                    professionals ( name, last_name ),
                    audit_documents (*),
                    audit_communications (*)
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setCases((data || []).map(mapCase));
        } catch (err) {
            console.error('[Audit] Error:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCases();
        const sub = supabase.channel('audit_changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'audit_reports' }, fetchCases)
            .subscribe();
        return () => { supabase.removeChannel(sub); };
    }, []);

    // ── Crear caso ────────────────────────────────────────────────────────────
    const addAudit = async (audit: any) => {
        const { error } = await supabase.from('audit_reports').insert([audit]);
        if (!error) fetchCases();
        return { success: !error, error };
    };

    // ── Registrar entrada en la bitácora (audit_trail) ─────────────────────────
    const logTrail = async (
        auditId:      string,
        action:       string,
        fieldChanged?: string,
        oldValue?:    string,
        newValue?:    string
    ) => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            let userName: string | null = null;
            if (user) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('name')
                    .eq('id', user.id)
                    .single();
                userName = profile?.name || user.email || null;
            }

            const { error } = await supabase
                .from('audit_trail')
                .insert({
                    audit_id:      auditId,
                    action,
                    field_changed: fieldChanged || null,
                    old_value:     oldValue ?? null,
                    new_value:     newValue ?? null,
                    user_id:       user?.id || null,
                    user_name:     userName,
                });

            if (error) throw error;
            return { success: true };
        } catch (err: any) {
            console.error('[Audit] Error registrando bitácora:', err);
            return { success: false, error: err.message };
        }
    };

    // ── Actualizar caso ───────────────────────────────────────────────────────
    const updateCase = async (id: string, updates: Partial<{
        status:            AuditCase['status'];
        doctorId:          string;
        doctorName:        string;
        institution:       string;
        requestType:       string;
        resolutionDate:    string;
        observations:      string;
        measuresTaken:     string;
        agrawallLevel:     number;
        agrawallReasoning: string;
        agrawallFindings:  string[];
        nonconformityType: string;
        severity:          string;
        providerName:      string;
        problemDescription: string;
        proposedSolution:  string;
        correctiveAction:  string;
        kanbanColumn:      string;
    }>) => {
        // Caso previo para comparar y registrar los cambios en la bitácora
        const prev = cases.find(c => c.id === id);

        const dbUpdates: any = {};
        if (updates.status           !== undefined) dbUpdates.status              = updates.status;
        if (updates.doctorId         !== undefined) dbUpdates.doctor_id           = updates.doctorId;
        if (updates.doctorName       !== undefined) dbUpdates.doctor_name         = updates.doctorName;
        if (updates.institution      !== undefined) dbUpdates.institution         = updates.institution;
        if (updates.requestType      !== undefined) dbUpdates.request_type        = updates.requestType;
        if (updates.resolutionDate   !== undefined) dbUpdates.resolution_date     = updates.resolutionDate;
        if (updates.observations     !== undefined) dbUpdates.observations        = updates.observations;
        if (updates.measuresTaken    !== undefined) dbUpdates.measures_taken      = updates.measuresTaken;
        if (updates.agrawallLevel    !== undefined) dbUpdates.agrawall_level      = updates.agrawallLevel;
        if (updates.agrawallReasoning !== undefined) dbUpdates.agrawall_reasoning = updates.agrawallReasoning;
        if (updates.agrawallFindings !== undefined) dbUpdates.agrawall_findings   = updates.agrawallFindings;
        if (updates.nonconformityType !== undefined) dbUpdates.nonconformity_type = updates.nonconformityType;
        if (updates.severity         !== undefined) dbUpdates.severity            = updates.severity;
        if (updates.providerName     !== undefined) dbUpdates.provider_name       = updates.providerName;
        if (updates.problemDescription !== undefined) dbUpdates.problem_description = updates.problemDescription;
        if (updates.proposedSolution !== undefined) dbUpdates.proposed_solution   = updates.proposedSolution;
        if (updates.correctiveAction !== undefined) dbUpdates.corrective_action   = updates.correctiveAction;
        if (updates.kanbanColumn     !== undefined) dbUpdates.kanban_column        = updates.kanbanColumn;

        const { error } = await supabase
            .from('audit_reports')
            .update(dbUpdates)
            .eq('id', id);

        if (!error) {
            // Registrar en la bitácora qué cambió
            if (updates.status !== undefined && updates.status !== prev?.status) {
                await logTrail(id, `Cambió estado de ${prev?.status ?? '—'} a ${updates.status}`, 'status', prev?.status, updates.status);
            }
            if (updates.kanbanColumn !== undefined && updates.kanbanColumn !== prev?.kanbanColumn) {
                await logTrail(id, `Movió de columna ${prev?.kanbanColumn ?? '—'} a ${updates.kanbanColumn}`, 'kanban_column', prev?.kanbanColumn, updates.kanbanColumn);
            }
            if (updates.severity !== undefined && updates.severity !== prev?.severity) {
                await logTrail(id, `Cambió severidad de ${prev?.severity ?? '—'} a ${updates.severity}`, 'severity', prev?.severity, updates.severity);
            }
            if (updates.nonconformityType !== undefined && updates.nonconformityType !== prev?.nonconformityType) {
                await logTrail(id, `Cambió tipo de no conformidad a ${updates.nonconformityType}`, 'nonconformity_type', prev?.nonconformityType, updates.nonconformityType);
            }
            if (updates.providerName !== undefined && updates.providerName !== prev?.providerName) {
                await logTrail(id, `Asignó prestador ${updates.providerName}`, 'provider_name', prev?.providerName, updates.providerName);
            }
            if (updates.correctiveAction !== undefined && updates.correctiveAction !== prev?.correctiveAction) {
                await logTrail(id, 'Registró acción correctiva', 'corrective_action', prev?.correctiveAction, updates.correctiveAction);
            }
            if (updates.proposedSolution !== undefined && updates.proposedSolution !== prev?.proposedSolution) {
                await logTrail(id, 'Registró solución propuesta', 'proposed_solution', prev?.proposedSolution, updates.proposedSolution);
            }
            if (updates.problemDescription !== undefined && updates.problemDescription !== prev?.problemDescription) {
                await logTrail(id, 'Actualizó descripción del problema', 'problem_description', prev?.problemDescription, updates.problemDescription);
            }
            fetchCases();
        }
        return { success: !error, error };
    };

    // ── Mover caso en el tablero Kanban ─────────────────────────────────────────
    const moveKanban = async (auditId: string, newColumn: string) => {
        const prev = cases.find(c => c.id === auditId);

        const { error } = await supabase
            .from('audit_reports')
            .update({ kanban_column: newColumn })
            .eq('id', auditId);

        if (!error) {
            await logTrail(
                auditId,
                `Movió de columna ${prev?.kanbanColumn ?? '—'} a ${newColumn}`,
                'kanban_column',
                prev?.kanbanColumn,
                newColumn
            );
            fetchCases();
        }
        return { success: !error, error };
    };

    // ── Obtener bitácora de un caso ─────────────────────────────────────────────
    const fetchTrail = async (auditId: string): Promise<AuditTrailEntry[]> => {
        const { data, error } = await supabase
            .from('audit_trail')
            .select('*')
            .eq('audit_id', auditId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('[Audit] Error obteniendo bitácora:', error);
            return [];
        }

        return (data || []).map((t: any): AuditTrailEntry => ({
            id:           t.id,
            auditId:      t.audit_id,
            action:       t.action,
            fieldChanged: t.field_changed,
            oldValue:     t.old_value,
            newValue:     t.new_value,
            userId:       t.user_id,
            userName:     t.user_name,
            createdAt:    t.created_at,
        }));
    };

    // ── Subir documento ───────────────────────────────────────────────────────
    const uploadDocument = async (
        auditId:  string,
        file:     File,
        docType:  AuditDocument['docType'],
        notes?:   string
    ) => {
        try {
            const ext      = file.name.split('.').pop();
            const filePath = `audit/${auditId}/${docType}-${Date.now()}.${ext}`;

            const { error: storageError } = await supabase.storage
                .from('documents')
                .upload(filePath, file, { upsert: true });

            if (storageError) throw storageError;

            // Bucket privado: se guarda la RUTA; la URL firmada se resuelve al abrir.
            const { error } = await supabase
                .from('audit_documents')
                .insert({
                    audit_id:  auditId,
                    doc_type:  docType,
                    file_name: file.name,
                    file_url:  filePath,
                    notes:     notes || null,
                });

            if (error) throw error;
            await fetchCases();
            return { success: true, url: filePath };
        } catch (err: any) {
            console.error('[Audit] Error subiendo documento:', err);
            return { success: false, error: err.message };
        }
    };

    // ── Eliminar documento ────────────────────────────────────────────────────
    const deleteDocument = async (docId: string) => {
        const { error } = await supabase
            .from('audit_documents')
            .delete()
            .eq('id', docId);
        if (!error) fetchCases();
        return { success: !error };
    };

    // ── Agregar comunicación ──────────────────────────────────────────────────
    const addCommunication = async (
        auditId: string,
        comm: Omit<AuditCommunication, 'id' | 'auditId' | 'sentAt'>
    ) => {
        const { error } = await supabase
            .from('audit_communications')
            .insert({
                audit_id:       auditId,
                direction:      comm.direction,
                subject:        comm.subject,
                body:           comm.body,
                from_email:     comm.fromEmail || null,
                to_email:       comm.toEmail   || null,
                has_attachment: comm.hasAttachment,
            });

        if (!error) fetchCases();
        return { success: !error };
    };

    // ── Soft delete caso ──────────────────────────────────────────────────────
    const archiveCase = async (id: string) => {
        const { error } = await supabase
            .from('audit_reports')
            .update({ status: 'escalated' })
            .eq('id', id);
        if (!error) fetchCases();
        return { success: !error };
    };

    return {
        cases,
        audits: cases, // backward compat
        loading,
        addAudit,
        updateCase,
        uploadDocument,
        deleteDocument,
        addCommunication,
        archiveCase,
        logTrail,
        moveKanban,
        fetchTrail,
        refresh: fetchCases,
    };
};
