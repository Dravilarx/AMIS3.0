import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { isRlsError } from './useDocuments';

// Defaults permisivos cuando una carpeta no tiene fila en document_folder_permissions.
// nivel_ver=5 → todos ven; nivel_subir=5 → todos suben; nivel_archivar=2 → Jefatura+.
const DEFAULT_NIVEL_VER = 5;
const DEFAULT_NIVEL_SUBIR = 5;
const DEFAULT_NIVEL_ARCHIVAR = 2;

export interface DocumentFolder {
    id:            string;
    name:          string;
    color:         string;
    icon:          string;
    docCount?:     number;
    nivelVer:      number;  // "nivel N o superior puede VER"
    nivelSubir:    number;  // "nivel N o superior puede SUBIR"
    nivelArchivar: number;  // "nivel N o superior puede ARCHIVAR"
}

export const useFolders = () => {
    const [folders,  setFolders]  = useState<DocumentFolder[]>([]);
    const [loading,  setLoading]  = useState(true);

    const fetchFolders = async () => {
        setLoading(true);
        const [foldersRes, permsRes] = await Promise.all([
            supabase.from('document_folders').select('*').order('name'),
            supabase.from('document_folder_permissions').select('*'),
        ]);
        const permByFolder = new Map<string, any>(
            (permsRes.data || []).map((p: any) => [p.folder_id, p])
        );
        setFolders((foldersRes.data || []).map(f => {
            const perm = permByFolder.get(f.id);
            return {
                id:            f.id,
                name:          f.name,
                color:         f.color,
                icon:          f.icon,
                nivelVer:      perm?.nivel_ver      ?? DEFAULT_NIVEL_VER,
                nivelSubir:    perm?.nivel_subir    ?? DEFAULT_NIVEL_SUBIR,
                nivelArchivar: perm?.nivel_archivar ?? DEFAULT_NIVEL_ARCHIVAR,
            };
        }));
        setLoading(false);
    };

    const addFolder = async (name: string, color: string) => {
        const { error } = await supabase
            .from('document_folders')
            .insert({ name: name.trim(), color, icon: 'folder' });
        if (!error) await fetchFolders();
        return { success: !error, error: error?.message, rls: isRlsError(error) };
    };

    const updateFolder = async (id: string, updates: { name?: string; color?: string }) => {
        const payload: any = {};
        if (updates.name !== undefined) payload.name = updates.name.trim();
        if (updates.color !== undefined) payload.color = updates.color;
        const { error } = await supabase
            .from('document_folders')
            .update(payload)
            .eq('id', id);
        if (!error) await fetchFolders();
        return { success: !error, error: error?.message, rls: isRlsError(error) };
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
        return { success: !error, error: error?.message, rls: isRlsError(error) };
    };

    // Upsert de permisos por carpeta (pantalla "Permisos de carpetas", nivel 1).
    const setFolderPermissions = async (
        folderId: string,
        levels: { nivelVer: number; nivelSubir: number; nivelArchivar: number }
    ) => {
        const { error } = await supabase
            .from('document_folder_permissions')
            .upsert({
                folder_id:      folderId,
                nivel_ver:      levels.nivelVer,
                nivel_subir:    levels.nivelSubir,
                nivel_archivar: levels.nivelArchivar,
            }, { onConflict: 'folder_id' });
        if (!error) await fetchFolders();
        return { success: !error, error: error?.message, rls: isRlsError(error) };
    };

    const moveDocument = async (docId: string, folderId: string | null) => {
        const { error } = await supabase
            .from('documents')
            .update({ folder_id: folderId })
            .eq('id', docId);
        return { success: !error };
    };

    useEffect(() => { fetchFolders(); }, []);

    return { folders, loading, addFolder, updateFolder, deleteFolder, setFolderPermissions, moveDocument, refresh: fetchFolders };
};
