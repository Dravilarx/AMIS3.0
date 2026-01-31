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

// Assuming useView is a custom hook that manages the current view state
// For the purpose of this edit, we'll define a placeholder or assume it's imported elsewhere.
// If useView is not defined, this code will cause an error.
// For now, let's re-introduce the useState and keep the original App function signature
// as the instruction's provided code snippet seems to have a syntax error in the function declaration and useState replacement.
// I will apply the Supabase check as requested at the beginning of the App component.

function App() {
  const [currentView, setCurrentView] = useState<'dashboard' | 'tenders' | 'staffing' | 'logistics' | 'clinical' | 'audit' | 'shifts' | 'projects' | 'messaging' | 'dms' | 'ideation'>('dashboard');

  // Verificación de seguridad para Producción
  if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6 text-center">
        <div className="card-premium border-red-500/20 max-w-md">
          <h1 className="text-red-500 font-black text-xl mb-4">ERROR DE CONFIGURACIÓN</h1>
          <p className="text-white/60 text-sm mb-6">
            No se detectaron las credenciales de Supabase.
            Asegúrate de que las variables <strong>VITE_SUPABASE_URL</strong> y <strong>VITE_SUPABASE_ANON_KEY</strong> estén configuradas en Vercel.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-xs uppercase font-bold transition-all"
          >
            Reintentar
          </button>
          <div className="mt-8 text-[10px] text-white/10 font-mono">
            Build ID: {new Date().getTime()}
          </div>
        </div>
      </div>
    );
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
