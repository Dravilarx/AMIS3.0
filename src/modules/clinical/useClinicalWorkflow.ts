import { useState, useCallback } from 'react';
import type { ClinicalProcedure, ClinicalStep } from '../../types/clinical';
import { generatePrepInstructions } from './messagingAI';

const STEPS: ClinicalStep[] = ['Admisión', 'Preparación', 'Ejecución', 'Cierre'];

export const useClinicalWorkflow = (initialProcedures: ClinicalProcedure[]) => {
    const [procedures, setProcedures] = useState<ClinicalProcedure[]>(initialProcedures);

    const moveNext = useCallback(async (id: string) => {
        // Buscamos el procedimiento actual antes del mapeo para efectos asíncronos
        const proc = procedures.find(p => p.id === id);
        if (!proc) return;

        const currentIndex = STEPS.indexOf(proc.currentStep);
        const nextStep = STEPS[currentIndex + 1];

        if (!nextStep && currentIndex === STEPS.length - 1) {
            setProcedures(prev => prev.map(p => p.id === id ? { ...p, status: 'completed' as const } : p));
            return;
        }

        let messageToStore = '';
        // Side Effect: Messaging (Admisión -> Preparación)
        if (nextStep === 'Preparación') {
            console.log(`[Smart Message] Generando instrucciones para ${proc.patientName}...`);
            messageToStore = await generatePrepInstructions({
                patientName: proc.patientName,
                examType: proc.examType,
                location: proc.location
            });
            console.log(`[Smart Message] Generado:`, messageToStore);
        }

        setProcedures(prev => prev.map(p => {
            if (p.id !== id) return p;

            // Side Effect: Inventory (Preparación -> Ejecución)
            if (nextStep === 'Ejecución') {
                const usedItems = [{ item: 'Kit de Contraste', quantity: 1 }, { item: 'Jeringa 20ml', quantity: 1 }];
                return {
                    ...p,
                    currentStep: nextStep,
                    details: { ...p.details, inventoryUsed: usedItems }
                };
            }

            return {
                ...p,
                currentStep: nextStep,
                details: {
                    ...p.details,
                    messagingInstructions: messageToStore || p.details.messagingInstructions
                }
            };
        }));
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
