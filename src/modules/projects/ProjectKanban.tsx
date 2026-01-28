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
    { id: 'pending', title: 'Pendientes', icon: Clock, color: 'text-white/40 border-white/10' },
    { id: 'in-progress', title: 'En Proceso', icon: Play, color: 'text-blue-400 border-blue-500/20 bg-blue-500/5' },
    { id: 'completed', title: 'Completados', icon: CheckCircle2, color: 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5' },
    { id: 'blocked', title: 'Bloqueados', icon: AlertCircle, color: 'text-red-400 border-red-500/20 bg-red-500/5' }
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
                            <span className="bg-white/5 px-1.5 py-0.5 rounded text-[9px] font-mono">
                                {tasksByStatus(column.id).length}
                            </span>
                        </div>
                        <button
                            onClick={() => onAddTask(column.id)}
                            className="p-1 hover:bg-white/10 rounded-lg transition-colors"
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
                                className="group card-premium p-4 border-white/5 hover:border-blue-500/20 cursor-grab active:cursor-grabbing transition-all space-y-4"
                            >
                                <div className="flex justify-between items-start gap-2">
                                    <h5 className="text-[11px] font-bold text-white/90 leading-tight group-hover:text-blue-400 transition-colors">
                                        {task.title}
                                    </h5>
                                    <button className="p-1 text-white/10 hover:text-white transition-colors">
                                        <MoreVertical className="w-3 h-3" />
                                    </button>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex items-center justify-between text-[9px] font-mono">
                                        <div className="flex items-center gap-1.5 text-white/30 uppercase tracking-widest">
                                            <User className="w-3 h-3" />
                                            <span>{getProfessionalName(task.assignedTo)}</span>
                                        </div>
                                        <span className={cn(
                                            "px-1.5 py-0.5 rounded-md border",
                                            task.priority === 'critical' ? 'text-red-400 border-red-500/20 bg-red-500/5' :
                                                task.priority === 'high' ? 'text-orange-400 border-orange-500/20 bg-orange-500/5' :
                                                    'text-white/20 border-white/10'
                                        )}>
                                            {task.priority}
                                        </span>
                                    </div>

                                    {task.aiSummary && (
                                        <div className="p-2 bg-blue-500/5 border border-blue-500/10 rounded-lg">
                                            <p className="text-[8px] text-white/50 italic leading-relaxed line-clamp-2">
                                                "{task.aiSummary}"
                                            </p>
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-center justify-between pt-2 border-t border-white/5">
                                    <div className="flex items-center gap-2">
                                        {task.attachments && task.attachments.length > 0 && (
                                            <div className="flex items-center gap-1 text-[9px] text-white/20">
                                                <Paperclip className="w-3 h-3" />
                                                <span>{task.attachments.length}</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-1.5 text-[9px] text-white/30 uppercase tracking-tighter">
                                        <span>{task.dueDate}</span>
                                        <ChevronRight className="w-3 h-3 text-white/10" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {tasksByStatus(column.id).length === 0 && (
                        <div className="flex-1 border-2 border-dashed border-white/5 rounded-2xl flex items-center justify-center p-8 opacity-20">
                            <span className="text-[9px] uppercase font-black tracking-widest text-center">Sin Tareas</span>
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
};
