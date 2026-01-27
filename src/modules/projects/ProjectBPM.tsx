import React, { useState } from 'react';
import {
    Layers,
    Plus,
    MoreVertical,
    Lock,
    Globe,
    Shield,
    MessageSquareText,
    Sparkles,
    BarChart2
} from 'lucide-react';
import { cn } from '../../lib/utils';
import type { Project, BPMTask } from '../../types/core';

const MOCK_PROJECTS: Project[] = [
    {
        id: 'PRJ-001',
        name: 'Implementación PACS Sede Norte',
        holdingId: 'HOLD-01',
        managerId: 'USR-01',
        status: 'active',
        progress: 65,
        privacyLevel: 'confidential',
        startDate: '2026-01-01',
        tags: ['Infraestructura', 'PACS']
    },
    {
        id: 'PRJ-002',
        name: 'Renovación Contratos Resomag',
        holdingId: 'HOLD-01',
        managerId: 'USR-02',
        status: 'on-hold',
        progress: 20,
        privacyLevel: 'private',
        startDate: '2026-01-15',
        tags: ['Legal', 'Contracts']
    }
];

const MOCK_TASKS: BPMTask[] = [
    {
        id: 'TSK-101',
        projectId: 'PRJ-001',
        title: 'Validación de redundancia de red',
        assignedTo: 'USR-01',
        status: 'in-progress',
        priority: 'high',
        dueDate: '2026-01-28',
        aiSummary: 'La latencia en el nodo 4 indica posible cuello de botella. Se sugiere escalamiento técnico.'
    },
    {
        id: 'TSK-102',
        projectId: 'PRJ-001',
        title: 'Migración base de datos DICOM',
        assignedTo: 'USR-05',
        status: 'pending',
        priority: 'critical',
        dueDate: '2026-02-01'
    }
];

export const ProjectBPM: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'projects' | 'tasks'>('projects');

    return (
        <div className="space-y-6 animate-in fade-in duration-700">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold">BPM & Control de Proyectos</h2>
                    <p className="text-white/40 text-sm italic">Portezuelo Privacy Layer & AI Summaries (M7)</p>
                </div>
                <div className="flex gap-2">
                    <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-bold transition-all">
                        <Plus className="w-4 h-4" /> Nuevo Proyecto
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 p-1 bg-white/5 border border-white/10 rounded-xl w-fit">
                <button
                    onClick={() => setActiveTab('projects')}
                    className={cn(
                        "px-6 py-2 rounded-lg text-sm font-bold transition-all",
                        activeTab === 'projects' ? "bg-white/10 text-white" : "text-white/40 hover:text-white/60"
                    )}
                >
                    Proyectos
                </button>
                <button
                    onClick={() => setActiveTab('tasks')}
                    className={cn(
                        "px-6 py-2 rounded-lg text-sm font-bold transition-all",
                        activeTab === 'tasks' ? "bg-white/10 text-white" : "text-white/40 hover:text-white/60"
                    )}
                >
                    Tareas BPM
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <div className="lg:col-span-3 space-y-4">
                    {activeTab === 'projects' ? (
                        <div className="grid gap-4">
                            {MOCK_PROJECTS.map((project) => (
                                <div key={project.id} className="card-premium group hover:border-blue-500/30 transition-all">
                                    <div className="flex items-start justify-between mb-6">
                                        <div>
                                            <div className="flex items-center gap-3 mb-1">
                                                <h4 className="text-lg font-bold">{project.name}</h4>
                                                <span className={cn(
                                                    "flex items-center gap-1 text-[10px] px-2 py-0.5 rounded font-black uppercase tracking-widest border",
                                                    project.privacyLevel === 'confidential' ? 'text-red-400 border-red-500/20 bg-red-500/5' :
                                                        project.privacyLevel === 'private' ? 'text-orange-400 border-orange-500/20 bg-orange-500/5' :
                                                            'text-blue-400 border-blue-500/20 bg-blue-500/5'
                                                )}>
                                                    {project.privacyLevel === 'confidential' ? <Shield className="w-3 h-3" /> :
                                                        project.privacyLevel === 'private' ? <Lock className="w-3 h-3" /> :
                                                            <Globe className="w-3 h-3" />}
                                                    {project.privacyLevel}
                                                </span>
                                            </div>
                                            <div className="flex gap-4 text-xs text-white/40">
                                                <span>ID: {project.id}</span>
                                                <span>Inicio: {project.startDate}</span>
                                            </div>
                                        </div>
                                        <button className="p-2 text-white/20 hover:text-white transition-colors">
                                            <MoreVertical className="w-5 h-5" />
                                        </button>
                                    </div>

                                    <div className="space-y-4">
                                        <div>
                                            <div className="flex justify-between text-xs mb-2">
                                                <span className="text-white/40 uppercase font-black tracking-widest">Progreso</span>
                                                <span className="font-bold">{project.progress}%</span>
                                            </div>
                                            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-blue-500 transition-all duration-1000"
                                                    style={{ width: `${project.progress}%` }}
                                                />
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap gap-2">
                                            {project.tags.map((tag, i) => (
                                                <span key={i} className="text-[10px] px-2 py-0.5 bg-white/5 border border-white/5 rounded text-white/40">
                                                    #{tag}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {MOCK_TASKS.map((task) => (
                                <div key={task.id} className="card-premium p-4 border-white/5 hover:border-blue-500/20 transition-all">
                                    <div className="flex items-start justify-between">
                                        <div className="flex gap-4">
                                            <div className={cn(
                                                "w-10 h-10 rounded-lg flex items-center justify-center border",
                                                task.status === 'completed' ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-400' :
                                                    task.status === 'in-progress' ? 'border-blue-500/30 bg-blue-500/5 text-blue-400' :
                                                        'border-white/10 bg-white/5 text-white/40'
                                            )}>
                                                <Layers className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <h5 className="font-bold text-white/90">{task.title}</h5>
                                                <p className="text-xs text-white/40">Vence: {task.dueDate}</p>
                                            </div>
                                        </div>
                                        <span className={cn(
                                            "text-[9px] px-2 py-0.5 rounded font-black uppercase tracking-tighter border",
                                            task.priority === 'critical' ? 'text-red-400 border-red-500/20' :
                                                task.priority === 'high' ? 'text-orange-400 border-orange-500/20' :
                                                    'text-white/40 border-white/10'
                                        )}>
                                            {task.priority}
                                        </span>
                                    </div>

                                    {task.aiSummary && (
                                        <div className="mt-4 p-3 bg-blue-500/5 border border-blue-500/10 rounded-lg">
                                            <div className="flex items-center gap-1.5 mb-1 text-[10px] text-blue-400 font-bold uppercase tracking-widest">
                                                <Sparkles className="w-3 h-3" /> Resumen AI Agrawall
                                            </div>
                                            <p className="text-xs text-white/70 italic leading-relaxed">
                                                "{task.aiSummary}"
                                            </p>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="space-y-6">
                    <div className="card-premium">
                        <h3 className="font-bold mb-4 flex items-center gap-2">
                            <BarChart2 className="w-4 h-4 text-blue-400" /> Métricas BPM
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <p className="text-[10px] text-white/40 uppercase font-bold mb-2">KPI Entrega</p>
                                <div className="text-2xl font-bold">88.4%</div>
                            </div>
                            <div className="pt-4 border-t border-white/5">
                                <p className="text-[10px] text-white/40 uppercase font-bold mb-2">Cuellos de Botella</p>
                                <div className="text-sm font-medium text-orange-400">Validación Legal</div>
                            </div>
                        </div>
                    </div>

                    <div className="card-premium">
                        <h3 className="font-bold mb-4 flex items-center gap-2">
                            <MessageSquareText className="w-4 h-4 text-emerald-400" /> Actividad Reciente
                        </h3>
                        <div className="space-y-3">
                            {[
                                { user: 'Robert A.', act: 'completó validación PACS', time: '10m' },
                                { user: 'Maria P.', act: 'actualizó contrato RSG', time: '1h' },
                            ].map((act, i) => (
                                <div key={i} className="text-xs">
                                    <span className="font-bold text-white/80">{act.user}</span>{' '}
                                    <span className="text-white/40">{act.act}</span>{' '}
                                    <span className="text-[9px] text-blue-500/60 font-mono ml-1">{act.time}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
