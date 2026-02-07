/**
 * @file institutions.ts
 * @description Tipos para el Módulo de Clientes Institucionales de AMIS 3.0.
 * Fuente única de verdad contractual — interconectado con Licitaciones, Clínico y Documentos.
 */

export type InstitutionType = 'publico' | 'privado' | 'mixto';
export type Criticality = 'baja' | 'media' | 'alta' | 'critica';
export type ContractStatus = 'draft' | 'active' | 'expired' | 'terminated' | 'renewing';
export type SLACategory = 'urgencia' | 'ambulatorio' | 'hospitalizado' | 'prioritario' | 'oncologico';
export type ActivityEventType = 'reunion' | 'llamada' | 'email' | 'visita' | 'incidente' | 'nota' | 'auditoria';

export interface Institution {
    id: string;
    legalName: string;
    commercialName?: string;
    rut?: string;
    address?: string;
    city?: string;
    region?: string;
    sector: string;
    institutionType: InstitutionType;
    criticality: Criticality;
    isActive: boolean;
    notes?: string;
    createdAt: string;
    updatedAt: string;
    // Computed / joined
    activeContracts?: number;
    totalContracts?: number;
    contacts?: InstitutionContact[];
    contracts?: InstitutionContract[];
}

export interface InstitutionContact {
    id: string;
    institutionId: string;
    fullName: string;
    position?: string;
    department?: string;
    email?: string;
    phone?: string;
    mobile?: string;
    isPrimary: boolean;
    hierarchyLevel: number;
    createdAt: string;
}

export interface InstitutionContract {
    id: string;
    institutionId: string;
    tenderId?: string;
    contractName: string;
    contractNumber?: string;
    startDate: string;
    endDate: string;
    status: ContractStatus;
    pricingStructure: Record<string, any>;
    coveredProcedures: string[];
    excludedProcedures: string[];
    paymentTerms?: string;
    totalValue: number;
    notes?: string;
    createdAt: string;
    updatedAt: string;
    // Computed
    slaRules?: ContractSLARule[];
    daysUntilExpiry?: number;
}

export interface ContractSLARule {
    id: string;
    contractId: string;
    category: SLACategory;
    maxHours: number;
    minHours: number;
    description?: string;
    createdAt: string;
}

export interface InstitutionActivity {
    id: string;
    institutionId: string;
    eventType: ActivityEventType;
    title: string;
    description?: string;
    eventDate: string;
    registeredBy?: string;
    attachments: { name: string; url: string }[];
    createdAt: string;
}

/** Labels en español para las categorías SLA */
export const SLA_CATEGORY_LABELS: Record<SLACategory, string> = {
    urgencia: 'Exámenes de Urgencia',
    ambulatorio: 'Ambulatorio Estándar',
    hospitalizado: 'Pacientes Hospitalizados',
    prioritario: 'Prioritarios (Contractual)',
    oncologico: 'Oncológicos / Alta Complejidad',
};

/** Labels en español para tipos de evento */
export const EVENT_TYPE_LABELS: Record<ActivityEventType, string> = {
    reunion: 'Reunión',
    llamada: 'Llamada Telefónica',
    email: 'Correo Electrónico',
    visita: 'Visita Comercial',
    incidente: 'Incidente Operacional',
    nota: 'Nota Interna',
    auditoria: 'Auditoría',
};
