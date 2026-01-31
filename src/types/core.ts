/**
 * @file core.ts
 * @description Definiciones fundamentales para el Holding Portezuelo y su ecosistema.
 * "Única Verdad Contractual" - Fuente de verdad para identidades y contratos.
 */

/**
 * Entidades que componen el Holding Portezuelo.
 */
export type HoldingCompany =
    | 'Portezuelo'
    | 'Boreal'
    | 'Amis'
    | 'Soran'
    | 'Vitalmédica'
    | 'Resomag'
    | 'Ceimavan'
    | 'Irad';

/**
 * Representación de un usuario en el sistema.
 */
export interface User {
    id: string;
    email: string;
    role: 'Admin' | 'Partner' | 'Manager' | 'Staff';
    /** Empresas a las que el usuario tiene acceso o pertenece */
    companies: HoldingCompany[];
}

/**
 * Estructura de un contrato profesional.
 */
export interface Contract {
    /** Empresa del holding que emite el contrato */
    company: HoldingCompany;
    /** Monto total o mensual del contrato */
    amount: number;
    /** Tipo de contrato (e.g., Contrato indefinido, Boleta honorarios empresa) */
    type: string;
}

/**
 * Representación de un profesional dentro del sistema.
 */
export interface Professional {
    id: string;
    name: string;
    lastName: string;
    email: string;
    nationalId: string; // RUT
    nationality: string;
    birthDate: string;
    joiningDate: string;
    phone: string;
    role: 'Médico' | 'Tecnólogo Médico' | 'Administración' | 'Ejecutivo' | 'TENS' | 'Enfermera' | 'Ingeniero' | 'Radiólogo' | 'Secretaria';
    status: 'active' | 'inhabilitado' | 'suspendido';
    registrationExpiry?: string;

    /** Datos para personal de salud */
    university?: string;
    registrationNumber?: string;
    specialty?: string;
    subSpecialty?: string;
    team?: string;
    username?: string;
    signatureType?: string;

    /** Lugar de residencia para logística de turnos */
    residence: {
        city: string;
        region: string;
        country: string;
    };
    /** Lista de competencias validadas (Matriz de Competencias) */
    competencies: string[]; // Atomic tags: "RM Próstata", "TC Coronario"
    /** Historial o contratos vigentes con el holding */
    contracts: Contract[];

    /** Módulo de Inducción y Acreditación */
    induction?: {
        enabled: boolean;
        startDate?: string;
        endDate?: string;
        hasReadAndAccepted: boolean;
        acceptedAt?: string;
        batteryId?: string;
        assignedHRManagerId?: string; // ID del encargado de RRHH
        status: 'pending' | 'in_progress' | 'completed';
    };
}

export type ProjectStatus = 'draft' | 'active' | 'on-hold' | 'completed' | 'archived';

export interface Project {
    id: string;
    name: string;
    holdingId: string;
    managerId: string;
    status: ProjectStatus;
    progress: number;
    privacyLevel: 'public' | 'private' | 'confidential';
    startDate: string;
    endDate?: string;
    tags: string[];
    tenderId?: string; // Vinculación opcional con licitaciones
}

export interface SubTask {
    id: string;
    title: string;
    completed: boolean;
}

export interface BPMTask {
    id: string;
    projectId: string;
    title: string;
    assignedTo: string; // User ID or Professional ID
    status: 'pending' | 'in-progress' | 'completed' | 'blocked';
    priority: 'low' | 'medium' | 'high' | 'critical';
    dueDate: string;
    aiSummary?: string;
    attachments?: { name: string; url: string; type: string }[];
    subtasks?: SubTask[];
    progress?: number;
}
