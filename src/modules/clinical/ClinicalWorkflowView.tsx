import React, { useState } from 'react';
import {
    Stethoscope,
    Search,
    Plus,
    TrendingUp,
    Calendar,
    Truck,
    FileCheck,
    User,
    MapPin,
    Clock,
    Share2,
    ArrowRight,
    CheckCircle2,
    AlertCircle,
    Activity as ActivityIcon,
    Settings2,
    Book,
    Pencil,
    Trash2,
    UploadCloud,
    X,
    Loader2
} from 'lucide-react';
import { cn, formatRUT, formatName } from '../../lib/utils';
import { useClinicalProcedures } from './useClinicalProcedures';
import { useExpenses } from '../../hooks/useExpenses';
import { ClinicalProcedureModal } from './ClinicalProcedureModal';
import { ProcedureDetailsPanel } from './ProcedureDetailsPanel';
import { ClinicalConfigPanel } from './ClinicalConfigPanel';
import { ClinicalCalendar } from './ClinicalCalendar';
import type { ClinicalAppointment, MedicalProcedure } from '../../types/clinical';

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string; border: string }> = {
    scheduled:            { label: 'Agendado',            color: 'text-info',    bg: 'bg-info/10',    border: 'border-info/20' },
    requirements_pending: { label: 'Req. Pendientes',     color: 'text-warning', bg: 'bg-warning/10', border: 'border-warning/20' },
    in_progress:          { label: 'En Curso',            color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
    completed:            { label: 'Completado',          color: 'text-success', bg: 'bg-success/10', border: 'border-success/20' },
    cancelled:            { label: 'Cancelado',           color: 'text-danger',  bg: 'bg-danger/10',  border: 'border-danger/20' },
};

const TABS = [
    { id: 'agenda', name: 'Agenda Activa', icon: Calendar },
    { id: 'catalog', name: 'Catálogo', icon: Book },
    { id: 'logistics', name: 'Logística', icon: Truck },
    { id: 'results', name: 'Resultados', icon: ActivityIcon },
    { id: 'config', name: 'Configuración', icon: Settings2 },
];

// ─── Tab Logística ────────────────────────────────────────────────────────────
interface LogisticsTabProps {
    appointments:        ClinicalAppointment[];
    onSelectAppointment: (app: ClinicalAppointment) => void;
}

const LogisticsTab: React.FC<LogisticsTabProps> = ({ appointments, onSelectAppointment }) => {
    const { expenses, addExpense } = useExpenses();
    const [selectedApp,   setSelectedApp]   = useState<ClinicalAppointment | null>(null);
    const [showForm,      setShowForm]       = useState(false);
    const [saving,        setSaving]         = useState(false);
    const [newExpense,    setNewExpense]      = useState({
        vendor: '', amount: 0, category: 'Traslado',
        date: new Date().toISOString().split('T')[0],
        expense_type: 'transport' as const,
    });

    // Solo procedimientos que requieren logística
    const withLogistics = appointments.filter(a =>
        a.logisticsStatus?.transport !== 'not_required' ||
        a.logisticsStatus?.perDiem   !== 'not_required'
    );

    // KPIs
    const transportPending    = appointments.filter(a => a.logisticsStatus?.transport === 'required').length;
    const perDiemPending      = appointments.filter(a => a.logisticsStatus?.perDiem   === 'required').length;
    const transportCoordinated = appointments.filter(a => a.logisticsStatus?.transport === 'coordinated').length;

    // Gastos vinculados al procedimiento seleccionado
    const appExpenses = selectedApp
        ? expenses.filter(e => (e as any).appointment_id === selectedApp.id)
        : [];

    const totalAppExpenses = appExpenses.reduce((sum, e) => sum + e.amount, 0);

    const handleAddExpense = async () => {
        if (!selectedApp || !newExpense.vendor.trim() || !newExpense.amount) return;
        setSaving(true);
        await addExpense({
            ...newExpense,
            appointment_id: selectedApp.id,
            status:         'pending',
            tax_id:         '',
        } as any);
        setNewExpense({
            vendor: '', amount: 0, category: 'Traslado',
            date: new Date().toISOString().split('T')[0],
            expense_type: 'transport',
        });
        setShowForm(false);
        setSaving(false);
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-300">

            {/* KPIs */}
            <div className="grid grid-cols-3 gap-4">
                {[
                    { label: 'Traslados pendientes',    val: transportPending,     color: 'text-red-400    bg-red-500/10    border-red-500/20' },
                    { label: 'Viáticos pendientes',     val: perDiemPending,       color: 'text-amber-400  bg-amber-500/10  border-amber-500/20' },
                    { label: 'Traslados coordinados',   val: transportCoordinated, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
                ].map(k => (
                    <div key={k.label} className={cn('flex items-center gap-4 px-5 py-4 rounded-2xl border', k.color)}>
                        <span className={cn('text-3xl font-black', k.color.split(' ')[0])}>{k.val}</span>
                        <span className="text-[10px] font-black uppercase tracking-widest text-brand-text/40">{k.label}</span>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-6">

                {/* Lista de procedimientos con logística */}
                <div className="space-y-2">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-brand-text/40">
                        Procedimientos con logística ({withLogistics.length})
                    </h4>
                    <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                        {withLogistics.length === 0 ? (
                            <p className="text-center py-8 text-xs text-brand-text/20">Sin procedimientos con logística requerida.</p>
                        ) : withLogistics.map(app => (
                            <button key={app.id}
                                type="button"
                                onClick={() => setSelectedApp(app)}
                                className={cn(
                                    'w-full text-left p-3 rounded-xl border transition-all',
                                    selectedApp?.id === app.id
                                        ? 'bg-info/10 border-info/30'
                                        : 'bg-brand-surface border-brand-border hover:border-brand-text/20'
                                )}>
                                <p className="text-xs font-bold text-brand-text truncate">{app.patientName}</p>
                                <p className="text-[10px] text-brand-text/40 truncate">{app.procedure?.name}</p>
                                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                    {app.logisticsStatus?.transport !== 'not_required' && (
                                        <span className={cn(
                                            'text-[8px] font-black px-1.5 py-0.5 rounded uppercase',
                                            app.logisticsStatus?.transport === 'coordinated'
                                                ? 'bg-emerald-500/10 text-emerald-400'
                                                : 'bg-red-500/10 text-red-400'
                                        )}>
                                            🚗 Traslado
                                        </span>
                                    )}
                                    {app.logisticsStatus?.perDiem !== 'not_required' && (
                                        <span className={cn(
                                            'text-[8px] font-black px-1.5 py-0.5 rounded uppercase',
                                            app.logisticsStatus?.perDiem === 'coordinated'
                                                ? 'bg-emerald-500/10 text-emerald-400'
                                                : 'bg-amber-500/10 text-amber-400'
                                        )}>
                                            💰 Viáticos
                                        </span>
                                    )}
                                    <span className="text-[8px] text-brand-text/30 font-mono ml-auto">
                                        {new Date(`${app.appointmentDate}T12:00:00`).toLocaleDateString('es-CL')}
                                    </span>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Panel de gastos del procedimiento */}
                {selectedApp ? (
                    <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-black text-brand-text">{selectedApp.patientName}</p>
                                <p className="text-[10px] text-brand-text/40">{selectedApp.procedure?.name} · {selectedApp.center?.name}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-mono text-brand-text/30">
                                    Total: <span className="text-brand-text font-black">$ {totalAppExpenses.toLocaleString('es-CL')}</span>
                                </span>
                                <button onClick={() => setShowForm(v => !v)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-primary text-white rounded-xl text-[10px] font-black uppercase hover:brightness-110 transition-all">
                                    <Plus className="w-3 h-3" /> Agregar gasto
                                </button>
                                <button onClick={() => onSelectAppointment(selectedApp)}
                                    className="px-3 py-1.5 bg-brand-surface border border-brand-border rounded-xl text-[10px] font-black uppercase text-brand-text/60 hover:bg-brand-primary/10 transition-all">
                                    Ver expediente
                                </button>
                            </div>
                        </div>

                        {/* Formulario nuevo gasto */}
                        {showForm && (
                            <div className="p-4 bg-info/5 border border-info/20 rounded-2xl space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    <div className="space-y-1">
                                        <label className="text-[9px] uppercase font-bold text-brand-text/40">Tipo</label>
                                        <select className="bg-brand-surface border border-brand-border rounded-lg w-full px-2 py-1.5 text-xs outline-none"
                                            value={newExpense.expense_type}
                                            onChange={e => setNewExpense(p => ({ ...p, expense_type: e.target.value as any }))}>
                                            <option value="transport">Traslado</option>
                                            <option value="per_diem">Viático</option>
                                            <option value="accommodation">Alojamiento</option>
                                            <option value="general">General</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[9px] uppercase font-bold text-brand-text/40">Proveedor</label>
                                        <input className="bg-brand-surface border border-brand-border rounded-lg w-full px-2 py-1.5 text-xs outline-none"
                                            value={newExpense.vendor}
                                            onChange={e => setNewExpense(p => ({ ...p, vendor: e.target.value }))} />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[9px] uppercase font-bold text-brand-text/40">Monto</label>
                                        <input type="number" className="bg-brand-surface border border-brand-border rounded-lg w-full px-2 py-1.5 text-xs outline-none"
                                            value={newExpense.amount}
                                            onChange={e => setNewExpense(p => ({ ...p, amount: Number(e.target.value) }))} />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[9px] uppercase font-bold text-brand-text/40">Fecha</label>
                                        <input type="date" className="bg-brand-surface border border-brand-border rounded-lg w-full px-2 py-1.5 text-xs outline-none"
                                            value={newExpense.date}
                                            onChange={e => setNewExpense(p => ({ ...p, date: e.target.value }))} />
                                    </div>
                                </div>
                                <div className="flex justify-end gap-2">
                                    <button onClick={() => setShowForm(false)}
                                        className="px-3 py-1.5 border border-brand-border rounded-lg text-xs text-brand-text/50 hover:bg-brand-surface">
                                        Cancelar
                                    </button>
                                    <button onClick={handleAddExpense} disabled={saving || !newExpense.vendor.trim() || !newExpense.amount}
                                        className="flex items-center gap-1.5 px-4 py-1.5 bg-info/10 border border-info/20 text-info rounded-lg text-xs font-black uppercase disabled:opacity-50">
                                        {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                                        Guardar
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Lista de gastos */}
                        {appExpenses.length === 0 ? (
                            <div className="text-center py-8 border border-dashed border-brand-border rounded-2xl">
                                <p className="text-xs text-brand-text/20">Sin gastos registrados para este procedimiento.</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {appExpenses.map(e => (
                                    <div key={e.id} className="flex items-center gap-3 p-3 bg-brand-surface border border-brand-border rounded-xl">
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-bold text-brand-text truncate">{e.vendor}</p>
                                            <p className="text-[9px] text-brand-text/40">{e.category} · {e.date}</p>
                                        </div>
                                        <span className={cn(
                                            'text-[9px] font-black px-2 py-0.5 rounded uppercase',
                                            e.status === 'verified' ? 'bg-emerald-500/10 text-emerald-400'
                                                : e.status === 'rejected' ? 'bg-red-500/10 text-red-400'
                                                : 'bg-amber-500/10 text-amber-400'
                                        )}>
                                            {e.status === 'verified' ? 'Verificado' : e.status === 'rejected' ? 'Rechazado' : 'Pendiente'}
                                        </span>
                                        <span className="text-sm font-black text-brand-text flex-shrink-0">
                                            $ {e.amount.toLocaleString('es-CL')}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="flex items-center justify-center min-h-[40vh] text-center">
                        <div>
                            <Truck className="w-12 h-12 text-brand-text/10 mx-auto mb-3" />
                            <p className="text-xs text-brand-text/20">Selecciona un procedimiento para ver y gestionar sus gastos</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// ─── Tab Catálogo ─────────────────────────────────────────────────────────────
interface CatalogTabProps {
    catalog:  MedicalProcedure[];
    onUpsert: (proc: Partial<MedicalProcedure>) => Promise<any>;
    onDelete: ((id: string) => Promise<any>) | undefined;
}

const CatalogTab: React.FC<CatalogTabProps> = ({ catalog, onUpsert, onDelete }) => {
    const [editingId,  setEditingId]  = useState<string | null>(null);
    const [editData,   setEditData]   = useState<Partial<MedicalProcedure>>({});
    const [saving,     setSaving]     = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [showNew,    setShowNew]    = useState(false);
    const [newProc,    setNewProc]    = useState<{ code: string; name: string; description: string; basePrice: number }>({ code: '', name: '', description: '', basePrice: 0 });

    const filtered = catalog.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.code.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleSaveEdit = async () => {
        if (!editingId) return;
        setSaving(true);
        await onUpsert({ ...editData, id: editingId });
        setEditingId(null);
        setEditData({});
        setSaving(false);
    };

    const handleSaveNew = async () => {
        if (!newProc.code.trim() || !newProc.name.trim()) return;
        setSaving(true);
        await onUpsert({ ...newProc, isActive: true });
        setNewProc({ code: '', name: '', description: '', basePrice: 0 });
        setShowNew(false);
        setSaving(false);
    };

    return (
        <div className="space-y-4 animate-in fade-in duration-300">

            {/* Toolbar */}
            <div className="flex items-center gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-brand-text/20" />
                    <input type="text" placeholder="Buscar procedimiento o código..."
                        className="bg-brand-surface border border-brand-border rounded-xl w-full pl-9 pr-4 py-2 text-xs text-brand-text outline-none focus:border-info/50"
                        value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                </div>
                <button onClick={() => setShowNew(v => !v)}
                    className="flex items-center gap-1.5 px-4 py-2 bg-brand-primary text-white rounded-xl text-xs font-black uppercase hover:brightness-110 transition-all">
                    <Plus className="w-3.5 h-3.5" /> Nuevo
                </button>
            </div>

            {/* Formulario nuevo procedimiento */}
            {showNew && (
                <div className="p-4 bg-info/5 border border-info/20 rounded-2xl space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                    <p className="text-[10px] font-black uppercase tracking-widest text-info/60">Nuevo Procedimiento</p>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                        <div className="space-y-1">
                            <label className="text-[9px] uppercase font-bold text-brand-text/40">Código</label>
                            <input className="bg-brand-surface border border-brand-border rounded-lg w-full px-3 py-1.5 text-xs text-brand-text outline-none focus:border-info/50"
                                value={newProc.code} onChange={e => setNewProc(p => ({ ...p, code: e.target.value }))} />
                        </div>
                        <div className="space-y-1 md:col-span-2">
                            <label className="text-[9px] uppercase font-bold text-brand-text/40">Nombre</label>
                            <input className="bg-brand-surface border border-brand-border rounded-lg w-full px-3 py-1.5 text-xs text-brand-text outline-none focus:border-info/50"
                                value={newProc.name} onChange={e => setNewProc(p => ({ ...p, name: e.target.value }))} />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[9px] uppercase font-bold text-brand-text/40">Precio base</label>
                            <input type="number" className="bg-brand-surface border border-brand-border rounded-lg w-full px-3 py-1.5 text-xs text-brand-text outline-none focus:border-info/50"
                                value={newProc.basePrice} onChange={e => setNewProc(p => ({ ...p, basePrice: Number(e.target.value) }))} />
                        </div>
                    </div>
                    <div className="space-y-1">
                        <label className="text-[9px] uppercase font-bold text-brand-text/40">Descripción</label>
                        <input className="bg-brand-surface border border-brand-border rounded-lg w-full px-3 py-1.5 text-xs text-brand-text outline-none focus:border-info/50"
                            value={newProc.description} onChange={e => setNewProc(p => ({ ...p, description: e.target.value }))} />
                    </div>
                    <div className="flex gap-2 justify-end">
                        <button onClick={() => setShowNew(false)}
                            className="px-3 py-1.5 border border-brand-border rounded-lg text-xs text-brand-text/50 hover:bg-brand-surface transition-all">
                            Cancelar
                        </button>
                        <button onClick={handleSaveNew} disabled={saving || !newProc.code.trim() || !newProc.name.trim()}
                            className="flex items-center gap-1.5 px-4 py-1.5 bg-info/10 border border-info/20 text-info rounded-lg text-xs font-black uppercase hover:bg-info/20 transition-all disabled:opacity-50">
                            {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                            Guardar
                        </button>
                    </div>
                </div>
            )}

            {/* Tabla */}
            <div className="rounded-2xl border border-brand-border overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-brand-surface/50 border-b border-brand-border">
                            <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-brand-text/40 w-24">Código</th>
                            <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-brand-text/40">Procedimiento</th>
                            <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-brand-text/40 w-32">Precio</th>
                            <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-brand-text/40 w-24 text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-brand-border/50">
                        {filtered.map(proc => (
                            <tr key={proc.id} className="hover:bg-brand-bg/30 transition-colors group">
                                {editingId === proc.id ? (
                                    <>
                                        <td className="px-4 py-2">
                                            <input className="bg-brand-surface border border-info/30 rounded-lg w-full px-2 py-1 text-xs text-brand-text outline-none"
                                                value={editData.code ?? proc.code}
                                                onChange={e => setEditData(p => ({ ...p, code: e.target.value }))} />
                                        </td>
                                        <td className="px-4 py-2 space-y-1">
                                            <input className="bg-brand-surface border border-info/30 rounded-lg w-full px-2 py-1 text-xs text-brand-text outline-none"
                                                value={editData.name ?? proc.name}
                                                onChange={e => setEditData(p => ({ ...p, name: e.target.value }))} />
                                            <input className="bg-brand-surface border border-brand-border rounded-lg w-full px-2 py-1 text-[10px] text-brand-text/60 outline-none"
                                                placeholder="Descripción..."
                                                value={editData.description ?? proc.description}
                                                onChange={e => setEditData(p => ({ ...p, description: e.target.value }))} />
                                        </td>
                                        <td className="px-4 py-2">
                                            <input type="number" className="bg-brand-surface border border-info/30 rounded-lg w-full px-2 py-1 text-xs text-brand-text outline-none"
                                                value={editData.basePrice ?? proc.basePrice}
                                                onChange={e => setEditData(p => ({ ...p, basePrice: Number(e.target.value) }))} />
                                        </td>
                                        <td className="px-4 py-2 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <button onClick={handleSaveEdit} disabled={saving}
                                                    className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors">
                                                    {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                                                </button>
                                                <button onClick={() => { setEditingId(null); setEditData({}); }}
                                                    className="p-1.5 rounded-lg text-brand-text/30 hover:bg-brand-surface transition-colors">
                                                    <X className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </td>
                                    </>
                                ) : (
                                    <>
                                        <td className="px-4 py-3">
                                            <span className="text-xs font-mono font-black text-brand-primary bg-brand-primary/10 border border-brand-primary/20 px-2 py-1 rounded-lg">
                                                {proc.code}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <p className="text-sm font-bold text-brand-text">{proc.name}</p>
                                            <p className="text-[10px] text-brand-text/40 line-clamp-1">{proc.description}</p>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="text-sm font-black text-brand-text">
                                                $ {proc.basePrice.toLocaleString('es-CL')}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => { setEditingId(proc.id); setEditData({}); }}
                                                    className="p-1.5 rounded-lg text-brand-text/30 hover:text-info hover:bg-info/10 transition-colors">
                                                    <Pencil className="w-3.5 h-3.5" />
                                                </button>
                                                {onDelete && (
                                                    <button
                                                        onClick={() => { if (confirm(`¿Eliminar "${proc.name}"?`)) onDelete(proc.id); }}
                                                        className="p-1.5 rounded-lg text-brand-text/30 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </>
                                )}
                            </tr>
                        ))}
                        {filtered.length === 0 && (
                            <tr>
                                <td colSpan={4} className="px-4 py-8 text-center text-xs text-brand-text/20">
                                    Sin procedimientos. Agrega uno con el botón "Nuevo".
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

// ─── Tab Resultados ───────────────────────────────────────────────────────────
interface ResultsTabProps {
    appointments: ClinicalAppointment[];
    doctors:      { id: string; name: string; specialty: string; rut: string }[];
    onUploadResult: (appointmentId: string, doctorId: string, findings: string, file?: File) => Promise<{ success: boolean; error?: string }>;
}

const ResultsTab: React.FC<ResultsTabProps> = ({ appointments, doctors, onUploadResult }) => {
    const [selectedApp,  setSelectedApp]  = useState<ClinicalAppointment | null>(null);
    const [findings,     setFindings]     = useState('');
    const [selectedDoc,  setSelectedDoc]  = useState<File | null>(null);
    const [doctorId,     setDoctorId]     = useState('');
    const [saving,       setSaving]       = useState(false);
    const [saved,        setSaved]        = useState<string | null>(null);
    const [searchTerm,   setSearchTerm]   = useState('');

    const pending = appointments.filter(a =>
        a.status === 'completed' || a.status === 'in_progress' || a.checkoutStatus
    );

    const filtered = pending.filter(a =>
        a.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.patientRut.includes(searchTerm)
    );

    const handleSave = async () => {
        if (!selectedApp || !findings.trim() || !doctorId) return;
        setSaving(true);
        const result = await onUploadResult(
            selectedApp.id, doctorId, findings,
            selectedDoc || undefined
        );
        setSaving(false);
        if (result.success) {
            setSaved(selectedApp.id);
            setFindings('');
            setSelectedDoc(null);
            setSelectedApp(null);
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">

            {/* Lista de procedimientos con resultado pendiente */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black uppercase tracking-widest text-brand-text/40">
                        Procedimientos ({filtered.length})
                    </h3>
                </div>
                <input
                    type="text" placeholder="Buscar paciente o RUT..."
                    className="bg-brand-surface border border-brand-border rounded-xl w-full px-4 py-2 text-xs text-brand-text outline-none focus:border-info/50"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                />
                <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                    {filtered.length === 0 ? (
                        <div className="text-center py-12 text-brand-text/20 text-xs">
                            Sin procedimientos para cargar resultados.
                        </div>
                    ) : filtered.map(app => (
                        <button key={app.id}
                            type="button"
                            onClick={() => { setSelectedApp(app); setFindings(''); setSelectedDoc(null); setSaved(null); }}
                            className={cn(
                                'w-full text-left p-3 rounded-xl border transition-all',
                                selectedApp?.id === app.id
                                    ? 'bg-info/10 border-info/30'
                                    : 'bg-brand-surface border-brand-border hover:border-brand-text/20',
                                saved === app.id && 'bg-success/10 border-success/20'
                            )}>
                            <div className="flex items-center justify-between gap-2">
                                <p className="text-xs font-bold text-brand-text truncate">{app.patientName}</p>
                                {saved === app.id && (
                                    <CheckCircle2 className="w-3.5 h-3.5 text-success flex-shrink-0" />
                                )}
                            </div>
                            <p className="text-[10px] text-brand-text/40 truncate">{app.procedure?.name}</p>
                            <p className="text-[9px] text-brand-text/30 font-mono mt-1">
                                {new Date(`${app.appointmentDate}T12:00:00`).toLocaleDateString('es-CL')} — {app.center?.name}
                            </p>
                        </button>
                    ))}
                </div>
            </div>

            {/* Panel de carga de resultado */}
            {selectedApp ? (
                <div className="space-y-5 animate-in fade-in zoom-in-95 duration-200">
                    <div className="p-4 bg-brand-surface/50 border border-brand-border rounded-2xl">
                        <p className="text-xs font-black text-brand-text">{selectedApp.patientName}</p>
                        <p className="text-[10px] text-brand-text/40">{selectedApp.procedure?.name} · {selectedApp.center?.name}</p>
                        <p className="text-[9px] font-mono text-brand-text/30 mt-1">
                            {new Date(`${selectedApp.appointmentDate}T12:00:00`).toLocaleDateString('es-CL', { weekday: 'long', day: '2-digit', month: 'long' })}
                        </p>
                    </div>

                    {/* Médico */}
                    <div className="space-y-2">
                        <label className="text-[10px] uppercase font-bold text-brand-text/40 tracking-widest">
                            Médico Responsable <span className="text-red-400">*</span>
                        </label>
                        <select value={doctorId} onChange={e => setDoctorId(e.target.value)}
                            className="bg-brand-surface border border-brand-border rounded-xl w-full px-4 py-2 text-sm text-brand-text outline-none focus:border-info/50">
                            <option value="">Seleccionar médico...</option>
                            {doctors.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                        </select>
                    </div>

                    {/* Hallazgos */}
                    <div className="space-y-2">
                        <label className="text-[10px] uppercase font-bold text-brand-text/40 tracking-widest">
                            Hallazgos / Resultado <span className="text-red-400">*</span>
                        </label>
                        <textarea rows={6}
                            placeholder="Describe los hallazgos del procedimiento, resultado de biopsia, conclusión diagnóstica..."
                            className="bg-brand-surface border border-brand-border rounded-xl w-full px-4 py-3 text-sm text-brand-text outline-none focus:border-info/50 resize-none"
                            value={findings}
                            onChange={e => setFindings(e.target.value)} />
                    </div>

                    {/* Archivo adjunto */}
                    <div className="space-y-2">
                        <label className="text-[10px] uppercase font-bold text-brand-text/40 tracking-widest">
                            Documento adjunto (opcional)
                        </label>
                        <label className={cn(
                            'flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all',
                            selectedDoc
                                ? 'bg-emerald-500/5 border-emerald-500/20'
                                : 'bg-brand-surface border-brand-border hover:border-info/30'
                        )}>
                            <UploadCloud className={cn('w-4 h-4 flex-shrink-0', selectedDoc ? 'text-emerald-400' : 'text-brand-text/20')} />
                            <span className="text-xs text-brand-text/60 truncate flex-1">
                                {selectedDoc ? selectedDoc.name : 'Subir PDF, imagen o informe anatomopatológico'}
                            </span>
                            {selectedDoc && (
                                <button type="button" onClick={e => { e.preventDefault(); setSelectedDoc(null); }}
                                    className="p-1 text-brand-text/20 hover:text-red-400">
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            )}
                            <input type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" className="hidden"
                                onChange={e => setSelectedDoc(e.target.files?.[0] || null)} />
                        </label>
                    </div>

                    {/* Botón guardar */}
                    <button onClick={handleSave}
                        disabled={saving || !findings.trim() || !doctorId}
                        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-brand-primary text-white font-black text-sm shadow-xl shadow-brand-primary/20 hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                        {saving
                            ? <><Loader2 className="w-4 h-4 animate-spin" /> Guardando resultado...</>
                            : <><FileCheck className="w-4 h-4" /> Registrar Resultado</>
                        }
                    </button>
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center min-h-[40vh] text-center gap-4">
                    <FileCheck className="w-12 h-12 text-brand-text/10" />
                    <p className="text-sm font-bold text-brand-text/30">Selecciona un procedimiento para cargar su resultado</p>
                </div>
            )}
        </div>
    );
};

export const ClinicalWorkflowView: React.FC = () => {
    const {
        appointments,
        catalog,
        centers,
        institutions,
        loading,
        error: fetchError,
        addAppointment,
        updateAppointment,
        updateAppointmentStatus,
        verifyDocument,
        getIndications,
        requirements,
        batteries,
        upsertProcedure,
        upsertRequirement,
        upsertBattery,
        upsertIndications,
        deleteProcedure,
        deleteRequirement,
        deleteBattery,
        deleteIndications,
        deleteAppointment,
        indications,
        doctors,
        addendumRequests,
        getPatientHistory,
        uploadResult
    } = useClinicalProcedures();

    const [activeTab, setActiveTab] = useState<string>('agenda');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);
    const [selectedApp, setSelectedApp] = useState<ClinicalAppointment | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [doctorFilter, setDoctorFilter] = useState('');
    const [viewMode, setViewMode] = useState<'list' | 'calendar' | 'worklist'>('worklist');
    const [filterStatus, setFilterStatus]   = useState('');
    const [filterCenter, setFilterCenter]   = useState('');
    const [filterDateFrom, setFilterDateFrom] = useState('');
    const [filterDateTo, setFilterDateTo]   = useState('');

    const handleDeleteAppointment = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!window.confirm('¿Está seguro de eliminar de forma permanente este agendamiento?')) return;
        try {
            await deleteAppointment(id);
        } catch (err) {
            console.error(err);
        }
    };

    const filteredAppointments = appointments.filter(app => {
        const search = searchTerm.toLowerCase();
        const matchesSearch = (
            app.patientName.toLowerCase().includes(search) ||
            app.patientRut.toLowerCase().includes(search) ||
            app.procedure?.name.toLowerCase().includes(search) ||
            app.center?.name.toLowerCase().includes(search)
        );
        const matchesDoctor  = !doctorFilter  || app.doctorId   === doctorFilter;
        const matchesStatus  = !filterStatus  || app.status     === filterStatus;
        const matchesCenter  = !filterCenter  || app.centerId   === filterCenter;
        const matchesDateFrom = !filterDateFrom || app.appointmentDate >= filterDateFrom;
        const matchesDateTo   = !filterDateTo   || app.appointmentDate <= filterDateTo;
        return matchesSearch && matchesDoctor && matchesStatus && matchesCenter && matchesDateFrom && matchesDateTo;
    });

    // KPIs calculados
    const kpis = {
        hoy:        appointments.filter(a => a.appointmentDate === new Date().toISOString().split('T')[0]).length,
        semana:     appointments.filter(a => {
            const d = new Date(a.appointmentDate);
            const hoy = new Date();
            const lunes = new Date(hoy); lunes.setDate(hoy.getDate() - hoy.getDay() + 1);
            const domingo = new Date(lunes); domingo.setDate(lunes.getDate() + 6);
            return d >= lunes && d <= domingo;
        }).length,
        reqPendientes: appointments.filter(a => a.status === 'requirements_pending').length,
        completados:   appointments.filter(a => a.status === 'completed').length,
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center h-[60vh] animate-in fade-in duration-700">
            <div className="relative">
                <div className="w-20 h-20 rounded-full border-4 border-brand-primary/20 border-t-brand-primary animate-spin" />
                <ActivityIcon className="w-8 h-8 text-brand-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
            </div>
            <p className="mt-8 text-[10px] text-brand-text/40 font-bold uppercase tracking-[0.4em] animate-pulse font-sans">Sincronizando Sistema AMIS...</p>
        </div>
    );

    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-6 duration-1000">
            {/* Master Header */}
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
                <div className="space-y-3">
                    <div className="flex items-center gap-3">
                        <div className="p-1.5 bg-brand-primary/10 rounded-lg">
                            <TrendingUp className="w-4 h-4 text-brand-primary" />
                        </div>
                        <span className="text-[10px] font-black text-brand-primary uppercase tracking-[0.3em]">Protocolo M9: Gestión Intervencional</span>
                    </div>
                    <h1 className="text-5xl font-black text-brand-text tracking-tight uppercase leading-none">
                        Atención <span className="text-brand-primary">Médica</span>
                    </h1>
                    <p className="text-sm text-brand-text/60 font-bold max-w-xl">
                        Gestión centralizada de agendamientos intervencionales, baterías de protocolos y logística clínica de la Red.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                    <div className="relative group">
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-text/20 group-hover:text-brand-primary transition-colors" />
                        <input
                            type="text"
                            placeholder="Buscar Paciente o RUT..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="bg-brand-surface border border-brand-border rounded-2xl pl-12 pr-6 py-4.5 text-xs focus:outline-none focus:border-brand-primary/30 focus:ring-4 focus:ring-brand-primary/5 w-72 transition-all text-brand-text placeholder:text-brand-text/20 shadow-sm"
                        />
                    </div>

                    <div className="relative group">
                        <User className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-text/20 group-hover:text-brand-primary transition-colors" />
                        <select
                            value={doctorFilter}
                            onChange={(e) => setDoctorFilter(e.target.value)}
                            className="bg-brand-surface border border-brand-border rounded-2xl pl-12 pr-10 py-4.5 text-xs focus:outline-none focus:border-brand-primary/30 focus:ring-4 focus:ring-brand-primary/5 w-64 transition-all text-brand-text appearance-none shadow-sm font-bold"
                        >
                            <option value="">Filtrar por Especialista...</option>
                            {doctors.map(doc => (
                                <option key={doc.id} value={doc.id}>{doc.name}</option>
                            ))}
                        </select>
                    </div>
                    <button
                        onClick={() => {
                            setSelectedApp(null);
                            setIsModalOpen(true);
                        }}
                        className="flex items-center gap-3 px-8 py-4.5 bg-brand-primary text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-orange-600 active:scale-95 transition-all shadow-xl shadow-orange-500/20 group"
                    >
                        <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform duration-500" />
                        Nuevo Agendamiento
                    </button>
                </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Hoy',               val: kpis.hoy,           color: 'text-info',    bg: 'bg-info/10 border-info/20' },
                    { label: 'Esta semana',        val: kpis.semana,        color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20' },
                    { label: 'Req. pendientes',    val: kpis.reqPendientes, color: 'text-warning', bg: 'bg-warning/10 border-warning/20' },
                    { label: 'Completados',        val: kpis.completados,   color: 'text-success', bg: 'bg-success/10 border-success/20' },
                ].map(k => (
                    <div key={k.label} className={cn('flex items-center gap-4 px-5 py-4 rounded-2xl border', k.bg)}>
                        <span className={cn('text-3xl font-black', k.color)}>{k.val}</span>
                        <span className="text-[10px] font-black uppercase tracking-widest text-brand-text/40">{k.label}</span>
                    </div>
                ))}
            </div>

            {/* Filtros adicionales */}
            <div className="flex flex-wrap items-center gap-3 p-4 bg-brand-surface border border-brand-border rounded-2xl">
                <span className="text-[10px] font-black uppercase tracking-widest text-brand-text/30">Filtrar:</span>

                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                    className="bg-brand-bg border border-brand-border rounded-xl px-3 py-2 text-xs text-brand-text outline-none focus:border-info/50 appearance-none">
                    <option value="">Todos los estados</option>
                    {Object.entries(STATUS_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>{v.label}</option>
                    ))}
                </select>

                <select value={filterCenter} onChange={e => setFilterCenter(e.target.value)}
                    className="bg-brand-bg border border-brand-border rounded-xl px-3 py-2 text-xs text-brand-text outline-none focus:border-info/50 appearance-none">
                    <option value="">Todos los centros</option>
                    {centers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>

                <div className="flex items-center gap-2">
                    <span className="text-[10px] text-brand-text/30 font-bold">Desde</span>
                    <input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)}
                        className="bg-brand-bg border border-brand-border rounded-xl px-3 py-2 text-xs text-brand-text outline-none focus:border-info/50" />
                </div>

                <div className="flex items-center gap-2">
                    <span className="text-[10px] text-brand-text/30 font-bold">Hasta</span>
                    <input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)}
                        className="bg-brand-bg border border-brand-border rounded-xl px-3 py-2 text-xs text-brand-text outline-none focus:border-info/50" />
                </div>

                {(filterStatus || filterCenter || filterDateFrom || filterDateTo) && (
                    <button onClick={() => { setFilterStatus(''); setFilterCenter(''); setFilterDateFrom(''); setFilterDateTo(''); }}
                        className="px-3 py-2 text-[10px] font-black uppercase text-danger hover:bg-danger/10 rounded-xl transition-colors">
                        Limpiar filtros
                    </button>
                )}

                <span className="ml-auto text-[10px] font-mono text-brand-text/30">
                    {filteredAppointments.length} de {appointments.length} resultados
                </span>
            </div>

            {/* Tactical Tabs */}
            <div className="flex items-center gap-2 p-2 bg-brand-surface border border-brand-border rounded-[2rem] w-fit shadow-xl">
                {TABS.map(tab => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={cn(
                                "flex items-center gap-3 px-8 py-3.5 rounded-[1.25rem] text-[10px] font-black uppercase tracking-widest transition-all duration-500",
                                isActive
                                    ? "bg-brand-primary text-white shadow-xl shadow-orange-500/20 border border-brand-primary scale-[1.05]"
                                    : "text-brand-text/40 hover:text-brand-text hover:bg-brand-bg"
                            )}
                        >
                            <Icon className={cn("w-4 h-4", isActive ? "text-white" : "text-brand-text/20")} />
                            {tab.name}
                        </button>
                    );
                })}
            </div>

            {/* Dashboard Content */}
            <div className="grid gap-8">
                {fetchError && (
                    <div className="p-5 bg-danger/10 border border-danger/20 rounded-3xl text-danger text-[10px] font-black uppercase tracking-widest flex items-center gap-4 shadow-sm">
                        <div className="p-2 bg-brand-surface rounded-xl shadow-sm">
                            <AlertCircle className="w-5 h-5" />
                        </div>
                        Error de Sistema: {fetchError}
                    </div>
                )}

                {activeTab === 'agenda' && (
                    <div className="space-y-8 anim-fade-up">
                        <div className="flex items-center justify-between pb-8 border-b border-brand-border">
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black text-brand-primary uppercase tracking-[0.3em] mb-1">Agenda Clínica</span>
                                <h2 className="text-3xl font-black text-brand-text tracking-tight uppercase">Programación Institucional</h2>
                            </div>
                            <div className="flex items-center gap-2 bg-brand-surface border border-brand-border rounded-2xl p-1.5 shadow-xl">
                                <button
                                    onClick={() => setViewMode('list')}
                                    className={cn(
                                        "px-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                                        viewMode === 'list'
                                            ? "bg-brand-primary text-white shadow-lg shadow-orange-500/20 border border-brand-primary"
                                            : "text-brand-text/40 hover:text-brand-text"
                                    )}
                                >
                                    Lista
                                </button>
                                <button
                                    onClick={() => setViewMode('worklist')}
                                    className={cn(
                                        "px-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                                        viewMode === 'worklist'
                                            ? "bg-brand-primary text-white shadow-lg shadow-orange-500/20 border border-brand-primary"
                                            : "text-brand-text/40 hover:text-brand-text"
                                    )}
                                >
                                    Worklist
                                </button>
                                <button
                                    onClick={() => setViewMode('calendar')}
                                    className={cn(
                                        "px-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                                        viewMode === 'calendar'
                                            ? "bg-brand-primary text-white shadow-lg shadow-orange-500/20 border border-brand-primary"
                                            : "text-brand-text/40 hover:text-brand-text"
                                    )}
                                >
                                    Calendario
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                            {viewMode === 'list' ? (
                                filteredAppointments.length === 0 ? (
                                    <div className="xl:col-span-2 p-28 text-center border-4 border-dashed border-slate-100 rounded-[4rem] bg-slate-50/30">
                                        <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-8 shadow-xl border border-slate-50">
                                            <ActivityIcon className="w-8 h-8 text-slate-200" />
                                        </div>
                                        <p className="text-slate-400 uppercase font-black tracking-[0.2em] text-[11px]">No se registran procedimientos en esta vista</p>
                                    </div>
                                ) : (
                                    filteredAppointments.map(app => (
                                        <div
                                            key={app.id}
                                            onClick={() => {
                                                setSelectedApp(app);
                                                setIsDetailsOpen(true);
                                            }}
                                            className="card-premium group relative overflow-hidden cursor-pointer hover:border-brand-primary/40 transition-all duration-500"
                                        >
                                            <div className="absolute top-0 right-0 w-40 h-40 bg-orange-50/50 blur-3xl -mr-16 -mt-16 group-hover:bg-orange-100/50 transition-colors" />

                                            <div className="flex flex-col gap-10">
                                                <div className="flex items-start justify-between">
                                                    <div className="flex items-center gap-5">
                                                        <div className="w-16 h-16 rounded-[1.5rem] bg-brand-bg border border-brand-border flex items-center justify-center shadow-inner group-hover:bg-brand-primary group-hover:border-brand-primary transition-all duration-500">
                                                            <User className="w-7 h-7 text-brand-text/20 group-hover:text-white transition-colors" />
                                                        </div>
                                                        <div>
                                                            <h3 className="text-2xl font-black text-brand-text tracking-tight">{formatName(app.patientName)}</h3>
                                                            <div className="flex items-center gap-4 mt-1.5">
                                                                <span className="text-[10px] text-brand-text/40 font-bold uppercase tracking-widest bg-brand-bg border border-brand-border px-2.5 py-1 rounded-lg">{formatRUT(app.patientRut)}</span>
                                                                <span className="text-[10px] text-brand-primary font-black uppercase tracking-[0.1em]">{app.healthcareProvider}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className={cn(
                                                        "px-5 py-2 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] border shadow-sm",
                                                        (STATUS_LABELS[app.status]?.border || 'border-brand-border'),
                                                        STATUS_LABELS[app.status]?.color || 'text-brand-text/40',
                                                        STATUS_LABELS[app.status]?.bg || 'bg-brand-surface'
                                                    )}>
                                                        {STATUS_LABELS[app.status]?.label || app.status}
                                                    </div>
                                                    {addendumRequests.some(r => r.patient_rut === app.patientRut) && (
                                                        <div className="flex items-center gap-2 px-4 py-2 bg-danger/10 border border-danger/20 rounded-xl text-danger text-[10px] font-black uppercase tracking-widest animate-pulse shadow-sm">
                                                            <AlertCircle className="w-4 h-4 text-danger" />
                                                            ADDENDUM SOLICITADO
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="grid grid-cols-2 gap-8 p-8 bg-brand-bg/50 rounded-[2.5rem] border border-brand-border shadow-inner group-hover:bg-brand-surface transition-colors duration-500">
                                                    <div className="space-y-4">
                                                        <div className="flex items-center gap-3 text-[10px] text-brand-text/40 font-extrabold uppercase tracking-[0.15em]">
                                                            <div className="p-1 px-2 bg-brand-primary/10 rounded-lg">
                                                                <Stethoscope className="w-3.5 h-3.5 text-brand-primary" />
                                                            </div>
                                                            Protocolo Médico
                                                        </div>
                                                        <p className="text-[13px] font-black text-brand-text leading-tight uppercase">
                                                            <span className="text-brand-primary">[{app.procedure?.code}]</span> {app.procedure?.name}
                                                        </p>
                                                    </div>
                                                    <div className="space-y-4">
                                                        <div className="flex items-center gap-3 text-[10px] text-brand-text/40 font-extrabold uppercase tracking-[0.15em]">
                                                            <div className="p-1 px-2 bg-success/10 rounded-lg">
                                                                <MapPin className="w-3.5 h-3.5 text-success" />
                                                            </div>
                                                            Centro Clínico
                                                        </div>
                                                        <p className="text-[13px] font-black text-brand-text leading-tight uppercase">
                                                            {app.center?.name} <span className="text-brand-text/40 font-bold text-[10px]">({app.center?.city})</span>
                                                        </p>
                                                    </div>
                                                    <div className="space-y-4">
                                                        <div className="flex items-center gap-3 text-[10px] text-brand-text/40 font-extrabold uppercase tracking-[0.15em]">
                                                            <div className="p-1 px-2 bg-warning/10 rounded-lg">
                                                                <Clock className="w-3.5 h-3.5 text-warning" />
                                                            </div>
                                                            Fecha y Hora
                                                        </div>
                                                        <p className="text-[13px] font-black text-brand-text">
                                                            {new Date(`${app.appointmentDate}T12:00:00`).toLocaleDateString('es-CL', { weekday: 'long', day: '2-digit', month: 'long' })} • <span className="text-brand-primary">{app.appointmentTime}</span>
                                                        </p>
                                                    </div>
                                                    <div className="space-y-4 relative">
                                                        <div className="flex items-center gap-3 text-[10px] text-brand-text/40 font-extrabold uppercase tracking-[0.15em]">
                                                            <div className="p-1 px-2 bg-danger/10 rounded-lg">
                                                                <ActivityIcon className="w-3.5 h-3.5 text-danger" />
                                                            </div>
                                                            Condición Paciente
                                                        </div>
                                                        <div className="flex gap-2">
                                                            {app.medicalBackground?.usesAspirin && (
                                                                <span className="px-3 py-1 rounded-lg text-[9px] font-black uppercase bg-danger/10 text-danger border border-danger/20 shadow-sm">Aspirina</span>
                                                            )}
                                                            {app.medicalBackground?.usesAnticoagulants && (
                                                                <span className="px-3 py-1 rounded-lg text-[9px] font-black uppercase bg-danger/10 text-danger border border-danger/20 shadow-sm">Anticoagulante</span>
                                                            )}
                                                            {!app.medicalBackground?.usesAspirin && !app.medicalBackground?.usesAnticoagulants && (
                                                                <span className="text-[10px] font-bold text-brand-text/20 uppercase italic">Sin observaciones críticas</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center justify-between pt-6 border-t border-brand-border gap-6">
                                                    <div className="flex items-center gap-3">
                                                         <div className={cn(
                                                             "w-3 h-3 rounded-full border-2 border-brand-surface shadow-xl",
                                                             app.checkoutStatus ? "bg-success shadow-success/20" : "bg-danger shadow-danger/20"
                                                         )} />
                                                         <span className="text-[10px] font-black text-brand-text/40 uppercase tracking-widest">
                                                             {app.checkoutStatus ? 'Requisitos Validados' : 'Pendiente Verificación'}
                                                         </span>
                                                         {app.documents && app.documents.length > 0 && (
                                                             <span className="text-[9px] font-mono text-brand-text/30">
                                                                 {app.documents.filter(d => d.verifiedAt).length}/{app.documents.length} docs
                                                             </span>
                                                         )}
                                                     </div>
                                                    <div className="flex gap-3">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setSelectedApp(app);
                                                                setIsModalOpen(true);
                                                            }}
                                                            className="p-4 bg-brand-surface border border-brand-border rounded-2xl hover:bg-white hover:text-black transition-all shadow-sm group/btn"
                                                            title="Editar Agendamiento"
                                                        >
                                                            <Pencil className="w-4 h-4 text-brand-text/40 group-hover/btn:text-black" />
                                                        </button>
                                                        <button
                                                            onClick={(e) => handleDeleteAppointment(app.id, e)}
                                                            className="p-4 bg-brand-surface border border-brand-border rounded-2xl hover:bg-danger hover:border-danger hover:text-white transition-all shadow-sm group/btn"
                                                            title="Eliminar Agendamiento"
                                                        >
                                                            <Trash2 className="w-4 h-4 text-brand-text/40 group-hover/btn:text-white" />
                                                        </button>
                                                        <button
                                                             onClick={(e) => {
                                                                 e.stopPropagation();
                                                                 const texto = `📋 *Agendamiento AMIS*\n\n👤 Paciente: ${app.patientName}\n🔬 Procedimiento: ${app.procedure?.name}\n📍 Centro: ${app.center?.name}\n📅 Fecha: ${new Date(`${app.appointmentDate}T12:00:00`).toLocaleDateString('es-CL', { weekday: 'long', day: '2-digit', month: 'long' })} ${app.appointmentTime}\n👨‍⚕️ Médico: ${app.doctor?.name || 'Por asignar'}\n\n_Enviado desde AMIS 3.0_`;
                                                                 navigator.clipboard.writeText(texto);
                                                                 alert('Resumen copiado al portapapeles ✅');
                                                             }}
                                                             className="p-4 bg-brand-surface border border-brand-border rounded-2xl hover:bg-white hover:text-black transition-all shadow-sm"
                                                             title="Copiar resumen"
                                                         >
                                                             <Share2 className="w-4 h-4 text-brand-text/40" />
                                                         </button>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setSelectedApp(app);
                                                                setIsDetailsOpen(true);
                                                            }}
                                                            className="flex items-center gap-4 px-8 py-4 bg-brand-primary text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:brightness-110 transition-all shadow-xl shadow-orange-500/20"
                                                        >
                                                            Expediente Digital
                                                            <ArrowRight className="w-5 h-5" />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )
                            ) : viewMode === 'worklist' ? (
                                <div className="xl:col-span-2 overflow-x-auto card-premium p-0 border-brand-border scrollbar-hide">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="border-b border-brand-border bg-brand-surface">
                                                <th className="py-4 px-6 text-[10px] font-black uppercase tracking-[0.2em] text-brand-text/40">Paciente</th>
                                                <th className="py-4 px-6 text-[10px] font-black uppercase tracking-[0.2em] text-brand-text/40">Fecha/Hora</th>
                                                <th className="py-4 px-6 text-[10px] font-black uppercase tracking-[0.2em] text-brand-text/40">Procedimiento / Médico</th>
                                                <th className="py-4 px-6 text-[10px] font-black uppercase tracking-[0.2em] text-brand-text/40">Institución / Centro</th>
                                                <th className="py-4 px-6 text-[10px] font-black uppercase tracking-[0.2em] text-brand-text/40">Estado</th>
                                                <th className="py-4 px-6 text-[10px] font-black uppercase tracking-[0.2em] text-brand-text/40 text-right">Acciones</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredAppointments.length === 0 ? (
                                                <tr>
                                                    <td colSpan={6} className="py-12 text-center text-slate-400 uppercase font-black tracking-[0.2em] text-[11px]">
                                                        No hay agendamientos para mostrar
                                                    </td>
                                                </tr>
                                            ) : (
                                                filteredAppointments.map(app => (
                                                    <tr key={app.id} className="border-b border-brand-border/50 hover:bg-brand-bg/30 transition-colors">
                                                        <td className="py-4 px-6">
                                                            <p className="text-[12px] font-black text-brand-text">{formatName(app.patientName)}</p>
                                                            <p className="text-[10px] text-brand-text/40 font-bold">{formatRUT(app.patientRut)}</p>
                                                        </td>
                                                        <td className="py-4 px-6">
                                                            <p className="text-[12px] font-black text-brand-text">{new Date(`${app.appointmentDate}T12:00:00`).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit' })}</p>
                                                            <p className="text-[10px] text-brand-primary font-bold">{app.appointmentTime}</p>
                                                        </td>
                                                        <td className="py-4 px-6">
                                                            <p className="text-[11px] font-black text-brand-text truncate max-w-[200px]" title={app.procedure?.name}>{app.procedure?.name}</p>
                                                            <p className="text-[10px] text-brand-text/40 truncate max-w-[200px]">{app.doctor?.name || 'S/E'}</p>
                                                        </td>
                                                        <td className="py-4 px-6">
                                                            <p className="text-[11px] font-black text-brand-text truncate max-w-[150px]">{institutions.find(i => i.id === app.institutionId)?.legalName || 'Mutuales'}</p>
                                                            <p className="text-[10px] text-brand-text/40">{app.center?.name || 'Centro AMIS'}</p>
                                                        </td>
                                                        <td className="py-4 px-6">
                                                            <div className={cn(
                                                                "inline-flex px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-[0.2em] border shadow-sm",
                                                                (STATUS_LABELS[app.status]?.border || 'border-brand-border'),
                                                                STATUS_LABELS[app.status]?.color || 'text-brand-text/40',
                                                                STATUS_LABELS[app.status]?.bg || 'bg-brand-surface'
                                                            )}>
                                                                {STATUS_LABELS[app.status]?.label || app.status}
                                                            </div>
                                                            {addendumRequests.some(r => r.patient_rut === app.patientRut) && (
                                                                <div className="mt-1 flex items-center gap-1.5 text-[8px] font-black text-danger uppercase tracking-widest animate-pulse">
                                                                    <AlertCircle className="w-3 h-3" />
                                                                    ADDENDUM
                                                                </div>
                                                            )}
                                                            {app.documents && app.documents.length > 0 && (
                                                                <p className="text-[8px] text-brand-text/30 font-mono mt-1">
                                                                    {app.documents.filter(d => d.verifiedAt).length}/{app.documents.length} docs
                                                                </p>
                                                            )}
                                                        </td>
                                                        <td className="py-4 px-6 text-right">
                                                            <div className="flex items-center justify-end gap-2">
                                                                <button
                                                                    onClick={() => {
                                                                        setSelectedApp(app);
                                                                        setIsDetailsOpen(true);
                                                                    }}
                                                                    className="p-2 border border-brand-border rounded-lg text-brand-primary hover:bg-brand-primary hover:text-white transition-colors"
                                                                    title="Ver Expediente"
                                                                >
                                                                    <Book className="w-4 h-4" />
                                                                </button>
                                                                <button
                                                                    onClick={() => {
                                                                        setSelectedApp(app);
                                                                        setIsModalOpen(true);
                                                                    }}
                                                                    className="p-2 border border-brand-border rounded-lg hover:bg-white hover:text-black transition-colors"
                                                                    title="Editar"
                                                                >
                                                                    <Pencil className="w-4 h-4" />
                                                                </button>
                                                                <button
                                                                    onClick={() => {
                                                                        const texto = `📋 *Agendamiento AMIS*\n\n👤 ${app.patientName} · ${app.patientRut}\n🔬 ${app.procedure?.name}\n📍 ${app.center?.name}\n📅 ${new Date(`${app.appointmentDate}T12:00:00`).toLocaleDateString('es-CL')} ${app.appointmentTime}\n👨‍⚕️ ${app.doctor?.name || 'Por asignar'}`;
                                                                        navigator.clipboard.writeText(texto);
                                                                        alert('Resumen copiado');
                                                                    }}
                                                                    className="p-2 border border-brand-border rounded-lg hover:bg-brand-surface transition-colors"
                                                                    title="Copiar resumen"
                                                                >
                                                                    <Share2 className="w-4 h-4 text-brand-text/40" />
                                                                </button>
                                                                <button
                                                                    onClick={(e) => handleDeleteAppointment(app.id, e)}
                                                                    className="p-2 border border-brand-border rounded-lg hover:bg-danger hover:border-danger hover:text-white transition-colors text-danger"
                                                                    title="Eliminar"
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="xl:col-span-2">
                                    <ClinicalCalendar
                                        appointments={filteredAppointments}
                                        onSelectAppointment={(app) => {
                                            setSelectedApp(app);
                                            setIsDetailsOpen(true);
                                        }}
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'catalog' && (
                    <CatalogTab
                        catalog={catalog}
                        onUpsert={upsertProcedure}
                        onDelete={deleteProcedure}
                    />
                )}

                {activeTab === 'logistics' && (
                    <LogisticsTab
                        appointments={appointments}
                        onSelectAppointment={(app) => { setSelectedApp(app); setIsDetailsOpen(true); }}
                    />
                )}

                {activeTab === 'results' && (
                    <ResultsTab
                        appointments={appointments}
                        doctors={doctors}
                        onUploadResult={uploadResult}
                    />
                )}

                {activeTab === 'config' && (
                    <ClinicalConfigPanel
                        catalog={catalog}
                        centers={centers}
                        requirements={requirements}
                        batteries={batteries}
                        onUpsertProcedure={upsertProcedure}
                        onUpsertRequirement={upsertRequirement}
                        onUpsertBattery={upsertBattery}
                        onUpsertIndications={upsertIndications}
                        onGetIndications={getIndications}
                        onDeleteProcedure={deleteProcedure}
                        onDeleteRequirement={deleteRequirement}
                        onDeleteBattery={deleteBattery}
                        onDeleteIndications={deleteIndications}
                        indications={indications}
                    />
                )}
            </div>

            <ClinicalProcedureModal
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false);
                    setSelectedApp(null);
                }}
                onSave={async (data) => {
                    if (selectedApp) {
                        return await updateAppointment(selectedApp.id, data);
                    } else {
                        return await addAppointment(data);
                    }
                }}
                initialData={selectedApp}
                catalog={catalog}
                centers={centers}
                doctors={doctors}
                institutions={institutions}
            />

            <ProcedureDetailsPanel
                isOpen={isDetailsOpen}
                onClose={() => {
                    setIsDetailsOpen(false);
                    setSelectedApp(null);
                }}
                appointment={selectedApp}
                onVerifyDoc={verifyDocument}
                onGetIndications={getIndications}
                onUpdateStatus={updateAppointmentStatus}
                onEdit={() => {
                    setIsDetailsOpen(false);
                    setIsModalOpen(true);
                }}
                onGetHistory={getPatientHistory}
                onUploadResult={uploadResult}
                addendumRequests={addendumRequests}
            />
        </div>
    );
};
