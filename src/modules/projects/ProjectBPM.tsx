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
            <Loader2 className="w-10 h-10 text-info animate-spin mb-4" />
            <p className="text-prevenort-text/40 font-mono text-sm uppercase tracking-widest">Sincronizando con Portezuelo Cloud...</p>
        </div>
    );

    if (projectsError) return (
        <div className="p-12 text-center card-premium border-danger/20">
            <AlertCircle className="w-10 h-10 text-danger mx-auto mb-4" />
            <p className="text-danger font-bold uppercase tracking-tighter">Error de Conexión BPM</p>
            <p className="text-prevenort-text/20 text-xs mt-1">{projectsError}</p>
        </div>
    );

    return (
        <div className="space-y-6 animate-in fade-in duration-700">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-black text-prevenort-text tracking-tighter uppercase">BPM & Control de Proyectos</h2>
                    <p className="text-xs text-prevenort-text/40 font-mono uppercase tracking-widest">Portezuelo Privacy Layer & AI Summaries (M7)</p>
                </div>
                <div className="flex gap-2">
                    {activeTab === 'projects' ? (
                        <button
                            onClick={() => {
                                setSelectedProject(null);
                                setIsProjectModalOpen(true);
                            }}
                            className="flex items-center gap-2 px-4 py-2 bg-prevenort-text text-prevenort-bg hover:opacity-90 rounded-xl text-xs font-black uppercase tracking-tight transition-all"
                        >
                            <Plus className="w-4 h-4" /> Nuevo Proyecto
                        </button>
                    ) : (
                        <button
                            onClick={() => handleAddTask()}
                            className="flex items-center gap-2 px-4 py-2 bg-info text-white hover:opacity-90 rounded-xl text-xs font-black uppercase tracking-tight transition-all shadow-lg shadow-info/20"
                        >
                            <Plus className="w-4 h-4" /> Nueva Tarea
                        </button>
                    )}
                </div>
            </div>

            {/* Tabs & View Controls */}
            <div className="flex items-center justify-between">
                <div className="flex gap-1 p-1 bg-prevenort-surface border border-prevenort-border rounded-xl w-fit">
                    <button
                        onClick={() => setActiveTab('projects')}
                        className={cn(
                            "px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                            activeTab === 'projects' ? "bg-prevenort-primary/10 text-prevenort-primary border border-prevenort-primary/20" : "text-prevenort-text/40 hover:text-prevenort-text/60"
                        )}
                    >
                        Proyectos
                    </button>
                    <button
                        onClick={() => setActiveTab('tasks')}
                        className={cn(
                            "px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                            activeTab === 'tasks' ? "bg-prevenort-primary/10 text-prevenort-primary border border-prevenort-primary/20" : "text-prevenort-text/40 hover:text-prevenort-text/60"
                        )}
                    >
                        Tareas BPM
                    </button>
                </div>

                {activeTab === 'tasks' && (
                    <div className="flex items-center gap-3">
                        <select
                            className="bg-prevenort-surface border border-prevenort-border rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-widest text-prevenort-text/60 focus:border-info/50 outline-none transition-all appearance-none"
                            value={filterProjectId}
                            onChange={(e) => setFilterProjectId(e.target.value)}
                        >
                            <option value="all" className="bg-prevenort-surface text-prevenort-text">Todos los Proyectos</option>
                            {projects.map(p => (
                                <option key={p.id} value={p.id} className="bg-prevenort-surface text-prevenort-text">{p.name}</option>
                            ))}
                        </select>

                        <div className="flex gap-1 p-1 bg-prevenort-surface border border-prevenort-border rounded-xl">
                            <button
                                onClick={() => setTaskViewMode('kanban')}
                                className={cn(
                                    "p-2 rounded-lg transition-all",
                                    taskViewMode === 'kanban' ? "bg-prevenort-primary/10 text-prevenort-primary" : "text-prevenort-text/20 hover:text-prevenort-text/40"
                                )}
                                title="Vista Kanban"
                            >
                                <Layout className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setTaskViewMode('list')}
                                className={cn(
                                    "p-2 rounded-lg transition-all",
                                    taskViewMode === 'list' ? "bg-prevenort-primary/10 text-prevenort-primary" : "text-prevenort-text/20 hover:text-prevenort-text/40"
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
                                    className="card-premium group hover:border-info/30 transition-all cursor-pointer"
                                >
                                    <div className="flex items-start justify-between mb-6">
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-3">
                                                <h4 className="text-lg font-black text-prevenort-text tracking-tight group-hover:text-info transition-colors">{project.name}</h4>
                                                <span className={cn(
                                                    "flex items-center gap-1 text-[8px] px-2 py-0.5 rounded font-black uppercase tracking-widest border",
                                                    project.privacyLevel === 'confidential' ? 'text-danger border-danger/20 bg-danger/5' :
                                                        project.privacyLevel === 'private' ? 'text-warning border-warning/20 bg-warning/5' :
                                                            'text-info border-info/20 bg-info/5'
                                                )}>
                                                    {project.privacyLevel === 'confidential' ? <Shield className="w-3 h-3" /> :
                                                        project.privacyLevel === 'private' ? <Lock className="w-3 h-3" /> :
                                                            <Globe className="w-3 h-3" />}
                                                    {project.privacyLevel}
                                                </span>
                                            </div>

                                            <div className="flex flex-wrap items-center gap-4">
                                                <div className="flex items-center gap-1.5 text-[9px] text-prevenort-text/30 font-mono uppercase tracking-widest">
                                                    <span>ID: {project.id}</span>
                                                </div>
                                                <div className="h-3 w-px bg-prevenort-border" />
                                                <div className="flex items-center gap-1.5 text-[9px] text-prevenort-text/30 font-mono uppercase tracking-widest">
                                                    <span>Inicio: {project.startDate}</span>
                                                </div>
                                                {project.tenderId && (
                                                    <>
                                                        <div className="h-3 w-px bg-prevenort-border" />
                                                        <div className="flex items-center gap-1.5 px-2 py-0.5 bg-success/10 border border-success/20 rounded-md">
                                                            <LinkIcon className="w-3 h-3 text-success" />
                                                            <span className="text-[8px] font-black text-success uppercase tracking-widest">Licitación: {project.tenderId}</span>
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
                                            className="p-2 text-prevenort-text/20 hover:text-prevenort-text transition-colors"
                                        >
                                            <MoreVertical className="w-5 h-5" />
                                        </button>
                                    </div>

                                    <div className="space-y-4">
                                        <div>
                                            <div className="flex justify-between text-[10px] mb-2">
                                                <span className="text-prevenort-text/30 uppercase font-black tracking-widest">Progreso de Ejecución</span>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[9px] text-prevenort-text/20 font-mono">
                                                        {tasks.filter(t => t.projectId === project.id && t.status === 'completed').length} / {tasks.filter(t => t.projectId === project.id).length} Tareas
                                                    </span>
                                                    <span className="font-black text-info">{project.progress}%</span>
                                                </div>
                                            </div>
                                            <div className="h-1.5 w-full bg-prevenort-border/50 rounded-full overflow-hidden border border-prevenort-border p-[1px]">
                                                <div
                                                    className="h-full bg-gradient-to-r from-info to-indigo-400 rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(59,130,246,0.5)]"
                                                    style={{ width: `${project.progress}%` }}
                                                />
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap gap-2">
                                            {project.tags.map((tag, i) => (
                                                <span key={i} className="text-[9px] px-2 py-0.5 bg-prevenort-bg border border-prevenort-border rounded font-bold text-prevenort-text/40 group-hover:text-prevenort-text/60 transition-colors">
                                                    #{tag}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {projects.length === 0 && (
                                <div className="text-center py-24 bg-prevenort-surface rounded-3xl border-2 border-dashed border-prevenort-border">
                                    <Layers className="w-12 h-12 text-prevenort-text/10 mx-auto mb-4" />
                                    <p className="text-prevenort-text/40 font-bold uppercase tracking-widest text-sm">No hay proyectos activos</p>
                                    <p className="text-prevenort-text/20 text-[10px] mt-2 italic font-mono">Inicia un proyecto desde una licitación ganada</p>
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
                                        className="card-premium p-4 hover:border-info/20 transition-all cursor-pointer"
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="flex gap-4">
                                                <div className={cn(
                                                    "w-10 h-10 rounded-lg flex items-center justify-center border",
                                                    task.status === 'completed' ? 'border-success/30 bg-success/5 text-success' :
                                                        task.status === 'in-progress' ? 'border-info/30 bg-info/5 text-info' :
                                                            'border-prevenort-border bg-prevenort-surface text-prevenort-text/40'
                                                )}>
                                                    <Layers className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <h5 className="font-bold text-prevenort-text group-hover:text-info transition-colors">{task.title}</h5>
                                                    <p className="text-[10px] text-prevenort-text/40 font-mono">
                                                        Responsable: {getProfessionalName(task.assignedTo)} | Vence: {task.dueDate}
                                                        {task.subtasks && task.subtasks.length > 0 && (
                                                            <span className="ml-2 text-info/60 font-black">
                                                                [{task.subtasks.filter(st => st.completed).length}/{task.subtasks.length} SUBTAREAS]
                                                            </span>
                                                        )}
                                                    </p>
                                                </div>
                                            </div>
                                            <span className={cn(
                                                "text-[9px] px-2 py-0.5 rounded font-black uppercase tracking-tighter border",
                                                task.priority === 'critical' ? 'text-danger border-danger/20' :
                                                    task.priority === 'high' ? 'text-warning border-warning/20' :
                                                        'text-prevenort-text/40 border-prevenort-border'
                                            )}>
                                                {task.priority}
                                            </span>
                                        </div>

                                        {task.progress !== undefined && task.progress > 0 && (
                                            <div className="mt-3 px-14">
                                                <div className="h-1 w-full bg-prevenort-border/50 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-info/50 transition-all duration-700"
                                                        style={{ width: `${task.progress}%` }}
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        {task.aiSummary && (
                                            <div className="mt-4 p-3 bg-info/5 border border-info/10 rounded-lg">
                                                <div className="flex items-center gap-1.5 mb-1 text-[10px] text-info font-bold uppercase tracking-widest">
                                                    <Sparkles className="w-3 h-3" /> Resumen AI Agrawall
                                                </div>
                                                <p className="text-xs text-prevenort-text/70 italic leading-relaxed">
                                                    "{task.aiSummary}"
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                ))}
                                {filteredTasks.length === 0 && (
                                    <div className="text-center py-24 bg-prevenort-surface rounded-3xl border-2 border-dashed border-prevenort-border">
                                        <Layers className="w-12 h-12 text-prevenort-text/10 mx-auto mb-4" />
                                        <p className="text-prevenort-text/40 font-bold uppercase tracking-widest text-sm">No hay tareas pendientes</p>
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
                            <h3 className="font-bold mb-4 flex items-center gap-2 text-prevenort-text">
                                <BarChart2 className="w-4 h-4 text-info" /> Métricas BPM
                            </h3>
                            <div className="space-y-4">
                                <div>
                                    <p className="text-[10px] text-prevenort-text/40 uppercase font-bold mb-2">KPI Entrega</p>
                                    <div className="text-2xl font-bold text-prevenort-text">88.4%</div>
                                </div>
                                <div className="pt-4 border-t border-prevenort-border">
                                    <p className="text-[10px] text-prevenort-text/40 uppercase font-bold mb-2">Cuellos de Botella</p>
                                    <div className="text-sm font-medium text-warning">Validación Legal</div>
                                </div>
                            </div>
                        </div>

                        <div className="card-premium">
                            <h3 className="font-bold mb-4 flex items-center gap-2 text-prevenort-text">
                                <MessageSquareText className="w-4 h-4 text-success" /> Actividad Reciente
                            </h3>
                            <div className="space-y-3">
                                {[
                                    { user: 'Robert A.', act: 'completó validación PACS', time: '10m' },
                                    { user: 'Maria P.', act: 'actualizó contrato RSG', time: '1h' },
                                ].map((act, i) => (
                                    <div key={i} className="text-xs">
                                        <span className="font-bold text-prevenort-text/80">{act.user}</span>{' '}
                                        <span className="text-prevenort-text/40">{act.act}</span>{' '}
                                        <span className="text-[9px] text-info/60 font-mono ml-1">{act.time}</span>
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
