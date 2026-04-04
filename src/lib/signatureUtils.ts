/**
 * @file signatureUtils.ts
 * @description Motor de resolución de firma pública para AMIS 3.0.
 *
 * REGLA DE ORO:
 *  - MED_STAFF / MED_CHIEF → firman con su propio nombre. Nombre SIEMPRE público.
 *  - MED_RESIDENT / MED_REQUIRES_COSIGN → su nombre NUNCA aparece en documentos
 *    públicos. La firma pública es la del supervisor validador.
 *  - TECH_SUPPORT → solo logs con PHI enmascarado.
 *
 * Esta utilidad es la ÚNICA fuente de verdad para resolver el nombre a imprimir
 * en PDFs, listados B2B y cualquier output externo.
 */

import type { ClinicalRole } from '../types/core';
import { supabase } from '../lib/supabase';

export interface PublicSignatureResult {
  /** Nombre que se imprime en el PDF o listado externo */
  publicName: string;
  /** Si el nombre fue sustituido por el supervisor */
  isSupervisorName: boolean;
  /** ID del profesional cuyo nombre aparece públicamente */
  publicProfessionalId: string | null;
}

/** Roles que requieren sustitución de nombre en documentos públicos */
const HIDDEN_ROLES: ClinicalRole[] = ['MED_RESIDENT', 'MED_REQUIRES_COSIGN'];

/** Roles que firman con nombre propio */
const PUBLIC_SIGNER_ROLES: ClinicalRole[] = ['MED_STAFF', 'MED_CHIEF'];

/**
 * Determina si un rol puede firmar informes de forma autónoma.
 */
export function canSignAutonomously(role: ClinicalRole | string | undefined): boolean {
  return PUBLIC_SIGNER_ROLES.includes(role as ClinicalRole);
}

/**
 * Determina si el nombre de un profesional puede aparecer en documentos públicos.
 */
export function isPubliclyVisible(role: ClinicalRole | string | undefined): boolean {
  return !HIDDEN_ROLES.includes(role as ClinicalRole);
}

/**
 * Resuelve el nombre público de firma dado un ID de profesional.
 * Consulta la DB directamente usando la función get_public_signature_name.
 * 
 * Usar en generación de PDF y en columnas de worklist B2B.
 */
export async function resolvePublicSignatureName(
  professionalId: string | null | undefined
): Promise<PublicSignatureResult> {
  if (!professionalId) {
    return { publicName: 'Médico Validador', isSupervisorName: false, publicProfessionalId: null };
  }

  try {
    const { data, error } = await supabase.rpc('get_public_signature_name', {
      professional_id: professionalId,
    });

    if (error || !data) {
      return { publicName: 'Médico Validador', isSupervisorName: false, publicProfessionalId: professionalId };
    }

    return {
      publicName: data as string,
      isSupervisorName: false, // La función DB ya maneja la lógica de sustitución
      publicProfessionalId: professionalId,
    };
  } catch {
    return { publicName: 'Médico Validador', isSupervisorName: false, publicProfessionalId: professionalId };
  }
}

/**
 * Versión síncrona para uso en listas y tablas.
 * Requiere que se hayan cargado los datos del profesional con su supervisor.
 *
 * @param professional - Objeto del profesional (con supervisorName precargado si aplica)
 * @param supervisorName - Nombre del supervisor (si ya está disponible en memoria)
 */
export function resolvePublicSignatureNameSync(params: {
  clinicalRole?: string;
  ownName: string;
  supervisorName?: string;
  publicNameAllowed?: boolean;
}): string {
  const { clinicalRole, ownName, supervisorName, publicNameAllowed } = params;

  // Si explícitamente marcado como no público, usar supervisor
  if (publicNameAllowed === false || HIDDEN_ROLES.includes(clinicalRole as ClinicalRole)) {
    return supervisorName || 'Médico Validador';
  }

  // MED_STAFF y MED_CHIEF firman con su nombre
  if (!clinicalRole || PUBLIC_SIGNER_ROLES.includes(clinicalRole as ClinicalRole)) {
    return ownName;
  }

  // Resto: sin nombre público
  return 'Médico Validador';
}

/**
 * Genera la etiqueta de rol legible para el usuario (UI interna).
 * NOTA: Esta etiqueta SOLO es para uso interno. NO imprimirla en documentos externos.
 */
export function getClinicalRoleLabel(role: string | undefined): string {
  const labels: Record<string, string> = {
    MED_STAFF: 'Médico Radiólogo',
    MED_CHIEF: 'Médico Jefe',
    MED_RESIDENT: 'Residente / Becado',
    MED_REQUIRES_COSIGN: 'Requiere Co-firma',
    ADMIN_SECRETARY: 'Secretaría Especializada',
    TECH_SUPPORT: 'Soporte Técnico',
    COORDINATOR: 'Coordinador Operativo',
  };
  return labels[role ?? ''] ?? role ?? '—';
}

/**
 * Máscara PHI para entornos TECH_SUPPORT.
 * Enmascara nombres propios y RUTs preservando el primer carácter.
 */
export function maskPHI(value: string | null | undefined): string {
  if (!value) return '***';
  // Enmascarar cada palabra: primer carácter + asteriscos
  return value.replace(/\b(\w)\w+/g, '$1***');
}

/**
 * Enmascara un RUT/ID dejando visibles solo los primeros 3 y el último dígito.
 */
export function maskRUT(rut: string | null | undefined): string {
  if (!rut) return '***';
  const clean = rut.replace(/\D/g, '');
  if (clean.length <= 4) return '***';
  return clean.substring(0, 3) + '****' + clean[clean.length - 1];
}
