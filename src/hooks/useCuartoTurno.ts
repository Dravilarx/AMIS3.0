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
    id:                 string;
    fecha:              string;
    tipoTurno:          string;
    horaInicio?:        string;
    horaFin?:           string;
    estabilizado:       boolean;
    apoyoMedicoExtra:   boolean;
    recibidos?:         number;
    entregados?:        number;
    observaciones?:     string;
    createdBy?:         string;
    createdAt:          string;
}

const mapTurno = (r: any): Turno => ({
    id:               r.id,
    fecha:            r.fecha,
    tipoTurno:        r.tipo_turno,
    horaInicio:       r.hora_inicio,
    horaFin:          r.hora_fin,
    estabilizado:     r.estabilizado,
    apoyoMedicoExtra: r.apoyo_medico_extra,
    recibidos:        r.recibidos,
    entregados:       r.entregados,
    observaciones:    r.observaciones,
    createdBy:        r.created_by,
    createdAt:        r.created_at,
});

export const useCuartoTurno = () => {
    const [turnos,    setTurnos]    = useState<Turno[]>([]);
    const [catalogos, setCatalogos] = useState<Catalogo[]>([]);
    const [loading,   setLoading]   = useState(true);

    const fetchTurnos = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('ct_turnos')
            .select('*')
            .order('fecha', { ascending: false })
            .order('hora_inicio', { ascending: false });

        if (error) {
            console.error('[CuartoTurno] Error cargando turnos:', error);
        } else {
            setTurnos((data || []).map(mapTurno));
        }
        setLoading(false);
    };

    const fetchCatalogos = async () => {
        const { data, error } = await supabase
            .from('ct_catalogos')
            .select('*')
            .eq('activo', true)
            .order('tipo')
            .order('orden');

        if (error) {
            console.error('[CuartoTurno] Error cargando catálogos:', error);
        } else {
            setCatalogos(data || []);
        }
    };

    useEffect(() => {
        fetchTurnos();
        fetchCatalogos();

        const sub = supabase
            .channel('ct_turnos_changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'ct_turnos' }, fetchTurnos)
            .subscribe();

        return () => { supabase.removeChannel(sub); };
    }, []);

    const addTurno = async (payload: {
        fecha:             string;
        tipoTurno:         string;
        horaInicio?:       string;
        horaFin?:          string;
        estabilizado?:     boolean;
        apoyoMedicoExtra?: boolean;
        recibidos?:        number;
        entregados?:       number;
        observaciones?:    string;
    }) => {
        const { data: { user } } = await supabase.auth.getUser();

        const { error } = await supabase.from('ct_turnos').insert({
            fecha:              payload.fecha,
            tipo_turno:         payload.tipoTurno,
            hora_inicio:        payload.horaInicio   || null,
            hora_fin:           payload.horaFin      || null,
            estabilizado:       payload.estabilizado ?? false,
            apoyo_medico_extra: payload.apoyoMedicoExtra ?? false,
            recibidos:          payload.recibidos    ?? null,
            entregados:         payload.entregados   ?? null,
            observaciones:      payload.observaciones || null,
            created_by:         user?.id || null,
        });

        if (!error) await fetchTurnos();
        return { success: !error, error };
    };

    const tiposTurno = catalogos.filter(c => c.tipo === 'tipo_turno');

    return { turnos, catalogos, tiposTurno, loading, addTurno, refresh: fetchTurnos };
};
