import React, { useState } from 'react';
import {
    FileText,
    Search,
    Sparkles,
    FileDown,
    ShieldCheck,
    Loader2,
    Lock,
    AlertCircle,
    Image as ImageIcon,
    Video,
    BarChart,
    Briefcase,
    CheckSquare,
    Settings2
} from 'lucide-react';

import { cn } from '../../lib/utils';
import { searchDocumentsSemantically } from './semanticSearch';
import { useDocuments } from '../../hooks/useDocuments';
import { DocumentUploadModal } from './DocumentUploadModal';
import { BatteryConfigModal } from './BatteryConfigModal';


export const SemanticDMS: React.FC = () => {
    const [query, setQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [relevantIds, setRelevantIds] = useState<string[] | null>(null);

    // Conexión real a Supabase
    const { documents, loading, error, uploadDocument } = useDocuments();

    const [showUploadModal, setShowUploadModal] = useState(false);
    const [showConfigModal, setShowConfigModal] = useState(false);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!query.trim()) {
            setRelevantIds(null);
            return;
        }

        setIsSearching(true);
        try {
            const ids = await searchDocumentsSemantically(query, documents);
            setRelevantIds(ids);
        } catch (err) {
            console.error(err);
        } finally {
            setIsSearching(false);
        }
    };

    const getFileIcon = (type: string) => {
        switch (type) {
            case 'image': return <ImageIcon className="w-6 h-6" />;
            case 'video': return <Video className="w-6 h-6" />;
            case 'excel': return <BarChart className="w-6 h-6" />;
            default: return <FileText className="w-6 h-6" />;
        }
    };

    const filteredDocs = relevantIds
        ? documents.filter(d => relevantIds.includes(d.id))
        : documents;


    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
                <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
                <p className="text-white/40 text-sm font-mono">Indexando repositorio documental...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="card-premium border-red-500/20 bg-red-500/5 p-12 text-center">
                <AlertCircle className="w-12 h-12 text-red-500/40 mx-auto mb-4" />
                <p className="text-red-400 font-bold mb-2">Fallo en la Red Documental</p>
                <p className="text-white/40 text-xs mb-6 font-mono">{error}</p>
                <button
                    onClick={() => window.location.reload()}
                    className="px-6 py-2 bg-white/5 border border-white/10 hover:bg-white/10 rounded-xl transition-all text-xs uppercase tracking-widest font-bold"
                >
                    Reiniciar Sincronización
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-1000">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-black text-white/90 tracking-tighter uppercase">DMS Inteligente</h2>
                    <p className="text-xs text-white/40 font-mono">Semantic Search & Digital Assets Management</p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setShowUploadModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl cursor-pointer hover:bg-white/10 transition-all text-xs font-bold uppercase tracking-widest whitespace-nowrap"
                    >
                        <FileDown className="w-4 h-4 text-blue-400" />
                        <span>Subir Expediente</span>
                    </button>

                    <button
                        onClick={() => setShowConfigModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl cursor-pointer hover:bg-white/10 transition-all text-xs font-bold uppercase tracking-widest whitespace-nowrap"
                        title="Configurar Baterías de Requerimientos"
                    >
                        <Settings2 className="w-4 h-4 text-amber-400" />
                        <span>Configurar Baterías</span>
                    </button>

                    <form onSubmit={handleSearch} className="relative group w-full md:w-96">
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Busca por concepto (ej: 'seguridad del paciente' o 'acuerdos legales')..."
                            className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-12 py-3 text-sm focus:outline-none focus:border-blue-500/50 transition-all shadow-2xl"
                        />
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-focus-within:text-blue-400" />
                        <button
                            type="submit"
                            disabled={isSearching}
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 bg-blue-600/20 hover:bg-blue-600/40 rounded-lg transition-all"
                        >
                            {isSearching ? <Loader2 className="w-4 h-4 animate-spin text-blue-400" /> : <Sparkles className="w-4 h-4 text-blue-400" />}
                        </button>
                    </form>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {filteredDocs.map(doc => (
                    <div key={doc.id} className="group bg-white/5 border border-white/10 rounded-2xl p-5 hover:bg-white/[0.07] hover:border-blue-500/30 transition-all flex flex-col gap-4 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                            <FileDown className="w-4 h-4 text-blue-400 cursor-pointer" />
                        </div>

                        <div className={cn(
                            "w-12 h-12 rounded-xl flex items-center justify-center border",
                            doc.category === 'clinical' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" :
                                doc.category === 'legal' ? "bg-blue-500/10 border-blue-500/20 text-blue-400" :
                                    doc.category === 'commercial' ? "bg-purple-500/10 border-purple-500/20 text-purple-400" :
                                        "bg-orange-500/10 border-orange-500/20 text-orange-400"
                        )}>
                            {getFileIcon(doc.type)}
                        </div>


                        <div className="flex flex-col flex-1">
                            <h4 className="font-bold text-sm text-white/90 leading-tight mb-1">{doc.title}</h4>
                            <p className="text-[10px] text-white/40 line-clamp-2 italic">{doc.contentSummary}</p>

                            {(doc.projectId || doc.taskId) && (
                                <div className="mt-2 flex flex-wrap gap-2">
                                    {doc.projectId && (
                                        <div className="flex items-center gap-1 px-1.5 py-0.5 bg-blue-500/10 border border-blue-500/20 rounded text-[8px] text-blue-400 font-bold uppercase">
                                            <Briefcase className="w-2.5 h-2.5" /> PROYECTO
                                        </div>
                                    )}
                                    {doc.taskId && (
                                        <div className="flex items-center gap-1 px-1.5 py-0.5 bg-orange-500/10 border border-orange-500/20 rounded text-[8px] text-orange-400 font-bold uppercase">
                                            <CheckSquare className="w-2.5 h-2.5" /> TAREA
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>


                        <div className="mt-auto pt-4 border-t border-white/5 flex items-center justify-between">
                            <span className="text-[9px] font-mono text-white/20 uppercase">{doc.category} ● {new Date(doc.createdAt).toLocaleDateString()}</span>
                            {doc.signed ? (
                                <div className="flex items-center gap-1">
                                    <ShieldCheck className="w-3 h-3 text-emerald-500" />
                                    <span className="text-[8px] text-emerald-500 font-bold uppercase tracking-tighter">Firmado</span>
                                </div>
                            ) : (
                                <div className="flex items-center gap-1">
                                    <Lock className="w-3 h-3 text-white/20" />
                                    <span className="text-[8px] text-white/20 font-bold uppercase tracking-tighter">Pendiente</span>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {filteredDocs.length === 0 && (
                <div className="py-20 text-center animate-in fade-in duration-700">
                    <Search className="w-12 h-12 text-white/5 mx-auto mb-4" />
                    <p className="text-white/40 text-sm italic">No se encontraron documentos relevantes para "{query}"</p>
                </div>
            )}
            {showUploadModal && (
                <DocumentUploadModal
                    onClose={() => setShowUploadModal(false)}
                    onUpload={uploadDocument}
                />
            )}
            {showConfigModal && (
                <BatteryConfigModal
                    onClose={() => setShowConfigModal(false)}
                />
            )}
        </div>
    );
};
