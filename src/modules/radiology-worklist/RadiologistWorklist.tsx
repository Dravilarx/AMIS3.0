import React, { useState, useEffect, useMemo } from 'react';
import {
  Activity,
  Search,
  Clock,
  CheckCircle2,
  FileText,
  RefreshCw,
  Flame,
  ShieldAlert,
  AlertTriangle,
  X,
  Send,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { cn } from '../../lib/utils';
import { resolvePublicSignatureNameSync } from '../../lib/signatureUtils';
import { resolvePatientId, getIdBadgeStyle, type PatientIdSource } from '../../lib/adaptiveIdentity';

interface WorklistReport {
  id: string;
  modalidad: string;
  tipo: string;
  fecha_examen: string | null;
  fecha_asignacion: string | null;
  fecha_validacion: string | null;
  aetitle: string;
  radiologo_asignado: string;
  radiologo_informado: string;
  radiologo_validado: string;
  status: string | null;
  is_priority: boolean;
  pending_reason: string | null;
  pending_message: string | null;
  pending_author_name: string | null;
  accession_number: string | null;
  paciente_nombre: string | null;
  paciente_id: string | null;
  examen_nombre: string | null;
  external_patient_id: string | null;
  patient_id_source: PatientIdSource;
  is_critical_finding: boolean;
  critical_finding_notes: string | null;
  irad_status: 'NOT_REQUESTED' | 'PENDING_IRAD' | 'READY';
  irad_package_url: string | null;
  irad_package_type: string[] | null;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string; borderColor: string }> = {
  PENDING_INFO: { label: 'Sin Informar', color: 'text-amber-400', bgColor: 'bg-amber-500/10', borderColor: 'border-amber-500/20' },
  PENDING_CENTER_ACTION: { label: 'Pendiente Centro', color: 'text-rose-400', bgColor: 'bg-rose-500/10', borderColor: 'border-rose-500/20' },
  INFORMED: { label: 'Informado', color: 'text-sky-400', bgColor: 'bg-sky-500/10', borderColor: 'border-sky-500/20' },
  VALIDATED: { label: 'Validado', color: 'text-emerald-400', bgColor: 'bg-emerald-500/10', borderColor: 'border-emerald-500/20' },
};

export const RadiologistWorklist: React.FC = () => {
  const { user } = useAuth();
  const [reports, setReports] = useState<WorklistReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [refreshKey, setRefreshKey] = useState(0);
  const [criticalModal, setCriticalModal] = useState<{ report: WorklistReport } | null>(null);
  const [criticalNotes, setCriticalNotes] = useState('');
  const [dispatching, setDispatching] = useState(false);

  // ── Data Fetching ──
  const fetchReports = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('multiris_production')
        .select('*')
        .order('is_priority', { ascending: false })
        .order('fecha_examen', { ascending: true });

      // MED_STAFF solo ve sus informes asignados
      if (user?.app_role === 'MED_STAFF' && user?.name) {
        query = query.eq('radiologo_asignado', user.name);
      }

      // Filtro por estado
      if (statusFilter === 'pending') {
        query = query.is('fecha_validacion', null);
      } else if (statusFilter === 'validated') {
        query = query.not('fecha_validacion', 'is', null);
      }

      const { data, error } = await query;
      if (error) throw error;
      setReports(data || []);
    } catch (err) {
      console.error('Error fetching worklist:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();

    // Realtime subscription
    const channel = supabase
      .channel('worklist-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'multiris_production' }, () => {
        fetchReports();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [statusFilter, refreshKey, user?.name]);

  // ── Filtered & Sorted Data ──
  const filteredReports = useMemo(() => {
    if (!searchTerm.trim()) return reports;
    const term = searchTerm.toLowerCase();
    return reports.filter(r =>
      r.paciente_nombre?.toLowerCase().includes(term) ||
      r.accession_number?.toLowerCase().includes(term) ||
      r.examen_nombre?.toLowerCase().includes(term) ||
      r.modalidad?.toLowerCase().includes(term) ||
      r.aetitle?.toLowerCase().includes(term)
    );
  }, [reports, searchTerm]);

  // ── Stats ──
  const stats = useMemo(() => ({
    total: reports.length,
    priority: reports.filter(r => r.is_priority).length,
    pendingCenter: reports.filter(r => r.status === 'PENDING_CENTER_ACTION').length,
    informed: reports.filter(r => r.fecha_validacion).length,
    critical: reports.filter(r => r.is_critical_finding).length,
  }), [reports]);

  // ── Critical Finding Dispatch ──
  const handleCriticalFinding = async () => {
    if (!criticalModal || !user) return;
    setDispatching(true);
    const rep = criticalModal.report;

    // Identity Shield: resolver nombre público
    const signerName = resolvePublicSignatureNameSync({
      clinicalRole: user.app_role,
      ownName: user.name || 'Médico Radiólogo',
      supervisorName: (user as any).supervisor_name,
    });

    try {
      // 1. Marcar en DB
      await supabase.from('multiris_production').update({
        is_critical_finding: true,
        critical_finding_notes: criticalNotes || null,
        critical_finding_at: new Date().toISOString(),
        critical_finding_by: signerName,
      }).eq('id', rep.id);

      // 2. Disparar alerta via Edge Function
      await supabase.functions.invoke('dispatch-global-alerts', {
        body: {
          alert_type: 'CRITICAL_FINDING',
          report_id: rep.id,
          patient_rut: rep.paciente_id,
          patient_name: rep.paciente_nombre,
          exam_name: rep.examen_nombre || rep.tipo,
          accession_number: rep.accession_number,
          center_aetitle: rep.aetitle,
          critical_notes: criticalNotes,
          author_name: user.name,
          author_clinical_role: user.app_role,
          author_supervisor_name: (user as any).supervisor_name,
        }
      });

      setCriticalModal(null);
      setCriticalNotes('');
      fetchReports();
    } catch (err) {
      console.error('Error dispatching critical finding:', err);
    } finally {
      setDispatching(false);
    }
  };

  // ── IRAD Recovery ──
  const handleIRADRequest = async (rep: WorklistReport) => {
    if (rep.irad_status !== 'NOT_REQUESTED') return;
    try {
      await supabase.functions.invoke('request-archived-study', {
        body: {
          action: 'REQUEST',
          report_id: rep.id,
          patient_id: rep.paciente_id,
          patient_id_source: rep.patient_id_source,
          accession_number: rep.accession_number,
          center_aetitle: rep.aetitle,
          package_types: ['DICOM', 'ORDEN', 'ANTECEDENTES'],
        }
      });
      fetchReports();
    } catch (err) {
      console.error('Error requesting IRAD:', err);
    }
  };

  const formatDate = (date: string | null) => {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: '2-digit' });
  };

  const formatTime = (date: string | null) => {
    if (!date) return '';
    return new Date(date).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
  };

  const getElapsedHours = (dateStr: string | null) => {
    if (!dateStr) return null;
    const diff = Date.now() - new Date(dateStr).getTime();
    return Math.floor(diff / (1000 * 60 * 60));
  };

  if (loading && reports.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] animate-in fade-in duration-700">
        <div className="relative">
          <div className="w-20 h-20 rounded-full border-4 border-brand-primary/20 border-t-brand-primary animate-spin" />
          <Activity className="w-8 h-8 text-brand-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
        </div>
        <p className="mt-8 text-[10px] text-brand-text/40 font-bold uppercase tracking-[0.4em] animate-pulse">
          Cargando Worklist Radiológica...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-1000">
      {/* ── Master Header ── */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-brand-primary/10 rounded-lg">
              <Activity className="w-4 h-4 text-brand-primary" />
            </div>
            <span className="text-[10px] font-black text-brand-primary uppercase tracking-[0.3em]">
              Worklist Radiológica
            </span>
          </div>
          <h1 className="text-4xl font-black text-brand-text tracking-tight uppercase leading-none">
            Mis <span className="text-brand-primary">Informes</span>
          </h1>
          <p className="text-sm text-brand-text/50 font-bold max-w-xl">
            Lista de trabajo con priorización automática. Los estudios devueltos por el centro aparecen en la cima.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setRefreshKey(k => k + 1)}
            className="p-3.5 bg-brand-surface border border-brand-border rounded-2xl hover:border-brand-primary/30 transition-all group"
            title="Actualizar"
          >
            <RefreshCw className={cn("w-4 h-4 text-brand-text/40 group-hover:text-brand-primary transition-colors", loading && "animate-spin")} />
          </button>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card-premium p-6 group hover:border-brand-primary/30 transition-all">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-brand-bg rounded-xl border border-brand-border">
              <FileText className="w-4 h-4 text-brand-text/40" />
            </div>
          </div>
          <p className="text-3xl font-black text-brand-text">{stats.total}</p>
          <p className="text-[9px] text-brand-text/40 uppercase font-black tracking-widest mt-1">En Worklist</p>
        </div>
        <div className={cn("card-premium p-6 group transition-all", stats.priority > 0 && "border-rose-500/30 bg-rose-500/[0.03]")}>
          <div className="flex items-center justify-between mb-3">
            <div className={cn("p-2 rounded-xl border", stats.priority > 0 ? "bg-rose-500/10 border-rose-500/20" : "bg-brand-bg border-brand-border")}>
              <Flame className={cn("w-4 h-4", stats.priority > 0 ? "text-rose-500 animate-pulse" : "text-brand-text/40")} />
            </div>
            {stats.priority > 0 && (
              <span className="text-[8px] font-black text-rose-500 uppercase tracking-widest animate-pulse">URGENTE</span>
            )}
          </div>
          <p className={cn("text-3xl font-black", stats.priority > 0 ? "text-rose-500" : "text-brand-text")}>{stats.priority}</p>
          <p className="text-[9px] text-brand-text/40 uppercase font-black tracking-widest mt-1">Prioritarios</p>
        </div>
        <div className="card-premium p-6 group hover:border-amber-500/30 transition-all">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-amber-500/10 rounded-xl border border-amber-500/20">
              <ShieldAlert className="w-4 h-4 text-amber-500" />
            </div>
          </div>
          <p className="text-3xl font-black text-brand-text">{stats.pendingCenter}</p>
          <p className="text-[9px] text-brand-text/40 uppercase font-black tracking-widest mt-1">Pend. Centro</p>
        </div>
        <div className="card-premium p-6 group hover:border-emerald-500/30 transition-all">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </div>
          </div>
          <p className="text-3xl font-black text-brand-text">{stats.informed}</p>
          <p className="text-[9px] text-brand-text/40 uppercase font-black tracking-widest mt-1">Validados</p>
        </div>
      </div>

      {/* ── Filters Bar ── */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4">
        <div className="relative group flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-text/20 group-hover:text-brand-primary transition-colors" />
          <input
            type="text"
            placeholder="Buscar paciente, accession, examen..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-brand-surface border border-brand-border rounded-2xl pl-11 pr-6 py-3.5 text-xs focus:outline-none focus:border-brand-primary/30 focus:ring-4 focus:ring-brand-primary/5 w-full transition-all text-brand-text placeholder:text-brand-text/20 shadow-sm font-bold"
          />
        </div>
        <div className="flex items-center gap-2 p-1.5 bg-brand-surface border border-brand-border rounded-2xl shadow-sm">
          {[
            { id: 'pending', label: 'Pendientes' },
            { id: 'validated', label: 'Validados' },
            { id: 'all', label: 'Todos' },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setStatusFilter(f.id)}
              className={cn(
                "px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                statusFilter === f.id
                  ? "bg-brand-primary text-white shadow-lg shadow-orange-500/20"
                  : "text-brand-text/40 hover:text-brand-text hover:bg-brand-bg"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Worklist Table ── */}
      <div className="card-premium p-0 overflow-hidden border-brand-border shadow-2xl">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-brand-border bg-brand-surface">
              <th className="py-4 px-5 text-[9px] font-black uppercase tracking-[0.2em] text-brand-text/40 w-8"></th>
              <th className="py-4 px-5 text-[9px] font-black uppercase tracking-[0.2em] text-brand-text/40">Paciente</th>
              <th className="py-4 px-5 text-[9px] font-black uppercase tracking-[0.2em] text-brand-text/40">Examen</th>
              <th className="py-4 px-5 text-[9px] font-black uppercase tracking-[0.2em] text-brand-text/40">Modalidad</th>
              <th className="py-4 px-5 text-[9px] font-black uppercase tracking-[0.2em] text-brand-text/40">Centro</th>
              <th className="py-4 px-5 text-[9px] font-black uppercase tracking-[0.2em] text-brand-text/40">Fecha Examen</th>
              <th className="py-4 px-5 text-[9px] font-black uppercase tracking-[0.2em] text-brand-text/40">Espera</th>
              <th className="py-4 px-5 text-[9px] font-black uppercase tracking-[0.2em] text-brand-text/40">Estado</th>
              <th className="py-4 px-5 text-[9px] font-black uppercase tracking-[0.2em] text-brand-text/40">IRAD</th>
              <th className="py-4 px-5 text-[9px] font-black uppercase tracking-[0.2em] text-brand-text/40 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredReports.length === 0 ? (
              <tr>
                <td colSpan={10} className="py-20 text-center">
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-16 h-16 bg-brand-surface rounded-full flex items-center justify-center border border-brand-border">
                      <CheckCircle2 className="w-7 h-7 text-brand-text/10" />
                    </div>
                    <p className="text-brand-text/30 uppercase font-black tracking-[0.2em] text-[11px]">
                      {statusFilter === 'pending' ? 'Sin informes pendientes' : 'No hay resultados'}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredReports.map((rep) => {
                const elapsed = getElapsedHours(rep.fecha_examen);
                const isUrgent = elapsed !== null && elapsed > 48;
                const statusConf = STATUS_CONFIG[rep.status || 'PENDING_INFO'] || STATUS_CONFIG.PENDING_INFO;

                return (
                  <tr
                    key={rep.id}
                    className={cn(
                      "border-b border-brand-border/40 hover:bg-brand-bg/50 transition-all duration-300 cursor-pointer group",
                      rep.is_priority && "bg-rose-500/[0.04] shadow-[inset_0_0_20px_rgba(244,63,94,0.08)] border-l-2 border-l-rose-500/50",
                      isUrgent && !rep.is_priority && "bg-amber-500/[0.02]"
                    )}
                  >
                    {/* Priority Indicator */}
                    <td className="py-3.5 px-5">
                      {rep.is_priority && (
                        <div className="relative flex items-center justify-center">
                          <div className="absolute w-6 h-6 bg-rose-500/20 rounded-full animate-ping" />
                          <Flame className="w-4 h-4 text-rose-500 animate-pulse relative z-10" />
                        </div>
                      )}
                    </td>

                    {/* Patient */}
                    <td className="py-3.5 px-5">
                      <p className="text-[12px] font-black text-brand-text truncate max-w-[180px]">
                        {rep.paciente_nombre || 'Sin nombre'}
                      </p>
                      {(() => {
                        const pid = resolvePatientId({
                          paciente_id: rep.paciente_id,
                          external_patient_id: rep.external_patient_id,
                          patient_id_source: rep.patient_id_source,
                        });
                        const badge = getIdBadgeStyle(pid.source);
                        return (
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[9px] text-brand-text/40 font-bold">
                              {pid.value}
                            </span>
                            <span className={cn(
                              "px-1.5 py-0.5 rounded text-[7px] font-black uppercase tracking-wider border",
                              badge.bgClass, badge.textClass, badge.borderClass
                            )}>
                              {badge.text}
                            </span>
                          </div>
                        );
                      })()}
                    </td>

                    {/* Exam */}
                    <td className="py-3.5 px-5">
                      <p className="text-[11px] font-bold text-brand-text truncate max-w-[200px]">
                        {rep.examen_nombre || rep.tipo || '—'}
                      </p>
                      {rep.is_priority && (
                        <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 bg-rose-500/10 border border-rose-500/20 rounded-md text-[8px] font-black text-rose-400 uppercase tracking-wider">
                          <Activity className="w-2.5 h-2.5 animate-pulse" />
                          RETORNO PRIORITARIO
                        </span>
                      )}
                    </td>

                    {/* Modality */}
                    <td className="py-3.5 px-5">
                      <span className="px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-brand-bg border border-brand-border text-brand-text/60">
                        {rep.modalidad || '—'}
                      </span>
                    </td>

                    {/* Center */}
                    <td className="py-3.5 px-5">
                      <p className="text-[10px] font-bold text-brand-text/50 truncate max-w-[120px]">
                        {rep.aetitle || '—'}
                      </p>
                    </td>

                    {/* Date */}
                    <td className="py-3.5 px-5">
                      <p className="text-[11px] font-black text-brand-text">{formatDate(rep.fecha_examen)}</p>
                      <p className="text-[9px] text-brand-text/40 font-bold">{formatTime(rep.fecha_examen)}</p>
                    </td>

                    {/* Elapsed */}
                    <td className="py-3.5 px-5">
                      {elapsed !== null ? (
                        <div className={cn(
                          "flex items-center gap-1.5 text-[10px] font-black",
                          elapsed > 48 ? "text-rose-400" : elapsed > 24 ? "text-amber-400" : "text-brand-text/40"
                        )}>
                          <Clock className="w-3 h-3" />
                          {elapsed}h
                        </div>
                      ) : (
                        <span className="text-[10px] text-brand-text/20">—</span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-5">
                      <span className={cn(
                        "inline-flex px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border shadow-sm",
                        statusConf.bgColor, statusConf.color, statusConf.borderColor
                      )}>
                        {statusConf.label}
                      </span>
                      {rep.status === 'PENDING_CENTER_ACTION' && rep.pending_reason && (
                        <p className="text-[8px] text-rose-400/70 font-bold mt-1 truncate max-w-[140px]">
                          {rep.pending_reason}
                        </p>
                      )}
                    </td>

                    {/* IRAD Semaphore */}
                    <td className="py-3.5 px-5">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (rep.irad_status === 'READY' && rep.irad_package_url) {
                            window.open(rep.irad_package_url, '_blank');
                          } else {
                            handleIRADRequest(rep);
                          }
                        }}
                        disabled={rep.irad_status === 'PENDING_IRAD'}
                        title={{
                          NOT_REQUESTED: 'Solicitar archivo IRAD (DICOM + Órdenes + PDFs)',
                          PENDING_IRAD: 'Recuperación en progreso...',
                          READY: 'Paquete disponible — clic para descargar',
                        }[rep.irad_status]}
                        className={cn(
                          "flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[9px] font-black uppercase tracking-wider transition-all",
                          rep.irad_status === 'NOT_REQUESTED' && "bg-brand-bg border-brand-border text-brand-text/30 hover:border-brand-primary/30 hover:text-brand-primary",
                          rep.irad_status === 'PENDING_IRAD' && "bg-sky-500/10 border-sky-500/30 text-sky-400 cursor-wait",
                          rep.irad_status === 'READY' && "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20",
                        )}
                      >
                        <span className={cn(
                          "w-2 h-2 rounded-full flex-shrink-0",
                          rep.irad_status === 'NOT_REQUESTED' && "bg-brand-text/20",
                          rep.irad_status === 'PENDING_IRAD' && "bg-sky-400 animate-pulse",
                          rep.irad_status === 'READY' && "bg-emerald-400",
                        )} />
                        {rep.irad_status === 'NOT_REQUESTED' && 'Solicitar'}
                        {rep.irad_status === 'PENDING_IRAD' && 'Procesando'}
                        {rep.irad_status === 'READY' && 'Disponible'}
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-5 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setCriticalModal({ report: rep });
                          setCriticalNotes('');
                        }}
                        disabled={rep.is_critical_finding}
                        className={cn(
                          "p-2 rounded-xl border transition-all",
                          rep.is_critical_finding
                            ? "bg-red-500/10 border-red-500/30 text-red-400 cursor-default"
                            : "border-brand-border hover:bg-red-500 hover:border-red-500 hover:text-white text-brand-text/30 hover:shadow-lg hover:shadow-red-500/20"
                        )}
                        title={rep.is_critical_finding ? 'Hallazgo Crítico Reportado' : 'Marcar Hallazgo Crítico'}
                      >
                        <AlertTriangle className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ── Footer count ── */}
      <div className="flex items-center justify-between px-2">
        <p className="text-[10px] text-brand-text/30 font-bold uppercase tracking-widest">
          {filteredReports.length} estudio{filteredReports.length !== 1 ? 's' : ''} en vista
        </p>
        <p className="text-[10px] text-brand-text/20 font-bold">
          Actualización en tiempo real activa
        </p>
      </div>

      {/* ── Critical Finding Modal ── */}
      {criticalModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-brand-surface border border-brand-border rounded-3xl shadow-2xl w-full max-w-lg p-8 space-y-6 animate-in zoom-in-95 duration-300">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-red-500/10 rounded-xl border border-red-500/20">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-brand-text uppercase tracking-tight">Hallazgo Crítico</h3>
                  <p className="text-[10px] text-brand-text/40 font-bold uppercase tracking-widest">Protocolo de Alerta Vital</p>
                </div>
              </div>
              <button onClick={() => setCriticalModal(null)} className="p-2 hover:bg-brand-bg rounded-xl transition-colors">
                <X className="w-5 h-5 text-brand-text/40" />
              </button>
            </div>

            <div className="p-4 bg-red-500/5 border border-red-500/20 rounded-2xl space-y-2">
              <p className="text-[11px] font-black text-red-400 uppercase tracking-widest">⚠️ Esta acción disparará una alerta inmediata</p>
              <p className="text-[10px] text-brand-text/50 font-bold">
                Se notificará al centro B2B vía Telegram y Email. El hallazgo quedará registrado de forma permanente.
              </p>
            </div>

            <div className="space-y-3">
              <p className="text-[10px] font-black text-brand-text/40 uppercase tracking-widest">Paciente</p>
              <p className="text-sm font-black text-brand-text">{criticalModal.report.paciente_nombre || 'Sin nombre'}</p>
              <p className="text-[10px] font-black text-brand-text/40 uppercase tracking-widest mt-4">Notas del Hallazgo (Opcional)</p>
              <textarea
                value={criticalNotes}
                onChange={(e) => setCriticalNotes(e.target.value)}
                placeholder="Describa brevemente el hallazgo crítico..."
                className="w-full bg-brand-bg border border-brand-border rounded-xl px-4 py-3 text-sm text-brand-text placeholder:text-brand-text/20 focus:outline-none focus:border-red-500/30 focus:ring-4 focus:ring-red-500/5 resize-none h-24 font-bold"
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setCriticalModal(null)}
                className="flex-1 py-3.5 bg-brand-bg border border-brand-border rounded-2xl text-[10px] font-black uppercase tracking-widest text-brand-text/40 hover:text-brand-text transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleCriticalFinding}
                disabled={dispatching}
                className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-red-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-red-700 transition-colors shadow-xl shadow-red-500/20 disabled:opacity-50"
              >
                {dispatching ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                {dispatching ? 'Enviando...' : 'Confirmar y Alertar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
