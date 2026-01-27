import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Shift } from '../types/shifts';

export const useShifts = () => {
    const [shifts, setShifts] = useState<Shift[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchShifts = async () => {
        try {
            setLoading(true);
            const { data, error: supabaseError } = await supabase
                .from('shifts')
                .select('*')
                .order('date', { ascending: true })
                .order('start_time', { ascending: true });

            if (supabaseError) throw supabaseError;

            const mappedShifts: Shift[] = (data || []).map(s => ({
                id: s.id,
                professionalId: s.professional_id,
                professionalName: s.professional_name,
                date: s.date,
                startTime: s.start_time.substring(0, 5),
                endTime: s.end_time.substring(0, 5),
                location: s.location,
                sedeCity: s.sede_city || '',
                status: s.status as any,
                checkIn: s.check_in?.substring(0, 5),
                checkOut: s.check_out?.substring(0, 5),
                geofenceValid: s.geofence_valid
            }));

            setShifts(mappedShifts);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const updateShiftStatus = async (shiftId: string, status: string, checkTime?: string) => {
        const updateData: any = { status };
        if (status === 'presente' && !checkTime) {
            updateData.check_in = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
            updateData.geofence_valid = true; // Mock biometric/geofence for now
        } else if (status === 'finalizado') {
            updateData.check_out = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
        }

        const { error } = await supabase
            .from('shifts')
            .update(updateData)
            .eq('id', shiftId);

        if (!error) fetchShifts();
        return { success: !error, error };
    };

    useEffect(() => {
        fetchShifts();

        // Suscripción Realtime
        const channel = supabase
            .channel('shifts_realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'shifts' }, () => {
                fetchShifts();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    return { shifts, loading, error, updateShiftStatus, refresh: fetchShifts };
};
