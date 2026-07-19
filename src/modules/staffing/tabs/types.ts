import type { Professional, HoldingCompany } from '../../../types/core';

export type TabId = 'info' | 'academic' | 'contracts' | 'expediente' | 'induction' | 'hoja_vida';

export const EMPLOYMENT_RELATIONSHIPS = [
    'Contrato indefinido',
    'Contrato a plazo',
    'Boleta honorarios personales',
    'Boleta honorarios empresa',
] as const;

export const COMPANIES: HoldingCompany[] = [
    'Portezuelo', 'Boreal', 'Amis', 'Soran',
    'Vitalmédica', 'Resomag', 'Ceimavan', 'Irad',
];

export interface TabProps {
    formData:    Omit<Professional, 'id'>;
    setFormData: React.Dispatch<React.SetStateAction<Omit<Professional, 'id'>>>;
    initialData: Professional | null | undefined;
    isEditing:   boolean;
}
