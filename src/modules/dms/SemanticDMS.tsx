import React, { useState } from 'react';
import {
    FileText,
    CheckSquare,
    PenTool,
    AlertTriangle,
    LayoutGrid,
    LayoutList,
    Archive,
    Search,
    Sparkles,
    FileDown,
    ShieldCheck,
    Loader2,
    Copy,
    Trash2,
    ImageIcon,
    Video,
    BarChart,
    AlertCircle,
    Settings2,
    Briefcase,
    Square
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { cn } from '../../lib/utils';
import { searchDocumentsSemantically } from './semanticSearch';
import { useDocuments } from '../../hooks/useDocuments';
import { useSignature } from '../../hooks/useSignature';
import { useAuth } from '../../hooks/useAuth';
import { DocumentUploadModal } from './DocumentUploadModal';
import { BatteryConfigModal } from './BatteryConfigModal';
import { NativeDocumentEditor } from './NativeDocumentEditor';
import { DigitalSignatureModal } from './DigitalSignatureModal';
import { RequestSignatureModal } from './RequestSignatureModal';
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
        deleteDocument,
        duplicateDocument,
        refresh
    } = useDocuments();

    // Verificación de permisos
    const { signNativeDocument, signPDFDocument } = useSignature();
    const { canPerform, user } = useAuth();

    const [showUploadModal, setShowUploadModal] = useState(false);
    const [showConfigModal, setShowConfigModal] = useState(false);
    const [showEditor, setShowEditor] = useState(false);
    const [signingDoc, setSigningDoc] = useState<Document | null>(null);
    const [confirmDelete, setConfirmDelete] = useState<Document | null>(null);
    const [requestingDoc, setRequestingDoc] = useState<Document | null>(null);

    // Modos de Vista y Selección Masiva
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isBulkActing, setIsBulkActing] = useState(false);

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

    // Handlers de Selección
    const toggleSelect = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    };

    const toggleSelectAll = () => {
        if (selectedIds.size === filteredDocs.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filteredDocs.map(d => d.id)));
        }
    };

    const handleBulkAction = async (action: 'archive' | 'delete') => {
        if (selectedIds.size === 0) return;
        if (action === 'delete' && !confirm(`¿Estás seguro de eliminar permanentemente ${selectedIds.size} documentos?`)) return;

        setIsBulkActing(true);
        try {
            for (const id of Array.from(selectedIds)) {
                const doc = documents.find(d => d.id === id);
                if (!doc) continue;

                if (action === 'archive') {
                    await archiveDocument(id);
                } else if (action === 'delete') {
                    await deleteDocument(id, doc.url);
                }
            }
            setSelectedIds(new Set());
            await refresh();
        } catch (err) {
            console.error('Bulk action error:', err);
        } finally {
            setIsBulkActing(false);
        }
    };


    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
                <Loader2 className="w-12 h-12 text-info animate-spin" />
                <p className="text-brand-text/40 text-sm font-mono">Indexando repositorio documental...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="card-premium border-red-500/20 bg-red-500/5 p-12 text-center">
                <AlertCircle className="w-12 h-12 text-red-500/40 mx-auto mb-4" />
                <p className="text-red-400 font-bold mb-2">Fallo en la Red Documental</p>
                <p className="text-brand-text/40 text-xs mb-6 font-mono">{error}</p>
                <button
                    onClick={() => window.location.reload()}
                    className="px-6 py-2 bg-brand-surface border border-brand-border hover:bg-brand-primary/10 rounded-xl transition-all text-xs uppercase tracking-widest font-bold text-brand-text"
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
                    <h2 className="text-2xl font-black text-brand-text/90 tracking-tighter uppercase">Documentos</h2>
                    <p className="text-xs text-brand-text/40 font-mono">Repositorio Inteligente de Activos Digitales</p>
                </div>

                <div className="flex items-center gap-3">
                    {canPerform('dms', 'create') && (
                        <>
                            <div className="flex border border-brand-border rounded-xl overflow-hidden bg-brand-surface">
                                <button
                                    onClick={() => setViewMode('grid')}
                                    className={cn(
                                        "p-2.5 transition-all",
                                        viewMode === 'grid' ? "bg-info/20 text-info" : "text-brand-text/40 hover:text-brand-text"
                                    )}
                                    title="Vista Cuadrícula"
                                >
                                    <LayoutGrid className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => setViewMode('list')}
                                    className={cn(
                                        "p-2.5 transition-all",
                                        viewMode === 'list' ? "bg-info/20 text-info" : "text-brand-text/40 hover:text-brand-text"
                                    )}
                                    title="Vista Lista (Worklist)"
                                >
                                    <LayoutList className="w-4 h-4" />
                                </button>
                            </div>
                            <button
                                onClick={() => setShowEditor(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600/10 border border-blue-500/20 rounded-xl cursor-pointer hover:bg-blue-600/20 transition-all text-xs font-bold uppercase tracking-widest whitespace-nowrap text-blue-400"
                            >
                                <Sparkles className="w-4 h-4" />
                                <span>Crear Documento</span>
                            </button>
                            <button
                                onClick={() => setShowUploadModal(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-brand-surface border border-brand-border rounded-xl cursor-pointer hover:bg-brand-primary/10 transition-all text-xs font-bold uppercase tracking-widest whitespace-nowrap text-brand-text"
                            >
                                <FileDown className="w-4 h-4 text-brand-text/40" />
                                <span>Subir Documentos</span>
                            </button>
                        </>
                    )}

                    {canPerform('dms', 'update') && (
                        <button
                            onClick={() => setShowConfigModal(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-brand-surface border border-brand-border rounded-xl cursor-pointer hover:bg-brand-primary/10 transition-all text-xs font-bold uppercase tracking-widest whitespace-nowrap text-brand-text"
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
                            className="w-full bg-brand-surface border border-brand-border rounded-xl pl-12 pr-12 py-3 text-sm text-brand-text focus:outline-none focus:border-info/50 transition-all shadow-2xl"
                        />
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-text/20 group-focus-within:text-info" />
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

            <AnimatePresence>
                {selectedIds.size > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-4 px-6 py-4 bg-neutral-900/90 border border-white/10 rounded-3xl shadow-2xl backdrop-blur-xl"
                    >
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black uppercase tracking-widest text-info">{selectedIds.size} Seleccionados</span>
                            <span className="text-[9px] text-white/30 font-bold">ACCIONES MASIVAS ACTIVADAS</span>
                        </div>
                        <div className="w-px h-8 bg-white/10 mx-2" />
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => handleBulkAction('archive')}
                                disabled={isBulkActing}
                                className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl text-[10px] font-black uppercase tracking-wider text-white/80 transition-all disabled:opacity-50"
                            >
                                {isBulkActing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Archive className="w-3.5 h-3.5" />}
                                Archivar
                            </button>
                            <button
                                onClick={() => handleBulkAction('delete')}
                                disabled={isBulkActing}
                                className="flex items-center gap-2 px-4 py-2 bg-danger/10 hover:bg-danger/20 border border-danger/20 rounded-2xl text-[10px] font-black uppercase tracking-wider text-danger transition-all disabled:opacity-50"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                                Eliminar
                            </button>
                        </div>
                        <button
                            onClick={() => setSelectedIds(new Set())}
                            className="ml-4 text-[10px] font-black uppercase tracking-widest text-white/20 hover:text-white transition-colors"
                        >
                            Cancelar
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-6">
                    {filteredDocs.map((doc) => {
                        const isMySignaturePending = doc.requestedSigners?.includes(user?.id || '') && !doc.signed;

                        return (
                            <motion.div
                                key={doc.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className={cn(
                                    "group bg-brand-surface/40 border border-brand-border rounded-[2rem] p-8 flex flex-col h-full hover:bg-brand-surface transition-all duration-500 relative overflow-hidden",
                                    selectedIds.has(doc.id) && "ring-2 ring-info border-info/30 bg-info/5 shadow-lg shadow-info/10",
                                    isMySignaturePending && "ring-1 ring-amber-500/50"
                                )}
                            >
                                {/* Selector de Casilla */}
                                <button
                                    onClick={(e) => { e.stopPropagation(); toggleSelect(doc.id); }}
                                    className={cn(
                                        "absolute top-6 left-6 z-20 transition-all duration-300",
                                        selectedIds.has(doc.id) ? "opacity-100 scale-110" : "opacity-0 group-hover:opacity-100 scale-100"
                                    )}
                                >
                                    {selectedIds.has(doc.id) ? (
                                        <CheckSquare className="w-5 h-5 text-info" />
                                    ) : (
                                        <Square className="w-5 h-5 text-brand-text/20 hover:text-info/50" />
                                    )}
                                </button>

                                {isMySignaturePending && (
                                    <div className="absolute top-6 right-6 z-20 flex items-center gap-1.5 px-2 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-full animate-pulse">
                                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                                        <span className="text-[8px] font-black tracking-widest uppercase">Requiere tu Firma</span>
                                    </div>
                                )}

                                <div
                                    onClick={() => window.open(doc.url, '_blank')}
                                    className={cn(
                                        "relative overflow-hidden cursor-pointer",
                                        isMySignaturePending && "mt-4"
                                    )}
                                >
                                    <div className="absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                duplicateDocument(doc);
                                            }}
                                            className="p-1.5 bg-brand-surface hover:bg-info/20 rounded-lg text-brand-text/40 hover:text-info transition-all"
                                        >
                                            <Copy className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setConfirmDelete(doc);
                                            }}
                                            className="p-1.5 bg-brand-surface hover:bg-danger/20 rounded-lg text-brand-text/40 hover:text-danger transition-all"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                        <FileDown className="w-4 h-4 text-brand-text/20 mt-1.5" />
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
                                        <h4 className="font-bold text-sm text-brand-text/90 leading-tight mb-1">{doc.title}</h4>
                                        <p className="text-[10px] text-brand-text/40 line-clamp-2 italic">{doc.contentSummary}</p>

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


                                    <div className="mt-auto pt-4 border-t border-brand-border flex items-center justify-between">
                                        <div className="flex flex-col gap-0.5">
                                            <span className="text-[9px] font-mono text-brand-text/20 uppercase">{doc.category} ● {new Date(doc.createdAt).toLocaleDateString()}</span>
                                            {doc.signerName && (
                                                <span className="text-[8px] text-brand-text/30 italic">Por: {doc.signerName}</span>
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
                                                <button
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        setRequestingDoc(doc);
                                                    }}
                                                    className="bg-brand-surface border border-brand-border hover:bg-emerald-500/10 hover:border-emerald-500/30 rounded-md px-2 py-1.5 text-[8px] font-bold uppercase tracking-widest text-brand-text/80 hover:text-emerald-400 transition-all"
                                                    title="Solicitar firma a otras personas"
                                                >
                                                    Solicitar
                                                </button>
                                            )}
                                        </div>

                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            ) : (
                <div className="bg-brand-surface/20 border border-brand-border rounded-[2.5rem] overflow-hidden backdrop-blur-sm">
                    {/* Header Worklist */}
                    <div className="grid grid-cols-[60px_1fr_120px_120px_100px_140px] gap-4 px-8 py-5 bg-brand-surface/50 border-b border-brand-border text-[10px] uppercase font-black text-brand-text/30 tracking-widest items-center">
                        <div className="flex justify-center">
                            <button onClick={toggleSelectAll} className="hover:text-info transition-colors">
                                {selectedIds.size === filteredDocs.length && filteredDocs.length > 0
                                    ? <CheckSquare className="w-4 h-4 text-info" />
                                    : <Square className="w-4 h-4" />
                                }
                            </button>
                        </div>
                        <div>Nombre del Documento</div>
                        <div>Categoría</div>
                        <div>Fecha</div>
                        <div className="text-center">Estado</div>
                        <div className="text-right pr-4">Acciones</div>
                    </div>

                    {/* Registros Worklist */}
                    <div className="flex flex-col">
                        {filteredDocs.map((doc) => {
                            const isSelected = selectedIds.has(doc.id);
                            const isMySignaturePending = doc.requestedSigners?.includes(user?.id || '') && !doc.signed;

                            return (
                                <motion.div
                                    key={doc.id}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className={cn(
                                        "grid grid-cols-[60px_1fr_120px_120px_100px_140px] gap-4 px-8 py-4 border-b border-white/[0.03] items-center hover:bg-white/[0.02] transition-colors group cursor-pointer",
                                        isSelected && "bg-info/5 border-info/10",
                                        isMySignaturePending && !isSelected && "bg-amber-500/5"
                                    )}
                                    onClick={() => toggleSelect(doc.id)}
                                >
                                    <div className="flex justify-center" onClick={(e) => { e.stopPropagation(); toggleSelect(doc.id); }}>
                                        {isSelected ? (
                                            <CheckSquare className="w-4 h-4 text-info" />
                                        ) : (
                                            <Square className="w-4 h-4 text-white/10 group-hover:text-white/20" />
                                        )}
                                    </div>
                                    <div className="flex items-center gap-4 min-w-0">
                                        <div className={cn(
                                            "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110",
                                            doc.signed ? "bg-emerald-500/10 text-emerald-400" : "bg-brand-bg text-brand-text/40"
                                        )}>
                                            {getFileIcon(doc.type)}
                                        </div>
                                        <div className="truncate">
                                            <p className="text-sm font-bold text-brand-text group-hover:text-info transition-colors truncate">{doc.title}</p>
                                            <p className="text-[9px] text-brand-text/20 uppercase tracking-tighter font-mono">{doc.signerName || 'Pendiente de firma'}</p>
                                        </div>
                                    </div>
                                    <div className="text-[10px] font-black uppercase text-brand-text/40 tracking-wider">
                                        {doc.category}
                                    </div>
                                    <div className="text-[10px] font-mono text-brand-text/30">
                                        {new Date(doc.createdAt).toLocaleDateString()}
                                    </div>
                                    <div className="flex justify-center flex-col items-center gap-1">
                                        <span className={cn(
                                            "text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest",
                                            doc.signed
                                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                                : "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                                        )}>
                                            {doc.signed ? 'Firmado' : 'Pendiente'}
                                        </span>
                                        {isMySignaturePending && (
                                            <span className="text-[7px] text-amber-500 font-bold uppercase tracking-tighter animate-pulse">Requiere Acción</span>
                                        )}
                                    </div>
                                    <div className="flex items-center justify-end gap-1.5 pr-2">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setSigningDoc(doc); }}
                                            className={cn(
                                                "p-1.5 rounded-lg border transition-all",
                                                doc.signed ? "border-emerald-500/20 text-emerald-400 bg-emerald-500/5 hover:bg-emerald-500/10" : "border-info/20 text-info bg-info/5 hover:bg-info/10"
                                            )}
                                            title="Firma Digital"
                                        >
                                            <PenTool className="w-3.5 h-3.5" />
                                        </button>
                                        {!doc.signed && (
                                            <button
                                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setRequestingDoc(doc); }}
                                                className="p-1.5 border border-brand-border text-brand-text/60 bg-brand-surface hover:bg-emerald-500/10 hover:text-emerald-400 hover:border-emerald-500/30 rounded-lg transition-all"
                                                title="Solicitar Firma"
                                            >
                                                <Briefcase className="w-3.5 h-3.5" />
                                            </button>
                                        )}
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setConfirmDelete(doc); }}
                                            className="p-1.5 border border-red-500/20 text-red-400 bg-red-500/5 hover:bg-red-500/10 rounded-lg transition-all"
                                            title="Eliminar"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                </div>
            )}

            {filteredDocs.length === 0 && (
                <div className="py-20 text-center animate-in fade-in duration-700">
                    <Search className="w-12 h-12 text-brand-text/5 mx-auto mb-4" />
                    <p className="text-brand-text/40 text-sm italic">No se encontraron documentos relevantes para "{query}"</p>
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
                    onConfirm={async (name: string, style: string, signatures?: any, size?: any, color?: any) => {
                        // Determinar qué método usar basado en la URL/extensión
                        const isNative = signingDoc.url.endsWith('.html');
                        let result;

                        if (isNative) {
                            result = await signNativeDocument(signingDoc, name, style);
                        } else {
                            // Ahora pasamos el array de firmas elegido visualmente
                            result = await signPDFDocument(signingDoc, name, signatures, size, color);
                        }

                        if (result.success) {
                            await refresh();
                        } else {
                            alert('Error al firmar: ' + result.error);
                        }
                    }}
                />
            )}
            {/* UI de Confirmación de Borrado */}
            <AnimatePresence>
                {confirmDelete && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="w-full max-w-sm bg-neutral-900 border border-white/10 rounded-[2.5rem] p-10 overflow-hidden shadow-2xl text-center relative"
                        >
                            <div className="w-20 h-20 bg-danger/10 border border-danger/20 rounded-3xl flex items-center justify-center mx-auto mb-8">
                                <AlertTriangle className="w-10 h-10 text-danger" />
                            </div>

                            <h3 className="text-xl font-black text-white uppercase tracking-tighter mb-4 pr-10 pl-10 leading-tight">
                                ¿Eliminar Documento?
                            </h3>

                            <p className="text-xs text-white/40 font-bold mb-8 leading-relaxed max-w-[240px] mx-auto">
                                Estás a punto de eliminar <span className="text-white">"{confirmDelete.title}"</span>. Esta acción es irreversible.
                            </p>

                            <div className="flex flex-col gap-3">
                                <button
                                    onClick={async () => {
                                        const res = await deleteDocument(confirmDelete.id, confirmDelete.url);
                                        if (res.success) {
                                            setConfirmDelete(null);
                                        } else {
                                            alert('Error al borrar: ' + res.error);
                                        }
                                    }}
                                    className="w-full py-4 bg-danger text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-red-600 transition-all shadow-lg shadow-red-500/20"
                                >
                                    Confirmar Eliminación
                                </button>
                                <button
                                    onClick={() => setConfirmDelete(null)}
                                    className="w-full py-4 bg-white/5 text-white/40 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10 hover:text-white transition-all underline underline-offset-4 decoration-white/10"
                                >
                                    Cancelar
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {requestingDoc && (
                <RequestSignatureModal
                    documentId={requestingDoc.id}
                    onClose={() => setRequestingDoc(null)}
                    onSuccess={() => {
                        setRequestingDoc(null);
                        refresh();
                    }}
                />
            )}
        </div>
    );
};
