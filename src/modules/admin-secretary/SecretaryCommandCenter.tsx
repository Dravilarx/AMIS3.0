import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  Inbox, 
  Activity, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  Search,
  ArrowRightLeft,
  ChevronRight,
  UserPlus,
  X,
  Shield
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useAudit } from '../../hooks/useAudit';
import { AddendumTriageView } from '../addendum-triage/AddendumTriageView';
import { useProfessionals } from '../../hooks/useProfessionals';
import { cn } from '../../lib/utils';
import { resolvePublicSignatureNameSync } from '../../lib/signatureUtils';

type TabType = 'triage' | 'traffic' | 'sla' | 'analytics';

export const SecretaryCommandCenter: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('traffic');
  const [reports, setReports] = useState<any[]>([]);
  const [slaConfigs, setSlaConfigs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    informed: 142,
    pending: 0,
    addendums: 0,
    avgTime: '42m'
  });

  const fetchStatsAndData = async () => {
    setLoading(true);
    // 1. Fetch Addendums count
    const { count: addendumsCount } = await supabase
      .from('addendum_requests')
      .select('*', { count: 'exact', head: true })
      .not('status', 'in', '("RESOLVED_ADMIN","RESOLVED_MEDIC")');
    
    // 2. Fetch Production Reports
    const { data: reportsData } = await supabase
      .from('multiris_production')
      .select('*')
      .is('fecha_validacion', null)
      .order('is_priority', { ascending: false })
      .order('fecha_examen', { ascending: true });
    
    // 3. Fetch SLA Configs
    const { data: slaData } = await supabase
      .from('multiris_sla_config')
      .select('*');

    setReports(reportsData || []);
    setSlaConfigs(slaData || []);
    
    setStats(prev => ({
      ...prev,
      addendums: addendumsCount || 0,
      pending: reportsData?.length || 0
    }));
    setLoading(false);
  };

  useEffect(() => {
    fetchStatsAndData();
    
    const channel = supabase
      .channel('secretary_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'addendum_requests' }, () => fetchStatsAndData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'multiris_production' }, () => fetchStatsAndData())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  return (
    <div className="flex flex-col h-full space-y-6 animate-in fade-in duration-700">
      {/* KPI Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KPI className="border-emerald-500/30" icon={CheckCircle2} label="Informados Hoy" value={stats.informed} color="text-emerald-400" />
        <KPI className="border-amber-500/30" icon={Clock} label="Pendientes Info" value={stats.pending} color="text-amber-400" />
        <KPI className="border-rose-500/30" icon={Inbox} label="Addendums en Cola" value={stats.addendums} color="text-rose-400" />
        <KPI className="border-indigo-500/30" icon={Activity} label="TSR Promedio" value={stats.avgTime} color="text-indigo-400" />
      </div>

      <div className="flex-1 flex gap-6 min-h-0">
        <div className="w-64 flex flex-col gap-2 shrink-0">
          <TabButton active={activeTab === 'traffic'} onClick={() => setActiveTab('traffic')} icon={ArrowRightLeft} label="Tráfico de Informes" badge={stats.pending} />
          <TabButton active={activeTab === 'triage'} onClick={() => setActiveTab('triage')} icon={Inbox} label="Triage Addendums" badge={stats.addendums} />
          <TabButton active={activeTab === 'sla'} onClick={() => setActiveTab('sla')} icon={AlertCircle} label="Monitor de Plazos" />
          <TabButton active={activeTab === 'analytics'} onClick={() => setActiveTab('analytics')} icon={BarChart3} label="Estadísticas" />
        </div>

        <div className="flex-1 bg-slate-900/40 border border-slate-800 rounded-3xl overflow-hidden flex flex-col relative shadow-2xl backdrop-blur-xl">
          {activeTab === 'traffic' && (
            <TrafficPanel 
              reports={reports} 
              loading={loading} 
              onRefresh={fetchStatsAndData} 
            />
          )}
          {activeTab === 'triage' && <AddendumTriageView />}
          {activeTab === 'sla' && <SLAMonitor reports={reports} slaConfigs={slaConfigs} />}
          {activeTab === 'analytics' && <div className="p-12 text-center text-slate-500 italic">Módulo Analítico en desarrollo...</div>}
        </div>
      </div>
    </div>
  );
};

// --- Panel de Tráfico con ASIGNACIÓN DINÁMICA (SUPERPODER) ---
const TrafficPanel = ({ reports, loading, onRefresh }: { reports: any[], loading: boolean, onRefresh: () => void }) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isAssigning, setIsAssigning] = useState(false);
  const { professionals } = useProfessionals();
  const { user } = useAuth();
  const { addAudit } = useAudit();
  const [pendingModal, setPendingModal] = useState<{ isOpen: boolean, report: any | null }>({ isOpen: false, report: null });
  const [pendingReason, setPendingReason] = useState<any>(null);
  const [pendingMessage, setPendingMessage] = useState('');

  const medicalStaff = professionals.filter(p => 
    p.clinicalRole === 'MED_STAFF' || p.clinicalRole === 'MED_CHIEF'
  );

  const toggleSelectAll = () => {
    if (selectedIds.size === reports.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(reports.map(r => r.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) newSelected.delete(id);
    else newSelected.add(id);
    setSelectedIds(newSelected);
  };

  const handleBulkAssign = async (medicName: string) => {
    if (selectedIds.size === 0 || !user) return;
    
    try {
      const userRole = user.app_role || 'ADMIN_SECRETARY';
      const userName = user.name || user.email;

      const { error } = await supabase
        .from('multiris_production')
        .update({ 
            radiologo_asignado: medicName,
            fecha_asignacion: new Date().toISOString(),
            reassigned_by: userName,
            reassigned_by_role: userRole,
            is_priority: false 
        })
        .in('id', Array.from(selectedIds));

      if (error) throw error;
      
      const selectedReports = reports.filter(r => selectedIds.has(r.id));
      for (const rep of selectedReports) {
        await addAudit({
          action: 'BULK_ASSIGN',
          description: `Examen [${rep.accession_number}] reasignado a [${medicName}] por [${userRole}]`,
          user_id: user.id,
          metadata: { 
            accession: rep.accession_number,
            original_medic: rep.radiologo_asignado,
            new_medic: medicName,
            role: userRole
          }
        });
      }

      setSelectedIds(new Set());
      setIsAssigning(false);
      onRefresh();
    } catch (err) {
      console.error('Error in bulk assignment:', err);
      alert('Error al reasignar estudios.');
    }
  };

  const handleSetPending = async () => {
    if (!pendingModal.report || !user) return;

    try {
      const publicAuthor = resolvePublicSignatureNameSync({
        clinicalRole: user.clinical_role,
        ownName: `${user.name} ${user.last_name || ''}`,
        supervisorName: professionals.find(p => p.id === user.supervisor_id)?.name
      });

      const { error } = await supabase
        .from('multiris_production')
        .update({
          status: 'PENDING_CENTER_ACTION',
          pending_reason: pendingReason,
          pending_message: pendingMessage,
          pending_author_name: publicAuthor
        })
        .eq('id', pendingModal.report.id);

      if (error) throw error;

      await addAudit({
        action: 'PENDING_CENTER',
        description: `Examen [${pendingModal.report.accession_number}] marcado como Pendiente: ${pendingReason}`,
        user_id: user.id
      });

      setPendingModal({ isOpen: false, report: null });
      setPendingReason(null);
      setPendingMessage('');
      onRefresh();
    } catch (err) {
      console.error('Error setting pending:', err);
    }
  };

  const handleResolvePending = async (report: any) => {
    try {
      const { error } = await supabase
        .from('multiris_production')
        .update({
          status: 'PENDING_INFO',
          pending_reason: null,
          pending_message: null,
          pending_author_name: null,
          is_priority: true, 
          fecha_asignacion: new Date().toISOString() 
        })
        .eq('id', report.id);

      if (error) throw error;
      onRefresh();
    } catch (err) {
      console.error('Error resolving pending:', err);
    }
  };

  return (
    <div className="flex flex-col h-full relative">
      <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/40 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-black uppercase tracking-[0.2em] text-slate-400">Canalización de Tráfico</h2>
          <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-400 rounded text-[9px] font-black border border-indigo-500/20 uppercase">Bulk Ready</span>
        </div>
        <div className="flex gap-2">
           <div className="relative">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
             <input type="text" placeholder="Buscar..." className="bg-slate-800/50 border border-slate-700/50 rounded-xl py-1.5 pl-9 pr-4 text-xs outline-none" />
           </div>
           <button onClick={() => onRefresh()} className="p-2 bg-slate-800/50 rounded-xl hover:bg-slate-700 transition-colors"><Activity className="w-3.5 h-3.5 text-indigo-400" /></button>
        </div>
      </div>
      
      <div className="flex-1 overflow-auto bg-slate-950/20">
        <table className="w-full text-left border-separate border-spacing-0">
          <thead className="sticky top-0 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 z-10 shadow-lg">
            <tr className="text-slate-500 text-[10px] font-black uppercase tracking-widest">
              <th className="p-4 border-b border-slate-800 w-12">
                <input 
                  type="checkbox" 
                  checked={selectedIds.size === reports.length && reports.length > 0} 
                  onChange={toggleSelectAll}
                  className="rounded border-slate-700 bg-slate-800 text-indigo-500 focus:ring-indigo-500"
                />
              </th>
              <th className="p-4 border-b border-slate-800">Paciente</th>
              <th className="p-4 border-b border-slate-800">Estudio / ACC</th>
              <th className="p-4 border-b border-slate-800">Ingreso</th>
              <th className="p-4 border-b border-slate-800">Médico Actual</th>
              <th className="p-4 border-b border-slate-800 text-right pr-6">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.02]">
            {loading ? (
              <tr><td colSpan={6} className="p-12 text-center text-slate-600 animate-pulse text-[10px] uppercase font-black">Sincronizando con StatMultiRIS...</td></tr>
            ) : reports.map((rep) => (
              <tr 
                key={rep.id} 
                className={cn(
                  "hover:bg-indigo-500/5 transition-all group relative border-b border-white/[0.02]", 
                  selectedIds.has(rep.id) && "bg-indigo-500/10",
                  rep.is_priority && "bg-rose-500/[0.04] shadow-[inset_0_0_20px_rgba(244,63,94,0.08)] border-l-2 border-l-rose-500/50"
                )}
              >
                <td className="p-4">
                  <input 
                    type="checkbox" 
                    checked={selectedIds.has(rep.id)} 
                    onChange={() => toggleSelect(rep.id)}
                    className="rounded border-slate-700 bg-slate-800 text-indigo-500 focus:ring-indigo-500"
                    onClick={(e) => { e.stopPropagation(); toggleSelect(rep.id); }}
                  />
                </td>
                <td className="p-4 cursor-pointer" onClick={() => toggleSelect(rep.id)}>
                  <p className="font-extrabold text-xs text-slate-200 group-hover:text-indigo-400 transition-colors uppercase">{rep.paciente_nombre}</p>
                  <p className="text-[10px] font-mono text-slate-500">{rep.paciente_id}</p>
                </td>
                <td className="p-4">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                       <p className="text-xs text-slate-300 font-bold leading-tight uppercase">{rep.examen_nombre}</p>
                       {rep.is_priority && (
                         <span className="flex items-center gap-1 px-1.5 py-0.5 bg-rose-500/20 text-rose-400 text-[8px] font-black uppercase rounded animate-pulse shadow-[0_0_10px_rgba(244,63,94,0.3)] border border-rose-500/30">
                           <Activity className="w-2.5 h-2.5" /> prioritario
                         </span>
                       )}
                    </div>
                    <p className="text-[10px] text-indigo-400/70 font-black uppercase mt-0.5">{rep.accession_number}</p>
                  </div>
                </td>
                <td className="p-4">
                  <p className="text-[10px] font-bold text-slate-400">
                    {new Date(rep.fecha_examen).toLocaleDateString([], { day: '2-digit', month: '2-digit' })} {new Date(rep.fecha_examen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </td>
                <td className="p-4">
                   <div className="flex flex-col gap-1.5">
                     <div className="flex items-center gap-2">
                       <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]" />
                       <span className="text-[10px] font-bold text-slate-300 uppercase tracking-tighter truncate max-w-[120px]">
                          {rep.radiologo_asignado || 'NO ASIGNADO'}
                       </span>
                     </div>
                     {rep.reassigned_by_role && (
                       <div className={cn(
                         "px-2 py-0.5 rounded text-[8px] font-black uppercase w-fit flex items-center gap-1",
                         rep.reassigned_by_role === 'MED_CHIEF' ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30" : "bg-slate-800/80 text-slate-500 border border-white/5"
                       )}>
                         {rep.reassigned_by_role === 'MED_CHIEF' ? <Shield className="w-2.5 h-2.5" /> : null}
                         {rep.reassigned_by_role === 'MED_CHIEF' ? 'Asignado por Jefatura' : 'Asignado por Secretaría'}
                       </div>
                     )}
                   </div>
                </td>
                <td className="p-4 text-right pr-6">
                  <div className="flex items-center justify-end gap-2">
                    {rep.status === 'PENDING_CENTER_ACTION' ? (
                      <button 
                        onClick={() => handleResolvePending(rep)}
                        className="px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-lg text-[9px] font-black uppercase border border-emerald-500/30 hover:bg-emerald-500 hover:text-white transition-all flex items-center gap-1.5 shadow-lg shadow-emerald-500/10"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Resolver
                      </button>
                    ) : (
                      <button 
                         onClick={() => setPendingModal({ isOpen: true, report: rep })}
                         className="px-3 py-1 bg-amber-500/10 text-amber-500/60 rounded-lg text-[9px] font-black uppercase border border-amber-500/20 hover:bg-amber-500/20 hover:text-amber-400 transition-all flex items-center gap-1.5"
                      >
                         <AlertCircle className="w-3.5 h-3.5" /> Pendiente
                      </button>
                    )}
                    <button className="p-2 text-slate-600 hover:text-indigo-400 transition-colors"><ChevronRight className="w-4 h-4" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 🚀 BARRA DE ASIGNACIÓN DINÁMICA (SUPERPODER) */}
      {selectedIds.size > 0 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 border border-indigo-500/50 shadow-[0_0_50px_rgba(99,102,241,0.2)] px-6 py-4 rounded-[2rem] flex items-center gap-8 animate-in slide-in-from-bottom-10 duration-500 z-50 backdrop-blur-2xl">
          <div className="flex items-center gap-4 border-r border-slate-800 pr-8">
            <div className="w-10 h-10 bg-indigo-500 rounded-full flex items-center justify-center text-white font-black shadow-lg shadow-indigo-500/20 animate-bounce">
              {selectedIds.size}
            </div>
            <div>
              <p className="text-[10px] font-black uppercase text-indigo-400 tracking-widest leading-none mb-1">Estudios Marcados</p>
              <p className="text-xs font-bold text-white leading-none">Listo para Reasiganción</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
             {isAssigning ? (
               <div className="flex items-center gap-2 bg-slate-800 rounded-2xl p-1 pr-4 animate-in fade-in zoom-in duration-300">
                 <select 
                    autoFocus
                    className="bg-transparent text-xs font-bold text-indigo-400 outline-none px-4 py-2 border-none focus:ring-0 min-w-[200px]"
                    onChange={(e) => handleBulkAssign(e.target.value)}
                    onBlur={() => setIsAssigning(false)}
                 >
                   <option value="">— Elija un Radiólogo —</option>
                   {medicalStaff.map(doc => (
                     <option key={doc.id} value={`${doc.name} ${doc.lastName}`}>{doc.name} {doc.lastName} ({doc.clinicalRole})</option>
                   ))}
                 </select>
                 <button onClick={() => setIsAssigning(false)} className="p-1.5 bg-slate-700/50 rounded-full hover:bg-rose-500/20 text-slate-500 hover:text-rose-500 transition-all"><X className="w-3.5 h-3.5" /></button>
               </div>
             ) : (
               <>
                 <button 
                  onClick={() => setIsAssigning(true)}
                  className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-indigo-600/20 transition-all active:scale-95"
                 >
                   <UserPlus className="w-4 h-4" />
                   Asignar Médico en Bloque
                 </button>
                 <button 
                  onClick={() => setSelectedIds(new Set())}
                  className="p-3 bg-slate-800 text-slate-400 hover:text-rose-400 rounded-2xl transition-colors"
                 >
                   <X className="w-4 h-4" />
                 </button>
               </>
             )}
          </div>
        </div>
      )}

      {/* 🛡️ MODAL DE EXAMEN PENDIENTE POR CENTRO */}
      {pendingModal.isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-300 p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 shadow-2xl relative">
            <button onClick={() => setPendingModal({ isOpen: false, report: null })} className="absolute top-6 right-6 p-2 text-slate-500 hover:text-white bg-slate-800 rounded-full transition-all">
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-4 mb-8">
              <div className="p-4 bg-amber-500/20 rounded-2xl border border-amber-500/30">
                <AlertCircle className="w-8 h-8 text-amber-500" />
              </div>
              <div>
                <h3 className="text-xl font-black text-white uppercase tracking-tight">Marcar como Pendiente</h3>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">SLA Holding Inactivo · Requiere Acción del Centro</p>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-3 pl-1">Motivo del Pendiente</label>
                <div className="grid grid-cols-2 gap-2">
                  {['Examen incompleto', 'Faltan antecedentes', 'Faltan previos', 'Prestación incorrecta', 'Otra'].map(reason => (
                    <button
                      key={reason}
                      onClick={() => setPendingReason(reason)}
                      className={cn(
                        "px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-tighter border transition-all text-left",
                        pendingReason === reason ? "bg-indigo-600 border-indigo-400 text-white shadow-lg shadow-indigo-600/30" : "bg-slate-800 border-slate-700 text-slate-500 hover:bg-slate-700"
                      )}
                    >
                      {reason}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-3 pl-1">Instrucciones para el Centro (B2B)</label>
                <textarea
                  value={pendingMessage}
                  onChange={(e) => setPendingMessage(e.target.value)}
                  placeholder="Ej: Favor adjuntar informe de biopsia previo para comparar..."
                  className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl p-4 text-xs font-bold text-slate-300 outline-none focus:border-indigo-500/50 transition-all min-h-[120px] resize-none"
                />
              </div>

              <div className="pt-2">
                <button
                  onClick={handleSetPending}
                  disabled={!pendingReason}
                  className="w-full bg-gradient-to-r from-amber-600 to-orange-600 text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-amber-600/20 disabled:opacity-30 disabled:grayscale transition-all active:scale-95"
                >
                  <Shield className="w-4 h-4 inline-block mr-2 -mt-0.5" />
                  Notificar al Centro (Firmado por Supervisor)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const SLAMonitor = ({ reports, slaConfigs }: { reports: any[], slaConfigs: any[] }) => {
  const calculateSLA = (report: any) => {
    if (!report.fecha_asignacion) return { remaining: 0, status: 'normal', percent: 0 };
    
    const config = slaConfigs.find(c => 
      (c.institucion === report.aetitle || !c.institucion) && 
      (c.modalidad === report.modalidad || !c.modalidad) &&
      c.tipo === report.tipo
    ) || { target_minutes: 60 };

    const start = new Date(report.fecha_asignacion).getTime();
    const now = new Date().getTime();
    const elapsed = (now - start) / (1000 * 60);
    const remaining = Math.max(0, config.target_minutes - elapsed);
    const percent = Math.min(100, (elapsed / config.target_minutes) * 100);

    let status = 'normal';
    if (percent > 90) status = 'urgente';
    else if (percent > 60) status = 'proximo';

    return { remaining: Math.round(remaining), status, percent };
  };

  const urgentReports = reports.filter(r => r.status === 'PENDING_INFO' && calculateSLA(r).status === 'urgente');
  const warningReports = reports.filter(r => r.status === 'PENDING_INFO' && calculateSLA(r).status === 'proximo');
  const normalReports = reports.filter(r => r.status === 'PENDING_INFO' && calculateSLA(r).status === 'normal');
  const pausedReports = reports.filter(r => r.status === 'PENDING_CENTER_ACTION');

  const Column = ({ title, items, colorClass, status }: any) => (
    <div className="bg-slate-900/40 border border-slate-800 rounded-[2rem] p-6 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">{title}</h3>
        <div className={cn("w-2 h-2 rounded-full shadow-[0_0_10px]", colorClass)} />
      </div>
      <div className="space-y-3">
        {items.length === 0 ? (
          <div className="py-8 text-center border-2 border-dashed border-slate-800/50 rounded-2xl">
            <p className="text-[10px] font-bold text-slate-700 uppercase tracking-widest">Sin Pendientes</p>
          </div>
        ) : (
          items.map((rep: any) => {
            const sla = calculateSLA(rep);
            return (
              <div key={rep.id} className="p-4 bg-slate-950/40 border border-white/5 rounded-2xl flex items-center justify-between group hover:border-indigo-500/30 transition-all">
                <div className="flex-1 min-w-0 mr-4">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-[10px] font-black text-slate-200 uppercase truncate">{rep.examen_nombre}</p>
                    {rep.is_priority && <Activity className="w-3 h-3 text-rose-500 animate-pulse shrink-0" />}
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-[9px] text-slate-500 font-mono italic">
                      {status === 'PAUSADO' ? '⛔ SLA CONGELADO' : `${sla.remaining} min restantes`}
                    </p>
                    <span className="text-[8px] text-slate-600 font-black uppercase px-1.5 py-0.5 bg-slate-800 rounded">{rep.aetitle}</span>
                  </div>
                </div>
                <div className="w-10 h-1 bg-slate-800 rounded-full overflow-hidden">
                   <div className={cn("h-full transition-all duration-1000", colorClass)} style={{ width: `${status === 'PAUSADO' ? 0 : sla.percent}%` }} />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );

  return (
    <div className="p-6 grid grid-cols-1 lg:grid-cols-4 gap-6 overflow-auto animate-in fade-in slide-in-from-right-4 duration-500">
      <Column title="🚨 Críticos" items={urgentReports} colorClass="bg-rose-500 shadow-rose-500/40" status="URGENTE" />
      <Column title="⚠️ Próximos" items={warningReports} colorClass="bg-amber-500 shadow-amber-500/40" status="PROXIMO" />
      <Column title="🟢 A Tiempo" items={normalReports} colorClass="bg-emerald-500 shadow-emerald-500/40" status="NORMAL" />
      <Column title="🛡️ Pausa B2B" items={pausedReports} colorClass="bg-indigo-500 shadow-indigo-500/40" status="PAUSADO" />
    </div>
  );
};

const KPI = ({ icon: Icon, label, value, color, className }: any) => (
  <div className={cn("bg-slate-900/40 border border-slate-800 p-5 rounded-3xl flex items-center gap-5 backdrop-blur-sm shadow-xl", className)}>
    <div className={cn("p-3 rounded-2xl bg-white/5 shadow-inner", color)}><Icon className="w-5 h-5 shadow-sm" /></div>
    <div>
      <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 mb-0.5">{label}</p>
      <p className={cn("text-2xl font-black tracking-tighter leading-none", color)}>{value}</p>
    </div>
  </div>
);

const TabButton = ({ active, onClick, icon: Icon, label, badge }: any) => (
  <button 
    onClick={onClick}
    className={cn(
      "flex items-center justify-between gap-3 px-5 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.15em] transition-all duration-500 group",
      active ? "bg-indigo-600 shadow-xl shadow-indigo-600/30 text-white" : "bg-slate-900/20 text-slate-500 hover:bg-slate-800 hover:text-slate-300"
    )}
  >
    <div className="flex items-center gap-3">
      <Icon className={cn("w-4 h-4 transition-transform group-hover:scale-110", active ? "text-white" : "text-slate-600")} />
      {label}
    </div>
    {badge > 0 && (
      <span className={cn("px-2 py-0.5 rounded-lg text-[9px] font-black", active ? "bg-black/20 text-white" : "bg-rose-500/10 text-rose-500 border border-rose-500/20")}>
        {badge}
      </span>
    )}
  </button>
);
