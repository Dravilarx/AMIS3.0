import React, { useState, useEffect } from 'react';
import { X, Search, CheckSquare, Square, PenTool, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { cn } from '../../lib/utils';

interface RequestSignatureModalProps {
    documentId: string;
    onClose: () => void;
    onSuccess: () => void;
}

export const RequestSignatureModal: React.FC<RequestSignatureModalProps> = ({ documentId, onClose, onSuccess }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [profiles, setProfiles] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        const fetchProfiles = async () => {
            if (searchTerm.length < 2) {
                setProfiles([]);
                return;
            }
            setLoading(true);
            try {
                const queryText = `%${searchTerm.toLowerCase()}%`;

                // Promesa 1: System Profiles
                const profilesPromise = supabase
                    .from('profiles')
                    .select('id, full_name, role, rut')
                    .or(`full_name.ilike.${queryText},rut.ilike.${queryText}`)
                    .limit(10);

                // Promesa 2: Clinical Professionals
                const professionalsPromise = supabase
                    .from('professionals')
                    .select('id, name, last_name, role, national_id')
                    .or(`name.ilike.${queryText},last_name.ilike.${queryText},national_id.ilike.${queryText}`)
                    .limit(10);

                const [profilesRes, profsRes] = await Promise.all([profilesPromise, professionalsPromise]);

                if (profilesRes.error) {
                    console.warn("Profiles search error:", profilesRes.error);
                }
                if (profsRes.error) {
                    console.warn("Professionals search error:", profsRes.error);
                }

                const combinedProfiles: any[] = [];

                if (profilesRes.data) {
                    combinedProfiles.push(...profilesRes.data.map(p => ({
                        id: p.id,
                        full_name: p.full_name,
                        rut: p.rut,
                        role: p.role || 'Admin/App',
                        source: 'perfil'
                    })));
                }

                if (profsRes.data) {
                    combinedProfiles.push(...profsRes.data.map(p => ({
                        id: p.id,
                        full_name: `${p.name} ${p.last_name}`,
                        rut: p.national_id,
                        role: p.role,
                        source: 'clínico'
                    })));
                }

                // Remove duplicates by ID in case a user is both a profile and clinical professional
                const uniqueProfiles = Array.from(new Map(combinedProfiles.map(item => [item.id, item])).values());

                setProfiles(uniqueProfiles.slice(0, 15));
            } catch (err: any) {
                console.error(err);
                alert('Error al buscar usuarios: ' + (err.message || String(err)));
            } finally {
                setLoading(false);
            }
        };

        const timer = setTimeout(fetchProfiles, 300);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    const toggleSelect = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    };

    const handleSubmit = async () => {
        if (selectedIds.size === 0) return;
        setSubmitting(true);
        try {
            // First get the current document to append requested_signers
            const { data: docInfo, error: docError } = await supabase
                .from('documents')
                .select('requested_signers')
                .eq('id', documentId)
                .single();

            if (docError) throw docError;

            const currentSigners = docInfo.requested_signers || [];
            const newSigners = Array.from(new Set([...currentSigners, ...Array.from(selectedIds)]));

            const { error: updateError } = await supabase
                .from('documents')
                .update({
                    requested_signers: newSigners,
                    status: 'pending' // Enviar a 'pending' porque faltan firmas
                })
                .eq('id', documentId);

            if (updateError) throw updateError;
            onSuccess();
        } catch (err: any) {
            console.error('Submit Error:', err);
            alert('Error solicitando firma: ' + (err.message || String(err)));
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in"
            onClick={(e) => e.stopPropagation()}
        >
            <div
                className="bg-[#0A0A0A] border border-white/10 w-full max-w-lg rounded-2xl overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.5)] flex flex-col relative z-[201]"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <header className="p-6 border-b border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-500/10 rounded-xl">
                            <PenTool className="w-5 h-5 text-emerald-400" />
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-white uppercase tracking-tighter">Solicitar Firmas</h3>
                            <p className="text-[10px] text-white/40 font-mono uppercase">Seleccionar usuarios de la clínica</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors text-white/20 hover:text-white">
                        <X className="w-5 h-5" />
                    </button>
                </header>

                {/* Body */}
                <div className="p-6 flex-1 flex flex-col min-h-[400px]">
                    <div className="relative mb-6">
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Buscar por Nombre o RUT (ej: Juan Pérez, 12.345.678-x)..."
                            className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500/50 transition-colors"
                            autoFocus
                        />
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                    </div>

                    <div className="flex-1 overflow-y-auto pr-2 space-y-2">
                        {loading && (
                            <div className="flex justify-center p-8">
                                <Loader2 className="w-6 h-6 animate-spin text-info" />
                            </div>
                        )}
                        {!loading && profiles.length === 0 && searchTerm.length > 1 && (
                            <p className="text-center text-prevenort-text/40 text-xs py-8">
                                No se encontraron usuarios con ese criterio.
                            </p>
                        )}
                        {!loading && profiles.map(profile => (
                            <div
                                key={profile.id}
                                onClick={() => toggleSelect(profile.id)}
                                className={cn(
                                    "flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all",
                                    selectedIds.has(profile.id)
                                        ? "bg-emerald-500/10 border-emerald-500/30 ring-1 ring-emerald-500/50"
                                        : "bg-white/5 border-white/10 hover:bg-white/10"
                                )}
                            >
                                <button type="button" className="text-emerald-400">
                                    {selectedIds.has(profile.id) ? (
                                        <CheckSquare className="w-5 h-5" />
                                    ) : (
                                        <Square className="w-5 h-5 text-white/20" />
                                    )}
                                </button>
                                <div>
                                    <p className="text-sm font-bold text-white flex items-center gap-2">
                                        {profile.full_name}
                                        {profile.source === 'clínico' && (
                                            <span className="text-[8px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded uppercase font-black">Staff Médico</span>
                                        )}
                                    </p>
                                    <p className="text-[10px] text-white/40 uppercase tracking-widest mt-0.5">
                                        {profile.rut || 'Sin Identificación'} • {profile.role || 'Colaborador'}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="p-6 border-t border-prevenort-border bg-prevenort-surface/50 flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3 bg-white/5 border border-white/10 text-white rounded-xl text-xs font-bold uppercase hover:bg-white/10 transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={selectedIds.size === 0 || submitting}
                        className={cn(
                            "flex-[2] py-3 rounded-xl text-xs font-bold uppercase transition-all flex items-center justify-center gap-2",
                            selectedIds.size > 0 && !submitting
                                ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/20"
                                : "bg-prevenort-surface text-white/20 cursor-not-allowed"
                        )}
                    >
                        {submitting ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>Solicitando...</span>
                            </>
                        ) : (
                            <>
                                <PenTool className="w-4 h-4" />
                                <span>Solicitar {selectedIds.size > 0 ? `a ${selectedIds.size} usuario(s)` : ''}</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};
