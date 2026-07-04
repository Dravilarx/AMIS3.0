import React from 'react';
import { ShieldCheck, BookOpen, UserCheck, BellRing, CheckCircle2, Save, Sparkles, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { cn } from '../../../lib/utils';
import { supabase } from '../../../lib/supabase';
import { getSignedDocumentUrl } from '../../../lib/storageUrls';

// Abre un documento del bucket privado firmando la ruta (o URL heredada).
const abrirDocumentoFirmado = async (input: string) => {
    const signed = await getSignedDocumentUrl(input);
    if (signed) window.open(signed, '_blank');
};
import type { TabProps } from './types';
import type { HRManager } from '../../../hooks/useHRManagers';

interface TabInduccionProps extends TabProps {
    managers: HRManager[];
}

const SECCIONES = [
    {
        id: 'admin', title: 'Administración',
        color: 'border-blue-500/20 bg-blue-500/5', headerColor: 'text-blue-400',
        content: `La organización está constituida por el Dr. Marcelo Ávila (Director Médico), Sr. Patricio Abella (Gerente Médico) y EU. Alejandra Versalovic (RRHH, procesos clínicos y calidad).\n\nLa Dirección Médica coordina actividades médicas y administrativas, el cumplimiento del sistema de Calidad ISO 9001-2015, la gestión de información médica y la relación con instituciones para resolución de temas clínicos y reclamos.\n\nEl Gerente Médico es responsable de asuntos comerciales, pago de remuneraciones, gestión de recursos humanos, supervisión de contabilidad y administración general.`
    },
    {
        id: 'operatividad', title: 'Operatividad',
        color: 'border-emerald-500/20 bg-emerald-500/5', headerColor: 'text-emerald-400',
        content: `Su ingreso al equipo ha sido aprobado. Se coordinará una reunión online de bienvenida para presentarle al equipo.\n\nComuníquese con la secretaria Karla Álvarez para coordinar la reunión y recibir sus credenciales de acceso. La Dra. Verónica de la Maza le brindará capacitación en el sistema.\n\nLas instituciones en las que prestará servicios están en proceso de acreditación. Será incorporado a ese flujo y notificado una vez finalizado.`
    },
    {
        id: 'calidad', title: 'Calidad',
        color: 'border-amber-500/20 bg-amber-500/5', headerColor: 'text-amber-400',
        content: `Tiempos de informe: Urgencia → 1 hora | Hospitalizado → 3 horas | Ambulatorio → 24 horas.\n\nContenidos mínimos: identificación y edad del paciente, nombre y fecha del procedimiento, descripción de hallazgos, conclusión diagnóstica, indicaciones si corresponde, nombre y firma del médico.\n\nNotificación de resultados críticos según Nota Técnica N°9. No homologar diagnósticos. Los addendum posteriores a la validación se gestionan mediante el módulo correspondiente.`
    },
    {
        id: 'pacto', title: 'Pacto de Integridad',
        color: 'border-red-500/20 bg-red-500/5', headerColor: 'text-red-400',
        content: `En cumplimiento con la Ley N° 19.886 y Dictamen N° E370752/23 de la CGR, la empresa SOCIEDAD DE RADIÓLOGOS DEL NORTE SpA y sus funcionarios deben cumplir los principios de transparencia, igualdad y probidad.\n\nSe debe inhibir de contratar funcionarios públicos que intervengan en procesos de compra, implementar medidas anti-corrupción y abstenerse de ejercer influencia indebida, ofrecer donativos, contactar a la comisión evaluadora durante la evaluación.\n\nLos contratos celebrados con infracción al Capítulo VII serán nulos. El incumplimiento constituye contravención al principio de probidad administrativa con responsabilidad civil y penal.`
    },
] as const;

// ─── Generador de certificado ─────────────────────────────────────────────────
const CertificadoGenerator: React.FC<{ professionalId: string; professionalName: string; acceptedAt: string }> = ({
    professionalId, professionalName, acceptedAt,
}) => {
    const [generating, setGenerating] = useState(false);
    const [done,        setDone]       = useState(false);
    const [docUrl,      setDocUrl]     = useState<string | null>(null);

    useEffect(() => {
        supabase.from('documents').select('id, url')
            .eq('target_id', professionalId).eq('category', 'induction').maybeSingle()
            .then(({ data }) => { if (data) { setDocUrl(data.url); setDone(true); } });
    }, [professionalId]);

    const handleGenerate = async () => {
        setGenerating(true);
        try {
            const fecha = new Date(acceptedAt).toLocaleString('es-CL', { dateStyle: 'full', timeStyle: 'short' });
            const fingerprint = Array.from(crypto.getRandomValues(new Uint8Array(16))).map(b => b.toString(16).padStart(2, '0')).join('');
            const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><style>body{font-family:Arial,sans-serif;max-width:800px;margin:40px auto;color:#1a1a1a;line-height:1.6}h1{font-size:20px;border-bottom:2px solid #f97316;padding-bottom:8px;color:#f97316}h2{font-size:14px;text-transform:uppercase;letter-spacing:1px;color:#555;margin-top:28px}table{width:100%;border-collapse:collapse;font-size:12px}td{padding:6px 8px;border:1px solid #eee}td:first-child{font-weight:bold;background:#f9f9f9;width:35%}.dec{background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:16px;margin:24px 0}.firma{margin-top:40px;border-top:1px solid #eee;padding-top:20px}.fn{font-family:'Dancing Script',cursive;font-size:32px;color:#3b82f6}.audit{font-size:9px;color:#aaa;margin-top:8px}</style></head><body>
<h1>Certificado de Inducción — AMIS 3.0</h1>
<p>El presente documento certifica que el profesional indicado ha leído y aceptado el material de bienvenida de <strong>SOCIEDAD DE RADIÓLOGOS DEL NORTE SpA</strong>.</p>
<h2>Datos del Profesional</h2>
<table><tr><td>Nombre</td><td>${professionalName}</td></tr><tr><td>Fecha de aceptación</td><td>${fecha}</td></tr><tr><td>Audit ID</td><td style="font-family:monospace">${fingerprint}</td></tr></table>
<h2>Material revisado</h2>
<table><tr><td>Administración</td><td>✓ Leído y aceptado</td></tr><tr><td>Operatividad</td><td>✓ Leído y aceptado</td></tr><tr><td>Calidad</td><td>✓ Leído y aceptado</td></tr><tr><td>Pacto de Integridad (Ley 19.886)</td><td>✓ Leído y aceptado</td></tr></table>
<div class="dec"><strong>Declaración:</strong> Declaro haber leído la información entregada por AMIS correspondiente a Administración, Operatividad, Calidad y el Pacto de Integridad.</div>
<div class="firma"><div class="fn">${professionalName}</div><div style="height:1px;width:220px;background:#eee;margin:10px 0"></div><p style="font-size:13px;font-weight:bold;margin:0">${professionalName}</p><p style="font-size:11px;color:#888;margin:2px 0">Firmado electrónicamente vía AMIS 3.0</p><div class="audit">Audit ID: ${fingerprint} | ${fecha} | AMIS Care — Holding Portezuelo</div></div>
</body></html>`;

            const { data: insertData, error } = await supabase.from('documents').insert([{
                title: `Inducción — ${professionalName}`, type: 'pdf', category: 'induction',
                content_summary: `Certificado de inducción. Audit ID: ${fingerprint}`,
                url: '', signed: true, signer_name: professionalName,
                signature_fingerprint: fingerprint, signed_at: acceptedAt,
                visibility: 'community', target_id: professionalId, is_locked: true, is_validated: true,
            }]).select('id').single();

            if (error) throw error;

            const filePath = `expedientes/induction-${professionalId}-${Date.now()}.html`;
            const { error: storageError } = await supabase.storage.from('documents')
                .upload(filePath, new Blob([html], { type: 'text/html' }), { contentType: 'text/html', upsert: true });
            if (storageError) throw storageError;

            // Bucket privado: se guarda la RUTA; la URL firmada se resuelve al abrir.
            await supabase.from('documents').update({ url: filePath }).eq('id', insertData.id);
            setDocUrl(filePath); setDone(true);
        } catch (err: any) {
            console.error('Error generando certificado:', err.message);
        } finally {
            setGenerating(false);
        }
    };

    return (
        <div className={cn('flex items-center justify-between p-4 rounded-xl border transition-all',
            done ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-violet-500/5 border-violet-500/20')}>
            <div className="flex items-center gap-3">
                <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0',
                    done ? 'bg-emerald-500/10' : 'bg-violet-500/10')}>
                    {done ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : <Sparkles className="w-5 h-5 text-violet-400" />}
                </div>
                <div>
                    <p className={cn('text-sm font-bold', done ? 'text-emerald-400' : 'text-violet-400')}>
                        {done ? 'Certificado generado' : 'Generar Certificado de Inducción'}
                    </p>
                    <p className="text-[10px] text-brand-text/30">
                        {done ? 'Guardado en Expediente con firma digital y Audit ID' : 'Documento firmado con timestamp para acreditación'}
                    </p>
                </div>
            </div>
            <div className="flex items-center gap-2">
                {docUrl && (
                    <button type="button" onClick={() => abrirDocumentoFirmado(docUrl)}
                        className="px-3 py-1.5 bg-brand-surface border border-brand-border rounded-lg text-[10px] font-bold uppercase text-brand-text hover:bg-brand-primary/10 transition-all">
                        Ver
                    </button>
                )}
                {!done && (
                    <button type="button" onClick={handleGenerate} disabled={generating}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-500/10 border border-violet-500/20 text-violet-400 rounded-lg text-[10px] font-black uppercase hover:bg-violet-500/20 transition-all disabled:opacity-50">
                        {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                        {generating ? 'Generando...' : 'Generar'}
                    </button>
                )}
            </div>
        </div>
    );
};

// ─── Tab principal ────────────────────────────────────────────────────────────
export const TabInduccion: React.FC<TabInduccionProps> = ({ formData, setFormData, initialData, managers }) => (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">

        {/* Control Master */}
        <div className="p-4 bg-brand-surface/50 border border-brand-border rounded-2xl">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center transition-colors',
                        formData.induction?.enabled ? 'bg-info/10 text-info' : 'bg-brand-surface text-brand-text/20')}>
                        <ShieldCheck className="w-6 h-6" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-brand-text/90">Gestión de Inducción</h3>
                        <p className="text-[10px] text-brand-text/40 uppercase tracking-widest font-bold">Punto de Control Auditoría</p>
                    </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer"
                        checked={formData.induction?.enabled}
                        onChange={e => setFormData(p => ({ ...p, induction: { ...p.induction!, enabled: e.target.checked } }))} />
                    <div className="w-11 h-6 bg-brand-surface peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-brand-text after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-brand-text/20 after:border-brand-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-primary peer-checked:after:bg-white"></div>
                </label>
            </div>
        </div>

        {formData.induction?.enabled ? (
            <div className="space-y-5 animate-in fade-in zoom-in-95 duration-200">

                {/* Fechas */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-[10px] uppercase font-bold text-brand-text/40 tracking-widest">Inicio Inducción</label>
                        <input type="date"
                            className="bg-brand-surface border border-brand-border rounded-lg w-full px-4 py-2 text-sm text-brand-text focus:border-info/50 outline-none"
                            value={formData.induction?.startDate || ''}
                            onChange={e => setFormData(p => ({ ...p, induction: { ...p.induction!, startDate: e.target.value, status: 'in_progress' } }))} />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] uppercase font-bold text-brand-text/40 tracking-widest">Fin Inducción</label>
                        <input type="date"
                            className="bg-brand-surface border border-brand-border rounded-lg w-full px-4 py-2 text-sm text-brand-text focus:border-info/50 outline-none"
                            value={formData.induction?.endDate || ''}
                            onChange={e => setFormData(p => ({ ...p, induction: { ...p.induction!, endDate: e.target.value } }))} />
                    </div>
                </div>

                {/* Encargado RRHH */}
                <div className="space-y-2">
                    <label className="text-[10px] uppercase font-bold text-brand-text/40 tracking-widest flex items-center gap-2">
                        <UserCheck className="w-3 h-3" /> Encargado RRHH Responsable
                    </label>
                    <select
                        className="bg-brand-surface border border-brand-border rounded-lg w-full px-4 py-2 text-sm text-brand-text outline-none"
                        value={formData.induction?.assignedHRManagerId || ''}
                        onChange={e => setFormData(p => ({ ...p, induction: { ...p.induction!, assignedHRManagerId: e.target.value } }))}>
                        <option value="">Seleccionar responsable...</option>
                        {managers.map(m => <option key={m.id} value={m.id}>{m.fullName} — {m.role}</option>)}
                    </select>
                </div>

                {/* Material AMIS */}
                <div className="space-y-3">
                    <div className="flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-purple-400" />
                        <h4 className="text-sm font-bold uppercase tracking-widest text-brand-text/60">Material de Bienvenida AMIS</h4>
                    </div>
                    {SECCIONES.map(s => (
                        <div key={s.id} className={cn('border rounded-xl overflow-hidden', s.color)}>
                            <div className="px-4 py-2.5 border-b border-current/10">
                                <span className={cn('text-xs font-black uppercase tracking-widest', s.headerColor)}>{s.title}</span>
                            </div>
                            <div className="px-4 py-3 max-h-36 overflow-y-auto space-y-2">
                                {s.content.split('\n\n').map((p, i) => (
                                    <p key={i} className="text-xs text-brand-text/70 leading-relaxed">{p}</p>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Declaración jurada */}
                <div className={cn('p-4 rounded-2xl border-2 transition-all',
                    formData.induction?.hasReadAndAccepted ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-brand-surface border-brand-border')}>
                    <label className="flex items-start gap-3 cursor-pointer">
                        <input type="checkbox"
                            className="w-5 h-5 rounded border-brand-border bg-brand-surface text-emerald-500 focus:ring-emerald-500/20 mt-0.5 flex-shrink-0"
                            checked={formData.induction?.hasReadAndAccepted || false}
                            onChange={e => setFormData(p => ({
                                ...p, induction: {
                                    ...p.induction!,
                                    hasReadAndAccepted: e.target.checked,
                                    acceptedAt: e.target.checked ? new Date().toISOString() : undefined,
                                    status: e.target.checked ? 'completed' : 'in_progress',
                                }
                            }))} />
                        <div>
                            <p className={cn('text-sm font-bold transition-colors',
                                formData.induction?.hasReadAndAccepted ? 'text-emerald-400' : 'text-brand-text/70')}>
                                Declaro haber leído y acepto la información entregada
                            </p>
                            <p className="text-[10px] text-brand-text/40 mt-1 leading-relaxed">
                                Al marcar confirmo haber leído Administración, Operatividad, Calidad y el Pacto de Integridad. Esta declaración es legalmente vinculante.
                            </p>
                            {formData.induction?.acceptedAt && (
                                <p className="text-[9px] text-emerald-400/60 font-mono mt-1">
                                    Aceptado el {new Date(formData.induction.acceptedAt).toLocaleString('es-CL')}
                                </p>
                            )}
                        </div>
                    </label>
                </div>

                {/* Certificado */}
                {formData.induction?.hasReadAndAccepted && initialData?.id && (
                    <CertificadoGenerator
                        professionalId={initialData.id}
                        professionalName={`${initialData.name} ${initialData.lastName || ''}`.trim()}
                        acceptedAt={formData.induction.acceptedAt!}
                    />
                )}

                {/* Alerta */}
                <div className="p-3 bg-warning/5 border border-warning/10 rounded-xl flex items-start gap-3">
                    <BellRing className="w-5 h-5 text-warning mt-0.5" />
                    <div>
                        <p className="text-[10px] font-bold text-warning uppercase tracking-widest">Sistema de Alertas</p>
                        <p className="text-[11px] text-warning/80 leading-tight">
                            Se enviarán avisos automáticos 15 días antes del vencimiento del periodo de inducción o de cualquier documento crítico.
                        </p>
                    </div>
                </div>
            </div>
        ) : (
            <div className="text-center py-8">
                <ShieldCheck className="w-12 h-12 text-brand-text/5 mx-auto mb-2" />
                <p className="text-xs text-brand-text/20">La inducción está desactivada para este perfil profesional.</p>
            </div>
        )}
    </div>
);
