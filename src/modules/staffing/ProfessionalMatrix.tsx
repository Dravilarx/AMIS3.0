import React, { useState } from 'react';
import { MapPin, Briefcase, GraduationCap, Search, Plus, Filter, LayoutGrid, List } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { Professional } from '../../types/core';
import { useCapacityPlanning } from './useCapacityPlanning';
import type { Tender } from '../../types/tenders';

// Mock de licitaciones activas para el cálculo de capacidad
const MOCK_ACTIVE_TENDERS: Tender[] = [
    {
        id: 'TEN-001',
        volumen: { total: 1200, urgencia: 0, hospitalizado: 0, ambulante: 0 },
        identificacion: { modalidad: '', tipoServicio: '', duracion: '' },
        riesgoSLA: { escala: 5, impacto: '' },
        multas: { caidaSistema: 0, errorDiagnostico: 0, confidencialidad: 0, topePorcentualContrato: 0 },
        integracion: { dicom: false, hl7: false, risPacs: false, servidorOnPrem: false },
        economia: { presupuestoTotal: 0, precioUnitarioHabil: 0, precioUnitarioUrgencia: 0, margenProyectado: 0 }
    }
];

// Mock de profesionales para la matriz
const MOCK_PROFESSIONALS: Professional[] = [
    {
        id: 'PROF-001',
        name: 'Dr. Alejandro Vargas',
        email: 'a.vargas@boreal.cl',
        nationalId: '12.345.678-9',
        role: 'Radiólogo',
        status: 'active',
        residence: { city: 'Santiago', region: 'RM' },
        competencies: ['RM Próstata', 'TC Coronario', 'Telemedicina'],
        contracts: [{ company: 'Boreal', amount: 3500000, type: 'Planta' }]
    },
    {
        id: 'PROF-002',
        name: 'Dra. María Paz',
        email: 'm.ruiz@amis.cl', // Keeping original email as it was not specified in the instruction to change
        nationalId: '15.444.333-2',
        role: 'TENS',
        status: 'active',
        residence: { city: 'Viña del Mar', region: 'V' },
        competencies: ['Dermatología', 'Ecografía'],
        contracts: [{ company: 'Amis', amount: 2800000, type: 'Honorarios' }]
    },
    {
        id: 'PROF-003',
        name: 'Dr. Roberto Méndez',
        email: 'r.mendez@soran.cl',
        nationalId: '10.222.111-0',
        role: 'Radiólogo',
        status: 'inhabilitado',
        registrationExpiry: '2026-01-20',
        residence: { city: 'Concepción', region: 'VIII' },
        competencies: ['RM Cerebral', 'Urgencias'],
        contracts: [{ company: 'Soran', amount: 4200000, type: 'Planta' }]
    },
    {
        id: 'PROF-004',
        name: 'Dra. Elena Castro',
        email: 'e.castro@vitalmedica.cl',
        nationalId: '18.999.888-7',
        role: 'Radiólogo',
        status: 'active',
        residence: { city: 'Santiago', region: 'RM' },
        competencies: ['Gestión Salud', 'Informes Críticos'],
        contracts: [{ company: 'Vitalmédica', amount: 3100000, type: 'Planta' }]
    }
];

const CURRENT_SEDE_CITY = 'Santiago';

export const ProfessionalMatrix: React.FC = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

    const { utilizationRate, capacityGap, isOverloaded } = useCapacityPlanning(MOCK_PROFESSIONALS, MOCK_ACTIVE_TENDERS);

    const filteredProfessionals = MOCK_PROFESSIONALS.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.competencies.some(c => c.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="card-premium">
                    <p className="text-[10px] text-white/40 uppercase font-bold tracking-widest mb-1">Utilización del Staff</p>
                    <div className="flex items-center justify-between">
                        <span className={cn("text-2xl font-black", isOverloaded ? "text-red-400" : "text-emerald-400")}>
                            {utilizationRate.toFixed(1)}%
                        </span>
                        <div className="w-24 h-2 bg-white/5 rounded-full overflow-hidden">
                            <div className={cn("h-full transition-all", isOverloaded ? "bg-red-500" : "bg-emerald-500")} style={{ width: `${Math.min(utilizationRate, 100)}%` }} />
                        </div>
                    </div>
                </div>
                <div className="card-premium">
                    <p className="text-[10px] text-white/40 uppercase font-bold tracking-widest mb-1">Gap de Cobertura</p>
                    <div className="flex items-center justify-between">
                        <span className="text-2xl font-black">{capacityGap > 0 ? `+${capacityGap.toFixed(0)}h` : `${capacityGap.toFixed(0)}h`}</span>
                        <span className="text-[10px] text-white/40">Disponible p/ mes</span>
                    </div>
                </div>
                <div className="card-premium bg-blue-500/5 border-blue-500/20">
                    <p className="text-[10px] text-blue-400 uppercase font-bold tracking-widest mb-1">Sugerencia AI (Agrawall)</p>
                    <p className="text-xs text-blue-300/80 italic">"Se recomienda contratar 1 Radiólogo adicional para cubrir la licitación TEN-001 sin sobrecargar al equipo actual."</p>
                </div>
            </div>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold">Matriz de Profesionales</h2>
                    <p className="text-white/40 text-sm">Gestión de competencias y logística del holding</p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                        <input
                            type="text"
                            placeholder="Buscar por nombre o competencia..."
                            className="bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-blue-500/50 w-64 transition-all"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button className="p-2 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors">
                        <Filter className="w-4 h-4 text-white/60" />
                    </button>
                    <div className="flex border border-white/10 rounded-lg overflow-hidden">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={cn("p-2 transition-colors", viewMode === 'grid' ? "bg-white/10 text-white" : "bg-transparent text-white/40 hover:text-white")}
                        >
                            <LayoutGrid className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={cn("p-2 transition-colors", viewMode === 'list' ? "bg-white/10 text-white" : "bg-transparent text-white/40 hover:text-white")}
                        >
                            <List className="w-4 h-4" />
                        </button>
                    </div>
                    <button className="flex items-center gap-2 px-4 py-2 bg-white text-black hover:bg-white/90 rounded-lg transition-all font-medium text-sm">
                        <Plus className="w-4 h-4" />
                        <span>Añadir Profesional</span>
                    </button>
                </div>
            </div>

            <div className={cn(
                "grid gap-6",
                viewMode === 'grid' ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-4" : "grid-cols-1"
            )}>
                {filteredProfessionals.map((prof) => (
                    <div key={prof.id} className={cn(
                        "card-premium group hover:border-blue-500/30 transition-all duration-300",
                        viewMode === 'list' && "flex flex-row items-center gap-8 py-4"
                    )}>
                        <div className={cn(
                            "flex flex-col",
                            viewMode === 'list' ? "flex-1" : "space-y-4"
                        )}>
                            <div className="flex items-start justify-between">
                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-white/10 to-white/5 border border-white/10 flex items-center justify-center text-xl font-bold">
                                    {prof.name[0]}
                                </div>
                                <div className="flex flex-col items-end gap-1">
                                    <span className="text-[10px] font-bold text-blue-400 bg-blue-400/10 px-2 py-0.5 rounded uppercase tracking-wider">
                                        {prof.contracts[0].company}
                                    </span>
                                    {prof.residence.city !== CURRENT_SEDE_CITY && (
                                        <span className="text-[8px] font-black text-amber-500 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded-full uppercase tracking-tighter animate-pulse">
                                            REQUIERE TRASLADO
                                        </span>
                                    )}
                                    {prof.status !== 'active' && (
                                        <span className="text-[8px] font-black text-red-500 bg-red-500/10 border border-red-500/20 px-1.5 py-0.5 rounded-full uppercase tracking-tighter">
                                            {prof.status}
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className={viewMode === 'list' ? "flex flex-row items-center gap-8" : "space-y-4"}>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <h4 className="font-bold text-lg group-hover:text-blue-400 transition-colors">{prof.name}</h4>
                                        <span className="text-[10px] text-white/20 font-mono">{prof.nationalId}</span>
                                    </div>
                                    <p className="text-white/40 text-xs mb-4">{prof.email}</p>
                                </div>

                                <div className={cn("space-y-2", viewMode === 'list' && "flex flex-row items-center gap-8 mb-4")}>
                                    <div className="flex items-center gap-2 text-xs text-white/60">
                                        <MapPin className="w-3 h-3 text-white/20" />
                                        <span>{prof.residence.city}, {prof.residence.region}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-white/60">
                                        <Briefcase className="w-3 h-3 text-white/20" />
                                        <span>{prof.contracts.length} Contrato(s)</span>
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-white/5">
                                    <div className="flex items-center gap-2 mb-2">
                                        <GraduationCap className="w-3 h-3 text-white/20" />
                                        <span className="text-[10px] uppercase font-bold text-white/40 tracking-widest">Competencias</span>
                                    </div>
                                    <div className="flex flex-wrap gap-1">
                                        {prof.competencies.map((comp, i) => (
                                            <span key={i} className="text-[9px] bg-white/5 border border-white/10 px-1.5 py-0.5 rounded text-white/80">
                                                {comp}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
