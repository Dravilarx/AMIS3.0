import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface Catalogo {
    id:       string;
    tipo:     string;
    valor:    string;
    etiqueta: string;
    orden:    number;
    activo:   boolean;
}

export interface Turno {
    id:                    string;
    fecha:                 string;
    tipoTurno:             string;
    horaInicio?:           string;
    horaFin?:              string;
    estabilizado:          boolean;
    horaEstabilizacion?:   string;
    apoyoMedicoExtra:      boolean;
    recibidos?:            number;
    recibidosFueraPlazo?:  number;
    recibidosPendientes?:  number;
    entregados?:           number;
    entregadosFueraPlazo?: number;
    entregadosPendientes?: number;
    observaciones?:        string;
    createdBy?:            string;
    createdAt:             string;
}

export interface IncidenciaTecnica {
    id:                string;
    fecha?:            string;
    categoriaTecnica?: string;
    centroAfectado?:   string;
    sistema?:          string;
    estado?:           string;
    severidad?:        string;
    detalle?:          string;
    accionTomada?:     string;
    createdBy?:        string;
    createdAt:         string;
}

export interface CasoCritico {
    id:                  string;
    idTurno?:            string;
    fecha?:              string;
    institucion?:        string;
    modalidad?:          string;
    idEstudio?:          string;
    paciente?:           string;
    rut?:                string;
    fueraPlazo:          boolean;
    minutosRetraso?:     number;
    medicoResponsable?:  string;
    detalle?:            string;
    createdBy?:          string;
    createdAt:           string;
}

export interface SlaDesviacion {
    id:              string;
    idTurno?:        string;
    fecha?:          string;
    medico?:         string;
    tipoDesviacion?: string;
    modalidad?:      string;
    minutosExceso?:  number;
    severidad?:      string;
    detalle?:        string;
    createdBy?:      string;
    createdAt:       string;
}

export interface Incidencia {
    id:              string;
    idTurno?:        string;
    fecha?:          string;
    medico?:         string;
    bloqueHorario?:  string;
    tipoIncidencia?: string;
    minutosAtraso?:  number;
    causa?:          string;
    severidad?:      string;
    detalle?:        string;
    createdBy?:      string;
    createdAt:       string;
}

const mapTurno = (r: any): Turno => ({
    id:                    r.id,
    fecha:                 r.fecha,
    tipoTurno:             r.tipo_turno,
    horaInicio:            r.hora_inicio,
    horaFin:               r.hora_fin,
    estabilizado:          r.estabilizado,
    horaEstabilizacion:    r.hora_estabilizacion,
    apoyoMedicoExtra:      r.apoyo_medico_extra,
    recibidos:             r.recibidos,
    recibidosFueraPlazo:   r.recibidos_fueraplazo,
    recibidosPendientes:   r.recibidos_pendientes,
    entregados:            r.entregados,
    entregadosFueraPlazo:  r.entregados_fueraplazo,
    entregadosPendientes:  r.entregados_pendientes,
    observaciones:         r.observaciones,
    createdBy:             r.created_by,
    createdAt:             r.created_at,
});

const mapIncidenciaTecnica = (r: any): IncidenciaTecnica => ({
    id:               r.id,
    fecha:            r.fecha,
    categoriaTecnica: r.categoria_tecnica,
    centroAfectado:   r.centro_afectado,
    sistema:          r.sistema,
    estado:           r.estado,
    severidad:        r.severidad,
    detalle:          r.detalle,
    accionTomada:     r.accion_tomada,
    createdBy:        r.created_by,
    createdAt:        r.created_at,
});

const mapCasoCritico = (r: any): CasoCritico => ({
    id:                 r.id,
    idTurno:            r.id_turno,
    fecha:              r.fecha,
    institucion:        r.institucion,
    modalidad:          r.modalidad,
    idEstudio:          r.id_estudio,
    paciente:           r.paciente,
    rut:                r.rut,
    fueraPlazo:         r.fuera_plazo ?? false,
    minutosRetraso:     r.minutos_retraso,
    medicoResponsable:  r.medico_responsable,
    detalle:            r.detalle,
    createdBy:          r.created_by,
    createdAt:          r.created_at,
});

const mapSlaDesviacion = (r: any): SlaDesviacion => ({
    id:              r.id,
    idTurno:         r.id_turno,
    fecha:           r.fecha,
    medico:          r.medico,
    tipoDesviacion:  r.tipo_desviacion,
    modalidad:       r.modalidad,
    minutosExceso:   r.minutos_exceso,
    severidad:       r.severidad,
    detalle:         r.detalle,
    createdBy:       r.created_by,
    createdAt:       r.created_at,
});

const mapIncidencia = (r: any): Incidencia => ({
    id:              r.id,
    idTurno:         r.id_turno,
    fecha:           r.fecha,
    medico:          r.medico,
    bloqueHorario:   r.bloque_horario,
    tipoIncidencia:  r.tipo_incidencia,
    minutosAtraso:   r.minutos_atraso,
    causa:           r.causa,
    severidad:       r.severidad,
    detalle:         r.detalle,
    createdBy:       r.created_by,
    createdAt:       r.created_at,
});

export const useCuartoTurno = () => {
    const [turnos,          setTurnos]          = useState<Turno[]>([]);
    const [incidencias,     setIncidencias]      = useState<Incidencia[]>([]);
    const [catalogos,       setCatalogos]        = useState<Catalogo[]>([]);
    const [tiposIncidencia, setTiposIncidencia]  = useState<Catalogo[]>([]);
    const [causas,          setCausas]           = useState<Catalogo[]>([]);
    const [severidades,     setSeveridades]      = useState<Catalogo[]>([]);
    const [slaDesviaciones, setSlaDesviaciones]  = useState<SlaDesviacion[]>([]);
    const [tiposDesviacion, setTiposDesviacion]  = useState<Catalogo[]>([]);
    const [modalidades,     setModalidades]      = useState<Catalogo[]>([]);
    const [loading,         setLoading]          = useState(true);
    const [loadingIncid,    setLoadingIncid]     = useState(true);
    const [loadingSla,      setLoadingSla]       = useState(true);
    const [casosCriticos,   setCasosCriticos]    = useState<CasoCritico[]>([]);
    const [loadingCasos,        setLoadingCasos]        = useState(true);
    const [incidTecnicas,       setIncidTecnicas]        = useState<IncidenciaTecnica[]>([]);
    const [loadingTecnicas,     setLoadingTecnicas]      = useState(true);
    const [categoriasTecnicas,  setCategoriasTecnicas]   = useState<Catalogo[]>([]);
    const [estadosIncidencia,   setEstadosIncidencia]    = useState<Catalogo[]>([]);

    const fetchTurnos = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('ct_turnos')
            .select('*')
            .order('fecha', { ascending: false })
            .order('hora_inicio', { ascending: false });

        console.log('turnos cargados:', data, 'error:', error);
        if (error) {
            console.error('[CuartoTurno] Error cargando turnos:', error);
        } else {
            setTurnos((data || []).map(mapTurno));
        }
        setLoading(false);
    };

    const fetchIncidencias = async () => {
        setLoadingIncid(true);
        const { data, error } = await supabase
            .from('ct_incid_personal')
            .select('*')
            .order('fecha', { ascending: false });

        console.log('incidencias cargadas:', data, 'error:', error);
        if (error) {
            console.error('[CuartoTurno] Error cargando incidencias:', error);
        } else {
            setIncidencias((data || []).map(mapIncidencia));
        }
        setLoadingIncid(false);
    };

    const fetchCatalogos = async () => {
        const { data, error } = await supabase
            .from('ct_catalogos')
            .select('*')
            .eq('tipo', 'tipo_turno')
            .eq('activo', true)
            .order('orden');

        console.log('catalogos tipo_turno:', data, 'error:', error);
        if (!error) setCatalogos(data || []);
    };

    const fetchTiposIncidencia = async () => {
        const { data, error } = await supabase
            .from('ct_catalogos')
            .select('*')
            .eq('tipo', 'tipo_incidencia_personal')
            .eq('activo', true)
            .order('orden');

        console.log('tiposIncidencia:', data, 'error:', error);
        if (!error) setTiposIncidencia(data || []);
    };

    const fetchCausas = async () => {
        const { data, error } = await supabase
            .from('ct_catalogos')
            .select('*')
            .eq('tipo', 'causa_personal')
            .eq('activo', true)
            .order('orden');

        console.log('causas:', data, 'error:', error);
        if (!error) setCausas(data || []);
    };

    const fetchSeveridades = async () => {
        const { data, error } = await supabase
            .from('ct_catalogos')
            .select('*')
            .eq('tipo', 'severidad')
            .eq('activo', true)
            .order('orden');

        console.log('severidades:', data, 'error:', error);
        if (!error) setSeveridades(data || []);
    };

    const fetchSlaDesviaciones = async () => {
        setLoadingSla(true);
        const { data, error } = await supabase
            .from('ct_incid_sla')
            .select('*')
            .order('fecha', { ascending: false });

        console.log('slaDesviaciones cargadas:', data, 'error:', error);
        if (error) {
            console.error('[CuartoTurno] Error cargando SLA:', error);
        } else {
            setSlaDesviaciones((data || []).map(mapSlaDesviacion));
        }
        setLoadingSla(false);
    };

    const fetchTiposDesviacion = async () => {
        const { data, error } = await supabase
            .from('ct_catalogos')
            .select('*')
            .eq('tipo', 'tipo_desviacion_sla')
            .eq('activo', true)
            .order('orden');

        console.log('tiposDesviacion:', data, 'error:', error);
        if (!error) setTiposDesviacion(data || []);
    };

    const fetchModalidades = async () => {
        const { data, error } = await supabase
            .from('ct_catalogos')
            .select('*')
            .eq('tipo', 'modalidad')
            .eq('activo', true)
            .order('orden');

        console.log('modalidades:', data, 'error:', error);
        if (!error) setModalidades(data || []);
    };

    const fetchCasosCriticos = async () => {
        setLoadingCasos(true);
        const { data, error } = await supabase
            .from('ct_casos_criticos')
            .select('*')
            .order('fecha', { ascending: false });

        console.log('casosCriticos cargados:', data, 'error:', error);
        if (error) {
            console.error('[CuartoTurno] Error cargando casos críticos:', error);
        } else {
            setCasosCriticos((data || []).map(mapCasoCritico));
        }
        setLoadingCasos(false);
    };

    useEffect(() => {
        fetchTurnos();
        fetchIncidencias();
        fetchCatalogos();
        fetchTiposIncidencia();
        fetchCausas();
        fetchSeveridades();
        fetchSlaDesviaciones();
        fetchTiposDesviacion();
        fetchModalidades();
        fetchCasosCriticos();
        fetchIncidTecnicas();
        fetchCategoriasTecnicas();
        fetchEstadosIncidencia();

        // Realtime: refresca cada lista cuando su tabla cambia (alta desde otro tecnólogo, etc.)
        const sub = supabase
            .channel('ct_changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'ct_turnos' },          fetchTurnos)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'ct_incid_personal' },   fetchIncidencias)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'ct_incid_sla' },         fetchSlaDesviaciones)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'ct_casos_criticos' },    fetchCasosCriticos)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'ct_incid_tecnicas' },    fetchIncidTecnicas)
            .subscribe();

        return () => { supabase.removeChannel(sub); };
    }, []);

    const addTurno = async (payload: {
        fecha:                  string;
        tipoTurno:              string;
        horaInicio?:            string;
        horaFin?:               string;
        estabilizado?:          boolean;
        horaEstabilizacion?:    string;
        apoyoMedicoExtra?:      boolean;
        recibidos?:             number;
        recibidosFueraPlazo?:   number;
        recibidosPendientes?:   number;
        entregados?:            number;
        entregadosFueraPlazo?:  number;
        entregadosPendientes?:  number;
        observaciones?:         string;
    }) => {
        const { data: { user } } = await supabase.auth.getUser();

        const { error } = await supabase.from('ct_turnos').insert({
            fecha:                  payload.fecha,
            tipo_turno:             payload.tipoTurno,
            hora_inicio:            payload.horaInicio            || null,
            hora_fin:               payload.horaFin               || null,
            estabilizado:           payload.estabilizado          ?? false,
            hora_estabilizacion:    payload.horaEstabilizacion    || null,
            apoyo_medico_extra:     payload.apoyoMedicoExtra      ?? false,
            recibidos:              payload.recibidos             ?? null,
            recibidos_fueraplazo:   payload.recibidosFueraPlazo   ?? null,
            recibidos_pendientes:   payload.recibidosPendientes   ?? null,
            entregados:             payload.entregados            ?? null,
            entregados_fueraplazo:  payload.entregadosFueraPlazo  ?? null,
            entregados_pendientes:  payload.entregadosPendientes  ?? null,
            observaciones:          payload.observaciones         || null,
            created_by:             user?.id                      || null,
        });

        if (!error) await fetchTurnos();
        return { success: !error, error };
    };

    const addIncidencia = async (payload: {
        idTurno?:       string;
        fecha?:         string;
        medico?:        string;
        bloqueHorario?: string;
        tipoIncidencia?: string;
        minutosAtraso?: number;
        causa?:         string;
        severidad?:     string;
        detalle?:       string;
    }) => {
        const { data: { user } } = await supabase.auth.getUser();

        const { error } = await supabase.from('ct_incid_personal').insert({
            id_turno:        payload.idTurno        || null,
            fecha:           payload.fecha          || null,
            medico:          payload.medico         || null,
            bloque_horario:  payload.bloqueHorario  || null,
            tipo_incidencia: payload.tipoIncidencia || null,
            minutos_atraso:  payload.minutosAtraso  ?? null,
            causa:           payload.causa          || null,
            severidad:       payload.severidad      || null,
            detalle:         payload.detalle        || null,
            created_by:      user?.id               || null,
        });

        console.log('addIncidencia error:', error);
        if (!error) await fetchIncidencias();
        return { success: !error, error };
    };

    const addSlaDesviacion = async (payload: {
        idTurno?:       string;
        fecha?:         string;
        medico?:        string;
        tipoDesviacion?: string;
        modalidad?:     string;
        minutosExceso?: number;
        severidad?:     string;
        detalle?:       string;
    }) => {
        const { data: { user } } = await supabase.auth.getUser();

        const { error } = await supabase.from('ct_incid_sla').insert({
            id_turno:        payload.idTurno        || null,
            fecha:           payload.fecha          || null,
            medico:          payload.medico         || null,
            tipo_desviacion: payload.tipoDesviacion || null,
            modalidad:       payload.modalidad      || null,
            minutos_exceso:  payload.minutosExceso  ?? null,
            severidad:       payload.severidad      || null,
            detalle:         payload.detalle        || null,
            created_by:      user?.id               || null,
        });

        console.log('addSlaDesviacion error:', error);
        if (!error) await fetchSlaDesviaciones();
        return { success: !error, error };
    };

    const fetchIncidTecnicas = async () => {
        setLoadingTecnicas(true);
        const { data, error } = await supabase
            .from('ct_incid_tecnicas')
            .select('*')
            .order('fecha', { ascending: false });

        console.log('incidTecnicas cargadas:', data, 'error:', error);
        if (error) {
            console.error('[CuartoTurno] Error cargando incidencias técnicas:', error);
        } else {
            setIncidTecnicas((data || []).map(mapIncidenciaTecnica));
        }
        setLoadingTecnicas(false);
    };

    const fetchCategoriasTecnicas = async () => {
        const { data, error } = await supabase
            .from('ct_catalogos')
            .select('*')
            .eq('tipo', 'categoria_tecnica')
            .eq('activo', true)
            .order('orden');

        console.log('categoriasTecnicas:', data, 'error:', error);
        if (!error) setCategoriasTecnicas(data || []);
    };

    const fetchEstadosIncidencia = async () => {
        const { data, error } = await supabase
            .from('ct_catalogos')
            .select('*')
            .eq('tipo', 'estado_incidencia')
            .eq('activo', true)
            .order('orden');

        console.log('estadosIncidencia:', data, 'error:', error);
        if (!error) setEstadosIncidencia(data || []);
    };

    const addCasoCritico = async (payload: {
        idTurno?:           string;
        fecha?:             string;
        institucion?:       string;
        modalidad?:         string;
        idEstudio?:         string;
        paciente?:          string;
        rut?:               string;
        fueraPlazo?:        boolean;
        minutosRetraso?:    number;
        medicoResponsable?: string;
        detalle?:           string;
    }) => {
        const { data: { user } } = await supabase.auth.getUser();

        const { error } = await supabase.from('ct_casos_criticos').insert({
            id_turno:           payload.idTurno           || null,
            fecha:              payload.fecha             || null,
            institucion:        payload.institucion       || null,
            modalidad:          payload.modalidad         || null,
            id_estudio:         payload.idEstudio         || null,
            paciente:           payload.paciente          || null,
            rut:                payload.rut               || null,
            fuera_plazo:        payload.fueraPlazo        ?? false,
            minutos_retraso:    payload.minutosRetraso    ?? null,
            medico_responsable: payload.medicoResponsable || null,
            detalle:            payload.detalle           || null,
            created_by:         user?.id                  || null,
        });

        console.log('addCasoCritico error:', error);
        if (!error) await fetchCasosCriticos();
        return { success: !error, error };
    };

    const addIncidTecnica = async (payload: {
        fecha?:            string;
        categoriaTecnica?: string;
        centroAfectado?:   string;
        sistema?:          string;
        estado?:           string;
        severidad?:        string;
        detalle?:          string;
        accionTomada?:     string;
    }) => {
        const { data: { user } } = await supabase.auth.getUser();

        const { error } = await supabase.from('ct_incid_tecnicas').insert({
            fecha:            payload.fecha            || null,
            categoria_tecnica: payload.categoriaTecnica || null,
            centro_afectado:  payload.centroAfectado   || null,
            sistema:          payload.sistema          || null,
            estado:           payload.estado           || null,
            severidad:        payload.severidad        || null,
            detalle:          payload.detalle          || null,
            accion_tomada:    payload.accionTomada     || null,
            created_by:       user?.id                 || null,
        });

        console.log('addIncidTecnica error:', error);
        if (!error) await fetchIncidTecnicas();
        return { success: !error, error };
    };

    const tiposTurno = catalogos;   // fetchCatalogos ya filtra por tipo_turno

    return {
        turnos, incidencias, slaDesviaciones, casosCriticos, incidTecnicas, catalogos,
        tiposTurno, tiposIncidencia, causas, severidades,
        tiposDesviacion, modalidades,
        categoriasTecnicas, estadosIncidencia,
        loading, loadingIncid, loadingSla, loadingCasos, loadingTecnicas,
        addTurno, addIncidencia, addSlaDesviacion, addCasoCritico, addIncidTecnica,
        refresh: fetchTurnos,
        refreshIncidencias: fetchIncidencias,
        refreshSla: fetchSlaDesviaciones,
        refreshCasos: fetchCasosCriticos,
        refreshTecnicas: fetchIncidTecnicas,
    };
};
