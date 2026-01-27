import { useState } from 'react'
import { Layout } from './components/Layout'
import { TrendingUp, Users, ShieldAlert, Cpu } from 'lucide-react'
import { cn } from './lib/utils'
import { TenderDashboard } from './modules/tenders/TenderDashboard'
import { ProfessionalMatrix } from './modules/staffing/ProfessionalMatrix'
import { ExpenseTracker } from './modules/logistics/ExpenseTracker'
import { ClinicalWorkflowView } from './modules/clinical/ClinicalWorkflowView'
import { AuditorDashboard } from './modules/audit/AuditorDashboard'
import { ShiftManager } from './modules/staffing/ShiftManager'
import { ProjectBPM } from './modules/projects/ProjectBPM'
import { MessagingHub } from './modules/messaging/MessagingHub'
import { SemanticDMS } from './modules/dms/SemanticDMS'

function Card({ title, value, icon: Icon, trend }: any) {
  return (
    <div className="card-premium">
      <div className="flex items-center justify-between mb-4">
        <Icon className="w-5 h-5 text-white/40" />
        {trend && (
          <span className="text-xs font-medium text-emerald-400">+{trend}%</span>
        )}
      </div>
      <div>
        <p className="text-sm text-white/40 font-medium mb-1">{title}</p>
        <p className="text-2xl font-bold">{value}</p>
      </div>
    </div>
  )
}

function DashboardView() {
  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Bienvenido, Arquitecto</h1>
        <p className="text-white/40">Sistema Maestro de Gestión - Holding Portezuelo</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card title="Licitaciones Activas" value="12" icon={TrendingUp} trend="8" />
        <Card title="Personal en Turno" value="48" icon={Users} />
        <Card title="Alertas de Riesgo" value="2" icon={ShieldAlert} />
        <Card title="Procesos AI" value="1,240" icon={Cpu} trend="12" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card-premium min-h-[400px]">
          <h3 className="text-lg font-bold mb-6">Estado de la Matriz</h3>
          <div className="space-y-4">
            {[
              { name: 'Proyecto Boreal Alpha', risk: 3, status: 'Active' },
              { name: 'Licitación Vitalmédica 2026', risk: 7, status: 'Review' },
              { name: 'Mantenimiento Resomag', risk: 1, status: 'Draft' },
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/5">
                <div>
                  <p className="font-medium">{item.name}</p>
                  <p className="text-xs text-white/40">Riesgo Escala: {item.risk}/8</p>
                </div>
                <div className={cn(
                  "px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider",
                  item.risk > 5 ? "bg-red-500/20 text-red-400" : "bg-blue-500/20 text-blue-400"
                )}>
                  {item.status}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card-premium">
          <h3 className="text-lg font-bold mb-6">Agrawall Insights</h3>
          <div className="p-4 rounded-lg bg-white/5 border border-white/5 italic text-sm text-white/60">
            "El análisis actual detecta una desviación del 4% en la planificación de turnos de Resomag basada en la Matriz de Competencias."
          </div>
        </div>
      </div>
    </div>
  );
}

function App() {
  const [currentView, setCurrentView] = useState<'dashboard' | 'tenders' | 'staffing' | 'logistics' | 'clinical' | 'audit' | 'shifts' | 'projects' | 'messaging' | 'dms'>('dashboard');

  const renderView = () => {
    switch (currentView) {
      case 'dashboard': return <DashboardView />;
      case 'tenders': return <TenderDashboard />;
      case 'staffing': return <ProfessionalMatrix />;
      case 'logistics': return <ExpenseTracker />;
      case 'clinical': return <ClinicalWorkflowView />;
      case 'audit': return <AuditorDashboard />;
      case 'shifts': return <ShiftManager />;
      case 'projects': return <ProjectBPM />;
      case 'messaging': return <MessagingHub />;
      case 'dms': return <SemanticDMS />;
      default: return <DashboardView />;
    }
  };

  return (
    <Layout currentView={currentView} onNavigate={setCurrentView}>
      {renderView()}
    </Layout>
  )
}

export default App
