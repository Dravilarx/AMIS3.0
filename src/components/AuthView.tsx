import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Stethoscope, Mail, Lock, Loader2 } from 'lucide-react';

export const AuthView: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

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

    return (
        <div className="min-h-screen bg-prevenort-bg flex items-center justify-center p-6 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-blue-50 via-slate-50 to-slate-100">
            <div className="w-full max-w-md space-y-8 animate-in fade-in zoom-in-95 duration-1000">
                <div className="text-center space-y-6">
                    <div className="inline-flex p-5 rounded-[2rem] bg-white border border-slate-100 shadow-xl shadow-blue-500/10 mb-2 rotate-3 hover:rotate-0 transition-transform duration-500">
                        <div className="p-4 bg-gradient-to-br from-prevenort-primary to-blue-700 rounded-2xl shadow-inner">
                            <Stethoscope className="w-10 h-10 text-white" />
                        </div>
                    </div>
                    <div>
                        <h1 className="text-5xl font-black text-prevenort-primary tracking-tighter uppercase mb-1">
                            PREVENORT
                        </h1>
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.4em]">Health Intelligence</p>
                    </div>
                </div>

                <div className="bg-white/80 border border-white backdrop-blur-2xl rounded-[3rem] p-10 shadow-2xl shadow-blue-900/5 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-prevenort-primary/20 to-transparent" />

                    <form onSubmit={handleLogin} className="space-y-7 relative z-10">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Credenciales de Red</label>
                            <div className="relative group">
                                <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-prevenort-primary transition-colors" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="usuario@prevenort.cl"
                                    className="w-full bg-slate-50/50 border border-slate-100 rounded-2xl pl-12 pr-5 py-4.5 text-sm text-slate-900 focus:bg-white focus:border-prevenort-primary/30 focus:ring-4 focus:ring-prevenort-primary/5 outline-none transition-all placeholder:text-slate-300 font-medium"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Clave de Acceso</label>
                            <div className="relative group">
                                <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-prevenort-primary transition-colors" />
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full bg-slate-50/50 border border-slate-100 rounded-2xl pl-12 pr-5 py-4.5 text-sm text-slate-900 focus:bg-white focus:border-prevenort-primary/30 focus:ring-4 focus:ring-prevenort-primary/5 outline-none transition-all placeholder:text-slate-300 font-medium"
                                    required
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="p-4 bg-red-50 border border-red-100 rounded-2xl animate-in shake duration-500">
                                <p className="text-[10px] font-bold text-red-600 uppercase tracking-wider text-center">{error}</p>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-prevenort-primary hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-2xl py-5 text-[11px] font-black uppercase tracking-[0.2em] transition-all shadow-xl shadow-blue-500/25 flex items-center justify-center gap-3 active:scale-[0.98]"
                        >
                            {loading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                'Ingresar al Portal'
                            )}
                        </button>
                    </form>
                </div>

                <div className="text-center">
                    <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.3em] flex items-center justify-center gap-2">
                        <span className="w-8 h-px bg-slate-200" />
                        SISTEMA DE GESTIÓN CLÍNICA INTEGRADA
                        <span className="w-8 h-px bg-slate-200" />
                    </p>
                </div>
            </div>
        </div>
    );
};

