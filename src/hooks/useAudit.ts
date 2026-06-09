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
    }>) => {
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

        const { error } = await supabase
            .from('audit_reports')
            .update(dbUpdates)
            .eq('id', id);

        if (!error) fetchCases();
        return { success: !error, error };
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

            const { data: { publicUrl } } = supabase.storage
                .from('documents')
                .getPublicUrl(filePath);

            const { error } = await supabase
                .from('audit_documents')
                .insert({
                    audit_id:  auditId,
                    doc_type:  docType,
                    file_name: file.name,
                    file_url:  publicUrl,
                    notes:     notes || null,
                });

            if (error) throw error;
            await fetchCases();
            return { success: true, url: publicUrl };
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
        refresh: fetchCases,
    };
};
