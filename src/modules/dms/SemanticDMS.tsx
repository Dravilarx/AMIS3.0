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
    Settings2,
    PenTool,
    Copy,
    Trash2
} from 'lucide-react';

import { cn } from '../../lib/utils';
import { searchDocumentsSemantically } from './semanticSearch';
import { useDocuments } from '../../hooks/useDocuments';
import { useSignature } from '../../hooks/useSignature';
import { useAuth } from '../../hooks/useAuth';
import { DocumentUploadModal } from './DocumentUploadModal';
import { BatteryConfigModal } from './BatteryConfigModal';
import { NativeDocumentEditor } from './NativeDocumentEditor';
import { DigitalSignatureModal } from './DigitalSignatureModal';
import type { Document } from '../../types/communication';


export const SemanticDMS: React.FC = () => {
    const [query, setQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [relevantIds, setRelevantIds] = useState<string[] | null>(null);

    // Conexión real a Supabase
    const {
        documents,
        loading,
        error,
        uploadDocument,
        createNativeDocument,
        archiveDocument,
        duplicateDocument,
        refresh
    } = useDocuments();

    // Verificación de permisos
    const { signNativeDocument, signPDFDocument } = useSignature();
    const { canPerform } = useAuth();

    const [showUploadModal, setShowUploadModal] = useState(false);
    const [showConfigModal, setShowConfigModal] = useState(false);
    const [showEditor, setShowEditor] = useState(false);
    const [signingDoc, setSigningDoc] = useState<Document | null>(null);

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
                    <h2 className="text-2xl font-black text-white/90 tracking-tighter uppercase">Documentos</h2>
                    <p className="text-xs text-white/40 font-mono">Repositorio Inteligente de Activos Digitales</p>
                </div>

                <div className="flex items-center gap-3">
                    {canPerform('dms', 'create') && (
                        <>
                            <button
                                onClick={() => setShowEditor(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600/10 border border-blue-500/20 rounded-xl cursor-pointer hover:bg-blue-600/20 transition-all text-xs font-bold uppercase tracking-widest whitespace-nowrap text-blue-400"
                            >
                                <Sparkles className="w-4 h-4" />
                                <span>Crear Documento</span>
                            </button>
                            <button
                                onClick={() => setShowUploadModal(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl cursor-pointer hover:bg-white/10 transition-all text-xs font-bold uppercase tracking-widest whitespace-nowrap"
                            >
                                <FileDown className="w-4 h-4 text-white/40" />
                                <span>Subir Documentos</span>
                            </button>
                        </>
                    )}

                    {canPerform('dms', 'update') && (
                        <button
                            onClick={() => setShowConfigModal(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl cursor-pointer hover:bg-white/10 transition-all text-xs font-bold uppercase tracking-widest whitespace-nowrap"
                            title="Configurar Baterías de Requerimientos"
                        >
                            <Settings2 className="w-4 h-4 text-amber-400" />
                            <span>Configurar Baterías</span>
                        </button>
                    )}

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
                    <div
                        key={doc.id}
                        onClick={() => window.open(doc.url, '_blank')}
                        className="group bg-white/5 border border-white/10 rounded-2xl p-5 hover:bg-white/[0.07] hover:border-blue-500/30 transition-all flex flex-col gap-4 relative overflow-hidden cursor-pointer"
                    >
                        <div className="absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    duplicateDocument(doc);
                                }}
                                className="p-1.5 bg-white/5 hover:bg-blue-500/20 rounded-lg text-white/40 hover:text-blue-400 transition-all"
                            >
                                <Copy className="w-4 h-4" />
                            </button>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (confirm('¿Estás seguro de archivar este documento?')) {
                                        archiveDocument(doc.id);
                                    }
                                }}
                                className="p-1.5 bg-white/5 hover:bg-red-500/20 rounded-lg text-white/40 hover:text-red-400 transition-all"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                            <FileDown className="w-4 h-4 text-white/20 mt-1.5" />
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
                            <div className="flex flex-col gap-0.5">
                                <span className="text-[9px] font-mono text-white/20 uppercase">{doc.category} ● {new Date(doc.createdAt).toLocaleDateString()}</span>
                                {doc.signerName && (
                                    <span className="text-[8px] text-white/30 italic">Por: {doc.signerName}</span>
                                )}
                            </div>

                            <div className="flex items-center gap-1.5">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setSigningDoc(doc);
                                    }}
                                    className={cn(
                                        "flex items-center gap-1 px-2 py-1 border rounded-md transition-all group/btn",
                                        doc.signed
                                            ? "bg-emerald-500/5 hover:bg-emerald-500/10 border-emerald-500/10 text-emerald-500"
                                            : "bg-blue-500/10 hover:bg-blue-500/20 border-blue-500/20 text-blue-400"
                                    )}
                                >
                                    {doc.signed ? (
                                        <>
                                            <ShieldCheck className="w-2.5 h-2.5" />
                                            <span className="text-[8px] font-bold uppercase tracking-tighter">Añadir Firma</span>
                                        </>
                                    ) : (
                                        <>
                                            <PenTool className="w-2.5 h-2.5 group-hover/btn:scale-110 transition-transform" />
                                            <span className="text-[8px] font-bold uppercase tracking-tighter">Firmar</span>
                                        </>
                                    )}
                                </button>

                                {!doc.signed && (
                                    <select
                                        onClick={(e) => e.stopPropagation()}
                                        onChange={async (e) => {
                                            const role = e.target.value;
                                            if (role) {
                                                const res = await (useSignature() as any).requestSignature(doc.id, role);
                                                if (res.success) {
                                                    alert('Firma solicitada al rol: ' + role);
                                                }
                                                e.target.value = '';
                                            }
                                        }}
                                        className="bg-white/5 border border-white/10 rounded-md px-1 py-1 text-[8px] text-white/40 focus:outline-none focus:border-orange-500/50"
                                    >
                                        <option value="">Solicitar...</option>
                                        <option value="medical_director">Director Médico</option>
                                        <option value="auditor">Auditor Jefe</option>
                                        <option value="legal">Representante Legal</option>
                                    </select>
                                )}
                            </div>

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
            {showEditor && (
                <NativeDocumentEditor
                    onClose={() => setShowEditor(false)}
                    onSave={async (title, content) => {
                        const res = await createNativeDocument(title, content, { category: 'other' });
                        return res;
                    }}
                />
            )}

            {signingDoc && (
                <DigitalSignatureModal
                    documentTitle={signingDoc.title}
                    documentUrl={signingDoc.url}
                    isPdf={!signingDoc.url.endsWith('.html')}
                    onClose={() => setSigningDoc(null)}
                    onConfirm={async (name, style, signatures, size, color) => {
                        // Determinar qué método usar basado en la URL/extensión
                        const isNative = signingDoc.url.endsWith('.html');
                        let result;

                        if (isNative) {
                            result = await signNativeDocument(signingDoc, name, style);
                        } else {
                            // Ahora pasamos el array de firmas elegido visualmente
                            result = await signPDFDocument(signingDoc, name, signatures as any, size, color);
                        }

                        if (result.success) {
                            await refresh();
                        } else {
                            alert('Error al firmar: ' + result.error);
                        }
                    }}
                />
            )}
        </div>
    );
};
