import React, { useState } from 'react';
import { X, UserPlus, Mail, Lock, User, Tag, Plus } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { UserRole, UserPermissions } from '../../hooks/useAuth';
import { useCargos } from '../../hooks/useCargos';
import { CargoModal } from './CargosManager';

interface CreateInternalUserModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCreated: (
        email: string,
        password: string,
        fullName: string,
        role: UserRole,
        permissions?: UserPermissions,
        cargo?: { id: string; nombre: string },
    ) => Promise<{ success: boolean; error?: string; reactivated?: boolean }>;
}

// El cargo define la plantilla de permisos; el rol base se deriva del tipo del cargo.
// Ambos son no privilegiados (el acceso real lo dan los permisos, no el rol).
const ROLE_POR_TIPO: Record<'clinico' | 'administrativo', UserRole> = {
    clinico:        'OPERATOR',
    administrativo: 'ADMIN_SECRETARY',
};

export const CreateInternalUserModal: React.FC<CreateInternalUserModalProps> = ({ isOpen, onClose, onCreated }) => {
    const { cargos, loading: loadingCargos, createCargo } = useCargos();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('AMIS007');
    const [fullName, setFullName] = useState('');
    const [cargoId, setCargoId] = useState<string>('');
    const [showCargoModal, setShowCargoModal] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Crear un cargo SIN salir del formulario: al guardarlo queda seleccionado.
    const handleInlineCargo = async (data: any) => {
        const r = await createCargo(data);
        if (r.success && r.cargo) setCargoId(r.cargo.id);
        return r;
    };

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const cargo = cargos.find(c => c.id === cargoId);
        if (!cargo) { setError('Selecciona un cargo.'); return; }

        setLoading(true);
        setError(null);

        const role = ROLE_POR_TIPO[cargo.tipo] ?? 'OPERATOR';
        const result = await onCreated(
            email,
            password,
            fullName,
            role,
            cargo.plantilla_permisos as UserPermissions,   // plantilla del cargo = permisos iniciales
            { id: cargo.id, nombre: cargo.nombre },
        );
        if (result.success) {
            if (result.reactivated) {
                alert('Este correo ya existía y fue REACTIVADO con el cargo y datos indicados. La contraseña anterior se mantiene (usa "Recuperar contraseña" si necesita una nueva).');
            }
            onClose();
            setEmail('');
            setPassword('AMIS007');
            setFullName('');
            setCargoId('');
        } else {
            setError(result.error || 'Error al crear usuario');
        }
        setLoading(false);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
            <div className="w-full max-w-lg bg-brand-surface border border-brand-border rounded-[2.5rem] shadow-2xl shadow-teal-500/10 animate-in zoom-in-95 duration-500 overflow-hidden">
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

                        {/* Cargo */}
                        <div>
                            <div className="flex items-center justify-between mb-3 px-1">
                                <label className="text-[10px] font-black text-brand-text/40 uppercase tracking-widest">Cargo</label>
                                <button
                                    type="button"
                                    onClick={() => setShowCargoModal(true)}
                                    className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-brand-primary hover:brightness-110 transition-all"
                                >
                                    <Plus className="w-3.5 h-3.5" /> Nuevo cargo
                                </button>
                            </div>
                            {loadingCargos ? (
                                <p className="text-[11px] text-brand-text/30 px-1">Cargando cargos...</p>
                            ) : cargos.length === 0 ? (
                                <button
                                    type="button"
                                    onClick={() => setShowCargoModal(true)}
                                    className="w-full flex items-center justify-center gap-2 py-4 border border-dashed border-brand-border text-brand-text/40 text-[11px] font-bold rounded-2xl hover:border-brand-primary/40 hover:text-brand-primary transition-all"
                                >
                                    <Plus className="w-4 h-4" /> Crear el primer cargo
                                </button>
                            ) : (
                                <div className="grid grid-cols-2 gap-3 max-h-52 overflow-y-auto custom-scrollbar pr-1">
                                    {cargos.map(c => (
                                        <button
                                            key={c.id}
                                            type="button"
                                            onClick={() => setCargoId(c.id)}
                                            className={cn(
                                                "flex items-center gap-3 px-4 py-3.5 rounded-2xl border text-[10px] font-black uppercase tracking-widest transition-all text-left",
                                                cargoId === c.id
                                                    ? "bg-brand-primary border-brand-primary text-white shadow-lg shadow-brand-primary/20 scale-[1.02]"
                                                    : "bg-brand-bg border-brand-border text-brand-text/40 hover:border-brand-text/20"
                                            )}
                                        >
                                            <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: c.color || '#8a9d96' }} />
                                            <span className="truncate flex items-center gap-1.5">
                                                {cargoId === c.id ? null : <Tag className="w-3 h-3 text-brand-text/20" />}
                                                {c.nombre}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            )}
                            <p className="text-[9px] text-brand-text/30 font-bold mt-2 px-1 leading-relaxed">
                                El cargo aplica una plantilla de permisos inicial, editable luego por persona.
                            </p>
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

            {/* Crear cargo sin salir del alta: al guardar queda seleccionado */}
            {showCargoModal && (
                <CargoModal
                    cargo={null}
                    onClose={() => setShowCargoModal(false)}
                    onSave={handleInlineCargo}
                />
            )}
        </div>
    );
};
