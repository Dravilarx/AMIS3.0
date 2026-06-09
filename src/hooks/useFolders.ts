import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface DocumentFolder {
    id:        string;
    name:      string;
    color:     string;
    icon:      string;
    docCount?: number;
}

export const useFolders = () => {
    const [folders,  setFolders]  = useState<DocumentFolder[]>([]);
    const [loading,  setLoading]  = useState(true);

    const fetchFolders = async () => {
        setLoading(true);
        const { data } = await supabase
            .from('document_folders')
            .select('*')
            .order('name');
        setFolders((data || []).map(f => ({
            id:    f.id,
            name:  f.name,
            color: f.color,
            icon:  f.icon,
        })));
        setLoading(false);
    };

    const addFolder = async (name: string, color: string) => {
        const { error } = await supabase
            .from('document_folders')
            .insert({ name: name.trim(), color, icon: 'folder' });
        if (!error) await fetchFolders();
        return { success: !error, error: error?.message };
    };

    const deleteFolder = async (id: string) => {
        // Desasignar docs antes de borrar
        await supabase
            .from('documents')
            .update({ folder_id: null })
            .eq('folder_id', id);
        const { error } = await supabase
            .from('document_folders')
            .delete()
            .eq('id', id);
        if (!error) await fetchFolders();
        return { success: !error };
    };

    const moveDocument = async (docId: string, folderId: string | null) => {
        const { error } = await supabase
            .from('documents')
            .update({ folder_id: folderId })
            .eq('id', docId);
        return { success: !error };
    };

    useEffect(() => { fetchFolders(); }, []);

    return { folders, loading, addFolder, deleteFolder, moveDocument, refresh: fetchFolders };
};
