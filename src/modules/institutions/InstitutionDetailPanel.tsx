import React, { useState, useEffect, useCallback } from 'react';
import {
    X, Edit3, Trash2, Building2, FileText, Clock, MessageSquare,
    Plus, AlertTriangle, CheckCircle, XCircle, Phone,
    Mail, MapPin, Calendar, TrendingUp, Shield, Loader2
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useInstitutions } from '../../hooks/useInstitutions';
import type {
    Institution, InstitutionContract, InstitutionActivity,
    ContractStatus, ActivityEventType
} from '../../types/institutions';

interface DetailPanelProps {
    institutionId: string;
    onClose: () => void;
    onEdit: (inst: Institution) => void;
    onDelete: (id: string) => void;
}

type TabId = 'info' | 'contratos' | 'sla' | 'bitacora';

const SLA_LABELS: Record<string, string> = {
    urgencia: 'Exámenes de Urgencia',
    ambulatorio: 'Ambulatorio Estándar',
    hospitalizado: 'Pacientes Hospitalizados',
    prioritario: 'Prioritarios (Contractual)',
    oncologico: 'Oncológicos / Alta Complejidad',
};

const EVENT_LABELS: Record<string, string> = {
    reunion: 'Reunión',
    llamada: 'Llamada Telefónica',
    email: 'Correo Electrónico',
    visita: 'Visita Comercial',
    incidente: 'Incidente Operacional',
    nota: 'Nota Interna',
    auditoria: 'Auditoría',
};

const EVENT_ICONS: Record<string, string> = {
    reunion: '🤝',
    llamada: '📞',
    email: '📧',
    visita: '🏢',
    incidente: '⚠️',
    nota: '📝',
    auditoria: '🔍',
};

export const InstitutionDetailPanel: React.FC<DetailPanelProps> = ({
    institutionId, onClose, onEdit, onDelete
}) => {
    const { fetchInstitutionDetail, addActivityLog, addContract } = useInstitutions();
    const [detail, setDetail] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<TabId>('info');

    // ── Activity form ──
    const [showActivityForm, setShowActivityForm] = useState(false);
    const [actForm, setActForm] = useState({ eventType: 'nota' as ActivityEventType, title: '', description: '' });

    // ── Contract form ──
    const [showContractForm, setShowContractForm] = useState(false);
    const [contractForm, setContractForm] = useState({
        contractName: '', contractNumber: '', startDate: '', endDate: '', totalValue: 0, paymentTerms: ''
    });

    const loadDetail = useCallback(async () => {
        try {
            setLoading(true);
            const data = await fetchInstitutionDetail(institutionId);
            setDetail(data);
        } catch (err) {
            console.error('Error fetching institution detail:', err);
        } finally {
            setLoading(false);
        }
    }, [institutionId, fetchInstitutionDetail]);

    useEffect(() => { loadDetail(); }, [loadDetail]);

    const handleAddActivity = async () => {
        if (!actForm.title.trim()) return;
        await addActivityLog({
            institutionId,
            eventType: actForm.eventType,
            title: actForm.title,
            description: actForm.description,
        });
        setActForm({ eventType: 'nota', title: '', description: '' });
        setShowActivityForm(false);
        loadDetail();
    };

    const handleAddContract = async () => {
        if (!contractForm.contractName.trim() || !contractForm.startDate || !contractForm.endDate) return;
        await addContract({
            institutionId,
            contractName: contractForm.contractName,
            contractNumber: contractForm.contractNumber,
            startDate: contractForm.startDate,
            endDate: contractForm.endDate,
            totalValue: contractForm.totalValue,
            paymentTerms: contractForm.paymentTerms,
        });
        setContractForm({ contractName: '', contractNumber: '', startDate: '', endDate: '', totalValue: 0, paymentTerms: '' });
        setShowContractForm(false);
        loadDetail();
    };

    const getStatusBadge = (status: ContractStatus) => {
        const map: Record<ContractStatus, { label: string; cls: string }> = {
            draft: { label: 'Borrador', cls: 'text-white/40 bg-white/5' },
            active: { label: 'Vigente', cls: 'text-emerald-400 bg-emerald-500/10' },
            expired: { label: 'Expirado', cls: 'text-red-400 bg-red-500/10' },
            terminated: { label: 'Terminado', cls: 'text-orange-400 bg-orange-500/10' },
            renewing: { label: 'Renovando', cls: 'text-blue-400 bg-blue-500/10' },
        };
        const { label, cls } = map[status];
        return <span className={cn('px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider', cls)}>{label}</span>;
    };

    const getExpiryIndicator = (days?: number) => {
        if (days === undefined) return null;
        if (days <= 0) return <span className="flex items-center gap-1 text-[9px] text-red-400"><XCircle className="w-3 h-3" /> Expirado</span>;
        if (days <= 30) return <span className="flex items-center gap-1 text-[9px] text-red-400"><AlertTriangle className="w-3 h-3" /> {days}d</span>;
        if (days <= 90) return <span className="flex items-center gap-1 text-[9px] text-amber-400"><AlertTriangle className="w-3 h-3" /> {days}d</span>;
        if (days <= 180) return <span className="flex items-center gap-1 text-[9px] text-blue-400"><Clock className="w-3 h-3" /> {days}d</span>;
        return <span className="flex items-center gap-1 text-[9px] text-emerald-400"><CheckCircle className="w-3 h-3" /> {days}d</span>;
    };

    if (loading) return (
        <div className="fixed inset-y-0 right-0 w-[480px] z-40 bg-[#0a0a0a] border-l border-white/10 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
    );

    if (!detail) return null;

    const tabs = [
        { id: 'info' as TabId, label: 'Información', icon: Building2 },
        { id: 'contratos' as TabId, label: `Contratos (${detail.contracts?.length || 0})`, icon: FileText },
        { id: 'sla' as TabId, label: 'SLAs', icon: Shield },
        { id: 'bitacora' as TabId, label: `Bitácora (${detail.activityLog?.length || 0})`, icon: MessageSquare },
    ];

    const inputCls = "w-full bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2 text-sm text-white/80 placeholder-white/20 focus:outline-none focus:border-blue-500/50 transition-all";
    const labelCls = "text-[9px] uppercase font-black text-white/20 tracking-widest mb-1 block";

    return (
        <div className="fixed inset-y-0 right-0 w-[480px] z-40 bg-[#0a0a0a] border-l border-white/10 shadow-2xl shadow-black/70 flex flex-col animate-in slide-in-from-right duration-300">
            {/* Header */}
            <div className="px-5 py-4 border-b border-white/5 flex-shrink-0">
                <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                        <span className="text-[9px] font-black text-blue-400 uppercase tracking-[0.3em]">Detalle Institucional</span>
                        <h3 className="text-lg font-black text-white tracking-tight truncate">{detail.legalName}</h3>
                        {detail.rut && <p className="text-xs text-white/30 font-mono">{detail.rut}</p>}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                        <button onClick={() => onEdit(detail)} className="p-2 bg-white/5 hover:bg-blue-600/20 rounded-xl transition-all">
                            <Edit3 className="w-3.5 h-3.5 text-white/40 hover:text-blue-400" />
                        </button>
                        <button onClick={() => onDelete(detail.id)} className="p-2 bg-white/5 hover:bg-red-600/20 rounded-xl transition-all">
                            <Trash2 className="w-3.5 h-3.5 text-white/40 hover:text-red-400" />
                        </button>
                        <button onClick={onClose} className="p-2 bg-white/5 hover:bg-white/10 rounded-xl transition-all">
                            <X className="w-3.5 h-3.5 text-white/40" />
                        </button>
                    </div>
                </div>
                <div className="flex gap-1 overflow-x-auto">
                    {tabs.map(({ id, label, icon: Icon }) => (
                        <button
                            key={id}
                            onClick={() => setActiveTab(id)}
                            className={cn(
                                'flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold whitespace-nowrap transition-all',
                                activeTab === id
                                    ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                                    : 'text-white/25 hover:text-white/50'
                            )}
                        >
                            <Icon className="w-3 h-3" />
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

                {/* ── Tab: Info ── */}
                {activeTab === 'info' && (
                    <>
                        {/* Quick Stats */}
                        <div className="grid grid-cols-3 gap-3">
                            <div className="p-3 bg-white/[0.03] rounded-xl text-center">
                                <p className="text-xl font-black text-blue-400 font-mono">{detail.activeContracts}</p>
                                <p className="text-[8px] text-white/20 uppercase tracking-widest">Activos</p>
                            </div>
                            <div className="p-3 bg-white/[0.03] rounded-xl text-center">
                                <p className="text-xl font-black text-white/60 font-mono">{detail.totalContracts}</p>
                                <p className="text-[8px] text-white/20 uppercase tracking-widest">Total</p>
                            </div>
                            <div className="p-3 bg-white/[0.03] rounded-xl text-center">
                                <p className="text-xl font-black text-white/60 font-mono">{detail.contacts?.length || 0}</p>
                                <p className="text-[8px] text-white/20 uppercase tracking-widest">Contactos</p>
                            </div>
                        </div>

                        {/* Details */}
                        <div className="space-y-3">
                            {detail.address && (
                                <div className="flex items-start gap-2">
                                    <MapPin className="w-3.5 h-3.5 text-white/20 mt-0.5 flex-shrink-0" />
                                    <span className="text-xs text-white/50">{detail.address}{detail.city ? `, ${detail.city}` : ''}{detail.region ? `, ${detail.region}` : ''}</span>
                                </div>
                            )}
                            <div className="flex gap-2 flex-wrap">
                                <span className="text-[9px] px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/40 uppercase font-bold">
                                    {detail.sector}
                                </span>
                                <span className={cn('text-[9px] px-2 py-0.5 rounded-full border uppercase font-bold',
                                    detail.institutionType === 'publico' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                        detail.institutionType === 'privado' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                                            'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
                                )}>
                                    {detail.institutionType}
                                </span>
                            </div>
                        </div>

                        {/* Contacts */}
                        {detail.contacts?.length > 0 && (
                            <div>
                                <h4 className="text-[9px] font-black text-white/20 uppercase tracking-widest mb-2">Contactos</h4>
                                <div className="space-y-2">
                                    {detail.contacts.map((c: any) => (
                                        <div key={c.id} className="p-3 bg-white/[0.03] border border-white/5 rounded-xl">
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-xs font-bold text-white/80">{c.fullName}</span>
                                                {c.isPrimary && <span className="text-[8px] px-1.5 py-0.5 bg-blue-500/10 text-blue-400 rounded-full font-bold">Principal</span>}
                                            </div>
                                            {c.position && <p className="text-[10px] text-white/30 mb-1.5">{c.position}</p>}
                                            <div className="flex flex-wrap gap-3">
                                                {c.email && (
                                                    <a href={`mailto:${c.email}`} className="flex items-center gap-1 text-[10px] text-blue-400/60 hover:text-blue-400 transition-colors">
                                                        <Mail className="w-3 h-3" /> {c.email}
                                                    </a>
                                                )}
                                                {c.phone && (
                                                    <span className="flex items-center gap-1 text-[10px] text-white/30">
                                                        <Phone className="w-3 h-3" /> {c.phone}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {detail.notes && (
                            <div>
                                <h4 className="text-[9px] font-black text-white/20 uppercase tracking-widest mb-1">Notas</h4>
                                <p className="text-xs text-white/40 leading-relaxed">{detail.notes}</p>
                            </div>
                        )}
                    </>
                )}

                {/* ── Tab: Contratos ── */}
                {activeTab === 'contratos' && (
                    <>
                        <div className="flex items-center justify-between">
                            <h4 className="text-[9px] font-black text-white/20 uppercase tracking-widest">Contratos Vinculados</h4>
                            <button
                                onClick={() => setShowContractForm(!showContractForm)}
                                className="flex items-center gap-1 text-[10px] font-bold text-blue-400 hover:text-blue-300 transition-colors"
                            >
                                <Plus className="w-3.5 h-3.5" /> Nuevo Contrato
                            </button>
                        </div>

                        {/* Contract Form */}
                        {showContractForm && (
                            <div className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-xl space-y-3">
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="col-span-2">
                                        <label className={labelCls}>Nombre del Contrato *</label>
                                        <input className={inputCls} value={contractForm.contractName}
                                            onChange={(e) => setContractForm(p => ({ ...p, contractName: e.target.value }))}
                                            placeholder="Contrato de Telemedicina 2026" />
                                    </div>
                                    <div>
                                        <label className={labelCls}>N° Contrato</label>
                                        <input className={inputCls} value={contractForm.contractNumber}
                                            onChange={(e) => setContractForm(p => ({ ...p, contractNumber: e.target.value }))}
                                            placeholder="CTR-2026-001" />
                                    </div>
                                    <div>
                                        <label className={labelCls}>Valor Total (CLP)</label>
                                        <input className={inputCls} type="number" value={contractForm.totalValue}
                                            onChange={(e) => setContractForm(p => ({ ...p, totalValue: Number(e.target.value) }))} />
                                    </div>
                                    <div>
                                        <label className={labelCls}>Inicio *</label>
                                        <input className={inputCls} type="date" value={contractForm.startDate}
                                            onChange={(e) => setContractForm(p => ({ ...p, startDate: e.target.value }))} />
                                    </div>
                                    <div>
                                        <label className={labelCls}>Término *</label>
                                        <input className={inputCls} type="date" value={contractForm.endDate}
                                            onChange={(e) => setContractForm(p => ({ ...p, endDate: e.target.value }))} />
                                    </div>
                                </div>
                                <div className="flex justify-end gap-2">
                                    <button onClick={() => setShowContractForm(false)} className="text-[10px] text-white/30 hover:text-white/50 px-3 py-1.5">Cancelar</button>
                                    <button onClick={handleAddContract}
                                        className="text-[10px] font-bold bg-blue-600 hover:bg-blue-500 text-white px-4 py-1.5 rounded-lg transition-colors">
                                        Guardar
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Contract List */}
                        <div className="space-y-3">
                            {(!detail.contracts || detail.contracts.length === 0) ? (
                                <div className="p-8 text-center">
                                    <FileText className="w-8 h-8 text-white/10 mx-auto mb-2" />
                                    <p className="text-xs text-white/30 italic">Sin contratos registrados</p>
                                </div>
                            ) : detail.contracts.map((c: InstitutionContract) => (
                                <div key={c.id} className="p-4 bg-white/[0.03] border border-white/5 rounded-xl hover:border-white/10 transition-all">
                                    <div className="flex items-start justify-between mb-2">
                                        <div>
                                            <h5 className="text-xs font-bold text-white/80">{c.contractName}</h5>
                                            {c.contractNumber && <p className="text-[10px] text-white/25 font-mono">{c.contractNumber}</p>}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {getStatusBadge(c.status)}
                                            {getExpiryIndicator(c.daysUntilExpiry)}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4 text-[10px] text-white/30">
                                        <span className="flex items-center gap-1">
                                            <Calendar className="w-3 h-3" />
                                            {new Date(c.startDate).toLocaleDateString('es-CL')} — {new Date(c.endDate).toLocaleDateString('es-CL')}
                                        </span>
                                        {c.totalValue > 0 && (
                                            <span className="flex items-center gap-1 text-emerald-400/60">
                                                <TrendingUp className="w-3 h-3" />
                                                ${c.totalValue.toLocaleString('es-CL')}
                                            </span>
                                        )}
                                    </div>
                                    {/* SLA Rules for this contract */}
                                    {c.slaRules && c.slaRules.length > 0 && (
                                        <div className="mt-3 pt-2 border-t border-white/5">
                                            <p className="text-[8px] text-white/15 uppercase tracking-widest mb-1.5">SLA Asociados</p>
                                            <div className="flex flex-wrap gap-1.5">
                                                {c.slaRules.map(r => (
                                                    <span key={r.id} className="text-[9px] px-2 py-0.5 bg-blue-500/5 border border-blue-500/10 text-blue-400/60 rounded-full">
                                                        {SLA_LABELS[r.category] || r.category}: ≤{r.maxHours}h
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </>
                )}

                {/* ── Tab: SLAs ── */}
                {activeTab === 'sla' && (
                    <>
                        <h4 className="text-[9px] font-black text-white/20 uppercase tracking-widest">Tiempos de Respuesta por Categoría</h4>
                        {detail.contracts?.some((c: InstitutionContract) => c.slaRules && c.slaRules.length > 0) ? (
                            <div className="space-y-4">
                                {detail.contracts.filter((c: InstitutionContract) => c.slaRules && c.slaRules.length > 0).map((c: InstitutionContract) => (
                                    <div key={c.id}>
                                        <p className="text-[10px] font-bold text-white/50 mb-2">{c.contractName}</p>
                                        <div className="space-y-1.5">
                                            {c.slaRules!.map(rule => (
                                                <div key={rule.id} className="flex items-center justify-between p-3 bg-white/[0.03] border border-white/5 rounded-xl">
                                                    <span className="text-xs text-white/60">{SLA_LABELS[rule.category] || rule.category}</span>
                                                    <div className="flex items-center gap-2">
                                                        {rule.minHours > 0 && <span className="text-[10px] text-white/20">{rule.minHours}h —</span>}
                                                        <span className={cn('text-sm font-black font-mono',
                                                            rule.maxHours <= 2 ? 'text-red-400' :
                                                                rule.maxHours <= 4 ? 'text-amber-400' :
                                                                    rule.maxHours <= 8 ? 'text-blue-400' : 'text-emerald-400'
                                                        )}>
                                                            ≤ {rule.maxHours}h
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="p-8 text-center">
                                <Shield className="w-8 h-8 text-white/10 mx-auto mb-2" />
                                <p className="text-xs text-white/30 italic">Sin reglas SLA configuradas</p>
                                <p className="text-[10px] text-white/15 mt-1">Configure SLAs desde un contrato activo</p>
                            </div>
                        )}
                    </>
                )}

                {/* ── Tab: Bitácora CRM ── */}
                {activeTab === 'bitacora' && (
                    <>
                        <div className="flex items-center justify-between">
                            <h4 className="text-[9px] font-black text-white/20 uppercase tracking-widest">Historial de Interacciones</h4>
                            <button
                                onClick={() => setShowActivityForm(!showActivityForm)}
                                className="flex items-center gap-1 text-[10px] font-bold text-blue-400 hover:text-blue-300 transition-colors"
                            >
                                <Plus className="w-3.5 h-3.5" /> Nuevo Registro
                            </button>
                        </div>

                        {/* Activity Form */}
                        {showActivityForm && (
                            <div className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-xl space-y-3">
                                <div>
                                    <label className={labelCls}>Tipo de Evento</label>
                                    <select className={inputCls} value={actForm.eventType}
                                        onChange={(e) => setActForm(p => ({ ...p, eventType: e.target.value as ActivityEventType }))}>
                                        {Object.entries(EVENT_LABELS).map(([k, v]) => (
                                            <option key={k} value={k} className="bg-[#0a0a0a]">{v}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className={labelCls}>Título *</label>
                                    <input className={inputCls} value={actForm.title}
                                        onChange={(e) => setActForm(p => ({ ...p, title: e.target.value }))}
                                        placeholder="Reunión de seguimiento contrato X" />
                                </div>
                                <div>
                                    <label className={labelCls}>Descripción</label>
                                    <textarea className={cn(inputCls, 'min-h-[60px] resize-none')} value={actForm.description}
                                        onChange={(e) => setActForm(p => ({ ...p, description: e.target.value }))}
                                        placeholder="Detalles de la interacción..." />
                                </div>
                                <div className="flex justify-end gap-2">
                                    <button onClick={() => setShowActivityForm(false)} className="text-[10px] text-white/30 hover:text-white/50 px-3 py-1.5">Cancelar</button>
                                    <button onClick={handleAddActivity}
                                        className="text-[10px] font-bold bg-blue-600 hover:bg-blue-500 text-white px-4 py-1.5 rounded-lg transition-colors">
                                        Registrar
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Activity Timeline */}
                        <div className="space-y-0 relative">
                            {(!detail.activityLog || detail.activityLog.length === 0) ? (
                                <div className="p-8 text-center">
                                    <MessageSquare className="w-8 h-8 text-white/10 mx-auto mb-2" />
                                    <p className="text-xs text-white/30 italic">Sin registros de bitácora</p>
                                </div>
                            ) : (
                                <>
                                    <div className="absolute left-4 top-0 bottom-0 w-px bg-white/5" />
                                    {detail.activityLog.map((act: InstitutionActivity) => (
                                        <div key={act.id} className="relative pl-10 pb-4">
                                            <div className="absolute left-2.5 top-1 w-3.5 h-3.5 rounded-full bg-[#0a0a0a] border-2 border-white/10 flex items-center justify-center text-[8px]">
                                                {EVENT_ICONS[act.eventType] || '•'}
                                            </div>
                                            <div className="p-3 bg-white/[0.03] border border-white/5 rounded-xl hover:bg-white/[0.05] transition-colors">
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="text-[9px] font-black text-white/25 uppercase tracking-wider">
                                                        {EVENT_LABELS[act.eventType] || act.eventType}
                                                    </span>
                                                    <span className="text-[9px] text-white/15 font-mono">
                                                        {new Date(act.eventDate).toLocaleDateString('es-CL')}
                                                    </span>
                                                </div>
                                                <h5 className="text-xs font-bold text-white/70">{act.title}</h5>
                                                {act.description && <p className="text-[10px] text-white/30 mt-1 leading-relaxed">{act.description}</p>}
                                            </div>
                                        </div>
                                    ))}
                                </>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};
