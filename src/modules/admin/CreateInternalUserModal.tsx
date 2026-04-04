import React, { useState } from 'react';
import { X, UserPlus, Mail, Lock, User, ShieldCheck } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { UserRole } from '../../hooks/useAuth';

interface CreateInternalUserModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCreated: (email: string, password: string, fullName: string, role: UserRole) => Promise<{ success: boolean; error?: string }>;
}

const ROLE_LABELS: Record<UserRole, string> = {
    'SUPER_ADMIN': 'DIRECCIÓN MÉDICA',
    'ADMIN': 'ADMINISTRADOR',
    'MANAGER': 'GERENTE DE RED',
    'OPERATOR': 'GESTOR CLÍNICO',
    'VIEWER': 'AUDITOR EXTERNO',
    'ADMIN_SECRETARY': 'SECRETARÍA ADN',
    'PARTNER': 'LABORATORIO/SOCIO',
    'MED_CHIEF': 'JEFE DE SERVICIO'
};

export const CreateInternalUserModal: React.FC<CreateInternalUserModalProps> = ({ isOpen, onClose, onCreated }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('AMIS007');
    const [fullName, setFullName] = useState('');
    const [role, setRole] = useState<UserRole>('VIEWER');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const result = await onCreated(email, password, fullName, role);
        if (result.success) {
            onClose();
            setEmail('');
            setPassword('AMIS007');
            setFullName('');
            setRole('VIEWER');
        } else {
            setError(result.error || 'Error al crear usuario');
        }
        setLoading(false);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
            <div className="w-full max-w-lg bg-brand-surface border border-brand-border rounded-[2.5rem] shadow-2xl shadow-orange-500/10 animate-in zoom-in-95 duration-500 overflow-hidden">
                {/* Header */}
                <div className="p-8 border-b border-brand-border bg-gradient-to-r from-brand-primary/10 to-transparent flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-brand-primary/20 rounded-2xl border border-brand-primary/30">
                            <UserPlus className="w-6 h-6 text-brand-primary" />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-brand-text uppercase tracking-tight">Alta de Analista</h3>
                            <p className="text-[10px] text-brand-text/40 font-bold uppercase tracking-[0.25em]">Incorporar colaborador a la red AMIS</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-xl text-brand-text/30 hover:text-brand-text hover:bg-brand-bg transition-all">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                    {error && (
                        <div className="p-4 bg-danger/10 border border-danger/20 rounded-2xl text-danger text-xs font-bold animate-in slide-in-from-top-2">
                            {error}
                        </div>
                    )}

                    <div className="space-y-4">
                        {/* Nombre */}
                        <div>
                            <label className="text-[10px] font-black text-brand-text/40 uppercase tracking-widest mb-2 block px-1">Nombre Completo</label>
                            <div className="relative">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-text/20" />
                                <input
                                    required
                                    type="text"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    placeholder="Ej: Marcelo Avila"
                                    className="w-full bg-brand-bg border border-brand-border rounded-2xl pl-12 pr-4 py-4 text-sm font-bold text-brand-text focus:outline-none focus:border-brand-primary/40 focus:ring-4 focus:ring-brand-primary/5 transition-all"
                                />
                            </div>
                        </div>

                        {/* Email */}
                        <div>
                            <label className="text-[10px] font-black text-brand-text/40 uppercase tracking-widest mb-2 block px-1">Email Institucional</label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-text/20" />
                                <input
                                    required
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="ej: patricio.abella@gmail.com"
                                    className="w-full bg-brand-bg border border-brand-border rounded-2xl pl-12 pr-4 py-4 text-sm font-bold text-brand-text focus:outline-none focus:border-brand-primary/40 focus:ring-4 focus:ring-brand-primary/5 transition-all"
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div>
                            <label className="text-[10px] font-black text-brand-text/40 uppercase tracking-widest mb-2 block px-1">Contraseña Inicial</label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-text/20" />
                                <input
                                    required
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full bg-brand-bg border border-brand-border rounded-2xl pl-12 pr-4 py-4 text-sm font-bold text-brand-text focus:outline-none focus:border-brand-primary/40 focus:ring-4 focus:ring-brand-primary/5 transition-all"
                                />
                            </div>
                        </div>

                        {/* Rol */}
                        <div>
                            <label className="text-[10px] font-black text-brand-text/40 uppercase tracking-widest mb-3 block px-1">Nivel de Acceso en Red</label>
                            <div className="grid grid-cols-2 gap-3">
                                {(['ADMIN', 'MANAGER', 'OPERATOR', 'VIEWER'] as UserRole[]).map(r => (
                                    <button
                                        key={r}
                                        type="button"
                                        onClick={() => setRole(r)}
                                        className={cn(
                                            "flex items-center gap-3 px-4 py-3.5 rounded-2xl border text-[10px] font-black uppercase tracking-widest transition-all",
                                            role === r
                                                ? "bg-brand-primary border-brand-primary text-white shadow-lg shadow-brand-primary/20 scale-[1.02]"
                                                : "bg-brand-bg border-brand-border text-brand-text/40 hover:border-brand-text/20"
                                        )}
                                    >
                                        <ShieldCheck className={cn("w-4 h-4", role === r ? "text-white" : "text-brand-text/20")} />
                                        {ROLE_LABELS[r]}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="pt-6 border-t border-brand-border flex flex-col gap-4">
                        <button
                            disabled={loading}
                            type="submit"
                            className="w-full py-4 bg-brand-primary text-white hover:opacity-90 rounded-2xl transition-all font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-brand-primary/25 flex items-center justify-center gap-3"
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    <UserPlus className="w-5 h-5" />
                                    Confirmar Registro en Red
                                </>
                            )}
                        </button>
                        <p className="text-[9px] text-center text-brand-text/20 font-bold uppercase tracking-widest leading-relaxed">
                            Al confirmar, el usuario recibirá un correo de verificación.<br/>Su perfil quedará activo inmediatamente.
                        </p>
                    </div>
                </form>
            </div>
        </div>
    );
};
