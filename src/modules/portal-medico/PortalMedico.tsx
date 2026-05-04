import React, { useState } from 'react';
import { PortalMedicoLayout, type PortalView } from './PortalMedicoLayout';
import { PortalMedicoDashboard } from './PortalMedicoDashboard';
import { WizardCompetencias } from '../rrhh-clinico/WizardCompetencias';
import { Calendar, CreditCard, Lock } from 'lucide-react';

// ─── Placeholder para secciones en construcción ───────────────────────────────
const ProximamenteView: React.FC<{ titulo: string; icon: React.ElementType }> = ({ titulo, icon: _icon }) => (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-5 text-center">
        <div className="w-20 h-20 rounded-3xl bg-brand-surface border border-brand-border flex items-center justify-center">
            <Lock className="w-8 h-8 text-brand-text/20" />
        </div>
        <div>
            <h2 className="text-xl font-black text-brand-text/40">{titulo}</h2>
            <p className="text-sm text-brand-text/20 mt-2">Esta sección estará disponible próximamente.</p>
        </div>
        <span className="px-4 py-2 rounded-full border border-brand-border text-xs font-black text-brand-text/20 uppercase tracking-widest">
            En Desarrollo
        </span>
    </div>
);

// ─── Contenedor principal del Portal ─────────────────────────────────────────
export const PortalMedico: React.FC = () => {
    const [currentView, setCurrentView] = useState<PortalView>('inicio');

    const renderView = () => {
        switch (currentView) {
            case 'inicio':
                return <PortalMedicoDashboard onNavigate={setCurrentView} />;
            case 'onboarding':
                return <WizardCompetencias />;
            case 'turnos':
                return <ProximamenteView titulo="Mis Turnos" icon={Calendar} />;
            case 'pagos':
                return <ProximamenteView titulo="Mis Pagos" icon={CreditCard} />;
            default:
                return <PortalMedicoDashboard onNavigate={setCurrentView} />;
        }
    };

    return (
        <PortalMedicoLayout currentView={currentView} onNavigate={setCurrentView}>
            {renderView()}
        </PortalMedicoLayout>
    );
};
