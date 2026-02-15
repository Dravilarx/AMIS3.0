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
export type InstitutionCategory = 'clinica' | 'hospital' | 'municipalidad' | 'servicio_salud' | 'sar' | 'centro_medico' | 'laboratorio' | 'clinica_dental' | 'centro_imagen' | 'mutual' | 'isapre' | 'fonasa' | 'otro';

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
    institutionCategory: InstitutionCategory;
    institutionCode?: string;
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

/** Categorías institucionales con prefijo de código */
export const INSTITUTION_CATEGORIES: { value: InstitutionCategory; label: string; prefix: string; icon: string }[] = [
    { value: 'clinica', label: 'Clínica', prefix: 'CLI', icon: '🏥' },
    { value: 'hospital', label: 'Hospital', prefix: 'HOS', icon: '🏨' },
    { value: 'centro_medico', label: 'Centro Médico', prefix: 'CME', icon: '⚕️' },
    { value: 'centro_imagen', label: 'Centro de Imágenes', prefix: 'CIM', icon: '📡' },
    { value: 'laboratorio', label: 'Laboratorio', prefix: 'LAB', icon: '🔬' },
    { value: 'clinica_dental', label: 'Clínica Dental', prefix: 'CDN', icon: '🦷' },
    { value: 'municipalidad', label: 'Municipalidad', prefix: 'MUN', icon: '🏛️' },
    { value: 'servicio_salud', label: 'Servicio de Salud', prefix: 'SSA', icon: '🏢' },
    { value: 'sar', label: 'SAR', prefix: 'SAR', icon: '🚑' },
    { value: 'mutual', label: 'Mutual de Seguridad', prefix: 'MUT', icon: '🛡️' },
    { value: 'isapre', label: 'Isapre', prefix: 'ISA', icon: '💳' },
    { value: 'fonasa', label: 'Fonasa', prefix: 'FON', icon: '🏦' },
    { value: 'otro', label: 'Otro', prefix: 'OTR', icon: '📋' },
];
