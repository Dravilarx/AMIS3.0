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
                professionalName: s.professional_name || 'Sin Nombre',
                date: s.date,
                startTime: (s.start_time || '00:00').substring(0, 5),
                endTime: (s.end_time || '00:00').substring(0, 5),
                location: s.location || 'Sede General',
                sedeCity: s.sede_city || '',
                status: s.status as any,
                checkIn: s.check_in?.substring(0, 5),
                checkOut: s.check_out?.substring(0, 5),
                geofenceValid: s.geofence_valid,
                is_deleted: s.is_deleted
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

    const addShift = async (newShift: Omit<Shift, 'id' | 'status'>) => {
        try {
            setLoading(true);
            const { error: supabaseError } = await supabase
                .from('shifts')
                .insert([{
                    professional_id: newShift.professionalId,
                    professional_name: newShift.professionalName,
                    date: newShift.date,
                    start_time: newShift.startTime,
                    end_time: newShift.endTime,
                    location: newShift.location,
                    sede_city: newShift.sedeCity,
                    status: 'programado'
                }]);

            if (supabaseError) throw supabaseError;

            await fetchShifts();
            return { success: true };
        } catch (err: any) {
            console.error('Error adding shift:', err);
            return { success: false, error: err.message };
        } finally {
            setLoading(false);
        }
    };

    const archiveShift = async (id: string) => {
        try {
            const { error } = await supabase
                .from('shifts')
                .update({ is_deleted: true, archived_at: new Date().toISOString() })
                .eq('id', id);

            if (error) throw error;
            await fetchShifts();
            return { success: true };
        } catch (err: any) {
            console.error('Error archiving shift:', err);
            return { success: false, error: err.message };
        }
    };

    const duplicateShift = async (shift: Shift) => {
        try {
            // const { id, ...dataToClone } = shift; // Unused
            const newShiftData = {
                professional_id: shift.professionalId,
                professional_name: shift.professionalName,
                date: shift.date,
                start_time: shift.startTime,
                end_time: shift.endTime,
                location: shift.location,
                sede_city: shift.sedeCity,
                status: 'programado'
            };

            const { error } = await supabase.from('shifts').insert([newShiftData]);
            if (error) throw error;

            await fetchShifts();
            return { success: true };
        } catch (err: any) {
            console.error('Error duplicating shift:', err);
            return { success: false, error: err.message };
        }
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

    return {
        shifts: shifts.filter(s => !s.is_deleted),
        loading,
        error,
        updateShiftStatus,
        addShift,
        archiveShift,
        duplicateShift,
        refresh: fetchShifts
    };
};
