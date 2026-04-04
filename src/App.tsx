import { useState } from 'react'
import { Layout } from './components/Layout'
import { AuthView } from './components/AuthView'
import { useAuth } from './hooks/useAuth'
import { DashboardModule } from './modules/dashboard/DashboardModule'
import { TenderDashboard } from './modules/tenders/TenderDashboard'
import { ProfessionalMatrix } from './modules/staffing/ProfessionalMatrix'
import { ExpenseTracker } from './modules/logistics/ExpenseTracker'
import { ClinicalWorkflowView } from './modules/clinical/ClinicalWorkflowView'
import { AuditorDashboard } from './modules/audit/AuditorDashboard'
import { ShiftManager } from './modules/staffing/ShiftManager'
import { ProjectBPM } from './modules/projects/ProjectBPM'
import { MessagingHub } from './modules/messaging/MessagingHub'
import { SemanticDMS } from './modules/dms/SemanticDMS'
import { IdeaAnalyst } from './modules/ideation/IdeaAnalyst'
import { AdminModule } from './modules/admin/AdminModule'
import { InstitutionsDashboard } from './modules/institutions/InstitutionsDashboard'
import { NewsFeed } from './modules/news/NewsFeed'
import { StatMultirisModule } from './modules/stat-multiris/StatMultirisModule'
import { PatientGuideView } from './modules/clinical/PatientGuideView'
import { AiAccessManager } from './modules/ai-access/AiAccessManager'
import { DispatchCenter } from './modules/dispatch/DispatchCenter'
import { QuickViewBridge } from './modules/quick-view/QuickViewBridge'
import { MobileMicView } from './modules/remote-mic/MobileMicView'
import { B2BPortal } from './modules/b2b-portal/B2BPortal'

function App() {
  const { user } = useAuth();
  const [currentView, setCurrentView] = useState<'dashboard' | 'tenders' | 'staffing' | 'logistics' | 'clinical' | 'audit' | 'shifts' | 'projects' | 'messaging' | 'dms' | 'ideation' | 'admin' | 'institutions' | 'news' | 'stat_multiris' | 'ai_access' | 'dispatch' | 'b2b_portal' | 'ai_knowledge'>('dashboard');

  if (window.location.pathname.startsWith('/guia/')) {
    return <PatientGuideView />;
  }

  if (window.location.pathname === '/quick-view') {
    return <QuickViewBridge />;
  }

  const mobileMicToken = window.location.pathname.startsWith('/mobile-mic/') 
    ? window.location.pathname.split('/mobile-mic/')[1] 
    : null;

  if (mobileMicToken) {
    return <MobileMicView token={mobileMicToken} />;
  }

  // Protector de Rutas: Si no hay usuario, retorna vista Login
  if (!user) {
    return <AuthView />;
  }


  const renderView = () => {
    switch (currentView) {
      case 'dashboard': return <DashboardModule />;
      case 'tenders': return <TenderDashboard />;
      case 'staffing': return <ProfessionalMatrix />;
      case 'logistics': return <ExpenseTracker />;
      case 'clinical': return <ClinicalWorkflowView />;
      case 'audit': return <AuditorDashboard />;
      case 'shifts': return <ShiftManager />;
      case 'projects': return <ProjectBPM />;
      case 'messaging': return <MessagingHub />;
      case 'dms': return <SemanticDMS />;
      case 'ideation': return <IdeaAnalyst />;
      case 'admin': 
        if (user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN') return <AdminModule />;
        return <DashboardModule />;
      case 'institutions': return <InstitutionsDashboard />;
      case 'news': return <NewsFeed />;
      case 'stat_multiris': return <StatMultirisModule />;
      case 'ai_access': 
        if (user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN') return <AiAccessManager />;
        return <DashboardModule />;
      case 'dispatch': return <DispatchCenter />;
      case 'b2b_portal': return <B2BPortal />;

      default: return <DashboardModule />;
    }
  };

  return (
    <Layout currentView={currentView} onNavigate={setCurrentView}>
      {renderView()}
    </Layout>
  )
}

export default App
