// ─────────────────────────────────────────────────────────────────────────────
// Tipos del módulo "Turnos Médicos" — rotativa mensual de turnos.
// ─────────────────────────────────────────────────────────────────────────────

export interface TurnoPuesto {
    id: string;
    nombre: string;
    horaInicio: string; // 'HH:MM'
    horaFin: string;    // 'HH:MM' (si <= horaInicio, el turno cruza medianoche)
    obligatorio: boolean;
    orden: number;
    activo: boolean;
}

export interface TurnoAsignacion {
    id: string;
    fecha: string;      // 'YYYY-MM-DD'
    puestoId: string;
    professionalId: string;
    professionalNombre: string;
    professionalApellido: string;
}

export type EstadoMes = 'borrador' | 'publicado';

export interface TurnoMes {
    id: string;
    anio: number;
    mes: number; // 1-12
    estado: EstadoMes;
    publicadoAt?: string | null;
    publicadoPor?: string | null;
}
