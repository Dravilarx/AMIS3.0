export type AgrawallLevel = 1 | 2 | 3 | 4;

export interface ClinicalAudit {
    id: string;
    patient_name: string;
    project_id: string | null;
    score: number;
    reportContent: string;
    anomalies: string[];
    compliance_details: {
        aiClassificationReason?: string;
        fileName?: string;
        patientId?: string;
        institution?: string;
        requestType?: string;
        [key: string]: any;
    };
    status: 'pending' | 'reviewed' | 'escalated' | 'completed';
    created_at: string;
    projects?: {
        name: string;
    };
}

export interface AuditMetrics {
    totalAudits: number;
    distribution: Record<AgrawallLevel, number>;
    criticalRate: number; // Level 4 %
    accuracyScore: number; // Comparison with human review if available
}
