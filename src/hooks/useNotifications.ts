import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

export interface Notificacion {
    id: string;
    tipo: string;
    titulo: string;
    cuerpo: string;
    modulo: string | null;
    refId: string | null;
    leida: boolean;
    createdAt: string;
}

const POLL_MS = 60_000;

// RLS ya filtra a "solo mis notificaciones"; no hace falta .eq('user_id', ...).
export const useNotifications = () => {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState<Notificacion[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(true);

    const fetchAll = useCallback(async () => {
        if (!user) { setNotifications([]); setUnreadCount(0); setLoading(false); return; }
        try {
            const [listRes, countRes] = await Promise.all([
                supabase.from('notificaciones').select('*').order('created_at', { ascending: false }).limit(20),
                supabase.from('notificaciones').select('*', { count: 'exact', head: true }).eq('leida', false),
            ]);
            if (!listRes.error) {
                setNotifications((listRes.data || []).map((n: any) => ({
                    id: n.id,
                    tipo: n.tipo,
                    titulo: n.titulo,
                    cuerpo: n.cuerpo,
                    modulo: n.modulo,
                    refId: n.ref_id,
                    leida: n.leida,
                    createdAt: n.created_at,
                })));
            }
            if (!countRes.error) setUnreadCount(countRes.count ?? 0);
        } catch (err) {
            console.error('Error cargando notificaciones:', err);
        } finally {
            setLoading(false);
        }
    }, [user]);

    const markAsRead = async (id: string) => {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, leida: true } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));
        const { error } = await supabase.from('notificaciones').update({ leida: true }).eq('id', id);
        if (error) await fetchAll(); // revertir estado optimista si falla
        return { success: !error, error: error?.message };
    };

    const markAllAsRead = async () => {
        const { error } = await supabase.from('notificaciones').update({ leida: true }).eq('leida', false);
        if (!error) { setNotifications(prev => prev.map(n => ({ ...n, leida: true }))); setUnreadCount(0); }
        return { success: !error, error: error?.message };
    };

    // Polling suave cada 60s, con cleanup. Refresco inmediato al montar.
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    useEffect(() => {
        fetchAll();
        intervalRef.current = setInterval(fetchAll, POLL_MS);
        return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
    }, [fetchAll]);

    return { notifications, unreadCount, loading, refresh: fetchAll, markAsRead, markAllAsRead };
};
