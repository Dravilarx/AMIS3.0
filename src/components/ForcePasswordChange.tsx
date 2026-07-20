import React, { useState } from 'react';
import { Lock, Eye, EyeOff, ShieldCheck, Loader2, LogOut, AlertTriangle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { Logo } from './Logo';

// Candado de primer ingreso: se muestra a pantalla completa cuando el usuario
// tiene must_change_password=true. Bloquea toda la app hasta que cambie la clave.
// No hay forma de cerrarla salvo cambiar la contraseña o cerrar sesión.
export const ForcePasswordChange: React.FC = () => {
    const { user, signOut, refreshProfile } = useAuth();

    const [nueva, setNueva] = useState('');
    const [repetir, setRepetir] = useState('');
    const [showPass, setShowPass] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Traduce el error crudo de updateUser a un mensaje accionable en español.
    // Supabase rechaza claves débiles/filtradas (leaked password protection) con
    // textos en inglés que confunden ("weak", "pwned", "compromised"...).
    const mensajeErrorClave = (err: any): string => {
        const raw = (err?.message || '').toLowerCase();
        const esDebil =
            raw.includes('weak') ||
            raw.includes('pwned') ||
            raw.includes('compromised') ||
            raw.includes('leaked') ||
            (raw.includes('password') && (raw.includes('easy') || raw.includes('common') || raw.includes('short')));
        if (esDebil) {
            return 'Esa contraseña es demasiado débil o común y el sistema la rechazó. Prueba con una más difícil de adivinar: combina mayúsculas, minúsculas y números, y evita palabras o secuencias obvias.';
        }
        return 'No se pudo actualizar la contraseña. Inténtalo de nuevo; si el problema sigue, avisa a soporte.';
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (nueva.length < 8) { setError('La contraseña debe tener al menos 8 caracteres.'); return; }
        if (nueva !== repetir) { setError('Las contraseñas no coinciden.'); return; }

        setSaving(true);
        setError(null);
        try {
            // (a) cambiar la clave. Aquí es donde Supabase rechaza claves débiles.
            const { error: updErr } = await supabase.auth.updateUser({ password: nueva });
            if (updErr) {
                console.error('Error en cambio forzado de contraseña (updateUser):', updErr);
                setError(mensajeErrorClave(updErr));
                setSaving(false); // libera el botón para reintentar con otra clave
                return;           // el candado se mantiene (no se llamó al rpc)
            }

            // (b) apagar la marca (RPC SECURITY DEFINER sobre el usuario actual)
            const { error: rpcErr } = await supabase.rpc('marcar_clave_cambiada');
            if (rpcErr) throw rpcErr;

            // (c) refrescar el perfil → must_change_password pasa a false y se
            //     levanta el candado. Si esto falla, la marca ya está apagada en
            //     la BD; al recargar entrará normal.
            await refreshProfile();
        } catch (err: any) {
            console.error('Error en cambio forzado de contraseña:', err);
            setError('No se pudo actualizar la contraseña. Inténtalo de nuevo; si el problema sigue, avisa a soporte.');
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-brand-bg">
            <div className="w-full max-w-sm">
                <div className="flex flex-col items-center gap-2 mb-8">
                    <Logo type="mark" height={40} />
                    <p className="text-[10px] uppercase tracking-[0.3em] text-brand-text/30 font-bold">Acceso seguro</p>
                </div>

                <form onSubmit={handleSubmit} className="bg-brand-surface border border-brand-border rounded-3xl shadow-2xl p-6 space-y-5">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-brand-primary/10 flex items-center justify-center shrink-0">
                            <ShieldCheck className="w-4.5 h-4.5 text-brand-primary" />
                        </div>
                        <div className="min-w-0">
                            <h1 className="text-sm font-black text-brand-text uppercase tracking-tight">Cambia tu contraseña</h1>
                            <p className="text-[11px] text-brand-text/40 truncate">
                                {user?.name ? `Hola ${user.name}. ` : ''}Debes definir una clave nueva para continuar.
                            </p>
                        </div>
                    </div>

                    <p className="text-[11px] leading-relaxed text-brand-text/50 bg-brand-bg/60 border border-brand-border rounded-xl px-3 py-2.5">
                        Elige una contraseña nueva que recuerdes: mínimo 8 caracteres, mezcla letras y números. Evita claves obvias o fáciles de adivinar (como 12345678 o tu nombre), porque el sistema las rechaza por seguridad.
                    </p>

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-brand-text/40 uppercase tracking-widest ml-1">Nueva contraseña</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-text/20" />
                            <input
                                type={showPass ? 'text' : 'password'}
                                value={nueva}
                                onChange={(e) => setNueva(e.target.value)}
                                autoFocus
                                placeholder="Mínimo 8 caracteres"
                                className="w-full bg-brand-bg border border-brand-border rounded-xl pl-10 pr-11 py-3 text-sm text-brand-text outline-none focus:border-brand-primary/40"
                            />
                            <button type="button" onClick={() => setShowPass(v => !v)}
                                title={showPass ? 'Ocultar' : 'Mostrar'}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-text/30 hover:text-brand-text transition-colors">
                                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-brand-text/40 uppercase tracking-widest ml-1">Repetir contraseña</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-text/20" />
                            <input
                                type={showPass ? 'text' : 'password'}
                                value={repetir}
                                onChange={(e) => setRepetir(e.target.value)}
                                placeholder="Escríbela de nuevo"
                                className="w-full bg-brand-bg border border-brand-border rounded-xl pl-10 pr-4 py-3 text-sm text-brand-text outline-none focus:border-brand-primary/40"
                            />
                        </div>
                    </div>

                    {error && (
                        <p className="flex items-start gap-1.5 text-[11px] font-bold text-danger">
                            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-px" /> {error}
                        </p>
                    )}

                    <button
                        type="submit"
                        disabled={saving}
                        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-black uppercase tracking-widest bg-brand-primary text-white shadow-lg shadow-brand-primary/20 disabled:opacity-50 transition-all"
                    >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                        {saving ? 'Guardando...' : 'Cambiar y entrar'}
                    </button>

                    <button
                        type="button"
                        onClick={async () => { await signOut(); window.location.href = '/'; }}
                        className="w-full flex items-center justify-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-brand-text/40 hover:text-brand-text transition-colors"
                    >
                        <LogOut className="w-3.5 h-3.5" /> Cerrar sesión
                    </button>
                </form>
            </div>
        </div>
    );
};
