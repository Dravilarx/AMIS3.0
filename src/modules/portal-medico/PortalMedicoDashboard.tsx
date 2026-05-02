import React from 'react';
import { CheckCircle2, ArrowRight, FileText, ClipboardList, Clock, AlertCircle } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { type PortalView } from './PortalMedicoLayout';

// ─── Pasos de onboarding (mock) ───────────────────────────────────────────────
const PASOS = [
    { id: 1, label: 'Auto-evaluación de Competencias', done: false, icon: ClipboardList },
    { id: 2, label: 'Subir Título Médico (PDF)',        done: false, icon: FileText       },
    { id: 3, label: 'Subir Firma Digital (PNG)',        done: false, icon: FileText       },
    { id: 4, label: 'Validación por Director Médico',   done: false, icon: Clock         },
];

interface Props {
    onNavigate: (view: PortalView) => void;
}

export const PortalMedicoDashboard: React.FC<Props> = ({ onNavigate }) => {
    const { user } = useAuth();
    const firstName = user?.name?.split(' ')[1] || user?.name?.split(' ')[0] || 'Doctor/a';
    const completados = PASOS.filter(p => p.done).length;
    const pct = Math.round((completados / PASOS.length) * 100);

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

            {/* ── Bienvenida ── */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-primary/20 via-orange-600/10 to-transparent border border-brand-primary/20 p-8">
                {/* Decoración de fondo */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-brand-primary/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl pointer-events-none" />

                <div className="relative z-10">
                    <p className="text-[10px] font-black text-brand-primary/60 uppercase tracking-widest mb-2">
                        Bienvenido/a al Portal Médico AMIS
                    </p>
                    <h1 className="text-3xl font-black text-brand-text leading-tight">
                        Hola, {firstName} 👋
                    </h1>
                    <p className="text-brand-text/50 mt-3 max-w-lg leading-relaxed text-sm">
                        Para <strong className="text-brand-text/80">activar su cuenta</strong> y comenzar a operar
                        en el sistema AMIS Care, por favor complete su proceso de Onboarding.
                        Solo tomará unos minutos.
                    </p>

                    <button
                        onClick={() => onNavigate('onboarding')}
                        className="mt-6 inline-flex items-center gap-3 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-brand-primary to-orange-600 text-white font-black text-sm shadow-xl shadow-brand-primary/30 hover:shadow-brand-primary/50 hover:scale-[1.02] transition-all"
                    >
                        Comenzar Onboarding
                        <ArrowRight className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* ── Progreso de Onboarding ── */}
            <div className="bg-brand-surface border border-brand-border rounded-3xl p-6 space-y-5">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-base font-black text-brand-text">Estado de Onboarding</h2>
                        <p className="text-xs text-brand-text/40 mt-0.5">
                            {completados === 0
                                ? 'Aún no has iniciado tu proceso.'
                                : completados === PASOS.length
                                ? '¡Todo completado! En revisión por Dirección Médica.'
                                : `${completados} de ${PASOS.length} pasos completados.`}
                        </p>
                    </div>
                    <span className="text-2xl font-black text-brand-primary">{pct}%</span>
                </div>

                {/* Barra */}
                <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-blue-500 rounded-full transition-all duration-700"
                        style={{ width: `${pct}%` }}
                    />
                </div>

                {/* Lista de pasos */}
                <div className="space-y-2.5">
                    {PASOS.map((paso, i) => {
                        const Icon = paso.icon;
                        return (
                            <div
                                key={paso.id}
                                className={`flex items-center gap-4 p-4 rounded-2xl border transition-all ${
                                    paso.done
                                        ? 'bg-success/5 border-success/20'
                                        : i === completados
                                        ? 'bg-brand-primary/5 border-brand-primary/20'
                                        : 'bg-brand-bg border-brand-border/50 opacity-50'
                                }`}
                            >
                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                                    paso.done ? 'bg-success/20' : i === completados ? 'bg-brand-primary/20' : 'bg-brand-border/30'
                                }`}>
                                    {paso.done
                                        ? <CheckCircle2 className="w-4 h-4 text-success" />
                                        : <Icon className={`w-4 h-4 ${i === completados ? 'text-brand-primary' : 'text-brand-text/20'}`} />}
                                </div>
                                <div className="flex-1">
                                    <p className={`text-sm font-bold ${paso.done ? 'text-success' : i === completados ? 'text-brand-text' : 'text-brand-text/30'}`}>
                                        {paso.label}
                                    </p>
                                    {i === completados && !paso.done && (
                                        <p className="text-[10px] text-brand-primary font-bold mt-0.5 uppercase tracking-widest">← Próximo paso</p>
                                    )}
                                </div>
                                {paso.done && (
                                    <CheckCircle2 className="w-4 h-4 text-success flex-shrink-0" />
                                )}
                            </div>
                        );
                    })}
                </div>

                <button
                    onClick={() => onNavigate('onboarding')}
                    className="w-full py-3.5 rounded-2xl border border-brand-primary/30 text-brand-primary font-black text-sm hover:bg-brand-primary/10 transition-all flex items-center justify-center gap-2"
                >
                    <ClipboardList className="w-4 h-4" />
                    Ir a Mi Onboarding
                </button>
            </div>

            {/* ── Aviso de activación ── */}
            <div className="flex items-start gap-3 p-4 bg-amber-950/30 border border-amber-700/30 rounded-2xl">
                <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-300/70 leading-relaxed">
                    <strong className="text-amber-300">Importante:</strong> Su cuenta permanecerá en estado{' '}
                    <em>Pendiente</em> hasta que el Director Médico valide su perfil clínico. Recibirá una
                    notificación por WhatsApp al ser aprobado.
                </p>
            </div>
        </div>
    );
};
