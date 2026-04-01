import React, { useState, useEffect, useCallback } from 'react';
import {
  Headphones, AlertTriangle, Clock, CheckCircle2, X, User,
  RefreshCw, MessageCircle, Building2, ChevronRight,
  Radio, Zap, ArrowRightLeft, Eye, Shield, WifiOff, Wifi,
  Volume2
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { supabase } from '../../lib/supabase';

// ═══════════════════════════════════════════════════════════════
// 🖥️ AMIS 3.0 — Centro de Despacho (Torre de Control)
// ═══════════════════════════════════════════════════════════════
// Conectado a Supabase Realtime para:
//   • Ver interconsultas en vivo (INSERT/UPDATE)
//   • Reasignar casos a radiólogos online
//   • Monitorear SLA en tiempo real
// ═══════════════════════════════════════════════════════════════

// --- Tipos ---
type InterConsultStatus =
  | 'pending'
  | 'dispatched'
  | 'acknowledged'
  | 'in_progress'
  | 'resolved'
  | 'escalated'
  | 'orphaned_urgency'
  | 'reassigned';

type CaseCategory = 'urgent' | 'active' | 'resolved';

interface InterConsultation {
  id: string;
  case_id: string;
  referente_nombre: string;
  referente_clinica: string;
  referente_telefono: string | null;
  paciente_nombre: string;
  estudio_tipo: string;
  estudio_id: string | null;
  radiologo_id: string | null;
  radiologo_nombre: string | null;
  radiologo_telegram_chat_id: number | null;
  status: InterConsultStatus;
  message: string | null;
  response: string | null;
  sla_minutes: number;
  sla_deadline: string | null;
  escalated_at: string | null;
  resolved_at: string | null;
  escalation_level: number;
  escalation_history: Record<string, unknown>[];
  dispatched_via: string[];
  reassigned_by: string | null;
  reassigned_to: string | null;
  magic_link_token: string | null;
  created_at: string;
  updated_at: string;
}

interface Radiologist {
  id: string;
  nombre: string;
  especialidad?: string;
  telegram_chat_id: number | null;
}

// --- Clasificador de casos ---
function categorizeCase(ic: InterConsultation): CaseCategory {
  if (['escalated', 'orphaned_urgency'].includes(ic.status)) return 'urgent';
  if (['resolved'].includes(ic.status)) return 'resolved';
  return 'active'; // pending, dispatched, acknowledged, in_progress, reassigned
}

function getMinutesSince(dateStr: string): number {
  return Math.round((Date.now() - new Date(dateStr).getTime()) / 60000);
}

function isSlaPassed(ic: InterConsultation): boolean {
  if (!ic.sla_deadline) return false;
  return new Date(ic.sla_deadline).getTime() < Date.now();
}

// --- Component ---
export const DispatchCenter: React.FC = () => {
  const [cases, setCases] = useState<InterConsultation[]>([]);
  const [radiologists, setRadiologists] = useState<Radiologist[]>([]);
  const [selectedCase, setSelectedCase] = useState<InterConsultation | null>(null);
  const [showReassignDropdown, setShowReassignDropdown] = useState(false);
  const [reassignSuccess, setReassignSuccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const [realtimeConnected, setRealtimeConnected] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [reassigning, setReassigning] = useState(false);

  const [soundEnabled, setSoundEnabled] = useState(true);

  // ── Sonido de alerta ──────────────────────────────────────
  const playAlertSound = useCallback(() => {
    if (!soundEnabled) return;
    try {
      // Usar Web Audio API para generar un beep
      const ctx = new AudioContext();
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.frequency.value = 880;
      oscillator.type = 'sine';
      gain.gain.value = 0.3;
      oscillator.start();
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      oscillator.stop(ctx.currentTime + 0.5);
    } catch {
      // Audio no disponible
    }
  }, [soundEnabled]);

  // ── Fetch inicial de datos ────────────────────────────────
  const fetchCases = useCallback(async () => {
    try {
      // Traemos interconsultas de las últimas 24 horas
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from('interconsultations')
        .select('*')
        .gte('created_at', since)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error fetching interconsultations:', error.message);
        return;
      }

      setCases(data || []);
      setLastRefresh(new Date());
    } catch (e) {
      console.error('❌ Fetch error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchRadiologists = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('professionals')
        .select('id, nombre, telegram_chat_id')
        .not('nombre', 'is', null)
        .order('nombre');

      setRadiologists(data || []);
    } catch (e) {
      console.error('❌ Error fetching radiologists:', e);
    }
  }, []);

  // ── Supabase Realtime ─────────────────────────────────────
  useEffect(() => {
    fetchCases();
    fetchRadiologists();

    // Suscripción Realtime a la tabla interconsultations
    const channel = supabase
      .channel('dispatch-center-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'interconsultations',
        },
        (payload) => {
          console.log('📡 Realtime INSERT:', payload.new);
          const newCase = payload.new as InterConsultation;
          setCases((prev) => {
            // Evitar duplicados
            if (prev.some((c) => c.id === newCase.id)) return prev;
            return [newCase, ...prev];
          });
          // Sonar alerta en nuevas interconsultas
          playAlertSound();
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'interconsultations',
        },
        (payload) => {
          console.log('📡 Realtime UPDATE:', payload.new);
          const updated = payload.new as InterConsultation;
          setCases((prev) =>
            prev.map((c) => (c.id === updated.id ? updated : c)),
          );

          // Si cambió a escalated/orphaned → sonar alerta
          if (['escalated', 'orphaned_urgency'].includes(updated.status)) {
            playAlertSound();
          }

          // Actualizar el panel lateral si el caso seleccionado fue actualizado
          setSelectedCase((prev) =>
            prev?.id === updated.id ? updated : prev,
          );
        },
      )
      .subscribe((status) => {
        console.log('📡 Realtime status:', status);
        setRealtimeConnected(status === 'SUBSCRIBED');
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchCases, fetchRadiologists, playAlertSound]);

  // ── Reasignar caso a otro radiólogo ───────────────────────
  const handleReassign = async (radiologistId: string) => {
    if (!selectedCase) return;
    const rad = radiologists.find((r) => r.id === radiologistId);
    if (!rad) return;

    setReassigning(true);

    try {
      const auditEntry = {
        action: 'manual_reassign',
        from_radiologist: selectedCase.radiologo_nombre,
        to_radiologist: rad.nombre,
        to_radiologist_id: rad.id,
        reassigned_by: 'dispatch_center',
        timestamp: new Date().toISOString(),
      };

      const existingHistory = Array.isArray(selectedCase.escalation_history)
        ? selectedCase.escalation_history
        : [];

      const { error } = await supabase
        .from('interconsultations')
        .update({
          radiologo_id: rad.id,
          radiologo_nombre: rad.nombre,
          radiologo_telegram_chat_id: rad.telegram_chat_id,
          status: 'dispatched',
          reassigned_by: 'dispatch_center',
          reassigned_to: rad.id,
          escalation_level: 0,
          escalated_at: null,
          escalation_history: [...existingHistory, auditEntry],
        })
        .eq('id', selectedCase.id);

      if (error) {
        console.error('❌ Error reasignando:', error.message);
        return;
      }

      // Disparar re-dispatch por Telegram si tiene chat_id
      if (rad.telegram_chat_id) {
        try {
          const projectUrl = import.meta.env.VITE_SUPABASE_URL;
          const authToken = (await supabase.auth.getSession())?.data?.session?.access_token;

          await fetch(`${projectUrl}/functions/v1/dispatch-interconsultation`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
            },
            body: JSON.stringify({
              caseId: selectedCase.case_id,
              radiologistId: rad.id,
              radiologistName: rad.nombre,
              radiologistTelegramChatId: rad.telegram_chat_id,
              message: selectedCase.message || '',
              referenteName: selectedCase.referente_nombre,
              referenteClinica: selectedCase.referente_clinica,
              pacienteNombre: selectedCase.paciente_nombre,
              estudioTipo: selectedCase.estudio_tipo,
              studyId: selectedCase.estudio_id || '',
              slaMinutes: selectedCase.sla_minutes,
            }),
          });
        } catch (e) {
          console.warn('⚠️ Re-dispatch Telegram no enviado:', e);
        }
      }

      setShowReassignDropdown(false);
      setReassignSuccess(true);
      setTimeout(() => {
        setReassignSuccess(false);
        setSelectedCase(null);
      }, 2000);
    } catch (e) {
      console.error('❌ Reassign error:', e);
    } finally {
      setReassigning(false);
    }
  };

  // ── Clasificar casos ──────────────────────────────────────
  const urgentCases = cases.filter((c) => categorizeCase(c) === 'urgent');
  const activeCases = cases.filter((c) => categorizeCase(c) === 'active');
  const resolvedCases = cases.filter((c) => categorizeCase(c) === 'resolved');

  const onlineRadiologists = radiologists.filter((r) => r.telegram_chat_id != null);

  // KPIs
  const avgSlaActive =
    activeCases.length > 0
      ? Math.round(
          activeCases.reduce((s, c) => s + getMinutesSince(c.created_at), 0) /
            activeCases.length,
        )
      : 0;

  // ── Status helpers ────────────────────────────────────────
  const getStatusBadge = (status: InterConsultStatus) => {
    switch (status) {
      case 'orphaned_urgency':
        return { color: 'text-red-500 bg-red-500/15', label: '🔴 HUÉRFANO' };
      case 'escalated':
        return { color: 'text-danger bg-danger/15', label: '⚠️ ESCALADO' };
      case 'dispatched':
        return { color: 'text-warning bg-warning/15', label: 'Despachado' };
      case 'acknowledged':
        return { color: 'text-info bg-info/15', label: 'Confirmado' };
      case 'in_progress':
        return { color: 'text-blue-400 bg-blue-400/15', label: 'En Progreso' };
      case 'resolved':
        return { color: 'text-success bg-success/15', label: '✓ Resuelto' };
      case 'reassigned':
        return { color: 'text-purple-400 bg-purple-400/15', label: 'Reasignado' };
      default:
        return { color: 'text-brand-text/40 bg-brand-text/5', label: status };
    }
  };

  // ── Loading state ─────────────────────────────────────────
  if (loading) {
    return (
      <div className="max-w-[1600px] mx-auto flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <RefreshCw className="w-8 h-8 text-rose-400 mx-auto animate-spin" />
          <p className="text-sm text-brand-text/40 font-bold">Cargando Centro de Despacho...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1600px] mx-auto space-y-6 animate-in fade-in duration-700">
      {/* === HEADER === */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 bg-gradient-to-br from-rose-500/20 to-orange-500/20 rounded-2xl border border-rose-500/20">
              <Headphones className="w-7 h-7 text-rose-400" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-brand-text tracking-tight uppercase leading-none">
                Centro de Despacho
              </h1>
              <p className="text-[10px] text-brand-text/40 font-bold uppercase tracking-[0.3em]">
                Torre de Control · Monitoreo en Tiempo Real
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Sound toggle */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={cn(
              "flex items-center gap-2 px-3 py-2.5 rounded-2xl border transition-all",
              soundEnabled
                ? "bg-rose-500/10 border-rose-500/20 text-rose-400"
                : "bg-brand-surface border-brand-border text-brand-text/30"
            )}
          >
            <Volume2 className="w-3.5 h-3.5" />
            <span className="text-[10px] font-black uppercase tracking-widest">
              {soundEnabled ? 'Audio ON' : 'Audio OFF'}
            </span>
          </button>

          {/* Realtime indicator */}
          <div className={cn(
            "flex items-center gap-2 px-4 py-2.5 rounded-2xl border",
            realtimeConnected
              ? "bg-success/10 border-success/20"
              : "bg-danger/10 border-danger/20"
          )}>
            {realtimeConnected
              ? <Wifi className="w-3.5 h-3.5 text-success animate-pulse" />
              : <WifiOff className="w-3.5 h-3.5 text-danger" />}
            <span className={cn(
              "text-[10px] font-black uppercase tracking-widest",
              realtimeConnected ? "text-success" : "text-danger"
            )}>
              {realtimeConnected ? 'Realtime' : 'Desconectado'}
            </span>
          </div>

          {/* Live badge */}
          <div className="flex items-center gap-2 px-4 py-2.5 bg-brand-surface border border-brand-border rounded-2xl">
            <Radio className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
            <span className="text-[10px] font-black text-brand-text/60 uppercase tracking-widest">En vivo</span>
          </div>

          {/* Refresh button */}
          <button
            onClick={() => { fetchCases(); fetchRadiologists(); }}
            className="flex items-center gap-2 px-4 py-2.5 bg-brand-surface border border-brand-border rounded-2xl hover:bg-brand-bg transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5 text-brand-text/40" />
            <span className="text-[10px] font-black text-brand-text/40 uppercase tracking-widest">
              {lastRefresh.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </button>

          <div className="flex items-center gap-2 px-4 py-2.5 bg-success/10 border border-success/20 rounded-2xl">
            <div className="w-2 h-2 bg-success rounded-full animate-pulse" />
            <span className="text-[10px] font-black text-success uppercase tracking-widest">{onlineRadiologists.length} con Telegram</span>
          </div>
        </div>
      </div>

      {/* === KPI STRIP === */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="card-premium p-4 flex items-center justify-between">
          <div>
            <p className="text-[9px] text-brand-text/40 uppercase font-black tracking-widest">Urgencias</p>
            <h3 className="text-2xl font-black text-danger">{urgentCases.length}</h3>
          </div>
          <div className="p-2.5 bg-danger/10 rounded-xl border border-danger/20">
            <AlertTriangle className="w-4 h-4 text-danger" />
          </div>
        </div>
        <div className="card-premium p-4 flex items-center justify-between">
          <div>
            <p className="text-[9px] text-brand-text/40 uppercase font-black tracking-widest">En Curso</p>
            <h3 className="text-2xl font-black text-warning">{activeCases.length}</h3>
          </div>
          <div className="p-2.5 bg-warning/10 rounded-xl border border-warning/20">
            <Clock className="w-4 h-4 text-warning" />
          </div>
        </div>
        <div className="card-premium p-4 flex items-center justify-between">
          <div>
            <p className="text-[9px] text-brand-text/40 uppercase font-black tracking-widest">Resueltos Hoy</p>
            <h3 className="text-2xl font-black text-success">{resolvedCases.length}</h3>
          </div>
          <div className="p-2.5 bg-success/10 rounded-xl border border-success/20">
            <CheckCircle2 className="w-4 h-4 text-success" />
          </div>
        </div>
        <div className="card-premium p-4 flex items-center justify-between">
          <div>
            <p className="text-[9px] text-brand-text/40 uppercase font-black tracking-widest">TAT Promedio</p>
            <h3 className="text-2xl font-black text-info">{avgSlaActive}<span className="text-sm text-brand-text/30 ml-1">min</span></h3>
          </div>
          <div className="p-2.5 bg-info/10 rounded-xl border border-info/20">
            <Zap className="w-4 h-4 text-info" />
          </div>
        </div>
        <div className="card-premium p-4 flex items-center justify-between">
          <div>
            <p className="text-[9px] text-brand-text/40 uppercase font-black tracking-widest">Total Hoy</p>
            <h3 className="text-2xl font-black text-brand-text">{cases.length}</h3>
          </div>
          <div className="p-2.5 bg-purple-500/10 rounded-xl border border-purple-500/20">
            <MessageCircle className="w-4 h-4 text-purple-400" />
          </div>
        </div>
      </div>

      {/* === Empty state === */}
      {cases.length === 0 && (
        <div className="card-premium p-16 text-center">
          <Headphones className="w-16 h-16 text-brand-text/10 mx-auto mb-4" />
          <h3 className="text-lg font-black text-brand-text/30 uppercase mb-2">Sin interconsultas activas</h3>
          <p className="text-sm text-brand-text/20 max-w-md mx-auto">
            El Centro de Despacho está escuchando. Cuando se genere una nueva interconsulta vía la Edge Function, aparecerá aquí automáticamente.
          </p>
          <div className="flex items-center justify-center gap-2 mt-6 text-success/40">
            <Wifi className="w-4 h-4 animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-widest">Supabase Realtime activo · Esperando eventos...</span>
          </div>
        </div>
      )}

      {/* === TRIAGE KANBAN === */}
      {cases.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* 🔴 URGENCIAS */}
          <div className="space-y-3">
            <div className="flex items-center gap-2.5 px-1">
              <div className="w-3 h-3 bg-danger rounded-full animate-pulse" />
              <h3 className="text-[10px] font-black text-danger uppercase tracking-[0.2em]">Urgencias · SLA Vencido</h3>
              <div className="ml-auto bg-danger/15 text-danger text-[10px] font-black px-2.5 py-1 rounded-lg">{urgentCases.length}</div>
            </div>
            <div className="space-y-3">
              {urgentCases.length === 0 ? (
                <div className="card-premium p-8 text-center">
                  <CheckCircle2 className="w-8 h-8 text-success/30 mx-auto mb-2" />
                  <p className="text-[11px] text-brand-text/30 font-bold">Sin urgencias pendientes</p>
                </div>
              ) : (
                urgentCases.map(c => {
                  const mins = getMinutesSince(c.created_at);
                  const badge = getStatusBadge(c.status);
                  return (
                    <button
                      key={c.id}
                      onClick={() => { setSelectedCase(c); setShowReassignDropdown(false); setReassignSuccess(false); }}
                      className={cn(
                        "w-full text-left card-premium !p-0 overflow-hidden border-l-4 border-danger hover:shadow-xl hover:shadow-danger/10 transition-all group",
                        selectedCase?.id === c.id && "ring-2 ring-danger/40"
                      )}
                    >
                      <div className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <span className={cn("text-[8px] font-black px-2 py-0.5 rounded uppercase tracking-widest", badge.color)}>{badge.label}</span>
                          <span className="text-[9px] font-black text-danger animate-pulse">⏱ {mins} min</span>
                        </div>
                        <p className="text-[8px] font-mono text-brand-text/30 mb-1">{c.case_id}</p>
                        <p className="text-xs font-bold text-brand-text mb-1 group-hover:text-danger transition-colors">{c.paciente_nombre}</p>
                        <p className="text-[10px] text-brand-text/40">{c.estudio_tipo}</p>
                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-brand-border">
                          <div className="flex items-center gap-1.5">
                            <User className="w-3 h-3 text-brand-text/20" />
                            <span className="text-[9px] text-brand-text/40">{c.referente_nombre}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-danger" />
                            <span className="text-[9px] text-danger font-bold">{c.radiologo_nombre || 'Sin asignar'}</span>
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* 🟡 EN CURSO */}
          <div className="space-y-3">
            <div className="flex items-center gap-2.5 px-1">
              <div className="w-3 h-3 bg-warning rounded-full" />
              <h3 className="text-[10px] font-black text-warning uppercase tracking-[0.2em]">En Curso · Asignados</h3>
              <div className="ml-auto bg-warning/15 text-warning text-[10px] font-black px-2.5 py-1 rounded-lg">{activeCases.length}</div>
            </div>
            <div className="space-y-3">
              {activeCases.length === 0 ? (
                <div className="card-premium p-8 text-center">
                  <Clock className="w-8 h-8 text-brand-text/10 mx-auto mb-2" />
                  <p className="text-[11px] text-brand-text/30 font-bold">Sin casos activos</p>
                </div>
              ) : (
                activeCases.map(c => {
                  const mins = getMinutesSince(c.created_at);
                  const slaExpired = isSlaPassed(c);
                  const badge = getStatusBadge(c.status);
                  return (
                    <button
                      key={c.id}
                      onClick={() => { setSelectedCase(c); setShowReassignDropdown(false); setReassignSuccess(false); }}
                      className={cn(
                        "w-full text-left card-premium !p-0 overflow-hidden border-l-4 transition-all group",
                        slaExpired ? "border-danger" : "border-warning",
                        "hover:shadow-xl hover:shadow-warning/10",
                        selectedCase?.id === c.id && "ring-2 ring-warning/40"
                      )}
                    >
                      <div className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <span className={cn("text-[8px] font-black px-2 py-0.5 rounded uppercase tracking-widest", badge.color)}>{badge.label}</span>
                          <span className={cn("text-[9px] font-bold", slaExpired ? "text-danger" : "text-brand-text/30")}>{mins} min</span>
                        </div>
                        <p className="text-[8px] font-mono text-brand-text/30 mb-1">{c.case_id}</p>
                        <p className="text-xs font-bold text-brand-text mb-1 group-hover:text-warning transition-colors">{c.paciente_nombre}</p>
                        <p className="text-[10px] text-brand-text/40">{c.estudio_tipo}</p>
                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-brand-border">
                          <div className="flex items-center gap-1.5">
                            <User className="w-3 h-3 text-brand-text/20" />
                            <span className="text-[9px] text-brand-text/40">{c.referente_nombre}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <div className={cn("w-2 h-2 rounded-full", c.radiologo_nombre ? "bg-success" : "bg-warning")} />
                            <span className="text-[9px] text-success font-bold">{c.radiologo_nombre || 'Pendiente'}</span>
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* 🟢 RESUELTOS */}
          <div className="space-y-3">
            <div className="flex items-center gap-2.5 px-1">
              <div className="w-3 h-3 bg-success rounded-full" />
              <h3 className="text-[10px] font-black text-success uppercase tracking-[0.2em]">Resueltos · Hoy</h3>
              <div className="ml-auto bg-success/15 text-success text-[10px] font-black px-2.5 py-1 rounded-lg">{resolvedCases.length}</div>
            </div>
            <div className="space-y-3">
              {resolvedCases.length === 0 ? (
                <div className="card-premium p-8 text-center">
                  <CheckCircle2 className="w-8 h-8 text-brand-text/10 mx-auto mb-2" />
                  <p className="text-[11px] text-brand-text/30 font-bold">Sin resoluciones aún</p>
                </div>
              ) : (
                resolvedCases.map(c => {
                  const resolvedMin = c.resolved_at
                    ? Math.round((new Date(c.resolved_at).getTime() - new Date(c.created_at).getTime()) / 60000)
                    : getMinutesSince(c.created_at);
                  return (
                    <button
                      key={c.id}
                      onClick={() => { setSelectedCase(c); setShowReassignDropdown(false); setReassignSuccess(false); }}
                      className={cn(
                        "w-full text-left card-premium !p-0 overflow-hidden border-l-4 border-success/40 hover:shadow-xl hover:shadow-success/5 transition-all group opacity-80 hover:opacity-100",
                        selectedCase?.id === c.id && "ring-2 ring-success/30 opacity-100"
                      )}
                    >
                      <div className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <span className="text-[8px] font-black text-success bg-success/15 px-2 py-0.5 rounded uppercase tracking-widest">Resuelto</span>
                          <span className="text-[9px] font-bold text-success">{resolvedMin} min ✓</span>
                        </div>
                        <p className="text-[8px] font-mono text-brand-text/20 mb-1">{c.case_id}</p>
                        <p className="text-xs font-bold text-brand-text/60 mb-1">{c.paciente_nombre}</p>
                        <p className="text-[10px] text-brand-text/30">{c.estudio_tipo}</p>
                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-brand-border">
                          <span className="text-[9px] text-brand-text/30">{c.referente_nombre}</span>
                          <span className="text-[9px] text-success/60">{c.radiologo_nombre}</span>
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* === PANEL DE DETALLE (Modal Lateral) === */}
      {selectedCase && (
        <div className="fixed inset-0 z-50 flex items-stretch justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="flex-1" onClick={() => setSelectedCase(null)} />

          <div className="w-full max-w-xl bg-brand-surface border-l border-brand-border shadow-2xl shadow-black/50 animate-in slide-in-from-right-8 duration-500 flex flex-col overflow-hidden">
            {/* Panel Header */}
            <div className={cn(
              "p-5 border-b border-brand-border flex-shrink-0",
              categorizeCase(selectedCase) === 'urgent' ? "bg-gradient-to-r from-danger/10 to-transparent" :
              categorizeCase(selectedCase) === 'active' ? "bg-gradient-to-r from-warning/10 to-transparent" :
              "bg-gradient-to-r from-success/10 to-transparent"
            )}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "p-2 rounded-xl border",
                    categorizeCase(selectedCase) === 'urgent' ? "bg-danger/15 border-danger/20" :
                    categorizeCase(selectedCase) === 'active' ? "bg-warning/15 border-warning/20" :
                    "bg-success/15 border-success/20"
                  )}>
                    {categorizeCase(selectedCase) === 'urgent' ? <AlertTriangle className="w-5 h-5 text-danger" /> :
                     categorizeCase(selectedCase) === 'active' ? <Clock className="w-5 h-5 text-warning" /> :
                     <CheckCircle2 className="w-5 h-5 text-success" />}
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-brand-text uppercase tracking-tight">
                      {selectedCase.case_id}
                    </h3>
                    <p className="text-[9px] text-brand-text/40 font-bold uppercase tracking-widest">
                      {getStatusBadge(selectedCase.status).label}
                    </p>
                  </div>
                </div>
                <button onClick={() => setSelectedCase(null)} className="p-2 rounded-xl text-brand-text/30 hover:text-brand-text hover:bg-brand-bg transition-all">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Case Info Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-brand-bg rounded-xl border border-brand-border">
                  <p className="text-[8px] font-black text-brand-text/30 uppercase tracking-widest mb-1">Paciente</p>
                  <p className="text-xs font-bold text-brand-text">{selectedCase.paciente_nombre}</p>
                  <p className="text-[10px] text-brand-text/40 mt-0.5">{selectedCase.estudio_tipo}</p>
                </div>
                <div className="p-3 bg-brand-bg rounded-xl border border-brand-border">
                  <p className="text-[8px] font-black text-brand-text/30 uppercase tracking-widest mb-1">Referente</p>
                  <p className="text-xs font-bold text-brand-text">{selectedCase.referente_nombre}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Building2 className="w-3 h-3 text-info" />
                    <span className="text-[10px] text-info">{selectedCase.referente_clinica}</span>
                  </div>
                </div>
                <div className="p-3 bg-brand-bg rounded-xl border border-brand-border">
                  <p className="text-[8px] font-black text-brand-text/30 uppercase tracking-widest mb-1">Radiólogo</p>
                  <p className="text-xs font-bold text-brand-text">{selectedCase.radiologo_nombre || 'Sin asignar'}</p>
                  <p className="text-[10px] text-brand-text/40 mt-0.5">
                    {selectedCase.radiologo_telegram_chat_id ? '📱 Con Telegram' : '⚠️ Sin Telegram'}
                  </p>
                </div>
                <div className="p-3 bg-brand-bg rounded-xl border border-brand-border">
                  <p className="text-[8px] font-black text-brand-text/30 uppercase tracking-widest mb-1">SLA</p>
                  <p className={cn("text-xs font-black", isSlaPassed(selectedCase) ? "text-danger" : "text-success")}>
                    {selectedCase.sla_minutes} min
                  </p>
                  <p className="text-[10px] text-brand-text/40 mt-0.5">
                    {isSlaPassed(selectedCase) ? '⚠️ SLA Vencido' : '✓ Dentro del SLA'}
                    {selectedCase.escalation_level > 0 && ` · Nivel ${selectedCase.escalation_level}`}
                  </p>
                </div>
              </div>

              {/* Canales de despacho */}
              {selectedCase.dispatched_via && selectedCase.dispatched_via.length > 0 && (
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-[8px] font-black text-brand-text/30 uppercase tracking-widest">Canales:</span>
                  {selectedCase.dispatched_via.map((ch) => (
                    <span key={ch} className="text-[9px] font-bold text-info bg-info/10 px-2 py-0.5 rounded">
                      {ch === 'websocket' ? '📡 WebSocket' : '📱 Telegram'}
                    </span>
                  ))}
                </div>
              )}

              {/* Mensaje / consulta médica */}
              {selectedCase.message && (
                <div className="mt-3 p-3 bg-brand-bg/50 border border-brand-border rounded-xl">
                  <p className="text-[8px] font-black text-brand-text/30 uppercase tracking-widest mb-1">Consulta Médica</p>
                  <p className="text-[11px] text-brand-text/70 leading-relaxed italic">"{selectedCase.message}"</p>
                </div>
              )}

              {/* Motivo urgencia */}
              {categorizeCase(selectedCase) === 'urgent' && (
                <div className="mt-3 p-3 bg-danger/5 border border-danger/15 rounded-xl">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-danger flex-shrink-0 mt-0.5" />
                    <p className="text-[10px] text-danger/80 font-bold leading-relaxed">
                      {selectedCase.status === 'orphaned_urgency'
                        ? `🔴 URGENCIA MÁXIMA: Nadie ha respondido en ${getMinutesSince(selectedCase.created_at)} min. Requiere intervención inmediata.`
                        : `SLA vencido. Radiólogo ${selectedCase.radiologo_nombre || 'desconocido'} no respondió dentro del plazo de ${selectedCase.sla_minutes} min.`}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Reassign Button (for urgent/active) */}
            {categorizeCase(selectedCase) !== 'resolved' && (
              <div className="p-4 border-b border-brand-border flex-shrink-0 bg-brand-bg/30 space-y-3">
                {reassignSuccess ? (
                  <div className="flex items-center gap-3 p-4 bg-success/10 border border-success/20 rounded-xl animate-in fade-in duration-300">
                    <CheckCircle2 className="w-5 h-5 text-success" />
                    <div>
                      <p className="text-xs font-black text-success">¡Caso Reasignado con Éxito!</p>
                      <p className="text-[10px] text-success/60">Notificación enviada al nuevo radiólogo.</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <button
                      onClick={() => setShowReassignDropdown(!showReassignDropdown)}
                      disabled={reassigning}
                      className="w-full flex items-center justify-center gap-2.5 px-6 py-3.5 bg-gradient-to-r from-rose-600 to-orange-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-rose-500/25 hover:shadow-xl hover:shadow-rose-500/30 transition-all border border-rose-400/30 disabled:opacity-50"
                    >
                      <RefreshCw className={cn("w-4 h-4", (showReassignDropdown || reassigning) && "animate-spin")} />
                      {reassigning ? 'Reasignando...' : 'Reasignar Manualmente'}
                      <ArrowRightLeft className="w-4 h-4" />
                    </button>

                    {showReassignDropdown && (
                      <div className="space-y-2 animate-in slide-in-from-top-2 duration-300">
                        <p className="text-[9px] font-black text-brand-text/30 uppercase tracking-widest px-1">
                          Radiólogos disponibles — Selecciona destino:
                        </p>
                        {radiologists.length === 0 ? (
                          <p className="text-[10px] text-brand-text/30 px-1 py-4 text-center">No hay radiólogos cargados</p>
                        ) : (
                          radiologists
                            .filter((r) => r.id !== selectedCase.radiologo_id)
                            .map(rad => (
                              <button
                                key={rad.id}
                                onClick={() => handleReassign(rad.id)}
                                className="w-full flex items-center gap-3 p-3 bg-brand-surface border border-brand-border rounded-xl hover:border-success/40 hover:bg-success/5 transition-all group text-left"
                              >
                                <div className="w-9 h-9 rounded-xl bg-success/10 border border-success/20 flex items-center justify-center flex-shrink-0 group-hover:bg-success/20 transition-colors">
                                  <User className="w-4 h-4 text-success" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-bold text-brand-text group-hover:text-success transition-colors">{rad.nombre}</p>
                                  <p className="text-[10px] text-brand-text/30">
                                    {rad.telegram_chat_id ? '📱 Con Telegram' : '⚠️ Sin Telegram'}
                                  </p>
                                </div>
                                <ChevronRight className="w-4 h-4 text-brand-text/10 group-hover:text-success transition-colors" />
                              </button>
                            ))
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Escalation History (Audit Trail) */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              <div className="p-4 pb-2">
                <div className="flex items-center gap-2 mb-4">
                  <Eye className="w-3.5 h-3.5 text-brand-text/30" />
                  <p className="text-[9px] font-black text-brand-text/30 uppercase tracking-widest">Historial de Escalamiento · Audit Trail</p>
                </div>

                {(!selectedCase.escalation_history || selectedCase.escalation_history.length === 0) ? (
                  <div className="p-8 text-center">
                    <MessageCircle className="w-8 h-8 text-brand-text/10 mx-auto mb-2" />
                    <p className="text-[11px] text-brand-text/30">Sin eventos de escalamiento</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {selectedCase.escalation_history.map((entry, i) => {
                      const action = String(entry.action || '');
                      const isEscalation = action.includes('escalation');
                      const isTomo = action.includes('tomo');

                      const isReassign = action.includes('reassign');

                      return (
                        <div
                          key={i}
                          className={cn(
                            "p-3 rounded-xl border",
                            isEscalation ? "bg-danger/5 border-danger/15" :
                            isTomo ? "bg-success/5 border-success/15" :
                            isReassign ? "bg-purple-500/5 border-purple-500/15" :
                            "bg-info/5 border-info/15"
                          )}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <span className={cn(
                              "text-[9px] font-black uppercase tracking-widest",
                              isEscalation ? "text-danger" :
                              isTomo ? "text-success" :
                              isReassign ? "text-purple-400" :
                              "text-info"
                            )}>
                              {isEscalation ? '🚨 Escalamiento' :
                               isTomo ? '🎯 TOMO (Telegram)' :
                               isReassign ? '🔄 Reasignación' :
                               '📡 Dispatch'}
                            </span>
                            <span className="text-[8px] text-brand-text/20 ml-auto">
                              {entry.timestamp ? new Date(String(entry.timestamp)).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : ''}
                            </span>
                          </div>
                          {Boolean(entry.channels) && (
                            <p className="text-[10px] text-brand-text/50">
                              Canales: {Array.isArray(entry.channels) ? (entry.channels as string[]).join(', ') : String(entry.channels as string)}
                            </p>
                          )}
                          {Boolean(entry.from_radiologist) && (
                            <p className="text-[10px] text-brand-text/50">
                              {String(entry.from_radiologist as string)} → {String((entry.to_radiologist as string) || '')}
                            </p>
                          )}
                          {entry.latency_ms != null && (
                            <p className="text-[10px] text-brand-text/30">Latencia: {String(entry.latency_ms)}ms</p>
                          )}
                          {entry.minutes_elapsed != null && (
                            <p className="text-[10px] text-brand-text/30">Tiempo transcurrido: {String(entry.minutes_elapsed)} min</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Panel Footer */}
            <div className="p-4 border-t border-brand-border bg-brand-bg/30 flex-shrink-0">
              <div className="flex items-center gap-2 text-[9px] text-brand-text/20">
                <Shield className="w-3 h-3" />
                <span>Datos en vivo desde Supabase. Reasignaciones quedan registradas en el audit trail.</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
