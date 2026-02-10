import React from 'react';
import {
    Clock,
    Play,
    CheckCircle2,
    AlertCircle,
    MoreVertical,
    Paperclip,
    User,
    ChevronRight,
    Plus
} from 'lucide-react';
import { cn } from '../../lib/utils';
import type { BPMTask, Professional } from '../../types/core';

interface ProjectKanbanProps {
    tasks: BPMTask[];
    professionals: Professional[];
    onTaskUpdate: (id: string, updates: Partial<BPMTask>) => void;
    onTaskClick: (task: BPMTask) => void;
    onAddTask: (status: BPMTask['status']) => void;
}

const COLUMNS: { id: BPMTask['status']; title: string; icon: any; color: string }[] = [
    { id: 'pending', title: 'Pendientes', icon: Clock, color: 'text-prevenort-text/40 border-prevenort-border' },
    { id: 'in-progress', title: 'En Proceso', icon: Play, color: 'text-info border-info/20 bg-info/5' },
    { id: 'completed', title: 'Completados', icon: CheckCircle2, color: 'text-success border-success/20 bg-success/5' },
    { id: 'blocked', title: 'Bloqueados', icon: AlertCircle, color: 'text-danger border-danger/20 bg-danger/5' }
];

export const ProjectKanban: React.FC<ProjectKanbanProps> = ({ tasks, professionals, onTaskUpdate, onTaskClick, onAddTask }) => {
    const tasksByStatus = (status: BPMTask['status']) => tasks.filter(t => t.status === status);

    const getProfessionalName = (id: string) => {
        const prof = professionals.find(p => p.id === id);
        return prof ? `${prof.name} ${prof.lastName}` : id;
    };

    const handleDragStart = (e: React.DragEvent, taskId: string) => {
        e.dataTransfer.setData('taskId', taskId);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDrop = (e: React.DragEvent, newStatus: BPMTask['status']) => {
        e.preventDefault();
        const taskId = e.dataTransfer.getData('taskId');
        if (taskId) {
            onTaskUpdate(taskId, { status: newStatus });
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 min-h-[600px]">
            {COLUMNS.map(column => (
                <div
                    key={column.id}
                    className="flex flex-col gap-4"
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, column.id)}
                >
                    <div className={cn(
                        "flex items-center justify-between p-3 border rounded-xl mb-2",
                        column.color
                    )}>
                        <div className="flex items-center gap-2">
                            <column.icon className="w-4 h-4" />
                            <span className="text-[10px] font-black uppercase tracking-widest">{column.title}</span>
                            <span className="bg-prevenort-bg px-1.5 py-0.5 rounded text-[9px] font-mono text-prevenort-text/60">
                                {tasksByStatus(column.id).length}
                            </span>
                        </div>
                        <button
                            onClick={() => onAddTask(column.id)}
                            className="p-1 hover:bg-prevenort-primary/10 rounded-lg transition-colors text-prevenort-text/40 hover:text-prevenort-primary"
                        >
                            <Plus className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="flex flex-col gap-3 min-h-[400px]">
                        {tasksByStatus(column.id).map(task => (
                            <div
                                key={task.id}
                                draggable
                                onDragStart={(e) => handleDragStart(e, task.id)}
                                onClick={() => onTaskClick(task)}
                                className="group card-premium p-4 hover:border-info/20 cursor-grab active:cursor-grabbing transition-all space-y-4"
                            >
                                <div className="flex justify-between items-start gap-2">
                                    <h5 className="text-[11px] font-bold text-prevenort-text leading-tight group-hover:text-info transition-colors">
                                        {task.title}
                                    </h5>
                                    <button className="p-1 text-prevenort-text/10 hover:text-prevenort-text transition-colors">
                                        <MoreVertical className="w-3 h-3" />
                                    </button>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex items-center justify-between text-[9px] font-mono">
                                        <div className="flex items-center gap-1.5 text-prevenort-text/30 uppercase tracking-widest">
                                            <User className="w-3 h-3" />
                                            <span>{getProfessionalName(task.assignedTo)}</span>
                                        </div>
                                        <span className={cn(
                                            "px-1.5 py-0.5 rounded-md border",
                                            task.priority === 'critical' ? 'text-danger border-danger/20 bg-danger/5' :
                                                task.priority === 'high' ? 'text-warning border-warning/20 bg-warning/5' :
                                                    'text-prevenort-text/20 border-prevenort-border'
                                        )}>
                                            {task.priority}
                                        </span>
                                    </div>

                                    {task.aiSummary && (
                                        <div className="p-2 bg-info/5 border border-info/10 rounded-lg">
                                            <p className="text-[8px] text-prevenort-text/50 italic leading-relaxed line-clamp-2">
                                                "{task.aiSummary}"
                                            </p>
                                        </div>
                                    )}

                                    {task.progress !== undefined && task.progress > 0 && (
                                        <div className="space-y-1 pt-1">
                                            <div className="flex items-center justify-between text-[8px] font-mono text-prevenort-text/30">
                                                <span className="uppercase tracking-tighter">Progreso Tarea</span>
                                                <span>{task.progress}%</span>
                                            </div>
                                            <div className="h-1 w-full bg-prevenort-border/50 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-info/50 transition-all duration-700"
                                                    style={{ width: `${task.progress}%` }}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-center justify-between pt-2 border-t border-prevenort-border">
                                    <div className="flex items-center gap-3">
                                        {task.attachments && task.attachments.length > 0 && (
                                            <div className="flex items-center gap-1 text-[9px] text-prevenort-text/20">
                                                <Paperclip className="w-3 h-3 text-prevenort-text/10" />
                                                <span>{task.attachments.length}</span>
                                            </div>
                                        )}
                                        {task.subtasks && task.subtasks.length > 0 && (
                                            <div className="flex items-center gap-1 text-[9px] text-prevenort-text/20">
                                                <CheckCircle2 className="w-3 h-3 text-prevenort-text/10" />
                                                <span>{task.subtasks.filter(st => st.completed).length}/{task.subtasks.length}</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-1.5 text-[9px] text-prevenort-text/30 uppercase tracking-tighter">
                                        <span>{task.dueDate}</span>
                                        <ChevronRight className="w-3 h-3 text-prevenort-text/10" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {tasksByStatus(column.id).length === 0 && (
                        <div className="flex-1 border-2 border-dashed border-prevenort-border rounded-2xl flex items-center justify-center p-8 opacity-20">
                            <span className="text-[9px] uppercase font-black tracking-widest text-center text-prevenort-text">Sin Tareas</span>
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
};
