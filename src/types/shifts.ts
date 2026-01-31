export type ShiftStatus = 'programado' | 'presente' | 'ausente' | 'tarde' | 'finalizado';

export interface Shift {
    id: string;
    professionalId: string;
    professionalName: string;
    date: string;
    startTime: string; // HH:mm
    endTime: string;   // HH:mm
    location: string;
    sedeCity: string;
    status: ShiftStatus;
    checkIn?: string;
    checkOut?: string;
    geofenceValid?: boolean;
    is_deleted?: boolean;
}

export interface AttendanceAnalytics {
    totalShifts: number;
    punctualityRate: number;
    absenteeismRate: number;
    coveragePercentage: number;
}
