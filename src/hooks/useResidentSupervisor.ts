/**
 * @file useResidentSupervisor.ts
 * @description Hook para gestionar el mapeo Residente ↔ Supervisor en AMIS 3.0.
 *
 * Permite a MED_CHIEF y ADMIN_SECRETARY asignar/desasignar supervisores
 * a residentes. El supervisor asignado tiene su nombre en todos los
 * documentos públicos del residente.
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface ResidentSupervisorLink {
  id: string;
  residentId: string;
  residentName: string;
  supervisorId: string;
  supervisorName: string;
  isActive: boolean;
  validFrom: string;
  validUntil: string | null;
  createdAt: string;
}

export interface SupervisableProfessional {
  id: string;
  fullName: string;
  clinicalRole: string;
  specialty: string | null;
}

export const useResidentSupervisor = () => {
  const [links, setLinks] = useState<ResidentSupervisorLink[]>([]);
  const [residents, setResidents] = useState<SupervisableProfessional[]>([]);
  const [supervisors, setSupervisors] = useState<SupervisableProfessional[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Cargar mapeo residente-supervisor con join
      const { data: mapData, error: mapError } = await supabase
        .from('resident_supervisor_map')
        .select(`
          id,
          is_active,
          valid_from,
          valid_until,
          created_at,
          resident:professionals!resident_supervisor_map_resident_id_fkey(id, name, last_name, clinical_role),
          supervisor:professionals!resident_supervisor_map_supervisor_id_fkey(id, name, last_name, clinical_role)
        `)
        .order('created_at', { ascending: false });

      if (mapError) throw mapError;

      setLinks((mapData || []).map((m: any) => ({
        id: m.id,
        residentId: m.resident?.id ?? '',
        residentName: `${m.resident?.name ?? ''} ${m.resident?.last_name ?? ''}`.trim(),
        supervisorId: m.supervisor?.id ?? '',
        supervisorName: `${m.supervisor?.name ?? ''} ${m.supervisor?.last_name ?? ''}`.trim(),
        isActive: m.is_active,
        validFrom: m.valid_from,
        validUntil: m.valid_until,
        createdAt: m.created_at,
      })));

      // Cargar residentes disponibles
      const { data: resData } = await supabase
        .from('professionals')
        .select('id, name, last_name, clinical_role, specialty')
        .in('clinical_role', ['MED_RESIDENT', 'MED_REQUIRES_COSIGN'])
        .eq('is_active', true)
        .order('name');

      setResidents((resData || []).map((p: any) => ({
        id: p.id,
        fullName: `${p.name} ${p.last_name ?? ''}`.trim(),
        clinicalRole: p.clinical_role,
        specialty: p.specialty,
      })));

      // Cargar supervisores disponibles (MED_STAFF y MED_CHIEF)
      const { data: supData } = await supabase
        .from('professionals')
        .select('id, name, last_name, clinical_role, specialty')
        .in('clinical_role', ['MED_STAFF', 'MED_CHIEF'])
        .eq('is_active', true)
        .order('name');

      setSupervisors((supData || []).map((p: any) => ({
        id: p.id,
        fullName: `${p.name} ${p.last_name ?? ''}`.trim(),
        clinicalRole: p.clinical_role,
        specialty: p.specialty,
      })));

    } catch (err: any) {
      console.error('Error fetching resident-supervisor map:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  /**
   * Asigna un supervisor a un residente.
   * Si ya existe un vínculo activo, lo desactiva primero.
   */
  const assignSupervisor = async (residentId: string, supervisorId: string, validUntil?: string) => {
    try {
      // Desactivar vínculos anteriores del mismo residente
      await supabase
        .from('resident_supervisor_map')
        .update({ is_active: false })
        .eq('resident_id', residentId)
        .eq('is_active', true);

      // Crear nuevo vínculo
      const { error } = await supabase
        .from('resident_supervisor_map')
        .insert({
          resident_id: residentId,
          supervisor_id: supervisorId,
          is_active: true,
          valid_from: new Date().toISOString().split('T')[0],
          valid_until: validUntil || null,
        });

      if (error) throw error;

      // Actualizar supervisor_id en professionals (caché rápido)
      await supabase
        .from('professionals')
        .update({ supervisor_id: supervisorId })
        .eq('id', residentId);

      await fetchAll();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  /**
   * Desactiva el vínculo activo de un residente.
   */
  const removeSupervisor = async (linkId: string, residentId: string) => {
    try {
      await supabase
        .from('resident_supervisor_map')
        .update({ is_active: false })
        .eq('id', linkId);

      // Limpiar supervisor_id en professionals
      await supabase
        .from('professionals')
        .update({ supervisor_id: null })
        .eq('id', residentId);

      await fetchAll();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  return {
    links,
    residents,
    supervisors,
    loading,
    error,
    assignSupervisor,
    removeSupervisor,
    refresh: fetchAll,
  };
};
