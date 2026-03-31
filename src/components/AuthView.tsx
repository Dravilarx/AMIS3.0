import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Stethoscope, Mail, Lock, Loader2 } from 'lucide-react';

export const AuthView: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isRecoveryMode, setIsRecoveryMode] = useState(false);
    const [recoveryMsg, setRecoveryMsg] = useState<string | null>(null);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) throw error;
        } catch (err: any) {
            setError(err.message || 'Error al iniciar sesión');
        } finally {
            setLoading(false);
        }
    };

    const handleRecovery = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setRecoveryMsg(null);

        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: window.location.origin,
            });

            if (error) throw error;
            setRecoveryMsg('Si el correo existe en nuestra base de datos, recibirás un enlace para recuperar tu clave.');
        } catch (err: any) {
            setError(err.message || 'Error al solicitar la recuperación');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-prevenort-bg flex items-center justify-center p-6 relative overflow-hidden">
            {/* Ambient Background Effects */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-prevenort-primary/5 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute -top-32 -right-32 w-[500px] h-[500px] bg-orange-500/5 rounded-full blur-[100px] pointer-events-none" />

            <div className="w-full max-w-sm space-y-8 animate-in fade-in zoom-in-95 duration-1000 relative z-10">
                <div className="text-center space-y-4">
                    <div className="inline-flex p-1 rounded-3xl bg-gradient-to-br from-prevenort-primary/30 to-black mb-2 shadow-2xl shadow-orange-500/20">
                        <div className="p-4 bg-prevenort-surface rounded-2xl border border-prevenort-border">
                            <Stethoscope className="w-8 h-8 text-prevenort-primary" />
                        </div>
                    </div>
                    <div>
                        <h1 className="text-5xl font-black text-prevenort-primary tracking-tighter uppercase mb-1">
                            AMIS <span className="text-prevenort-text">3.0</span>
                        </h1>
                        <p className="text-[9px] font-bold text-prevenort-text/40 uppercase tracking-[0.4em]">Intelligence & Management</p>
                    </div>
                </div>

                <div className="bg-prevenort-surface/80 border border-prevenort-border backdrop-blur-2xl rounded-3xl p-8 shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-prevenort-primary/50 to-transparent" />

                    <form onSubmit={isRecoveryMode ? handleRecovery : handleLogin} className="space-y-6 relative z-10">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-prevenort-text/60 uppercase tracking-widest ml-1">Email Corporativo</label>
                            <div className="relative group">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-prevenort-text/40 group-focus-within:text-prevenort-primary transition-colors" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="usuario@amis.global"
                                    className="w-full bg-prevenort-bg border border-prevenort-border rounded-xl pl-11 pr-4 py-3.5 text-sm text-prevenort-text focus:bg-prevenort-surface focus:border-prevenort-primary/50 focus:ring-2 focus:ring-prevenort-primary/20 outline-none transition-all placeholder:text-prevenort-text/20 font-medium"
                                    required
                                />
                            </div>
                        </div>

                        {!isRecoveryMode && (
                            <div className="space-y-2">
                                <div className="flex justify-between items-center ml-1">
                                    <label className="text-[10px] font-black text-prevenort-text/60 uppercase tracking-widest">Clave de Acceso</label>
                                    <button 
                                        type="button"
                                        onClick={() => setIsRecoveryMode(true)}
                                        className="text-[10px] font-bold text-prevenort-primary hover:text-orange-500 transition-colors uppercase tracking-wider"
                                    >
                                        ¿Olvidó su clave?
                                    </button>
                                </div>
                                <div className="relative group">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-prevenort-text/40 group-focus-within:text-prevenort-primary transition-colors" />
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="••••••••"
                                        className="w-full bg-prevenort-bg border border-prevenort-border rounded-xl pl-11 pr-4 py-3.5 text-sm text-prevenort-text focus:bg-prevenort-surface focus:border-prevenort-primary/50 focus:ring-2 focus:ring-prevenort-primary/20 outline-none transition-all placeholder:text-prevenort-text/20 font-medium"
                                        required
                                    />
                                </div>
                            </div>
                        )}

                        {error && (
                            <div className="p-3 bg-danger/10 border border-danger/20 rounded-xl animate-in shake duration-500">
                                <p className="text-[10px] font-bold text-danger uppercase tracking-wider text-center">{error}</p>
                            </div>
                        )}

                        {recoveryMsg && (
                            <div className="p-3 bg-success/10 border border-success/20 rounded-xl animate-in fade-in duration-500">
                                <p className="text-[10px] font-bold text-success uppercase tracking-wider text-center">{recoveryMsg}</p>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-prevenort-primary hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl py-4 text-[11px] font-black uppercase tracking-[0.2em] transition-all shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2 active:scale-[0.98]"
                        >
                            {loading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : isRecoveryMode ? (
                                'Enviar Enlace'
                            ) : (
                                'Iniciar Sesión'
                            )}
                        </button>
                        
                        {isRecoveryMode && (
                            <button
                                type="button"
                                onClick={() => {
                                    setIsRecoveryMode(false);
                                    setRecoveryMsg(null);
                                    setError(null);
                                }}
                                className="w-full bg-transparent border border-prevenort-border hover:bg-prevenort-surface text-prevenort-text rounded-xl py-4 text-[11px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2"
                            >
                                Volver al Ingreso
                            </button>
                        )}
                    </form>
                </div>

                <div className="text-center pt-4">
                    <p className="text-[8px] font-black text-prevenort-text/20 uppercase tracking-[0.4em] flex items-center justify-center gap-3">
                        <span className="w-6 h-px bg-prevenort-border" />
                        SISTEMA DE GESTIÓN CLÍNICA INTEGRADA
                        <span className="w-6 h-px bg-prevenort-border" />
                    </p>
                </div>
            </div>
        </div>
    );
};

