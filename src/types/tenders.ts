/**
 * @file tenders.ts
 * @description Estructura de datos para la Matriz de Licitaciones de AMIS 3.0.
 * "Única Verdad Contractual" - Refleja fielmente los campos del Excel de gestión real.
 */

/**
 * Escala de riesgo del SLA.
 * 0: Sin riesgo definido
 * 8: Crítico (< 2 horas de respuesta)
 */
export type SLARiskScale = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export interface Tender {
    id: string;

    /** Identificación del servicio */
    identificacion: {
        /** Modalidad (e.g., Presencial, Telemedicina) */
        modalidad: string;
        /** Tipo de servicio (e.g., Radiología, Cardiología) */
        tipoServicio: string;
        /** Duración del contrato o proyecto */
        duracion: string;
    };

    /** Volumen proyectado y actual */
    volumen: {
        /** Cantidad total esperada */
        total: number;
        /** Volumen de casos de urgencia */
        urgencia: number;
        /** Casos de pacientes hospitalizados */
        hospitalizado: number;
        /** Casos de pacientes ambulatorios */
        ambulante: number;
    };

    /** Riesgo Operativo y SLA */
    riesgoSLA: {
        /** Escala de 0 a 8. Ej: <2h = 8, 2-4h = 7, 4-6h = 6... */
        escala: SLARiskScale;
        /** Descripción del impacto de incumplimiento */
        impacto?: string;
    };

    /** Penalizaciones y Multas (con topes porcentuales) */
    multas: {
        /** Porcentaje de multa por caída de sistema */
        caidaSistema: number;
        /** Porcentaje de multa por error en diagnóstico */
        errorDiagnostico: number;
        /** Porcentaje de multa por brecha de confidencialidad */
        confidencialidad: number;
        /** Límite máximo de multas sobre el monto del contrato */
        topePorcentualContrato: number;
    };

    /** Requerimientos de infraestructura y software */
    integracion: {
        /** Compatibilidad Dicom */
        dicom: boolean;
        /** Estándar HL7 */
        hl7: boolean;
        /** Acceso a RIS/PACS */
        risPacs: boolean;
        /** Necesidad de servidor físico en el recinto */
        servidorOnPrem: boolean;
    };

    /** Viabilidad económica */
    economia: {
        /** Presupuesto total asignado */
        presupuestoTotal: number;
        /** Precio por informe en horario hábil */
        precioUnitarioHabil: number;
        /** Precio por informe en horario de urgencia */
        precioUnitarioUrgencia: number;
        /** Porcentaje de margen esperado */
        margenProyectado: number;
    };
}
