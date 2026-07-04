import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { TurnoPuesto, TurnoAsignacion, TurnoMes } from '../types/turnos';
import { toISO, pad2, semanaDe, weekKeyMaps, mesAnterior } from '../modules/staffing/turnos/fechas';
import { intervaloPuesto, seSolapan, conflictoDuroAlAsignar, type RefCelda } from '../modules/staffing/turnos/conflictos';

const hhmm = (t?: string) => (t || '00:00').substring(0, 5);

// Asignación omitida por solapamiento (para el resumen de rellenar/copiar).
export interface Omitida {
    fecha: string;
    puestoNombre: string;
    professionalId: string;
    chocaCon: { fecha: string; puestoNombre: string };
}

// Suma días a una fecha 'YYYY-MM-DD' (manejo local, sin zona horaria).
const sumarDias = (fecha: string, n: number): string => {
    const [y, m, d] = fecha.split('-').map(Number);
    const dt = new Date(y, m - 1, d + n);
    return toISO(dt.getFullYear(), dt.getMonth() + 1, dt.getDate());
};

export const useRotativaTurnos = (anio: number, mes: number) => {
    const [puestos, setPuestos] = useState<TurnoPuesto[]>([]);
    const [asignaciones, setAsignaciones] = useState<TurnoAsignacion[]>([]);
    const [mesInfo, setMesInfo] = useState<TurnoMes | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const rangoMes = useCallback((a: number, m: number) => {
        const lastDay = new Date(a, m, 0).getDate();
        return { desde: toISO(a, m, 1), hasta: toISO(a, m, lastDay) };
    }, []);

    const mapAsignacion = (r: any): TurnoAsignacion => ({
        id: r.id,
        fecha: r.fecha,
        puestoId: r.puesto_id,
        professionalId: r.professional_id,
        professionalNombre: r.professional?.name || '',
        professionalApellido: r.professional?.last_name || '',
    });

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const { desde, hasta } = rangoMes(anio, mes);

            const [puestosRes, asigRes, mesRes] = await Promise.all([
                supabase.from('turno_puestos').select('*').eq('activo', true).order('orden'),
                supabase
                    .from('turno_asignaciones')
                    .select('id, fecha, puesto_id, professional_id, professional:professionals(name, last_name)')
                    .gte('fecha', desde)
                    .lte('fecha', hasta),
                supabase.from('turno_meses').select('*').eq('anio', anio).eq('mes', mes).maybeSingle(),
            ]);

            if (puestosRes.error) throw puestosRes.error;
            if (asigRes.error) throw asigRes.error;
            if (mesRes.error) throw mesRes.error;

            setPuestos((puestosRes.data || []).map((p: any) => ({
                id: p.id,
                nombre: p.nombre,
                horaInicio: hhmm(p.hora_inicio),
                horaFin: hhmm(p.hora_fin),
                obligatorio: p.obligatorio,
                orden: p.orden,
                activo: p.activo,
            })));

            setAsignaciones((asigRes.data || []).map(mapAsignacion));

            setMesInfo(mesRes.data ? {
                id: mesRes.data.id,
                anio: mesRes.data.anio,
                mes: mesRes.data.mes,
                estado: mesRes.data.estado,
                publicadoAt: mesRes.data.publicado_at,
                publicadoPor: mesRes.data.publicado_por,
            } : null);
        } catch (err: any) {
            console.error('Error cargando rotativa:', err);
            setError(err.message || 'Error cargando la rotativa');
        } finally {
            setLoading(false);
        }
    }, [anio, mes, rangoMes]);

    useEffect(() => { fetchData(); }, [fetchData]);

    // Crea la fila del mes en 'borrador' si aún no existe (no revierte 'publicado').
    const ensureMesRow = async () => {
        await supabase
            .from('turno_meses')
            .upsert({ anio, mes, estado: 'borrador' }, { onConflict: 'anio,mes', ignoreDuplicates: true });
    };

    const uid = async (): Promise<string | null> => {
        const { data: { user } } = await supabase.auth.getUser();
        return user?.id ?? null;
    };

    const puestoByIdActual = () => new Map(puestos.map(p => [p.id, p]));

    // Defensa en profundidad: valida contra el estado REMOTO (por si dos usuarios
    // editan a la vez, o por cruce de medianoche en el borde del mes). Consulta la
    // ventana [fecha-1, fecha+1] del profesional. Devuelve la asignación que choca.
    const validarSolapeRemoto = async (
        professionalId: string,
        fecha: string,
        puestoId: string
    ): Promise<{ fecha: string; nombre: string } | null> => {
        const puestoCand = puestos.find(p => p.id === puestoId);
        if (!puestoCand) return null;
        const { data, error: qErr } = await supabase
            .from('turno_asignaciones')
            .select('fecha, puesto_id, puesto:turno_puestos(nombre, hora_inicio, hora_fin)')
            .eq('professional_id', professionalId)
            .gte('fecha', sumarDias(fecha, -1))
            .lte('fecha', sumarDias(fecha, 1));
        if (qErr) throw qErr;

        const iv = intervaloPuesto(fecha, puestoCand);
        for (const r of (data as any[]) || []) {
            if (r.fecha === fecha && r.puesto_id === puestoId) continue;
            if (!r.puesto) continue;
            const pe = { horaInicio: hhmm(r.puesto.hora_inicio), horaFin: hhmm(r.puesto.hora_fin) };
            if (seSolapan(iv, intervaloPuesto(r.fecha, pe))) {
                return { fecha: r.fecha, nombre: r.puesto.nombre };
            }
        }
        return null;
    };

    // Asignar un profesional a una celda (fecha, puesto). Bloquea si solapa.
    const asignar = async (fecha: string, puestoId: string, professionalId: string) => {
        try {
            const choca = await validarSolapeRemoto(professionalId, fecha, puestoId);
            if (choca) {
                return { success: false, error: `Solapamiento: la persona ya tiene "${choca.nombre}" el ${choca.fecha}.` };
            }
            await ensureMesRow();
            const creadoPor = await uid();
            const { error: insErr } = await supabase
                .from('turno_asignaciones')
                .upsert(
                    { fecha, puesto_id: puestoId, professional_id: professionalId, creado_por: creadoPor },
                    { onConflict: 'fecha,puesto_id,professional_id', ignoreDuplicates: true }
                );
            if (insErr) throw insErr;
            await fetchData();
            return { success: true };
        } catch (err: any) {
            console.error('Error asignando turno:', err);
            return { success: false, error: err.message };
        }
    };

    const quitar = async (asignacionId: string) => {
        try {
            const { error: delErr } = await supabase.from('turno_asignaciones').delete().eq('id', asignacionId);
            if (delErr) throw delErr;
            await fetchData();
            return { success: true };
        } catch (err: any) {
            console.error('Error quitando turno:', err);
            return { success: false, error: err.message };
        }
    };

    // Copia un profesional al mismo puesto en los 7 días (lun→dom) de la semana.
    // Omite los días que producirían solapamiento duro y los reporta.
    const rellenarSemana = async (fecha: string, puestoId: string, professionalId: string) => {
        try {
            const puestoById = puestoByIdActual();
            const puestoNombre = puestoById.get(puestoId)?.nombre || '';
            const creadoPor = await uid();

            // Existentes del profesional en el mes cargado
            const existentes: RefCelda[] = asignaciones
                .filter(a => a.professionalId === professionalId)
                .map(a => ({ fecha: a.fecha, puestoId: a.puestoId }));

            const rows: any[] = [];
            const omitidas: Omitida[] = [];
            for (const f of semanaDe(fecha)) {
                const cand: RefCelda = { fecha: f, puestoId };
                const choca = conflictoDuroAlAsignar(cand, existentes, puestoById);
                if (choca) {
                    omitidas.push({ fecha: f, puestoNombre, professionalId, chocaCon: { fecha: choca.fecha, puestoNombre: choca.puesto.nombre } });
                    continue;
                }
                rows.push({ fecha: f, puesto_id: puestoId, professional_id: professionalId, creado_por: creadoPor });
                existentes.push(cand); // acumular para chequear los días siguientes
            }

            if (rows.length > 0) {
                await ensureMesRow();
                const { error: insErr } = await supabase
                    .from('turno_asignaciones')
                    .upsert(rows, { onConflict: 'fecha,puesto_id,professional_id', ignoreDuplicates: true });
                if (insErr) throw insErr;
                await fetchData();
            }
            return { success: true, omitidas };
        } catch (err: any) {
            console.error('Error rellenando semana:', err);
            return { success: false, error: err.message, omitidas: [] as Omitida[] };
        }
    };

    // Duplica todas las asignaciones del mes previo ajustando por día-de-semana
    // equivalente. Omite las que producirían solapamiento duro y las reporta.
    const copiarMesAnterior = async () => {
        try {
            const prev = mesAnterior(anio, mes);
            const { desde, hasta } = rangoMes(prev.anio, prev.mes);
            const { data: prevAsig, error: prevErr } = await supabase
                .from('turno_asignaciones')
                .select('fecha, puesto_id, professional_id')
                .gte('fecha', desde)
                .lte('fecha', hasta);
            if (prevErr) throw prevErr;
            if (!prevAsig || prevAsig.length === 0) {
                return { success: false, error: 'El mes anterior no tiene asignaciones para copiar', omitidas: [] as Omitida[] };
            }

            const prevMaps = weekKeyMaps(prev.anio, prev.mes);
            const destMaps = weekKeyMaps(anio, mes);
            const puestoById = puestoByIdActual();
            const creadoPor = await uid();

            // Candidatas trasladadas al mes destino
            const candidatas: { fecha: string; puestoId: string; professionalId: string }[] = [];
            for (const a of prevAsig) {
                const key = prevMaps.dateToKey.get(a.fecha);
                if (!key) continue;
                const destFecha = destMaps.keyToDate.get(key);
                if (!destFecha) continue; // sin día equivalente (p. ej. 5ª semana desbordada)
                candidatas.push({ fecha: destFecha, puestoId: a.puesto_id, professionalId: a.professional_id });
            }
            if (candidatas.length === 0) {
                return { success: false, error: 'No hubo días equivalentes para copiar', omitidas: [] as Omitida[] };
            }

            // Filtrar solapamientos, acumulando por profesional. Parte del estado
            // actual del mes (normalmente vacío, precondición de la acción).
            const accPorProf = new Map<string, RefCelda[]>();
            for (const a of asignaciones) {
                const arr = accPorProf.get(a.professionalId) || [];
                arr.push({ fecha: a.fecha, puestoId: a.puestoId });
                accPorProf.set(a.professionalId, arr);
            }

            const rows: any[] = [];
            const omitidas: Omitida[] = [];
            // Orden estable por fecha para que el resumen sea legible
            candidatas.sort((x, y) => (x.fecha < y.fecha ? -1 : x.fecha > y.fecha ? 1 : 0));
            for (const c of candidatas) {
                const existentes = accPorProf.get(c.professionalId) || [];
                const choca = conflictoDuroAlAsignar({ fecha: c.fecha, puestoId: c.puestoId }, existentes, puestoById);
                if (choca) {
                    omitidas.push({
                        fecha: c.fecha,
                        puestoNombre: puestoById.get(c.puestoId)?.nombre || '',
                        professionalId: c.professionalId,
                        chocaCon: { fecha: choca.fecha, puestoNombre: choca.puesto.nombre },
                    });
                    continue;
                }
                rows.push({ fecha: c.fecha, puesto_id: c.puestoId, professional_id: c.professionalId, creado_por: creadoPor });
                existentes.push({ fecha: c.fecha, puestoId: c.puestoId });
                accPorProf.set(c.professionalId, existentes);
            }

            if (rows.length > 0) {
                await ensureMesRow();
                const { error: insErr } = await supabase
                    .from('turno_asignaciones')
                    .upsert(rows, { onConflict: 'fecha,puesto_id,professional_id', ignoreDuplicates: true });
                if (insErr) throw insErr;
                await fetchData();
            }
            return { success: true, copiadas: rows.length, omitidas };
        } catch (err: any) {
            console.error('Error copiando mes anterior:', err);
            return { success: false, error: err.message, omitidas: [] as Omitida[] };
        }
    };

    const publicarMes = async () => {
        try {
            const publicadoPor = await uid();
            const { error: pubErr } = await supabase
                .from('turno_meses')
                .upsert(
                    { anio, mes, estado: 'publicado', publicado_at: new Date().toISOString(), publicado_por: publicadoPor },
                    { onConflict: 'anio,mes' }
                );
            if (pubErr) throw pubErr;
            await fetchData();
            return { success: true };
        } catch (err: any) {
            console.error('Error publicando mes:', err);
            return { success: false, error: err.message };
        }
    };

    return {
        puestos,
        asignaciones,
        mesInfo,
        loading,
        error,
        asignar,
        quitar,
        rellenarSemana,
        copiarMesAnterior,
        publicarMes,
        refresh: fetchData,
    };
};

// Helper de conveniencia: ¿el mes destino está vacío? (para habilitar "copiar mes anterior")
export const mesEstaVacio = (asignaciones: TurnoAsignacion[]) => asignaciones.length === 0;

// Etiqueta 'YYYY-MM' del mes previo (por si se necesita en UI)
export const claveMesAnterior = (anio: number, mes: number) => {
    const p = mesAnterior(anio, mes);
    return `${p.anio}-${pad2(p.mes)}`;
};
