import { useState, useEffect, useRef, lazy, Suspense } from 'react'
import { Layout, NAV_ITEMS } from './components/Layout'
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
// Guía pública del paciente RETIRADA (clinical_appointments ya no permite acceso
// sin login). PatientGuideView.tsx queda en el repo sin conectar, por si se
// reactiva de forma segura más adelante. No borrar el archivo.
// const PatientGuideView    = lazy(() => import('./modules/clinical/PatientGuideView').then(m => ({ default: m.PatientGuideView })));
const AiAccessManager        = lazy(() => import('./modules/ai-access/AiAccessManager').then(m => ({ default: m.AiAccessManager })));
const DispatchCenter         = lazy(() => import('./modules/dispatch/DispatchCenter').then(m => ({ default: m.DispatchCenter })));
const QuickViewBridge        = lazy(() => import('./modules/quick-view/QuickViewBridge').then(m => ({ default: m.QuickViewBridge })));
// Feature "dictado por micrófono móvil" retirado (descartado, no se construirá). MobileMicView.tsx
// queda en el repo sin conectar, por si se reactiva de forma segura más adelante. No borrar el archivo.
// const MobileMicView          = lazy(() => import('./modules/remote-mic/MobileMicView').then(m => ({ default: m.MobileMicView })));
const B2BPortal              = lazy(() => import('./modules/b2b-portal/B2BPortal').then(m => ({ default: m.B2BPortal })));
const SecretaryCommandCenter = lazy(() => import('./modules/admin-secretary/SecretaryCommandCenter').then(m => ({ default: m.SecretaryCommandCenter })));
const RadiologistWorklist    = lazy(() => import('./modules/radiology-worklist/RadiologistWorklist').then(m => ({ default: m.RadiologistWorklist })));
// Portal Médico (acceso anónimo sin login) APARCADO — ver nota en la ruta más abajo.
// const PortalMedico           = lazy(() => import('./modules/portal-medico/PortalMedico').then(m => ({ default: m.PortalMedico })));
const PortalMedicosAdmin     = lazy(() => import('./modules/portal-medico/PortalMedicosAdmin').then(m => ({ default: m.PortalMedicosAdmin })));
const CuartoTurnoDashboard   = lazy(() => import('./modules/cuarto-turno/CuartoTurnoDashboard').then(m => ({ default: m.CuartoTurnoDashboard })));
const SolicitudesDashboard   = lazy(() => import('./modules/solicitudes/SolicitudesDashboard').then(m => ({ default: m.SolicitudesDashboard })));
const ProtocolosDashboard    = lazy(() => import('./modules/protocolos/ProtocolosDashboard').then(m => ({ default: m.ProtocolosDashboard })));
const DashboardCuartoTurno   = lazy(() => import('./modules/dashboard-cuarto-turno/DashboardCuartoTurno').then(m => ({ default: m.DashboardCuartoTurno })));
const PortalInstitucionalAdmin = lazy(() => import('./modules/portal-institucional/PortalInstitucionalAdmin').then(m => ({ default: m.PortalInstitucionalAdmin })));
const AsistenteDashboard     = lazy(() => import('./modules/asistente/AsistenteDashboard').then(m => ({ default: m.AsistenteDashboard })));

// ─── Spinner de carga entre módulos ──────────────────────────────────────────
const ModuleLoader = () => (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <div className="w-8 h-8 border-2 border-brand-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-brand-text/30 text-xs font-mono uppercase tracking-widest animate-pulse">
            Cargando módulo...
        </p>
    </div>
);

// ─── Estado de acceso no autorizado (guard genérico de renderView) ───────────
const AccesoNoAutorizado = ({ onIrAVistaSegura }: { onIrAVistaSegura: () => void }) => (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 text-center px-6">
        <div className="w-14 h-14 rounded-2xl bg-danger/10 border border-danger/20 flex items-center justify-center">
            <span className="text-2xl">🔒</span>
        </div>
        <div>
            <h3 className="text-brand-text font-black text-sm uppercase tracking-widest">Acceso no autorizado</h3>
            <p className="text-brand-text/40 text-xs mt-1 max-w-xs">
                No tienes permiso para ver este módulo.
            </p>
        </div>
        <button
            onClick={onIrAVistaSegura}
            className="px-4 py-2 rounded-xl bg-brand-primary text-white text-xs font-black uppercase tracking-widest hover:opacity-90 transition-opacity"
        >
            Ir a mi panel
        </button>
    </div>
);

type CurrentView =
    | 'dashboard' | 'tenders' | 'staffing' | 'logistics' | 'clinical'
    | 'audit' | 'shifts' | 'projects' | 'messaging' | 'dms' | 'ideation'
    | 'admin' | 'institutions' | 'news' | 'stat_multiris' | 'stat_multiris_html'
    | 'ai_knowledge' | 'ai_access' | 'dispatch' | 'b2b_portal' | 'secretary_command'
    | 'radiology_worklist' | 'wizard_competencias' | 'resumen_competencias' | 'auditoria_rrhh'
    | 'portal_medicos_admin' | 'cuarto_turno' | 'dashboard_cuarto_turno' | 'solicitudes' | 'protocolos' | 'portal_institucional' | 'asistente';

// Vistas gateadas por permissions[modulo].read: exactamente las del menú lateral
// (NAV_ITEMS ya es la fuente única que usa Layout.tsx para filtrar el sidebar).
// Las vistas de consola admin (admin, ai_access, resumen_competencias,
// auditoria_rrhh, portal_medicos_admin, portal_institucional) NO están acá:
// se gatean por rol directamente dentro de renderView/Layout, no por permissions.
const MODULE_GATED_VIEWS = new Set<string>(NAV_ITEMS.map(i => i.id));

function App() {
    const { user, hasModuleAccess, isSuperAdmin } = useAuth();
    const [currentView, setCurrentView] = useState<CurrentView>('dashboard');
    const landedRef = useRef(false); // la vista inicial se decide una sola vez por sesión

    // ¿Puede ver el Panel Principal? (SUPER_ADMIN o permiso explícito)
    const canSeeDashboard = () => isSuperAdmin() || hasModuleAccess('dashboard');
    // Primer módulo visible según el MISMO criterio del menú lateral
    const firstVisibleModule = (): CurrentView => {
        const first = NAV_ITEMS.find(i => hasModuleAccess(i.id));
        return (first?.id as CurrentView) ?? 'dashboard';
    };
    // Guard genérico: ¿el usuario puede ver esta vista? Las vistas fuera de
    // MODULE_GATED_VIEWS (consola admin) no pasan por acá — ya se gatean por rol.
    const canSeeView = (view: CurrentView) =>
        !MODULE_GATED_VIEWS.has(view) || hasModuleAccess(view);

    // Vista inicial tras login, según permisos (nadie aterriza en el Dashboard si no le corresponde)
    useEffect(() => {
        if (!user) { landedRef.current = false; return; }
        if (landedRef.current) return;
        landedRef.current = true;

        // Landings por rol especial, solo si tienen acceso a ese módulo
        if ((user.app_role === 'ADMIN_SECRETARY' || user.app_role === 'MED_CHIEF') && hasModuleAccess('secretary_command')) {
            setCurrentView('secretary_command');
            return;
        }
        if (user.app_role === 'MED_STAFF' && hasModuleAccess('radiology_worklist')) {
            setCurrentView('radiology_worklist');
            return;
        }

        // SUPER_ADMIN o con acceso explícito al Dashboard → Dashboard; si no, su primer módulo visible
        setCurrentView(canSeeDashboard() ? 'dashboard' : firstVisibleModule());
    }, [user]);

    // Guard: si currentView queda en una vista sin permiso por CUALQUIER vía (no
    // solo clic en el sidebar — un botón que navegue, un onNavigate directo, etc.),
    // corrige el estado a una vista segura. Cubre 'dashboard' (caso especial vía
    // canSeeDashboard) y, en general, cualquier vista de MODULE_GATED_VIEWS.
    useEffect(() => {
        if (!user) return;
        if (currentView === 'dashboard' && !canSeeDashboard()) {
            setCurrentView(firstVisibleModule());
            return;
        }
        if (!canSeeView(currentView)) {
            setCurrentView(firstVisibleModule());
        }
    }, [currentView, user]);

    // ── Rutas especiales sin layout ───────────────────────────────────────────
    // Guía pública del paciente (/guia/:id → PatientGuideView) RETIRADA: clinical_appointments
    // ya no permite acceso sin login y esta función no se usará por ahora. El código
    // del componente sigue en modules/clinical/PatientGuideView.tsx sin conectar,
    // por si se reactiva de forma segura (con auth) más adelante.
    // if (window.location.pathname.startsWith('/guia/')) {
    //     return (
    //         <Suspense fallback={<ModuleLoader />}>
    //             <PatientGuideView />
    //         </Suspense>
    //     );
    // }

    if (window.location.pathname === '/quick-view') {
        return (
            <Suspense fallback={<ModuleLoader />}>
                <QuickViewBridge />
            </Suspense>
        );
    }

    // Portal Médico (acceso anónimo sin login por /portal-medico o ?token=) APARCADO:
    // su diseño de acceso directo a la base ya no es válido (tablas cerradas por RLS,
    // acceso anónimo roto). PortalMedico.tsx y componentes de src/modules/portal-medico/
    // quedan en el repo sin conectar, para rediseñarlo más adelante. No borrar los archivos.
    // if (window.location.pathname === '/portal-medico' ||
    //     window.location.search.includes('token=')) {
    //     return (
    //         <Suspense fallback={<ModuleLoader />}>
    //             <PortalMedico />
    //         </Suspense>
    //     );
    // }

    // Ruta pública /mobile-mic/:token retirada junto con el feature de dictado remoto (ver nota arriba).

    if (!user) return <AuthView />;

    const renderView = () => {
        // Guard genérico: antes de renderizar, verifica hasModuleAccess(currentView)
        // para las vistas gateadas por permisos (NAV_ITEMS). Cubre cualquier vía por
        // la que currentView haya llegado acá, no solo el clic en el sidebar.
        if (!canSeeView(currentView)) {
            return <AccesoNoAutorizado onIrAVistaSegura={() => setCurrentView(firstVisibleModule())} />;
        }

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
            case 'asistente':           return <AsistenteDashboard />;
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
            case 'dashboard_cuarto_turno': return <DashboardCuartoTurno />;
            case 'solicitudes':         return <SolicitudesDashboard />;
            case 'protocolos':          return <ProtocolosDashboard />;
            case 'portal_institucional':
                if (user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN') return <PortalInstitucionalAdmin />;
                return <DashboardModule />;
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
