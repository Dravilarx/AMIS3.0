export type ClinicalStep = 'Admisión' | 'Preparación' | 'Ejecución' | 'Cierre';
export type AppointmentStatus = 'scheduled' | 'requirements_pending' | 'in_progress' | 'completed' | 'cancelled';

export interface MedicalProcedure {
    id: string;
    code: string;
    name: string;
    description: string;
    basePrice: number;
    isActive: boolean;
}

export interface MedicalProfessional {
    id: string;
    name: string;
    specialty: string;
    rut: string;
}

export interface MedicalRequirement {
    id: string;
    name: string;
    description: string;
    requirementType: 'document' | 'physical' | 'other';
    isMandatory: boolean;
}

export interface RequirementBattery {
    id: string;
    name: string;
    description: string;
    requirements: MedicalRequirement[];
}

export interface ClinicalCenter {
    id: string;
    name: string;
    city: string;
    address: string;
}

export interface ClinicalAppointment {
    id: string;
    patientName: string;
    patientRut: string;
    patientEmail?: string;
    patientPhone?: string;
    patientAddress?: string;
    patientBirthDate?: string;
    healthcareProvider?: string; // Isapre, Fonasa
    referralInstitution?: string;

    procedureId: string;
    procedure?: MedicalProcedure;
    centerId: string;
    center?: ClinicalCenter;

    doctorId: string;
    doctor?: MedicalProfessional;

    appointmentDate: string;
    appointmentTime: string;

    status: AppointmentStatus;
    checkoutStatus: boolean;

    logisticsStatus: {
        transport: 'required' | 'not_required' | 'coordinated';
        perDiem: 'required' | 'not_required' | 'coordinated';
    };

    medicalBackground?: {
        usesAnticoagulants: boolean;
        usesAspirin: boolean;
        observations?: string;
    };

    documents: AppointmentDocument[];
    indications?: ClinicalIndications;
    results?: AppointmentResult[];

    createdAt: string;
    updatedAt: string;
}

export interface AppointmentDocument {
    id: string;
    appointmentId: string;
    requirementId: string;
    requirement?: MedicalRequirement;
    documentUrl?: string;
    verified: boolean;
    verifiedAt?: string;
    verifiedBy?: string;
}

export interface ClinicalIndications {
    id: string;
    procedureId: string;
    procedureName?: string;
    centerId: string;
    centerName?: string;
    emailFormat: string;
    whatsappFormat: string;
}

export interface AppointmentResult {
    id: string;
    appointmentId: string;
    documentUrl: string;
    findings: string;
    doctorId: string;
    createdAt: string;
}

// ── Workflow procedure (active instance in clinical_procedures table) ──
export interface ClinicalProcedure {
    id: string;
    patientName: string;
    examType: string;
    currentStep: ClinicalStep;
    timestamp: string;
    location: string;
    status: string;
    details: {
        admissionVerified: boolean;
        preparationChecklist: string[];
        inventoryUsed: string[];
        comments?: string;
        attachments?: string[];
        messagingInstructions?: string;
    };
}
