import React, { useState, useEffect } from 'react';
import { Database, Link2, Plus, Search, Building2, Trash2, Library } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export const ProcedureHomologation: React.FC = () => {
    const [institutions, setInstitutions] = useState<any[]>([]);
    const [masterProcedures, setMasterProcedures] = useState<any[]>([]);
    const [mappings, setMappings] = useState<any[]>([]);
    const [selectedInst, setSelectedInst] = useState<string>('');
    const [loading, setLoading] = useState(true);

    const loadData = async () => {
        setLoading(true);
        try {
            const [instRes, masterRes, mapRes] = await Promise.all([
                supabase.from('ris_institution_mapping').select('*').order('nombre_comercial'),
                supabase.from('master_procedures').select('*').order('codigo_amis'),
                supabase.from('procedure_mapping').select('*, master_procedures(titulo_oficial, codigo_amis), ris_institution_mapping(nombre_comercial)').order('created_at', { ascending: false })
            ]);
            
            if (instRes.data) setInstitutions(instRes.data);
            if (masterRes.data) setMasterProcedures(masterRes.data);
            if (mapRes.data) setMappings(mapRes.data);
            
            if (instRes.data && instRes.data.length > 0) setSelectedInst(instRes.data[0].id);
        } catch (error) {
            console.error("Error loading dictionaries", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const filteredMappings = mappings.filter(m => m.institution_id === selectedInst);

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            <div className="flex flex-col md:flex-row gap-6">
                
                {/* Panel Izquierdo: Catálogo Maestro AMIS */}
                <div className="w-full md:w-1/3 space-y-4">
                    <div className="flex items-center justify-between px-2">
                        <div className="flex items-center gap-2">
                            <div className="p-2 bg-brand-primary/10 rounded-xl">
                                <Library className="w-5 h-5 text-brand-primary" />
                            </div>
                            <h3 className="text-xs font-black text-brand-text/80 uppercase tracking-widest">Catálogo Maestro</h3>
                        </div>
                        <button className="p-2 hover:bg-brand-surface rounded-lg transition-colors text-brand-text/40 hover:text-brand-primary">
                            <Plus className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="card-premium h-[600px] flex flex-col p-4 bg-brand-surface/30">
                        <div className="relative mb-4">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-text/40" />
                            <input 
                                type="text" 
                                placeholder="Buscar Código AMIS..." 
                                className="w-full bg-brand-surface border border-brand-border rounded-xl pl-10 pr-4 py-2 text-xs focus:ring-1 focus:ring-brand-primary outline-none"
                            />
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-2">
                            {masterProcedures.map(p => (
                                <div key={p.id} className="p-3 bg-brand-surface border border-brand-border rounded-xl hover:border-brand-primary/30 transition-colors cursor-pointer group">
                                    <div className="flex justify-between items-start mb-1">
                                        <span className="text-[10px] font-black text-brand-primary uppercase tracking-widest">{p.codigo_amis}</span>
                                        <span className="text-[8px] font-bold text-brand-text/40 bg-brand-bg px-2 rounded-full">{p.modalidad}</span>
                                    </div>
                                    <p className="text-xs font-medium text-brand-text line-clamp-2">{p.titulo_oficial}</p>
                                </div>
                            ))}
                            {masterProcedures.length === 0 && !loading && (
                                <div className="text-center py-10 text-brand-text/40 text-xs italic">Catálogo vacío. Inyecta seed data.</div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Panel Derecho: Torre de Babel / Mappings */}
                <div className="w-full md:w-2/3 space-y-4">
                    <div className="flex items-center justify-between px-2">
                        <div className="flex items-center gap-2">
                            <div className="p-2 bg-info/10 rounded-xl">
                                <Link2 className="w-5 h-5 text-info" />
                            </div>
                            <h3 className="text-xs font-black text-brand-text/80 uppercase tracking-widest">Diccionario de Homologación</h3>
                        </div>
                        
                        {/* Selector de Institución */}
                        <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-brand-text/40" />
                            <select 
                                value={selectedInst} 
                                onChange={(e) => setSelectedInst(e.target.value)}
                                className="bg-brand-surface border border-brand-border rounded-xl px-3 py-1.5 text-xs font-black uppercase text-brand-text focus:outline-none focus:border-info"
                            >
                                <option value="" disabled>Seleccione Clínica...</option>
                                {institutions.map(inst => (
                                    <option key={inst.id} value={inst.id}>{inst.nombre_comercial} (VPN ID: {inst.legacy_id})</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="card-premium h-[600px] flex flex-col bg-brand-surface/30 p-0 overflow-hidden">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-brand-border bg-brand-surface/80">
                                    <th className="px-6 py-4 text-[10px] font-black text-brand-text/40 uppercase tracking-widest">Cod. Externo (VPN)</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-brand-text/40 uppercase tracking-widest">Traducción Oficial (AMIS)</th>
                                    <th className="px-6 py-4 text-right text-[10px] font-black text-brand-text/40 uppercase tracking-widest">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-brand-border">
                                {filteredMappings.map(m => (
                                    <tr key={m.id} className="hover:bg-brand-primary/5 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <Database className="w-4 h-4 text-warning" />
                                                <span className="text-sm font-black text-brand-text">{m.codigo_externo}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-[10px] text-brand-primary font-bold uppercase">{m.master_procedures?.codigo_amis}</span>
                                                <span className="text-xs text-brand-text/80">{m.master_procedures?.titulo_oficial}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button className="p-2 text-danger/50 hover:text-danger hover:bg-danger/10 rounded-lg transition-all">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {filteredMappings.length === 0 && !loading && (
                                    <tr>
                                        <td colSpan={3} className="px-6 py-20 text-center">
                                            <div className="inline-flex flex-col items-center">
                                                <div className="p-4 bg-brand-border/50 rounded-full mb-4">
                                                    <Link2 className="w-8 h-8 text-brand-text/20" />
                                                </div>
                                                <p className="text-xs font-bold text-brand-text/40 uppercase tracking-widest mb-1">Sin Mapeos Activos</p>
                                                <p className="text-[10px] text-brand-text/30">Esta institución no tiene traducciones registradas en la Torre de Babel.</p>
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
