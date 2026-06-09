import React, { useState, useEffect } from 'react';
import {
    CheckCircle2, ArrowRight, FileText, ClipboardList,
    Clock, Loader2, Briefcase, Newspaper,
    Award, ChevronRight, Shield,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import { type PortalView } from './PortalMedicoLayout';

interface Props { onNavigate: (view: PortalView) => void; }

export const PortalMedicoDashboard: React.FC<Props> = ({ onNavigate }) => {
    const { user } = useAuth();
    const [prof,      setProf]      = useState<any | null>(null);
    const [docs,      setDocs]      = useState<any[]>([]);
    const [contracts, setContracts] = useState<any[]>([]);
    const [comp,      setComp]      = useState<any | null>(null);
    const [loading,   setLoading]   = useState(true);

    useEffect(() => {
        if (!user?.email) return;
        const load = async () => {
            setLoading(true);
            const { data: profData } = await supabase
                .from('professionals')
                .select('id, name, last_name, role, specialty, joining_date, status, is_active, info_status, induction')
                .eq('email', user.email)
                .single();

            if (!profData) { setLoading(false); return; }
            setProf(profData);

            const [docsRes, contractsRes, compRes] = await Promise.all([
                supabase.from('professional_academic_docs').select('doc_type, is_pending, file_url').eq('professional_id', profData.id),
                supabase.from('contracts').select('company, type, amount').eq('professional_id', profData.id),
                supabase.from('competencias_radiologos').select('status, submitted_at').eq('professional_id', profData.id).maybeSingle(),
            ]);

            setDocs(docsRes.data || []);
            setContracts(contractsRes.data || []);
            setComp(compRes.data);
            setLoading(false);
        };
        load();
    }, [user]);

    const firstName = prof?.name || user?.name?.split(' ')[0] || 'Doctor/a';

    // Calcular progreso real de onboarding
    const PASOS = [
        {
            label:  'Datos personales completados',
            done:   prof?.info_status === 'complete' || prof?.info_status === 'pending',
            icon:   FileText,
            view:   null,
        },
        {
            label:  'Documentos académicos subidos',
            done:   docs.filter(d => d.file_url && !d.is_pending).length >= 3,
            icon:   FileText,
            view:   'documentos' as PortalView,
        },
        {
            label:  'Inducción completada',
            done:   prof?.induction?.hasReadAndAccepted === true,
            icon:   Shield,
            view:   null,
        },
        {
            label:  'Auto-evaluación de competencias',
            done:   !!comp,
            icon:   ClipboardList,
            view:   'onboarding' as PortalView,
        },
        {
            label:  'Validación por Dirección Médica',
            done:   prof?.info_status === 'complete',
            icon:   Clock,
            view:   null,
            isPending: true,
        },
    ];

    const completados = PASOS.filter(p => p.done).length;
    const pct         = Math.round((completados / PASOS.length) * 100);

    if (loading) return (
        <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-brand-primary animate-spin" />
        </div>
    );

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

            {/* Bienvenida */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-primary/20 via-orange-600/10 to-transparent border border-brand-primary/20 p-8">
                <div className="absolute top-0 right-0 w-64 h-64 bg-brand-primary/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl pointer-events-none" />
                <div className="relative z-10">
                    <p className="text-[10px] font-black text-brand-primary/60 uppercase tracking-widest mb-2">
                        Portal Médico AMIS
                    </p>
                    <h1 className="text-3xl font-black text-brand-text leading-tight">
                        Hola, {firstName} 👋
                    </h1>
                    <p className="text-brand-text/50 mt-2 max-w-lg text-sm leading-relaxed">
                        {pct === 100
                            ? 'Tu perfil está completo. Bienvenido al equipo AMIS.'
                            : `Tu onboarding está al ${pct}%. Completa los pasos pendientes para activar tu cuenta.`}
                    </p>
                    {pct < 100 && (
                        <button onClick={() => onNavigate('onboarding')}
                            className="mt-5 inline-flex items-center gap-3 px-6 py-3 rounded-2xl bg-gradient-to-r from-brand-primary to-orange-600 text-white font-black text-sm shadow-xl shadow-brand-primary/30 hover:brightness-110 transition-all">
                            Continuar Onboarding
                            <ArrowRight className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>

            {/* KPIs rápidos */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    {
                        icon:  FileText,
                        label: 'Documentos',
                        val:   `${docs.filter(d => d.file_url && !d.is_pending).length}/${docs.length || 5}`,
                        color: 'text-blue-400',
                        view:  'documentos' as PortalView,
                    },
                    {
                        icon:  Briefcase,
                        label: 'Contratos',
                        val:   contracts.length,
                        color: 'text-emerald-400',
                        view:  'contratos' as PortalView,
                    },
                    {
                        icon:  Award,
                        label: 'Competencias',
                        val:   comp ? (comp.status === 'active' ? '✓' : '⏳') : '—',
                        color: comp?.status === 'active' ? 'text-emerald-400' : 'text-amber-400',
                        view:  'competencias' as PortalView,
                    },
                    {
                        icon:  Newspaper,
                        label: 'Noticias',
                        val:   '→',
                        color: 'text-purple-400',
                        view:  'noticias' as PortalView,
                    },
                ].map(k => (
                    <button key={k.label} onClick={() => onNavigate(k.view)}
                        className="p-4 rounded-2xl bg-brand-surface border border-brand-border hover:border-brand-text/20 transition-all text-left group">
                        <div className="flex items-center justify-between mb-2">
                            <k.icon className={cn('w-5 h-5', k.color)} />
                            <ChevronRight className="w-3.5 h-3.5 text-brand-text/20 group-hover:text-brand-text/50 transition-colors" />
                        </div>
                        <p className={cn('text-2xl font-black', k.color)}>{k.val}</p>
                        <p className="text-[9px] font-black text-brand-text/20 uppercase tracking-widest mt-1">{k.label}</p>
                    </button>
                ))}
            </div>

            {/* Progreso de onboarding */}
            <div className="bg-brand-surface border border-brand-border rounded-3xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-base font-black text-brand-text">Estado de Onboarding</h2>
                        <p className="text-xs text-brand-text/40 mt-0.5">
                            {completados === PASOS.length
                                ? '¡Todo completado!'
                                : `${completados} de ${PASOS.length} pasos completados`}
                        </p>
                    </div>
                    <span className={cn('text-2xl font-black',
                        pct === 100 ? 'text-emerald-400' : 'text-brand-primary')}>
                        {pct}%
                    </span>
                </div>

                {/* Barra */}
                <div className="h-2 bg-brand-border rounded-full overflow-hidden">
                    <div className={cn('h-full rounded-full transition-all duration-700',
                        pct === 100 ? 'bg-emerald-500' : 'bg-brand-primary')}
                        style={{ width: `${pct}%` }} />
                </div>

                {/* Pasos */}
                <div className="space-y-2">
                    {PASOS.map((paso, i) => {
                        const Icon = paso.icon;
                        const isCurrent = !paso.done && PASOS.slice(0, i).every(p => p.done);
                        return (
                            <div key={i}
                                onClick={() => paso.view && !paso.isPending && onNavigate(paso.view)}
                                className={cn(
                                    'flex items-center gap-3 p-3 rounded-2xl border transition-all',
                                    paso.done
                                        ? 'bg-emerald-500/5 border-emerald-500/20'
                                        : isCurrent
                                        ? 'bg-brand-primary/5 border-brand-primary/20 cursor-pointer hover:bg-brand-primary/10'
                                        : 'bg-brand-bg border-brand-border/50 opacity-50'
                                )}>
                                <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0',
                                    paso.done ? 'bg-emerald-500/20' : isCurrent ? 'bg-brand-primary/20' : 'bg-brand-border/30')}>
                                    {paso.done
                                        ? <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                        : paso.isPending
                                        ? <Clock className={cn('w-4 h-4', isCurrent ? 'text-brand-primary' : 'text-brand-text/20')} />
                                        : <Icon className={cn('w-4 h-4', isCurrent ? 'text-brand-primary' : 'text-brand-text/20')} />
                                    }
                                </div>
                                <p className={cn('text-sm font-bold flex-1',
                                    paso.done ? 'text-emerald-400' : isCurrent ? 'text-brand-text' : 'text-brand-text/30')}>
                                    {paso.label}
                                </p>
                                {isCurrent && !paso.isPending && (
                                    <span className="text-[9px] font-black text-brand-primary uppercase tracking-widest">
                                        Pendiente →
                                    </span>
                                )}
                                {paso.isPending && isCurrent && (
                                    <span className="text-[9px] font-black text-brand-text/20 uppercase tracking-widest">
                                        En revisión
                                    </span>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Contratos vigentes — resumen */}
            {contracts.length > 0 && (
                <div className="p-5 bg-brand-surface border border-brand-border rounded-2xl space-y-3">
                    <div className="flex items-center justify-between">
                        <p className="text-sm font-black text-brand-text">Contratos Vigentes</p>
                        <button onClick={() => onNavigate('contratos')}
                            className="text-[10px] font-black uppercase text-brand-primary hover:underline">
                            Ver todos →
                        </button>
                    </div>
                    {contracts.slice(0, 2).map((c: any, i: number) => (
                        <div key={i} className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-bold text-brand-text">{c.company}</p>
                                <p className="text-[10px] text-brand-text/30">{c.type}</p>
                            </div>
                            <p className="text-sm font-black text-brand-primary">
                                {Number(c.amount).toLocaleString('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 })}
                            </p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
