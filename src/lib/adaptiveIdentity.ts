/**
 * @file adaptiveIdentity.ts
 * @description Motor de Identidad Adaptativa para AMIS 3.0
 * 
 * Resuelve dinámicamente el tipo de identificador de paciente según la
 * configuración del centro B2B. Soporta:
 *   - RUT (Chile, por defecto)
 *   - NUM_COBRE (Hospital del Cobre — código de empleado)
 *   - EXTERNAL_ID (ID genérico externo)
 * 
 * REGLA DE ORO: Toda búsqueda de historial clínico DEBE pasar por este
 * módulo para garantizar que se usa la llave correcta.
 */

import { supabase } from '../lib/supabase';

// ── Tipos ──
export type PatientIdSource = 'RUT' | 'NUM_COBRE' | 'EXTERNAL_ID';

export interface CenterIdentityConfig {
  aetitle: string;
  patient_id_source: PatientIdSource;
  patient_id_label: string;
}

export interface ResolvedPatientId {
  /** El valor efectivo del identificador */
  value: string;
  /** El tipo de identificador */
  source: PatientIdSource;
  /** Etiqueta legible para UI */
  label: string;
  /** Formato de display: "12.345.678-9 [RUT]" o "78443 [N° COBRE]" */
  displayTag: string;
}

// ── Cache de configuración por centro ──
const centerConfigCache = new Map<string, CenterIdentityConfig>();

/**
 * Obtiene la configuración de identidad de un centro B2B.
 * Cachea resultados para evitar consultas repetidas.
 */
export async function getCenterIdentityConfig(
  aetitle: string
): Promise<CenterIdentityConfig> {
  // Check cache first
  if (centerConfigCache.has(aetitle)) {
    return centerConfigCache.get(aetitle)!;
  }

  const { data } = await supabase
    .from('b2b_centers')
    .select('aetitle, patient_id_source, patient_id_label')
    .eq('aetitle', aetitle)
    .maybeSingle();

  const config: CenterIdentityConfig = {
    aetitle,
    patient_id_source: data?.patient_id_source || 'RUT',
    patient_id_label: data?.patient_id_label || 'RUT',
  };

  centerConfigCache.set(aetitle, config);
  return config;
}

/**
 * Invalida el cache de un centro específico o todo el cache.
 */
export function invalidateCenterCache(aetitle?: string) {
  if (aetitle) {
    centerConfigCache.delete(aetitle);
  } else {
    centerConfigCache.clear();
  }
}

/**
 * Resuelve el identificador efectivo de un paciente dado su registro
 * de producción/estudio, según la configuración del centro.
 */
export function resolvePatientId(params: {
  paciente_id: string | null;
  external_patient_id?: string | null;
  patient_id_source?: PatientIdSource;
  centerConfig?: CenterIdentityConfig;
}): ResolvedPatientId {
  const source = params.patient_id_source || params.centerConfig?.patient_id_source || 'RUT';
  const label = params.centerConfig?.patient_id_label || getDefaultLabel(source);

  let value: string;

  switch (source) {
    case 'NUM_COBRE':
    case 'EXTERNAL_ID':
      value = params.external_patient_id || params.paciente_id || '—';
      break;
    case 'RUT':
    default:
      value = params.paciente_id || '—';
      break;
  }

  return {
    value,
    source,
    label,
    displayTag: `${value} [${label}]`,
  };
}

/**
 * Construye la query dinámica de historial clínico según el tipo de ID.
 * 
 * USO:
 *   const column = getPatientIdColumn(centerConfig);
 *   query.eq(column, patientIdValue);
 */
export function getPatientIdColumn(source: PatientIdSource): string {
  switch (source) {
    case 'NUM_COBRE':
    case 'EXTERNAL_ID':
      return 'external_patient_id';
    case 'RUT':
    default:
      return 'paciente_id';
  }
}

/**
 * Construye query dinámico para multiris_production por identidad adaptativa.
 */
export function buildPatientHistoryQuery(
  baseQuery: any,
  patientValue: string,
  source: PatientIdSource
) {
  const column = getPatientIdColumn(source);
  return baseQuery.eq(column, patientValue);
}

// ── Helpers ──

function getDefaultLabel(source: PatientIdSource): string {
  switch (source) {
    case 'NUM_COBRE': return 'N° Cobre';
    case 'EXTERNAL_ID': return 'ID Externo';
    case 'RUT': return 'RUT';
    default: return 'ID';
  }
}

/**
 * Formatea un RUT chileno con puntos y guión.
 * Input: "123456789" → Output: "12.345.678-9"
 */
export function formatRUT(rut: string | null): string {
  if (!rut) return '—';
  const clean = rut.replace(/[^\dkK]/g, '');
  if (clean.length < 2) return rut;
  
  const body = clean.slice(0, -1);
  const dv = clean.slice(-1).toUpperCase();
  const formatted = body.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${formatted}-${dv}`;
}

/**
 * Genera el badge visual para el tipo de identificación.
 * Retorna las clases CSS y el texto del badge.
 */
export function getIdBadgeStyle(source: PatientIdSource): {
  text: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
} {
  switch (source) {
    case 'NUM_COBRE':
      return {
        text: 'N° COBRE',
        bgClass: 'bg-amber-500/10',
        textClass: 'text-amber-400',
        borderClass: 'border-amber-500/20',
      };
    case 'EXTERNAL_ID':
      return {
        text: 'ID EXTERNO',
        bgClass: 'bg-sky-500/10',
        textClass: 'text-sky-400',
        borderClass: 'border-sky-500/20',
      };
    case 'RUT':
    default:
      return {
        text: 'RUT',
        bgClass: 'bg-brand-text/5',
        textClass: 'text-brand-text/40',
        borderClass: 'border-brand-text/10',
      };
  }
}
