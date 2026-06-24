import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface StandByItem {
    id:              string;
    idEstudio?:      string;
    institucionId?:  string;
    modalidad?:      string;
    paciente?:       string;
    rut?:            string;
    motivo?:         string;
    comentario?:     string;
    adjuntos?:       { path: string; nombre: string }[];
    estado:          string;
    fechaSolicitud:  string;
    fechaEnvio?:     string;
    fechaRetorno?:   string;
    fechaResolucion?: string;
    prioridad:       boolean;
    createdBy?:      string;
}

export interface Institucion {
    id:        string;
    legalName: string;
}

export interface CatalogoSol {
    id:      string;
    tipo:    string;
    valor:   string;
    etiqueta: string;
    orden:   number;
    activo:  boolean;
}

export interface Medico {
    id:        string;
    nombre:    string;   // "name last_name"
    specialty?: string;
}

export interface AddendumItem {
    id:                 string;
    institucionId?:     string;
    tipoSolicitud?:     string;
    tipoAtencion?:      string;
    modalidad?:         string;
    fechaExamen?:       string;
    idEstudio?:         string;
    paciente?:          string;
    rut?:               string;
    detalleSolicitud?:  string;
    medicoInformante?:  string;
    medicoValidador?:   string;
    medicoSolicitante?: string;
    estado:             string;
    clasificacion?:     string;
    medicoAsignadoId?:  string;
    resolucion?:        string;
    resolucionTexto?:   string;
    medicoResolucion?:  string;
    fechaResolucion?:   string;
    fechaIngreso?:      string;
    notificarCritica:   boolean;
    createdBy?:         string;
}

const mapStandBy = (r: any): StandByItem => ({
    id:              r.id,
    idEstudio:       r.id_estudio,
    institucionId:   r.institucion_id,
    modalidad:       r.modalidad,
    paciente:        r.paciente,
    rut:             r.rut,
    motivo:          r.motivo,
    comentario:      r.comentario,
    adjuntos:        r.adjuntos ?? [],
    estado:          r.estado ?? 'En Stand By',
    fechaSolicitud:  r.fecha_solicitud,
    fechaEnvio:      r.fecha_envio,
    fechaRetorno:    r.fecha_retorno,
    fechaResolucion: r.fecha_resolucion,
    prioridad:       r.prioridad ?? false,
    createdBy:       r.created_by,
});

const mapAddendum = (r: any): AddendumItem => ({
    id:                 r.id,
    institucionId:      r.institucion_id,
    tipoSolicitud:      r.tipo_solicitud,
    tipoAtencion:       r.tipo_atencion,
    modalidad:          r.modalidad,
    fechaExamen:        r.fecha_examen,
    idEstudio:          r.id_estudio,
    paciente:           r.paciente,
    rut:                r.rut,
    detalleSolicitud:   r.detalle_solicitud,
    medicoInformante:   r.medico_informante,
    medicoValidador:    r.medico_validador,
    medicoSolicitante:  r.medico_solicitante,
    estado:             r.estado ?? 'Nueva',
    clasificacion:      r.clasificacion,
    medicoAsignadoId:   r.medico_asignado_id,
    resolucion:         r.resolucion,
    resolucionTexto:    r.resolucion_texto,
    medicoResolucion:   r.medico_resolucion,
    fechaResolucion:    r.fecha_resolucion,
    fechaIngreso:       r.fecha_ingreso,
    notificarCritica:   r.notificar_critica ?? false,
    createdBy:          r.created_by,
});

export const useSolicitudes = () => {
    const [standByItems,  setStandByItems]  = useState<StandByItem[]>([]);
    const [instituciones, setInstituciones] = useState<Institucion[]>([]);
    const [motivos,       setMotivos]       = useState<CatalogoSol[]>([]);
    const [loading,       setLoading]       = useState(true);

    // ── Addendum ──────────────────────────────────────────────────────────────
    const [addendums,         setAddendums]         = useState<AddendumItem[]>([]);
    const [medicos,           setMedicos]           = useState<Medico[]>([]);
    const [addEstados,        setAddEstados]        = useState<CatalogoSol[]>([]);
    const [addTipos,          setAddTipos]          = useState<CatalogoSol[]>([]);
    const [addAtenciones,     setAddAtenciones]     = useState<CatalogoSol[]>([]);
    const [addClasificaciones, setAddClasificaciones] = useState<CatalogoSol[]>([]);
    const [loadingAdd,        setLoadingAdd]        = useState(true);

    const fetchStandBy = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('sol_standby')
            .select('*')
            .order('fecha_solicitud', { ascending: false });

        console.log('standby cargados:', data, 'error:', error);
        if (error) {
            console.error('[Solicitudes] Error cargando stand by:', error);
        } else {
            setStandByItems((data || []).map(mapStandBy));
        }
        setLoading(false);
    };

    const fetchInstituciones = async () => {
        const { data, error } = await supabase
            .from('institutions')
            .select('id, legal_name')
            .order('legal_name');

        console.log('instituciones:', data, 'error:', error);
        if (!error) setInstituciones((data || []).map(r => ({ id: r.id, legalName: r.legal_name })));
    };

    const fetchMotivos = async () => {
        const { data, error } = await supabase
            .from('sol_catalogos')
            .select('*')
            .eq('tipo', 'standby_motivo')
            .eq('activo', true)
            .order('orden');

        console.log('motivos standby:', data, 'error:', error);
        if (!error) setMotivos(data || []);
    };

    const fetchAddendums = async () => {
        setLoadingAdd(true);
        const { data, error } = await supabase
            .from('sol_addendum')
            .select('*')
            .order('fecha_ingreso', { ascending: false });

        console.log('addendums cargados:', data, 'error:', error);
        if (error) {
            console.error('[Solicitudes] Error cargando addendums:', error);
        } else {
            setAddendums((data || []).map(mapAddendum));
        }
        setLoadingAdd(false);
    };

    const fetchMedicos = async () => {
        // Replica el patrón de useProfessionals (PortalMedicosAdmin): select('*')
        // evita errores por nombres de columna y respeta la misma policy de lectura.
        const { data, error } = await supabase
            .from('professionals')
            .select('*')
            .order('name');

        console.log('medicos:', data, 'error:', error);
        if (!error) {
            setMedicos((data || []).map((r: any) => ({
                id:        r.id,
                nombre:    `${r.name ?? ''} ${r.last_name ?? ''}`.trim(),
                specialty: r.specialty,
            })));
        }
    };

    const fetchCatalogoSol = async (tipo: string, setter: (v: CatalogoSol[]) => void) => {
        const { data, error } = await supabase
            .from('sol_catalogos')
            .select('*')
            .eq('tipo', tipo)
            .eq('activo', true)
            .order('orden');

        console.log(`catalogo ${tipo}:`, data, 'error:', error);
        if (!error) setter(data || []);
    };

    useEffect(() => {
        fetchStandBy();
        fetchInstituciones();
        fetchMotivos();
        fetchAddendums();
        fetchMedicos();
        fetchCatalogoSol('addendum_estado',        setAddEstados);
        fetchCatalogoSol('addendum_tipo',          setAddTipos);
        fetchCatalogoSol('addendum_atencion',      setAddAtenciones);
        fetchCatalogoSol('addendum_clasificacion', setAddClasificaciones);
    }, []);

    const addStandBy = async (
        payload: {
            idEstudio:     string;
            institucionId?: string;
            modalidad?:    string;
            paciente?:     string;
            rut?:          string;
            motivo?:       string;
            comentario?:   string;
        },
        files: File[]
    ): Promise<{ success: boolean; error: any }> => {
        const { data: { user } } = await supabase.auth.getUser();
        const recordId = crypto.randomUUID();

        // Subir adjuntos al bucket privado 'solicitudes' — guardamos el path, no URL pública
        const adjuntos: { path: string; nombre: string }[] = [];
        for (const file of files) {
            const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
            const filePath = `standby/${recordId}/${safeName}`;
            const { error: uploadError } = await supabase.storage
                .from('solicitudes')
                .upload(filePath, file, { cacheControl: '3600', upsert: true });

            if (uploadError) {
                console.error('[Solicitudes] Error subiendo archivo:', uploadError);
            } else {
                adjuntos.push({ path: filePath, nombre: file.name });
            }
        }

        const { error } = await supabase.from('sol_standby').insert({
            id:             recordId,
            id_estudio:     payload.idEstudio,
            institucion_id: payload.institucionId  || null,
            modalidad:      payload.modalidad      || null,
            paciente:       payload.paciente       || null,
            rut:            payload.rut            || null,
            motivo:         payload.motivo         || null,
            comentario:     payload.comentario     || null,
            adjuntos:       adjuntos.length > 0 ? adjuntos : null,
            estado:         'En Stand By',
            fecha_envio:    new Date().toISOString(),
            prioridad:      false,
            created_by:     user?.id || null,
        });

        if (error) {
            console.error('[Solicitudes] Error insertando stand by:', error);
            alert('Error: ' + error.message);
        } else {
            await fetchStandBy();
        }
        return { success: !error, error };
    };

    const updateEstado = async (id: string, nuevoEstado: string): Promise<{ success: boolean; error: any }> => {
        const updates: Record<string, any> = { estado: nuevoEstado };
        if (nuevoEstado === 'Devuelto') updates.fecha_retorno    = new Date().toISOString();
        if (nuevoEstado === 'Resuelto') {
            updates.fecha_resolucion = new Date().toISOString();
            updates.prioridad        = true;
        }

        const { error } = await supabase
            .from('sol_standby')
            .update(updates)
            .eq('id', id);

        if (error) {
            console.error('[Solicitudes] Error actualizando estado:', error);
            alert('Error: ' + error.message);
        } else {
            await fetchStandBy();
        }
        return { success: !error, error };
    };

    // ── Mutaciones de Addendum ──────────────────────────────────────────────────
    const addAddendum = async (payload: {
        institucionId?:     string;
        tipoSolicitud?:     string;
        tipoAtencion?:      string;
        modalidad?:         string;
        fechaExamen?:       string;
        idEstudio?:         string;
        paciente?:          string;
        rut?:               string;
        detalleSolicitud?:  string;
        medicoInformante?:  string;
        medicoValidador?:   string;
        medicoSolicitante?: string;
    }): Promise<{ success: boolean; error: any }> => {
        const { data: { user } } = await supabase.auth.getUser();

        const { error } = await supabase.from('sol_addendum').insert({
            institucion_id:      payload.institucionId     || null,
            tipo_solicitud:      payload.tipoSolicitud     || null,
            tipo_atencion:       payload.tipoAtencion      || null,
            modalidad:           payload.modalidad         || null,
            fecha_examen:        payload.fechaExamen       || null,
            id_estudio:          payload.idEstudio         || null,
            paciente:            payload.paciente          || null,
            rut:                 payload.rut               || null,
            detalle_solicitud:   payload.detalleSolicitud  || null,
            medico_informante:   payload.medicoInformante  || null,
            medico_validador:    payload.medicoValidador   || null,
            medico_solicitante:  payload.medicoSolicitante || null,
            estado:              'Nueva',
            created_by:          user?.id || null,
        });

        if (error) {
            console.error('[Solicitudes] Error insertando addendum:', error);
            alert('Error: ' + error.message);
        } else {
            await fetchAddendums();
        }
        return { success: !error, error };
    };

    const updateAddendum = async (id: string, updates: Record<string, any>): Promise<{ success: boolean; error: any }> => {
        const { error } = await supabase
            .from('sol_addendum')
            .update(updates)
            .eq('id', id);

        if (error) {
            console.error('[Solicitudes] Error actualizando addendum:', error);
            alert('Error: ' + error.message);
        } else {
            await fetchAddendums();
        }
        return { success: !error, error };
    };

    // Triaje
    const setClasificacion = (id: string, clasificacion: string) =>
        updateAddendum(id, { clasificacion });

    const resolverAdministrativo = (id: string) =>
        updateAddendum(id, { clasificacion: 'Administrativo', estado: 'Finalizada' });

    const asignarMedico = (id: string, medicoAsignadoId: string) =>
        updateAddendum(id, { clasificacion: 'Médico', medico_asignado_id: medicoAsignadoId, estado: 'En proceso' });

    // Resolución (médico)
    const resolverAddendum = (id: string, resolucionTexto: string, medicoResolucion: string) =>
        updateAddendum(id, {
            resolucion:        'Addendum',
            resolucion_texto:  resolucionTexto,
            medico_resolucion: medicoResolucion,
            fecha_resolucion:  new Date().toISOString(),
            estado:            'Finalizada',
        });

    const rechazarAddendum = (id: string, resolucionTexto: string) =>
        updateAddendum(id, {
            resolucion:        'Rechazo',
            resolucion_texto:  resolucionTexto,
            fecha_resolucion:  new Date().toISOString(),
            estado:            'Rechazada',
        });

    const segundaOpinion = (id: string, resolucionTexto: string, medicoResolucion: string) =>
        updateAddendum(id, {
            resolucion:        'Segunda opinión',
            resolucion_texto:  resolucionTexto,
            medico_resolucion: medicoResolucion,
            fecha_resolucion:  new Date().toISOString(),
            estado:            'Finalizada',
        });

    const setNotificarCritica = (id: string, valor: boolean) =>
        updateAddendum(id, { notificar_critica: valor });

    const getSignedUrl = async (path: string, expiresIn = 3600): Promise<string | null> => {
        const { data, error } = await supabase.storage
            .from('solicitudes')
            .createSignedUrl(path, expiresIn);
        if (error) { console.error('[Solicitudes] Error generando URL firmada:', error); return null; }
        return data.signedUrl;
    };

    return {
        standByItems, instituciones, motivos, loading,
        addStandBy, updateEstado, getSignedUrl,
        refresh: fetchStandBy,
        // Addendum
        addendums, medicos, addEstados, addTipos, addAtenciones, addClasificaciones, loadingAdd,
        addAddendum, setClasificacion, resolverAdministrativo, asignarMedico,
        resolverAddendum, rechazarAddendum, segundaOpinion, setNotificarCritica,
        refreshAddendums: fetchAddendums,
    };
};
