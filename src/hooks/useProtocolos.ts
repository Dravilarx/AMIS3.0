import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface Protocolo {
    id:        string;
    area:      string;
    nombre:    string;
    contenido: string;
    orden:     number;
    activo:    boolean;
}

const mapProtocolo = (r: any): Protocolo => ({
    id:        r.id,
    area:      r.area ?? '',
    nombre:    r.nombre ?? '',
    contenido: r.contenido ?? '',
    orden:     r.orden ?? 0,
    activo:    r.activo ?? true,
});

export const useProtocolos = () => {
    const [protocolos, setProtocolos] = useState<Protocolo[]>([]);
    const [loading,    setLoading]    = useState(true);

    const fetchProtocolos = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('protocolos')
            .select('area, nombre, contenido, orden, activo')
            .eq('activo', true)
            .order('area')
            .order('orden');

        console.log('protocolos cargados:', data, 'error:', error);
        if (error) {
            console.error('[Protocolos] Error cargando protocolos:', error);
        } else {
            // Generamos un id estable local (no viene en el select) para selección en UI
            setProtocolos((data || []).map((r, i) => mapProtocolo({ ...r, id: `${r.area}-${r.nombre}-${i}` })));
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchProtocolos();
    }, []);

    return { protocolos, loading, refresh: fetchProtocolos };
};
