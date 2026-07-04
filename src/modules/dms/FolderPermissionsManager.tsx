import React, { useState } from 'react';
import { Lock, FolderKanban, Loader2, ShieldCheck, Eye, UploadCloud, Archive, CheckCircle2, AlertTriangle, HardDriveDownload, Search } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useFolders } from '../../hooks/useFolders';
import { useMyLevel, NIVEL_OPTIONS } from '../../lib/accessLevels';
import { supabase } from '../../lib/supabase';
import { isRlsError } from '../../hooks/useDocuments';

type Campo = 'nivelVer' | 'nivelSubir' | 'nivelArchivar';

// Selector de nivel: "N · Etiqueta" (semántica: "nivel N o superior puede").
const NivelSelect: React.FC<{ value: number; onChange: (n: number) => void }> = ({ value, onChange }) => (
    <select
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full bg-brand-bg border border-brand-border rounded-lg px-3 py-2 text-xs font-bold text-brand-text outline-none focus:border-brand-primary/50"
    >
        {NIVEL_OPTIONS.map(o => (
            <option key={o.nivel} value={o.nivel}>{o.nivel} · {o.etiqueta}</option>
        ))}
    </select>
);

// Formatea bytes a una unidad legible (KB/MB/GB).
const formatBytes = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    const units = ['KB', 'MB', 'GB', 'TB'];
    let val = bytes;
    let i = -1;
    do { val /= 1024; i++; } while (val >= 1024 && i < units.length - 1);
    return `${val.toFixed(1)} ${units[i]}`;
};

interface ArchivoHuerfano {
    archivo: string;
    tamanoBytes: number;
    creado: string;
}

const OrphanFilesPanel: React.FC<{ notify: (msg: string, ok: boolean) => void }> = ({ notify }) => {
    const [archivos, setArchivos] = useState<ArchivoHuerfano[] | null>(null);
    const [loading, setLoading] = useState(false);

    const buscar = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase.rpc('fn_archivos_huerfanos');
            if (error) throw error;
            setArchivos((data || []).map((r: any) => ({
                archivo: r.archivo,
                tamanoBytes: r.tamano_bytes,
                creado: r.creado,
            })));
        } catch (err: any) {
            setArchivos(null);
            notify(isRlsError(err) ? 'No tienes permisos para esta acción' : (err.message || 'No se pudo buscar huérfanos'), false);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-5">
            <div className="flex items-start gap-2 px-4 py-3 rounded-xl bg-brand-bg border border-brand-border text-brand-text/50">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-warning" />
                <p className="text-[11px] font-bold leading-relaxed">
                    Archivos en Storage sin registro en el sistema. La eliminación se realiza manualmente desde Supabase.
                </p>
            </div>

            <button
                onClick={buscar}
                disabled={loading}
                className="flex items-center gap-2 px-5 py-3 bg-brand-primary text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:brightness-110 transition-all shadow-lg shadow-brand-primary/20 disabled:opacity-50"
            >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                Buscar huérfanos
            </button>

            {archivos !== null && (
                <div className="bg-brand-surface border border-brand-border rounded-2xl shadow-xl overflow-x-auto">
                    {archivos.length === 0 ? (
                        <p className="text-center text-brand-text/30 text-xs py-16 uppercase font-black tracking-widest">Sin archivos huérfanos</p>
                    ) : (
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="bg-brand-bg">
                                    <th className="text-left px-4 py-3 text-[9px] font-black uppercase tracking-widest text-brand-text/50 border-b border-brand-border">Archivo</th>
                                    <th className="text-left px-4 py-3 text-[9px] font-black uppercase tracking-widest text-brand-text/50 border-b border-brand-border w-32">Tamaño</th>
                                    <th className="text-left px-4 py-3 text-[9px] font-black uppercase tracking-widest text-brand-text/50 border-b border-brand-border w-48">Creado</th>
                                </tr>
                            </thead>
                            <tbody>
                                {archivos.map((a, i) => (
                                    <tr key={`${a.archivo}-${i}`} className="hover:bg-brand-bg/40 transition-colors">
                                        <td className="px-4 py-3 border-b border-brand-border text-xs font-mono text-brand-text truncate max-w-md">{a.archivo}</td>
                                        <td className="px-4 py-3 border-b border-brand-border text-xs font-bold text-brand-text/60">{formatBytes(a.tamanoBytes)}</td>
                                        <td className="px-4 py-3 border-b border-brand-border text-xs text-brand-text/40">
                                            {new Date(a.creado).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' })}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            )}
        </div>
    );
};

export const FolderPermissionsManager: React.FC = () => {
    const { level, loading: levelLoading } = useMyLevel();
    const { folders, loading, setFolderPermissions } = useFolders();
    const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
    const [savingId, setSavingId] = useState<string | null>(null);
    const [tab, setTab] = useState<'permisos' | 'huerfanos'>('permisos');

    const showToast = (msg: string, ok: boolean) => {
        setToast({ msg, ok });
        setTimeout(() => setToast(null), 3500);
    };

    // Guard defensivo (además del guard de ruta): solo Dirección (nivel 1).
    if (!levelLoading && level > 1) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 text-center">
                <Lock className="w-12 h-12 text-brand-text/20" />
                <p className="text-brand-text/40 text-sm font-black uppercase tracking-widest">Solo Dirección (nivel 1) puede configurar permisos de carpetas.</p>
            </div>
        );
    }

    const guardar = async (folderId: string, campo: Campo, valor: number) => {
        const f = folders.find(x => x.id === folderId);
        if (!f) return;
        const next = {
            nivelVer:      campo === 'nivelVer' ? valor : f.nivelVer,
            nivelSubir:    campo === 'nivelSubir' ? valor : f.nivelSubir,
            nivelArchivar: campo === 'nivelArchivar' ? valor : f.nivelArchivar,
        };
        setSavingId(folderId);
        const res = await setFolderPermissions(folderId, next);
        setSavingId(null);
        if (res.success) showToast(`Permisos de "${f.name}" actualizados`, true);
        else if (res.rls) showToast('No tienes permisos para esta acción', false);
        else showToast(res.error || 'No se pudo guardar', false);
    };

    return (
        <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-primary to-black flex items-center justify-center shadow-xl shadow-brand-primary/20">
                    <ShieldCheck className="w-6 h-6 text-white" />
                </div>
                <div>
                    <h1 className="text-2xl font-black text-brand-text tracking-tighter uppercase leading-none">Permisos de Carpetas</h1>
                    <p className="text-[10px] text-brand-primary font-black uppercase tracking-[0.3em] mt-1.5">Archivo Digital · Control por nivel de acceso</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex bg-brand-surface/50 border border-brand-border p-1.5 rounded-2xl w-fit gap-1">
                <button
                    onClick={() => setTab('permisos')}
                    className={cn("px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all", tab === 'permisos' ? 'bg-brand-bg text-brand-text shadow-sm' : 'text-brand-text/40 hover:text-brand-text/80')}
                >
                    Permisos por Carpeta
                </button>
                <button
                    onClick={() => setTab('huerfanos')}
                    className={cn("flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all", tab === 'huerfanos' ? 'bg-brand-bg text-brand-text shadow-sm' : 'text-brand-text/40 hover:text-brand-text/80')}
                >
                    <HardDriveDownload className="w-3.5 h-3.5" /> Archivos Huérfanos
                </button>
            </div>

            {tab === 'huerfanos' ? (
                <OrphanFilesPanel notify={showToast} />
            ) : (
            <>
            <div className="flex items-start gap-2 px-4 py-3 rounded-xl bg-brand-bg border border-brand-border text-brand-text/50">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-warning" />
                <p className="text-[11px] font-bold leading-relaxed">
                    Semántica: <span className="text-brand-text">"nivel N o superior puede"</span> (menor número = más acceso).
                    Ej.: Ver = <span className="text-brand-text">2 · Jefatura</span> significa que Jefatura y Dirección ven la carpeta.
                </p>
            </div>

            {/* Tabla */}
            <div className="bg-brand-surface border border-brand-border rounded-2xl shadow-xl overflow-x-auto">
                {loading ? (
                    <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 text-brand-primary animate-spin" /></div>
                ) : folders.length === 0 ? (
                    <p className="text-center text-brand-text/30 text-xs py-16 uppercase font-black tracking-widest">No hay carpetas creadas</p>
                ) : (
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="bg-brand-bg">
                                <th className="text-left px-4 py-3 text-[9px] font-black uppercase tracking-widest text-brand-text/50 border-b border-brand-border min-w-[12rem]">
                                    <span className="flex items-center gap-2"><FolderKanban className="w-3.5 h-3.5" /> Carpeta</span>
                                </th>
                                <th className="text-left px-4 py-3 text-[9px] font-black uppercase tracking-widest text-brand-text/50 border-b border-brand-border">
                                    <span className="flex items-center gap-1.5"><Eye className="w-3.5 h-3.5" /> Ver</span>
                                </th>
                                <th className="text-left px-4 py-3 text-[9px] font-black uppercase tracking-widest text-brand-text/50 border-b border-brand-border">
                                    <span className="flex items-center gap-1.5"><UploadCloud className="w-3.5 h-3.5" /> Subir</span>
                                </th>
                                <th className="text-left px-4 py-3 text-[9px] font-black uppercase tracking-widest text-brand-text/50 border-b border-brand-border">
                                    <span className="flex items-center gap-1.5"><Archive className="w-3.5 h-3.5" /> Archivar</span>
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {folders.map(f => (
                                <tr key={f.id} className="hover:bg-brand-bg/40 transition-colors">
                                    <td className="px-4 py-3 border-b border-brand-border">
                                        <div className="flex items-center gap-2.5">
                                            <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: f.color || 'var(--brand-text-muted)' }} />
                                            <span className="text-sm font-bold text-brand-text truncate">{f.name}</span>
                                            {savingId === f.id && <Loader2 className="w-3.5 h-3.5 text-brand-primary animate-spin" />}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 border-b border-brand-border w-40">
                                        <NivelSelect value={f.nivelVer} onChange={(n) => guardar(f.id, 'nivelVer', n)} />
                                    </td>
                                    <td className="px-4 py-3 border-b border-brand-border w-40">
                                        <NivelSelect value={f.nivelSubir} onChange={(n) => guardar(f.id, 'nivelSubir', n)} />
                                    </td>
                                    <td className="px-4 py-3 border-b border-brand-border w-40">
                                        <NivelSelect value={f.nivelArchivar} onChange={(n) => guardar(f.id, 'nivelArchivar', n)} />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
            </>
            )}

            {/* Toast */}
            {toast && (
                <div className={cn(
                    'fixed bottom-6 right-6 z-[300] flex items-center gap-2 px-4 py-3 rounded-xl shadow-2xl border animate-in slide-in-from-bottom-4',
                    toast.ok ? 'bg-success/10 border-success/30 text-success' : 'bg-danger/10 border-danger/30 text-danger'
                )}>
                    {toast.ok ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                    <span className="text-xs font-bold">{toast.msg}</span>
                </div>
            )}
        </div>
    );
};
