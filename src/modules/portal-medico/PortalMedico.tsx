import React, { useState, useEffect } from 'react';
import { PortalMedicoLayout, type PortalView } from './PortalMedicoLayout';
import { PortalMedicoDashboard } from './PortalMedicoDashboard';
import { WizardCompetencias } from '../rrhh-clinico/WizardCompetencias';
import { Lock, Loader2, CheckCircle2, AlertCircle, Save, User } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { formatRUT, formatPhone } from '../../lib/utils';

// ─── Placeholder ──────────────────────────────────────────────────────────────
const ProximamenteView: React.FC<{ titulo: string }> = ({ titulo }) => (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-5 text-center">
        <div className="w-20 h-20 rounded-3xl bg-brand-surface border border-brand-border flex items-center justify-center">
            <Lock className="w-8 h-8 text-brand-text/20" />
        </div>
        <div>
            <h2 className="text-xl font-black text-brand-text/40">{titulo}</h2>
            <p className="text-sm text-brand-text/20 mt-2">Esta sección estará disponible próximamente.</p>
        </div>
    </div>
);

// ─── Formulario de auto-llenado del médico ────────────────────────────────────
interface SelfFillFormProps {
    professionalId: string;
    onDone: () => void;
}

const SelfFillForm: React.FC<SelfFillFormProps> = ({ professionalId, onDone }) => {
    const [form, setForm] = useState({
        name:        '',
        lastName:    '',
        nationalId:  '',
        nationality: 'Chilena',
        birthDate:   '',
        phone:       '',
        city:        '',
        region:      '',
    });
    const [loading, setSaving]  = useState(false);
    const [saved, setSaved]     = useState(false);
    const [error, setError]     = useState<string | null>(null);

    // Precargar datos existentes
    useEffect(() => {
        supabase
            .from('professionals')
            .select('name, last_name, national_id, nationality, birth_date, phone, city, region')
            .eq('id', professionalId)
            .single()
            .then(({ data }) => {
                if (data) {
                    setForm({
                        name:        data.name        || '',
                        lastName:    data.last_name   || '',
                        nationalId:  data.national_id || '',
                        nationality: data.nationality || 'Chilena',
                        birthDate:   data.birth_date  || '',
                        phone:       data.phone       || '',
                        city:        data.city        || '',
                        region:      data.region      || '',
                    });
                }
            });
    }, [professionalId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.name.trim() || !form.lastName.trim()) {
            setError('Nombre y apellidos son obligatorios.');
            return;
        }
        setSaving(true);
        setError(null);
        try {
            const { error: updateError } = await supabase
                .from('professionals')
                .update({
                    name:         form.name.trim(),
                    last_name:    form.lastName.trim(),
                    national_id:  form.nationalId.trim()  || null,
                    nationality:  form.nationality.trim() || null,
                    birth_date:   form.birthDate          || null,
                    phone:        form.phone.trim()       || null,
                    city:         form.city.trim()        || null,
                    region:       form.region.trim()      || null,
                    info_status:  'pending',
                })
                .eq('id', professionalId);

            if (updateError) throw updateError;

            // Marcar token como usado
            await supabase
                .from('portal_tokens')
                .update({ used_at: new Date().toISOString() })
                .eq('professional_id', professionalId)
                .is('used_at', null);

            setSaved(true);
            setTimeout(onDone, 2000);
        } catch (err: any) {
            setError(err.message || 'Error al guardar. Intenta nuevamente.');
        } finally {
            setSaving(false);
        }
    };

    if (saved) return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-5 text-center">
            <div className="w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <CheckCircle2 className="w-10 h-10 text-emerald-400" />
            </div>
            <div>
                <h2 className="text-2xl font-black text-brand-text">¡Datos guardados!</h2>
                <p className="text-sm text-brand-text/40 mt-2">
                    Tu información fue enviada a RRHH para validación. Gracias.
                </p>
            </div>
        </div>
    );

    return (
        <div className="max-w-lg mx-auto space-y-6 pb-10">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-brand-primary to-orange-600 flex items-center justify-center">
                    <User className="w-5 h-5 text-white" />
                </div>
                <div>
                    <h1 className="text-lg font-black text-brand-text">Completa tus datos personales</h1>
                    <p className="text-[10px] text-brand-text/40 uppercase tracking-widest font-bold">
                        Portal AMIS · Onboarding
                    </p>
                </div>
            </div>

            <div className="bg-brand-surface/50 border border-info/20 rounded-2xl p-4">
                <p className="text-xs text-info/80 leading-relaxed">
                    Por favor completa solo tus datos personales. Los campos de equipo, unidad
                    y asociado serán completados por el equipo de RRHH.
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-[10px] uppercase font-bold text-brand-text/40 tracking-widest">
                            Nombre <span className="text-red-400">*</span>
                        </label>
                        <input
                            required
                            className="bg-brand-surface border border-brand-border rounded-lg w-full px-4 py-2 text-sm text-brand-text focus:border-info/50 outline-none"
                            value={form.name}
                            onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] uppercase font-bold text-brand-text/40 tracking-widest">
                            Apellidos <span className="text-red-400">*</span>
                        </label>
                        <input
                            required
                            className="bg-brand-surface border border-brand-border rounded-lg w-full px-4 py-2 text-sm text-brand-text focus:border-info/50 outline-none"
                            value={form.lastName}
                            onChange={e => setForm(p => ({ ...p, lastName: e.target.value }))}
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-[10px] uppercase font-bold text-brand-text/40 tracking-widest">RUT</label>
                        <input
                            className="bg-brand-surface border border-brand-border rounded-lg w-full px-4 py-2 text-sm text-brand-text focus:border-info/50 outline-none"
                            value={form.nationalId}
                            onChange={e => setForm(p => ({ ...p, nationalId: formatRUT(e.target.value) }))}
                            placeholder="12.345.678-9"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] uppercase font-bold text-brand-text/40 tracking-widest">Nacionalidad</label>
                        <input
                            className="bg-brand-surface border border-brand-border rounded-lg w-full px-4 py-2 text-sm text-brand-text focus:border-info/50 outline-none"
                            value={form.nationality}
                            onChange={e => setForm(p => ({ ...p, nationality: e.target.value }))}
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-[10px] uppercase font-bold text-brand-text/40 tracking-widest">Fecha de Nacimiento</label>
                        <input
                            type="date"
                            className="bg-brand-surface border border-brand-border rounded-lg w-full px-4 py-2 text-sm text-brand-text focus:border-info/50 outline-none"
                            value={form.birthDate}
                            onChange={e => setForm(p => ({ ...p, birthDate: e.target.value }))}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] uppercase font-bold text-brand-text/40 tracking-widest">Teléfono</label>
                        <input
                            className="bg-brand-surface border border-brand-border rounded-lg w-full px-4 py-2 text-sm text-brand-text focus:border-info/50 outline-none"
                            value={form.phone}
                            onChange={e => setForm(p => ({ ...p, phone: formatPhone(e.target.value) }))}
                            placeholder="+569 9918 8701"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-[10px] uppercase font-bold text-brand-text/40 tracking-widest">Ciudad</label>
                        <input
                            className="bg-brand-surface border border-brand-border rounded-lg w-full px-4 py-2 text-sm text-brand-text focus:border-info/50 outline-none"
                            value={form.city}
                            onChange={e => setForm(p => ({ ...p, city: e.target.value }))}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] uppercase font-bold text-brand-text/40 tracking-widest">Región</label>
                        <input
                            className="bg-brand-surface border border-brand-border rounded-lg w-full px-4 py-2 text-sm text-brand-text focus:border-info/50 outline-none"
                            value={form.region}
                            onChange={e => setForm(p => ({ ...p, region: e.target.value }))}
                        />
                    </div>
                </div>

                {error && (
                    <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                        <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                        <p className="text-xs text-red-400">{error}</p>
                    </div>
                )}

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-gradient-to-r from-brand-primary to-orange-600 text-white font-black text-sm shadow-xl shadow-brand-primary/20 hover:shadow-brand-primary/40 hover:scale-[1.01] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                    {loading
                        ? <><Loader2 className="w-4 h-4 animate-spin" /> Guardando...</>
                        : <><Save className="w-4 h-4" /> Enviar mis datos a RRHH</>
                    }
                </button>
            </form>
        </div>
    );
};

// ─── Contenedor principal del Portal ─────────────────────────────────────────
export const PortalMedico: React.FC = () => {
    const [currentView, setCurrentView]         = useState<PortalView>('inicio');
    const [tokenProfId, setTokenProfId]         = useState<string | null>(null);
    const [tokenLoading, setTokenLoading]       = useState(false);
    const [tokenInvalid, setTokenInvalid]       = useState(false);
    const [showSelfFill, setShowSelfFill]       = useState(false);

    // Resolver token al montar
    useEffect(() => {
        const resolveToken = async () => {
            const params = new URLSearchParams(window.location.search);
            const token  = params.get('token');
            if (!token) return;

            setTokenLoading(true);
            try {
                const { data, error } = await supabase
                    .from('portal_tokens')
                    .select('professional_id, expires_at, used_at')
                    .eq('token', token)
                    .single();

                if (error || !data) {
                    setTokenInvalid(true);
                    return;
                }
                if (new Date(data.expires_at) < new Date()) {
                    setTokenInvalid(true);
                    return;
                }
                setTokenProfId(data.professional_id);
                setShowSelfFill(true);
            } catch (err) {
                setTokenInvalid(true);
            } finally {
                setTokenLoading(false);
            }
        };

        resolveToken();
    }, []);

    // Estado: cargando token
    if (tokenLoading) return (
        <div className="flex items-center justify-center min-h-screen">
            <div className="flex flex-col items-center gap-4">
                <Loader2 className="w-8 h-8 text-brand-primary animate-spin" />
                <p className="text-sm text-brand-text/40 animate-pulse">Verificando acceso...</p>
            </div>
        </div>
    );

    // Estado: token inválido o expirado
    if (tokenInvalid) return (
        <div className="flex items-center justify-center min-h-screen p-4">
            <div className="max-w-sm text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto">
                    <AlertCircle className="w-8 h-8 text-red-400" />
                </div>
                <h2 className="text-xl font-black text-brand-text">Link inválido o expirado</h2>
                <p className="text-sm text-brand-text/40">
                    Este link ya no es válido. Solicita uno nuevo a tu coordinador de RRHH.
                </p>
            </div>
        </div>
    );

    // Estado: formulario de auto-llenado vía token
    if (showSelfFill && tokenProfId) return (
        <PortalMedicoLayout currentView="onboarding" onNavigate={() => {}}>
            <SelfFillForm
                professionalId={tokenProfId}
                onDone={() => setShowSelfFill(false)}
            />
        </PortalMedicoLayout>
    );

    // Estado: portal normal (sin token)
    const renderView = () => {
        switch (currentView) {
            case 'inicio':     return <PortalMedicoDashboard onNavigate={setCurrentView} />;
            case 'onboarding': return <WizardCompetencias />;
            case 'turnos':     return <ProximamenteView titulo="Mis Turnos" />;
            case 'pagos':      return <ProximamenteView titulo="Mis Pagos" />;
            default:           return <PortalMedicoDashboard onNavigate={setCurrentView} />;
        }
    };

    return (
        <PortalMedicoLayout currentView={currentView} onNavigate={setCurrentView}>
            {renderView()}
        </PortalMedicoLayout>
    );
};
