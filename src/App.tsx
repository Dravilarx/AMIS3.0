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
import { useAuth } from './hooks/useAuth'
import { AuthView } from './components/AuthView'

function App() {
  const { user, loading } = useAuth();
  const [currentView, setCurrentView] = useState<'dashboard' | 'tenders' | 'staffing' | 'logistics' | 'clinical' | 'audit' | 'shifts' | 'projects' | 'messaging' | 'dms' | 'ideation' | 'admin' | 'institutions' | 'news'>('dashboard');

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.4em]">Iniciando Sistemas...</p>
        </div>
      </div>
    );
  }

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
      case 'admin': return <AdminModule />;
      case 'institutions': return <InstitutionsDashboard />;
      case 'news': return <NewsFeed />;
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
