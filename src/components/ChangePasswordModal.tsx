import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Lock, Loader2, KeyRound } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

interface ChangePasswordModalProps {
    isOpen: boolean;
    onClose: () => void;
    forceMode?: boolean; // If true, the user cannot close the modal (used during PASSWORD_RECOVERY)
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({ isOpen, onClose, forceMode = false }) => {
    const { setRecoveringPassword } = useAuth();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (password.length < 6) {
            setError('La clave debe tener al menos 6 caracteres.');
            return;
        }

        if (password !== confirmPassword) {
            setError('Las claves no coinciden.');
            return;
        }

        setLoading(true);
        try {
            const { error } = await supabase.auth.updateUser({ password });
            if (error) throw error;
            
            setSuccess(true);
            setRecoveringPassword(false);
            
            // Auto close after 2 seconds on success
            setTimeout(() => {
                onClose();
            }, 2000);
        } catch (err: any) {
            setError(err.message || 'Error al actualizar la clave');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-brand-surface border border-brand-border rounded-3xl w-full max-w-sm shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-300">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-brand-primary via-orange-400 to-brand-primary opacity-50" />
                
                <div className="p-6">
                    <div className="flex items-center gap-3 mb-6 flex-col text-center">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-primary/20 to-black/50 border border-brand-primary/30 flex items-center justify-center">
                            <KeyRound className="w-6 h-6 text-brand-primary" />
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-brand-text tracking-tight">
                                {forceMode ? 'RECUPERACIÓN DE CLAVE' : 'CAMBIAR CLAVE'}
                            </h2>
                            <p className="text-[10px] font-bold text-brand-text/40 uppercase tracking-widest mt-1">
                                {forceMode ? 'Ingresa tu nueva clave de acceso' : 'Actualiza tus credenciales'}
                            </p>
                        </div>
                    </div>

                    {success ? (
                        <div className="text-center py-6 space-y-4">
                            <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-success/20">
                                <Lock className="w-8 h-8 text-success" />
                            </div>
                            <p className="text-sm font-bold text-success uppercase tracking-wider">¡Clave actualizada con éxito!</p>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-brand-text/60 uppercase tracking-widest ml-1">Nueva Clave</label>
                                <div className="relative group">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-text/40 group-focus-within:text-brand-primary transition-colors" />
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="Min. 6 caracteres"
                                        className="w-full bg-brand-bg border border-brand-border rounded-xl pl-11 pr-4 py-3.5 text-sm text-brand-text focus:bg-brand-surface focus:border-brand-primary/50 focus:ring-2 focus:ring-brand-primary/20 outline-none transition-all placeholder:text-brand-text/20 font-medium"
                                        required
                                    />
                                </div>
                            </div>
                            
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-brand-text/60 uppercase tracking-widest ml-1">Confirmar Nueva Clave</label>
                                <div className="relative group">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-text/40 group-focus-within:text-brand-primary transition-colors" />
                                    <input
                                        type="password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        placeholder="Repetir clave..."
                                        className="w-full bg-brand-bg border border-brand-border rounded-xl pl-11 pr-4 py-3.5 text-sm text-brand-text focus:bg-brand-surface focus:border-brand-primary/50 focus:ring-2 focus:ring-brand-primary/20 outline-none transition-all placeholder:text-brand-text/20 font-medium"
                                        required
                                    />
                                </div>
                            </div>

                            {error && (
                                <div className="p-3 bg-danger/10 border border-danger/20 rounded-xl animate-in shake duration-500">
                                    <p className="text-[10px] font-bold text-danger uppercase tracking-wider text-center">{error}</p>
                                </div>
                            )}

                            <div className="flex gap-3 pt-2">
                                {!forceMode && (
                                    <button
                                        type="button"
                                        onClick={onClose}
                                        disabled={loading}
                                        className="flex-1 px-4 py-3.5 rounded-xl border border-brand-border text-brand-text hover:bg-brand-bg hover:border-brand-text/20 transition-all text-[11px] font-black uppercase tracking-wider"
                                    >
                                        Cancelar
                                    </button>
                                )}
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="flex-[2] px-4 py-3.5 rounded-xl bg-brand-primary hover:bg-orange-600 text-white shadow-lg shadow-orange-500/20 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-[11px] font-black uppercase tracking-[0.1em]"
                                >
                                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Actualizar Clave'}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};
