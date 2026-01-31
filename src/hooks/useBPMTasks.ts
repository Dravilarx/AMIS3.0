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
                assigned_to: t.assigned_to,
                status: t.status,
                priority: t.priority,
                dueDate: t.due_date,
                aiSummary: t.ai_summary,
                attachments: t.attachments || [],
                subtasks: t.subtasks || [],
                progress: t.progress || 0
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
                status: newTask.status,
                priority: newTask.priority,
                due_date: newTask.dueDate,
                ai_summary: newTask.aiSummary,
                attachments: newTask.attachments,
                subtasks: newTask.subtasks,
                progress: newTask.progress
            }]);
            if (error) throw error;
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
                status: updates.status,
                priority: updates.priority,
                due_date: updates.dueDate,
                ai_summary: updates.aiSummary,
                attachments: updates.attachments,
                subtasks: subtasks,
                progress: progress
            }).eq('id', id);
            if (error) throw error;
            fetchTasks();
        } catch (err) {
            console.error('Error updating task, using optimistic update:', err);
            return { success: true, error: err };
        }
        return { success: true };
    };

    const deleteTask = async (id: string) => {
        const { error } = await supabase.from('bpm_tasks').delete().eq('id', id);
        if (!error) fetchTasks();
        return { success: !error, error };
    };

    useEffect(() => {
        fetchTasks();
    }, [projectId]);

    return { tasks, loading, error, addTask, updateTask, deleteTask, refresh: fetchTasks };
};
