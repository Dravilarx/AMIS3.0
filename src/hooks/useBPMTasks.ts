import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { BPMTask, SubTask } from '../types/core';

const calculateProgress = (subtasks?: SubTask[]) => {
    if (!subtasks || subtasks.length === 0) return 0;
    const completed = subtasks.filter(st => st.completed).length;
    return Math.round((completed / subtasks.length) * 100);
};

export const useBPMTasks = (projectId?: string) => {
    const [tasks, setTasks] = useState<BPMTask[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const notifyProjectChannel = async (projectId: string, taskTitle: string, involvedCount: number, action: 'asignada' | 'actualizada') => {
        if (involvedCount === 0) return;
        try {
            const { data: projData } = await supabase.from('projects').select('name').eq('id', projectId).single();
            if (projData) {
                const { data: channelData } = await supabase.from('channels').select('id').eq('type', 'project').eq('name', projData.name).order('created_at', { ascending: false }).limit(1).single();
                if (channelData) {
                    const messageText = `🔔 **Notificación BPM**: La tarea "${taskTitle}" ha sido ${action} con un equipo de ${involvedCount} profesional(es) involucrado(s). Favor revisar el Kanban.`;
                    const { data: { user } } = await supabase.auth.getUser();

                    await supabase.from('messages').insert([{
                        channel_id: channelData.id,
                        sender_id: user?.id,
                        sender_name: 'BPM System',
                        content: messageText,
                        type: 'text'
                    }]);
                }
            }
        } catch (err) {
            console.error('Error notifying channel:', err);
        }
    };

    const fetchTasks = async () => {
        try {
            setLoading(true);
            setError(null);

            let query = supabase.from('bpm_tasks').select('*');
            if (projectId) {
                query = query.eq('project_id', projectId);
            }

            const { data, error: supabaseError } = await query.order('created_at', { ascending: false });

            if (supabaseError) throw supabaseError;

            const mappedTasks: BPMTask[] = (data || []).map(t => ({
                id: t.id,
                projectId: t.project_id,
                title: t.title,
                assignedTo: t.assigned_to,
                involvedIds: t.involved_ids || [],
                status: t.status,
                priority: t.priority,
                dueDate: t.due_date,
                aiSummary: t.ai_summary,
                attachments: t.attachments || [],
                subtasks: t.subtasks || [],
                progress: t.progress || 0,
                is_deleted: t.is_deleted,
                archived_at: t.archived_at
            }));

            setTasks(mappedTasks);
        } catch (err: any) {
            console.error('Error fetching tasks:', err);
            setError(err.message);
            setTasks([]);
        } finally {
            setLoading(false);
        }
    };

    const addTask = async (task: Partial<BPMTask>) => {
        const progress = calculateProgress(task.subtasks);
        const newTask: BPMTask = {
            id: `TSK-${Date.now()}`,
            projectId: task.projectId || '',
            title: task.title || '',
            assignedTo: task.assignedTo || '',
            involvedIds: task.involvedIds || [],
            status: task.status || 'pending',
            priority: task.priority || 'medium',
            dueDate: task.dueDate || new Date().toISOString().split('T')[0],
            aiSummary: task.aiSummary,
            attachments: task.attachments || [],
            subtasks: task.subtasks || [],
            progress: progress
        };

        setTasks(prev => [newTask, ...prev]);

        try {
            const { error } = await supabase.from('bpm_tasks').insert([{
                project_id: newTask.projectId,
                title: newTask.title,
                assigned_to: newTask.assignedTo,
                involved_ids: newTask.involvedIds,
                status: newTask.status,
                priority: newTask.priority,
                due_date: newTask.dueDate,
                ai_summary: newTask.aiSummary,
                attachments: newTask.attachments,
                subtasks: newTask.subtasks,
                progress: newTask.progress
            }]);
            if (error) throw error;

            if (newTask.projectId && newTask.involvedIds && newTask.involvedIds.length > 0) {
                await notifyProjectChannel(newTask.projectId, newTask.title, newTask.involvedIds.length, 'asignada');
            }

            fetchTasks();
        } catch (err) {
            console.error('Error adding task, using optimistic update:', err);
            return { success: true, error: err };
        }
        return { success: true };
    };

    const updateTask = async (id: string, updates: Partial<BPMTask>) => {
        const currentTask = tasks.find(t => t.id === id);
        const subtasks = updates.subtasks !== undefined ? updates.subtasks : currentTask?.subtasks;
        const progress = calculateProgress(subtasks);

        const finalUpdates = { ...updates, progress };

        setTasks(prev => prev.map(t => t.id === id ? { ...t, ...finalUpdates } : t));

        try {
            const { error } = await supabase.from('bpm_tasks').update({
                title: updates.title,
                assigned_to: updates.assignedTo,
                involved_ids: updates.involvedIds,
                status: updates.status,
                priority: updates.priority,
                due_date: updates.dueDate,
                ai_summary: updates.aiSummary,
                attachments: updates.attachments,
                subtasks: subtasks,
                progress: progress
            }).eq('id', id);
            if (error) throw error;

            if (updates.projectId || currentTask?.projectId) {
                const pId = updates.projectId || currentTask?.projectId;
                const title = updates.title || currentTask?.title;
                const iIds = updates.involvedIds || currentTask?.involvedIds || [];
                if (iIds.length > 0 && pId && title) {
                    await notifyProjectChannel(pId, title, iIds.length, 'actualizada');
                }
            }

            fetchTasks();
        } catch (err) {
            console.error('Error updating task, using optimistic update:', err);
            return { success: true, error: err };
        }
        return { success: true };
    };

    const archiveTask = async (id: string) => {
        try {
            const { error: updateError } = await supabase
                .from('bpm_tasks')
                .update({ is_deleted: true, archived_at: new Date().toISOString() })
                .eq('id', id);

            if (updateError) throw updateError;
            await fetchTasks();
            return { success: true };
        } catch (err: any) {
            console.error('Error archiving task:', err);
            return { success: false, error: err.message };
        }
    };

    const duplicateTask = async (task: BPMTask) => {
        try {
            const { id, ...dataToClone } = task;
            const newTask = {
                ...dataToClone,
                project_id: task.projectId, // Fix mapping
                title: `${task.title} (Copia)`,
                status: 'pending' as const,
                progress: 0,
                created_at: new Date().toISOString()
            };

            const { error } = await supabase.from('bpm_tasks').insert([newTask]);
            if (error) throw error;

            await fetchTasks();
            return { success: true };
        } catch (err: any) {
            console.error('Error duplicating task:', err);
            return { success: false, error: err.message };
        }
    };

    useEffect(() => {
        fetchTasks();
    }, [projectId]);

    return {
        tasks: tasks.filter(t => !t.is_deleted),
        loading,
        error,
        addTask,
        updateTask,
        deleteTask: archiveTask,
        duplicateTask,
        refresh: fetchTasks
    };
};
