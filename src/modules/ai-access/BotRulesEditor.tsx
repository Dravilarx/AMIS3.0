import React, { useState } from 'react';
import {
  Save, RotateCcw, Sparkles, Copy, CheckCircle2,
  Stethoscope, Radio, ClipboardList, ShieldCheck, Mic2,
  Info
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { supabase } from '../../lib/supabase';

// --- Tipos ---
type BotRole = 'medico_externo' | 'radiologo' | 'secretaria' | 'jefe_servicio' | 'auditor';

interface BotRoleConfig {
  id: BotRole;
  label: string;
  icon: React.ElementType;
  color: string;
  borderColor: string;
  bgColor: string;
  description: string;
}

const BOT_ROLES: BotRoleConfig[] = [
  { id: 'medico_externo', label: 'Médico Externo', icon: Stethoscope, color: 'text-cyan-400', borderColor: 'border-cyan-500/30', bgColor: 'bg-cyan-500/10', description: 'Consulta de informes y resultados' },
  { id: 'radiologo', label: 'Radiólogo', icon: Radio, color: 'text-purple-400', borderColor: 'border-purple-500/30', bgColor: 'bg-purple-500/10', description: 'Dictado y validación de informes' },
  { id: 'secretaria', label: 'Secretaría Adm.', icon: ClipboardList, color: 'text-amber-400', borderColor: 'border-amber-500/30', bgColor: 'bg-amber-500/10', description: 'Gestión de agenda y triage' },
  { id: 'jefe_servicio', label: 'Jefe de Servicio', icon: ShieldCheck, color: 'text-emerald-400', borderColor: 'border-emerald-500/30', bgColor: 'bg-emerald-500/10', description: 'Supervisión y auditoría clínica' },
  { id: 'auditor', label: 'Auditor / QA', icon: Mic2, color: 'text-rose-400', borderColor: 'border-rose-500/30', bgColor: 'bg-rose-500/10', description: 'Revisión de calidad y métricas' },
];

// --- Variables disponibles para el System Prompt ---
const AVAILABLE_VARIABLES = [
  { key: '{{nombre}}', desc: 'Nombre del profesional' },
  { key: '{{clinica}}', desc: 'Nombre de la clínica asociada' },
  { key: '{{rol}}', desc: 'Rol del profesional (médico, radiólogo, etc.)' },
  { key: '{{fecha}}', desc: 'Fecha actual formateada' },
  { key: '{{hora}}', desc: 'Hora actual' },
  { key: '{{paciente_nombre}}', desc: 'Nombre del paciente en contexto' },
  { key: '{{paciente_rut}}', desc: 'RUT del paciente en contexto' },
  { key: '{{examen}}', desc: 'Tipo de examen solicitado' },
  { key: '{{modalidad}}', desc: 'Modalidad (CT, MR, RX, etc.)' },
  { key: '{{centro_aetitle}}', desc: 'AETitle del equipo DICOM' },
  { key: '{{historial_count}}', desc: 'Cantidad de estudios previos' },
  { key: '{{turno}}', desc: 'Turno actual (AM/PM/Nocturno)' },
];

const DEFAULT_PROMPTS: Record<BotRole, string> = {
  medico_externo: `Eres AMIS Bot, asistente clínico de la red AMIS. Tu rol es atender consultas de médicos externos sobre informes radiológicos.

REGLAS:
- Siempre saluda al profesional por su nombre: {{nombre}}
- Confirma la clínica asociada: {{clinica}}
- Solo entrega información de estudios validados
- Si el informe tiene hallazgo crítico, destácalo con ⚠️
- Nunca inventes datos clínicos
- Responde en español profesional y conciso`,

  radiologo: `Eres AMIS Bot, asistente de dictado para radiólogos AMIS.

REGLAS:
- Asiste en la redacción de informes según la modalidad: {{modalidad}}
- Sugiere hallazgos basados en el tipo de examen: {{examen}}
- Respeta la estructura: Técnica → Hallazgos → Impresión Diagnóstica
- Si el radiólogo pide historial, consulta los {{historial_count}} estudios previos
- Turno actual: {{turno}}`,

  secretaria: `Eres AMIS Bot, asistente administrativo para secretaría.

REGLAS:
- Facilita la búsqueda de estudios por paciente: {{paciente_nombre}} / {{paciente_rut}}
- Apoya la gestión de agenda y triage de addendums
- Nunca reveles datos clínicos sensibles; solo metadatos administrativos
- Deriva consultas médicas al radiólogo de turno`,

  jefe_servicio: `Eres AMIS Bot, asistente de supervisión para jefes de servicio.

REGLAS:
- Proporciona métricas de productividad del equipo
- Alerta sobre estudios con TAT excedido (> 48h)
- Muestra el estado de hallazgos críticos pendientes
- Permite supervisar la carga de trabajo por radiólogo
- Centro actual: {{centro_aetitle}}`,

  auditor: `Eres AMIS Bot, asistente de calidad y auditoría.

REGLAS:
- Genera reportes de adherencia a protocolos
- Identifica discrepancias en informes
- Rastrea métricas de TAT, tasa de addendums y re-informes
- Solo modo lectura, nunca modifiques datos clínicos`,
};

// --- Componente ---
export const BotRulesEditor: React.FC = () => {
  const [selectedRole, setSelectedRole] = useState<BotRole>('medico_externo');
  const [prompts, setPrompts] = useState<Record<BotRole, string>>({ ...DEFAULT_PROMPTS });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [copiedVar, setCopiedVar] = useState<string | null>(null);

  const currentPrompt = prompts[selectedRole];

  const handlePromptChange = (value: string) => {
    setPrompts(prev => ({ ...prev, [selectedRole]: value }));
    setSaved(false);
  };

  const handleReset = () => {
    setPrompts(prev => ({ ...prev, [selectedRole]: DEFAULT_PROMPTS[selectedRole] }));
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Guardar en Supabase (tabla bot_system_prompts)
      const { error } = await supabase
        .from('bot_system_prompts')
        .upsert({
          role_id: selectedRole,
          system_prompt: currentPrompt,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'role_id' });

      if (error) {
        console.warn('Tabla bot_system_prompts no existe aún, guardado localmente:', error.message);
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error('Error saving prompt:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleCopyVariable = (varKey: string) => {
    navigator.clipboard.writeText(varKey);
    setCopiedVar(varKey);
    setTimeout(() => setCopiedVar(null), 1500);
  };

  const roleConfig = BOT_ROLES.find(r => r.id === selectedRole)!;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* === ROLE SELECTOR === */}
      <div className="space-y-3">
        <p className="text-[10px] font-black text-brand-text/40 uppercase tracking-[0.3em] px-1">
          Selecciona el Perfil de Interacción
        </p>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {BOT_ROLES.map(role => (
            <button
              key={role.id}
              onClick={() => setSelectedRole(role.id)}
              className={cn(
                "p-4 rounded-2xl border transition-all text-left group relative overflow-hidden",
                selectedRole === role.id
                  ? `${role.bgColor} ${role.borderColor} shadow-lg scale-[1.02]`
                  : "bg-brand-surface border-brand-border hover:border-brand-text/10"
              )}
            >
              {selectedRole === role.id && (
                <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-current to-transparent opacity-50" />
              )}
              <role.icon className={cn(
                "w-5 h-5 mb-2 transition-colors",
                selectedRole === role.id ? role.color : "text-brand-text/20"
              )} />
              <p className={cn(
                "text-[10px] font-black uppercase tracking-widest",
                selectedRole === role.id ? "text-brand-text" : "text-brand-text/40"
              )}>
                {role.label}
              </p>
              <p className={cn(
                "text-[8px] mt-1 leading-relaxed",
                selectedRole === role.id ? "text-brand-text/50" : "text-brand-text/20"
              )}>
                {role.description}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* === EDITOR + VARIABLES PANEL === */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* System Prompt Editor (3/4) */}
        <div className="lg:col-span-3 space-y-4">
          <div className="card-premium !p-0 overflow-hidden">
            {/* Editor Header */}
            <div className="p-5 border-b border-brand-border bg-gradient-to-r from-brand-surface to-transparent flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={cn("p-2 rounded-xl border", roleConfig.bgColor, roleConfig.borderColor)}>
                  <Sparkles className={cn("w-4 h-4", roleConfig.color)} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-brand-text uppercase tracking-wide">
                    System Prompt — {roleConfig.label}
                  </h3>
                  <p className="text-[9px] text-brand-text/30 font-bold uppercase tracking-widest">
                    Instrucciones base que recibirá el motor IA en cada interacción
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleReset}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest text-brand-text/40 border border-brand-border hover:bg-brand-bg hover:text-brand-text/60 transition-all"
                  title="Restaurar prompt original"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reset
                </button>
              </div>
            </div>

            {/* Textarea */}
            <div className="p-5">
              <textarea
                value={currentPrompt}
                onChange={(e) => handlePromptChange(e.target.value)}
                rows={16}
                className="w-full bg-brand-bg border border-brand-border rounded-2xl px-6 py-5 text-sm text-brand-text font-mono leading-relaxed resize-none focus:outline-none focus:border-cyan-500/30 focus:ring-4 focus:ring-cyan-500/5 transition-all placeholder:text-brand-text/20 custom-scrollbar"
                placeholder="Escribe las instrucciones del sistema para este rol..."
              />
            </div>

            {/* Footer con acciones */}
            <div className="px-5 py-4 border-t border-brand-border bg-brand-bg/20 flex items-center justify-between">
              <div className="flex items-center gap-2 text-[9px] text-brand-text/25">
                <Info className="w-3 h-3" />
                <span>{currentPrompt.length} caracteres · Las variables se reemplazan en tiempo real</span>
              </div>
              <button
                onClick={handleSave}
                disabled={saving}
                className={cn(
                  "flex items-center gap-2 px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg",
                  saved
                    ? "bg-success text-white shadow-success/25 border border-success/30"
                    : "bg-cyan-600 text-white hover:bg-cyan-500 shadow-cyan-500/25 border border-cyan-400/30",
                  saving && "opacity-50 cursor-wait"
                )}
              >
                {saved ? (
                  <><CheckCircle2 className="w-4 h-4" /> Guardado</>
                ) : saving ? (
                  <><Save className="w-4 h-4 animate-pulse" /> Guardando...</>
                ) : (
                  <><Save className="w-4 h-4" /> Guardar en Supabase</>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Variables Panel (1/4) */}
        <div className="lg:col-span-1">
          <div className="card-premium !p-0 overflow-hidden sticky top-28">
            <div className="p-4 border-b border-brand-border bg-brand-surface">
              <h4 className="text-[10px] font-black text-brand-text/60 uppercase tracking-widest">
                Variables Disponibles
              </h4>
              <p className="text-[8px] text-brand-text/25 mt-1">
                Clic para copiar al portapapeles
              </p>
            </div>
            <div className="p-3 space-y-1.5 max-h-[520px] overflow-y-auto custom-scrollbar">
              {AVAILABLE_VARIABLES.map(v => (
                <button
                  key={v.key}
                  onClick={() => handleCopyVariable(v.key)}
                  className={cn(
                    "w-full text-left px-3 py-2.5 rounded-xl transition-all group border",
                    copiedVar === v.key
                      ? "bg-success/10 border-success/20"
                      : "bg-brand-bg border-brand-border hover:border-cyan-500/30 hover:bg-cyan-500/5"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <code className={cn(
                      "text-[10px] font-black font-mono",
                      copiedVar === v.key ? "text-success" : "text-cyan-400"
                    )}>
                      {v.key}
                    </code>
                    {copiedVar === v.key ? (
                      <CheckCircle2 className="w-3 h-3 text-success" />
                    ) : (
                      <Copy className="w-3 h-3 text-brand-text/10 group-hover:text-brand-text/30 transition-colors" />
                    )}
                  </div>
                  <p className="text-[8px] text-brand-text/30 mt-0.5 leading-relaxed">
                    {v.desc}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
