import { useState, useCallback, useEffect } from 'react';
import type { ClinicalProcedure, ClinicalStep } from '../../types/clinical';
import { generatePrepInstructions } from './messagingAI';
import { supabase } from '../../lib/supabase';

const STEPS: ClinicalStep[] = ['Admisión', 'Preparación', 'Ejecución', 'Cierre'];

export const useClinicalWorkflow = () => {
    const [procedures, setProcedures] = useState<ClinicalProcedure[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchProcedures = useCallback(async () => {
        try {
            setLoading(true);
            const { data, error: sbError } = await supabase
                .from('clinical_procedures')
                .select('*')
                .eq('status', 'active')
                .order('timestamp', { ascending: false });

            if (sbError) throw sbError;

            const mappedProcedures: ClinicalProcedure[] = (data || []).map(p => ({
                id: p.id,
                patientName: p.patient_name || 'Paciente Sin Nombre',
                examType: p.exam_type || 'Examen No Especificado',
                currentStep: p.current_step || 'Admisión',
                timestamp: p.timestamp || p.created_at || new Date().toISOString(),
                location: p.location || 'Sede No Definida',
                status: p.status || 'active',
                details: {
                    admissionVerified: p.details?.admissionVerified ?? false,
                    preparationChecklist: p.details?.preparationChecklist ?? [],
                    inventoryUsed: p.details?.inventoryUsed ?? [],
                    comments: p.details?.comments ?? '',
                    attachments: p.details?.attachments ?? [],
                    messagingInstructions: p.details?.messagingInstructions || ''
                }
            }));

            setProcedures(mappedProcedures);
        } catch (err: any) {
            setError(err.message);
            // Fallback for demo mode
            console.log('Demo Mode: Using mock procedures');
            setProcedures(MOCK_PROCEDURES);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchProcedures();
    }, [fetchProcedures]);

    const moveNext = useCallback(async (id: string) => {
        const proc = procedures.find(p => p.id === id);
        if (!proc) return;

        const currentIndex = STEPS.indexOf(proc.currentStep);
        const nextStep = STEPS[currentIndex + 1];

        try {
            if (!nextStep && currentIndex === STEPS.length - 1) {
                await supabase.from('clinical_procedures').update({ status: 'completed' }).eq('id', id);
                setProcedures(prev => prev.filter(p => p.id !== id));
                return;
            }

            let messageToStore = '';
            if (nextStep === 'Preparación') {
                messageToStore = await generatePrepInstructions({
                    patientName: proc.patientName,
                    examType: proc.examType,
                    location: proc.location
                });
            }

            const updates: any = { currentStep: nextStep };
            if (messageToStore) {
                updates.details = { ...proc.details, messagingInstructions: messageToStore };
            }

            const { error: updateError } = await supabase
                .from('clinical_procedures')
                .update(updates)
                .eq('id', id);

            if (updateError) throw updateError;

            setProcedures(prev => prev.map(p =>
                p.id === id ? { ...p, ...updates, currentStep: nextStep } : p
            ));
        } catch (err: any) {
            console.error('Error shifting step:', err);
            // UI Update local even if remote fails (demo mode)
            if (!nextStep) {
                setProcedures(prev => prev.filter(p => p.id !== id));
            } else {
                setProcedures(prev => prev.map(p =>
                    p.id === id ? { ...p, currentStep: nextStep } : p
                ));
            }
        }
    }, [procedures]);

    const addProcedure = useCallback(async (newProc: Partial<ClinicalProcedure>) => {
        const procedure: ClinicalProcedure = {
            id: `PROC-${Math.floor(Math.random() * 1000)}`,
            patientName: newProc.patientName || 'Paciente Nuevo',
            examType: newProc.examType || 'Exploración',
            currentStep: 'Admisión',
            timestamp: new Date().toISOString(),
            location: newProc.location || 'Sede Principal',
            status: 'active',
            details: {
                admissionVerified: false,
                preparationChecklist: [],
                inventoryUsed: [],
                ...newProc.details
            }
        };

        try {
            const { error: sbError } = await supabase
                .from('clinical_procedures')
                .insert([procedure]);

            if (sbError) throw sbError;
            setProcedures(prev => [procedure, ...prev]);
        } catch (err) {
            console.warn('Demo Mode: Adding procedure locally');
            setProcedures(prev => [procedure, ...prev]);
        }
    }, []);

    const updateProcedure = useCallback(async (id: string, updates: Partial<ClinicalProcedure>) => {
        try {
            const { error: sbError } = await supabase
                .from('clinical_procedures')
                .update(updates)
                .eq('id', id);

            if (sbError) throw sbError;
            setProcedures(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
        } catch (err) {
            setProcedures(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
        }
    }, []);

    return {
        procedures,
        loading,
        error,
        moveNext,
        addProcedure,
        updateProcedure,
        refresh: fetchProcedures
    };
};

const MOCK_PROCEDURES: ClinicalProcedure[] = [
    {
        id: 'PROC-001',
        patientName: 'Juan Pérez',
        examType: 'TC de Tórax con Contraste',
        currentStep: 'Admisión',
        timestamp: '2026-01-26T14:30:00Z',
        location: 'Sede Boreal - Providencia',
        status: 'active',
        details: {
            admissionVerified: false,
            preparationChecklist: [],
            inventoryUsed: []
        }
    },
    {
        id: 'PROC-002',
        patientName: 'Ana María Soto',
        examType: 'RM de Rodilla',
        currentStep: 'Preparación',
        timestamp: '2026-01-26T14:15:00Z',
        location: 'Sede Amis - Las Condes',
        status: 'active',
        details: {
            admissionVerified: true,
            preparationChecklist: ['Ayuno verificado', 'Signos vitales estables'],
            inventoryUsed: []
        }
    }
];
