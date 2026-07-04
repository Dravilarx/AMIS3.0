// ─────────────────────────────────────────────────────────────────────────────
// Tipos del sistema de firma electrónica (rediseño completo).
// Espejo de doc_firma_solicitudes / doc_firma_firmantes (BD, no tocar SQL).
// ─────────────────────────────────────────────────────────────────────────────

export type EstadoSolicitud = 'pendiente' | 'completada' | 'vencida' | 'anulada';
export type EstadoFirmante = 'pendiente' | 'firmado';

export interface FirmanteRow {
    id: string;
    solicitudId: string;
    userId: string;
    userName?: string; // resuelto vía profiles_publicos, client-side
    pagina: number;      // 0-based
    posX: number;        // fracción 0-1, origen arriba-izquierda
    posY: number;
    ancho: number;       // fracción 0-1
    alto: number;
    estado: EstadoFirmante;
    firmadoAt: string | null;
    fingerprint: string | null;
}

export interface SolicitudRow {
    id: string;
    documentId: string;
    solicitante: string;
    solicitanteName?: string;
    mensaje: string | null;
    plazo: string | null; // date
    estado: EstadoSolicitud;
    createdAt: string;
    firmantes: FirmanteRow[];
}

// Posición en edición dentro del modal "Enviar a firmar" (antes de guardar).
export interface PosicionEnEdicion {
    userId: string;
    userName: string;
    color: string;
    pagina: number;
    posX: number;
    posY: number;
    ancho: number;
    alto: number;
}

// Recuadro fijo de tamaño relativo usado como default al soltar un firmante.
export const RECUADRO_DEFAULT = { ancho: 0.28, alto: 0.07 };

// Límites de redimensionado (fracción de la página): evita una firma
// microscópica ilegible o un recuadro que tape media página.
export const RECUADRO_MIN = { ancho: 0.08, alto: 0.03 };
export const RECUADRO_MAX = { ancho: 0.60, alto: 0.25 };

export const COLORES_FIRMANTES = [
    '#3b82f6', // blue
    '#22c55e', // green
    '#f97316', // orange
    '#a855f7', // purple
    '#ec4899', // pink
    '#14b8a6', // teal
    '#eab308', // yellow
    '#ef4444', // red
];
