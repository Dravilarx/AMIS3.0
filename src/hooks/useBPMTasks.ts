import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { BPMTask } from '../types/core';

const MOCK_TASKS: BPMTask[] = [
    {
        id: 'TSK-101',
        projectId: 'PRJ-001',
        title: 'Validación de redundancia de red',
        assignedTo: 'USR-01',
        status: 'in-progress',
        priority: 'high',
        dueDate: '2026-01-28',
        aiSummary: 'La latencia en el nodo 4 indica posible cuello de botella. Se sugiere escalamiento técnico.',
        attachments: [{ name: 'Network_Map.pdf', url: '#', type: 'pdf' }]
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
                assignedTo: t.assigned_to,
                status: t.status,
                priority: t.priority,
                dueDate: t.due_date,
                aiSummary: t.ai_summary,
                attachments: t.attachments || []
            }));

            setTasks(mappedTasks);
        } catch (err: any) {
            console.error('Error fetching tasks, using mock data:', err);
            // Si hay un error (como que la tabla no existe), usamos mock data
            const filteredMock = projectId ? MOCK_TASKS.filter(t => t.projectId === projectId) : MOCK_TASKS;
            setTasks(filteredMock);
        } finally {
            setLoading(false);
        }
    };

    const addTask = async (task: Partial<BPMTask>) => {
        const { error } = await supabase.from('bpm_tasks').insert([{
            project_id: task.projectId,
            title: task.title,
            assigned_to: task.assignedTo,
            status: task.status || 'pending',
            priority: task.priority || 'medium',
            due_date: task.dueDate,
            ai_summary: task.aiSummary,
            attachments: task.attachments
        }]);
        if (!error) fetchTasks();
        return { success: !error, error };
    };

    const updateTask = async (id: string, updates: Partial<BPMTask>) => {
        const { error } = await supabase.from('bpm_tasks').update({
            title: updates.title,
            assigned_to: updates.assignedTo,
            status: updates.status,
            priority: updates.priority,
            due_date: updates.dueDate,
            ai_summary: updates.aiSummary,
            attachments: updates.attachments
        }).eq('id', id);
        if (!error) fetchTasks();
        return { success: !error, error };
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
