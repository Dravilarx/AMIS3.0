import React, { useState, useEffect } from 'react';
import {
    FileText, Download, CheckCircle2, AlertCircle, Loader2,
    Briefcase, Building2, Newspaper, Award,
    ChevronRight, ExternalLink, BarChart2,
    Sparkles,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useNews } from '../../hooks/useNews';
import {
    CATEGORY_LABELS, CATEGORY_COLORS, CATEGORY_ICONS,
    type NewsArticle,
} from '../../types/news';

// ─── Utilidades ───────────────────────────────────────────────────────────────
const formatCLP = (n: number) =>
    n.toLocaleString('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });

const formatDate = (d?: string) =>
    d ? new Date(d).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

// ─── Vista: Mis Documentos ────────────────────────────────────────────────────
export const MisDocumentosView: React.FC = () => {
    const { user }  = useAuth();
    const [docs,    setDocs]    = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const DOC_LABELS: Record<string, string> = {
        titulo:          'Certificado de Título',
        especialidad:    'Certificado de Especialidad',
        sis:             'Registro SIS / Colegio',
        subespecialidad: 'Sub-especialidad / Fellow',
        cv:              'Currículum Vitae',
        seguro_civil:    'Seguro Responsabilidad Civil',
        cedula:          'Cédula de Identidad',
        otro:            'Otro documento',
    };

    useEffect(() => {
        if (!user?.email) return;
        const load = async () => {
            setLoading(true);
            // Buscar el professional_id del médico logueado
            const { data: prof } = await supabase
                .from('professionals')
                .select('id')
                .eq('email', user.email)
                .single();

            if (!prof) { setLoading(false); return; }

            // Cargar documentos académicos
            const { data: acadDocs } = await supabase
                .from('professional_academic_docs')
                .select('*')
                .eq('professional_id', prof.id);

            // Cargar documentos firmados (inducción, etc.)
            const { data: signedDocs } = await supabase
                .from('documents')
                .select('id, title, url, signed, signed_at, category, created_at')
                .eq('target_id', prof.id)
                .eq('signed', true);

            setDocs([
                ...(acadDocs || []).map((d: any) => ({
                    id:       d.id,
                    label:    DOC_LABELS[d.doc_type] || d.doc_type,
                    url:      d.file_url,
                    fileName: d.file_name,
                    date:     d.uploaded_at,
                    type:     'academic',
                    isPending: d.is_pending,
                })),
                ...(signedDocs || []).map((d: any) => ({
                    id:       d.id,
                    label:    d.title,
                    url:      d.url,
                    fileName: d.title,
                    date:     d.signed_at || d.created_at,
                    type:     'signed',
                    isPending: false,
                })),
            ]);
            setLoading(false);
        };
        load();
    }, [user]);

    if (loading) return (
        <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 text-brand-primary animate-spin" />
        </div>
    );

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            <div>
                <h2 className="text-xl font-black text-brand-text">Mis Documentos</h2>
                <p className="text-xs text-brand-text/40 mt-0.5">Todos tus documentos registrados en AMIS</p>
            </div>

            {docs.length === 0 ? (
                <div className="text-center py-16 border border-dashed border-brand-border rounded-2xl">
                    <FileText className="w-10 h-10 text-brand-text/10 mx-auto mb-3" />
                    <p className="text-sm text-brand-text/30">Sin documentos registrados aún.</p>
                    <p className="text-xs text-brand-text/20 mt-1">RRHH te enviará un link para completar tu expediente.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {/* Académicos */}
                    {docs.filter(d => d.type === 'academic').length > 0 && (
                        <div className="space-y-2">
                            <p className="text-[10px] font-black uppercase tracking-widest text-brand-text/30">Documentos Académicos</p>
                            {docs.filter(d => d.type === 'academic').map(doc => (
                                <div key={doc.id} className={cn(
                                    'flex items-center gap-3 p-4 rounded-2xl border transition-all',
                                    doc.isPending
                                        ? 'bg-amber-500/5 border-amber-500/20'
                                        : doc.url
                                        ? 'bg-emerald-500/5 border-emerald-500/20'
                                        : 'bg-brand-surface border-brand-border'
                                )}>
                                    <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
                                        doc.isPending ? 'bg-amber-500/10' : doc.url ? 'bg-emerald-500/10' : 'bg-brand-surface')}>
                                        {doc.isPending
                                            ? <AlertCircle className="w-5 h-5 text-amber-400" />
                                            : doc.url
                                            ? <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                                            : <AlertCircle className="w-5 h-5 text-brand-text/20" />
                                        }
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-brand-text">{doc.label}</p>
                                        <p className="text-[10px] text-brand-text/30">
                                            {doc.isPending ? 'Pendiente de subida' : doc.url ? `Subido el ${formatDate(doc.date)}` : 'No subido'}
                                        </p>
                                    </div>
                                    {doc.url && !doc.isPending && (
                                        <a href={doc.url} target="_blank" rel="noopener noreferrer"
                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-surface border border-brand-border rounded-xl text-xs font-bold text-brand-text hover:bg-brand-primary/10 transition-all">
                                            <ExternalLink className="w-3 h-3" /> Ver
                                        </a>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Firmados */}
                    {docs.filter(d => d.type === 'signed').length > 0 && (
                        <div className="space-y-2 mt-4">
                            <p className="text-[10px] font-black uppercase tracking-widest text-brand-text/30">Documentos Firmados</p>
                            {docs.filter(d => d.type === 'signed').map(doc => (
                                <div key={doc.id} className="flex items-center gap-3 p-4 rounded-2xl border bg-blue-500/5 border-blue-500/20">
                                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                                        <FileText className="w-5 h-5 text-blue-400" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-brand-text">{doc.label}</p>
                                        <p className="text-[10px] text-brand-text/30">Firmado el {formatDate(doc.date)}</p>
                                    </div>
                                    {doc.url && (
                                        <a href={doc.url} target="_blank" rel="noopener noreferrer"
                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-surface border border-brand-border rounded-xl text-xs font-bold text-brand-text hover:bg-brand-primary/10 transition-all">
                                            <Download className="w-3 h-3" /> Descargar
                                        </a>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

// ─── Vista: Mis Contratos ─────────────────────────────────────────────────────
export const MisContratosView: React.FC = () => {
    const { user }       = useAuth();
    const [contracts,    setContracts]    = useState<any[]>([]);
    const [professional, setProfessional] = useState<any>(null);
    const [loading,      setLoading]      = useState(true);

    useEffect(() => {
        if (!user?.email) return;
        const load = async () => {
            setLoading(true);
            const { data: prof } = await supabase
                .from('professionals')
                .select('id, name, last_name, role, specialty, joining_date, status, is_active')
                .eq('email', user.email)
                .single();

            if (!prof) { setLoading(false); return; }
            setProfessional(prof);

            const { data: contrs } = await supabase
                .from('contracts')
                .select('*')
                .eq('professional_id', prof.id);

            setContracts(contrs || []);
            setLoading(false);
        };
        load();
    }, [user]);

    if (loading) return (
        <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 text-brand-primary animate-spin" />
        </div>
    );

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            <div>
                <h2 className="text-xl font-black text-brand-text">Mis Contratos</h2>
                <p className="text-xs text-brand-text/40 mt-0.5">Relación contractual vigente con Holding Portezuelo</p>
            </div>

            {/* Ficha del profesional */}
            {professional && (
                <div className="p-5 bg-gradient-to-br from-brand-primary/10 to-teal-600/5 border border-brand-primary/20 rounded-2xl">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-brand-primary/20 flex items-center justify-center flex-shrink-0">
                            <span className="text-xl font-black text-brand-primary">
                                {professional.name?.[0]}{professional.last_name?.[0]}
                            </span>
                        </div>
                        <div>
                            <p className="text-lg font-black text-brand-text">
                                {professional.name} {professional.last_name}
                            </p>
                            <p className="text-xs text-brand-text/50">{professional.role} · {professional.specialty || 'Sin especialidad registrada'}</p>
                            <div className="flex items-center gap-2 mt-1">
                                <span className={cn('text-[9px] font-black px-2 py-0.5 rounded-full uppercase',
                                    professional.is_active
                                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                        : 'bg-red-500/10 text-red-400 border border-red-500/20')}>
                                    {professional.is_active ? 'Activo' : 'Inactivo'}
                                </span>
                                {professional.joining_date && (
                                    <span className="text-[9px] text-brand-text/30 font-mono">
                                        Desde {formatDate(professional.joining_date)}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Contratos */}
            {contracts.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-brand-border rounded-2xl">
                    <Briefcase className="w-10 h-10 text-brand-text/10 mx-auto mb-3" />
                    <p className="text-sm text-brand-text/30">Sin contratos registrados.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    <p className="text-[10px] font-black uppercase tracking-widest text-brand-text/30">
                        {contracts.length} contrato(s) vigente(s)
                    </p>
                    {contracts.map((c: any, i: number) => (
                        <div key={c.id || i} className="p-4 bg-brand-surface border border-brand-border rounded-2xl space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-xl bg-brand-primary/10 flex items-center justify-center">
                                        <Building2 className="w-4 h-4 text-brand-primary" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-black text-brand-text">{c.company}</p>
                                        <p className="text-[10px] text-brand-text/40 uppercase tracking-wider">{c.type || 'Sin tipo'}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-lg font-black text-brand-primary">{formatCLP(Number(c.amount))}</p>
                                    <p className="text-[9px] text-brand-text/30">mensual</p>
                                </div>
                            </div>
                        </div>
                    ))}

                    {/* Total */}
                    {contracts.length > 1 && (
                        <div className="flex items-center justify-between p-4 bg-brand-primary/5 border border-brand-primary/20 rounded-2xl">
                            <span className="text-sm font-black text-brand-text">Total mensual</span>
                            <span className="text-xl font-black text-brand-primary">
                                {formatCLP(contracts.reduce((s: number, c: any) => s + Number(c.amount), 0))}
                            </span>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

// ─── Vista: Noticias ──────────────────────────────────────────────────────────
export const MisNoticiasView: React.FC = () => {
    const { articles, loading, markAsRead } = useNews();
    const [selected, setSelected] = useState<NewsArticle | null>(null);

    const handleOpen = (a: NewsArticle) => {
        setSelected(a);
        if (!a.isRead) markAsRead(a.id);
    };

    if (loading) return (
        <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 text-brand-primary animate-spin" />
        </div>
    );

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-black text-brand-text">Noticias & Comunicados</h2>
                    <p className="text-xs text-brand-text/40 mt-0.5">
                        {articles.filter(a => !a.isRead).length} sin leer de {articles.length}
                    </p>
                </div>
            </div>

            {articles.length === 0 ? (
                <div className="text-center py-16 border border-dashed border-brand-border rounded-2xl">
                    <Newspaper className="w-10 h-10 text-brand-text/10 mx-auto mb-3" />
                    <p className="text-sm text-brand-text/30">Sin noticias publicadas.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {articles.map(a => (
                        <div key={a.id} onClick={() => handleOpen(a)}
                            className={cn(
                                'relative flex items-start gap-4 p-4 rounded-2xl border cursor-pointer transition-all hover:scale-[1.01]',
                                a.isRead
                                    ? 'bg-brand-surface/30 border-brand-border/50'
                                    : 'bg-brand-surface border-brand-border',
                                a.priority === 'urgente' && 'border-red-500/30'
                            )}>
                            {!a.isRead && (
                                <div className="absolute left-0 top-4 w-1 h-8 bg-brand-primary rounded-r-full" />
                            )}
                            {(a.coverImageUrl || a.imageUrls?.[0]) && (
                                <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0">
                                    <img src={a.coverImageUrl || a.imageUrls[0]} alt=""
                                        className="w-full h-full object-cover" />
                                </div>
                            )}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                    <span className={cn('px-2 py-0.5 rounded-full text-[9px] font-black uppercase border',
                                        CATEGORY_COLORS[a.category])}>
                                        {CATEGORY_ICONS[a.category]} {CATEGORY_LABELS[a.category]}
                                    </span>
                                    {a.priority === 'urgente' && (
                                        <span className="text-[9px] font-black text-red-400">🔴 Urgente</span>
                                    )}
                                </div>
                                <p className={cn('text-sm font-bold leading-snug',
                                    a.isRead ? 'text-brand-text/60' : 'text-brand-text/90')}>
                                    {a.title}
                                </p>
                                {a.excerpt && (
                                    <p className="text-xs text-brand-text/30 line-clamp-1 mt-0.5">{a.excerpt}</p>
                                )}
                                <p className="text-[9px] text-brand-text/20 font-mono mt-1">{a.authorName}</p>
                            </div>
                            <ChevronRight className="w-4 h-4 text-brand-text/20 flex-shrink-0 mt-1" />
                        </div>
                    ))}
                </div>
            )}

            {/* Artículo seleccionado */}
            {selected && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
                    <div className="w-full max-w-2xl max-h-[85vh] bg-brand-bg border border-brand-border rounded-3xl overflow-hidden flex flex-col shadow-2xl">
                        {selected.coverImageUrl && (
                            <div className="h-48 overflow-hidden flex-shrink-0">
                                <img src={selected.coverImageUrl} alt="" className="w-full h-full object-cover" />
                            </div>
                        )}
                        <div className="flex-1 overflow-y-auto p-6 space-y-4">
                            <span className={cn('px-2 py-0.5 rounded-full text-[9px] font-black uppercase border',
                                CATEGORY_COLORS[selected.category])}>
                                {CATEGORY_ICONS[selected.category]} {CATEGORY_LABELS[selected.category]}
                            </span>
                            <h2 className="text-xl font-black text-brand-text">{selected.title}</h2>
                            <p className="text-[10px] text-brand-text/30 font-mono">
                                {selected.authorName} · {new Date(selected.publishedAt || selected.createdAt).toLocaleDateString('es-CL')}
                            </p>
                            <div className="prose prose-sm prose-invert max-w-none text-brand-text/70 leading-relaxed text-sm whitespace-pre-line">
                                {selected.content}
                            </div>
                        </div>
                        <div className="p-4 border-t border-brand-border flex-shrink-0">
                            <button onClick={() => setSelected(null)}
                                className="w-full py-3 bg-brand-surface border border-brand-border rounded-2xl text-sm font-black text-brand-text/60 hover:text-brand-text transition-all">
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// ─── Vista: Mis Competencias ──────────────────────────────────────────────────
export const MisCompetenciasView: React.FC<{ onNavigate: (v: any) => void }> = ({ onNavigate }) => {
    const { user }    = useAuth();
    const [data,      setData]    = useState<any | null>(null);
    const [loading,   setLoading] = useState(true);

    useEffect(() => {
        if (!user?.email) return;
        const load = async () => {
            setLoading(true);
            const { data: prof } = await supabase
                .from('professionals')
                .select('id')
                .eq('email', user.email)
                .single();

            if (!prof) { setLoading(false); return; }

            const { data: comp } = await supabase
                .from('competencias_radiologos')
                .select('status, submitted_at, reviewed_at, respuestas, agrawall_findings')
                .eq('professional_id', prof.id)
                .maybeSingle();

            setData(comp);
            setLoading(false);
        };
        load();
    }, [user]);

    const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
        pending: { label: 'Enviada — pendiente de revisión', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
        draft:   { label: 'Borrador guardado',               color: 'text-sky-400',   bg: 'bg-sky-500/10    border-sky-500/20'   },
        active:  { label: 'Aprobada — perfil oficial',       color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
    };

    if (loading) return (
        <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 text-brand-primary animate-spin" />
        </div>
    );

    const respuestas = data?.respuestas || {};
    const total      = Object.keys(respuestas).length;
    const nivel3     = Object.values(respuestas).filter((v: any) => v === 3).length;
    const nivel2     = Object.values(respuestas).filter((v: any) => v === 2).length;
    const nivel1     = Object.values(respuestas).filter((v: any) => v === 1).length;

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            <div>
                <h2 className="text-xl font-black text-brand-text">Mis Competencias</h2>
                <p className="text-xs text-brand-text/40 mt-0.5">Auto-evaluación de competencias clínicas</p>
            </div>

            {!data ? (
                <div className="space-y-4">
                    <div className="text-center py-10 border border-dashed border-brand-border rounded-2xl">
                        <Award className="w-12 h-12 text-brand-text/10 mx-auto mb-3" />
                        <p className="text-sm font-bold text-brand-text/30 mb-1">Sin evaluación registrada</p>
                        <p className="text-xs text-brand-text/20">Completa tu auto-evaluación de competencias</p>
                    </div>
                    <button onClick={() => onNavigate('onboarding')}
                        className="w-full py-3.5 rounded-2xl bg-brand-primary text-white font-black text-sm hover:brightness-110 transition-all flex items-center justify-center gap-2 shadow-lg shadow-brand-primary/20">
                        <Sparkles className="w-4 h-4" /> Iniciar Auto-evaluación
                    </button>
                </div>
            ) : (
                <div className="space-y-4">
                    {/* Estado */}
                    {data.status && (
                        <div className={cn('p-4 rounded-2xl border', STATUS_MAP[data.status]?.bg || 'bg-brand-surface border-brand-border')}>
                            <p className={cn('text-sm font-black', STATUS_MAP[data.status]?.color || 'text-brand-text')}>
                                {STATUS_MAP[data.status]?.label || data.status}
                            </p>
                            {data.submitted_at && (
                                <p className="text-[10px] text-brand-text/30 font-mono mt-0.5">
                                    Enviada el {formatDate(data.submitted_at)}
                                </p>
                            )}
                            {data.reviewed_at && (
                                <p className="text-[10px] text-brand-text/30 font-mono">
                                    Revisada el {formatDate(data.reviewed_at)}
                                </p>
                            )}
                        </div>
                    )}

                    {/* Stats */}
                    {total > 0 && (
                        <div className="grid grid-cols-4 gap-3">
                            {[
                                { label: 'Total',          val: total,  color: 'text-brand-text' },
                                { label: 'Subespecialista',val: nivel3,  color: 'text-amber-400' },
                                { label: 'Avanzado',       val: nivel2,  color: 'text-teal-400' },
                                { label: 'Básico',         val: nivel1,  color: 'text-sky-400' },
                            ].map(s => (
                                <div key={s.label} className="p-3 bg-brand-surface border border-brand-border rounded-xl text-center">
                                    <p className={cn('text-2xl font-black', s.color)}>{s.val}</p>
                                    <p className="text-[9px] text-brand-text/30 uppercase tracking-widest mt-0.5">{s.label}</p>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Barra de distribución */}
                    {total > 0 && (
                        <div className="p-4 bg-brand-surface border border-brand-border rounded-2xl space-y-2">
                            <p className="text-[10px] font-black uppercase tracking-widest text-brand-text/30">Distribución</p>
                            <div className="flex h-3 rounded-full overflow-hidden gap-0.5">
                                {nivel3 > 0 && <div style={{ width: `${(nivel3/total)*100}%` }} className="bg-amber-400 rounded-full" title="Subespecialista" />}
                                {nivel2 > 0 && <div style={{ width: `${(nivel2/total)*100}%` }} className="bg-teal-400 rounded-full" title="Avanzado" />}
                                {nivel1 > 0 && <div style={{ width: `${(nivel1/total)*100}%` }} className="bg-sky-400 rounded-full" title="Básico" />}
                                {(total - nivel3 - nivel2 - nivel1) > 0 && (
                                    <div style={{ width: `${((total-nivel3-nivel2-nivel1)/total)*100}%` }} className="bg-brand-border rounded-full" title="No informa" />
                                )}
                            </div>
                            <div className="flex items-center gap-4 flex-wrap">
                                {[
                                    { color: 'bg-amber-400',  label: 'Subespecialista' },
                                    { color: 'bg-teal-400', label: 'Avanzado' },
                                    { color: 'bg-sky-400',    label: 'Básico' },
                                    { color: 'bg-brand-border', label: 'No informa' },
                                ].map(l => (
                                    <div key={l.label} className="flex items-center gap-1.5">
                                        <div className={cn('w-2 h-2 rounded-full', l.color)} />
                                        <span className="text-[10px] text-brand-text/30">{l.label}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Actualizar */}
                    <button onClick={() => onNavigate('onboarding')}
                        className="w-full py-3 rounded-2xl border border-brand-primary/20 text-brand-primary font-black text-sm hover:bg-brand-primary/10 transition-all flex items-center justify-center gap-2">
                        <BarChart2 className="w-4 h-4" /> Actualizar mi evaluación
                    </button>
                </div>
            )}
        </div>
    );
};
