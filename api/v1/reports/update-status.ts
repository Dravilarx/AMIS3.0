import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

export const edgeConfig = { runtime: 'edge' };

// Configuración de Supabase
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Configuración de Resend
const resend = new Resend(process.env.RESEND_API_KEY || '');

interface SectionPayload {
    title: string;
    technique: string;
    background: string;
    findings: string;
    impression: string;
}

interface CriticalAlert {
    finding_type: string;
    recipient: string;
}

interface UpdateStatusPayload {
    study_uid: string;
    action: 'REPORT' | 'VALIDATE';
    user_id: string;      // ID del médico que firma
    user_role: 'RESIDENT' | 'STAFF' | 'SUPER_ADMIN'; // Para control de doble firma
    sections: SectionPayload;
    critical_alert?: CriticalAlert;
}

export default async function handler(req: Request) {
    if (req.method === 'OPTIONS') {
        return new Response('OK', { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization' } });
    }

    if (req.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method Not Allowed' }), { status: 405 });
    }

    try {
        // 1. Verificación de Seguridad (API Key Interna del Dashboard RIS)
        const authHeader = req.headers.get('Authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ') || authHeader.split(' ')[1] !== process.env.AMIS_INTERNAL_API_KEY) {
            return new Response(JSON.stringify({ error: 'Unauthorized: Invalid AMIS API Key' }), { status: 401 });
        }

        const body: UpdateStatusPayload = await req.json();
        
        // 2. Lógica Estructural: Todas las 5 secciones son OBLIGATORIAS
        const s = body.sections;
        if (!s || !s.title || !s.technique || !s.background || !s.findings || !s.impression) {
            return new Response(JSON.stringify({ error: 'Integrity Error: Las 5 secciones del informe son obligatorias.' }), { status: 400 });
        }

        // 3. Lógica de Doble Firma
        if (body.action === 'VALIDATE') {
            if (body.user_role === 'RESIDENT') {
                return new Response(JSON.stringify({ error: 'RBAC Error: Los Médicos Residentes no pueden VALIDAR informes finales.' }), { status: 403 });
            }
        }

        // 4. State Machine (Upsert del Reporte)
        const statusToSet = body.action === 'VALIDATE' ? 'VALIDATED' : 'REPORTED';
        const payloadToUpdate: any = {
            study_uid: body.study_uid,
            status: statusToSet,
            section_title: s.title,
            section_technique: s.technique,
            section_background: s.background,
            section_findings: s.findings,
            section_impression: s.impression,
        };

        if (body.action === 'REPORT') {
            payloadToUpdate.reported_by = body.user_id;
            payloadToUpdate.reported_at = new Date().toISOString();
        } else {
            payloadToUpdate.validated_by = body.user_id;
            payloadToUpdate.validated_at = new Date().toISOString();
        }

        const { error: upsertError } = await supabase
            .from('dicom_reports')
            .upsert(payloadToUpdate, { onConflict: 'study_uid' });

        if (upsertError) {
            console.error("Supabase upsert error:", upsertError);
            return new Response(JSON.stringify({ error: 'DB Error', details: upsertError.message }), { status: 500 });
        }

        // 5. Motor de Notificaciones Críticas (Si hay un hallazgo crítico)
        if (body.critical_alert) {
            const { finding_type, recipient } = body.critical_alert;
            
            // Insertar traza de la notificación en BD
            await supabase.from('critical_notifications').insert({
                study_uid: body.study_uid,
                finding_type: finding_type,
                recipient_email: recipient,
            });

            // Disparar Email vía Resend
            try {
                await resend.emails.send({
                    from: 'AMIS Intelligence <alertas@amis.global>',
                    to: recipient,
                    subject: `[ALERTA CRÍTICA] Hallazgo de urgencia: ${finding_type}`,
                    html: `
                        <div style="font-family: Arial, sans-serif; padding: 20px; border: 2px solid #ef4444; border-radius: 8px;">
                            <h2 style="color: #ef4444;">🚨 ALERTA DE HALLAZGO CRÍTICO</h2>
                            <p>Estimado equipo médico,</p>
                            <p>El algoritmo de vigilancia AMIS ha detectado un hallazgo crítico en el último informe radicado:</p>
                            <ul>
                                <li><strong>Study UID:</strong> ${body.study_uid}</li>
                                <li><strong>Tipo de Hallazgo:</strong> <span style="font-weight: bold; color: #ef4444;">${finding_type}</span></li>
                            </ul>
                            <p><strong>Impresión Diagnóstica:</strong></p>
                            <p style="background: #fdf2f8; padding: 10px; border-left: 4px solid #ef4444;">${s.impression}</p>
                            <a href="https://tudominio-amis.vercel.app/ris/study/${body.study_uid}" style="display: inline-block; padding: 10px 20px; background: #000; color: #fff; text-decoration: none; font-weight: bold; border-radius: 5px; margin-top: 10px;">Ver Estudio Inmediatamente</a>
                        </div>
                    `
                });
            } catch (emailErr) {
                console.error("Resend error:", emailErr);
                // No detenemos el flujo si el email falla, registramos el error.
            }
        }

        return new Response(JSON.stringify({ 
            success: true, 
            message: `Report status updated to ${statusToSet}`,
            study_uid: body.study_uid
        }), { 
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (e: any) {
        console.error("API update-status Error: ", e);
        return new Response(JSON.stringify({ error: 'Internal Server Error', details: e.message }), { status: 500 });
    }
}
