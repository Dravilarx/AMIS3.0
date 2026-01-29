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
    BarChart2,
    Layout,
    List as ListIcon
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useProjects } from '../../hooks/useProjects';
import { useTenders } from '../../hooks/useTenders';
import { useBPMTasks } from '../../hooks/useBPMTasks';
import { useProfessionals } from '../../hooks/useProfessionals';
import { Loader2, Link as LinkIcon, AlertCircle } from 'lucide-react';
import { ProjectModal } from './ProjectModal';
import { ProjectKanban } from './ProjectKanban';
import { BPMTaskModal } from './BPMTaskModal';
import type { Project, BPMTask } from '../../types/core';

export const ProjectBPM: React.FC = () => {
    const { projects, loading: projectsLoading, error: projectsError, addProject, updateProject } = useProjects();
    const { tasks, addTask, updateTask, loading: tasksLoading } = useBPMTasks();
    const { tenders } = useTenders();
    const { professionals } = useProfessionals();

    const [activeTab, setActiveTab] = useState<'projects' | 'tasks'>('projects');
    const [taskViewMode, setTaskViewMode] = useState<'kanban' | 'list'>('kanban');

    // Modals state
    const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);

    // Selection state
    const [selectedProject, setSelectedProject] = useState<Project | null>(null);
    const [selectedTask, setSelectedTask] = useState<BPMTask | null>(null);
    const [defaultTaskStatus, setDefaultTaskStatus] = useState<BPMTask['status'] | undefined>();
    const [filterProjectId, setFilterProjectId] = useState<string | 'all'>('all');

    const filteredTasks = filterProjectId === 'all'
        ? tasks
        : tasks.filter(t => t.projectId === filterProjectId);

    const getProfessionalName = (id: string) => {
        const prof = professionals.find(p => p.id === id);
        return prof ? `${prof.name} ${prof.lastName}` : id;
    };

    const handleProjectSave = async (data: Partial<Project>) => {
        if (selectedProject) {
            const result = await updateProject(selectedProject.id, data);
            return { success: result.success, error: result.error };
        }
        const result = await addProject(data);
        return { success: result.success, error: result.error };
    };

    const handleTaskSave = async (data: Partial<BPMTask>) => {
        if (selectedTask) {
            const result = await updateTask(selectedTask.id, data);
            return { success: result.success, error: result.error };
        }
        const result = await addTask(data);
        return { success: result.success, error: result.error };
    };

    const handleEditProject = (project: Project) => {
        setSelectedProject(project);
        setIsProjectModalOpen(true);
    };

    const handleEditTask = (task: BPMTask) => {
        setSelectedTask(task);
        setIsTaskModalOpen(true);
    };

    const handleAddTask = (status?: BPMTask['status']) => {
        setSelectedTask(null);
        setDefaultTaskStatus(status);
        setIsTaskModalOpen(true);
    };

    if (projectsLoading || tasksLoading) return (
        <div className="flex flex-col items-center justify-center h-96">
            <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-4" />
            <p className="text-white/40 font-mono text-sm uppercase tracking-widest">Sincronizando con Portezuelo Cloud...</p>
        </div>
    );

    if (projectsError) return (
        <div className="p-12 text-center card-premium border-red-500/20">
            <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-4" />
            <p className="text-red-400 font-bold uppercase tracking-tighter">Error de Conexión BPM</p>
            <p className="text-white/20 text-xs mt-1">{projectsError}</p>
        </div>
    );

    return (
        <div className="space-y-6 animate-in fade-in duration-700">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-black text-white/90 tracking-tighter uppercase">BPM & Control de Proyectos</h2>
                    <p className="text-xs text-white/40 font-mono uppercase tracking-widest">Portezuelo Privacy Layer & AI Summaries (M7)</p>
                </div>
                <div className="flex gap-2">
                    {activeTab === 'projects' ? (
                        <button
                            onClick={() => {
                                setSelectedProject(null);
                                setIsProjectModalOpen(true);
                            }}
                            className="flex items-center gap-2 px-4 py-2 bg-white text-black hover:bg-white/90 rounded-xl text-xs font-black uppercase tracking-tight transition-all"
                        >
                            <Plus className="w-4 h-4" /> Nuevo Proyecto
                        </button>
                    ) : (
                        <button
                            onClick={() => handleAddTask()}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white hover:bg-blue-500 rounded-xl text-xs font-black uppercase tracking-tight transition-all shadow-lg shadow-blue-500/20"
                        >
                            <Plus className="w-4 h-4" /> Nueva Tarea
                        </button>
                    )}
                </div>
            </div>

            {/* Tabs & View Controls */}
            <div className="flex items-center justify-between">
                <div className="flex gap-1 p-1 bg-white/5 border border-white/10 rounded-xl w-fit">
                    <button
                        onClick={() => setActiveTab('projects')}
                        className={cn(
                            "px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                            activeTab === 'projects' ? "bg-white/10 text-white" : "text-white/40 hover:text-white/60"
                        )}
                    >
                        Proyectos
                    </button>
                    <button
                        onClick={() => setActiveTab('tasks')}
                        className={cn(
                            "px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                            activeTab === 'tasks' ? "bg-white/10 text-white" : "text-white/40 hover:text-white/60"
                        )}
                    >
                        Tareas BPM
                    </button>
                </div>

                {activeTab === 'tasks' && (
                    <div className="flex items-center gap-3">
                        <select
                            className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-widest text-white/60 focus:border-blue-500/50 outline-none transition-all appearance-none"
                            value={filterProjectId}
                            onChange={(e) => setFilterProjectId(e.target.value)}
                        >
                            <option value="all" className="bg-neutral-900">Todos los Proyectos</option>
                            {projects.map(p => (
                                <option key={p.id} value={p.id} className="bg-neutral-900">{p.name}</option>
                            ))}
                        </select>

                        <div className="flex gap-1 p-1 bg-white/5 border border-white/10 rounded-xl">
                            <button
                                onClick={() => setTaskViewMode('kanban')}
                                className={cn(
                                    "p-2 rounded-lg transition-all",
                                    taskViewMode === 'kanban' ? "bg-white/10 text-white" : "text-white/20 hover:text-white/40"
                                )}
                                title="Vista Kanban"
                            >
                                <Layout className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setTaskViewMode('list')}
                                className={cn(
                                    "p-2 rounded-lg transition-all",
                                    taskViewMode === 'list' ? "bg-white/10 text-white" : "text-white/20 hover:text-white/40"
                                )}
                                title="Vista Lista"
                            >
                                <ListIcon className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <div className={cn("lg:col-span-3 space-y-4", activeTab === 'tasks' && taskViewMode === 'kanban' && "lg:col-span-4")}>
                    {activeTab === 'projects' ? (
                        <div className="grid gap-4">
                            {projects.map((project) => (
                                <div
                                    key={project.id}
                                    onClick={() => {
                                        setFilterProjectId(project.id);
                                        setActiveTab('tasks');
                                    }}
                                    className="card-premium group hover:border-blue-500/30 transition-all cursor-pointer"
                                >
                                    <div className="flex items-start justify-between mb-6">
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-3">
                                                <h4 className="text-lg font-black text-white/90 tracking-tight group-hover:text-blue-400 transition-colors">{project.name}</h4>
                                                <span className={cn(
                                                    "flex items-center gap-1 text-[8px] px-2 py-0.5 rounded font-black uppercase tracking-widest border",
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

                                            <div className="flex flex-wrap items-center gap-4">
                                                <div className="flex items-center gap-1.5 text-[9px] text-white/30 font-mono uppercase tracking-widest">
                                                    <span>ID: {project.id}</span>
                                                </div>
                                                <div className="h-3 w-px bg-white/10" />
                                                <div className="flex items-center gap-1.5 text-[9px] text-white/30 font-mono uppercase tracking-widest">
                                                    <span>Inicio: {project.startDate}</span>
                                                </div>
                                                {project.tenderId && (
                                                    <>
                                                        <div className="h-3 w-px bg-white/10" />
                                                        <div className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded-md">
                                                            <LinkIcon className="w-3 h-3 text-emerald-400" />
                                                            <span className="text-[8px] font-black text-emerald-400 uppercase tracking-widest">Licitación: {project.tenderId}</span>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleEditProject(project);
                                            }}
                                            className="p-2 text-white/20 hover:text-white transition-colors"
                                        >
                                            <MoreVertical className="w-5 h-5" />
                                        </button>
                                    </div>

                                    <div className="space-y-4">
                                        <div>
                                            <div className="flex justify-between text-[10px] mb-2">
                                                <span className="text-white/30 uppercase font-black tracking-widest">Progreso de Ejecución</span>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[9px] text-white/20 font-mono">
                                                        {tasks.filter(t => t.projectId === project.id && t.status === 'completed').length} / {tasks.filter(t => t.projectId === project.id).length} Tareas
                                                    </span>
                                                    <span className="font-black text-blue-400">{project.progress}%</span>
                                                </div>
                                            </div>
                                            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden border border-white/5 p-[1px]">
                                                <div
                                                    className="h-full bg-gradient-to-r from-blue-600 to-indigo-400 rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(59,130,246,0.5)]"
                                                    style={{ width: `${project.progress}%` }}
                                                />
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap gap-2">
                                            {project.tags.map((tag, i) => (
                                                <span key={i} className="text-[9px] px-2 py-0.5 bg-white/5 border border-white/10 rounded font-bold text-white/40 group-hover:text-white/60 transition-colors">
                                                    #{tag}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {projects.length === 0 && (
                                <div className="text-center py-24 bg-white/[0.02] rounded-3xl border-2 border-dashed border-white/5">
                                    <Layers className="w-12 h-12 text-white/10 mx-auto mb-4" />
                                    <p className="text-white/40 font-bold uppercase tracking-widest text-sm">No hay proyectos activos</p>
                                    <p className="text-white/10 text-[10px] mt-2 italic font-mono">Inicia un proyecto desde una licitación ganada</p>
                                </div>
                            )}
                        </div>
                    ) : (
                        taskViewMode === 'kanban' ? (
                            <ProjectKanban
                                tasks={filteredTasks}
                                professionals={professionals}
                                onTaskUpdate={updateTask}
                                onTaskClick={handleEditTask}
                                onAddTask={handleAddTask}
                            />
                        ) : (
                            <div className="space-y-3">
                                {filteredTasks.map((task) => (
                                    <div
                                        key={task.id}
                                        onClick={() => handleEditTask(task)}
                                        className="card-premium p-4 border-white/5 hover:border-blue-500/20 transition-all cursor-pointer"
                                    >
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
                                                    <h5 className="font-bold text-white/90 group-hover:text-blue-400 transition-colors">{task.title}</h5>
                                                    <p className="text-[10px] text-white/40 font-mono">
                                                        Responsable: {getProfessionalName(task.assignedTo)} | Vence: {task.dueDate}
                                                        {task.subtasks && task.subtasks.length > 0 && (
                                                            <span className="ml-2 text-blue-400/60 font-black">
                                                                [{task.subtasks.filter(st => st.completed).length}/{task.subtasks.length} SUBTAREAS]
                                                            </span>
                                                        )}
                                                    </p>
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

                                        {task.progress !== undefined && task.progress > 0 && (
                                            <div className="mt-3 px-14">
                                                <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-blue-500/50 transition-all duration-700"
                                                        style={{ width: `${task.progress}%` }}
                                                    />
                                                </div>
                                            </div>
                                        )}

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
                                {filteredTasks.length === 0 && (
                                    <div className="text-center py-24 bg-white/[0.02] rounded-3xl border-2 border-dashed border-white/5">
                                        <Layers className="w-12 h-12 text-white/10 mx-auto mb-4" />
                                        <p className="text-white/40 font-bold uppercase tracking-widest text-sm">No hay tareas pendientes</p>
                                    </div>
                                )}
                            </div>
                        )
                    )}
                </div>

                {/* Metrics Sidebar - hidden on Kanban for more space */}
                {!(activeTab === 'tasks' && taskViewMode === 'kanban') && (
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
                )}
            </div>

            {/* Modals */}
            <ProjectModal
                isOpen={isProjectModalOpen}
                initialData={selectedProject}
                existingProjects={projects}
                tenders={tenders}
                onClose={() => {
                    setIsProjectModalOpen(false);
                    setSelectedProject(null);
                }}
                onSave={handleProjectSave}
            />

            <BPMTaskModal
                isOpen={isTaskModalOpen}
                initialData={selectedTask}
                projects={projects}
                professionals={professionals}
                defaultStatus={defaultTaskStatus}
                onClose={() => {
                    setIsTaskModalOpen(false);
                    setSelectedTask(null);
                    setDefaultTaskStatus(undefined);
                }}
                onSave={handleTaskSave}
            />
        </div>
    );
};
