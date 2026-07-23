import React, { useState } from 'react';
import { Bell, CheckCheck, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { useNotifications, type Notificacion } from '../hooks/useNotifications';
import { timeAgo } from '../lib/timeAgo';

interface NotificationBellProps {
    // Navega al módulo indicado en `notificacion.modulo` (mismo tipo laxo que
    // usa Layout internamente para currentView/onNavigate).
    onNavigate: (view: any) => void;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({ onNavigate }) => {
    const { notifications, unreadCount, loading, refresh, markAsRead, markAllAsRead } = useNotifications();
    const [open, setOpen] = useState(false);

    const handleToggle = () => {
        const next = !open;
        setOpen(next);
        if (next) refresh(); // refresco al abrir el dropdown
    };

    const handleClickNotif = async (n: Notificacion) => {
        if (!n.leida) await markAsRead(n.id);
        setOpen(false);
        // Solo para el módulo Asistente: deja una "intención" para que el dashboard
        // abra la pestaña "Mi bandeja" (y, si puede, el caso de ref_id). No altera
        // el comportamiento para el resto de módulos (siguen con onNavigate(modulo)).
        if (n.modulo === 'asistente') {
            const intent = { tab: 'mi_bandeja', casoId: n.refId };
            try { sessionStorage.setItem('asistente:intent', JSON.stringify(intent)); } catch { /* noop */ }
            window.dispatchEvent(new CustomEvent('asistente:intent', { detail: intent }));
        }
        if (n.modulo) onNavigate(n.modulo);
    };

    return (
        <div className="relative">
            <button
                onClick={handleToggle}
                className="p-3 bg-brand-surface border border-brand-border rounded-2xl hover:border-brand-primary/30 transition-all relative group"
            >
                <Bell className="w-5 h-5 text-brand-text/40 group-hover:text-brand-primary transition-colors" />
                {unreadCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 min-w-[1.1rem] h-[1.1rem] px-1 flex items-center justify-center bg-danger text-white text-[9px] font-black rounded-full border-2 border-brand-surface shadow-sm">
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

            {open && (
                <>
                    <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
                    <div className="absolute right-0 mt-2 w-96 max-w-[90vw] z-40 bg-brand-surface border border-brand-border rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                        <div className="flex items-center justify-between px-4 py-3 border-b border-brand-border">
                            <p className="text-xs font-black uppercase tracking-widest text-brand-text/60">Notificaciones</p>
                            {unreadCount > 0 && (
                                <button
                                    onClick={markAllAsRead}
                                    className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-brand-primary hover:brightness-110 transition-all"
                                >
                                    <CheckCheck className="w-3.5 h-3.5" /> Marcar todas
                                </button>
                            )}
                        </div>

                        <div className="max-h-96 overflow-y-auto custom-scrollbar">
                            {loading ? (
                                <div className="flex justify-center py-10">
                                    <Loader2 className="w-5 h-5 text-brand-primary animate-spin" />
                                </div>
                            ) : notifications.length === 0 ? (
                                <p className="text-center text-brand-text/30 text-xs py-10 uppercase font-black tracking-widest">Sin notificaciones</p>
                            ) : (
                                notifications.map(n => (
                                    <button
                                        key={n.id}
                                        onClick={() => handleClickNotif(n)}
                                        className={cn(
                                            'w-full text-left px-4 py-3 border-b border-brand-border/40 last:border-b-0 transition-colors hover:bg-brand-bg',
                                            !n.leida && 'bg-brand-primary/5'
                                        )}
                                    >
                                        <div className="flex items-start gap-2.5">
                                            {!n.leida && <span className="w-1.5 h-1.5 rounded-full bg-brand-primary mt-1.5 shrink-0" />}
                                            <div className="min-w-0 flex-1">
                                                <p className={cn('text-xs truncate', !n.leida ? 'font-black text-brand-text' : 'font-bold text-brand-text/60')}>
                                                    {n.titulo}
                                                </p>
                                                <p className="text-[11px] text-brand-text/40 line-clamp-2 mt-0.5">{n.cuerpo}</p>
                                                <p className="text-[9px] text-brand-text/30 font-bold uppercase tracking-wider mt-1">{timeAgo(n.createdAt)}</p>
                                            </div>
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};
