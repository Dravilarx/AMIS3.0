import React, { useState, useEffect } from 'react';
import {
    X,
    Upload,
    Users,
    User,
    Shield,
    Briefcase,
    CheckSquare,
    Globe,
    Loader2,
    FileText,
    Sparkles
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { supabase } from '../../lib/supabase';
import type { Document } from '../../types/communication';

interface DocumentUploadModalProps {
    onClose: () => void;
    onUpload: (file: File, metadata: Partial<Document>) => Promise<{ success: boolean; error?: string }>;
    prefill?: {
        targetId?: string;
        visibility?: Document['visibility'];
        category?: Document['category'];
        requirementId?: string;
        title?: string;
    };
}

export const DocumentUploadModal: React.FC<DocumentUploadModalProps> = ({ onClose, onUpload, prefill }) => {
    const [file, setFile] = useState<File | null>(null);
    const [title, setTitle] = useState(prefill?.title || '');
    const [category, setCategory] = useState<Document['category']>(prefill?.category || 'other');
    const [visibility, setVisibility] = useState<Document['visibility']>(prefill?.visibility || 'community');
    const [targetId, setTargetId] = useState(prefill?.targetId || '');
    const [projectId, setProjectId] = useState('');
    const [taskId, setTaskId] = useState('');
    const [requirementId] = useState(prefill?.requirementId || '');
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Listas para selectores
    const [projects, setProjects] = useState<{ id: string, name: string }[]>([]);
    const [tasks, setTasks] = useState<{ id: string, title: string }[]>([]);
    const [profiles, setProfiles] = useState<{ id: string, full_name: string, role: string }[]>([]);

    useEffect(() => {
        console.log("[DMS Modal] Cargando metadatos...");
        const fetchMetadata = async () => {
            try {
                const { data: projData, error: projErr } = await supabase.from('projects').select('id, name').limit(10);
                if (projErr) console.warn("[DMS Modal] Error proyectos:", projErr);
                if (projData && projData.length > 0) {
                    setProjects(projData);
                } else {
                    // Fallback para pruebas sin datos
                    setProjects([{ id: 'p1', name: 'Proyecto de Prueba Alpha' }]);
                }

                const { data: taskData } = await supabase.from('bpm_tasks').select('id, title').limit(10);
                if (taskData && taskData.length > 0) {
                    setTasks(taskData);
                } else {
                    setTasks([
                        { id: 't1', title: 'Revisión técnica de infraestructura' },
                        { id: 't2', title: 'Auditoría de Higiene' }
                    ]);
                }

                const { data: profData } = await supabase.from('profiles').select('id, full_name, role').limit(10);
                if (profData && profData.length > 0) {
                    setProfiles(profData);
                } else {
                    setProfiles([
                        { id: 'u1', full_name: 'Marcelo Avila', role: 'AUDITOR' },
                        { id: 'u2', full_name: 'Dr. Rodrigo Soto', role: 'MED' }
                    ]);
                }
            } catch (err) {
                console.error("[DMS Modal] Crash en fetchMetadata:", err);
            }
        };
        fetchMetadata();
    }, []);



    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
            if (!title) setTitle(selectedFile.name.split('.')[0]);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file) return;

        setUploading(true);
        setError(null);

        const metadata: Partial<Document> = {
            title: title || file.name,
            category,
            visibility,
            targetId: visibility !== 'community' ? targetId : undefined,
            projectId: projectId || undefined,
            taskId: taskId || undefined,
            requirementId: requirementId || undefined,
            type: file.type.includes('image') ? 'image' :
                file.type.includes('video') ? 'video' :
                    file.type.includes('spreadsheet') ? 'excel' :
                        file.name.endsWith('.md') ? 'markdown' : 'pdf'
        };

        const result = await onUpload(file, metadata);

        if (result.success) {
            onClose();
        } else {
            setError(result.error || 'Fallo en la carga');
            setUploading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-[#0A0A0A] border border-white/10 w-full max-w-xl rounded-2xl overflow-hidden shadow-2xl overflow-y-auto max-h-[90vh]">
                <header className="p-6 border-b border-white/5 flex items-center justify-between bg-gradient-to-r from-blue-600/10 to-transparent">
                    <div>
                        <h3 className="text-lg font-black text-white/90 uppercase tracking-tighter">Subir Activo Digital</h3>
                        <p className="text-[10px] text-white/40 font-mono uppercase">Gestión de Expedientes e Inteligencia Documental</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors">
                        <X className="w-5 h-5 text-white/40" />
                    </button>
                </header>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* DROPZONE */}
                    <div className={cn(
                        "relative group border-2 border-dashed rounded-2xl p-8 transition-all flex flex-col items-center justify-center gap-3",
                        file ? "border-emerald-500/30 bg-emerald-500/5" : "border-white/10 hover:border-blue-500/30 hover:bg-white/[0.02]"
                    )}>
                        <input
                            type="file"
                            onChange={handleFileChange}
                            className="absolute inset-0 opacity-0 cursor-pointer"
                            accept=".pdf,.doc,.docx,.xls,.xlsx,.md,.txt,.jpg,.png,.mp4,.mov"
                        />
                        <div className={cn(
                            "w-12 h-12 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110",
                            file ? "bg-emerald-500/20 text-emerald-400" : "bg-white/5 text-white/20"
                        )}>
                            {file ? <FileText className="w-6 h-6" /> : <Upload className="w-6 h-6" />}
                        </div>
                        <div className="text-center">
                            <p className="text-sm font-bold text-white/80">
                                {file ? file.name : "Arrastra o selecciona un archivo"}
                            </p>
                            <p className="text-[10px] text-white/30 uppercase mt-1">
                                PDF, Office, Markdown, Imagen o Vídeo (Máx 100MB)
                            </p>
                        </div>
                    </div>

                    {error && (
                        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-xs flex items-center gap-2">
                            <Shield className="w-4 h-4" />
                            {error}
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] text-white/40 uppercase font-black tracking-widest ml-1">Nombre del Activo</label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="Ej: Contrato Marco 2026"
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:border-blue-500/40 outline-none"
                                required
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] text-white/40 uppercase font-black tracking-widest ml-1">Categoría</label>
                            <select
                                value={category}
                                onChange={(e) => setCategory(e.target.value as any)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:border-blue-500/40 outline-none appearance-none"
                            >
                                <option value="other">General</option>
                                <option value="clinical">Clínico / Médico</option>
                                <option value="legal">Legal / Contrato</option>
                                <option value="logistics">Logística / Operativo</option>
                                <option value="commercial">Comercial</option>
                            </select>
                        </div>
                    </div>

                    {/* ALCANCE Y VISIBILIDAD */}
                    <div className="space-y-4 pt-4 border-t border-white/5">
                        <div className="flex items-center gap-2 mb-2">
                            <Globe className="w-4 h-4 text-blue-400" />
                            <h4 className="text-xs font-black text-white/60 uppercase tracking-widest">Configuración de Alcance</h4>
                        </div>

                        <div className="grid grid-cols-1 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] text-white/40 uppercase font-black tracking-widest ml-1">Visibilidad Principal</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {[
                                        { id: 'community', label: 'Comunidad', icon: Globe },
                                        { id: 'profile', label: 'Específico', icon: Users },
                                        { id: 'user', label: 'Privado/Sola Firma', icon: User }
                                    ].map((opt) => (
                                        <button
                                            key={opt.id}
                                            type="button"
                                            onClick={() => setVisibility(opt.id as any)}
                                            className={cn(
                                                "p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all",
                                                visibility === opt.id
                                                    ? "bg-blue-600/20 border-blue-500/50 text-blue-400"
                                                    : "bg-white/5 border-white/10 text-white/30 hover:bg-white/10"
                                            )}
                                        >
                                            <opt.icon className="w-4 h-4" />
                                            <span className="text-[9px] font-bold uppercase">{opt.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {visibility !== 'community' && (
                                <div className="space-y-1.5 animate-in slide-in-from-top-2 duration-300">
                                    <label className="text-[10px] text-white/40 uppercase font-black tracking-widest ml-1">
                                        Seleccionar {visibility === 'profile' ? 'Perfil/Cargo' : 'Usuario'}
                                    </label>
                                    <select
                                        value={targetId}
                                        onChange={(e) => setTargetId(e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none"
                                        required
                                    >
                                        <option value="">Seleccionar...</option>
                                        {visibility === 'profile' ? (
                                            <>
                                                <option value="ADM">Administradores</option>
                                                <option value="AUDITOR">Auditores Clínicos</option>
                                                <option value="ARCHITECT">Arquitectos de Sistema</option>
                                                <option value="MED">Médicos / Staff</option>
                                            </>
                                        ) : (
                                            profiles?.map(p => (
                                                <option key={p.id} value={p.id}>{p.full_name || 'Sin nombre'} ({p.role || 'Sin rol'})</option>
                                            ))

                                        )}
                                    </select>
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] text-white/40 uppercase font-black tracking-widest flex items-center gap-1 ml-1">
                                        <Briefcase className="w-3 h-3" /> Vincular a Proyecto
                                    </label>
                                    <select
                                        value={projectId}
                                        onChange={(e) => setProjectId(e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none"
                                    >
                                        <option value="">Ninguno (Opcional)</option>
                                        {projects?.map(p => (
                                            <option key={p.id} value={p.id}>{p.name}</option>
                                        ))}

                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] text-white/40 uppercase font-black tracking-widest flex items-center gap-1 ml-1">
                                        <CheckSquare className="w-3 h-3" /> Vincular a Tarea
                                    </label>
                                    <select
                                        value={taskId}
                                        onChange={(e) => setTaskId(e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none"
                                    >
                                        <option value="">Ninguna (Opcional)</option>
                                        {tasks?.map(t => (
                                            <option key={t.id} value={t.id}>{t.title}</option>
                                        ))}

                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-6 py-3 border border-white/10 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-white/5 transition-all"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={!file || uploading}
                            className={cn(
                                "flex-[2] px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2",
                                file && !uploading
                                    ? "bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-600/20 text-white"
                                    : "bg-white/5 text-white/20 cursor-not-allowed"
                            )}
                        >
                            {uploading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span>Subiendo...</span>
                                </>
                            ) : (
                                <>
                                    <Sparkles className="w-4 h-4" />
                                    <span>Publicar en AMIS</span>
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
