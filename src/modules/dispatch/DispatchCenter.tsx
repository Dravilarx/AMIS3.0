import React, { useState } from 'react';
import {
  Headphones, AlertTriangle, Clock, CheckCircle2, X, User,
  RefreshCw, MessageCircle, Building2, ChevronRight,
  Radio, Zap, ArrowRightLeft, Eye, Shield
} from 'lucide-react';
import { cn } from '../../lib/utils';

// --- Tipos ---
type CaseStatus = 'urgent' | 'active' | 'resolved';
type RadiologistStatus = 'online' | 'busy' | 'offline';

interface ChatMessage {
  id: string;
  sender: string;
  role: 'referente' | 'radiologo' | 'bot' | 'coordinator';
  text: string;
  timestamp: string;
}

interface DispatchCase {
  id: string;
  status: CaseStatus;
  referente: string;
  referenteClinica: string;
  referenteTelefono: string;
  paciente: string;
  estudio: string;
  radiologo: string;
  radiologoStatus: RadiologistStatus;
  slaMinutes: number;
  slaExpired: boolean;
  createdAt: string;
  resolvedAt?: string;
  motivo: string;
  chat: ChatMessage[];
}

interface Radiologist {
  id: string;
  nombre: string;
  especialidad: string;
  status: RadiologistStatus;
  casosActivos: number;
}

// --- Radiólogos disponibles ---
const RADIOLOGOS: Radiologist[] = [
  { id: 'r1', nombre: 'Dra. Marcela Fuentes', especialidad: 'Neurorradiología', status: 'online', casosActivos: 2 },
  { id: 'r2', nombre: 'Dr. Carlos Medina', especialidad: 'MSK', status: 'online', casosActivos: 1 },
  { id: 'r3', nombre: 'Dr. Rojas', especialidad: 'Tórax', status: 'offline', casosActivos: 0 },
  { id: 'r4', nombre: 'Dra. Ana Beltrán', especialidad: 'Abdomen', status: 'online', casosActivos: 3 },
  { id: 'r5', nombre: 'Dr. Felipe Araya', especialidad: 'Mamografía', status: 'busy', casosActivos: 4 },
  { id: 'r6', nombre: 'Dr. Patricio Aravena', especialidad: 'Intervencionismo', status: 'online', casosActivos: 0 },
];

// --- Mock Cases ---
const MOCK_CASES: DispatchCase[] = [
  {
    id: 'IC-2026-0047',
    status: 'urgent',
    referente: 'Dr. González',
    referenteClinica: 'Clínica Portada',
    referenteTelefono: '+569 9918 8701',
    paciente: 'Juan Pérez Morales',
    estudio: 'TAC Cerebro con Contraste',
    radiologo: 'Dr. Rojas',
    radiologoStatus: 'offline',
    slaMinutes: 14,
    slaExpired: true,
    createdAt: '2026-03-17T18:45:00',
    motivo: 'Radiólogo titular offline. SLA 10 min vencido.',
    chat: [
      { id: '1', sender: 'Dr. González', role: 'referente', text: 'Hola, necesito consultar sobre el TAC de Juan Pérez. Se observa una lesión hiperdensa temporal derecha.', timestamp: '18:45' },
      { id: '2', sender: 'Bot AMIS', role: 'bot', text: 'Bienvenido Dr. González. Estoy conectándolo con el radiólogo de turno para Clínica Portada...', timestamp: '18:45' },
      { id: '3', sender: 'Bot AMIS', role: 'bot', text: '⚠️ El Dr. Rojas no se encuentra disponible. Derivando a Mesa Central para reasignación...', timestamp: '18:55' },
    ],
  },
  {
    id: 'IC-2026-0048',
    status: 'urgent',
    referente: 'Dra. Herrera',
    referenteClinica: 'CDT Antofagasta',
    referenteTelefono: '+569 8877 6543',
    paciente: 'María Contreras',
    estudio: 'RM Rodilla Izquierda',
    radiologo: 'Dr. Rojas',
    radiologoStatus: 'offline',
    slaMinutes: 22,
    slaExpired: true,
    createdAt: '2026-03-17T18:37:00',
    motivo: 'Sin respuesta. Caso requiere reasignación urgente.',
    chat: [
      { id: '1', sender: 'Dra. Herrera', role: 'referente', text: 'Buenas tardes, la RM de María Contreras muestra desgarro parcial de LCA. ¿Dr. Rojas puede confirmar?', timestamp: '18:37' },
      { id: '2', sender: 'Bot AMIS', role: 'bot', text: 'Conectando con radiólogo asignado...', timestamp: '18:37' },
      { id: '3', sender: 'Bot AMIS', role: 'bot', text: '⚠️ Sin respuesta después de 10 minutos. Escalando a Mesa Central.', timestamp: '18:47' },
    ],
  },
  {
    id: 'IC-2026-0045',
    status: 'active',
    referente: 'Dr. Muñoz',
    referenteClinica: 'VitalMédica Santiago',
    referenteTelefono: '+569 7766 5544',
    paciente: 'Pedro Soto Lagos',
    estudio: 'Ecografía Abdominal',
    radiologo: 'Dra. Ana Beltrán',
    radiologoStatus: 'online',
    slaMinutes: 4,
    slaExpired: false,
    createdAt: '2026-03-17T19:05:00',
    motivo: 'Consulta en curso',
    chat: [
      { id: '1', sender: 'Dr. Muñoz', role: 'referente', text: 'Necesito una segunda opinión sobre la ecografía de Pedro Soto. Hay una imagen sospechosa en vesícula.', timestamp: '19:05' },
      { id: '2', sender: 'Dra. Ana Beltrán', role: 'radiologo', text: 'Hola Dr. Muñoz. Estoy revisando las imágenes. Le comento en 2 minutos.', timestamp: '19:06' },
    ],
  },
  {
    id: 'IC-2026-0046',
    status: 'active',
    referente: 'Dra. Valenzuela',
    referenteClinica: 'Clínica Portada',
    referenteTelefono: '+569 6655 4433',
    paciente: 'Ana María López',
    estudio: 'Mamografía Bilateral',
    radiologo: 'Dra. Marcela Fuentes',
    radiologoStatus: 'online',
    slaMinutes: 7,
    slaExpired: false,
    createdAt: '2026-03-17T19:02:00',
    motivo: 'Consulta en curso',
    chat: [
      { id: '1', sender: 'Dra. Valenzuela', role: 'referente', text: 'Buenos días Dra. Fuentes, las mamografías de la Sra. López muestran microcalcificaciones. ¿BIRADS 4?', timestamp: '19:02' },
      { id: '2', sender: 'Dra. Marcela Fuentes', role: 'radiologo', text: 'Revisando ahora. Efectivamente las microcalcificaciones son sospechosas. Confirmo: BIRADS 4A. Recomiendo biopsia por estereotaxia.', timestamp: '19:04' },
      { id: '3', sender: 'Dra. Valenzuela', role: 'referente', text: 'Perfecto, coordinaré con la paciente. Gracias por la rapidez.', timestamp: '19:06' },
    ],
  },
  {
    id: 'IC-2026-0041',
    status: 'resolved',
    referente: 'Dr. Espinoza',
    referenteClinica: 'Centro Médico Los Andes',
    referenteTelefono: '+569 5544 3322',
    paciente: 'Carlos Riquelme',
    estudio: 'Rx Tórax AP/Lateral',
    radiologo: 'Dr. Carlos Medina',
    radiologoStatus: 'online',
    slaMinutes: 6,
    slaExpired: false,
    createdAt: '2026-03-17T17:30:00',
    resolvedAt: '2026-03-17T17:36:00',
    motivo: 'Resuelto en 6 min.',
    chat: [
      { id: '1', sender: 'Dr. Espinoza', role: 'referente', text: 'Dr. Medina, la Rx de Carlos Riquelme muestra infiltrado basal bilateral. ¿Neumonía?', timestamp: '17:30' },
      { id: '2', sender: 'Dr. Carlos Medina', role: 'radiologo', text: 'Correcto, patrón compatible con neumonía bilateral de foco basal. Sugiria correlación con laboratorio y PCR.', timestamp: '17:34' },
      { id: '3', sender: 'Dr. Espinoza', role: 'referente', text: 'Excelente, procedo con el tratamiento. Muchas gracias.', timestamp: '17:36' },
    ],
  },
  {
    id: 'IC-2026-0039',
    status: 'resolved',
    referente: 'Dra. Contreras',
    referenteClinica: 'Clínica Antofagasta',
    referenteTelefono: '+569 4433 2211',
    paciente: 'Sofía Mendoza',
    estudio: 'TAC Abdomen/Pelvis',
    radiologo: 'Dra. Ana Beltrán',
    radiologoStatus: 'online',
    slaMinutes: 8,
    slaExpired: false,
    createdAt: '2026-03-17T16:50:00',
    resolvedAt: '2026-03-17T16:58:00',
    motivo: 'Resuelto en 8 min.',
    chat: [
      { id: '1', sender: 'Dra. Contreras', role: 'referente', text: 'Necesito revisión urgente de TAC de Sofía Mendoza. Sospecha de apendicitis.', timestamp: '16:50' },
      { id: '2', sender: 'Dra. Ana Beltrán', role: 'radiologo', text: 'Confirmado: apéndice de 12mm con signos inflamatorios periapendiculares. Compatible con apendicitis aguda. Recomiendo cirugía urgente.', timestamp: '16:55' },
      { id: '3', sender: 'Dra. Contreras', role: 'referente', text: 'Coordinando pabellón. Gracias Dra. Beltrán.', timestamp: '16:58' },
    ],
  },
  {
    id: 'IC-2026-0037',
    status: 'resolved',
    referente: 'Dr. Vásquez',
    referenteClinica: 'VitalMédica Santiago',
    referenteTelefono: '+569 3322 1100',
    paciente: 'Roberto Fuentes',
    estudio: 'RM Columna Lumbar',
    radiologo: 'Dr. Carlos Medina',
    radiologoStatus: 'online',
    slaMinutes: 5,
    slaExpired: false,
    createdAt: '2026-03-17T15:20:00',
    resolvedAt: '2026-03-17T15:25:00',
    motivo: 'Resuelto en 5 min.',
    chat: [],
  },
];

// --- Status helpers ---
const getStatusColor = (status: RadiologistStatus) => {
  switch (status) {
    case 'online': return 'bg-success';
    case 'busy': return 'bg-warning';
    case 'offline': return 'bg-danger';
  }
};

const getStatusLabel = (status: RadiologistStatus) => {
  switch (status) {
    case 'online': return 'Online';
    case 'busy': return 'Ocupado';
    case 'offline': return 'Offline';
  }
};

// --- Component ---
export const DispatchCenter: React.FC = () => {
  const [cases, setCases] = useState<DispatchCase[]>(MOCK_CASES);
  const [selectedCase, setSelectedCase] = useState<DispatchCase | null>(null);
  const [showReassignDropdown, setShowReassignDropdown] = useState(false);
  const [reassignSuccess, setReassignSuccess] = useState(false);

  const urgentCases = cases.filter(c => c.status === 'urgent');
  const activeCases = cases.filter(c => c.status === 'active');
  const resolvedCases = cases.filter(c => c.status === 'resolved');

  const onlineRadiologists = RADIOLOGOS.filter(r => r.status === 'online');

  const handleReassign = (radiologistId: string) => {
    if (!selectedCase) return;
    const rad = RADIOLOGOS.find(r => r.id === radiologistId);
    if (!rad) return;

    setCases(prev => prev.map(c => {
      if (c.id !== selectedCase.id) return c;
      return {
        ...c,
        status: 'active' as CaseStatus,
        radiologo: rad.nombre,
        radiologoStatus: 'online' as RadiologistStatus,
        slaExpired: false,
        slaMinutes: 0,
        chat: [
          ...c.chat,
          {
            id: crypto.randomUUID(),
            sender: 'Mesa Central',
            role: 'coordinator' as const,
            text: `🔄 Caso reasignado manualmente a ${rad.nombre} (${rad.especialidad}) por coordinador de Mesa Central.`,
            timestamp: new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }),
          },
        ],
      };
    }));

    setShowReassignDropdown(false);
    setReassignSuccess(true);
    setTimeout(() => {
      setReassignSuccess(false);
      setSelectedCase(null);
    }, 2000);
  };

  // KPIs
  const avgSlaActive = activeCases.length > 0
    ? Math.round(activeCases.reduce((s, c) => s + c.slaMinutes, 0) / activeCases.length)
    : 0;

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
              <h1 className="text-3xl font-black text-prevenort-text tracking-tight uppercase leading-none">
                Centro de Despacho
              </h1>
              <p className="text-[10px] text-prevenort-text/40 font-bold uppercase tracking-[0.3em]">
                Torre de Control · Monitoreo de Interconsultas AMIS
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-4 py-2.5 bg-prevenort-surface border border-prevenort-border rounded-2xl">
            <Radio className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
            <span className="text-[10px] font-black text-prevenort-text/60 uppercase tracking-widest">En vivo</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2.5 bg-success/10 border border-success/20 rounded-2xl">
            <div className="w-2 h-2 bg-success rounded-full animate-pulse" />
            <span className="text-[10px] font-black text-success uppercase tracking-widest">{onlineRadiologists.length} Radiólogos Online</span>
          </div>
        </div>
      </div>

      {/* === KPI STRIP === */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="card-premium p-4 flex items-center justify-between">
          <div>
            <p className="text-[9px] text-prevenort-text/40 uppercase font-black tracking-widest">Urgencias</p>
            <h3 className="text-2xl font-black text-danger">{urgentCases.length}</h3>
          </div>
          <div className="p-2.5 bg-danger/10 rounded-xl border border-danger/20">
            <AlertTriangle className="w-4 h-4 text-danger" />
          </div>
        </div>
        <div className="card-premium p-4 flex items-center justify-between">
          <div>
            <p className="text-[9px] text-prevenort-text/40 uppercase font-black tracking-widest">En Curso</p>
            <h3 className="text-2xl font-black text-warning">{activeCases.length}</h3>
          </div>
          <div className="p-2.5 bg-warning/10 rounded-xl border border-warning/20">
            <Clock className="w-4 h-4 text-warning" />
          </div>
        </div>
        <div className="card-premium p-4 flex items-center justify-between">
          <div>
            <p className="text-[9px] text-prevenort-text/40 uppercase font-black tracking-widest">Resueltos Hoy</p>
            <h3 className="text-2xl font-black text-success">{resolvedCases.length}</h3>
          </div>
          <div className="p-2.5 bg-success/10 rounded-xl border border-success/20">
            <CheckCircle2 className="w-4 h-4 text-success" />
          </div>
        </div>
        <div className="card-premium p-4 flex items-center justify-between">
          <div>
            <p className="text-[9px] text-prevenort-text/40 uppercase font-black tracking-widest">TAT Promedio</p>
            <h3 className="text-2xl font-black text-info">{avgSlaActive}<span className="text-sm text-prevenort-text/30 ml-1">min</span></h3>
          </div>
          <div className="p-2.5 bg-info/10 rounded-xl border border-info/20">
            <Zap className="w-4 h-4 text-info" />
          </div>
        </div>
        <div className="card-premium p-4 flex items-center justify-between">
          <div>
            <p className="text-[9px] text-prevenort-text/40 uppercase font-black tracking-widest">Total Hoy</p>
            <h3 className="text-2xl font-black text-prevenort-text">{cases.length}</h3>
          </div>
          <div className="p-2.5 bg-purple-500/10 rounded-xl border border-purple-500/20">
            <MessageCircle className="w-4 h-4 text-purple-400" />
          </div>
        </div>
      </div>

      {/* === TRIAGE KANBAN === */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* 🔴 URGENCIAS */}
        <div className="space-y-3">
          <div className="flex items-center gap-2.5 px-1">
            <div className="w-3 h-3 bg-danger rounded-full animate-pulse" />
            <h3 className="text-[10px] font-black text-danger uppercase tracking-[0.2em]">Urgencias · Pool Huérfano</h3>
            <div className="ml-auto bg-danger/15 text-danger text-[10px] font-black px-2.5 py-1 rounded-lg">{urgentCases.length}</div>
          </div>
          <div className="space-y-3">
            {urgentCases.length === 0 ? (
              <div className="card-premium p-8 text-center">
                <CheckCircle2 className="w-8 h-8 text-success/30 mx-auto mb-2" />
                <p className="text-[11px] text-prevenort-text/30 font-bold">Sin urgencias pendientes</p>
              </div>
            ) : (
              urgentCases.map(c => (
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
                      <span className="text-[8px] font-black text-danger bg-danger/15 px-2 py-0.5 rounded uppercase tracking-widest">{c.id}</span>
                      <span className="text-[9px] font-black text-danger animate-pulse">⏱ {c.slaMinutes} min</span>
                    </div>
                    <p className="text-xs font-bold text-prevenort-text mb-1 group-hover:text-danger transition-colors">{c.paciente}</p>
                    <p className="text-[10px] text-prevenort-text/40">{c.estudio}</p>
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-prevenort-border">
                      <div className="flex items-center gap-1.5">
                        <User className="w-3 h-3 text-prevenort-text/20" />
                        <span className="text-[9px] text-prevenort-text/40">{c.referente}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-danger" />
                        <span className="text-[9px] text-danger font-bold">{c.radiologo} · Offline</span>
                      </div>
                    </div>
                  </div>
                </button>
              ))
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
                <Clock className="w-8 h-8 text-prevenort-text/10 mx-auto mb-2" />
                <p className="text-[11px] text-prevenort-text/30 font-bold">Sin chats activos</p>
              </div>
            ) : (
              activeCases.map(c => (
                <button
                  key={c.id}
                  onClick={() => { setSelectedCase(c); setShowReassignDropdown(false); setReassignSuccess(false); }}
                  className={cn(
                    "w-full text-left card-premium !p-0 overflow-hidden border-l-4 border-warning hover:shadow-xl hover:shadow-warning/10 transition-all group",
                    selectedCase?.id === c.id && "ring-2 ring-warning/40"
                  )}
                >
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <span className="text-[8px] font-black text-warning bg-warning/15 px-2 py-0.5 rounded uppercase tracking-widest">{c.id}</span>
                      <span className="text-[9px] font-bold text-prevenort-text/30">{c.slaMinutes} min</span>
                    </div>
                    <p className="text-xs font-bold text-prevenort-text mb-1 group-hover:text-warning transition-colors">{c.paciente}</p>
                    <p className="text-[10px] text-prevenort-text/40">{c.estudio}</p>
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-prevenort-border">
                      <div className="flex items-center gap-1.5">
                        <User className="w-3 h-3 text-prevenort-text/20" />
                        <span className="text-[9px] text-prevenort-text/40">{c.referente}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-success" />
                        <span className="text-[9px] text-success font-bold">{c.radiologo}</span>
                      </div>
                    </div>
                  </div>
                </button>
              ))
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
                <CheckCircle2 className="w-8 h-8 text-prevenort-text/10 mx-auto mb-2" />
                <p className="text-[11px] text-prevenort-text/30 font-bold">Sin resoluciones aún</p>
              </div>
            ) : (
              resolvedCases.map(c => (
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
                      <span className="text-[8px] font-black text-success bg-success/15 px-2 py-0.5 rounded uppercase tracking-widest">{c.id}</span>
                      <span className="text-[9px] font-bold text-success">{c.slaMinutes} min ✓</span>
                    </div>
                    <p className="text-xs font-bold text-prevenort-text/60 mb-1">{c.paciente}</p>
                    <p className="text-[10px] text-prevenort-text/30">{c.estudio}</p>
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-prevenort-border">
                      <span className="text-[9px] text-prevenort-text/30">{c.referente}</span>
                      <span className="text-[9px] text-success/60">{c.radiologo}</span>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </div>

      {/* === PANEL DE DETALLE / OVERRIDE (Modal) === */}
      {selectedCase && (
        <div className="fixed inset-0 z-50 flex items-stretch justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          {/* Click outside to close */}
          <div className="flex-1" onClick={() => setSelectedCase(null)} />

          {/* Side Panel */}
          <div className="w-full max-w-xl bg-prevenort-surface border-l border-prevenort-border shadow-2xl shadow-black/50 animate-in slide-in-from-right-8 duration-500 flex flex-col overflow-hidden">
            {/* Panel Header */}
            <div className={cn(
              "p-5 border-b border-prevenort-border flex-shrink-0",
              selectedCase.status === 'urgent' ? "bg-gradient-to-r from-danger/10 to-transparent" :
              selectedCase.status === 'active' ? "bg-gradient-to-r from-warning/10 to-transparent" :
              "bg-gradient-to-r from-success/10 to-transparent"
            )}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "p-2 rounded-xl border",
                    selectedCase.status === 'urgent' ? "bg-danger/15 border-danger/20" :
                    selectedCase.status === 'active' ? "bg-warning/15 border-warning/20" :
                    "bg-success/15 border-success/20"
                  )}>
                    {selectedCase.status === 'urgent' ? <AlertTriangle className="w-5 h-5 text-danger" /> :
                     selectedCase.status === 'active' ? <Clock className="w-5 h-5 text-warning" /> :
                     <CheckCircle2 className="w-5 h-5 text-success" />}
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-prevenort-text uppercase tracking-tight">
                      {selectedCase.id}
                    </h3>
                    <p className="text-[9px] text-prevenort-text/40 font-bold uppercase tracking-widest">
                      {selectedCase.status === 'urgent' ? 'Urgencia · SLA Vencido' :
                       selectedCase.status === 'active' ? 'En Curso · Chat Activo' :
                       'Resuelto'}
                    </p>
                  </div>
                </div>
                <button onClick={() => setSelectedCase(null)} className="p-2 rounded-xl text-prevenort-text/30 hover:text-prevenort-text hover:bg-prevenort-bg transition-all">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Case Info Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-prevenort-bg rounded-xl border border-prevenort-border">
                  <p className="text-[8px] font-black text-prevenort-text/30 uppercase tracking-widest mb-1">Paciente</p>
                  <p className="text-xs font-bold text-prevenort-text">{selectedCase.paciente}</p>
                  <p className="text-[10px] text-prevenort-text/40 mt-0.5">{selectedCase.estudio}</p>
                </div>
                <div className="p-3 bg-prevenort-bg rounded-xl border border-prevenort-border">
                  <p className="text-[8px] font-black text-prevenort-text/30 uppercase tracking-widest mb-1">Referente</p>
                  <p className="text-xs font-bold text-prevenort-text">{selectedCase.referente}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Building2 className="w-3 h-3 text-info" />
                    <span className="text-[10px] text-info">{selectedCase.referenteClinica}</span>
                  </div>
                </div>
                <div className="p-3 bg-prevenort-bg rounded-xl border border-prevenort-border">
                  <p className="text-[8px] font-black text-prevenort-text/30 uppercase tracking-widest mb-1">Radiólogo</p>
                  <div className="flex items-center gap-2">
                    <div className={cn("w-2 h-2 rounded-full", getStatusColor(selectedCase.radiologoStatus))} />
                    <p className="text-xs font-bold text-prevenort-text">{selectedCase.radiologo}</p>
                  </div>
                  <p className="text-[10px] text-prevenort-text/40 mt-0.5">{getStatusLabel(selectedCase.radiologoStatus)}</p>
                </div>
                <div className="p-3 bg-prevenort-bg rounded-xl border border-prevenort-border">
                  <p className="text-[8px] font-black text-prevenort-text/30 uppercase tracking-widest mb-1">SLA</p>
                  <p className={cn("text-xs font-black", selectedCase.slaExpired ? "text-danger" : "text-success")}>
                    {selectedCase.slaMinutes} minutos
                  </p>
                  <p className="text-[10px] text-prevenort-text/40 mt-0.5">{selectedCase.slaExpired ? '⚠️ SLA Vencido' : '✓ Dentro del SLA'}</p>
                </div>
              </div>

              {/* Motivo */}
              {selectedCase.status === 'urgent' && (
                <div className="mt-3 p-3 bg-danger/5 border border-danger/15 rounded-xl">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-danger flex-shrink-0 mt-0.5" />
                    <p className="text-[10px] text-danger/80 font-bold leading-relaxed">{selectedCase.motivo}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Reassign Button (only for urgent) */}
            {selectedCase.status === 'urgent' && (
              <div className="p-4 border-b border-prevenort-border flex-shrink-0 bg-prevenort-bg/30 space-y-3">
                {reassignSuccess ? (
                  <div className="flex items-center gap-3 p-4 bg-success/10 border border-success/20 rounded-xl animate-in fade-in duration-300">
                    <CheckCircle2 className="w-5 h-5 text-success" />
                    <div>
                      <p className="text-xs font-black text-success">¡Caso Reasignado con Éxito!</p>
                      <p className="text-[10px] text-success/60">El médico referente ha sido notificado del cambio.</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <button
                      onClick={() => setShowReassignDropdown(!showReassignDropdown)}
                      className="w-full flex items-center justify-center gap-2.5 px-6 py-3.5 bg-gradient-to-r from-rose-600 to-orange-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-rose-500/25 hover:shadow-xl hover:shadow-rose-500/30 transition-all border border-rose-400/30"
                    >
                      <RefreshCw className={cn("w-4 h-4", showReassignDropdown && "animate-spin")} />
                      Reasignar Manualmente
                      <ArrowRightLeft className="w-4 h-4" />
                    </button>

                    {showReassignDropdown && (
                      <div className="space-y-2 animate-in slide-in-from-top-2 duration-300">
                        <p className="text-[9px] font-black text-prevenort-text/30 uppercase tracking-widest px-1">
                          <span className="text-success">●</span> Radiólogos Online — Selecciona destino:
                        </p>
                        {onlineRadiologists.map(rad => (
                          <button
                            key={rad.id}
                            onClick={() => handleReassign(rad.id)}
                            className="w-full flex items-center gap-3 p-3 bg-prevenort-surface border border-prevenort-border rounded-xl hover:border-success/40 hover:bg-success/5 transition-all group text-left"
                          >
                            <div className="w-9 h-9 rounded-xl bg-success/10 border border-success/20 flex items-center justify-center flex-shrink-0 group-hover:bg-success/20 transition-colors">
                              <User className="w-4 h-4 text-success" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-prevenort-text group-hover:text-success transition-colors">{rad.nombre}</p>
                              <p className="text-[10px] text-prevenort-text/30">{rad.especialidad} · {rad.casosActivos} casos activos</p>
                            </div>
                            <ChevronRight className="w-4 h-4 text-prevenort-text/10 group-hover:text-success transition-colors" />
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Chat Audit */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              <div className="p-4 pb-2">
                <div className="flex items-center gap-2 mb-4">
                  <Eye className="w-3.5 h-3.5 text-prevenort-text/30" />
                  <p className="text-[9px] font-black text-prevenort-text/30 uppercase tracking-widest">Auditoría de Chat · Lectura en Tiempo Real</p>
                </div>

                {selectedCase.chat.length === 0 ? (
                  <div className="p-8 text-center">
                    <MessageCircle className="w-8 h-8 text-prevenort-text/10 mx-auto mb-2" />
                    <p className="text-[11px] text-prevenort-text/30">Sin mensajes registrados</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {selectedCase.chat.map(msg => (
                      <div
                        key={msg.id}
                        className={cn(
                          "flex gap-3",
                          msg.role === 'radiologo' && "flex-row-reverse",
                          msg.role === 'coordinator' && "justify-center"
                        )}
                      >
                        {msg.role === 'coordinator' ? (
                          <div className="px-4 py-2 bg-purple-500/10 border border-purple-500/20 rounded-xl max-w-[90%]">
                            <p className="text-[10px] text-purple-400 font-bold">{msg.text}</p>
                            <p className="text-[8px] text-purple-400/40 mt-1">{msg.timestamp}</p>
                          </div>
                        ) : (
                          <>
                            <div className={cn(
                              "w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 text-[10px] font-black border",
                              msg.role === 'referente' ? "bg-info/10 text-info border-info/20" :
                              msg.role === 'radiologo' ? "bg-prevenort-primary/10 text-prevenort-primary border-prevenort-primary/20" :
                              "bg-purple-500/10 text-purple-400 border-purple-500/20"
                            )}>
                              {msg.role === 'bot' ? '🤖' : msg.sender.split(' ').map(w => w[0]).slice(0, 2).join('')}
                            </div>
                            <div className={cn(
                              "max-w-[75%] p-3 rounded-xl border",
                              msg.role === 'referente' ? "bg-info/5 border-info/15 rounded-tl-sm" :
                              msg.role === 'radiologo' ? "bg-prevenort-primary/5 border-prevenort-primary/15 rounded-tr-sm" :
                              "bg-purple-500/5 border-purple-500/15"
                            )}>
                              <div className="flex items-center gap-2 mb-1.5">
                                <span className={cn(
                                  "text-[9px] font-black uppercase tracking-widest",
                                  msg.role === 'referente' ? "text-info" :
                                  msg.role === 'radiologo' ? "text-prevenort-primary" :
                                  "text-purple-400"
                                )}>{msg.sender}</span>
                                <span className="text-[8px] text-prevenort-text/20">{msg.timestamp}</span>
                              </div>
                              <p className="text-[11px] text-prevenort-text/70 leading-relaxed">{msg.text}</p>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Panel Footer */}
            <div className="p-4 border-t border-prevenort-border bg-prevenort-bg/30 flex-shrink-0">
              <div className="flex items-center gap-2 text-[9px] text-prevenort-text/20">
                <Shield className="w-3 h-3" />
                <span>Vista de solo lectura. La intervención del coordinador queda registrada en el log de auditoría.</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
