import React, { useState, useCallback } from 'react';
import {
  Brain, Upload, FileText, Trash2, Search, Settings2,
  CheckCircle2, AlertCircle, Building2, Tag, Plus,
  Sparkles, Zap, Database, Globe, X, FileUp,
  Shield, Eye, Stethoscope, Briefcase, Lock
} from 'lucide-react';
import { cn } from '../../lib/utils';

// --- Tipos ---
type AudienceLevel = 'public' | 'medicos' | 'admin_clinicas' | 'interno';

interface AudienceConfig {
  id: AudienceLevel;
  label: string;
  shortLabel: string;
  emoji: string;
  color: string;
  badgeClass: string;
  icon: React.ElementType;
}

interface KBDocument {
  id: string;
  filename: string;
  type: 'pdf' | 'docx' | 'txt';
  size: string;
  uploaded_at: string;
  status: 'processing' | 'indexed' | 'error';
  scope: string[];
  audience: AudienceLevel[];
  tags: string[];
}

// --- Configuración de Audiencias RBAC ---
const AUDIENCE_LEVELS: AudienceConfig[] = [
  {
    id: 'public',
    label: 'Público (Pacientes)',
    shortLabel: 'Pacientes',
    emoji: '🟢',
    color: 'text-emerald-400',
    badgeClass: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
    icon: Eye,
  },
  {
    id: 'medicos',
    label: 'Médicos Referentes (Externos)',
    shortLabel: 'Médicos Ext.',
    emoji: '🔵',
    color: 'text-blue-400',
    badgeClass: 'bg-blue-500/15 text-blue-400 border-blue-500/25',
    icon: Stethoscope,
  },
  {
    id: 'admin_clinicas',
    label: 'Administración Clínicas (B2B)',
    shortLabel: 'Admin B2B',
    emoji: '🟠',
    color: 'text-orange-400',
    badgeClass: 'bg-orange-500/15 text-orange-400 border-orange-500/25',
    icon: Briefcase,
  },
  {
    id: 'interno',
    label: 'Interno AMIS (Radiólogos/Staff)',
    shortLabel: 'Interno',
    emoji: '🔴',
    color: 'text-red-400',
    badgeClass: 'bg-red-500/15 text-red-400 border-red-500/25',
    icon: Shield,
  },
];

// --- Mock Data ---
const MOCK_DOCUMENTS: KBDocument[] = [
  {
    id: '1',
    filename: 'Protocolo_SLA_VitalMedica_2026.pdf',
    type: 'pdf',
    size: '2.4 MB',
    uploaded_at: '2026-03-15T10:30:00',
    status: 'indexed',
    scope: ['VitalMédica Santiago'],
    audience: ['admin_clinicas', 'interno'],
    tags: ['SLA', 'Protocolo'],
  },
  {
    id: '2',
    filename: 'Lista_Precios_Imagenología_Q1.pdf',
    type: 'pdf',
    size: '890 KB',
    uploaded_at: '2026-03-14T16:45:00',
    status: 'indexed',
    scope: ['Red AMIS Completa'],
    audience: ['public', 'medicos', 'admin_clinicas'],
    tags: ['Precios', 'Imagenología'],
  },
  {
    id: '3',
    filename: 'Manual_Operaciones_CDT_Antofagasta.docx',
    type: 'docx',
    size: '5.1 MB',
    uploaded_at: '2026-03-12T08:00:00',
    status: 'processing',
    scope: ['CDT Antofagasta'],
    audience: ['interno'],
    tags: ['Manual', 'Operaciones'],
  },
  {
    id: '4',
    filename: 'Convenio_Marco_FONASA_2026.pdf',
    type: 'pdf',
    size: '1.7 MB',
    uploaded_at: '2026-03-10T14:20:00',
    status: 'indexed',
    scope: ['Red AMIS Completa', 'VitalMédica Santiago'],
    audience: ['medicos', 'admin_clinicas', 'interno'],
    tags: ['FONASA', 'Convenio'],
  },
];

const AVAILABLE_SCOPES = [
  'Red AMIS Completa',
  'VitalMédica Santiago',
  'CDT Antofagasta',
  'Centro Médico Los Andes',
  'Clínica Portezuelo',
  'CESFAM Red Sur',
];

const DEFAULT_SYSTEM_PROMPT = `Eres el Coordinador Operativo de la Red AMIS. Tu objetivo es asistir a las clínicas clientes y médicos de nuestra red con respuestas precisas, profesionales y basadas exclusivamente en los documentos oficiales que se te han proporcionado.

Reglas de comportamiento:
1. Responde SOLO con información contenida en los documentos de la Base de Conocimiento.
2. Si no tienes la información, indica que consultarás al equipo de Mesa Central y derivarás al canal adecuado.
3. Cita siempre el documento fuente de tu respuesta.
4. Mantén un tono profesional, empático y orientado a la resolución.
5. Prioriza la seguridad del paciente en todas tus respuestas.
6. Adapta tus respuestas según el perfil del interlocutor (médico, administrativo, paciente).`;

// --- Staging file type for upload wizard ---
interface StagingFile {
  file: File;
  id: string;
  filename: string;
  type: 'pdf' | 'docx' | 'txt';
  size: string;
}

// --- Componente Principal ---
export const AiKnowledgeBase: React.FC = () => {
  const [documents, setDocuments] = useState<KBDocument[]>(MOCK_DOCUMENTS);
  const [systemPrompt, setSystemPrompt] = useState(DEFAULT_SYSTEM_PROMPT);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDragActive, setIsDragActive] = useState(false);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [showScopeEditor, setShowScopeEditor] = useState<string | null>(null);
  const [showAudienceEditor, setShowAudienceEditor] = useState<string | null>(null);
  const [promptSaved, setPromptSaved] = useState(false);

  // Upload wizard state
  const [showUploadWizard, setShowUploadWizard] = useState(false);
  const [stagingFiles, setStagingFiles] = useState<StagingFile[]>([]);
  const [wizardScope, setWizardScope] = useState<string[]>([]);
  const [wizardAudience, setWizardAudience] = useState<AudienceLevel[]>([]);

  // --- Drag & Drop Handlers ---
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragActive(true);
    } else if (e.type === 'dragleave') {
      setIsDragActive(false);
    }
  }, []);

  const processFilesForStaging = (files: File[]) => {
    const staged: StagingFile[] = files.map(file => ({
      file,
      id: crypto.randomUUID(),
      filename: file.name,
      type: file.name.endsWith('.pdf') ? 'pdf' as const : file.name.endsWith('.docx') ? 'docx' as const : 'txt' as const,
      size: `${(file.size / 1024 / 1024).toFixed(1)} MB`,
    }));
    setStagingFiles(staged);
    setWizardScope([]);
    setWizardAudience([]);
    setShowUploadWizard(true);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    const files = Array.from(e.dataTransfer.files);
    processFilesForStaging(files);
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      processFilesForStaging(files);
    }
  };

  const handleConfirmUpload = () => {
    const newDocs: KBDocument[] = stagingFiles.map(sf => ({
      id: sf.id,
      filename: sf.filename,
      type: sf.type,
      size: sf.size,
      uploaded_at: new Date().toISOString(),
      status: 'processing' as const,
      scope: [...wizardScope],
      audience: [...wizardAudience],
      tags: [],
    }));
    setDocuments(prev => [...newDocs, ...prev]);
    setShowUploadWizard(false);
    setStagingFiles([]);
    setWizardScope([]);
    setWizardAudience([]);
  };

  const handleCancelUpload = () => {
    setShowUploadWizard(false);
    setStagingFiles([]);
    setWizardScope([]);
    setWizardAudience([]);
  };

  const handleDeleteDoc = (id: string) => {
    setDocuments(prev => prev.filter(d => d.id !== id));
    if (selectedDocId === id) setSelectedDocId(null);
  };

  const handleToggleScope = (docId: string, scope: string) => {
    setDocuments(prev =>
      prev.map(d => {
        if (d.id !== docId) return d;
        const hasScope = d.scope.includes(scope);
        return {
          ...d,
          scope: hasScope
            ? d.scope.filter(s => s !== scope)
            : [...d.scope, scope],
        };
      })
    );
  };

  const handleToggleAudience = (docId: string, level: AudienceLevel) => {
    setDocuments(prev =>
      prev.map(d => {
        if (d.id !== docId) return d;
        const has = d.audience.includes(level);
        return {
          ...d,
          audience: has
            ? d.audience.filter(a => a !== level)
            : [...d.audience, level],
        };
      })
    );
  };

  const handleSavePrompt = () => {
    setPromptSaved(true);
    setTimeout(() => setPromptSaved(false), 3000);
  };

  const filteredDocs = documents.filter(d =>
    d.filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.tags.some(t => t.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const getStatusConfig = (status: KBDocument['status']) => {
    switch (status) {
      case 'indexed':
        return { label: 'INDEXADO', color: 'bg-success/15 text-success border-success/20', icon: CheckCircle2 };
      case 'processing':
        return { label: 'PROCESANDO', color: 'bg-warning/15 text-warning border-warning/20', icon: Zap };
      case 'error':
        return { label: 'ERROR', color: 'bg-danger/15 text-danger border-danger/20', icon: AlertCircle };
    }
  };

  const getFileIcon = (type: KBDocument['type']) => {
    switch (type) {
      case 'pdf': return '📄';
      case 'docx': return '📝';
      default: return '📃';
    }
  };

  // KPIs
  const totalDocs = documents.length;
  const indexedDocs = documents.filter(d => d.status === 'indexed').length;
  const processingDocs = documents.filter(d => d.status === 'processing').length;
  const totalScopes = new Set(documents.flatMap(d => d.scope)).size;

  const canConfirmUpload = wizardScope.length > 0 && wizardAudience.length > 0;

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700">
      {/* === HEADER === */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-2xl border border-purple-500/20">
              <Brain className="w-7 h-7 text-purple-400" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-prevenort-text tracking-tight uppercase leading-none">
                Cerebro IA
              </h1>
              <p className="text-[10px] text-prevenort-text/40 font-bold uppercase tracking-[0.3em]">
                Knowledge Base · Mesa Central de Inteligencia AMIS
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-4 py-2.5 bg-success/10 border border-success/20 rounded-2xl">
            <div className="w-2 h-2 bg-success rounded-full animate-pulse" />
            <span className="text-[10px] font-black text-success uppercase tracking-widest">Motor IA Activo</span>
          </div>
        </div>
      </div>

      {/* === KPIs === */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card-premium p-5 flex items-center justify-between">
          <div>
            <p className="text-[10px] text-prevenort-text/40 uppercase font-black tracking-widest">Documentos</p>
            <h3 className="text-3xl font-black text-prevenort-text">{totalDocs}</h3>
          </div>
          <div className="p-3 bg-purple-500/10 rounded-xl border border-purple-500/20">
            <Database className="w-5 h-5 text-purple-400" />
          </div>
        </div>
        <div className="card-premium p-5 flex items-center justify-between">
          <div>
            <p className="text-[10px] text-prevenort-text/40 uppercase font-black tracking-widest">Indexados</p>
            <h3 className="text-3xl font-black text-success">{indexedDocs}</h3>
          </div>
          <div className="p-3 bg-success/10 rounded-xl border border-success/20">
            <CheckCircle2 className="w-5 h-5 text-success" />
          </div>
        </div>
        <div className="card-premium p-5 flex items-center justify-between">
          <div>
            <p className="text-[10px] text-prevenort-text/40 uppercase font-black tracking-widest">Procesando</p>
            <h3 className="text-3xl font-black text-warning">{processingDocs}</h3>
          </div>
          <div className="p-3 bg-warning/10 rounded-xl border border-warning/20">
            <Zap className="w-5 h-5 text-warning" />
          </div>
        </div>
        <div className="card-premium p-5 flex items-center justify-between">
          <div>
            <p className="text-[10px] text-prevenort-text/40 uppercase font-black tracking-widest">Redes Cubiertas</p>
            <h3 className="text-3xl font-black text-info">{totalScopes}</h3>
          </div>
          <div className="p-3 bg-info/10 rounded-xl border border-info/20">
            <Globe className="w-5 h-5 text-info" />
          </div>
        </div>
      </div>

      {/* === DROPZONE === */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={cn(
          "relative border-2 border-dashed rounded-3xl p-10 transition-all duration-500 cursor-pointer group",
          isDragActive
            ? "border-purple-500 bg-purple-500/10 scale-[1.01] shadow-2xl shadow-purple-500/20"
            : "border-prevenort-border hover:border-purple-500/40 hover:bg-purple-500/5 bg-prevenort-surface/30"
        )}
      >
        <input
          type="file"
          multiple
          accept=".pdf,.docx,.doc,.txt"
          onChange={handleFileInput}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
        />
        <div className="flex flex-col items-center text-center pointer-events-none">
          <div className={cn(
            "p-5 rounded-3xl mb-5 transition-all duration-500",
            isDragActive
              ? "bg-purple-500/20 scale-110 rotate-3"
              : "bg-prevenort-surface border border-prevenort-border group-hover:border-purple-500/30 group-hover:bg-purple-500/10"
          )}>
            <Upload className={cn(
              "w-10 h-10 transition-all duration-500",
              isDragActive ? "text-purple-400 animate-bounce" : "text-prevenort-text/20 group-hover:text-purple-400"
            )} />
          </div>
          <h3 className="text-lg font-black text-prevenort-text uppercase tracking-wide mb-2">
            Alimenta la IA de la Red AMIS
          </h3>
          <p className="text-sm text-prevenort-text/40 max-w-lg leading-relaxed">
            Sube <span className="text-purple-400 font-bold">Protocolos</span>,{' '}
            <span className="text-info font-bold">SLAs</span>,{' '}
            <span className="text-success font-bold">Listas de Precios</span> o{' '}
            <span className="text-warning font-bold">Manuales</span> para que el asistente
            omnicanal los use como referencia operativa.
          </p>
          <div className="flex items-center gap-3 mt-5">
            <span className="text-[9px] font-black text-prevenort-text/30 uppercase tracking-widest bg-prevenort-surface px-3 py-1.5 rounded-lg border border-prevenort-border">PDF</span>
            <span className="text-[9px] font-black text-prevenort-text/30 uppercase tracking-widest bg-prevenort-surface px-3 py-1.5 rounded-lg border border-prevenort-border">DOCX</span>
            <span className="text-[9px] font-black text-prevenort-text/30 uppercase tracking-widest bg-prevenort-surface px-3 py-1.5 rounded-lg border border-prevenort-border">TXT</span>
            <span className="text-[9px] font-black text-prevenort-text/20 ml-1">Máx 25 MB por archivo</span>
          </div>
        </div>
      </div>

      {/* === UPLOAD WIZARD MODAL === */}
      {showUploadWizard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="w-full max-w-2xl bg-prevenort-surface border border-prevenort-border rounded-3xl shadow-2xl shadow-purple-500/10 animate-in slide-in-from-bottom-4 duration-500 overflow-hidden">
            {/* Wizard Header */}
            <div className="p-6 border-b border-prevenort-border bg-gradient-to-r from-purple-500/10 to-transparent">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-purple-500/20 rounded-xl border border-purple-500/30">
                    <Shield className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-prevenort-text uppercase tracking-tight">
                      Clasificar Documento
                    </h3>
                    <p className="text-[10px] text-prevenort-text/40 font-bold uppercase tracking-widest">
                      Define Red y Audiencia antes de indexar
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleCancelUpload}
                  className="p-2 rounded-xl text-prevenort-text/30 hover:text-prevenort-text hover:bg-prevenort-bg transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Staging Files Preview */}
              <div>
                <p className="text-[9px] font-black text-prevenort-text/40 uppercase tracking-widest mb-3">
                  {stagingFiles.length} Archivo{stagingFiles.length > 1 ? 's' : ''} Seleccionado{stagingFiles.length > 1 ? 's' : ''}
                </p>
                <div className="space-y-2 max-h-[120px] overflow-y-auto custom-scrollbar">
                  {stagingFiles.map(sf => (
                    <div key={sf.id} className="flex items-center gap-3 p-3 bg-prevenort-bg rounded-xl border border-prevenort-border">
                      <span className="text-lg">{getFileIcon(sf.type)}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-prevenort-text truncate">{sf.filename}</p>
                        <p className="text-[10px] text-prevenort-text/30">{sf.size}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Step 1: Scope Selector */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-1 px-2 bg-prevenort-bg rounded text-[10px] font-black text-purple-400">01</div>
                  <p className="text-[10px] font-black text-prevenort-text/50 uppercase tracking-[0.2em]">Red / Cliente Aplicable</p>
                  {wizardScope.length === 0 && (
                    <span className="text-[8px] text-danger font-black uppercase tracking-widest ml-auto">Obligatorio</span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {AVAILABLE_SCOPES.map(scope => (
                    <button
                      key={scope}
                      onClick={() => setWizardScope(prev =>
                        prev.includes(scope) ? prev.filter(s => s !== scope) : [...prev, scope]
                      )}
                      className={cn(
                        "text-left px-3 py-2.5 rounded-xl text-[11px] font-bold transition-all flex items-center gap-2 border",
                        wizardScope.includes(scope)
                          ? "bg-info/15 text-info border-info/30"
                          : "text-prevenort-text/40 border-prevenort-border hover:bg-prevenort-bg hover:text-prevenort-text"
                      )}
                    >
                      <div className={cn(
                        "w-4 h-4 rounded border flex items-center justify-center transition-all flex-shrink-0",
                        wizardScope.includes(scope)
                          ? "bg-info border-info"
                          : "border-prevenort-border"
                      )}>
                        {wizardScope.includes(scope) && <CheckCircle2 className="w-3 h-3 text-white" />}
                      </div>
                      <Building2 className="w-3 h-3 flex-shrink-0" />
                      {scope}
                    </button>
                  ))}
                </div>
              </div>

              {/* Step 2: Audience Selector */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-1 px-2 bg-prevenort-bg rounded text-[10px] font-black text-purple-400">02</div>
                  <p className="text-[10px] font-black text-prevenort-text/50 uppercase tracking-[0.2em]">Audiencia Permitida (RBAC)</p>
                  {wizardAudience.length === 0 && (
                    <span className="text-[8px] text-danger font-black uppercase tracking-widest ml-auto">Obligatorio</span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {AUDIENCE_LEVELS.map(level => {
                    const LevelIcon = level.icon;
                    return (
                      <button
                        key={level.id}
                        onClick={() => setWizardAudience(prev =>
                          prev.includes(level.id) ? prev.filter(a => a !== level.id) : [...prev, level.id]
                        )}
                        className={cn(
                          "text-left px-3 py-3 rounded-xl text-[11px] font-bold transition-all flex items-center gap-2.5 border",
                          wizardAudience.includes(level.id)
                            ? `${level.badgeClass}`
                            : "text-prevenort-text/40 border-prevenort-border hover:bg-prevenort-bg hover:text-prevenort-text"
                        )}
                      >
                        <div className={cn(
                          "w-5 h-5 rounded border flex items-center justify-center transition-all flex-shrink-0",
                          wizardAudience.includes(level.id)
                            ? "bg-prevenort-text/10 border-current"
                            : "border-prevenort-border"
                        )}>
                          {wizardAudience.includes(level.id) && <CheckCircle2 className="w-3.5 h-3.5" />}
                        </div>
                        <LevelIcon className="w-4 h-4 flex-shrink-0" />
                        <div>
                          <span className="block leading-tight">{level.emoji} {level.label}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Wizard Footer */}
            <div className="p-6 border-t border-prevenort-border bg-prevenort-bg/30 flex items-center justify-between">
              <div className="flex items-center gap-2 text-[9px] text-prevenort-text/30">
                <Lock className="w-3 h-3" />
                <span>Los documentos sin clasificación no serán indexados por el motor RAG</span>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleCancelUpload}
                  className="px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-prevenort-text/50 border border-prevenort-border hover:bg-prevenort-surface transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmUpload}
                  disabled={!canConfirmUpload}
                  className={cn(
                    "flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg",
                    canConfirmUpload
                      ? "bg-purple-600 text-white hover:bg-purple-500 shadow-purple-500/25 border border-purple-400/30"
                      : "bg-prevenort-surface text-prevenort-text/20 border border-prevenort-border cursor-not-allowed shadow-none"
                  )}
                >
                  <Upload className="w-3.5 h-3.5" />
                  Confirmar e Indexar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* === DOCUMENTOS ACTIVOS + SYSTEM PROMPT (Side by Side) === */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* --- Tabla de Documentos (2/3) --- */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="p-1.5 bg-purple-500/10 rounded-lg">
                <FileText className="w-4 h-4 text-purple-400" />
              </div>
              <h3 className="text-[10px] font-black text-prevenort-text/40 uppercase tracking-[0.2em]">
                Documentos Activos en la Base de Conocimiento
              </h3>
              <div className="h-px w-8 bg-prevenort-border" />
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-prevenort-text/20" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar documento..."
                className="bg-prevenort-surface border border-prevenort-border rounded-lg pl-9 pr-4 py-1.5 text-[11px] text-prevenort-text focus:outline-none focus:border-purple-500/30 transition-all w-56"
              />
            </div>
          </div>

          <div className="bg-prevenort-surface border border-prevenort-border rounded-2xl overflow-hidden shadow-sm overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-prevenort-border bg-prevenort-bg/30">
                  <th className="px-4 py-4 text-[9px] font-black text-prevenort-text/40 uppercase tracking-widest whitespace-nowrap">
                    Documento
                  </th>
                  <th className="px-4 py-4 text-[9px] font-black text-prevenort-text/40 uppercase tracking-widest whitespace-nowrap">
                    Red / Cliente
                  </th>
                  <th className="px-4 py-4 text-[9px] font-black text-prevenort-text/40 uppercase tracking-widest whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <Shield className="w-3 h-3" />
                      Audiencia
                    </div>
                  </th>
                  <th className="px-4 py-4 text-[9px] font-black text-prevenort-text/40 uppercase tracking-widest whitespace-nowrap text-center">
                    Estado
                  </th>
                  <th className="px-4 py-4 text-[9px] font-black text-prevenort-text/40 uppercase tracking-widest whitespace-nowrap">
                    Tags
                  </th>
                  <th className="px-4 py-4 text-[9px] font-black text-prevenort-text/40 uppercase tracking-widest whitespace-nowrap text-right">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-prevenort-border">
                {filteredDocs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <FileUp className="w-10 h-10 text-prevenort-text/10" />
                        <p className="text-[11px] text-prevenort-text/30 font-bold">
                          No hay documentos{searchTerm ? ' que coincidan con la búsqueda' : ' en la base de conocimiento'}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredDocs.map((doc) => {
                    const statusConfig = getStatusConfig(doc.status);
                    const StatusIcon = statusConfig.icon;
                    return (
                      <tr
                        key={doc.id}
                        className={cn(
                          "hover:bg-purple-500/5 transition-colors cursor-pointer group",
                          selectedDocId === doc.id && "bg-purple-500/10 border-l-2 border-purple-500"
                        )}
                        onClick={() => setSelectedDocId(doc.id === selectedDocId ? null : doc.id)}
                      >
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <span className="text-xl">{getFileIcon(doc.type)}</span>
                            <div>
                              <p className="text-xs font-bold text-prevenort-text/90 group-hover:text-purple-400 transition-colors truncate max-w-[180px]">
                                {doc.filename}
                              </p>
                              <p className="text-[10px] text-prevenort-text/30 mt-0.5">
                                {doc.size} · {new Date(doc.uploaded_at).toLocaleDateString('es-CL')}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex flex-col gap-1 relative">
                            {doc.scope.length === 0 ? (
                              <button
                                onClick={(e) => { e.stopPropagation(); setShowScopeEditor(doc.id); }}
                                className="flex items-center gap-1.5 text-[10px] text-prevenort-text/30 hover:text-purple-400 transition-colors"
                              >
                                <Plus className="w-3 h-3" />
                                Asignar Red
                              </button>
                            ) : (
                              <div className="flex flex-wrap gap-1">
                                {doc.scope.map(s => (
                                  <span key={s} className="text-[8px] font-bold text-info bg-info/10 px-1.5 py-0.5 rounded border border-info/20 whitespace-nowrap">
                                    <Building2 className="w-2.5 h-2.5 inline mr-0.5 -mt-px" />
                                    {s}
                                  </span>
                                ))}
                                <button
                                  onClick={(e) => { e.stopPropagation(); setShowScopeEditor(doc.id); }}
                                  className="text-[9px] text-prevenort-text/20 hover:text-purple-400 transition-colors p-0.5"
                                >
                                  <Plus className="w-3 h-3" />
                                </button>
                              </div>
                            )}
                            {/* Scope Editor Popover */}
                            {showScopeEditor === doc.id && (
                              <div
                                className="absolute top-full left-0 mt-2 z-50 bg-prevenort-surface border border-prevenort-border rounded-xl p-3 shadow-2xl shadow-black/40 min-w-[220px] animate-in fade-in slide-in-from-top-2 duration-200"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div className="flex items-center justify-between mb-3">
                                  <p className="text-[9px] font-black text-prevenort-text/40 uppercase tracking-widest">Asignar Redes</p>
                                  <button onClick={() => setShowScopeEditor(null)} className="text-prevenort-text/20 hover:text-prevenort-text">
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                                <div className="space-y-1.5">
                                  {AVAILABLE_SCOPES.map(scope => (
                                    <button
                                      key={scope}
                                      onClick={() => handleToggleScope(doc.id, scope)}
                                      className={cn(
                                        "w-full text-left px-3 py-2 rounded-lg text-[11px] font-bold transition-all flex items-center gap-2",
                                        doc.scope.includes(scope)
                                          ? "bg-purple-500/20 text-purple-400 border border-purple-500/30"
                                          : "text-prevenort-text/50 hover:bg-prevenort-bg hover:text-prevenort-text border border-transparent"
                                      )}
                                    >
                                      <div className={cn(
                                        "w-4 h-4 rounded border flex items-center justify-center transition-all",
                                        doc.scope.includes(scope)
                                          ? "bg-purple-500 border-purple-500"
                                          : "border-prevenort-border"
                                      )}>
                                        {doc.scope.includes(scope) && <CheckCircle2 className="w-3 h-3 text-white" />}
                                      </div>
                                      {scope}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </td>

                        {/* === NUEVA COLUMNA: AUDIENCIA === */}
                        <td className="px-4 py-4">
                          <div className="flex flex-col gap-1 relative">
                            {doc.audience.length === 0 ? (
                              <button
                                onClick={(e) => { e.stopPropagation(); setShowAudienceEditor(doc.id); }}
                                className="flex items-center gap-1.5 text-[10px] text-danger/60 hover:text-danger transition-colors"
                              >
                                <AlertCircle className="w-3 h-3" />
                                Sin Audiencia
                              </button>
                            ) : (
                              <div className="flex flex-wrap gap-1">
                                {doc.audience.map(aId => {
                                  const cfg = AUDIENCE_LEVELS.find(a => a.id === aId);
                                  if (!cfg) return null;
                                  return (
                                    <span key={aId} className={cn("text-[8px] font-black px-1.5 py-0.5 rounded border whitespace-nowrap", cfg.badgeClass)}>
                                      {cfg.emoji} {cfg.shortLabel}
                                    </span>
                                  );
                                })}
                                <button
                                  onClick={(e) => { e.stopPropagation(); setShowAudienceEditor(doc.id); }}
                                  className="text-[9px] text-prevenort-text/20 hover:text-purple-400 transition-colors p-0.5"
                                >
                                  <Plus className="w-3 h-3" />
                                </button>
                              </div>
                            )}
                            {/* Audience Editor Popover */}
                            {showAudienceEditor === doc.id && (
                              <div
                                className="absolute top-full left-0 mt-2 z-50 bg-prevenort-surface border border-prevenort-border rounded-xl p-3 shadow-2xl shadow-black/40 min-w-[260px] animate-in fade-in slide-in-from-top-2 duration-200"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div className="flex items-center justify-between mb-3">
                                  <div className="flex items-center gap-1.5">
                                    <Shield className="w-3 h-3 text-purple-400" />
                                    <p className="text-[9px] font-black text-prevenort-text/40 uppercase tracking-widest">Audiencia RBAC</p>
                                  </div>
                                  <button onClick={() => setShowAudienceEditor(null)} className="text-prevenort-text/20 hover:text-prevenort-text">
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                                <div className="space-y-1.5">
                                  {AUDIENCE_LEVELS.map(level => {
                                    const LevelIcon = level.icon;
                                    const isActive = doc.audience.includes(level.id);
                                    return (
                                      <button
                                        key={level.id}
                                        onClick={() => handleToggleAudience(doc.id, level.id)}
                                        className={cn(
                                          "w-full text-left px-3 py-2.5 rounded-lg text-[11px] font-bold transition-all flex items-center gap-2.5 border",
                                          isActive
                                            ? level.badgeClass
                                            : "text-prevenort-text/40 border-transparent hover:bg-prevenort-bg hover:text-prevenort-text"
                                        )}
                                      >
                                        <div className={cn(
                                          "w-4 h-4 rounded border flex items-center justify-center transition-all",
                                          isActive
                                            ? "bg-current/20 border-current"
                                            : "border-prevenort-border"
                                        )}>
                                          {isActive && <CheckCircle2 className="w-3 h-3" />}
                                        </div>
                                        <LevelIcon className="w-3.5 h-3.5 flex-shrink-0" />
                                        <span>{level.emoji} {level.label}</span>
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        </td>

                        <td className="px-4 py-4 text-center">
                          <span className={cn(
                            "inline-flex items-center gap-1.5 text-[8px] px-2.5 py-1 rounded-lg font-black uppercase tracking-widest border",
                            statusConfig.color
                          )}>
                            <StatusIcon className="w-3 h-3" />
                            {statusConfig.label}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex flex-wrap gap-1">
                            {doc.tags.map(t => (
                              <span key={t} className="text-[9px] font-bold text-prevenort-text/50 bg-prevenort-bg px-2 py-0.5 rounded border border-prevenort-border">
                                <Tag className="w-2.5 h-2.5 inline mr-0.5 -mt-px" />
                                {t}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDeleteDoc(doc.id); }}
                            className="p-2 rounded-lg text-prevenort-text/10 hover:text-danger hover:bg-danger/10 transition-all opacity-0 group-hover:opacity-100"
                            title="Eliminar documento"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* --- System Prompt (1/3) --- */}
        <div className="lg:col-span-1 space-y-4">
          <div className="card-premium !p-0 overflow-hidden bg-gradient-to-b from-prevenort-surface to-prevenort-bg/50">
            {/* Header del card */}
            <div className="p-5 border-b border-prevenort-border bg-prevenort-surface">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-xl border border-purple-500/20">
                  <Sparkles className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-prevenort-text uppercase tracking-wide">
                    Identidad del Bot
                  </h3>
                  <p className="text-[9px] text-prevenort-text/30 font-bold uppercase tracking-widest">
                    System Prompt
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-[9px] text-prevenort-text/30 bg-prevenort-bg/50 rounded-lg p-2 border border-prevenort-border">
                <Settings2 className="w-3 h-3 flex-shrink-0" />
                <span>Define cómo se comportará el Asistente IA de AMIS al responder consultas de clientes y profesionales.</span>
              </div>
            </div>

            {/* Textarea */}
            <div className="p-5">
              <textarea
                value={systemPrompt}
                onChange={(e) => {
                  setSystemPrompt(e.target.value);
                  setPromptSaved(false);
                }}
                rows={14}
                className="w-full bg-prevenort-bg border border-prevenort-border rounded-xl p-4 text-[12px] text-prevenort-text/80 leading-relaxed font-mono resize-none focus:outline-none focus:border-purple-500/40 focus:ring-2 focus:ring-purple-500/10 transition-all custom-scrollbar placeholder:text-prevenort-text/20"
                placeholder="Escribe las instrucciones de comportamiento para el bot..."
              />

              {/* Contador + Guardar */}
              <div className="flex items-center justify-between mt-4">
                <span className="text-[10px] text-prevenort-text/20 font-mono">
                  {systemPrompt.length} / 4000 caracteres
                </span>
                <button
                  onClick={handleSavePrompt}
                  className={cn(
                    "flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg",
                    promptSaved
                      ? "bg-success/20 text-success border border-success/30 shadow-success/10"
                      : "bg-purple-600 text-white hover:bg-purple-500 shadow-purple-500/25 border border-purple-400/30"
                  )}
                >
                  {promptSaved ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Guardado
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      Guardar Identidad
                    </>
                  )}
                </button>
              </div>

              {/* RAG Security Warning */}
              <div className="mt-4 p-3 bg-red-500/5 border border-red-500/15 rounded-xl">
                <div className="flex items-start gap-2">
                  <Lock className="w-3.5 h-3.5 text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-[10px] text-red-400/80 leading-relaxed font-bold">
                    🔒 El motor RAG aplicará filtros estrictos de vectorización basados en el <strong className="text-red-400">Rol del interlocutor</strong> y la <strong className="text-red-400">Audiencia del documento</strong>.
                  </p>
                </div>
              </div>
            </div>

            {/* Footer informativo */}
            <div className="px-5 pb-5">
              <div className="p-3 bg-purple-500/5 border border-purple-500/10 rounded-xl">
                <div className="flex items-start gap-2">
                  <Brain className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] font-black text-purple-400 uppercase tracking-widest mb-1">
                      Motor de Contexto
                    </p>
                    <p className="text-[10px] text-prevenort-text/40 leading-relaxed">
                      Este prompt se inyecta como contexto base en cada conversación. Los documentos indexados se agregan dinámicamente según el <strong className="text-purple-400">scope</strong> y la <strong className="text-purple-400">audiencia RBAC</strong> del interlocutor.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
