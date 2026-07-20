import React, { useState, useEffect } from 'react';
import { X, UserPlus, Mail, Lock, User, Tag, Plus, Eye, EyeOff, Copy, CheckCircle2, RefreshCw } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { UserRole, UserPermissions } from '../../hooks/useAuth';
import { useCargos } from '../../hooks/useCargos';
import { CargoModal } from './CargosManager';

const SITIO_AMIS = 'https://amis-3-0.vercel.app';

// Genera una contraseña fuerte y legible para el alta. Aleatoria de verdad
// (crypto.getRandomValues, no Math.random) para pasar el filtro anti-débiles de
// Supabase. Sin caracteres ambiguos (O/0, l/1/I). 14 chars con al menos una
// minúscula, una MAYÚSCULA y un dígito; puede incluir - o _.
const MINUS = 'abcdefghijkmnpqrstuvwxyz'; // sin l, o
const MAYUS = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // sin I, O
const DIGITOS = '23456789';                // sin 0, 1
const SIMBOLOS = '-_';
const rndIndex = (n: number): number => {
    const buf = new Uint32Array(1);
    crypto.getRandomValues(buf);
    return buf[0] % n;
};
const generarPassword = (): string => {
    const todos = MINUS + MAYUS + DIGITOS + SIMBOLOS;
    const chars: string[] = [
        MINUS[rndIndex(MINUS.length)],
        MAYUS[rndIndex(MAYUS.length)],
        DIGITOS[rndIndex(DIGITOS.length)],
    ];
    while (chars.length < 14) chars.push(todos[rndIndex(todos.length)]);
    // Fisher-Yates con crypto para que las posiciones garantizadas no queden fijas.
    for (let i = chars.length - 1; i > 0; i--) {
        const j = rndIndex(i + 1);
        [chars[i], chars[j]] = [chars[j], chars[i]];
    }
    return chars.join('');
};

// Texto de correo listo para copiar/pegar con las credenciales recién creadas.
const textoCorreo = (fullName: string, email: string, password: string) =>
`Asunto: Tu acceso a AMIS 3.0

Hola ${fullName}:

Ya tienes acceso a AMIS 3.0.

Sitio para ingresar: ${SITIO_AMIS}
Usuario: ${email}
Contraseña inicial: ${password}

Por seguridad, deberás cambiar tu contraseña la primera vez que ingreses.`;

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
    const [password, setPassword] = useState(() => generarPassword());
    const [showPassword, setShowPassword] = useState(true); // visible por defecto
    const [copiedPass, setCopiedPass] = useState(false);
    const [fullName, setFullName] = useState('');
    const [cargoId, setCargoId] = useState<string>('');
    const [showCargoModal, setShowCargoModal] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    // Datos de la cuenta recién creada → panel de correo copiable.
    const [created, setCreated] = useState<{ fullName: string; email: string; password: string } | null>(null);
    const [copied, setCopied] = useState(false);

    // Al abrir el alta se genera una contraseña fuerte fresca.
    useEffect(() => {
        if (isOpen) { setPassword(generarPassword()); setShowPassword(true); }
    }, [isOpen]);

    // Crear un cargo SIN salir del formulario: al guardarlo queda seleccionado.
    const handleInlineCargo = async (data: any) => {
        const r = await createCargo(data);
        if (r.success && r.cargo) setCargoId(r.cargo.id);
        return r;
    };

    const handleGenerarPassword = () => { setPassword(generarPassword()); setShowPassword(true); setError(null); };

    const handleCopiarPassword = async () => {
        try {
            await navigator.clipboard.writeText(password);
            setCopiedPass(true);
            setTimeout(() => setCopiedPass(false), 2000);
        } catch {
            setError('No se pudo copiar. Selecciona la contraseña y cópiala manualmente.');
        }
    };

    if (!isOpen) return null;

    // Limpia el formulario y cierra el modal.
    const resetAndClose = () => {
        setEmail('');
        setPassword(generarPassword()); // deja una fresca lista para el próximo alta
        setShowPassword(true);
        setFullName('');
        setCargoId('');
        setError(null);
        setCreated(null);
        setCopied(false);
        setCopiedPass(false);
        onClose();
    };

    const handleCopiar = async () => {
        if (!created) return;
        try {
            await navigator.clipboard.writeText(textoCorreo(created.fullName, created.email, created.password));
            setCopied(true);
            setTimeout(() => setCopied(false), 2500);
        } catch {
            setError('No se pudo copiar. Selecciona el texto y cópialo manualmente.');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const cargo = cargos.find(c => c.id === cargoId);
        if (!cargo) { setError('Selecciona un cargo.'); return; }

        // Contraseña obligatoria y de al menos 8 caracteres — nunca vacía a Supabase.
        if (password.trim().length < 8) {
            setError('Ingresa una contraseña de al menos 8 caracteres');
            return;
        }

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
                // Reactivación: la contraseña anterior se mantiene, así que NO se
                // muestra el correo con la clave escrita (sería incorrecta).
                alert('Este correo ya existía y fue REACTIVADO con el cargo y datos indicados. La contraseña anterior se mantiene (usa "Recuperar contraseña" si necesita una nueva).');
                resetAndClose();
            } else {
                // Alta nueva: se muestra el panel con el correo listo para copiar.
                setCreated({ fullName, email, password });
            }
        } else {
            setError(result.error || 'Error al crear usuario');
        }
        setLoading(false);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
            <div className="w-full max-w-lg bg-brand-surface border border-brand-border rounded-[2.5rem] shadow-2xl shadow-brand-primary/10 animate-in zoom-in-95 duration-500 overflow-hidden">
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
                    <button onClick={resetAndClose} className="p-2 rounded-xl text-brand-text/30 hover:text-brand-text hover:bg-brand-bg transition-all">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {created ? (
                    /* ── Panel de correo listo para copiar (tras el alta) ── */
                    <div className="p-8 space-y-6">
                        <div className="flex items-center gap-3 p-4 bg-success/10 border border-success/20 rounded-2xl">
                            <CheckCircle2 className="w-6 h-6 text-success shrink-0" />
                            <div>
                                <p className="text-sm font-black text-success uppercase tracking-tight">Cuenta creada</p>
                                <p className="text-[11px] text-brand-text/50">Copia este texto y envíalo por correo a la persona.</p>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center justify-between px-1">
                                <label className="text-[10px] font-black text-brand-text/40 uppercase tracking-widest">Correo de acceso</label>
                                <button
                                    type="button"
                                    onClick={handleCopiar}
                                    className={cn(
                                        'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all',
                                        copied ? 'bg-success/20 text-success' : 'bg-brand-primary text-white hover:brightness-110'
                                    )}
                                >
                                    {copied ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                                    {copied ? 'Copiado' : 'Copiar'}
                                </button>
                            </div>
                            <textarea
                                readOnly
                                value={textoCorreo(created.fullName, created.email, created.password)}
                                onFocus={(e) => e.target.select()}
                                rows={11}
                                className="w-full bg-brand-bg border border-brand-border rounded-2xl px-4 py-3 text-xs font-mono text-brand-text/90 outline-none resize-none leading-relaxed"
                            />
                        </div>

                        {error && (
                            <p className="text-[11px] text-danger font-bold text-center">{error}</p>
                        )}

                        <button
                            type="button"
                            onClick={resetAndClose}
                            className="w-full py-4 bg-brand-primary text-white hover:opacity-90 rounded-2xl transition-all font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-brand-primary/25"
                        >
                            Listo
                        </button>
                    </div>
                ) : (
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
                            <div className="flex items-center justify-between mb-2 px-1">
                                <label className="text-[10px] font-black text-brand-text/40 uppercase tracking-widest">Contraseña Inicial</label>
                                <div className="flex items-center gap-3">
                                    <button
                                        type="button"
                                        onClick={handleGenerarPassword}
                                        className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-brand-primary hover:brightness-110 transition-all"
                                    >
                                        <RefreshCw className="w-3.5 h-3.5" /> Generar otra
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleCopiarPassword}
                                        className={cn('flex items-center gap-1 text-[10px] font-black uppercase tracking-widest transition-all',
                                            copiedPass ? 'text-success' : 'text-brand-text/40 hover:text-brand-text')}
                                    >
                                        {copiedPass ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                                        {copiedPass ? 'Copiada' : 'Copiar'}
                                    </button>
                                </div>
                            </div>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-text/20" />
                                <input
                                    required
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Contraseña generada automáticamente"
                                    className="w-full bg-brand-bg border border-brand-border rounded-2xl pl-12 pr-12 py-4 text-sm font-bold font-mono tracking-wide text-brand-text focus:outline-none focus:border-brand-primary/40 focus:ring-4 focus:ring-brand-primary/5 transition-all"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(v => !v)}
                                    title={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-brand-text/30 hover:text-brand-text transition-colors"
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                            <p className="text-[9px] text-brand-text/30 font-bold mt-2 px-1">Generada fuerte y aleatoria (mínimo 8 caracteres si la editas). Se la entregarás a la persona en el correo de acceso.</p>
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
                                            <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: c.color || 'var(--brand-text-muted)' }} />
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
                )}
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
