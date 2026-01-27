export type AgrawallLevel = 1 | 2 | 3 | 4;

export interface ClinicalAudit {
    id: string;
    patientName: string;
    examType: string;
    date: string;
    professionalId: string;
    professionalName: string;
    reportContent: string;
    agrawallScore: AgrawallLevel;
    aiClassificationReason: string;
    status: 'pending' | 'reviewed' | 'escalated';
    findings: string[];
}

export interface AuditMetrics {
    totalAudits: number;
    distribution: Record<AgrawallLevel, number>;
    criticalRate: number; // Level 4 %
    accuracyScore: number; // Comparison with human review if available
}
