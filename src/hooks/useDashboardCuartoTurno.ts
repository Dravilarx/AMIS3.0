import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';

// ─────────────────────────────────────────────────────────────────────────────
// Dashboard de KPIs del 4° Turno — SOLO LECTURA sobre las tablas ct_*.
// Privacidad (Ley 21.719): de ct_casos_criticos jamás se leen paciente ni rut;
// solo se piden los campos necesarios para conteos/sumas.
//
// Los desgloses agrupan por el VALOR REAL de la columna (no por catálogo fijo):
// si el catálogo crece, aparecen los nuevos valores sin tocar código.
// ─────────────────────────────────────────────────────────────────────────────

export interface Breakdown { valor: string; count: number }

export interface DashboardKpis {
    operativa: {
        turnos:                  number;
        recibidos:               number;
        recibidosFueraPlazo:     number;
        pctRecibidoFueraPlazo:   number;
        entregados:              number;
        entregadosFueraPlazo:    number;
        pctEntregadoFueraPlazo:  number;
        pctEstabilizados:        number;
        porTecnologo:            Breakdown[];   // turnos por tecnólogo (created_by → profiles)
    };
    personal: {
        total:               number;
        atrasoTotalMin:      number;
        porTipoIncidencia:   Breakdown[];
        porCausa:            Breakdown[];
        porSeveridad:        Breakdown[];
    };
    sla: {
        total:               number;
        minutosExcesoTotal:  number;
        porTipoDesviacion:   Breakdown[];
        porSeveridad:        Breakdown[];
    };
    criticos: {
        registrados:         number;
        fueraPlazo:          number;
        retrasoTotalMin:     number;
    };
    tecnicas: {
        total:               number;
        porEstado:           Breakdown[];
        porCategoria:        Breakdown[];
        porSeveridad:        Breakdown[];
    };
}

// Suma segura de un campo numérico (null/undefined => 0)
const sum = (rows: any[], field: string) =>
    rows.reduce((acc, r) => acc + (Number(r[field]) || 0), 0);

// Agrupa por el valor real de una columna → [{valor, count}] orden desc.
// NULL / vacío se muestra como "Sin especificar".
const groupBy = (rows: any[], field: string): Breakdown[] => {
    const map = new Map<string, number>();
    for (const r of rows) {
        const raw = r[field];
        const key = (raw == null || String(raw).trim() === '') ? 'Sin especificar' : String(raw).trim();
        map.set(key, (map.get(key) ?? 0) + 1);
    }
    return Array.from(map.entries())
        .map(([valor, count]) => ({ valor, count }))
        .sort((a, b) => b.count - a.count);
};

// Porcentaje a 1 decimal; 0 si el denominador es 0 (sin datos)
const pct = (num: number, den: number): number =>
    den > 0 ? Math.round((num / den) * 1000) / 10 : 0;

const EMPTY: DashboardKpis = {
    operativa: { turnos: 0, recibidos: 0, recibidosFueraPlazo: 0, pctRecibidoFueraPlazo: 0, entregados: 0, entregadosFueraPlazo: 0, pctEntregadoFueraPlazo: 0, pctEstabilizados: 0, porTecnologo: [] },
    personal:  { total: 0, atrasoTotalMin: 0, porTipoIncidencia: [], porCausa: [], porSeveridad: [] },
    sla:       { total: 0, minutosExcesoTotal: 0, porTipoDesviacion: [], porSeveridad: [] },
    criticos:  { registrados: 0, fueraPlazo: 0, retrasoTotalMin: 0 },
    tecnicas:  { total: 0, porEstado: [], porCategoria: [], porSeveridad: [] },
};

export interface TurnoHistRow {
    id: string; fecha: string; tipoTurno: string;
    horaInicio?: string; horaFin?: string;
    createdBy?: string; recibidos?: number; entregados?: number; estado?: string;
}

export const useDashboardCuartoTurno = ({ desde, hasta }: { desde: string; hasta: string }) => {
    const [kpis, setKpis]       = useState<DashboardKpis>(EMPTY);
    const [loading, setLoading] = useState(true);
    const [error, setError]     = useState<string | null>(null);
    const [turnosList, setTurnosList] = useState<TurnoHistRow[]>([]);
    const [tecnologos, setTecnologos] = useState<Record<string, string>>({});

    const recalcular = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const rango = (q: any) => q.gte('fecha', desde).lte('fecha', hasta);

            const [turnosRes, personalRes, slaRes, criticosRes, tecnicasRes, profilesRes] = await Promise.all([
                rango(supabase.from('ct_turnos').select('id, fecha, tipo_turno, hora_inicio, hora_fin, estado, recibidos, recibidos_fueraplazo, entregados, entregados_fueraplazo, estabilizado, created_by')),
                rango(supabase.from('ct_incid_personal').select('tipo_incidencia, minutos_atraso, causa, severidad')),
                rango(supabase.from('ct_incid_sla').select('tipo_desviacion, minutos_exceso, severidad')),
                // PRIVACIDAD: NO se piden paciente ni rut
                rango(supabase.from('ct_casos_criticos').select('fuera_plazo, minutos_retraso')),
                rango(supabase.from('ct_incid_tecnicas').select('estado, categoria_tecnica, severidad')),
                supabase.from('profiles_publicos').select('id, full_name'),
            ]);

            const firstErr = turnosRes.error || personalRes.error || slaRes.error || criticosRes.error || tecnicasRes.error;
            if (firstErr) console.error('[DashboardCuartoTurno] Error:', firstErr);

            const turnos   = turnosRes.data   || [];
            const personal = personalRes.data || [];
            const sla      = slaRes.data      || [];
            const criticos = criticosRes.data || [];
            const tecnicas = tecnicasRes.data || [];

            // 1) Carga operativa
            const recibidos            = sum(turnos, 'recibidos');
            const recibidosFueraPlazo  = sum(turnos, 'recibidos_fueraplazo');
            const entregados           = sum(turnos, 'entregados');
            const entregadosFueraPlazo = sum(turnos, 'entregados_fueraplazo');
            const turnosCount          = turnos.length;
            const estabilizados        = turnos.filter((t: any) => t.estabilizado === true).length;

            // Turnos por tecnólogo: cruza created_by con profiles_publicos (solo nombre)
            const profMap = new Map<string, string>();
            for (const p of (profilesRes.data || []) as any[]) profMap.set(p.id, p.full_name || p.id);
            const tecnoCount = new Map<string, number>();
            for (const t of turnos as any[]) {
                const nombre = t.created_by ? (profMap.get(t.created_by) || 'Desconocido') : 'Sin asignar';
                tecnoCount.set(nombre, (tecnoCount.get(nombre) ?? 0) + 1);
            }
            const porTecnologo: Breakdown[] = Array.from(tecnoCount.entries())
                .map(([valor, count]) => ({ valor, count }))
                .sort((a, b) => b.count - a.count);

            // Lista de turnos (para el historial clicable) + mapa de tecnólogos
            setTecnologos(Object.fromEntries(profMap));
            setTurnosList((turnos as any[]).map((t) => ({
                id: t.id, fecha: t.fecha, tipoTurno: t.tipo_turno,
                horaInicio: t.hora_inicio, horaFin: t.hora_fin, estado: t.estado,
                recibidos: t.recibidos, entregados: t.entregados, createdBy: t.created_by,
            })));

            setKpis({
                operativa: {
                    turnos:                 turnosCount,
                    recibidos,
                    recibidosFueraPlazo,
                    pctRecibidoFueraPlazo:  pct(recibidosFueraPlazo, recibidos),
                    entregados,
                    entregadosFueraPlazo,
                    pctEntregadoFueraPlazo: pct(entregadosFueraPlazo, entregados),
                    pctEstabilizados:       pct(estabilizados, turnosCount),
                    porTecnologo,
                },
                personal: {
                    total:             personal.length,
                    atrasoTotalMin:    sum(personal, 'minutos_atraso'),
                    porTipoIncidencia: groupBy(personal, 'tipo_incidencia'),
                    porCausa:          groupBy(personal, 'causa'),
                    porSeveridad:      groupBy(personal, 'severidad'),
                },
                sla: {
                    total:              sla.length,
                    minutosExcesoTotal: sum(sla, 'minutos_exceso'),
                    porTipoDesviacion:  groupBy(sla, 'tipo_desviacion'),
                    porSeveridad:       groupBy(sla, 'severidad'),
                },
                criticos: {
                    registrados:     criticos.length,
                    fueraPlazo:      criticos.filter((c: any) => c.fuera_plazo === true).length,
                    retrasoTotalMin: sum(criticos, 'minutos_retraso'),
                },
                tecnicas: {
                    total:        tecnicas.length,
                    porEstado:    groupBy(tecnicas, 'estado'),
                    porCategoria: groupBy(tecnicas, 'categoria_tecnica'),
                    porSeveridad: groupBy(tecnicas, 'severidad'),
                },
            });
        } catch (err: any) {
            console.error('[DashboardCuartoTurno] Error inesperado:', err);
            setError(err.message || 'Error al calcular KPIs');
            setKpis(EMPTY);
        } finally {
            setLoading(false);
        }
    }, [desde, hasta]);

    useEffect(() => { recalcular(); }, []); // carga inicial (últimos 7 días)

    return { kpis, loading, error, recalcular, turnos: turnosList, tecnologos };
};
