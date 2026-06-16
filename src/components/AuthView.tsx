import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Stethoscope, Mail, Lock, Loader2, CheckCircle2 } from 'lucide-react';

export const AuthView: React.FC = () => {
    const [email, setEmail]                 = useState('');
    const [password, setPassword]           = useState('');
    const [newPassword, setNewPassword]     = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading]             = useState(false);
    const [error, setError]                 = useState<string | null>(null);
    const [isRecoveryMode, setIsRecoveryMode] = useState(false);
    const [recoveryMsg, setRecoveryMsg]     = useState<string | null>(null);

    // Estado nuevo: el usuario llegó desde el enlace del correo y debe definir su clave
    const [isSettingNewPassword, setIsSettingNewPassword] = useState(false);
    const [passwordUpdated, setPasswordUpdated] = useState(false);

    // Detectar si el usuario llegó desde un enlace de recuperación
    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
            if (event === 'PASSWORD_RECOVERY') {
                setIsSettingNewPassword(true);
            }
        });

        // También detectar el hash en la URL (algunos flujos lo traen así)
        const hash = window.location.hash;
        if (hash.includes('type=recovery')) {
            setIsSettingNewPassword(true);
        }

        return () => subscription.unsubscribe();
    }, []);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            const { error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) throw error;
        } catch (err: any) {
            setError(traducirError(err.message));
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
                redirectTo: `${window.location.origin}`,
            });
            if (error) throw error;
            setRecoveryMsg('Si el correo está registrado, recibirás un enlace de recuperación en los próximos minutos. Revisa también tu carpeta de spam.');
        } catch (err: any) {
            setError(traducirError(err.message));
        } finally {
            setLoading(false);
        }
    };

    const handleSetNewPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword.length < 6) {
            setError('La contraseña debe tener al menos 6 caracteres.');
            return;
        }
        if (newPassword !== confirmPassword) {
            setError('Las contraseñas no coinciden.');
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const { error } = await supabase.auth.updateUser({ password: newPassword });
            if (error) throw error;
            setPasswordUpdated(true);
            // Limpiar el hash de la URL
            window.history.replaceState(null, '', window.location.pathname);
            setTimeout(() => {
                setIsSettingNewPassword(false);
                setPasswordUpdated(false);
                setNewPassword('');
                setConfirmPassword('');
            }, 2500);
        } catch (err: any) {
            setError(traducirError(err.message));
        } finally {
            setLoading(false);
        }
    };

    const traducirError = (msg: string): string => {
        if (msg.includes('Invalid login credentials')) return 'Correo o clave incorrectos.';
        if (msg.includes('Email not confirmed'))        return 'Tu correo aún no ha sido confirmado.';
        if (msg.includes('User not found'))             return 'No existe una cuenta con ese correo.';
        if (msg.includes('same as the old'))            return 'La nueva clave debe ser distinta a la anterior.';
        return msg || 'Ocurrió un error. Intenta nuevamente.';
    };

    return (
        <div className="min-h-screen bg-brand-bg flex items-center justify-center p-6 relative overflow-hidden">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-brand-primary/5 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute -top-32 -right-32 w-[500px] h-[500px] bg-teal-500/5 rounded-full blur-[100px] pointer-events-none" />

            <div className="w-full max-w-sm space-y-8 animate-in fade-in zoom-in-95 duration-1000 relative z-10">
                <div className="text-center space-y-4">
                    <div className="inline-flex p-1 rounded-3xl bg-gradient-to-br from-brand-primary/30 to-black mb-2 shadow-2xl shadow-teal-500/20">
                        <div className="p-4 bg-brand-surface rounded-2xl border border-brand-border">
                            <Stethoscope className="w-8 h-8 text-brand-primary" />
                        </div>
                    </div>
                    <div>
                        <h1 className="text-5xl font-black text-brand-primary tracking-tighter uppercase mb-1">
                            AMIS <span className="text-brand-text">3.0</span>
                        </h1>
                        <p className="text-[9px] font-bold text-brand-text/40 uppercase tracking-[0.4em]">Intelligence & Management</p>
                    </div>
                </div>

                <div className="bg-brand-surface/80 border border-brand-border backdrop-blur-2xl rounded-3xl p-8 shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-brand-primary/50 to-transparent" />

                    {/* ── MODO: Definir nueva contraseña ── */}
                    {isSettingNewPassword ? (
                        passwordUpdated ? (
                            <div className="text-center space-y-4 py-4 relative z-10">
                                <div className="w-16 h-16 rounded-full bg-success/10 border border-success/20 flex items-center justify-center mx-auto">
                                    <CheckCircle2 className="w-8 h-8 text-success" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-black text-brand-text">¡Clave actualizada!</h2>
                                    <p className="text-xs text-brand-text/40 mt-1">Ya puedes ingresar con tu nueva clave.</p>
                                </div>
                            </div>
                        ) : (
                            <form onSubmit={handleSetNewPassword} className="space-y-6 relative z-10">
                                <div className="text-center mb-2">
                                    <h2 className="text-sm font-black text-brand-text uppercase tracking-wider">Define tu nueva clave</h2>
                                    <p className="text-[10px] text-brand-text/40 mt-1">Escribe la contraseña que usarás de ahora en adelante</p>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-brand-text/60 uppercase tracking-widest ml-1">Nueva Clave</label>
                                    <div className="relative group">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-text/40 group-focus-within:text-brand-primary transition-colors" />
                                        <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
                                            placeholder="••••••••" required
                                            className="w-full bg-brand-bg border border-brand-border rounded-xl pl-11 pr-4 py-3.5 text-sm text-brand-text focus:bg-brand-surface focus:border-brand-primary/50 focus:ring-2 focus:ring-brand-primary/20 outline-none transition-all placeholder:text-brand-text/20 font-medium" />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-brand-text/60 uppercase tracking-widest ml-1">Confirmar Clave</label>
                                    <div className="relative group">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-text/40 group-focus-within:text-brand-primary transition-colors" />
                                        <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                                            placeholder="••••••••" required
                                            className="w-full bg-brand-bg border border-brand-border rounded-xl pl-11 pr-4 py-3.5 text-sm text-brand-text focus:bg-brand-surface focus:border-brand-primary/50 focus:ring-2 focus:ring-brand-primary/20 outline-none transition-all placeholder:text-brand-text/20 font-medium" />
                                    </div>
                                </div>

                                {error && (
                                    <div className="p-3 bg-danger/10 border border-danger/20 rounded-xl">
                                        <p className="text-[10px] font-bold text-danger uppercase tracking-wider text-center">{error}</p>
                                    </div>
                                )}

                                <button type="submit" disabled={loading}
                                    className="w-full bg-brand-primary hover:bg-teal-600 disabled:opacity-50 text-white rounded-xl py-4 text-[11px] font-black uppercase tracking-[0.2em] transition-all shadow-lg shadow-teal-500/20 flex items-center justify-center gap-2 active:scale-[0.98]">
                                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Guardar Nueva Clave'}
                                </button>
                            </form>
                        )
                    ) : (
                        /* ── MODO: Login / Recuperación ── */
                        <form onSubmit={isRecoveryMode ? handleRecovery : handleLogin} className="space-y-6 relative z-10">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-brand-text/60 uppercase tracking-widest ml-1">Email Corporativo</label>
                                <div className="relative group">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-text/40 group-focus-within:text-brand-primary transition-colors" />
                                    <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                                        placeholder="usuario@amis.global" required
                                        className="w-full bg-brand-bg border border-brand-border rounded-xl pl-11 pr-4 py-3.5 text-sm text-brand-text focus:bg-brand-surface focus:border-brand-primary/50 focus:ring-2 focus:ring-brand-primary/20 outline-none transition-all placeholder:text-brand-text/20 font-medium" />
                                </div>
                            </div>

                            {!isRecoveryMode && (
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center ml-1">
                                        <label className="text-[10px] font-black text-brand-text/60 uppercase tracking-widest">Clave de Acceso</label>
                                        <button type="button" onClick={() => setIsRecoveryMode(true)}
                                            className="text-[10px] font-bold text-brand-primary hover:text-teal-500 transition-colors uppercase tracking-wider">
                                            ¿Olvidó su clave?
                                        </button>
                                    </div>
                                    <div className="relative group">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-text/40 group-focus-within:text-brand-primary transition-colors" />
                                        <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                                            placeholder="••••••••" required
                                            className="w-full bg-brand-bg border border-brand-border rounded-xl pl-11 pr-4 py-3.5 text-sm text-brand-text focus:bg-brand-surface focus:border-brand-primary/50 focus:ring-2 focus:ring-brand-primary/20 outline-none transition-all placeholder:text-brand-text/20 font-medium" />
                                    </div>
                                </div>
                            )}

                            {isRecoveryMode && (
                                <p className="text-[10px] text-brand-text/40 leading-relaxed">
                                    Ingresa tu correo y te enviaremos un enlace para que definas tu propia clave de acceso.
                                </p>
                            )}

                            {error && (
                                <div className="p-3 bg-danger/10 border border-danger/20 rounded-xl">
                                    <p className="text-[10px] font-bold text-danger uppercase tracking-wider text-center">{error}</p>
                                </div>
                            )}

                            {recoveryMsg && (
                                <div className="p-3 bg-success/10 border border-success/20 rounded-xl animate-in fade-in duration-500">
                                    <p className="text-[10px] font-bold text-success uppercase tracking-wider text-center">{recoveryMsg}</p>
                                </div>
                            )}

                            <button type="submit" disabled={loading}
                                className="w-full bg-brand-primary hover:bg-teal-600 disabled:opacity-50 text-white rounded-xl py-4 text-[11px] font-black uppercase tracking-[0.2em] transition-all shadow-lg shadow-teal-500/20 flex items-center justify-center gap-2 active:scale-[0.98]">
                                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : isRecoveryMode ? 'Enviar Enlace' : 'Iniciar Sesión'}
                            </button>

                            {isRecoveryMode && (
                                <button type="button"
                                    onClick={() => { setIsRecoveryMode(false); setRecoveryMsg(null); setError(null); }}
                                    className="w-full bg-transparent border border-brand-border hover:bg-brand-surface text-brand-text rounded-xl py-4 text-[11px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2">
                                    Volver al Ingreso
                                </button>
                            )}
                        </form>
                    )}
                </div>

                <div className="text-center pt-4">
                    <p className="text-[8px] font-black text-brand-text/20 uppercase tracking-[0.4em] flex items-center justify-center gap-3">
                        <span className="w-6 h-px bg-brand-border" />
                        SISTEMA DE GESTIÓN CLÍNICA INTEGRADA
                        <span className="w-6 h-px bg-brand-border" />
                    </p>
                </div>
            </div>
        </div>
    );
};
