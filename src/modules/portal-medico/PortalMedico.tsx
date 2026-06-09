import React, { useState, useEffect } from 'react';
import { PortalMedicoLayout, type PortalView } from './PortalMedicoLayout';
import { PortalMedicoDashboard }  from './PortalMedicoDashboard';
import { WizardCompetencias }     from '../rrhh-clinico/WizardCompetencias';
import {
    MisDocumentosView,
    MisContratosView,
    MisNoticiasView,
    MisCompetenciasView,
} from './PortalMedicoViews';
import { Lock, Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

// ─── Placeholder ──────────────────────────────────────────────────────────────
const ProximamenteView: React.FC<{ titulo: string }> = ({ titulo }) => (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-5 text-center">
        <div className="w-20 h-20 rounded-3xl bg-brand-surface border border-brand-border flex items-center justify-center">
            <Lock className="w-8 h-8 text-brand-text/20" />
        </div>
        <div>
            <h2 className="text-xl font-black text-brand-text/40">{titulo}</h2>
            <p className="text-sm text-brand-text/20 mt-2">Disponible próximamente.</p>
        </div>
    </div>
);

// ─── Portal principal ─────────────────────────────────────────────────────────
export const PortalMedico: React.FC = () => {
    const [currentView,   setCurrentView]   = useState<PortalView>('inicio');
    const [tokenLoading,  setTokenLoading]  = useState(false);
    const [tokenInvalid,  setTokenInvalid]  = useState(false);

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
            } catch (err) {
                setTokenInvalid(true);
            } finally {
                setTokenLoading(false);
            }
        };

        resolveToken();
    }, []);

    // Token cargando
    if (tokenLoading) return (
        <div className="flex items-center justify-center min-h-screen">
            <div className="flex flex-col items-center gap-4">
                <Loader2 className="w-8 h-8 text-brand-primary animate-spin" />
                <p className="text-sm text-brand-text/40 animate-pulse">Verificando acceso...</p>
            </div>
        </div>
    );

    // Token inválido
    if (tokenInvalid) return (
        <div className="flex items-center justify-center min-h-screen p-4">
            <div className="max-w-sm text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto">
                    <AlertCircle className="w-8 h-8 text-red-400" />
                </div>
                <h2 className="text-xl font-black text-brand-text">Link inválido o expirado</h2>
                <p className="text-sm text-brand-text/40">
                    Solicita un nuevo link a tu coordinator de RRHH.
                </p>
            </div>
        </div>
    );

    const renderView = () => {
        switch (currentView) {
            case 'inicio':       return <PortalMedicoDashboard onNavigate={setCurrentView} />;
            case 'onboarding':   return <WizardCompetencias />;
            case 'documentos':   return <MisDocumentosView />;
            case 'contratos':    return <MisContratosView />;
            case 'noticias':     return <MisNoticiasView />;
            case 'competencias': return <MisCompetenciasView onNavigate={setCurrentView} />;
            case 'turnos':       return <ProximamenteView titulo="Mis Turnos" />;
            case 'pagos':        return <ProximamenteView titulo="Mis Pagos" />;
            default:             return <PortalMedicoDashboard onNavigate={setCurrentView} />;
        }
    };

    return (
        <PortalMedicoLayout currentView={currentView} onNavigate={setCurrentView}>
            {renderView()}
        </PortalMedicoLayout>
    );
};
