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

function App() {
  const [currentView, setCurrentView] = useState<'dashboard' | 'tenders' | 'staffing' | 'logistics' | 'clinical' | 'audit' | 'shifts' | 'projects' | 'messaging' | 'dms' | 'ideation'>('dashboard');

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
