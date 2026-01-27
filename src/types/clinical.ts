export type ClinicalStep = 'Admisión' | 'Preparación' | 'Ejecución' | 'Cierre';

export interface ClinicalProcedure {
    id: string;
    patientName: string;
    examType: string;
    currentStep: ClinicalStep;
    timestamp: string;
    location: string;
    status: 'active' | 'completed' | 'cancelled';
    details: {
        admissionVerified: boolean;
        preparationChecklist: string[];
        findings?: string;
        inventoryUsed: { item: string; quantity: number }[];
        messagingInstructions?: string;
    }
}

export interface InventoryItem {
    id: string;
    name: string;
    stock: number;
    unit: string;
}
