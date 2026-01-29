import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { analyzeBrainstormingContent } from '../modules/ideation/ideaAI';
import { fileToBase64 } from '../utils/fileUtils';

export const useIdeas = () => {
    const [analyses, setAnalyses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchAnalyses = async () => {
        try {
            setLoading(true);
            const { data, error: supabaseError } = await supabase
                .from('brainstorming_analysis')
                .select('*')
                .order('analyzed_at', { ascending: false });

            if (supabaseError) throw supabaseError;
            setAnalyses(data || []);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const processNewIdea = async (file: File) => {
        try {
            setLoading(true);

            // 1. Convertir a base64 para la IA
            const base64 = await fileToBase64(file);

            // 2. Análisis por Gemini 3.0
            const analysis = await analyzeBrainstormingContent(file.name, base64, true);

            // 3. Subir archivo a Storage
            const fileExt = file.name.split('.').pop();
            const filePath = `brainstorming/${Math.random()}.${fileExt}`;
            await supabase.storage
                .from('documents')
                .upload(filePath, file);

            const { data: { publicUrl } } = supabase.storage
                .from('documents')
                .getPublicUrl(filePath);

            // 4. Guardar resultado estructurado en tabla
            const { error: dbError } = await supabase
                .from('brainstorming_analysis')
                .insert([{
                    title: analysis.title,
                    original_document_url: publicUrl,
                    executive_summary: analysis.strategicJustification,
                    strategic_analysis: analysis, // Guardamos el objeto completo para mayor flexibilidad
                    status: 'completed'
                }]);

            if (dbError) throw dbError;

            await fetchAnalyses();
            return { success: true, analysis };
        } catch (err: any) {
            console.error('Error processing idea:', err);
            return { success: false, error: err.message };
        } finally {
            setLoading(false);
        }
    };

    const processTextIdea = async (title: string, text: string) => {
        try {
            setLoading(true);

            // 1. Análisis por Gemini 3.0
            const analysis = await analyzeBrainstormingContent(title, text, false);

            // 2. Guardar resultado estructurado en tabla
            const { error: dbError } = await supabase
                .from('brainstorming_analysis')
                .insert([{
                    title: analysis.title,
                    original_document_url: null,
                    executive_summary: analysis.strategicJustification,
                    strategic_analysis: analysis,
                    status: 'completed'
                }]);

            if (dbError) throw dbError;

            await fetchAnalyses();
            return { success: true, analysis };
        } catch (err: any) {
            console.error('Error processing text idea:', err);
            return { success: false, error: err.message };
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAnalyses();
    }, []);

    return {
        analyses,
        loading,
        error,
        processNewIdea,
        processTextIdea,
        refresh: fetchAnalyses
    };
};
