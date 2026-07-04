// ─────────────────────────────────────────────────────────────────────────────
// Utilidades de fecha para la rotativa (semana inicia lunes, en español).
// Todo el manejo es "local naive" (YYYY-MM-DD) para evitar saltos por zona horaria.
// ─────────────────────────────────────────────────────────────────────────────

export const MESES = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

// getDay(): 0=Dom .. 6=Sáb
const DIAS_CORTO = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const DIAS_LARGO = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

export const pad2 = (n: number): string => String(n).padStart(2, '0');

export const toISO = (anio: number, mes: number, dia: number): string =>
    `${anio}-${pad2(mes)}-${pad2(dia)}`;

export interface DiaRotativa {
    fecha: string;       // 'YYYY-MM-DD'
    dia: number;         // 1..31
    dow: number;         // 0=Dom..6=Sáb
    cortoLabel: string;  // 'Lun 03'
    largoLabel: string;  // 'Lunes'
    finDeSemana: boolean;
    semana: number;      // número de semana dentro del mes (1-based, inicia lunes)
}

// Días del mes con metadatos y numeración de semana (semana inicia lunes).
export function diasDelMes(anio: number, mes: number): DiaRotativa[] {
    const lastDay = new Date(anio, mes, 0).getDate(); // mes es 1-based → día 0 del siguiente
    const out: DiaRotativa[] = [];
    let semana = 1;
    for (let d = 1; d <= lastDay; d++) {
        const date = new Date(anio, mes - 1, d);
        const dow = date.getDay();
        if (d > 1 && dow === 1) semana++; // nuevo lunes → nueva semana
        out.push({
            fecha: toISO(anio, mes, d),
            dia: d,
            dow,
            cortoLabel: `${DIAS_CORTO[dow]} ${pad2(d)}`,
            largoLabel: DIAS_LARGO[dow],
            finDeSemana: dow === 0 || dow === 6,
            semana,
        });
    }
    return out;
}

// Las 7 fechas (lunes→domingo) de la semana que contiene `fecha`.
export function semanaDe(fecha: string): string[] {
    const [y, m, d] = fecha.split('-').map(Number);
    const base = new Date(y, m - 1, d);
    const dow = base.getDay();             // 0=Dom..6=Sáb
    const offsetALunes = dow === 0 ? -6 : 1 - dow; // llevar hasta el lunes
    const lunes = new Date(y, m - 1, d + offsetALunes);
    const out: string[] = [];
    for (let i = 0; i < 7; i++) {
        const dt = new Date(lunes.getFullYear(), lunes.getMonth(), lunes.getDate() + i);
        out.push(toISO(dt.getFullYear(), dt.getMonth() + 1, dt.getDate()));
    }
    return out;
}

// Mapa (semana, dow) ↔ fecha para trasladar asignaciones entre meses por
// día-de-semana equivalente (lunes semana 1 → lunes semana 1).
export function weekKeyMaps(anio: number, mes: number): {
    dateToKey: Map<string, string>;
    keyToDate: Map<string, string>;
} {
    const dias = diasDelMes(anio, mes);
    const dateToKey = new Map<string, string>();
    const keyToDate = new Map<string, string>();
    for (const d of dias) {
        const key = `${d.semana}-${d.dow}`;
        dateToKey.set(d.fecha, key);
        keyToDate.set(key, d.fecha);
    }
    return { dateToKey, keyToDate };
}

// Navegación de mes anterior / siguiente
export function mesAnterior(anio: number, mes: number): { anio: number; mes: number } {
    return mes === 1 ? { anio: anio - 1, mes: 12 } : { anio, mes: mes - 1 };
}
export function mesSiguiente(anio: number, mes: number): { anio: number; mes: number } {
    return mes === 12 ? { anio: anio + 1, mes: 1 } : { anio, mes: mes + 1 };
}
