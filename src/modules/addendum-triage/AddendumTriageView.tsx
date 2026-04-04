import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import {
  Inbox,
  UserCheck,
  ShieldCheck,
  Clock,
  Search,
  ChevronDown,
  AlertTriangle,
  CheckCircle2,
  Stethoscope,
  X,
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface AddendumRequest {
  id: string;
  study_uid: string;
  patient_rut: string;
  requester_name: string | null;
  request_text: string;
  status: 'TRIAGE_PENDING' | 'ASSIGNED_TO_MEDIC' | 'RESOLVED_ADMIN' | 'RESOLVED_MEDIC';
  assigned_to: string | null;
  triage_notes: string | null;
  resolution_note: string | null;
  created_at: string;
}

interface MedicalUser {
  id: string;
  full_name: string;
  email: string;
  role: string;
}

export const AddendumTriageView: React.FC = () => {
  const [requests, setRequests] = useState<AddendumRequest[]>([]);
  const [medics, setMedics] = useState<MedicalUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<AddendumRequest | null>(null);
  const [modalMode, setModalMode] = useState<'assign' | 'resolve_admin' | null>(null);
  const [selectedMedicId, setSelectedMedicId] = useState('');
  const [resolutionNote, setResolutionNote] = useState('');
  const [triageFilter, setTriageFilter] = useState<'TRIAGE_PENDING' | 'ASSIGNED_TO_MEDIC' | 'all'>('TRIAGE_PENDING');
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch addendum requests
      const { data: reqData } = await supabase
        .from('addendum_requests')
        .select('*')
        .not('status', 'in', '("RESOLVED_ADMIN","RESOLVED_MEDIC")')
        .order('created_at', { ascending: false });

      setRequests(reqData || []);

      // Fetch medics from profiles/users
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email, app_role')
        .in('app_role', ['MED_STAFF', 'MED_CHIEF', 'MED_RESIDENT'])
        .order('full_name');

      if (profiles) {
        setMedics(profiles.map((p: any) => ({
          id: p.id,
          full_name: p.full_name || p.email,
          email: p.email,
          role: p.app_role,
        })));
      }
    } catch (err) {
      console.error('Error fetching triage data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();

    // Realtime: escuchar nuevas peticiones de addendum
    const channel = supabase
      .channel('triage_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'addendum_requests' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setRequests(prev => [payload.new as AddendumRequest, ...prev]);
        } else if (payload.eventType === 'UPDATE') {
          const updated = payload.new as AddendumRequest;
          if (['RESOLVED_ADMIN', 'RESOLVED_MEDIC'].includes(updated.status)) {
            setRequests(prev => prev.filter(r => r.id !== updated.id));
          } else {
            setRequests(prev => prev.map(r => r.id === updated.id ? updated : r));
          }
        } else if (payload.eventType === 'DELETE') {
          setRequests(prev => prev.filter(r => r.id !== (payload.old as any).id));
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchData]);

  const handleAssignMedic = async () => {
    if (!selectedRequest || !selectedMedicId) return;
    setSaving(true);
    try {
      await supabase
        .from('addendum_requests')
        .update({
          status: 'ASSIGNED_TO_MEDIC',
          assigned_to: selectedMedicId,
          triage_notes: resolutionNote || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedRequest.id);
      closeModal();
    } catch (err) {
      console.error('Error asignando médico:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleResolveAdmin = async () => {
    if (!selectedRequest) return;
    setSaving(true);
    try {
      await supabase
        .from('addendum_requests')
        .update({
          status: 'RESOLVED_ADMIN',
          resolution_note: resolutionNote,
          resolved_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedRequest.id);
      closeModal();
    } catch (err) {
      console.error('Error resolviendo admin:', err);
    } finally {
      setSaving(false);
    }
  };

  const closeModal = () => {
    setSelectedRequest(null);
    setModalMode(null);
    setSelectedMedicId('');
    setResolutionNote('');
  };

  const openModal = (req: AddendumRequest, mode: 'assign' | 'resolve_admin') => {
    setSelectedRequest(req);
    setModalMode(mode);
  };

  const filtered = requests.filter(r => {
    const matchSearch =
      r.patient_rut?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.study_uid?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.request_text?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = triageFilter === 'all' || r.status === triageFilter;
    return matchSearch && matchStatus;
  });

  const triagePendingCount = requests.filter(r => r.status === 'TRIAGE_PENDING').length;
  const assignedCount = requests.filter(r => r.status === 'ASSIGNED_TO_MEDIC').length;

  const roleLabel: Record<string, string> = {
    MED_STAFF: 'Médico',
    MED_CHIEF: 'Jefe Médico',
    MED_RESIDENT: 'Residente',
  };

  return (
    <div className="p-6 space-y-8 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-amber-400 via-orange-400 to-rose-400 bg-clip-text text-transparent">
            Bandeja de Triage Administrativo
          </h1>
          <p className="text-slate-400 mt-1 flex items-center gap-2 text-sm">
            <Inbox className="w-4 h-4" />
            Centro de clasificación y asignación de solicitudes de Addendum
          </p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-slate-900/50 rounded-full border border-slate-800">
          <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          <span className="text-xs font-medium text-slate-300">Secretaría Especializada</span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900/40 border border-amber-500/30 rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider">En Triage</p>
              <p className="text-3xl font-bold text-amber-400 mt-1">{triagePendingCount}</p>
            </div>
            <div className="p-3 bg-amber-500/10 rounded-xl"><AlertTriangle className="w-6 h-6 text-amber-400" /></div>
          </div>
        </div>
        <div className="bg-slate-900/40 border border-indigo-500/30 rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider">Asignados a Médico</p>
              <p className="text-3xl font-bold text-indigo-400 mt-1">{assignedCount}</p>
            </div>
            <div className="p-3 bg-indigo-500/10 rounded-xl"><Stethoscope className="w-6 h-6 text-indigo-400" /></div>
          </div>
        </div>
        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider">Total Activos</p>
              <p className="text-3xl font-bold text-slate-100 mt-1">{requests.length}</p>
            </div>
            <div className="p-3 bg-slate-800 rounded-xl"><Inbox className="w-6 h-6 text-slate-400" /></div>
          </div>
        </div>
      </div>

      {/* Tabla de Triage */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-2xl overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-slate-800 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Buscar por RUT, accession o texto..."
              className="w-full bg-slate-800/40 border border-slate-700 rounded-xl py-2 pl-10 pr-4 text-slate-200 text-sm focus:outline-none focus:border-amber-500/50 transition-colors"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            {(['TRIAGE_PENDING', 'ASSIGNED_TO_MEDIC', 'all'] as const).map(f => (
              <button
                key={f}
                onClick={() => setTriageFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  triageFilter === f
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                    : 'bg-slate-800/50 text-slate-400 border border-slate-700 hover:border-slate-600'
                }`}
              >
                {f === 'TRIAGE_PENDING' ? 'Pendientes' : f === 'ASSIGNED_TO_MEDIC' ? 'Asignados' : 'Todos'}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-800/30 text-slate-400 text-xs uppercase tracking-wider">
                <th className="p-4 font-medium">Estado</th>
                <th className="p-4 font-medium">Paciente / RUT</th>
                <th className="p-4 font-medium">Accession / Estudio</th>
                <th className="p-4 font-medium">Solicitud</th>
                <th className="p-4 font-medium">Recibido</th>
                <th className="p-4 font-medium text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {loading ? (
                <tr><td colSpan={6} className="p-8 text-center text-slate-500 animate-pulse">Cargando bandeja de triage...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="p-12 text-center">
                  <CheckCircle2 className="w-10 h-10 text-emerald-500/50 mx-auto mb-2" />
                  <p className="text-slate-500 text-sm">No hay solicitudes pendientes</p>
                </td></tr>
              ) : filtered.map((req) => (
                <tr key={req.id} className="hover:bg-white/[0.02] transition-colors group">
                  <td className="p-4">
                    {req.status === 'TRIAGE_PENDING' ? (
                      <span className="flex items-center gap-1.5 px-2 py-1 bg-amber-500/10 text-amber-400 rounded-full text-[10px] font-bold tracking-tight w-fit">
                        <Clock className="w-3 h-3" /> TRIAGE
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 px-2 py-1 bg-indigo-500/10 text-indigo-400 rounded-full text-[10px] font-bold tracking-tight w-fit">
                        <UserCheck className="w-3 h-3" /> ASIGNADO
                      </span>
                    )}
                  </td>
                  <td className="p-4">
                    <div className="font-medium text-slate-200 text-sm">{req.requester_name || '—'}</div>
                    <div className="text-xs text-slate-500 font-mono">{req.patient_rut}</div>
                  </td>
                  <td className="p-4">
                    <span className="text-indigo-400 font-mono text-sm">{req.study_uid}</span>
                  </td>
                  <td className="p-4 max-w-xs">
                    <p className="text-slate-300 text-sm line-clamp-2">{req.request_text}</p>
                  </td>
                  <td className="p-4 text-slate-500 text-xs whitespace-nowrap">
                    {format(new Date(req.created_at), "d MMM, HH:mm", { locale: es })}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-center gap-2 opacity-50 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => openModal(req, 'assign')}
                        title="Asignar a Médico"
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 rounded-lg text-xs font-medium transition-colors"
                      >
                        <UserCheck className="w-3.5 h-3.5" /> Asignar
                      </button>
                      <button
                        onClick={() => openModal(req, 'resolve_admin')}
                        title="Resolver Administrativamente"
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-lg text-xs font-medium transition-colors"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" /> Resolver
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Acción */}
      {modalMode && selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl p-6">
            {/* Header del modal */}
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl ${modalMode === 'assign' ? 'bg-indigo-500/10 text-indigo-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                  {modalMode === 'assign' ? <UserCheck className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-100">
                    {modalMode === 'assign' ? 'Asignar a Médico' : 'Resolución Administrativa'}
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">{selectedRequest.study_uid} • RUT: {selectedRequest.patient_rut}</p>
                </div>
              </div>
              <button onClick={closeModal} className="p-1.5 text-slate-500 hover:text-slate-300 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Contenido de la solicitud */}
            <div className="mb-5 p-3 bg-slate-800/40 border border-slate-700 rounded-xl">
              <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Motivo de la solicitud</p>
              <p className="text-sm text-slate-200">{selectedRequest.request_text}</p>
            </div>

            {/* Selector de médico (solo modo assign) */}
            {modalMode === 'assign' && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-400 mb-2">Seleccionar Médico Responsable *</label>
                <div className="relative">
                  <select
                    value={selectedMedicId}
                    onChange={(e) => setSelectedMedicId(e.target.value)}
                    className="w-full bg-slate-800/50 border border-slate-700 rounded-xl py-2.5 pl-4 pr-10 text-slate-200 text-sm focus:outline-none focus:border-indigo-500 appearance-none transition-colors"
                  >
                    <option value="">— Seleccionar médico —</option>
                    {medics.map(m => (
                      <option key={m.id} value={m.id}>
                        {m.full_name} • {roleLabel[m.role] || m.role}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                </div>
              </div>
            )}

            {/* Nota */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-400 mb-2">
                {modalMode === 'assign' ? 'Notas de triage (opcional)' : 'Justificación de cierre *'}
              </label>
              <textarea
                value={resolutionNote}
                onChange={(e) => setResolutionNote(e.target.value)}
                placeholder={modalMode === 'assign' ? 'Contexto adicional para el médico...' : 'Explique por qué se resuelve administrativamente...'}
                className="w-full bg-slate-800/50 border border-slate-700 rounded-xl p-3 text-sm text-slate-200 min-h-[90px] focus:outline-none focus:border-indigo-500 transition-colors placeholder:text-slate-600 resize-none"
              />
            </div>

            {/* Botones */}
            <div className="flex gap-3">
              <button onClick={closeModal} className="flex-1 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-medium transition-colors">
                Cancelar
              </button>
              <button
                disabled={saving || (modalMode === 'assign' && !selectedMedicId) || (modalMode === 'resolve_admin' && !resolutionNote)}
                onClick={modalMode === 'assign' ? handleAssignMedic : handleResolveAdmin}
                className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition-all disabled:opacity-50 ${
                  modalMode === 'assign'
                    ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 hover:shadow-lg hover:shadow-indigo-500/20 text-white'
                    : 'bg-gradient-to-r from-emerald-600 to-emerald-700 hover:shadow-lg hover:shadow-emerald-500/20 text-white'
                }`}
              >
                {saving ? 'Guardando...' : modalMode === 'assign' ? 'Confirmar Asignación' : 'Cerrar Ticket'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
