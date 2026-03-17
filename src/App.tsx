import { useState } from 'react'
import { Layout } from './components/Layout'
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
import { AiKnowledgeBase } from './modules/ai-knowledge/AiKnowledgeBase'
import { AiAccessManager } from './modules/ai-access/AiAccessManager'
import { DispatchCenter } from './modules/dispatch/DispatchCenter'

function App() {
  const [currentView, setCurrentView] = useState<'dashboard' | 'tenders' | 'staffing' | 'logistics' | 'clinical' | 'audit' | 'shifts' | 'projects' | 'messaging' | 'dms' | 'ideation' | 'admin' | 'institutions' | 'news' | 'stat_multiris' | 'ai_knowledge' | 'ai_access' | 'dispatch'>('dashboard');

  if (window.location.pathname.startsWith('/guia/')) {
    return <PatientGuideView />;
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
      case 'admin': return <AdminModule />;
      case 'institutions': return <InstitutionsDashboard />;
      case 'news': return <NewsFeed />;
      case 'stat_multiris': return <StatMultirisModule />;
      case 'ai_knowledge': return <AiKnowledgeBase />;
      case 'ai_access': return <AiAccessManager />;
      case 'dispatch': return <DispatchCenter />;

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
