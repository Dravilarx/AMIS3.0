import React from 'react';
import { Layers, Plus, Trash2 } from 'lucide-react';
import type { TabProps } from './types';
import { COMPANIES, EMPLOYMENT_RELATIONSHIPS } from './types';
import type { HoldingCompany } from '../../../types/core';

export const TabContratos: React.FC<TabProps> = ({ formData, setFormData }) => {
    const addContract = () =>
        setFormData(p => ({
            ...p,
            contracts: [...p.contracts, { company: 'Portezuelo', amount: 0, type: '' }],
        }));

    const removeContract = (i: number) =>
        setFormData(p => ({ ...p, contracts: p.contracts.filter((_, idx) => idx !== i) }));

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="space-y-4 p-4 bg-brand-surface/50 border border-brand-border rounded-2xl">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <Layers className="w-4 h-4 text-teal-400" />
                        <h3 className="text-sm font-bold uppercase tracking-widest text-brand-text/60">Configuración Contractual</h3>
                    </div>
                    <button type="button" onClick={addContract}
                        className="text-[10px] uppercase font-bold text-info hover:text-info/80 flex items-center gap-1">
                        <Plus className="w-3 h-3" /> Añadir Contrato
                    </button>
                </div>
                <div className="space-y-3">
                    {formData.contracts.map((contract, i) => (
                        <div key={i} className="p-4 bg-brand-surface border border-brand-border rounded-xl space-y-4 relative">
                            <button type="button" onClick={() => removeContract(i)}
                                className="absolute top-2 right-2 p-1.5 text-danger/40 hover:text-danger transition-colors">
                                <Trash2 className="w-4 h-4" />
                            </button>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[9px] uppercase font-bold text-brand-text/20">Empresa Contratante</label>
                                    <select
                                        className="bg-brand-surface border border-brand-border rounded-lg w-full px-3 py-1.5 text-xs text-brand-text outline-none"
                                        value={contract.company}
                                        onChange={e => {
                                            const c = [...formData.contracts];
                                            c[i].company = e.target.value as HoldingCompany;
                                            setFormData(p => ({ ...p, contracts: c }));
                                        }}>
                                        {COMPANIES.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[9px] uppercase font-bold text-brand-text/20">Relación Laboral</label>
                                    <select
                                        className="bg-brand-surface border border-brand-border rounded-lg w-full px-3 py-1.5 text-xs text-brand-text outline-none"
                                        value={contract.type}
                                        onChange={e => {
                                            const c = [...formData.contracts];
                                            c[i].type = e.target.value;
                                            setFormData(p => ({ ...p, contracts: c }));
                                        }}>
                                        <option value="">Seleccionar...</option>
                                        {EMPLOYMENT_RELATIONSHIPS.map(r => <option key={r} value={r}>{r}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[9px] uppercase font-bold text-brand-text/20">Monto Mensual</label>
                                    <input type="number"
                                        className="bg-brand-surface border border-brand-border rounded-lg w-full px-3 py-1.5 text-xs text-brand-text outline-none"
                                        value={contract.amount}
                                        onChange={e => {
                                            const c = [...formData.contracts];
                                            c[i].amount = Number(e.target.value);
                                            setFormData(p => ({ ...p, contracts: c }));
                                        }} />
                                </div>
                            </div>
                        </div>
                    ))}
                    {formData.contracts.length === 0 && (
                        <p className="text-center text-xs text-brand-text/20 py-6">
                            Sin contratos. Usa el botón "Añadir Contrato".
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};
