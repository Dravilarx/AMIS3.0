import { useState, useEffect, lazy, Suspense } from 'react'
import { Layout } from './components/Layout'
import { AuthView } from './components/AuthView'
import { useAuth } from './hooks/useAuth'

// ─── Lazy imports — cada módulo carga solo cuando se necesita ─────────────────
const DashboardModule        = lazy(() => import('./modules/dashboard/DashboardModule').then(m => ({ default: m.DashboardModule })));
const TenderDashboard        = lazy(() => import('./modules/tenders/TenderDashboard').then(m => ({ default: m.TenderDashboard })));
const ProfessionalMatrix     = lazy(() => import('./modules/staffing/ProfessionalMatrix').then(m => ({ default: m.ProfessionalMatrix })));
const ExpenseTracker         = lazy(() => import('./modules/logistics/ExpenseTracker').then(m => ({ default: m.ExpenseTracker })));
const ClinicalWorkflowView   = lazy(() => import('./modules/clinical/ClinicalWorkflowView').then(m => ({ default: m.ClinicalWorkflowView })));
const AuditorDashboard       = lazy(() => import('./modules/audit/AuditorDashboard').then(m => ({ default: m.AuditorDashboard })));
const ShiftManager           = lazy(() => import('./modules/staffing/ShiftManager').then(m => ({ default: m.ShiftManager })));
const ProjectBPM             = lazy(() => import('./modules/projects/ProjectBPM').then(m => ({ default: m.ProjectBPM })));
const MessagingHub           = lazy(() => import('./modules/messaging/MessagingHub').then(m => ({ default: m.MessagingHub })));
const SemanticDMS            = lazy(() => import('./modules/dms/SemanticDMS').then(m => ({ default: m.SemanticDMS })));
const IdeaAnalyst            = lazy(() => import('./modules/ideation/IdeaAnalyst').then(m => ({ default: m.IdeaAnalyst })));
const AdminModule            = lazy(() => import('./modules/admin/AdminModule').then(m => ({ default: m.AdminModule })));
const InstitutionsDashboard  = lazy(() => import('./modules/institutions/InstitutionsDashboard').then(m => ({ default: m.InstitutionsDashboard })));
const NewsFeed               = lazy(() => import('./modules/news/NewsFeed').then(m => ({ default: m.NewsFeed })));
const StatMultirisModule     = lazy(() => import('./modules/stat-multiris/StatMultirisModule').then(m => ({ default: m.StatMultirisModule })));
const StatMultirisHTML       = lazy(() => import('./modules/stat-multiris/StatMultirisHTML').then(m => ({ default: m.StatMultirisHTML })));
const WizardCompetencias     = lazy(() => import('./modules/rrhh-clinico/WizardCompetencias').then(m => ({ default: m.WizardCompetencias })));
const ResumenCompetenciasAdmin = lazy(() => import('./modules/rrhh-clinico/ResumenCompetenciasAdmin').then(m => ({ default: m.ResumenCompetenciasAdmin })));
const PatientGuideView       = lazy(() => import('./modules/clinical/PatientGuideView').then(m => ({ default: m.PatientGuideView })));
const AiAccessManager        = lazy(() => import('./modules/ai-access/AiAccessManager').then(m => ({ default: m.AiAccessManager })));
const DispatchCenter         = lazy(() => import('./modules/dispatch/DispatchCenter').then(m => ({ default: m.DispatchCenter })));
const QuickViewBridge        = lazy(() => import('./modules/quick-view/QuickViewBridge').then(m => ({ default: m.QuickViewBridge })));
const MobileMicView          = lazy(() => import('./modules/remote-mic/MobileMicView').then(m => ({ default: m.MobileMicView })));
const B2BPortal              = lazy(() => import('./modules/b2b-portal/B2BPortal').then(m => ({ default: m.B2BPortal })));
const SecretaryCommandCenter = lazy(() => import('./modules/admin-secretary/SecretaryCommandCenter').then(m => ({ default: m.SecretaryCommandCenter })));
const RadiologistWorklist    = lazy(() => import('./modules/radiology-worklist/RadiologistWorklist').then(m => ({ default: m.RadiologistWorklist })));
const PortalMedico           = lazy(() => import('./modules/portal-medico/PortalMedico').then(m => ({ default: m.PortalMedico })));
const PortalMedicosAdmin     = lazy(() => import('./modules/portal-medico/PortalMedicosAdmin').then(m => ({ default: m.PortalMedicosAdmin })));
const CuartoTurnoDashboard   = lazy(() => import('./modules/cuarto-turno/CuartoTurnoDashboard').then(m => ({ default: m.CuartoTurnoDashboard })));

// ─── Spinner de carga entre módulos ──────────────────────────────────────────
const ModuleLoader = () => (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <div className="w-8 h-8 border-2 border-brand-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-brand-text/30 text-xs font-mono uppercase tracking-widest animate-pulse">
            Cargando módulo...
        </p>
    </div>
);

type CurrentView =
    | 'dashboard' | 'tenders' | 'staffing' | 'logistics' | 'clinical'
    | 'audit' | 'shifts' | 'projects' | 'messaging' | 'dms' | 'ideation'
    | 'admin' | 'institutions' | 'news' | 'stat_multiris' | 'stat_multiris_html'
    | 'ai_knowledge' | 'ai_access' | 'dispatch' | 'b2b_portal' | 'secretary_command'
    | 'radiology_worklist' | 'wizard_competencias' | 'resumen_competencias' | 'auditoria_rrhh'
    | 'portal_medicos_admin' | 'cuarto_turno';

function App() {
    const { user } = useAuth();
    const [currentView, setCurrentView] = useState<CurrentView>('dashboard');

    useEffect(() => {
        if (user?.app_role === 'ADMIN_SECRETARY' || user?.app_role === 'MED_CHIEF') {
            setCurrentView('secretary_command');
        } else if (user?.app_role === 'MED_STAFF') {
            setCurrentView('radiology_worklist');
        }
    }, [user]);

    // ── Rutas especiales sin layout ───────────────────────────────────────────
    if (window.location.pathname.startsWith('/guia/')) {
        return (
            <Suspense fallback={<ModuleLoader />}>
                <PatientGuideView />
            </Suspense>
        );
    }

    if (window.location.pathname === '/quick-view') {
        return (
            <Suspense fallback={<ModuleLoader />}>
                <QuickViewBridge />
            </Suspense>
        );
    }

    if (window.location.pathname === '/portal-medico' ||
        window.location.search.includes('token=')) {
        return (
            <Suspense fallback={<ModuleLoader />}>
                <PortalMedico />
            </Suspense>
        );
    }

    const mobileMicToken = window.location.pathname.startsWith('/mobile-mic/')
        ? window.location.pathname.split('/mobile-mic/')[1]
        : null;

    if (mobileMicToken) {
        return (
            <Suspense fallback={<ModuleLoader />}>
                <MobileMicView token={mobileMicToken} />
            </Suspense>
        );
    }

    if (!user) return <AuthView />;

    const renderView = () => {
        switch (currentView) {
            case 'dashboard':           return <DashboardModule />;
            case 'tenders':             return <TenderDashboard />;
            case 'staffing':            return <ProfessionalMatrix />;
            case 'logistics':           return <ExpenseTracker />;
            case 'clinical':            return <ClinicalWorkflowView />;
            case 'audit':               return <AuditorDashboard />;
            case 'shifts':              return <ShiftManager />;
            case 'projects':            return <ProjectBPM />;
            case 'messaging':           return <MessagingHub />;
            case 'dms':                 return <SemanticDMS />;
            case 'ideation':            return <IdeaAnalyst />;
            case 'secretary_command':   return <SecretaryCommandCenter />;
            case 'radiology_worklist':  return <RadiologistWorklist />;
            case 'admin':
                if (user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN') return <AdminModule />;
                return <DashboardModule />;
            case 'institutions':        return <InstitutionsDashboard />;
            case 'news':                return <NewsFeed />;
            case 'stat_multiris':       return <StatMultirisModule />;
            case 'stat_multiris_html':  return <StatMultirisHTML />;
            case 'ai_access':
                if (user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN') return <AiAccessManager />;
                return <DashboardModule />;
            case 'dispatch':            return <DispatchCenter />;
            case 'b2b_portal':          return <B2BPortal />;
            case 'wizard_competencias': return <WizardCompetencias />;
            case 'resumen_competencias':
            case 'auditoria_rrhh':
                if (user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN') return <ResumenCompetenciasAdmin />;
                return <WizardCompetencias />;
            case 'portal_medicos_admin':
                if (user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN') return <PortalMedicosAdmin />;
                return <DashboardModule />;
            case 'cuarto_turno':        return <CuartoTurnoDashboard />;
            default:                    return <DashboardModule />;
        }
    };

    return (
        <Layout currentView={currentView} onNavigate={setCurrentView}>
            <Suspense fallback={<ModuleLoader />}>
                {renderView()}
            </Suspense>
        </Layout>
    );
}

export default App;
