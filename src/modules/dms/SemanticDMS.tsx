import React, { useState, useMemo } from 'react';
import {
    FileText, CheckSquare, PenTool, AlertTriangle, LayoutGrid,
    LayoutList, Search, Sparkles, FileDown, ShieldCheck,
    Loader2, Copy, Trash2, ImageIcon, Video, BarChart, AlertCircle,
    Settings2, Square, Plus, FolderOpen, Filter, Clock, Archive, RotateCcw, History, CalendarClock,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';
import { useDocuments } from '../../hooks/useDocuments';
import { useSignature } from '../../hooks/useSignature';
import { useAuth } from '../../hooks/useAuth';
import { useFolders } from '../../hooks/useFolders';
import { DocumentUploadModal } from './DocumentUploadModal';
import { BatteryConfigModal } from './BatteryConfigModal';
import { NativeDocumentEditor } from './NativeDocumentEditor';
import { DigitalSignatureModal } from './DigitalSignatureModal';
import { RequestSignatureModal } from './RequestSignatureModal';
import { DocumentVersionsModal } from './DocumentVersionsModal';
import { ExpiryDateModal } from './ExpiryDateModal';
import { PDFPreviewHover } from './PDFPreviewHover';
import { getSignedDocumentUrl } from '../../lib/storageUrls';
import { getLevelForRole } from '../../lib/accessLevels';
import type { Document } from '../../types/communication';

// Abre un documento del bucket privado firmando la ruta antes de window.open.
const abrirDocumentoFirmado = async (input: string) => {
    const signed = await getSignedDocumentUrl(input);
    if (signed) window.open(signed, '_blank');
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const getFileIcon = (type: string, className = 'w-5 h-5') => {
    switch (type) {
        case 'image': return <ImageIcon className={className} />;
        case 'video': return <Video className={className} />;
        case 'excel': return <BarChart className={className} />;
        default:      return <FileText className={className} />;
    }
};

const getCategoryColor = (cat: string) => {
    switch (cat) {
        case 'clinical':   return 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400';
        case 'legal':      return 'bg-blue-500/10    border-blue-500/20    text-blue-400';
        case 'commercial': return 'bg-purple-500/10  border-purple-500/20  text-purple-400';
        case 'induction':  return 'bg-violet-500/10  border-violet-500/20  text-violet-400';
        default:           return 'bg-teal-500/10  border-teal-500/20  text-teal-400';
    }
};

// ─── Componente principal ─────────────────────────────────────────────────────
export const SemanticDMS: React.FC = () => {
    const {
        documents, archivedDocuments, loading, error,
        uploadDocument, createNativeDocument,
        deleteDocument, archiveDocument, restoreDocument, updateExpiryDate,
        duplicateDocument, refresh,
    } = useDocuments();

    const { signNativeDocument, signPDFDocument } = useSignature();
    const { canPerform, user }                     = useAuth();
    const { folders, addFolder, deleteFolder, moveDocument } = useFolders();

    // Nivel de acceso del usuario (menor = más acceso). ADMIN ya no existe.
    const miNivel = getLevelForRole(user?.role);
    const puedeCrearCarpeta = miNivel <= 2;   // crear/editar carpeta: Jefatura+
    const puedeBorrarCarpeta = miNivel <= 1;  // eliminar carpeta: solo Dirección

    // Toast de feedback (incluye rechazos RLS).
    const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
    const showToast = (msg: string, ok: boolean) => { setToast({ msg, ok }); setTimeout(() => setToast(null), 3500); };
    const notifyRls = (res: { rls?: boolean; error?: string }) =>
        showToast(res.rls ? 'No tienes permisos para esta acción' : (res.error || 'Ocurrió un error'), false);

    // Vista de archivados.
    const [showArchived, setShowArchived] = useState(false);

    // Carpetas visibles según nivel (RLS también las filtra; esto refleja la regla).
    const visibleFolders = useMemo(() => folders.filter(f => miNivel <= f.nivelVer), [folders, miNivel]);
    // Carpetas donde el usuario puede subir/asignar documentos.
    const uploadableFolders = useMemo(() => folders.filter(f => miNivel <= f.nivelSubir), [folders, miNivel]);

    // ¿Puede archivar este documento? Jefatura+ o el propio autor.
    const puedeArchivar = (doc: Document) => miNivel <= 2 || doc.createdBy === user?.id;
    // ¿Puede gestionar versiones (subir nueva / restaurar)? Jefatura+ o el propio autor.
    const puedeGestionarVersiones = (doc: Document) => miNivel <= 2 || doc.createdBy === user?.id;
    // ¿Puede editar el vencimiento? Jefatura+ o el propio autor.
    const puedeEditarVencimiento = (doc: Document) => miNivel <= 2 || doc.createdBy === user?.id;

    const handleArchive = async (doc: Document) => {
        const res = await archiveDocument(doc.id);
        if (res.success) showToast(`"${doc.title}" archivado`, true); else notifyRls(res);
    };
    const handleRestore = async (doc: Document) => {
        const res = await restoreDocument(doc.id);
        if (res.success) showToast(`"${doc.title}" restaurado`, true); else notifyRls(res);
    };
    const handleDeleteFolder = async (id: string, name: string) => {
        if (!window.confirm(`¿Eliminar la carpeta "${name}"? Los documentos quedarán sin carpeta.`)) return;
        const res = await deleteFolder(id);
        if (res.success) { if (filterFolder === id) setFilterFolder(null); showToast('Carpeta eliminada', true); }
        else notifyRls(res);
    };

    // ── Estado UI ─────────────────────────────────────────────────────────────
    const [viewMode,         setViewMode]         = useState<'grid' | 'list'>('grid');
    const [selectedIds,      setSelectedIds]      = useState<Set<string>>(new Set());
    const [showUploadModal,  setShowUploadModal]  = useState(false);
    const [showConfigModal,  setShowConfigModal]  = useState(false);
    const [showEditor,       setShowEditor]       = useState(false);
    const [signingDoc,       setSigningDoc]       = useState<Document | null>(null);
    const [confirmDelete,    setConfirmDelete]    = useState<Document | null>(null);
    const [requestingDoc,    setRequestingDoc]    = useState<Document | null>(null);
    const [versionsDoc,      setVersionsDoc]      = useState<Document | null>(null);
    const [expiryDoc,        setExpiryDoc]        = useState<Document | null>(null);

    // ── Filtros ───────────────────────────────────────────────────────────────
    const [searchTerm,       setSearchTerm]       = useState('');
    const [filterFolder,     setFilterFolder]     = useState<string | null>(null);
    const [filterType,       setFilterType]       = useState('');
    const [filterSigned,     setFilterSigned]     = useState('');
    const [filterDateFrom,   setFilterDateFrom]   = useState('');
    const [showFilters,      setShowFilters]      = useState(false);

    // ── Nueva carpeta ─────────────────────────────────────────────────────────
    const [showNewFolder,    setShowNewFolder]    = useState(false);
    const [newFolderName,    setNewFolderName]    = useState('');
    const [newFolderColor,   setNewFolderColor]   = useState('#f97316');
    const [savingFolder,     setSavingFolder]     = useState(false);

    // ── Docs filtrados ────────────────────────────────────────────────────────
    const baseDocs = showArchived ? archivedDocuments : documents;
    const filteredDocs = useMemo(() => baseDocs.filter(d => {
        const s = searchTerm.toLowerCase();
        const matchSearch  = !searchTerm ||
            d.title.toLowerCase().includes(s) ||
            (d.contentSummary || '').toLowerCase().includes(s) ||
            (d.signerName || '').toLowerCase().includes(s);
        const matchFolder  = !filterFolder  || (d as any).folderId === filterFolder;
        const matchType    = !filterType    || d.type === filterType;
        const matchSigned  = !filterSigned  ||
            (filterSigned === 'signed'   && d.signed) ||
            (filterSigned === 'unsigned' && !d.signed);
        const matchDate    = !filterDateFrom || d.createdAt >= filterDateFrom;
        return matchSearch && matchFolder && matchType && matchSigned && matchDate;
    }), [baseDocs, searchTerm, filterFolder, filterType, filterSigned, filterDateFrom]);

    // ── KPIs ──────────────────────────────────────────────────────────────────
    const kpis = useMemo(() => ({
        total:    documents.length,
        firmados: documents.filter(d => d.signed).length,
        vencen:   documents.filter(d => d.expiryDate &&
            new Date(d.expiryDate) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) &&
            new Date(d.expiryDate) >= new Date()).length,
        vencidos: documents.filter(d => d.expiryDate && new Date(d.expiryDate) < new Date()).length,
        pendFirma: documents.filter(d =>
            d.requestedSigners?.includes(user?.id || '') && !d.signed).length,
    }), [documents, user]);

    // ── Docs por carpeta ──────────────────────────────────────────────────────
    const docCountByFolder = useMemo(() => {
        const map: Record<string, number> = {};
        documents.forEach(d => {
            const fid = (d as any).folderId;
            if (fid) map[fid] = (map[fid] || 0) + 1;
        });
        return map;
    }, [documents]);

    const unassigned = documents.filter(d => !(d as any).folderId).length;

    // ── Selección ─────────────────────────────────────────────────────────────
    const toggleSelect    = (id: string) => setSelectedIds(prev => {
        const next = new Set(prev);
        next.has(id) ? next.delete(id) : next.add(id);
        return next;
    });
    const toggleSelectAll = () => setSelectedIds(
        selectedIds.size === filteredDocs.length
            ? new Set()
            : new Set(filteredDocs.map(d => d.id))
    );



    const handleAddFolder = async () => {
        if (!newFolderName.trim()) return;
        setSavingFolder(true);
        const res = await addFolder(newFolderName.trim(), newFolderColor);
        setSavingFolder(false);
        if (res.success) { setNewFolderName(''); setShowNewFolder(false); showToast('Carpeta creada', true); }
        else notifyRls(res);
    };

    // ── Loading / Error ───────────────────────────────────────────────────────
    if (loading) return (
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
            <Loader2 className="w-10 h-10 text-brand-primary animate-spin" />
            <p className="text-brand-text/30 text-xs font-mono animate-pulse">Cargando repositorio...</p>
        </div>
    );

    if (error) return (
        <div className="card-premium border-red-500/20 bg-red-500/5 p-12 text-center">
            <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-4" />
            <p className="text-red-400 font-bold mb-4">{error}</p>
            <button onClick={() => window.location.reload()}
                className="px-6 py-2 bg-brand-surface border border-brand-border rounded-xl text-xs font-bold uppercase text-brand-text">
                Reintentar
            </button>
        </div>
    );

    return (
        <div className="flex gap-6 animate-in fade-in duration-500">

            {/* ── Sidebar carpetas ── */}
            <div className="w-56 flex-shrink-0 space-y-2">
                <div className="flex items-center justify-between mb-3">
                    <p className="text-[10px] font-black uppercase tracking-widest text-brand-text/40">Carpetas</p>
                    {puedeCrearCarpeta && (
                        <button onClick={() => setShowNewFolder(v => !v)} title="Nueva carpeta"
                            className="p-1 rounded-lg hover:bg-brand-surface text-brand-text/30 hover:text-brand-text transition-colors">
                            <Plus className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>

                {/* Nueva carpeta */}
                {showNewFolder && (
                    <div className="p-2 bg-brand-surface border border-brand-border rounded-xl space-y-2 animate-in fade-in duration-200">
                        <input autoFocus placeholder="Nombre carpeta..."
                            className="bg-brand-bg border border-brand-border rounded-lg w-full px-2 py-1.5 text-xs text-brand-text outline-none"
                            value={newFolderName}
                            onChange={e => setNewFolderName(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') handleAddFolder(); if (e.key === 'Escape') setShowNewFolder(false); }} />
                        <div className="flex items-center gap-2">
                            <input type="color" value={newFolderColor}
                                onChange={e => setNewFolderColor(e.target.value)}
                                className="w-7 h-7 rounded cursor-pointer border-0" />
                            <button onClick={handleAddFolder} disabled={savingFolder || !newFolderName.trim()}
                                className="flex-1 py-1 bg-brand-primary text-white rounded-lg text-[10px] font-black uppercase disabled:opacity-50">
                                {savingFolder ? <Loader2 className="w-3 h-3 animate-spin mx-auto" /> : 'Crear'}
                            </button>
                        </div>
                    </div>
                )}

                {/* Todas */}
                <button onClick={() => setFilterFolder(null)}
                    className={cn(
                        'w-full flex items-center justify-between px-3 py-2 rounded-xl transition-all text-left',
                        !filterFolder ? 'bg-brand-primary/10 text-brand-primary border border-brand-primary/20' : 'hover:bg-brand-surface text-brand-text/60'
                    )}>
                    <div className="flex items-center gap-2">
                        <FolderOpen className="w-3.5 h-3.5" />
                        <span className="text-xs font-bold">Todos</span>
                    </div>
                    <span className="text-[9px] font-mono opacity-60">{documents.length}</span>
                </button>

                {/* Sin carpeta */}
                <button onClick={() => setFilterFolder('none')}
                    className={cn(
                        'w-full flex items-center justify-between px-3 py-2 rounded-xl transition-all text-left',
                        filterFolder === 'none' ? 'bg-brand-surface border border-brand-border text-brand-text' : 'hover:bg-brand-surface text-brand-text/40'
                    )}>
                    <div className="flex items-center gap-2">
                        <FolderOpen className="w-3.5 h-3.5" />
                        <span className="text-xs">Sin carpeta</span>
                    </div>
                    <span className="text-[9px] font-mono opacity-60">{unassigned}</span>
                </button>

                {/* Carpetas (ocultas si miNivel > nivel_ver) */}
                {visibleFolders.map(folder => (
                    <div key={folder.id} className={cn(
                        'w-full flex items-center gap-1 px-3 py-2 rounded-xl transition-all group',
                        filterFolder === folder.id ? 'bg-brand-surface border border-brand-border text-brand-text' : 'hover:bg-brand-surface text-brand-text/60'
                    )}>
                        <button onClick={() => { setFilterFolder(folder.id); setShowArchived(false); }} className="flex items-center gap-2 min-w-0 flex-1 text-left">
                            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: folder.color }} />
                            <span className="text-xs truncate">{folder.name}</span>
                        </button>
                        <span className="text-[9px] font-mono opacity-60">{docCountByFolder[folder.id] || 0}</span>
                        {puedeBorrarCarpeta && (
                            <button onClick={() => handleDeleteFolder(folder.id, folder.name)} title="Eliminar carpeta"
                                className="p-0.5 rounded text-brand-text/20 hover:text-danger opacity-0 group-hover:opacity-100 transition-all">
                                <Trash2 className="w-3 h-3" />
                            </button>
                        )}
                    </div>
                ))}

                {/* Archivados */}
                <button onClick={() => { setShowArchived(v => !v); setFilterFolder(null); }}
                    className={cn(
                        'w-full flex items-center justify-between px-3 py-2 rounded-xl transition-all text-left mt-1 border',
                        showArchived ? 'bg-warning/10 border-warning/30 text-warning' : 'border-transparent hover:bg-brand-surface text-brand-text/40'
                    )}>
                    <div className="flex items-center gap-2">
                        <Archive className="w-3.5 h-3.5" />
                        <span className="text-xs font-bold">Archivados</span>
                    </div>
                    <span className="text-[9px] font-mono opacity-60">{archivedDocuments.length}</span>
                </button>

                {/* KPIs */}
                <div className="mt-4 pt-4 border-t border-brand-border space-y-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-brand-text/30">Resumen</p>
                    {[
                        { label: 'Total',       val: kpis.total,     color: 'text-brand-text' },
                        { label: 'Firmados',    val: kpis.firmados,  color: 'text-emerald-400' },
                        { label: 'Mi firma',    val: kpis.pendFirma, color: 'text-amber-400' },
                        { label: 'Vencen 30d',  val: kpis.vencen,   color: 'text-red-400' },
                        { label: 'Vencidos',    val: kpis.vencidos, color: 'text-danger' },
                    ].map(k => (
                        <div key={k.label} className="flex items-center justify-between px-2">
                            <span className="text-[10px] text-brand-text/40">{k.label}</span>
                            <span className={cn('text-sm font-black', k.color)}>{k.val}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── Contenido principal ── */}
            <div className="flex-1 min-w-0 space-y-4">

                {/* Header */}
                <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div>
                        <h2 className="text-xl font-black text-brand-text uppercase tracking-tighter">
                            {filterFolder
                                ? folders.find(f => f.id === filterFolder)?.name || 'Sin carpeta'
                                : 'Todos los documentos'}
                        </h2>
                        <p className="text-[10px] text-brand-text/30 font-mono">{filteredDocs.length} documentos</p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                        <div className="flex border border-brand-border rounded-xl overflow-hidden bg-brand-surface">
                            <button onClick={() => setViewMode('grid')}
                                className={cn('p-2.5 transition-all', viewMode === 'grid' ? 'bg-info/20 text-info' : 'text-brand-text/40')}>
                                <LayoutGrid className="w-4 h-4" />
                            </button>
                            <button onClick={() => setViewMode('list')}
                                className={cn('p-2.5 transition-all', viewMode === 'list' ? 'bg-info/20 text-info' : 'text-brand-text/40')}>
                                <LayoutList className="w-4 h-4" />
                            </button>
                        </div>
                        {canPerform('dms', 'create') && (
                            <>
                                <button onClick={() => setShowEditor(true)}
                                    className="flex items-center gap-2 px-3 py-2 bg-blue-600/10 border border-blue-500/20 rounded-xl text-xs font-bold uppercase text-blue-400 hover:bg-blue-600/20 transition-all">
                                    <Sparkles className="w-3.5 h-3.5" /> Crear
                                </button>
                                <button onClick={() => setShowUploadModal(true)}
                                    className="flex items-center gap-2 px-3 py-2 bg-brand-surface border border-brand-border rounded-xl text-xs font-bold uppercase text-brand-text hover:bg-brand-primary/10 transition-all">
                                    <FileDown className="w-3.5 h-3.5 text-brand-text/40" /> Subir
                                </button>
                            </>
                        )}
                        {canPerform('dms', 'update') && (
                            <button onClick={() => setShowConfigModal(true)}
                                className="flex items-center gap-2 px-3 py-2 bg-brand-surface border border-brand-border rounded-xl text-xs font-bold uppercase text-brand-text hover:bg-brand-primary/10 transition-all">
                                <Settings2 className="w-3.5 h-3.5 text-amber-400" /> Baterías
                            </button>
                        )}
                    </div>
                </div>

                {/* Búsqueda + Filtros */}
                <div className="space-y-3">
                    <div className="flex items-center gap-3">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-brand-text/20" />
                            <input placeholder="Buscar por nombre, contenido, firmante..."
                                className="w-full bg-brand-surface border border-brand-border rounded-xl pl-9 pr-4 py-2 text-sm text-brand-text outline-none focus:border-info/50"
                                value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                        </div>
                        <button onClick={() => setShowFilters(v => !v)}
                            className={cn(
                                'flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-bold uppercase transition-all',
                                showFilters || filterType || filterSigned || filterDateFrom
                                    ? 'bg-info/10 border-info/20 text-info'
                                    : 'bg-brand-surface border-brand-border text-brand-text/50 hover:bg-brand-primary/10'
                            )}>
                            <Filter className="w-3.5 h-3.5" />
                            Filtros
                            {(filterType || filterSigned || filterDateFrom) && (
                                <span className="w-4 h-4 bg-info text-white text-[8px] font-black rounded-full flex items-center justify-center">
                                    {[filterType, filterSigned, filterDateFrom].filter(Boolean).length}
                                </span>
                            )}
                        </button>
                    </div>

                    {showFilters && (
                        <div className="flex flex-wrap items-center gap-3 p-3 bg-brand-surface border border-brand-border rounded-xl animate-in fade-in slide-in-from-top-1 duration-200">
                            <select value={filterType} onChange={e => setFilterType(e.target.value)}
                                className="bg-brand-bg border border-brand-border rounded-lg px-3 py-1.5 text-xs text-brand-text outline-none appearance-none">
                                <option value="">Todos los tipos</option>
                                <option value="pdf">PDF</option>
                                <option value="image">Imagen</option>
                                <option value="video">Video</option>
                                <option value="excel">Excel</option>
                            </select>
                            <select value={filterSigned} onChange={e => setFilterSigned(e.target.value)}
                                className="bg-brand-bg border border-brand-border rounded-lg px-3 py-1.5 text-xs text-brand-text outline-none appearance-none">
                                <option value="">Todos los estados</option>
                                <option value="signed">Firmados</option>
                                <option value="unsigned">Sin firma</option>
                            </select>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] text-brand-text/30">Desde</span>
                                <input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)}
                                    className="bg-brand-bg border border-brand-border rounded-lg px-3 py-1.5 text-xs text-brand-text outline-none" />
                            </div>
                            {(filterType || filterSigned || filterDateFrom) && (
                                <button onClick={() => { setFilterType(''); setFilterSigned(''); setFilterDateFrom(''); }}
                                    className="text-[10px] font-black uppercase text-danger hover:bg-danger/10 px-2 py-1 rounded-lg transition-colors">
                                    Limpiar
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {/* Grid */}
                {viewMode === 'grid' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4">
                        {filteredDocs.map(doc => {
                            const isMySignaturePending = doc.requestedSigners?.includes(user?.id || '') && !doc.signed;
                            const isExpired = !!(doc.expiryDate && new Date(doc.expiryDate) < new Date());
                            const isExpiringSoon = !isExpired && !!(doc.expiryDate &&
                                new Date(doc.expiryDate) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));

                            return (
                                <motion.div key={doc.id}
                                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                                    className={cn(
                                        'group bg-brand-surface/40 border border-brand-border rounded-2xl p-5 flex flex-col hover:bg-brand-surface transition-all duration-300 relative overflow-hidden',
                                        selectedIds.has(doc.id) && 'ring-2 ring-info border-info/30 bg-info/5',
                                        isMySignaturePending && 'ring-1 ring-amber-500/50',
                                        isExpired && 'ring-1 ring-danger/60',
                                        isExpiringSoon && 'ring-1 ring-red-500/30'
                                    )}>

                                    {/* Checkbox */}
                                    <button onClick={e => { e.stopPropagation(); toggleSelect(doc.id); }}
                                        className={cn('absolute top-4 left-4 z-20 transition-all',
                                            selectedIds.has(doc.id) ? 'opacity-100' : 'opacity-0 group-hover:opacity-100')}>
                                        {selectedIds.has(doc.id)
                                            ? <CheckSquare className="w-4 h-4 text-info" />
                                            : <Square className="w-4 h-4 text-brand-text/20" />}
                                    </button>

                                    {isMySignaturePending && (
                                        <div className="absolute top-3 right-3 z-20 flex items-center gap-1 px-1.5 py-0.5 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-full animate-pulse">
                                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                            <span className="text-[7px] font-black uppercase tracking-widest">Tu firma</span>
                                        </div>
                                    )}

                                    {isExpired && !isMySignaturePending && (
                                        <div className="absolute top-3 right-3 z-20 flex items-center gap-1 px-1.5 py-0.5 bg-danger/20 border border-danger/40 text-danger rounded-full">
                                            <AlertTriangle className="w-2.5 h-2.5" />
                                            <span className="text-[7px] font-black uppercase tracking-widest">Vencido</span>
                                        </div>
                                    )}
                                    {isExpiringSoon && !isMySignaturePending && (
                                        <div className="absolute top-3 right-3 z-20 flex items-center gap-1 px-1.5 py-0.5 bg-red-500/10 border border-red-500/20 text-red-400 rounded-full">
                                            <Clock className="w-2.5 h-2.5" />
                                            <span className="text-[7px] font-black uppercase tracking-widest">Vence pronto</span>
                                        </div>
                                    )}

                                    {/* Ícono + visor */}
                                    <PDFPreviewHover url={doc.url} title={doc.title}>
                                        <div className={cn(
                                            'w-10 h-10 rounded-xl flex items-center justify-center border mb-3 cursor-pointer',
                                            getCategoryColor(doc.category)
                                        )} onClick={() => {}}>
                                            {getFileIcon(doc.type)}
                                        </div>
                                    </PDFPreviewHover>

                                    {/* Info */}
                                    <h4 className="font-bold text-sm text-brand-text/90 leading-tight mb-1 line-clamp-2">{doc.title}</h4>
                                    <p className="text-[10px] text-brand-text/30 line-clamp-2 italic mb-3">{doc.contentSummary}</p>

                                    {/* Mover a carpeta */}
                                    <select
                                        value={(doc as any).folderId || ''}
                                        onChange={async e => {
                                            await moveDocument(doc.id, e.target.value || null);
                                            refresh();
                                        }}
                                        onClick={e => e.stopPropagation()}
                                        className="bg-brand-bg border border-brand-border rounded-lg w-full px-2 py-1 text-[10px] text-brand-text/50 outline-none appearance-none mb-3">
                                        <option value="">Sin carpeta</option>
                                        {uploadableFolders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                                    </select>

                                    {/* Footer */}
                                    <div className="mt-auto pt-3 border-t border-brand-border flex items-center justify-between">
                                        <span className="text-[9px] font-mono text-brand-text/20">
                                            {new Date(doc.createdAt).toLocaleDateString('es-CL')}
                                        </span>
                                        <div className="flex items-center gap-1">
                                            <button onClick={e => { e.stopPropagation(); duplicateDocument(doc); }}
                                                className="p-1.5 rounded-lg text-brand-text/20 hover:text-info hover:bg-info/10 transition-colors opacity-0 group-hover:opacity-100">
                                                <Copy className="w-3.5 h-3.5" />
                                            </button>
                                            <button onClick={e => { e.stopPropagation(); setVersionsDoc(doc); }} title="Versiones"
                                                className="p-1.5 rounded-lg text-brand-text/20 hover:text-brand-primary hover:bg-brand-primary/10 transition-colors opacity-0 group-hover:opacity-100">
                                                <History className="w-3.5 h-3.5" />
                                            </button>
                                            {puedeEditarVencimiento(doc) && (
                                                <button onClick={e => { e.stopPropagation(); setExpiryDoc(doc); }} title="Vencimiento"
                                                    className="p-1.5 rounded-lg text-brand-text/20 hover:text-brand-primary hover:bg-brand-primary/10 transition-colors opacity-0 group-hover:opacity-100">
                                                    <CalendarClock className="w-3.5 h-3.5" />
                                                </button>
                                            )}
                                            {showArchived ? (
                                                <button onClick={e => { e.stopPropagation(); handleRestore(doc); }} title="Restaurar"
                                                    className="p-1.5 rounded-lg text-brand-text/20 hover:text-success hover:bg-success/10 transition-colors opacity-0 group-hover:opacity-100">
                                                    <RotateCcw className="w-3.5 h-3.5" />
                                                </button>
                                            ) : (
                                                puedeArchivar(doc) && (
                                                <button onClick={e => { e.stopPropagation(); handleArchive(doc); }} title="Archivar"
                                                    className="p-1.5 rounded-lg text-brand-text/20 hover:text-warning hover:bg-warning/10 transition-colors opacity-0 group-hover:opacity-100">
                                                    <Archive className="w-3.5 h-3.5" />
                                                </button>
                                                )
                                            )}
                                            {puedeBorrarCarpeta && (
                                            <button onClick={e => { e.stopPropagation(); setConfirmDelete(doc); }} title="Eliminar definitivamente"
                                                className="p-1.5 rounded-lg text-brand-text/20 hover:text-danger hover:bg-danger/10 transition-colors opacity-0 group-hover:opacity-100">
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                            )}
                                            <button onClick={e => { e.stopPropagation(); setSigningDoc(doc); }}
                                                className={cn(
                                                    'flex items-center gap-1 px-2 py-1 border rounded-lg transition-all text-[8px] font-bold uppercase',
                                                    doc.signed
                                                        ? 'bg-emerald-500/5 border-emerald-500/10 text-emerald-500 hover:bg-emerald-500/10'
                                                        : 'bg-blue-500/10 border-blue-500/20 text-blue-400 hover:bg-blue-500/20'
                                                )}>
                                                {doc.signed
                                                    ? <><ShieldCheck className="w-2.5 h-2.5" /> Firmado</>
                                                    : <><PenTool className="w-2.5 h-2.5" /> Firmar</>
                                                }
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                ) : (
                    /* Vista lista */
                    <div className="bg-brand-surface/20 border border-brand-border rounded-2xl overflow-hidden">
                        <div className="grid grid-cols-[40px_1fr_120px_100px_90px_160px] gap-3 px-5 py-3 bg-brand-surface/50 border-b border-brand-border">
                            <button onClick={toggleSelectAll} className="flex justify-center">
                                {selectedIds.size === filteredDocs.length && filteredDocs.length > 0
                                    ? <CheckSquare className="w-4 h-4 text-info" />
                                    : <Square className="w-4 h-4 text-brand-text/20" />}
                            </button>
                            {['Documento', 'Carpeta', 'Fecha', 'Estado', 'Acciones'].map(h => (
                                <div key={h} className="text-[10px] font-black uppercase tracking-widest text-brand-text/30">{h}</div>
                            ))}
                        </div>
                        {filteredDocs.map(doc => (
                            <motion.div key={doc.id}
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                className={cn(
                                    'grid grid-cols-[40px_1fr_120px_100px_90px_160px] gap-3 px-5 py-3 border-b border-brand-border/30 items-center hover:bg-brand-surface/50 transition-colors group',
                                    selectedIds.has(doc.id) && 'bg-info/5'
                                )}>
                                <div className="flex justify-center" onClick={e => { e.stopPropagation(); toggleSelect(doc.id); }}>
                                    {selectedIds.has(doc.id)
                                        ? <CheckSquare className="w-4 h-4 text-info" />
                                        : <Square className="w-4 h-4 text-brand-text/10 group-hover:text-brand-text/20" />}
                                </div>
                                <PDFPreviewHover url={doc.url} title={doc.title}>
                                    <div className="flex items-center gap-3 cursor-pointer" onClick={() => abrirDocumentoFirmado(doc.url)}>
                                        <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0', getCategoryColor(doc.category))}>
                                            {getFileIcon(doc.type, 'w-4 h-4')}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-bold text-brand-text group-hover:text-info transition-colors truncate">{doc.title}</p>
                                            {doc.signerName && <p className="text-[9px] text-brand-text/20 truncate">{doc.signerName}</p>}
                                        </div>
                                    </div>
                                </PDFPreviewHover>
                                <div>
                                    {(doc as any).folderId ? (
                                        <span className="text-[9px] font-bold text-brand-text/40 truncate">
                                            {folders.find(f => f.id === (doc as any).folderId)?.name || '—'}
                                        </span>
                                    ) : <span className="text-[9px] text-brand-text/20">—</span>}
                                </div>
                                <div className="text-[10px] font-mono text-brand-text/30">
                                    {new Date(doc.createdAt).toLocaleDateString('es-CL')}
                                </div>
                                <div className="flex items-center gap-1 flex-wrap">
                                    <span className={cn(
                                        'text-[8px] font-black px-2 py-0.5 rounded-full uppercase border',
                                        doc.signed
                                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                            : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                    )}>
                                        {doc.signed ? 'Firmado' : 'Pendiente'}
                                    </span>
                                    {!!(doc.expiryDate && new Date(doc.expiryDate) < new Date()) && (
                                        <span className="text-[8px] font-black px-2 py-0.5 rounded-full uppercase border bg-danger/20 text-danger border-danger/40">
                                            Vencido
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-1">
                                    <button onClick={() => setSigningDoc(doc)}
                                        className={cn('p-1.5 rounded-lg border transition-all',
                                            doc.signed ? 'border-emerald-500/20 text-emerald-400' : 'border-info/20 text-info')}>
                                        <PenTool className="w-3 h-3" />
                                    </button>
                                    <button onClick={() => duplicateDocument(doc)}
                                        className="p-1.5 border border-brand-border text-brand-text/30 rounded-lg hover:text-info hover:border-info/20 transition-all">
                                        <Copy className="w-3 h-3" />
                                    </button>
                                    <button onClick={() => setVersionsDoc(doc)} title="Versiones"
                                        className="p-1.5 border border-brand-border text-brand-text/30 rounded-lg hover:text-brand-primary hover:border-brand-primary/20 transition-all">
                                        <History className="w-3 h-3" />
                                    </button>
                                    {puedeEditarVencimiento(doc) && (
                                        <button onClick={() => setExpiryDoc(doc)} title="Vencimiento"
                                            className="p-1.5 border border-brand-border text-brand-text/30 rounded-lg hover:text-brand-primary hover:border-brand-primary/20 transition-all">
                                            <CalendarClock className="w-3 h-3" />
                                        </button>
                                    )}
                                    {showArchived ? (
                                        <button onClick={() => handleRestore(doc)} title="Restaurar"
                                            className="p-1.5 border border-success/20 text-success rounded-lg hover:bg-success/10 transition-all">
                                            <RotateCcw className="w-3 h-3" />
                                        </button>
                                    ) : (
                                        puedeArchivar(doc) && (
                                        <button onClick={() => handleArchive(doc)} title="Archivar"
                                            className="p-1.5 border border-warning/20 text-warning rounded-lg hover:bg-warning/10 transition-all">
                                            <Archive className="w-3 h-3" />
                                        </button>
                                        )
                                    )}
                                    {puedeBorrarCarpeta && (
                                    <button onClick={() => setConfirmDelete(doc)} title="Eliminar definitivamente"
                                        className="p-1.5 border border-red-500/20 text-red-400 rounded-lg hover:bg-red-500/10 transition-all">
                                        <Trash2 className="w-3 h-3" />
                                    </button>
                                    )}
                                </div>
                            </motion.div>
                        ))}
                        {filteredDocs.length === 0 && (
                            <div className="py-12 text-center text-brand-text/20 text-xs">Sin documentos.</div>
                        )}
                    </div>
                )}

                {filteredDocs.length === 0 && !loading && (
                    <div className="py-16 text-center">
                        <Search className="w-10 h-10 text-brand-text/5 mx-auto mb-3" />
                        <p className="text-brand-text/30 text-sm">Sin documentos en esta vista.</p>
                    </div>
                )}
            </div>

            {/* ── Modales ── */}
            {showUploadModal && <DocumentUploadModal onClose={() => setShowUploadModal(false)} onUpload={uploadDocument} />}
            {showConfigModal && <BatteryConfigModal onClose={() => setShowConfigModal(false)} />}
            {showEditor && (
                <NativeDocumentEditor onClose={() => setShowEditor(false)}
                    onSave={async (title, content) => createNativeDocument(title, content, { category: 'other' })} />
            )}

            {signingDoc && (
                <DigitalSignatureModal
                    documentTitle={signingDoc.title} documentUrl={signingDoc.url}
                    isPdf={!signingDoc.url.endsWith('.html')}
                    onClose={() => setSigningDoc(null)}
                    onConfirm={async (name, style, signatures, size, color) => {
                        const isNative = signingDoc.url.endsWith('.html');
                        const result = isNative
                            ? await signNativeDocument(signingDoc, name, style)
                            : await signPDFDocument(signingDoc, name, signatures || [], size as any, color as any);
                        if (result.success) { await refresh(); setSigningDoc(null); }
                        else alert('Error al firmar: ' + result.error);
                    }} />
            )}

            <AnimatePresence>
                {confirmDelete && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm">
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                            className="w-full max-w-sm bg-brand-bg border border-brand-border rounded-3xl p-8 text-center shadow-2xl">
                            <div className="w-16 h-16 bg-danger/10 border border-danger/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
                                <AlertTriangle className="w-8 h-8 text-danger" />
                            </div>
                            <h3 className="text-lg font-black text-brand-text mb-2">¿Eliminar definitivamente?</h3>
                            <p className="text-xs text-brand-text/40 mb-6">
                                <span className="text-brand-text font-bold">"{confirmDelete.title}"</span> se borrará de la base y del almacenamiento. Esta acción NO se puede deshacer. Para conservarlo recuperable, usa "Archivar".
                            </p>
                            <div className="flex flex-col gap-3">
                                <button onClick={async () => {
                                    const res = await deleteDocument(confirmDelete.id, confirmDelete.url);
                                    if (res.success) { setConfirmDelete(null); showToast('Documento eliminado', true); }
                                    else { setConfirmDelete(null); notifyRls(res); }
                                }} className="w-full py-3 bg-danger text-white rounded-2xl text-xs font-black uppercase hover:bg-red-600 transition-all">
                                    Eliminar definitivamente
                                </button>
                                <button onClick={() => setConfirmDelete(null)}
                                    className="w-full py-3 bg-brand-surface text-brand-text/40 rounded-2xl text-xs font-black uppercase hover:bg-brand-surface/80 transition-all">
                                    Cancelar
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {requestingDoc && (
                <RequestSignatureModal documentId={requestingDoc.id}
                    onClose={() => setRequestingDoc(null)}
                    onSuccess={() => { setRequestingDoc(null); refresh(); }} />
            )}

            {versionsDoc && (
                <DocumentVersionsModal
                    doc={versionsDoc}
                    canManage={puedeGestionarVersiones(versionsDoc)}
                    onClose={() => setVersionsDoc(null)}
                    onChanged={refresh}
                    notify={showToast}
                />
            )}

            {expiryDoc && (
                <ExpiryDateModal
                    doc={expiryDoc}
                    onClose={() => setExpiryDoc(null)}
                    onSave={updateExpiryDate}
                    notify={showToast}
                />
            )}

            {/* Toast de feedback / errores RLS */}
            {toast && (
                <div className={cn(
                    'fixed bottom-6 right-6 z-[300] flex items-center gap-2 px-4 py-3 rounded-xl shadow-2xl border animate-in slide-in-from-bottom-4',
                    toast.ok ? 'bg-success/10 border-success/30 text-success' : 'bg-danger/10 border-danger/30 text-danger'
                )}>
                    {toast.ok ? <ShieldCheck className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                    <span className="text-xs font-bold">{toast.msg}</span>
                </div>
            )}
        </div>
    );
};
