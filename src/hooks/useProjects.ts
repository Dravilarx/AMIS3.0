import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Project } from '../types/core';

const MOCK_PROJECTS: Project[] = [
    {
        id: 'PRJ-001',
        name: 'Telemedicina Boreal Premium',
        holdingId: 'Boreal',
        managerId: 'USR-01',
        status: 'active',
        progress: 75,
        privacyLevel: 'confidential',
        startDate: '2026-01-01',
        tags: ['Urgencia', 'Telemedicina', 'AI']
    },
    {
        id: 'PRJ-002',
        name: 'Migración Resomag Cloud',
        holdingId: 'Resomag',
        managerId: 'USR-05',
        status: 'on-hold',
        progress: 40,
        privacyLevel: 'private',
        startDate: '2026-01-15',
        tags: ['Infraestructura', 'Cloud']
    }
];

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
                tenderId: p.tender_id
            }));

            setProjects(mappedProjects);
        } catch (err: any) {
            console.error('Error fetching projects, using mock data:', err);
            setProjects(MOCK_PROJECTS);
            // setError(err.message);
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

    useEffect(() => {
        fetchProjects();
    }, []);

    return { projects, loading, error, addProject, updateProject, refresh: fetchProjects };
};
