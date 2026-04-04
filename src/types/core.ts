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
 * Roles clínicos RBAC. Determina capacidades de firma y visibilidad pública.
 * - MED_STAFF: Radiólogo pleno. Firma y su nombre es público.
 * - MED_CHIEF: Médico Jefe. Firma propio y co-firma. Nombre público.
 * - MED_RESIDENT: Residente/becado. NO firma. Su nombre NUNCA aparece en documentos externos.
 * - MED_REQUIRES_COSIGN: Médico nuevo que requiere segunda firma. Mismo tratamiento que residente.
 * - ADMIN_SECRETARY: Secretaría/Triage. Sin firma médica.
 * - TECH_SUPPORT: Solo logs, PHI enmascarado.
 * - COORDINATOR: Coordinación operativa.
 */
export type ClinicalRole =
  | 'MED_STAFF'
  | 'MED_CHIEF'
  | 'MED_RESIDENT'
  | 'MED_REQUIRES_COSIGN'
  | 'ADMIN_SECRETARY'
  | 'TECH_SUPPORT'
  | 'COORDINATOR';

/** Roles que NUNCA pueden aparecer en documentos públicos o PDFs */
export const HIDDEN_CLINICAL_ROLES: ClinicalRole[] = ['MED_RESIDENT', 'MED_REQUIRES_COSIGN'];

/** Roles con capacidad de firma autónoma */
export const AUTONOMOUS_SIGNER_ROLES: ClinicalRole[] = ['MED_STAFF', 'MED_CHIEF'];

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
    isActive: boolean;
    registrationExpiry?: string;
    photoUrl?: string; // Foto de perfil del profesional
    infoStatus?: 'complete' | 'incomplete' | 'pending';
    isVerified?: boolean;

    /** Datos para personal de salud */
    university?: string;
    registrationNumber?: string;
    specialty?: string;
    subSpecialty?: string;
    team?: string;
    username?: string;
    signatureType?: 'autonoma' | 'segunda_firma' | 'ninguna'; // Tipo de capacidad de firma
    associatedWith?: string; // Radiology partner/group association

    /** 
     * RBAC Clínico - Controla visibilidad pública y capacidad de firma.
     * Persiste en professionals.clinical_role.
     */
    clinicalRole?: ClinicalRole;

    /**
     * UUID del supervisor validador directo.
     * Solo relevante para MED_RESIDENT y MED_REQUIRES_COSIGN.
     * Su nombre reemplaza al residente en PDFs y listados externos.
     */
    supervisorId?: string;

    /**
     * Si false: el nombre de este profesional NUNCA aparece en PDFs ni listados B2B.
     * Se determina automáticamente por el clinicalRole.
     */
    publicNameAllowed?: boolean;

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

    /** Metadatos URMA */
    is_deleted?: boolean;
    archived_at?: string;
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
    is_deleted?: boolean;
    archived_at?: string;
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
    involvedIds?: string[]; // Team members involved in the task
    status: 'pending' | 'in-progress' | 'completed' | 'blocked';
    priority: 'low' | 'medium' | 'high' | 'critical';
    dueDate: string;
    aiSummary?: string;
    attachments?: { name: string; url: string; type: string }[];
    subtasks?: SubTask[];
    progress?: number;
    is_deleted?: boolean;
    archived_at?: string;
}
