import { useMemo } from 'react';
import type { Tender } from '../../types/tenders';

interface ProductionMix {
    habil: number;    // e.g., 0.6 (60%)
    urgencia: number; // e.g., 0.3 (30%)
    festivo: number;  // e.g., 0.1 (10%)
}

/**
 * Hook para el cálculo de scoring de licitaciones.
 * Implementa la lógica de la Matriz de Riesgo y Viabilidad Económica.
 */
export const useTenderScoring = (tender: Tender, staffCapacity: number) => {

    // 1. Puntaje de Riesgo (Escala 0-8)
    // Basado en riesgoSLA.escala ya definido en el tipo
    const riskScore = tender.riesgoSLA.escala;

    // 2. Margen Real Proyectado
    const scoring = useMemo(() => {
        const { total, urgencia, ambulante, hospitalizado } = tender.volumen;
        const { precioUnitarioHabil, precioUnitarioUrgencia } = tender.economia;

        // Mix dinámico (podría venir de parámetros, aquí usamos uno base)
        const mix: ProductionMix = {
            habil: (ambulante + hospitalizado) / total || 0.7,
            urgencia: urgencia / total || 0.3,
            festivo: 0, // Por ahora simplificado
        };

        const ingresosProyectados = (
            (total * mix.habil * precioUnitarioHabil) +
            (total * mix.urgencia * precioUnitarioUrgencia)
        );

        // 3. Costos Incrementales
        // Si el volumen total supera la capacidad actual, se asume costo de contratación
        const exceedsCapacity = total > staffCapacity;
        const initialCosts = 0.65; // Margen operativo base del 35%
        const incrementalCostFactor = exceedsCapacity ? 0.15 : 0; // Penalización del 15% por nueva contratación

        const costRatio = initialCosts + incrementalCostFactor;
        const totalCostproyectado = ingresosProyectados * costRatio;

        const realMargin = ingresosProyectados > 0
            ? ((ingresosProyectados - totalCostproyectado) / ingresosProyectados) * 100
            : 0;

        // 4. Semáforo de Decisión
        let decision: 'PARTICIPAR' | 'REVISAR' | 'NO_PARTICIPAR' = 'REVISAR';

        if (riskScore <= 3 && realMargin >= 25) {
            decision = 'PARTICIPAR';
        } else if (riskScore >= 7 || realMargin < 15) {
            decision = 'NO_PARTICIPAR';
        }

        return {
            ingresosProyectados,
            totalCostproyectado,
            realMargin,
            decision,
            isOverCapacity: exceedsCapacity
        };
    }, [tender, staffCapacity]);

    return {
        riskScore,
        ...scoring
    };
};
