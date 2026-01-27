import { useState, useCallback } from 'react';
import type { ClinicalProcedure, ClinicalStep } from '../../types/clinical';
import { generatePrepInstructions } from './messagingAI';
import { supabase } from '../../lib/supabase';

const STEPS: ClinicalStep[] = ['Admisión', 'Preparación', 'Ejecución', 'Cierre'];

export const useClinicalWorkflow = (initialProcedures: ClinicalProcedure[]) => {
    const [procedures, setProcedures] = useState<ClinicalProcedure[]>(initialProcedures);

    const moveNext = useCallback(async (id: string) => {
        const proc = procedures.find(p => p.id === id);
        if (!proc) return;

        const currentIndex = STEPS.indexOf(proc.currentStep);
        const nextStep = STEPS[currentIndex + 1];

        if (!nextStep && currentIndex === STEPS.length - 1) {
            await supabase.from('clinical_procedures').update({ status: 'completed' }).eq('id', id);
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

        const updates: any = { status: nextStep.toLowerCase() };
        if (messageToStore) {
            updates.details = { ...proc.details, messagingInstructions: messageToStore };
        }

        await supabase.from('clinical_procedures').update(updates).eq('id', id);
    }, [procedures]);

    const updateProcedure = useCallback((id: string, updates: Partial<ClinicalProcedure>) => {
        setProcedures(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
    }, []);

    return {
        procedures,
        moveNext,
        updateProcedure
    };
};
