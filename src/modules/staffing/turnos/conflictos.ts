// ─────────────────────────────────────────────────────────────────────────────
// Motor de conflictos de la rotativa — modelo híbrido:
//   • CONFLICTO DURO (bloquea): solapamiento de intervalos de la MISMA persona.
//   • ADVERTENCIA (permite, marca fuerte): sale de turno nocturno (fin 08:00) y
//     entra a un puesto diurno (inicio 08:00) el día siguiente, sin descanso.
//
// La función `seSolapan` es la ÚNICA FUENTE DE VERDAD del solapamiento.
// ─────────────────────────────────────────────────────────────────────────────
import type { TurnoPuesto, TurnoAsignacion } from '../../../types/turnos';

export interface ConflictoInfo {
    tipo: 'solapamiento' | 'noche_dia';
    mensaje: string;
}

export interface Intervalo {
    start: number; // minutos absolutos desde epoch (dayIndex*1440 + minuto del día)
    end: number;   // exclusivo → intervalo semiabierto [start, end)
}

const toMin = (hhmm: string): number => {
    const [h, m] = hhmm.split(':').map(Number);
    return h * 60 + m;
};

// Días absolutos desde epoch (UTC, sin DST) para comparar fechas entre sí.
const dayIndex = (fecha: string): number => {
    const [y, m, d] = fecha.split('-').map(Number);
    return Math.floor(Date.UTC(y, m - 1, d) / 86400000);
};

// Intervalo absoluto [inicio, fin) de una asignación. Si hora_fin <= hora_inicio,
// el puesto cruza medianoche y el fin cae el día siguiente (+24h).
export function intervaloPuesto(
    fecha: string,
    puesto: Pick<TurnoPuesto, 'horaInicio' | 'horaFin'>
): Intervalo {
    const base = dayIndex(fecha) * 1440;
    const ini = toMin(puesto.horaInicio);
    const finRaw = toMin(puesto.horaFin);
    const cruzaMedianoche = finRaw <= ini;
    return {
        start: base + ini,
        end: base + finRaw + (cruzaMedianoche ? 1440 : 0),
    };
}

// ÚNICA FUENTE DE VERDAD. Intervalos semiabiertos [inicio, fin): la contigüidad
// exacta (fin de uno == inicio del otro) NO cuenta como solapamiento.
export function seSolapan(a: Intervalo, b: Intervalo): boolean {
    return a.start < b.end && b.start < a.end;
}

// ── Bloqueo al asignar ───────────────────────────────────────────────────────
export interface RefCelda {
    fecha: string;
    puestoId: string;
}

// ¿Asignar `candidata` produciría un solapamiento duro contra `existentes`
// (asignaciones de la MISMA persona)? Devuelve la asignación existente que choca
// (fecha + puesto) o null. Ignora la propia celda (misma fecha + mismo puesto).
export function conflictoDuroAlAsignar(
    candidata: RefCelda,
    existentes: RefCelda[],
    puestoById: Map<string, TurnoPuesto>
): { fecha: string; puesto: TurnoPuesto } | null {
    const puestoCand = puestoById.get(candidata.puestoId);
    if (!puestoCand) return null;
    const iv = intervaloPuesto(candidata.fecha, puestoCand);
    for (const e of existentes) {
        if (e.fecha === candidata.fecha && e.puestoId === candidata.puestoId) continue;
        const pe = puestoById.get(e.puestoId);
        if (!pe) continue;
        if (seSolapan(iv, intervaloPuesto(e.fecha, pe))) {
            return { fecha: e.fecha, puesto: pe };
        }
    }
    return null;
}

// ── Detección sobre el mes completo (marcado de grilla / defensa) ────────────
export function detectarConflictosDuros(
    asignaciones: TurnoAsignacion[],
    puestos: TurnoPuesto[]
): Map<string, ConflictoInfo> {
    const puestoById = new Map(puestos.map(p => [p.id, p]));
    const result = new Map<string, ConflictoInfo>();

    const byProf = new Map<string, TurnoAsignacion[]>();
    for (const a of asignaciones) {
        const arr = byProf.get(a.professionalId) || [];
        arr.push(a);
        byProf.set(a.professionalId, arr);
    }

    for (const arr of byProf.values()) {
        for (let i = 0; i < arr.length; i++) {
            const pi = puestoById.get(arr[i].puestoId);
            if (!pi) continue;
            const ivi = intervaloPuesto(arr[i].fecha, pi);
            for (let j = i + 1; j < arr.length; j++) {
                const pj = puestoById.get(arr[j].puestoId);
                if (!pj) continue;
                if (seSolapan(ivi, intervaloPuesto(arr[j].fecha, pj))) {
                    const info: ConflictoInfo = {
                        tipo: 'solapamiento',
                        mensaje: 'Solapamiento de horarios (misma persona)',
                    };
                    if (!result.has(arr[i].id)) result.set(arr[i].id, info);
                    if (!result.has(arr[j].id)) result.set(arr[j].id, info);
                }
            }
        }
    }
    return result;
}

// ── Advertencia noche→día (se permite, se marca fuerte) ──────────────────────
export interface NocheDiaPar {
    professionalId: string;
    persona: string;      // "Apellido Nombre"
    nightPuesto: string;
    dayPuesto: string;
    fecha: string;        // fecha del turno diurno (día siguiente)
    nightAsigId: string;
    dayAsigId: string;
}

// Nocturno que cruza medianoche y termina exactamente a las 08:00.
const esNocturnoFin08 = (p: TurnoPuesto): boolean =>
    p.horaFin === '08:00' && toMin(p.horaFin) <= toMin(p.horaInicio);

// Diurno que inicia exactamente a las 08:00 (contigüidad 08:00→08:00).
const esDiurnoInicio08 = (p: TurnoPuesto): boolean => p.horaInicio === '08:00';

export function analizarNocheDia(
    asignaciones: TurnoAsignacion[],
    puestos: TurnoPuesto[]
): { porAsignacion: Map<string, ConflictoInfo>; pares: NocheDiaPar[] } {
    const puestoById = new Map(puestos.map(p => [p.id, p]));
    const porAsignacion = new Map<string, ConflictoInfo>();
    const pares: NocheDiaPar[] = [];

    const byProf = new Map<string, TurnoAsignacion[]>();
    for (const a of asignaciones) {
        const arr = byProf.get(a.professionalId) || [];
        arr.push(a);
        byProf.set(a.professionalId, arr);
    }

    const info: ConflictoInfo = {
        tipo: 'noche_dia',
        mensaje: 'Sale de turno nocturno y entra de día sin descanso',
    };

    for (const arr of byProf.values()) {
        for (let i = 0; i < arr.length; i++) {
            for (let j = 0; j < arr.length; j++) {
                if (i === j) continue;
                const noche = arr[i];
                const dia = arr[j];
                const pn = puestoById.get(noche.puestoId);
                const pd = puestoById.get(dia.puestoId);
                if (!pn || !pd) continue;
                if (
                    esNocturnoFin08(pn) &&
                    esDiurnoInicio08(pd) &&
                    dayIndex(dia.fecha) === dayIndex(noche.fecha) + 1
                ) {
                    if (!porAsignacion.has(noche.id)) porAsignacion.set(noche.id, info);
                    if (!porAsignacion.has(dia.id)) porAsignacion.set(dia.id, info);
                    pares.push({
                        professionalId: noche.professionalId,
                        persona: `${noche.professionalApellido} ${noche.professionalNombre}`.trim(),
                        nightPuesto: pn.nombre,
                        dayPuesto: pd.nombre,
                        fecha: dia.fecha,
                        nightAsigId: noche.id,
                        dayAsigId: dia.id,
                    });
                }
            }
        }
    }
    return { porAsignacion, pares };
}
