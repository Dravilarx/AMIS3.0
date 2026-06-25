import React, { useState } from 'react';
import { Plus, X, Loader2, Pencil, Power, Stethoscope, Briefcase, Tag, CheckCircle2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useCargos, type Cargo, type CargoTipo } from '../../hooks/useCargos';
import type { UserPermissions } from '../../hooks/useAuth';
import { MODULES, PERM_ACTIONS } from './permissionModules';

// Paleta de colores sugeridos (tema moro + acentos)
const COLOR_PALETTE = [
    '#3db3a0', '#d98850', '#5b8def', '#9b7ede', '#e05c6e',
    '#e0a93b', '#4caf7d', '#8a9d96', '#c0567a', '#3a7d8c',
];

const TIPO_META: Record<CargoTipo, { label: string; icon: React.ElementType }> = {
    clinico:        { label: 'Clínico',        icon: Stethoscope },
    administrativo: { label: 'Administrativo', icon: Briefcase   },
};

const emptyPerms = (): Partial<UserPermissions> => ({});

// ─── Modal crear / editar cargo (reutilizable) ────────────────────────────────
export const CargoModal: React.FC<{
    cargo: Cargo | null; // null = nuevo
    onClose: () => void;
    onSave: (data: any, id?: string) => Promise<{ success: boolean; error?: string }>;
}> = ({ cargo, onClose, onSave }) => {
    const [nombre, setNombre]           = useState(cargo?.nombre ?? '');
    const [descripcion, setDescripcion] = useState(cargo?.descripcion ?? '');
    const [color, setColor]             = useState(cargo?.color ?? COLOR_PALETTE[0]);
    const [tipo, setTipo]               = useState<CargoTipo>(cargo?.tipo ?? 'clinico');
    const [perms, setPerms]             = useState<Partial<UserPermissions>>(cargo?.plantilla_permisos ?? emptyPerms());
    const [saving, setSaving]           = useState(false);
    const [error, setError]             = useState<string | null>(null);

    const togglePerm = (moduleId: string, action: string) => {
        setPerms(prev => {
            const key = moduleId as keyof UserPermissions;
            const mod = (prev[key] as any) || { read: false, create: false, update: false, delete: false };
            return { ...prev, [key]: { ...mod, [action]: !mod[action] } };
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!nombre.trim()) { setError('El nombre es obligatorio.'); return; }
        setSaving(true); setError(null);
        const payload = {
            nombre: nombre.trim(),
            descripcion: descripcion.trim() || null,
            color,
            tipo,
            plantilla_permisos: perms,
        };
        const result = await onSave(payload, cargo?.id);
        setSaving(false);
        if (result.success) onClose();
        else setError(result.error || 'Error al guardar.');
    };

    const labelCls = 'text-[10px] font-black uppercase tracking-widest text-brand-text/50';
    const inputCls = 'w-full bg-brand-bg border border-brand-border rounded-xl px-3 py-2.5 text-sm text-brand-text outline-none focus:border-brand-primary/50 focus:ring-1 focus:ring-brand-primary/20';

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
            <div className="w-full max-w-2xl bg-brand-surface border border-brand-border rounded-[2rem] shadow-2xl animate-in zoom-in-95 duration-300 max-h-[92vh] flex flex-col overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-brand-border">
                    <div className="flex items-center gap-3">
                        <span className="w-9 h-9 rounded-xl flex items-center justify-center border" style={{ backgroundColor: `${color}22`, borderColor: `${color}55` }}>
                            <Tag className="w-4 h-4" style={{ color }} />
                        </span>
                        <div>
                            <h3 className="text-base font-black text-brand-text">{cargo ? 'Editar cargo' : 'Nuevo cargo'}</h3>
                            <p className="text-[10px] text-brand-text/40 uppercase tracking-wider">Plantilla de permisos por defecto</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-xl text-brand-text/40 hover:text-brand-text hover:bg-brand-bg transition-all"><X className="w-5 h-5" /></button>
                </div>

                <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5 overflow-y-auto custom-scrollbar">
                    {/* Nombre + tipo */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className={labelCls}>Nombre del cargo *</label>
                            <input type="text" value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Ej: Tecnólogo Médico" className={inputCls} />
                        </div>
                        <div className="space-y-1.5">
                            <label className={labelCls}>Tipo</label>
                            <div className="grid grid-cols-2 gap-2">
                                {(Object.keys(TIPO_META) as CargoTipo[]).map(t => {
                                    const Icon = TIPO_META[t].icon;
                                    return (
                                        <button key={t} type="button" onClick={() => setTipo(t)}
                                            className={cn('flex items-center justify-center gap-1.5 py-2.5 rounded-xl border text-[10px] font-black uppercase tracking-wider transition-all',
                                                tipo === t ? 'bg-brand-primary border-brand-primary text-white' : 'bg-brand-bg border-brand-border text-brand-text/40 hover:text-brand-text/70')}>
                                            <Icon className="w-3.5 h-3.5" /> {TIPO_META[t].label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Descripción */}
                    <div className="space-y-1.5">
                        <label className={labelCls}>Descripción</label>
                        <textarea rows={2} value={descripcion ?? ''} onChange={e => setDescripcion(e.target.value)} placeholder="Funciones del cargo..." className={inputCls + ' resize-none placeholder:text-brand-text/20'} />
                    </div>

                    {/* Color */}
                    <div className="space-y-2">
                        <label className={labelCls}>Color</label>
                        <div className="flex flex-wrap gap-2 items-center">
                            {COLOR_PALETTE.map(c => (
                                <button key={c} type="button" onClick={() => setColor(c)}
                                    className={cn('w-8 h-8 rounded-xl border-2 transition-all', color === c ? 'border-brand-text scale-110' : 'border-transparent hover:scale-105')}
                                    style={{ backgroundColor: c }} title={c} />
                            ))}
                            <input type="color" value={color} onChange={e => setColor(e.target.value)} className="w-8 h-8 rounded-xl bg-transparent border border-brand-border cursor-pointer" title="Color personalizado" />
                        </div>
                    </div>

                    {/* Matriz de permisos */}
                    <div className="space-y-2">
                        <label className={labelCls}>Plantilla de permisos por módulo</label>
                        <div className="rounded-2xl border border-brand-border overflow-hidden">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-brand-bg border-b border-brand-border">
                                        <th className="px-4 py-2.5 text-[9px] font-black uppercase tracking-widest text-brand-text/40">Módulo</th>
                                        {PERM_ACTIONS.map(a => (
                                            <th key={a.key} className="px-2 py-2.5 text-center text-[9px] font-black uppercase tracking-widest text-brand-text/40">{a.label}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-brand-border/50">
                                    {MODULES.map(m => {
                                        const key = m.id as keyof UserPermissions;
                                        return (
                                            <tr key={m.id} className="hover:bg-brand-primary/5 transition-colors">
                                                <td className="px-4 py-2 text-xs font-bold text-brand-text/70">{m.name}</td>
                                                {PERM_ACTIONS.map(a => {
                                                    const active = (perms[key] as any)?.[a.key] === true;
                                                    return (
                                                        <td key={a.key} className="px-2 py-2 text-center">
                                                            <button type="button" onClick={() => togglePerm(m.id, a.key)} className="inline-flex transition-transform hover:scale-110">
                                                                <CheckCircle2 className={cn('w-5 h-5', active ? 'text-brand-primary' : 'text-brand-text/10')} />
                                                            </button>
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {error && <div className="p-3 bg-danger/10 border border-danger/20 rounded-xl text-danger text-[11px] font-bold text-center">{error}</div>}

                    <div className="flex gap-3 pt-1">
                        <button type="button" onClick={onClose} className="flex-1 py-3 rounded-2xl border border-brand-border text-brand-text/60 text-[11px] font-black uppercase tracking-wider hover:bg-brand-bg transition-all">Cancelar</button>
                        <button type="submit" disabled={saving} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-brand-primary text-white text-[11px] font-black uppercase tracking-wider hover:brightness-110 transition-all disabled:opacity-50">
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                            {saving ? 'Guardando...' : (cargo ? 'Guardar cambios' : 'Crear cargo')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// ─── Gestor de Cargos ─────────────────────────────────────────────────────────
export const CargosManager: React.FC = () => {
    const { cargos, loading, createCargo, updateCargo, deactivateCargo } = useCargos();
    const [modalOpen, setModalOpen]   = useState(false);
    const [editing, setEditing]       = useState<Cargo | null>(null);

    const openNew  = () => { setEditing(null); setModalOpen(true); };
    const openEdit = (c: Cargo) => { setEditing(c); setModalOpen(true); };

    const handleSave = async (data: any, id?: string) =>
        id ? updateCargo(id, data) : createCargo(data);

    const handleDeactivate = async (c: Cargo) => {
        if (confirm(`¿Desactivar el cargo "${c.nombre}"? Dejará de aparecer en el alta de usuarios (no se borra).`)) {
            const r = await deactivateCargo(c.id);
            if (!r.success) alert('Error: ' + r.error);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-xl font-black text-brand-text">Gestor de Cargos</h3>
                    <p className="text-[10px] text-brand-text/40 font-bold uppercase tracking-[0.2em] mt-0.5">Etiquetas con plantilla de permisos</p>
                </div>
                <button onClick={openNew} className="flex items-center gap-2 px-5 py-2.5 bg-brand-primary text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:opacity-90 transition-all shadow-lg shadow-brand-primary/20">
                    <Plus className="w-4 h-4" /> Nuevo cargo
                </button>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 text-brand-primary animate-spin" /></div>
            ) : cargos.length === 0 ? (
                <div className="text-center py-16 border border-dashed border-brand-border rounded-2xl">
                    <Tag className="w-12 h-12 text-brand-text/10 mx-auto mb-3" />
                    <p className="text-sm text-brand-text/30">Aún no hay cargos. Crea el primero.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {cargos.map(c => {
                        const TipoIcon = TIPO_META[c.tipo]?.icon ?? Briefcase;
                        const modCount = Object.values(c.plantilla_permisos || {}).filter((p: any) => p && (p.read || p.create || p.update || p.delete)).length;
                        return (
                            <div key={c.id} className="group p-5 rounded-3xl border border-brand-border bg-brand-surface/50 hover:border-brand-primary/30 transition-all">
                                <div className="flex items-start gap-3">
                                    <span className="w-3 h-3 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: c.color || '#8a9d96' }} />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <h4 className="text-sm font-black text-brand-text truncate">{c.nombre}</h4>
                                            <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border border-brand-border text-brand-text/50">
                                                <TipoIcon className="w-2.5 h-2.5" /> {TIPO_META[c.tipo]?.label ?? c.tipo}
                                            </span>
                                        </div>
                                        {c.descripcion && <p className="text-[11px] text-brand-text/50 mt-1 line-clamp-2">{c.descripcion}</p>}
                                        <p className="text-[9px] text-brand-text/30 font-bold uppercase tracking-wider mt-2">{modCount} módulo(s) con acceso</p>
                                    </div>
                                    <div className="flex flex-col gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => openEdit(c)} title="Editar" className="p-1.5 rounded-lg border border-brand-border text-brand-text/40 hover:text-brand-primary hover:border-brand-primary/30 transition-all">
                                            <Pencil className="w-3.5 h-3.5" />
                                        </button>
                                        <button onClick={() => handleDeactivate(c)} title="Desactivar" className="p-1.5 rounded-lg border border-danger/20 text-danger hover:bg-danger/10 transition-all">
                                            <Power className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {modalOpen && <CargoModal cargo={editing} onClose={() => setModalOpen(false)} onSave={handleSave} />}
        </div>
    );
};
