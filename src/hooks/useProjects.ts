import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Project } from '../types/core';

export const useProjects = () => {
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchProjects = async () => {
        try {
            setLoading(true);
            setError(null);
            const { data, error: supabaseError } = await supabase
                .from('projects')
                .select('*')
                .order('created_at', { ascending: false });

            if (supabaseError) throw supabaseError;

            const mappedProjects: Project[] = (data || []).map(p => ({
                id: p.id,
                name: p.name,
                holdingId: p.holding_id,
                managerId: p.manager_id,
                status: p.status,
                progress: p.progress,
                privacyLevel: p.privacy_level,
                startDate: p.start_date,
                endDate: p.end_date,
                tags: p.tags || [],
                tenderId: p.tender_id,
                is_deleted: p.is_deleted,
                archived_at: p.archived_at
            }));

            setProjects(mappedProjects);
        } catch (err: any) {
            console.error('Error fetching projects:', err);
            setError(err.message);
            setProjects([]);
        } finally {
            setLoading(false);
        }
    };

    const addProject = async (project: Partial<Project>) => {
        const { error } = await supabase.from('projects').insert([{
            id: project.id,
            name: project.name,
            holding_id: project.holdingId,
            manager_id: project.managerId,
            status: project.status,
            progress: project.progress || 0,
            privacy_level: project.privacyLevel,
            start_date: project.startDate,
            tender_id: project.tenderId,
            tags: project.tags
        }]);
        if (!error) fetchProjects();
        return { success: !error, error };
    };

    const updateProject = async (id: string, updates: Partial<Project>) => {
        const { error } = await supabase.from('projects').update({
            name: updates.name,
            holding_id: updates.holdingId,
            manager_id: updates.managerId,
            status: updates.status,
            progress: updates.progress,
            privacy_level: updates.privacyLevel,
            start_date: updates.startDate,
            tender_id: updates.tenderId,
            tags: updates.tags
        }).eq('id', id);
        if (!error) fetchProjects();
        return { success: !error, error };
    };

    const archiveProject = async (id: string) => {
        try {
            const { error } = await supabase
                .from('projects')
                .update({ is_deleted: true, archived_at: new Date().toISOString(), status: 'archived' })
                .eq('id', id);

            if (error) throw error;
            await fetchProjects();
            return { success: true };
        } catch (err: any) {
            console.error('Error archiving project:', err);
            return { success: false, error: err.message };
        }
    };

    const duplicateProject = async (project: Project) => {
        try {
            // Clonar proyecto según URMA
            const { id, ...dataToClone } = project;
            const newProject = {
                ...dataToClone,
                name: `${project.name} (Copia)`,
                status: 'draft' as const,
                progress: 0,
                start_date: new Date().toISOString().split('T')[0]
            };

            const { data, error } = await supabase.from('projects').insert([newProject]).select().single();
            if (error) throw error;

            // Opcional: Podríamos clonar tareas asociadas aquí si fuera necesario

            await fetchProjects();
            return { success: true, data };
        } catch (err: any) {
            console.error('Error duplicating project:', err);
            return { success: false, error: err.message };
        }
    };

    useEffect(() => {
        fetchProjects();
    }, []);

    return {
        projects: projects.filter(p => !p.is_deleted),
        loading,
        error,
        addProject,
        updateProject,
        archiveProject,
        duplicateProject,
        refresh: fetchProjects
    };
};
