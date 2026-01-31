import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Tender } from '../types/tenders';

export const useTenders = () => {
    const [tenders, setTenders] = useState<Tender[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchTenders = async () => {
        try {
            setLoading(true);
            setError(null);
            const { data, error: supabaseError } = await supabase
                .from('tenders')
                .select('*');

            if (supabaseError) throw supabaseError;

            const mappedTenders: Tender[] = (data || []).map(d => ({
                id: d.id,
                identificacion: {
                    modalidad: 'Telemedicina',
                    tipoServicio: d.service_type,
                    duracion: '24 meses'
                },
                volumen: {
                    total: d.volume_total,
                    urgencia: d.urgency_level,
                    hospitalizado: Math.floor(d.volume_total * 0.2),
                    ambulante: Math.floor(d.volume_total * 0.5)
                },
                riesgoSLA: {
                    escala: d.sla_risk_scale,
                    impacto: 'Crítico para servicios regionales'
                },
                multas: {
                    caidaSistema: 2,
                    errorDiagnostico: 5,
                    confidencialidad: 10,
                    topePorcentualContrato: 20
                },
                integracion: { dicom: true, hl7: true, risPacs: true, servidorOnPrem: false },
                economia: {
                    presupuestoTotal: 150000000,
                    precioUnitarioHabil: 15000,
                    precioUnitarioUrgencia: 22000,
                    margenProyectado: Number(d.projected_margin)
                }
            }));

            setTenders(mappedTenders);

            setTenders(mappedTenders);
        } catch (err: any) {
            console.error('Error fetching tenders:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const sendHighRiskAlert = async (tender: Tender) => {
        // Buscamos el canal de "Alertas Críticas" o similar
        const { data: channels } = await supabase.from('channels').select('id').eq('name', 'General').single();
        if (channels) {
            await supabase.from('messages').insert([{
                channel_id: channels.id,
                sender_id: 'AGRAWALL-AI',
                sender_name: '🛡️ AGRAWALL AI MONITOR',
                content: `ALERTA DE SEGURIDAD: Se ha detectado una licitación de ALTO RIESGO (${tender.riesgoSLA.escala}/8) para ${tender.identificacion.tipoServicio}. Requiere revisión inmediata de Auditoría.`,
                type: 'text'
            }]);
        }
    };

    const addTender = async (tender: Partial<Tender>) => {
        const { error } = await supabase.from('tenders').insert([{
            id: tender.id,
            service_type: tender.identificacion?.tipoServicio,
            volume_total: tender.volumen?.total,
            urgency_level: tender.volumen?.urgencia,
            sla_risk_scale: tender.riesgoSLA?.escala,
            projected_margin: tender.economia?.margenProyectado
        }]);
        if (!error) fetchTenders();
        return { success: !error, error };
    };

    useEffect(() => {
        fetchTenders();
    }, []);

    return { tenders, loading, error, addTender, sendHighRiskAlert };
};
