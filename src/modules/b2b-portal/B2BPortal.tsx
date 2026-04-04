import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { resolvePublicSignatureNameSync } from '../../lib/signatureUtils';
import { 
  ClipboardList, 
  Download, 
  MessageSquareWarning, 
  Clock, 
  Search,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Hospital
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Study {
  id: string;
  accession_number: string;
  paciente_nombre: string;
  paciente_id: string; // RUT
  examen_nombre: string;
  fecha_examen: string;
  fecha_validacion: string | null;
  radiologo_validado: string | null;
  has_addendum: boolean;
}

export const B2BPortal: React.FC = () => {
  const [studies, setStudies] = useState<Study[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudy, setSelectedStudy] = useState<Study | null>(null);
  const [addendumText, setAddendumText] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Stats mockeados para el prototipo "Aura"
  const stats = [
    { label: 'Volumen Mensual', value: '1,280', icon: TrendingUp, color: 'text-emerald-400' },
    { label: 'TAT Promedio (Hrs)', value: '1.4', icon: Clock, color: 'text-cyan-400' },
    { label: 'Addendums Pendientes', value: '3', icon: AlertCircle, color: 'text-amber-400' },
    { label: 'Precisión Operativa', value: '99.2%', icon: CheckCircle2, color: 'text-indigo-400' },
  ];

  useEffect(() => {
    fetchStudies();
  }, []);

  const fetchStudies = async () => {
    try {
      setLoading(true);
      // En un caso real filtramos por la institución del usuario logueado
      const { data, error } = await supabase
        .from('multiris_production')
        .select('id, accession_number, paciente_nombre, paciente_id, examen_nombre, fecha_examen, fecha_validacion, radiologo_validado, has_addendum')
        .order('fecha_examen', { ascending: false })
        .limit(20);

      if (error) throw error;
      setStudies(data || []);
    } catch (err) {
      console.error('Error fetching studies:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestAddendum = async () => {
    if (!selectedStudy || !addendumText) return;

    try {
      const { error } = await supabase
        .from('addendum_requests')
        .insert({
          study_uid: selectedStudy.accession_number,
          patient_rut: selectedStudy.paciente_id,
          request_text: addendumText,
          status: 'TRIAGE_PENDING'
        });

      if (error) throw error;
      
      alert('✅ Solicitud enviada a la bandeja de triage. Secretaría administrativa revisará y asignará al especialista correspondiente.');
      setIsModalOpen(false);
      setAddendumText('');
      setSelectedStudy(null);
    } catch (err) {
      console.error('Error requesting addendum:', err);
    }
  };

  return (
    <div className="p-6 space-y-8 animate-in fade-in duration-700">
      {/* Header Aura B2B */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent">
            Portal B2B • Centro Médico Salud
          </h1>
          <p className="text-slate-400 mt-1 flex items-center gap-2">
            <Hospital className="w-4 h-4" /> Gestión de Informes e Interconsultas en Tiempo Real
          </p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-slate-900/50 rounded-full border border-slate-800 backdrop-blur-md">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-medium text-slate-300">Sincronizado vía CloudSync</span>
        </div>
      </div>

      {/* Stats Panel */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <div key={i} className="group relative overflow-hidden bg-slate-900/40 border border-slate-800 rounded-2xl p-6 hover:border-indigo-500/50 transition-all cursor-default">
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -mr-8 -mt-8 blur-3xl group-hover:bg-indigo-500/10 transition-colors" />
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">{stat.label}</p>
                <p className="text-2xl font-bold mt-1 text-slate-100">{stat.value}</p>
              </div>
              <div className={`p-2 rounded-xl bg-slate-800 ${stat.color}`}>
                <stat.icon className="w-5 h-5" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Worklist Section */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-2xl overflow-hidden backdrop-blur-xl">
        <div className="p-4 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/20 rounded-lg text-indigo-400">
              <ClipboardList className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-semibold text-slate-100">Worklist de Exámenes</h2>
          </div>
          
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input 
              type="text" 
              placeholder="Buscar paciente, informe o estudio..."
              className="w-full bg-slate-800/40 border border-slate-700 rounded-xl py-2 pl-10 pr-4 text-slate-200 focus:outline-none focus:border-indigo-500/50 transition-colors"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-800/30 text-slate-400 text-xs uppercase tracking-wider">
                <th className="p-4 font-medium">Estado</th>
                <th className="p-4 font-medium">Paciente / Estudio</th>
                <th className="p-4 font-medium">Accession</th>
                <th className="p-4 font-medium">Fecha</th>
                <th className="p-4 font-medium">Radiólogo</th>
                <th className="p-4 font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500 animate-pulse">Cargando estudios del centro...</td>
                </tr>
              ) : studies.map((study) => (
                <tr key={study.id} className="hover:bg-white/[0.02] transition-colors group">
                  <td className="p-4">
                    {study.fecha_validacion ? (
                      <span className="flex items-center gap-1.5 px-2 py-1 bg-emerald-500/10 text-emerald-500 rounded-full text-[10px] font-bold tracking-tight">
                        <CheckCircle2 className="w-3 h-3" /> INFORMADO
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 px-2 py-1 bg-amber-500/10 text-amber-500 rounded-full text-[10px] font-bold tracking-tight">
                        <Clock className="w-3 h-3" /> EN PROCESO
                      </span>
                    )}
                  </td>
                  <td className="p-4">
                    <div className="font-medium text-slate-200">{study.paciente_nombre}</div>
                    <div className="text-xs text-slate-500">{study.examen_nombre}</div>
                  </td>
                  <td className="p-4 text-sm font-mono text-indigo-400">{study.accession_number}</td>
                  <td className="p-4 text-sm text-slate-400">
                    {format(new Date(study.fecha_examen), 'P', { locale: es })}
                  </td>
                  <td className="p-4 text-sm text-slate-300">
                    {study.radiologo_validado
                      ? resolvePublicSignatureNameSync({
                          clinicalRole: undefined, // No disponible en esta query
                          ownName: study.radiologo_validado,
                          publicNameAllowed: true,  // radiologo_validado ya es el nombre público del RIS
                        })
                      : 'Asignando...'}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2 opacity-50 group-hover:opacity-100 transition-opacity">
                      {study.fecha_validacion && (
                        <button 
                          className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 transition-colors"
                          title="Descargar PDF firmado"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      )}
                      <button 
                        onClick={() => {
                          setSelectedStudy(study);
                          setIsModalOpen(true);
                        }}
                        className="p-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 rounded-lg transition-colors"
                        title="Solicitar Addendum / Interconsulta"
                      >
                        <MessageSquareWarning className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Solicitud de Addendum */}
      {isModalOpen && selectedStudy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in zoom-in duration-300">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl p-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 bg-indigo-500/10 rounded-2xl text-indigo-400">
                <MessageSquareWarning className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-100">Solicitar Addendum Manual</h3>
                <p className="text-sm text-slate-500">Examen: {selectedStudy.accession_number} • {selectedStudy.paciente_nombre}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Describa su duda médica o el motivo del addendum</label>
                <textarea 
                  className="w-full bg-slate-800/50 border border-slate-700 rounded-xl p-4 text-slate-200 min-h-[120px] focus:outline-none focus:border-indigo-500 transition-colors placeholder:text-slate-600"
                  placeholder="Ej: Solicito revisar fase venosa por sospecha de hallazgo no descrito en riñón izquierdo..."
                  value={addendumText}
                  onChange={(e) => setAddendumText(e.target.value)}
                />
              </div>

              <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl">
                <p className="text-xs text-amber-500 leading-relaxed italic">
                  * Su solicitud ingresará a la bandeja de triage de Secretaría Administrativa, quien la revisará y asignará al especialista correspondiente. Tiempo de respuesta estimado: 2-4 horas hábiles.
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 mt-8">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="flex-1 px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-all font-medium"
              >
                Cancelar
              </button>
              <button 
                disabled={!addendumText}
                onClick={handleRequestAddendum}
                className="flex-1 px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:shadow-lg hover:shadow-indigo-500/20 text-white rounded-xl transition-all font-medium disabled:opacity-50"
              >
                Enviar Solicitud
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
