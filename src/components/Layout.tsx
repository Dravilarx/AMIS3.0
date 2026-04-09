import { useState, useEffect } from 'react';
import { LayoutDashboard, FileText, Users, Calendar, Truck, Stethoscope, ShieldCheck, Layers, MessageSquare, FolderSearch, Bell, Settings, Lightbulb, Search, Building2, Newspaper, Moon, Sun, Activity, UserCheck, Headphones, LogOut, Hospital } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { ChangePasswordModal } from './ChangePasswordModal';

import { cn } from '../lib/utils';

interface SidebarItemProps {
    icon: React.ElementType;
    label: string;
    active?: boolean;
    onClick?: () => void;
    permission?: string;
}

const SidebarItem = ({ icon: Icon, label, active, onClick }: SidebarItemProps) => (
    <div
        onClick={onClick}
        className={cn(
            "flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-all duration-200 group relative overflow-hidden",
            active
                ? "bg-brand-primary text-white shadow-lg shadow-orange-500/20"
                : "text-brand-text/60 hover:text-brand-primary hover:bg-brand-primary/5"
        )}>
        {active && <div className="absolute left-0 top-0 bottom-0 w-1 bg-white opacity-20" />}
        <Icon className={cn("w-5 h-5 flex-shrink-0 transition-transform group-hover:scale-110", active ? "text-white" : "text-brand-text/40")} />
        <span className="text-sm font-semibold">{label}</span>
    </div>
);

interface LayoutProps {
    children: React.ReactNode;
    currentView: 'dashboard' | 'tenders' | 'staffing' | 'logistics' | 'clinical' | 'audit' | 'shifts' | 'projects' | 'messaging' | 'dms' | 'ideation' | 'admin' | 'institutions' | 'news' | 'stat_multiris' | 'ai_knowledge' | 'ai_access' | 'dispatch' | 'b2b_portal' | 'secretary_command' | 'radiology_worklist';

    onNavigate: (view: 'dashboard' | 'tenders' | 'staffing' | 'logistics' | 'clinical' | 'audit' | 'shifts' | 'projects' | 'messaging' | 'dms' | 'ideation' | 'admin' | 'institutions' | 'news' | 'stat_multiris' | 'ai_knowledge' | 'ai_access' | 'dispatch' | 'b2b_portal' | 'secretary_command' | 'radiology_worklist') => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, currentView, onNavigate }) => {
    const { user, signOut, isRecoveringPassword, hasModuleAccess } = useAuth();
    const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
    const [theme, setTheme] = useState<'dark' | 'light'>(() => {
        const saved = localStorage.getItem('brand-theme');
        return (saved as 'dark' | 'light') || 'dark';
    });

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('brand-theme', theme);
    }, [theme]);

    const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');

    const navItems = [
        { id: 'dashboard', name: 'Panel Principal', icon: LayoutDashboard },
        { id: 'tenders', name: 'Licitaciones', icon: FileText },
        { id: 'staffing', name: 'Gestión RR.HH.', icon: Users },
        { id: 'shifts', name: 'Turnos Médicos', icon: Calendar },
        { id: 'logistics', name: 'Logística Salud', icon: Truck },
        { id: 'institutions', name: 'Red de Centros', icon: Building2 },
        { id: 'clinical', name: 'Procedimientos', icon: Stethoscope },
        { id: 'audit', name: 'Auditoría IA', icon: ShieldCheck },
        { id: 'projects', name: 'Proyectos BPM', icon: Layers },
        { id: 'messaging', name: 'Mensajería', icon: MessageSquare },
        { id: 'dispatch', name: 'Centro de Despacho', icon: Headphones },
        { id: 'dms', name: 'Archivo Digital', icon: FolderSearch },
        { id: 'ideation', name: 'Innovación', icon: Lightbulb },
        { id: 'news', name: 'Noticias Corporativas', icon: Newspaper },
        { id: 'stat_multiris', name: 'Stat Multiris', icon: Activity },
        { id: 'b2b_portal', name: 'Portal B2B', icon: Hospital },
        { id: 'secretary_command', name: 'Torre de Control', icon: Activity },
        { id: 'radiology_worklist', name: 'Worklist Radiológica', icon: FileText },
    ] as const;

    const ROLE_LABELS: Record<string, string> = {
        'SUPER_ADMIN': 'DIRECCIÓN MÉDICA',
        'ADMIN': 'ADMINISTRADOR',
        'MANAGER': 'GERENTE DE RED',
        'OPERATOR': 'GESTOR CLÍNICO',
        'VIEWER': 'AUDITOR EXTERNO',
        'PARTNER': 'CENTRO DERIVADOR',
        'MED_CHIEF': 'JEFE DE SERVICIO',
        'ADMIN_SECRETARY': 'SECRETARÍA ADM.'
    };

    return (
        <div className="flex h-screen bg-brand-bg text-brand-text font-sans">
            {/* Sidebar */}
            <aside className="w-72 border-r border-brand-border p-6 flex flex-col bg-brand-surface shadow-2xl z-20">
                <div
                    className="flex items-center gap-3 mb-10 px-2 cursor-pointer group"
                    onClick={() => onNavigate('dashboard')}
                >
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-primary to-black shadow-xl shadow-orange-500/20 flex items-center justify-center group-hover:rotate-6 transition-transform">
                        <Stethoscope className="w-7 h-7 text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-black tracking-tight text-brand-primary leading-none">AMIS</h1>
                        <p className="text-[9px] uppercase tracking-[0.25em] text-brand-text/40 font-bold mt-1">Administracion, Medicina, Innovación, Software</p>
                    </div>
                </div>

                <nav className="space-y-1.5 flex-1 overflow-y-auto custom-scrollbar pr-2">
                    {navItems.filter(item => hasModuleAccess(item.id)).map((item) => (
                        <SidebarItem
                            key={item.id}
                            icon={item.icon}
                            label={item.name}
                            active={currentView === item.id}
                            onClick={() => onNavigate(item.id)}
                        />
                    ))}

                        {/* Sección de Administración - Solo para VIPs */}
                        {(user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN') && (
                            <>
                                <p className="text-[10px] uppercase font-black text-brand-text/40 tracking-widest px-3 mb-3 text-center">Configuración Central</p>
                                <SidebarItem
                                    icon={ShieldCheck}
                                    label="Consola Admin"
                                    active={currentView === 'admin'}
                                    onClick={() => onNavigate('admin')}
                                />
                                <SidebarItem
                                    icon={UserCheck}
                                    label="Configuración Bot"
                                    active={currentView === 'ai_access'}
                                    onClick={() => onNavigate('ai_access')}
                                />
                            </>
                        )}
                </nav>

                <div className="mt-auto pt-6 border-t border-brand-border space-y-4">
                    <div className="flex items-center gap-3 p-3 bg-brand-surface border border-brand-border rounded-2xl group hover:border-brand-primary/30 transition-colors">
                        <div className="relative">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-primary to-black flex items-center justify-center text-white text-xs font-black shadow-lg">
                                {user?.name?.[0] || 'U'}
                            </div>
                            <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-success border-2 border-brand-surface rounded-full" />
                        </div>
                        <div className="overflow-hidden">
                            <p className="text-xs font-bold text-brand-text truncate">{user?.name || 'Cargando...'}</p>
                            <p className="text-[10px] text-brand-primary font-bold uppercase tracking-tight">
                                {user?.role ? ROLE_LABELS[user.role] : 'Usuario'}
                            </p>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <button
                            onClick={() => setIsChangePasswordOpen(true)}
                            className="flex items-center justify-center p-2.5 rounded-xl border border-brand-border text-brand-text/40 hover:text-brand-primary hover:border-brand-primary/30 hover:bg-orange-500/5 transition-all"
                        >
                            <Settings className="w-4 h-4" />
                            <span className="ml-2 text-xs font-bold">Cambiar Clave</span>
                        </button>
                        <button
                            onClick={async () => {
                                await signOut();
                                window.location.href = '/';
                            }}
                            className="flex items-center justify-center p-2.5 rounded-xl border border-danger/20 text-danger hover:bg-danger hover:text-white hover:border-danger transition-all"
                        >
                            <LogOut className="w-4 h-4" />
                            <span className="ml-2 text-xs font-bold">Salir</span>
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-auto flex flex-col bg-brand-bg">
                <header className="h-20 border-b border-brand-border flex items-center justify-between px-10 glass sticky top-0 z-10 shadow-xl shadow-black/5">
                    <div className="flex items-center gap-4">
                        <div className="flex flex-col">
                            <h2 className="text-[10px] font-black text-brand-text/40 uppercase tracking-[0.2em] mb-0.5">Módulo Activo</h2>
                            <h3 className="text-base font-black text-brand-text capitalize tracking-tight flex items-center gap-2">
                                {currentView.replace(/_/g, ' ')}
                                <span className="w-1.5 h-1.5 rounded-full bg-brand-primary animate-pulse" />
                            </h3>
                        </div>
                        <div className="h-10 w-px bg-brand-border mx-4" />
                    </div>

                    <div className="flex items-center gap-8">
                        <div className="relative group flex-1 min-w-[300px]">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-text/40 group-focus-within:text-brand-primary transition-colors" />
                            <input
                                type="text"
                                placeholder="Buscar en la red médica..."
                                className="bg-brand-surface border border-brand-border rounded-2xl pl-12 pr-6 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 w-full transition-all hover:border-brand-primary/30"
                            />
                        </div>
                        <div className="flex items-center gap-4">
                            <button
                                onClick={toggleTheme}
                                className="p-3 bg-brand-surface border border-brand-border rounded-2xl hover:border-brand-primary/30 transition-all group"
                                title={theme === 'dark' ? 'Cambiar a Modo Claro' : 'Cambiar a Modo Oscuro'}
                            >
                                {theme === 'dark' ? (
                                    <Sun className="w-5 h-5 text-warning group-hover:scale-110 transition-transform" />
                                ) : (
                                    <Moon className="w-5 h-5 text-info group-hover:scale-110 transition-transform" />
                                )}
                            </button>

                            <button
                                onClick={() => alert('Centro de Notificaciones')}
                                className="p-3 bg-brand-surface border border-brand-border rounded-2xl hover:border-brand-primary/30 transition-all relative group"
                            >
                                <Bell className="w-5 h-5 text-brand-text/40 group-hover:text-brand-primary transition-colors" />
                                <div className="absolute top-2.5 right-2.5 w-2 h-2 bg-brand-primary rounded-full border-2 border-brand-surface shadow-sm" />
                            </button>
                            <div className="h-10 w-px bg-brand-border mx-2" />
                            <div className="text-right hidden sm:block">
                                <p className="text-[10px] font-bold text-brand-text/40 uppercase tracking-widest">Estado Sistema</p>
                                <div className="text-[11px] font-black text-success flex items-center justify-end gap-1.5">
                                    SINCRONIZADO
                                    <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                                </div>
                            </div>
                        </div>
                    </div>
                </header>

                <div className="p-10 flex-1">
                    <div className="w-full mx-auto">
                        {children}
                    </div>
                </div>
            </main>

            <ChangePasswordModal 
                isOpen={isChangePasswordOpen || isRecoveringPassword}
                onClose={() => setIsChangePasswordOpen(false)}
                forceMode={isRecoveringPassword}
            />
        </div>
    );
};
