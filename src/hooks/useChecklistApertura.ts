import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

// Módulo "Vital Médica": lectura de public.checklist_apertura_centros, la
// tabla que ya alimenta la app standalone de checklist (chequeovital.netlify.app).
// AMIS solo LEE (RLS: policy nueva de solo SELECT para authenticated con el
// permiso vital_medica.read); el registro se sigue creando/editando desde la
// app standalone, que usa la anon key.

// 'no_aplica' explícito en la BD; null cuando el ítem no se marcó.
export type RespuestaChecklist = 'si' | 'no' | 'no_aplica' | null;

export const PISOS = ['Piso 1', 'Piso 2', 'Piso 3', 'Piso 4', 'Piso 5'] as const;

// Lista fija = el CHECK constraint de la columna "inspector" en la BD.
export const SUPERVISORES = [
    'Carolina Briceño',
    'Diana Vásquez',
    'Alejandra Versalović',
    'Osvaldo Gutiérrez',
    'Juan Huanca',
    'Paola Madrid',
    'Vanessa Villanueva',
] as const;

export interface ChecklistApertura {
    id: string;
    fecha: string; // date 'YYYY-MM-DD'
    sucursal: string;
    inspector: string;
    horaLlegada: string | null;

    // Sección 1 — Inicio de jornada (arrays de 5 posiciones, una por piso).
    equipoPresente: RespuestaChecklist[];
    recepcionPreparada: RespuestaChecklist[];
    computadoresOperativos: RespuestaChecklist[];
    cajaHabilitada: RespuestaChecklist[];
    atencionHoraProgramada: RespuestaChecklist[];
    motivoDemora: string[];

    // Sección 2 — Presentación del equipo.
    uniformeInstitucional: RespuestaChecklist[];
    credencialVisible: RespuestaChecklist[];
    presentacionPersonal: RespuestaChecklist[];
    obsPresentacion: string[];

    // Sección 3 — Estado del centro.
    recepcionOrdenada: RespuestaChecklist[];
    salaEsperaLimpia: RespuestaChecklist[];
    boxPreparados: RespuestaChecklist[];
    senaleticaVisible: RespuestaChecklist[];
    espaciosLibres: RespuestaChecklist[];
    obsEstado: string[];

    // Sección 4 — Atención al paciente.
    primerPacienteOportuno: RespuestaChecklist[];
    tratoCordial: RespuestaChecklist[];
    orientacionEntregada: RespuestaChecklist[];
    obsAtencion: string[];

    // Sección 5 — Funcionamiento general (global, no por piso).
    probFaltaPersonal: boolean | null;
    probRetrasoAtencion: boolean | null;
    probInformatico: boolean | null;
    probFaltaInsumos: boolean | null;
    probCoordinacion: boolean | null;
    probInstalaciones: boolean | null;
    sinObservaciones: boolean | null;
    comentariosFuncionamiento: string | null;

    // Global.
    aspectosPositivos: string | null;
    oportunidadesMejora: string | null;
    observacionGeneral: string | null;

    createdAt: string | null;
    updatedAt: string | null;
}

const arr5 = (v: any): RespuestaChecklist[] => (Array.isArray(v) ? v : [null, null, null, null, null]);
const arr5Text = (v: any): string[] => (Array.isArray(v) ? v.map((x) => x || '') : ['', '', '', '', '']);

const mapRow = (r: any): ChecklistApertura => ({
    id: r.id,
    fecha: r.fecha,
    sucursal: r.sucursal,
    inspector: r.inspector,
    horaLlegada: r.hora_llegada,

    equipoPresente: arr5(r.equipo_presente),
    recepcionPreparada: arr5(r.recepcion_preparada),
    computadoresOperativos: arr5(r.computadores_operativos),
    cajaHabilitada: arr5(r.caja_habilitada),
    atencionHoraProgramada: arr5(r.atencion_hora_programada),
    motivoDemora: arr5Text(r.motivo_demora),

    uniformeInstitucional: arr5(r.uniforme_institucional),
    credencialVisible: arr5(r.credencial_visible),
    presentacionPersonal: arr5(r.presentacion_personal),
    obsPresentacion: arr5Text(r.obs_presentacion),

    recepcionOrdenada: arr5(r.recepcion_ordenada),
    salaEsperaLimpia: arr5(r.sala_espera_limpia),
    boxPreparados: arr5(r.box_preparados),
    senaleticaVisible: arr5(r.senaletica_visible),
    espaciosLibres: arr5(r.espacios_libres),
    obsEstado: arr5Text(r.obs_estado),

    primerPacienteOportuno: arr5(r.primer_paciente_oportuno),
    tratoCordial: arr5(r.trato_cordial),
    orientacionEntregada: arr5(r.orientacion_entregada),
    obsAtencion: arr5Text(r.obs_atencion),

    probFaltaPersonal: r.prob_falta_personal,
    probRetrasoAtencion: r.prob_retraso_atencion,
    probInformatico: r.prob_informatico,
    probFaltaInsumos: r.prob_falta_insumos,
    probCoordinacion: r.prob_coordinacion,
    probInstalaciones: r.prob_instalaciones,
    sinObservaciones: r.sin_observaciones,
    comentariosFuncionamiento: r.comentarios_funcionamiento,

    aspectosPositivos: r.aspectos_positivos,
    oportunidadesMejora: r.oportunidades_mejora,
    observacionGeneral: r.observacion_general,

    createdAt: r.created_at,
    updatedAt: r.updated_at,
});

export const useChecklistApertura = () => {
    const [registros, setRegistros] = useState<ChecklistApertura[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchRegistros = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const { data, error } = await supabase
                .from('checklist_apertura_centros')
                .select('*')
                .order('fecha', { ascending: false });
            if (error) throw error;
            setRegistros((data || []).map(mapRow));
        } catch (err: any) {
            console.error('Error cargando checklist de apertura:', err);
            setError(err.message || 'No se pudo cargar el checklist de apertura');
            setRegistros([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchRegistros(); }, [fetchRegistros]);

    return { registros, loading, error, refresh: fetchRegistros };
};
