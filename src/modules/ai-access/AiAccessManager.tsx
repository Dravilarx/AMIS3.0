import React, { useState } from 'react';
import {
  UserCheck, Upload, Search, Filter, X, Phone,
  Building2, CheckCircle2, XCircle, Shield, FileSpreadsheet,
  AlertCircle, UserPlus, Hash, ToggleLeft, ToggleRight,
  ChevronDown, Briefcase, Globe, Users
} from 'lucide-react';
import { cn } from '../../lib/utils';

// --- Tipos ---
type MedicoRol = 'institucional' | 'independiente';

interface Medico {
  id: string;
  nombre: string;
  rut: string;
  telefono: string;
  clinicas: string[];
  rol: MedicoRol;
  activo: boolean;
  fecha_registro: string;
}

// --- Constantes ---
const CLINICAS_DISPONIBLES = [
  'Clínica Portada',
  'Clínica Antofagasta',
  'VitalMédica Santiago',
  'CDT Antofagasta',
  'Centro Médico Los Andes',
  'Clínica Portezuelo',
  'CESFAM Red Sur',
];

// --- Mock Data ---
const MOCK_MEDICOS: Medico[] = [
  {
    id: '1',
    nombre: 'Dr. Alejandro Vásquez Morales',
    rut: '12.345.678-9',
    telefono: '+569 9918 8701',
    clinicas: ['Clínica Portada', 'Clínica Antofagasta'],
    rol: 'institucional',
    activo: true,
    fecha_registro: '2026-03-01T10:00:00',
  },
  {
    id: '2',
    nombre: 'Dra. Carolina Valenzuela Ríos',
    rut: '15.678.234-K',
    telefono: '+569 8877 6543',
    clinicas: ['VitalMédica Santiago'],
    rol: 'institucional',
    activo: true,
    fecha_registro: '2026-03-05T14:30:00',
  },
  {
    id: '3',
    nombre: 'Dr. Patricio Aravena Soto',
    rut: '09.876.543-2',
    telefono: '+569 7766 5544',
    clinicas: ['CDT Antofagasta', 'Clínica Portada'],
    rol: 'institucional',
    activo: false,
    fecha_registro: '2026-02-15T09:00:00',
  },
  {
    id: '4',
    nombre: 'Dr. Andrés Figueroa López',
    rut: '18.234.567-1',
    telefono: '+569 6655 4433',
    clinicas: [],
    rol: 'independiente',
    activo: true,
    fecha_registro: '2026-03-10T11:20:00',
  },
  {
    id: '5',
    nombre: 'Dra. Isabel Contreras Muñoz',
    rut: '14.567.890-3',
    telefono: '+569 5544 3322',
    clinicas: ['Clínica Antofagasta', 'VitalMédica Santiago', 'Centro Médico Los Andes'],
    rol: 'institucional',
    activo: true,
    fecha_registro: '2026-03-08T16:00:00',
  },
  {
    id: '6',
    nombre: 'Dr. Roberto Espinoza Cárdenas',
    rut: '11.222.333-4',
    telefono: '+569 4433 2211',
    clinicas: ['Clínica Portezuelo'],
    rol: 'institucional',
    activo: true,
    fecha_registro: '2026-03-12T08:45:00',
  },
];

// --- Componente Principal ---
export const AiAccessManager: React.FC = () => {
  const [medicos, setMedicos] = useState<Medico[]>(MOCK_MEDICOS);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRol, setFilterRol] = useState<MedicoRol | 'todos'>('todos');
  const [filterEstado, setFilterEstado] = useState<'todos' | 'activo' | 'inactivo'>('todos');
  const [filterClinica, setFilterClinica] = useState<string>('todas');
  const [showAddModal, setShowAddModal] = useState(false);
  const [importClinica, setImportClinica] = useState('');

  // Form state para modal
  const [formNombre, setFormNombre] = useState('');
  const [formRut, setFormRut] = useState('');
  const [formTelefono, setFormTelefono] = useState('');
  const [formClinicas, setFormClinicas] = useState<string[]>([]);
  const [formRol, setFormRol] = useState<MedicoRol>('institucional');

  // --- Handlers ---
  const handleToggleActivo = (id: string) => {
    setMedicos(prev =>
      prev.map(m => m.id === id ? { ...m, activo: !m.activo } : m)
    );
  };

  const handleAddMedico = () => {
    if (!formNombre.trim() || !formRut.trim() || !formTelefono.trim()) return;
    const newMedico: Medico = {
      id: crypto.randomUUID(),
      nombre: formNombre.trim(),
      rut: formRut.trim(),
      telefono: formTelefono.trim(),
      clinicas: [...formClinicas],
      rol: formRol,
      activo: true,
      fecha_registro: new Date().toISOString(),
    };
    setMedicos(prev => [newMedico, ...prev]);
    resetForm();
    setShowAddModal(false);
  };

  const resetForm = () => {
    setFormNombre('');
    setFormRut('');
    setFormTelefono('');
    setFormClinicas([]);
    setFormRol('institucional');
  };

  const handleImportClick = () => {
    if (!importClinica) {
      alert('Selecciona una Red / Cliente antes de importar.');
      return;
    }
    // Simular importación
    alert(`Importación simulada para: ${importClinica}\nEn producción, aquí se procesaría el archivo Excel/CSV.`);
  };

  // --- Filtrado ---
  const filteredMedicos = medicos.filter(m => {
    const matchSearch =
      m.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.rut.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.telefono.includes(searchTerm);
    const matchRol = filterRol === 'todos' || m.rol === filterRol;
    const matchEstado =
      filterEstado === 'todos' ||
      (filterEstado === 'activo' && m.activo) ||
      (filterEstado === 'inactivo' && !m.activo);
    const matchClinica =
      filterClinica === 'todas' || m.clinicas.includes(filterClinica);
    return matchSearch && matchRol && matchEstado && matchClinica;
  });

  // KPIs
  const totalMedicos = medicos.length;
  const medicosActivos = medicos.filter(m => m.activo).length;
  const medicosInactivos = medicos.filter(m => !m.activo).length;
  const clinicasCubiertas = new Set(medicos.flatMap(m => m.clinicas)).size;

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700">
      {/* === HEADER === */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-2xl border border-cyan-500/20">
              <UserCheck className="w-7 h-7 text-cyan-400" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-brand-text tracking-tight uppercase leading-none">
                Gestor de Accesos IA
              </h1>
              <p className="text-[10px] text-brand-text/40 font-bold uppercase tracking-[0.3em]">
                Directorio Médico · Whitelisting & Control de Identidades AMIS
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2.5 px-6 py-3 bg-cyan-600 text-white hover:bg-cyan-500 rounded-2xl transition-all font-black text-[10px] uppercase tracking-widest shadow-lg shadow-cyan-500/25 border border-cyan-400/30"
          >
            <UserPlus className="w-4 h-4" />
            Añadir Médico
          </button>
        </div>
      </div>

      {/* === KPIs === */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card-premium p-5 flex items-center justify-between">
          <div>
            <p className="text-[10px] text-brand-text/40 uppercase font-black tracking-widest">Directorio</p>
            <h3 className="text-3xl font-black text-brand-text">{totalMedicos}</h3>
          </div>
          <div className="p-3 bg-cyan-500/10 rounded-xl border border-cyan-500/20">
            <Users className="w-5 h-5 text-cyan-400" />
          </div>
        </div>
        <div className="card-premium p-5 flex items-center justify-between">
          <div>
            <p className="text-[10px] text-brand-text/40 uppercase font-black tracking-widest">Activos</p>
            <h3 className="text-3xl font-black text-success">{medicosActivos}</h3>
          </div>
          <div className="p-3 bg-success/10 rounded-xl border border-success/20">
            <CheckCircle2 className="w-5 h-5 text-success" />
          </div>
        </div>
        <div className="card-premium p-5 flex items-center justify-between">
          <div>
            <p className="text-[10px] text-brand-text/40 uppercase font-black tracking-widest">Bloqueados</p>
            <h3 className="text-3xl font-black text-danger">{medicosInactivos}</h3>
          </div>
          <div className="p-3 bg-danger/10 rounded-xl border border-danger/20">
            <XCircle className="w-5 h-5 text-danger" />
          </div>
        </div>
        <div className="card-premium p-5 flex items-center justify-between">
          <div>
            <p className="text-[10px] text-brand-text/40 uppercase font-black tracking-widest">Clínicas</p>
            <h3 className="text-3xl font-black text-info">{clinicasCubiertas}</h3>
          </div>
          <div className="p-3 bg-info/10 rounded-xl border border-info/20">
            <Building2 className="w-5 h-5 text-info" />
          </div>
        </div>
      </div>

      {/* === IMPORTACIÓN MASIVA === */}
      <div className="card-premium !p-0 overflow-hidden">
        <div className="p-6 bg-gradient-to-r from-cyan-500/5 to-transparent border-b border-brand-border">
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 bg-cyan-500/15 rounded-xl border border-cyan-500/20">
              <FileSpreadsheet className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h3 className="text-sm font-black text-brand-text uppercase tracking-wide">
                Importación de Nómina Clínica
              </h3>
              <p className="text-[9px] text-brand-text/30 font-bold uppercase tracking-widest">
                Onboarding B2B · Carga masiva de médicos acreditados
              </p>
            </div>
          </div>
        </div>
        <div className="p-6">
          <div className="flex flex-col md:flex-row items-stretch gap-4">
            {/* Selector de Clínica */}
            <div className="flex-1">
              <label className="text-[9px] font-black text-brand-text/40 uppercase tracking-widest mb-2 block">
                Red / Cliente destino
              </label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-text/20" />
                <select
                  value={importClinica}
                  onChange={(e) => setImportClinica(e.target.value)}
                  className="w-full bg-brand-bg border border-brand-border rounded-xl pl-10 pr-10 py-3.5 text-sm text-brand-text font-bold appearance-none focus:outline-none focus:border-cyan-500/40 focus:ring-2 focus:ring-cyan-500/10 transition-all cursor-pointer"
                >
                  <option value="">Selecciona una clínica...</option>
                  {CLINICAS_DISPONIBLES.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-text/20 pointer-events-none" />
              </div>
            </div>

            {/* Dropzone de Excel */}
            <div className="flex-1">
              <label className="text-[9px] font-black text-brand-text/40 uppercase tracking-widest mb-2 block">
                Archivo de nómina
              </label>
              <div
                onClick={handleImportClick}
                className={cn(
                  "relative border-2 border-dashed rounded-xl p-3.5 transition-all cursor-pointer group flex items-center gap-4",
                  importClinica
                    ? "border-cyan-500/30 hover:border-cyan-500 hover:bg-cyan-500/5 bg-brand-bg"
                    : "border-brand-border bg-brand-bg/50 opacity-60"
                )}
              >
                <div className={cn(
                  "p-3 rounded-xl transition-all flex-shrink-0",
                  importClinica
                    ? "bg-cyan-500/10 group-hover:bg-cyan-500/20"
                    : "bg-brand-surface"
                )}>
                  <Upload className={cn(
                    "w-6 h-6 transition-colors",
                    importClinica
                      ? "text-cyan-400 group-hover:animate-bounce"
                      : "text-brand-text/20"
                  )} />
                </div>
                <div>
                  <p className={cn(
                    "text-xs font-black uppercase tracking-tight",
                    importClinica ? "text-brand-text" : "text-brand-text/30"
                  )}>
                    Importar Excel/CSV de Médicos Acreditados
                  </p>
                  <p className="text-[9px] text-brand-text/30 mt-0.5">
                    Formatos: .xlsx, .xls, .csv · Columnas: Nombre, RUT, Teléfono
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Info de seguridad */}
          <div className="mt-4 flex items-center gap-2 text-[9px] text-brand-text/25">
            <Shield className="w-3 h-3 flex-shrink-0" />
            <span>Los médicos importados quedarán en estado <strong className="text-cyan-400">Activo</strong> y serán verificados por WhatsApp antes de acceder al bot.</span>
          </div>
        </div>
      </div>

      {/* === FILTROS + BUSCADOR === */}
      <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
        <div className="relative flex-1 min-w-[250px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-text/20" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nombre, RUT o teléfono..."
            className="w-full bg-brand-surface border border-brand-border rounded-xl pl-11 pr-4 py-3 text-sm text-brand-text focus:outline-none focus:border-cyan-500/30 focus:ring-2 focus:ring-cyan-500/10 transition-all"
          />
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-brand-text/20" />
            <span className="text-[9px] font-black text-brand-text/30 uppercase tracking-widest">Filtros:</span>
          </div>

          {/* Filtro Rol */}
          <select
            value={filterRol}
            onChange={(e) => setFilterRol(e.target.value as MedicoRol | 'todos')}
            className="bg-brand-surface border border-brand-border rounded-lg px-3 py-2 text-[11px] text-brand-text font-bold appearance-none focus:outline-none focus:border-cyan-500/30 transition-all cursor-pointer pr-8"
          >
            <option value="todos">Todos los Roles</option>
            <option value="institucional">Institucional</option>
            <option value="independiente">Independiente</option>
          </select>

          {/* Filtro Estado */}
          <select
            value={filterEstado}
            onChange={(e) => setFilterEstado(e.target.value as 'todos' | 'activo' | 'inactivo')}
            className="bg-brand-surface border border-brand-border rounded-lg px-3 py-2 text-[11px] text-brand-text font-bold appearance-none focus:outline-none focus:border-cyan-500/30 transition-all cursor-pointer pr-8"
          >
            <option value="todos">Todos los Estados</option>
            <option value="activo">Activos</option>
            <option value="inactivo">Bloqueados</option>
          </select>

          {/* Filtro Clínica */}
          <select
            value={filterClinica}
            onChange={(e) => setFilterClinica(e.target.value)}
            className="bg-brand-surface border border-brand-border rounded-lg px-3 py-2 text-[11px] text-brand-text font-bold appearance-none focus:outline-none focus:border-cyan-500/30 transition-all cursor-pointer pr-8"
          >
            <option value="todas">Todas las Clínicas</option>
            {CLINICAS_DISPONIBLES.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      {/* === TABLA DE IDENTIDADES === */}
      <div className="bg-brand-surface border border-brand-border rounded-2xl overflow-hidden shadow-sm overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-brand-border bg-brand-bg/30">
              <th className="px-5 py-4 text-[9px] font-black text-brand-text/40 uppercase tracking-widest whitespace-nowrap">
                Profesional
              </th>
              <th className="px-5 py-4 text-[9px] font-black text-brand-text/40 uppercase tracking-widest whitespace-nowrap">
                <div className="flex items-center gap-1.5">
                  <Phone className="w-3 h-3" />
                  Contacto / WhatsApp
                </div>
              </th>
              <th className="px-5 py-4 text-[9px] font-black text-brand-text/40 uppercase tracking-widest whitespace-nowrap">
                Clínicas Asociadas
              </th>
              <th className="px-5 py-4 text-[9px] font-black text-brand-text/40 uppercase tracking-widest whitespace-nowrap text-center">
                Rol
              </th>
              <th className="px-5 py-4 text-[9px] font-black text-brand-text/40 uppercase tracking-widest whitespace-nowrap text-center">
                <div className="flex items-center gap-1.5 justify-center">
                  <Shield className="w-3 h-3" />
                  Estado de Acceso
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-border">
            {filteredMedicos.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-16 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <Users className="w-12 h-12 text-brand-text/10" />
                    <p className="text-[11px] text-brand-text/30 font-bold">
                      {searchTerm || filterRol !== 'todos' || filterEstado !== 'todos' || filterClinica !== 'todas'
                        ? 'No hay profesionales que coincidan con los filtros'
                        : 'El directorio está vacío. Importa o agrega médicos para comenzar.'}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredMedicos.map((medico) => (
                <tr
                  key={medico.id}
                  className={cn(
                    "hover:bg-cyan-500/5 transition-colors group",
                    !medico.activo && "opacity-60"
                  )}
                >
                  {/* Profesional */}
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black border transition-colors flex-shrink-0",
                        medico.activo
                          ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20"
                          : "bg-brand-surface text-brand-text/20 border-brand-border"
                      )}>
                        {medico.nombre.split(' ').filter((_,i) => i === 0 || i === 1).map(w => w[0]).join('')}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-brand-text/90 group-hover:text-cyan-400 transition-colors">
                          {medico.nombre}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <Hash className="w-2.5 h-2.5 text-brand-text/20" />
                          <span className="text-[10px] text-brand-text/30 font-mono">{medico.rut}</span>
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Contacto / WhatsApp */}
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-success/10 rounded-lg">
                        <Phone className="w-3.5 h-3.5 text-success" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-brand-text/80 font-mono">{medico.telefono}</p>
                        <p className="text-[9px] text-success/60 font-bold uppercase tracking-widest">WhatsApp</p>
                      </div>
                    </div>
                  </td>

                  {/* Clínicas Asociadas */}
                  <td className="px-5 py-4">
                    <div className="flex flex-wrap gap-1.5">
                      {medico.clinicas.length === 0 ? (
                        <span className="text-[9px] text-brand-text/20 italic flex items-center gap-1">
                          <Globe className="w-3 h-3" />
                          Solo acceso público
                        </span>
                      ) : (
                        medico.clinicas.map(c => (
                          <span key={c} className="text-[8px] font-black text-info bg-info/10 px-2 py-1 rounded-lg border border-info/20 whitespace-nowrap">
                            <Building2 className="w-2.5 h-2.5 inline mr-0.5 -mt-px" />
                            {c}
                          </span>
                        ))
                      )}
                    </div>
                  </td>

                  {/* Rol */}
                  <td className="px-5 py-4 text-center">
                    <span className={cn(
                      "inline-flex items-center gap-1.5 text-[8px] px-2.5 py-1 rounded-lg font-black uppercase tracking-widest border",
                      medico.rol === 'institucional'
                        ? "bg-brand-primary/10 text-brand-primary border-brand-primary/20"
                        : "bg-purple-500/10 text-purple-400 border-purple-500/20"
                    )}>
                      {medico.rol === 'institucional' ? (
                        <><Briefcase className="w-3 h-3" /> Institucional</>
                      ) : (
                        <><Globe className="w-3 h-3" /> Independiente</>
                      )}
                    </span>
                  </td>

                  {/* Estado de Acceso (Toggle) */}
                  <td className="px-5 py-4 text-center">
                    <button
                      onClick={() => handleToggleActivo(medico.id)}
                      className="inline-flex items-center gap-2 group/toggle"
                      title={medico.activo ? 'Bloquear acceso' : 'Reactivar acceso'}
                    >
                      {medico.activo ? (
                        <>
                          <ToggleRight className="w-8 h-8 text-success group-hover/toggle:scale-110 transition-transform" />
                          <span className="text-[8px] font-black text-success uppercase tracking-widest">Activo</span>
                        </>
                      ) : (
                        <>
                          <ToggleLeft className="w-8 h-8 text-danger/60 group-hover/toggle:scale-110 transition-transform" />
                          <span className="text-[8px] font-black text-danger uppercase tracking-widest">Bloqueado</span>
                        </>
                      )}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Footer de tabla */}
        <div className="px-5 py-3 border-t border-brand-border bg-brand-bg/20 flex items-center justify-between">
          <span className="text-[10px] text-brand-text/25 font-bold">
            {filteredMedicos.length} de {medicos.length} profesionales
          </span>
          <div className="flex items-center gap-1.5 text-[9px] text-brand-text/20">
            <Shield className="w-3 h-3" />
            <span>El estado de acceso se aplica en <strong className="text-cyan-400">tiempo real</strong> al motor del bot omnicanal</span>
          </div>
        </div>
      </div>

      {/* === MODAL: AÑADIR MÉDICO === */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="w-full max-w-lg bg-brand-surface border border-brand-border rounded-3xl shadow-2xl shadow-cyan-500/10 animate-in slide-in-from-bottom-4 duration-500 overflow-hidden">
            {/* Modal Header */}
            <div className="p-6 border-b border-brand-border bg-gradient-to-r from-cyan-500/10 to-transparent">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-cyan-500/20 rounded-xl border border-cyan-500/30">
                    <UserPlus className="w-5 h-5 text-cyan-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-brand-text uppercase tracking-tight">
                      Registrar Médico
                    </h3>
                    <p className="text-[10px] text-brand-text/40 font-bold uppercase tracking-widest">
                      Alta manual en el directorio
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => { setShowAddModal(false); resetForm(); }}
                  className="p-2 rounded-xl text-brand-text/30 hover:text-brand-text hover:bg-brand-bg transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-5">
              {/* Nombre */}
              <div>
                <label className="text-[9px] font-black text-brand-text/40 uppercase tracking-widest mb-2 block">
                  Nombre completo del Profesional
                </label>
                <input
                  type="text"
                  value={formNombre}
                  onChange={(e) => setFormNombre(e.target.value)}
                  placeholder="Dr. Juan Pérez Soto"
                  className="w-full bg-brand-bg border border-brand-border rounded-xl px-4 py-3 text-sm text-brand-text font-bold focus:outline-none focus:border-cyan-500/40 focus:ring-2 focus:ring-cyan-500/10 transition-all placeholder:text-brand-text/20"
                />
              </div>

              {/* RUT + Teléfono */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] font-black text-brand-text/40 uppercase tracking-widest mb-2 block">
                    RUT
                  </label>
                  <input
                    type="text"
                    value={formRut}
                    onChange={(e) => setFormRut(e.target.value)}
                    placeholder="12.345.678-9"
                    className="w-full bg-brand-bg border border-brand-border rounded-xl px-4 py-3 text-sm text-brand-text font-mono focus:outline-none focus:border-cyan-500/40 focus:ring-2 focus:ring-cyan-500/10 transition-all placeholder:text-brand-text/20"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-black text-brand-text/40 uppercase tracking-widest mb-2 block">
                    WhatsApp / Celular
                  </label>
                  <input
                    type="tel"
                    value={formTelefono}
                    onChange={(e) => setFormTelefono(e.target.value)}
                    placeholder="+569 9918 8701"
                    className="w-full bg-brand-bg border border-brand-border rounded-xl px-4 py-3 text-sm text-brand-text font-mono focus:outline-none focus:border-cyan-500/40 focus:ring-2 focus:ring-cyan-500/10 transition-all placeholder:text-brand-text/20"
                  />
                </div>
              </div>

              {/* Rol */}
              <div>
                <label className="text-[9px] font-black text-brand-text/40 uppercase tracking-widest mb-2 block">
                  Tipo de Acceso
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setFormRol('institucional')}
                    className={cn(
                      "px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 justify-center border",
                      formRol === 'institucional'
                        ? "bg-brand-primary/15 text-brand-primary border-brand-primary/30 shadow-lg shadow-brand-primary/10"
                        : "bg-brand-bg border-brand-border text-brand-text/40 hover:border-brand-text/20"
                    )}
                  >
                    <Briefcase className="w-4 h-4" />
                    Institucional
                  </button>
                  <button
                    onClick={() => setFormRol('independiente')}
                    className={cn(
                      "px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 justify-center border",
                      formRol === 'independiente'
                        ? "bg-purple-500/15 text-purple-400 border-purple-500/30 shadow-lg shadow-purple-500/10"
                        : "bg-brand-bg border-brand-border text-brand-text/40 hover:border-brand-text/20"
                    )}
                  >
                    <Globe className="w-4 h-4" />
                    Independiente
                  </button>
                </div>
              </div>

              {/* Clínicas (solo si Institucional) */}
              {formRol === 'institucional' && (
                <div>
                  <label className="text-[9px] font-black text-brand-text/40 uppercase tracking-widest mb-2 block">
                    Clínicas Asociadas
                  </label>
                  <div className="grid grid-cols-2 gap-2 max-h-[140px] overflow-y-auto custom-scrollbar">
                    {CLINICAS_DISPONIBLES.map(clinica => (
                      <button
                        key={clinica}
                        onClick={() => setFormClinicas(prev =>
                          prev.includes(clinica) ? prev.filter(c => c !== clinica) : [...prev, clinica]
                        )}
                        className={cn(
                          "text-left px-3 py-2.5 rounded-xl text-[10px] font-bold transition-all flex items-center gap-2 border",
                          formClinicas.includes(clinica)
                            ? "bg-info/15 text-info border-info/30"
                            : "text-brand-text/40 border-brand-border hover:bg-brand-bg hover:text-brand-text"
                        )}
                      >
                        <div className={cn(
                          "w-4 h-4 rounded border flex items-center justify-center transition-all flex-shrink-0",
                          formClinicas.includes(clinica)
                            ? "bg-info border-info"
                            : "border-brand-border"
                        )}>
                          {formClinicas.includes(clinica) && <CheckCircle2 className="w-3 h-3 text-white" />}
                        </div>
                        <Building2 className="w-3 h-3 flex-shrink-0" />
                        {clinica}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-brand-border bg-brand-bg/30 flex items-center justify-between">
              <div className="flex items-center gap-2 text-[9px] text-brand-text/25">
                <AlertCircle className="w-3 h-3" />
                <span>El médico recibirá un mensaje de verificación por WhatsApp</span>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => { setShowAddModal(false); resetForm(); }}
                  className="px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-brand-text/50 border border-brand-border hover:bg-brand-surface transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleAddMedico}
                  disabled={!formNombre.trim() || !formRut.trim() || !formTelefono.trim()}
                  className={cn(
                    "flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg",
                    formNombre.trim() && formRut.trim() && formTelefono.trim()
                      ? "bg-cyan-600 text-white hover:bg-cyan-500 shadow-cyan-500/25 border border-cyan-400/30"
                      : "bg-brand-surface text-brand-text/20 border border-brand-border cursor-not-allowed shadow-none"
                  )}
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  Registrar en Directorio
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
