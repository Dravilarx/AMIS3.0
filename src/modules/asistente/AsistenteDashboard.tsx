import React, { useState, useMemo } from 'react';
import { Send, Inbox, UserPlus } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAsistente } from './useAsistente';
import { useBandeja } from './useBandeja';
import { BandejaPanel } from './BandejaPanel';
import { InvitacionesPanel } from './InvitacionesPanel';

type Tab = 'bandeja' | 'invitaciones';

export const AsistenteDashboard: React.FC = () => {
    const [tab, setTab] = useState<Tab>('bandeja');

    // Se levantan una sola vez acá y se pasan a los paneles como props, para
    // no duplicar fetch/realtime/polling al cambiar de tab.
    const { institutions } = useAsistente();
    const { mensajes, loading, error, tomarMensaje, responderMensaje, cerrarMensaje, reabrirMensaje } = useBandeja();

    // Cuenta 'nuevo' + 'reabierto': ambos se comportan como pendientes de atención.
    const nuevosCount = useMemo(
        () => mensajes.filter(m => m.estado === 'nuevo' || m.estado === 'reabierto').length,
        [mensajes]
    );

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-primary to-black flex items-center justify-center shadow-xl shadow-brand-primary/20">
                    <Send className="w-6 h-6 text-white" />
                </div>
                <div>
                    <h1 className="text-2xl font-black text-brand-text tracking-tighter uppercase leading-none">Asistente</h1>
                    <p className="text-[10px] text-brand-primary font-black uppercase tracking-[0.3em] mt-1.5">
                        Asistente de comunicación con médicos remitentes
                    </p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex bg-brand-surface/50 border border-brand-border p-1.5 rounded-2xl w-fit gap-1">
                <button
                    onClick={() => setTab('bandeja')}
                    className={cn(
                        'flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all',
                        tab === 'bandeja' ? 'bg-brand-bg text-brand-text shadow-sm' : 'text-brand-text/40 hover:text-brand-text/80'
                    )}
                >
                    <Inbox className="w-3.5 h-3.5" /> Bandeja
                    {nuevosCount > 0 && (
                        <span className="flex items-center justify-center min-w-[1.1rem] h-[1.1rem] px-1 bg-danger text-white text-[9px] font-black rounded-full">
                            {nuevosCount > 99 ? '99+' : nuevosCount}
                        </span>
                    )}
                </button>
                <button
                    onClick={() => setTab('invitaciones')}
                    className={cn(
                        'flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all',
                        tab === 'invitaciones' ? 'bg-brand-bg text-brand-text shadow-sm' : 'text-brand-text/40 hover:text-brand-text/80'
                    )}
                >
                    <UserPlus className="w-3.5 h-3.5" /> Invitaciones
                </button>
            </div>

            {tab === 'bandeja' ? (
                <BandejaPanel
                    mensajes={mensajes}
                    loading={loading}
                    error={error}
                    institutions={institutions}
                    onTomar={tomarMensaje}
                    onResponder={responderMensaje}
                    onCerrar={cerrarMensaje}
                    onReabrir={reabrirMensaje}
                />
            ) : (
                <InvitacionesPanel />
            )}
        </div>
    );
};
