import React, { useState } from 'react';
import {
    Home, ClipboardList, Calendar, CreditCard,
    LogOut, Lock, ChevronRight, Stethoscope, Bell,
    FileText, Briefcase, Newspaper, Award,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAuth } from '../../hooks/useAuth';

// ─── Tipos ────────────────────────────────────────────────────────────────────
export type PortalView =
    | 'inicio'
    | 'onboarding'
    | 'documentos'
    | 'contratos'
    | 'noticias'
    | 'competencias'
    | 'turnos'
    | 'pagos';

interface NavItem {
    id: PortalView;
    label: string;
    icon: React.ElementType;
    locked?: boolean;
}

const NAV_ITEMS: NavItem[] = [
    { id: 'inicio',       label: 'Inicio',           icon: Home          },
    { id: 'onboarding',   label: 'Mi Onboarding',    icon: ClipboardList },
    { id: 'documentos',   label: 'Mis Documentos',   icon: FileText      },
    { id: 'contratos',    label: 'Mis Contratos',    icon: Briefcase     },
    { id: 'noticias',     label: 'Noticias',         icon: Newspaper     },
    { id: 'competencias', label: 'Mis Competencias', icon: Award         },
    { id: 'turnos',       label: 'Mis Turnos',       icon: Calendar,     locked: true },
    { id: 'pagos',        label: 'Mis Pagos',        icon: CreditCard,   locked: true },
];

// ─── SidebarItem ──────────────────────────────────────────────────────────────
const SidebarItem: React.FC<{
    item: NavItem;
    active: boolean;
    onClick: () => void;
}> = ({ item, active, onClick }) => {
    const Icon = item.icon;
    return (
        <button
            onClick={item.locked ? undefined : onClick}
            disabled={item.locked}
            className={cn(
                'w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all group',
                active && !item.locked
                    ? 'bg-brand-primary/15 text-brand-primary shadow-sm'
                    : item.locked
                    ? 'text-brand-text/20 cursor-not-allowed'
                    : 'text-brand-text/50 hover:text-brand-text hover:bg-brand-surface'
            )}
        >
            <Icon className={cn('w-4 h-4 flex-shrink-0', active && !item.locked ? 'text-brand-primary' : '')} />
            <span className="flex-1 text-left">{item.label}</span>
            {item.locked
                ? <Lock className="w-3.5 h-3.5 text-brand-text/20" />
                : active
                ? <ChevronRight className="w-3.5 h-3.5 text-brand-primary" />
                : null}
            {item.locked && (
                <span className="text-[8px] font-black uppercase tracking-widest text-brand-text/20 bg-brand-border px-1.5 py-0.5 rounded-md ml-auto">
                    Próx.
                </span>
            )}
        </button>
    );
};

// ─── Layout Principal ─────────────────────────────────────────────────────────
interface PortalMedicoLayoutProps {
    children: React.ReactNode;
    currentView: PortalView;
    onNavigate: (view: PortalView) => void;
}

export const PortalMedicoLayout: React.FC<PortalMedicoLayoutProps> = ({
    children, currentView, onNavigate,
}) => {
    const { user, signOut } = useAuth();
    const [sidebarOpen, setSidebarOpen] = useState(true);

    const initials = user?.name
        ? user.name.split(' ').filter((_: string, i: number) => i < 2).map((w: string) => w[0]).join('')
        : '??';

    return (
        <div className="flex h-screen bg-brand-bg text-brand-text overflow-hidden">

            {/* ── Sidebar ── */}
            <aside className={cn(
                'flex flex-col border-r border-brand-border/50 bg-brand-surface/60 backdrop-blur-xl transition-all duration-300 flex-shrink-0',
                sidebarOpen ? 'w-60' : 'w-16'
            )}>
                {/* Logo */}
                <div className="flex items-center gap-3 px-4 py-5 border-b border-brand-border/30">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-primary to-orange-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-brand-primary/20">
                        <Stethoscope className="w-4 h-4 text-white" />
                    </div>
                    {sidebarOpen && (
                        <div className="min-w-0">
                            <p className="text-xs font-black text-brand-text leading-tight">AMIS Care</p>
                            <p className="text-[9px] text-brand-text/30 uppercase tracking-widest font-bold">Portal Médico</p>
                        </div>
                    )}
                </div>

                {/* Avatar del médico */}
                {sidebarOpen && (
                    <div className="mx-3 mt-4 p-3 bg-brand-bg/50 rounded-2xl border border-brand-border/40">
                        <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500/30 to-blue-600/30 border border-cyan-500/20 flex items-center justify-center text-xs font-black text-cyan-400 flex-shrink-0">
                                {initials}
                            </div>
                            <div className="min-w-0">
                                <p className="text-xs font-black text-brand-text truncate">{user?.name || 'Médico'}</p>
                                <p className="text-[9px] text-brand-text/30 truncate">{user?.email || ''}</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Navegación */}
                <nav className="flex-1 p-3 space-y-1 mt-2">
                    {NAV_ITEMS.map(item => (
                        <SidebarItem
                            key={item.id}
                            item={item}
                            active={currentView === item.id}
                            onClick={() => onNavigate(item.id)}
                        />
                    ))}
                </nav>

                {/* Notificación onboarding pendiente */}
                {sidebarOpen && currentView !== 'onboarding' && (
                    <div
                        onClick={() => onNavigate('onboarding')}
                        className="mx-3 mb-3 p-3 bg-brand-primary/10 border border-brand-primary/30 rounded-2xl cursor-pointer hover:bg-brand-primary/15 transition-all"
                    >
                        <div className="flex items-center gap-2">
                            <Bell className="w-3.5 h-3.5 text-brand-primary animate-pulse flex-shrink-0" />
                            <p className="text-[10px] font-bold text-brand-primary leading-tight">
                                Completa tu onboarding para activar tu cuenta
                            </p>
                        </div>
                    </div>
                )}

                {/* Logout */}
                <div className="p-3 border-t border-brand-border/30">
                    <button
                        onClick={signOut}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-brand-text/30 hover:text-danger hover:bg-danger/5 font-bold text-sm transition-all"
                    >
                        <LogOut className="w-4 h-4 flex-shrink-0" />
                        {sidebarOpen && 'Cerrar Sesión'}
                    </button>
                </div>
            </aside>

            {/* ── Contenido principal ── */}
            <main className="flex-1 overflow-y-auto">
                {/* Header top bar */}
                <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 bg-brand-bg/80 backdrop-blur-sm border-b border-brand-border/30">
                    <button
                        onClick={() => setSidebarOpen(v => !v)}
                        className="p-2 rounded-xl text-brand-text/30 hover:text-brand-text hover:bg-brand-surface transition-all"
                    >
                        <div className="w-4 h-3 flex flex-col justify-between">
                            <span className="h-0.5 bg-current rounded" />
                            <span className="h-0.5 bg-current rounded w-2/3" />
                            <span className="h-0.5 bg-current rounded" />
                        </div>
                    </button>
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] text-brand-text/30 font-bold uppercase tracking-widest">Portal Médico</span>
                        <div className="w-1.5 h-1.5 rounded-full bg-brand-primary animate-pulse" />
                    </div>
                </div>

                {/* Página activa */}
                <div className="p-6 max-w-4xl mx-auto">
                    {children}
                </div>
            </main>
        </div>
    );
};
