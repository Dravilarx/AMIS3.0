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

    /**
     * Calcula si el dispositivo está dentro del radio permitido de una sede.
     * Retorna true para turnos remotos (sin coordenadas requeridas).
     */
    const checkGeofence = (shift: Shift): Promise<boolean> => {
        // Turnos remotos o sin sede definida → siempre válido
        const remoteCities = ['Remoto', 'Remote', 'Online', ''];
        if (!shift.sedeCity || remoteCities.includes(shift.sedeCity)) {
            return Promise.resolve(true);
        }

        return new Promise(resolve => {
            if (!navigator.geolocation) {
                // Navegador sin soporte → permitir con advertencia en consola
                console.warn('AMIS Geofence: navegador sin soporte de geolocalización.');
                resolve(true);
                return;
            }

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    // Coordenadas de referencia por sede (extender según sedes reales)
                    const SEDES: Record<string, { lat: number; lng: number; radiusKm: number }> = {
                        'Santiago':      { lat: -33.4489, lng: -70.6693, radiusKm: 15 },
                        'Antofagasta':   { lat: -23.6509, lng: -70.3975, radiusKm: 10 },
                        'Concepción':    { lat: -36.8270, lng: -73.0503, radiusKm: 10 },
                        'Viña del Mar':  { lat: -33.0245, lng: -71.5518, radiusKm: 10 },
                        'Temuco':        { lat: -38.7359, lng: -72.5904, radiusKm: 10 },
                    };

                    const sede = SEDES[shift.sedeCity || ''];
                    if (!sede) {
                        // Sede sin coordenadas registradas → permitir
                        resolve(true);
                        return;
                    }

                    // Fórmula de Haversine para distancia entre dos puntos GPS
                    const toRad = (deg: number) => deg * (Math.PI / 180);
                    const R = 6371; // Radio de la Tierra en km
                    const dLat = toRad(position.coords.latitude  - sede.lat);
                    const dLng = toRad(position.coords.longitude - sede.lng);
                    const a =
                        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                        Math.cos(toRad(sede.lat)) *
                        Math.cos(toRad(position.coords.latitude)) *
                        Math.sin(dLng / 2) * Math.sin(dLng / 2);
                    const distanceKm = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

                    resolve(distanceKm <= sede.radiusKm);
                },
                (err) => {
                    // Usuario denegó permisos → no bloquear, registrar como no validado
                    console.warn('AMIS Geofence: permiso denegado o timeout.', err.message);
                    resolve(false);
                },
                { timeout: 8000, maximumAge: 60000, enableHighAccuracy: false }
            );
        });
    };

    const updateShiftStatus = async (shiftId: string, status: string, checkTime?: string) => {
        const updateData: any = { status };

        if (status === 'presente' && !checkTime) {
            updateData.check_in = new Date().toLocaleTimeString('en-GB', {
                hour: '2-digit', minute: '2-digit'
            });

            // Geofence real: buscar el turno para saber si es presencial o remoto
            const shift = shifts.find(s => s.id === shiftId);
            updateData.geofence_valid = shift
                ? await checkGeofence(shift)
                : false;

        } else if (status === 'finalizado') {
            updateData.check_out = new Date().toLocaleTimeString('en-GB', {
                hour: '2-digit', minute: '2-digit'
            });
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
