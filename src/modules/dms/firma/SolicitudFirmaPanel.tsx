import React, { useState } from 'react';
import { FileSignature, CheckCircle2, Clock, Ban, Loader2 } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { useAuth } from '../../../hooks/useAuth';
import { useMyLevel } from '../../../lib/accessLevels';
import { useFirma } from '../../../hooks/useFirma';
import { timeAgo } from '../../../lib/timeAgo';
import type { SolicitudRow } from '../../../types/firma';

const ESTADO_BADGE: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
    pendiente: { label: 'Pendiente', className: 'bg-amber-500/10 text-amber-600', icon: <Clock className="w-3 h-3" /> },
    firmado: { label: 'Firmado', className: 'bg-emerald-500/10 text-emerald-600', icon: <CheckCircle2 className="w-3 h-3" /> },
};

interface SolicitudFirmaPanelProps {
    solicitud: SolicitudRow;
    onAnulada?: () => void;
}

// Fase 4: seguimiento de una solicitud de firma (firmantes/estado/plazo + anular).
export const SolicitudFirmaPanel: React.FC<SolicitudFirmaPanelProps> = ({ solicitud, onAnulada }) => {
    const { user } = useAuth();
    const { level } = useMyLevel();
    const { anularSolicitud } = useFirma();
    const [anulando, setAnulando] = useState(false);
    const [msg, setMsg] = useState<string | null>(null);

    const puedeAnular = solicitud.estado === 'pendiente' && (solicitud.solicitante === user?.id || level <= 1);

    const handleAnular = async () => {
        if (!confirm('¿Anular esta solicitud de firma? Los firmantes ya no podrán firmar este documento.')) return;
        setAnulando(true);
        const res = await anularSolicitud(solicitud.id);
        setAnulando(false);
        if (res.success) onAnulada?.();
        else setMsg(res.error || 'No se pudo anular la solicitud');
    };

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <FileSignature className="w-4 h-4 text-brand-primary" />
                    <p className="text-[11px] font-black uppercase tracking-widest text-brand-text/50">Solicitud de firma</p>
                </div>
                <span className={cn(
                    'text-[10px] font-black uppercase px-2 py-0.5 rounded-full',
                    solicitud.estado === 'pendiente' ? 'bg-amber-500/10 text-amber-600' :
                    solicitud.estado === 'completada' ? 'bg-emerald-500/10 text-emerald-600' :
                    solicitud.estado === 'vencida' ? 'bg-orange-500/10 text-orange-600' : 'bg-brand-text/10 text-brand-text/50'
                )}>
                    {solicitud.estado}
                </span>
            </div>

            {solicitud.plazo && (
                <p className="text-[11px] text-brand-text/40">Plazo: {new Date(solicitud.plazo + 'T00:00:00').toLocaleDateString('es-CL')}</p>
            )}
            {solicitud.mensaje && (
                <p className="text-xs text-brand-text/60 italic">"{solicitud.mensaje}"</p>
            )}

            <div className="space-y-1.5">
                {solicitud.firmantes.map(f => {
                    const badge = ESTADO_BADGE[f.estado];
                    return (
                        <div key={f.id} className="flex items-center justify-between px-3 py-2 rounded-xl bg-brand-bg border border-brand-border">
                            <span className="text-xs font-bold text-brand-text truncate">{f.userName}</span>
                            <div className="flex items-center gap-2 shrink-0">
                                {f.estado === 'firmado' && f.firmadoAt && (
                                    <span className="text-[10px] text-brand-text/30">{timeAgo(f.firmadoAt)}</span>
                                )}
                                <span className={cn('flex items-center gap-1 text-[10px] font-black uppercase px-2 py-0.5 rounded-full', badge.className)}>
                                    {badge.icon} {badge.label}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>

            {msg && <p className="text-[11px] font-bold text-danger">{msg}</p>}

            {puedeAnular && (
                <button
                    onClick={handleAnular}
                    disabled={anulando}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest border border-danger/30 text-danger hover:bg-danger/5 transition-all disabled:opacity-50"
                >
                    {anulando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Ban className="w-3.5 h-3.5" />}
                    Anular solicitud
                </button>
            )}
        </div>
    );
};
