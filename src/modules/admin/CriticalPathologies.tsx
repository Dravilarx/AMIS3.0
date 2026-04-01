import React, { useState, useEffect } from 'react';
import { AlertTriangle, Plus, Building2, Trash2, Mail, Info } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { cn } from '../../lib/utils';

export const CriticalPathologies: React.FC = () => {
    const [institutions, setInstitutions] = useState<any[]>([]);
    const [pathologies, setPathologies] = useState<any[]>([]);
    const [selectedInst, setSelectedInst] = useState<string>('');
    const [loading, setLoading] = useState(true);

    const [isAdding, setIsAdding] = useState(false);
    const [newFindingType, setNewFindingType] = useState('');
    const [newTargetEmails, setNewTargetEmails] = useState('');

    const loadData = async () => {
        setLoading(true);
        try {
            const [instRes, pathRes] = await Promise.all([
                supabase.from('ris_institution_mapping').select('*').order('nombre_comercial'),
                supabase.from('institution_critical_pathologies').select('*, ris_institution_mapping(nombre_comercial)').order('created_at', { ascending: false })
            ]);
            
            if (instRes.data) setInstitutions(instRes.data);
            if (pathRes.data) setPathologies(pathRes.data);
            
            if (instRes.data && instRes.data.length > 0) setSelectedInst(instRes.data[0].id);
        } catch (error) {
            console.error("Error loading pathologies", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleAdd = async () => {
        if (!newFindingType || !newTargetEmails || !selectedInst) return;

        try {
            const { data, error } = await supabase.from('institution_critical_pathologies').insert({
                institution_id: selectedInst,
                finding_type: newFindingType,
                target_emails: newTargetEmails,
            }).select();

            if (!error && data) {
                setPathologies([data[0], ...pathologies]);
                setIsAdding(false);
                setNewFindingType('');
                setNewTargetEmails('');
            } else {
                alert('DB Error: ' + error?.message);
            }
        } catch (err: any) {
            alert('Error adding pathology');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('¿Seguro de remover esta regla crítica?')) return;
        try {
            await supabase.from('institution_critical_pathologies').delete().eq('id', id);
            setPathologies(pathologies.filter(p => p.id !== id));
        } catch (error) {}
    };

    const filteredPathologies = pathologies.filter(p => p.institution_id === selectedInst);

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            <div className="flex flex-col md:flex-row gap-6">
                
                {/* Panel Izquierdo: Selección de Institución */}
                <div className="w-full md:w-1/3 space-y-4">
                    <div className="flex items-center gap-2 mb-2 px-2">
                        <div className="p-2 bg-warning/10 rounded-xl">
                            <Building2 className="w-5 h-5 text-warning" />
                        </div>
                        <h3 className="text-xs font-black text-brand-text/80 uppercase tracking-widest">Selector Clínica</h3>
                    </div>

                    <div className="card-premium space-y-2 p-3 bg-brand-surface/30">
                        {institutions.map(inst => (
                            <button
                                key={inst.id}
                                onClick={() => setSelectedInst(inst.id)}
                                className={cn(
                                    "w-full text-left p-4 rounded-2xl transition-all border",
                                    selectedInst === inst.id
                                        ? "bg-warning/10 border-warning text-warning shadow-lg shadow-warning/10 scale-[1.02]"
                                        : "bg-brand-surface border-brand-border text-brand-text/60 hover:border-brand-text/20 hover:text-brand-text block"
                                )}
                            >
                                <p className="text-sm font-black uppercase truncate">{inst.nombre_comercial}</p>
                                <p className="text-[10px] uppercase font-bold text-brand-text/30 mt-1 truncate">VPN Legacy ID: {inst.legacy_id}</p>
                            </button>
                        ))}
                    </div>

                    <div className="p-4 bg-info/10 border border-info/20 rounded-2xl flex items-start gap-3 mt-4">
                        <Info className="w-5 h-5 text-info shrink-0" />
                        <div>
                            <p className="text-[10px] font-black uppercase text-info tracking-widest mb-1">Motor Resend Activado</p>
                            <p className="text-[10px] text-info/70 leading-relaxed">
                                Estas reglas determinan a qué correos se notifica automáticamente si el médico que reporta marca un hallazgo coincidente con el "Tipo" o cuando la IA detecta urgencia vital.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Panel Derecho: Reglas Críticas */}
                <div className="w-full md:w-2/3 space-y-4">
                    <div className="flex items-center justify-between px-2">
                        <div className="flex items-center gap-2">
                            <div className="p-2 bg-danger/10 rounded-xl">
                                <AlertTriangle className="w-5 h-5 text-danger" />
                            </div>
                            <h3 className="text-xs font-black text-brand-text/80 uppercase tracking-widest">Matriz de Alertas Rojas</h3>
                        </div>
                        <button 
                            onClick={() => setIsAdding(!isAdding)}
                            className="flex items-center gap-2 px-4 py-2 bg-danger text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:opacity-90 shadow-lg shadow-danger/20 transition-all"
                        >
                            <Plus className="w-3 h-3" />
                            Nueva Regla Crítica
                        </button>
                    </div>

                    <div className="card-premium flex flex-col bg-brand-surface/30 p-0 overflow-hidden min-h-[500px]">
                        
                        {/* Formulario Inline (Add) */}
                        {isAdding && (
                            <div className="p-6 border-b border-warning bg-warning/5 animate-in slide-in-from-top-4">
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-warning mb-4">Añadir Disparador de Emergencia</h4>
                                <div className="flex gap-4 items-end">
                                    <div className="flex-1 space-y-2">
                                        <label className="text-[10px] font-bold text-brand-text/40 uppercase">Palabra Clave o Hallazgo (Ej: Neumotórax)</label>
                                        <input 
                                            type="text" 
                                            value={newFindingType}
                                            onChange={(e) => setNewFindingType(e.target.value)}
                                            placeholder="Buscar este texto exacto..."
                                            className="w-full bg-brand-surface border border-brand-border rounded-xl px-4 py-2 text-xs focus:ring-1 focus:ring-warning outline-none"
                                        />
                                    </div>
                                    <div className="flex-2 space-y-2" style={{flex: 2}}>
                                        <label className="text-[10px] font-bold text-brand-text/40 uppercase">Correos de Destino (separados por coma)</label>
                                        <input 
                                            type="text" 
                                            value={newTargetEmails}
                                            onChange={(e) => setNewTargetEmails(e.target.value)}
                                            placeholder="urgencias@cl.com, medico.jefe@cl.com"
                                            className="w-full bg-brand-surface border border-brand-border rounded-xl px-4 py-2 text-xs focus:ring-1 focus:ring-warning outline-none"
                                        />
                                    </div>
                                    <button 
                                        onClick={handleAdd}
                                        className="h-9 px-6 bg-warning text-black rounded-xl font-black text-[10px] uppercase hover:opacity-90 transition-opacity"
                                    >
                                        Guardar
                                    </button>
                                </div>
                            </div>
                        )}

                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-brand-border bg-brand-surface/80">
                                    <th className="px-6 py-4 text-[10px] font-black text-brand-text/40 uppercase tracking-widest">Hallazgo Sensible</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-brand-text/40 uppercase tracking-widest">Protocolo de Redirección (Email)</th>
                                    <th className="px-6 py-4 text-center text-[10px] font-black text-brand-text/40 uppercase tracking-widest">Estado</th>
                                    <th className="px-6 py-4 text-right text-[10px] font-black text-brand-text/40 uppercase tracking-widest">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-brand-border">
                                {filteredPathologies.map(p => (
                                    <tr key={p.id} className="hover:bg-danger/5 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <AlertTriangle className="w-4 h-4 text-danger" />
                                                <span className="text-sm font-black text-brand-text">{p.finding_type}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <Mail className="w-4 h-4 text-brand-text/30" />
                                                <div className="flex flex-wrap gap-1">
                                                    {p.target_emails.split(',').map((email: string, i: number) => (
                                                        <span key={i} className="text-[9px] bg-brand-surface font-bold text-brand-text/80 px-2 py-1 border border-brand-border rounded-md">
                                                            {email.trim()}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest bg-success/10 text-success border border-success/20">
                                                <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse"></span>
                                                Armado
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button 
                                                onClick={() => handleDelete(p.id)}
                                                className="p-2 text-danger/50 hover:text-danger hover:bg-danger/20 rounded-lg transition-all"
                                                title="Eliminar Disparador"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {filteredPathologies.length === 0 && !loading && !isAdding && (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-20 text-center">
                                            <div className="inline-flex flex-col items-center">
                                                <div className="p-4 bg-danger/5 border border-danger/10 rounded-full mb-4">
                                                    <AlertTriangle className="w-8 h-8 text-danger/40" />
                                                </div>
                                                <p className="text-xs font-bold text-brand-text/40 uppercase tracking-widest mb-1">Sin Reglas de Alerta Crítica</p>
                                                <p className="text-[10px] text-brand-text/30">Crea una regla para que AMIS envíe correos urgentes si detecta la patología.</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>
        </div>
    );
};
