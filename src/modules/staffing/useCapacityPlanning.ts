import { useMemo } from 'react';
import type { Professional } from '../../types/core';
import type { Tender } from '../../types/tenders';

/**
 * Hook para calcular la relación entre la capacidad del staff actual y la demanda de licitaciones.
 * Permite visualizar el "gap" de cobertura por competencia y zona.
 */
export const useCapacityPlanning = (professionals: Professional[], activeTenders: Tender[]) => {
    const planning = useMemo(() => {
        // 1. Calcular capacidad total disponible (estimado: 160h por profesional de planta)
        const totalStaffHours = professionals.length * 160;

        // 2. Calcular demanda total de las licitaciones (volumen total / rendimiento promedio)
        // Rendimiento promedio estimado: 2 informes/consultas por hora
        const totalDemandVolume = activeTenders.reduce((acc, t) => acc + t.volumen.total, 0);
        const requiredHours = totalDemandVolume / 2;

        const capacityGap = totalStaffHours - requiredHours;
        const utilizationRate = totalStaffHours > 0 ? (requiredHours / totalStaffHours) * 100 : 0;

        // 3. Distribución por competencias
        const competenciesCoverage = professionals.reduce((acc: Record<string, number>, p) => {
            p.competencies.forEach(c => {
                acc[c] = (acc[c] || 0) + 1;
            });
            return acc;
        }, {});

        return {
            totalStaffHours,
            requiredHours,
            capacityGap,
            utilizationRate,
            competenciesCoverage,
            isOverloaded: utilizationRate > 90,
            professionalsCount: professionals.length,
            tendersCount: activeTenders.length
        };
    }, [professionals, activeTenders]);

    return planning;
};
