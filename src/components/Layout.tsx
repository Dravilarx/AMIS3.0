import { useState, useEffect } from 'react';
import { LayoutDashboard, FileText, Users, Calendar, Truck, Stethoscope, ShieldCheck, Layers, MessageSquare, FolderSearch, Bell, Settings, Lightbulb, Search, Building2, Newspaper, Moon, Sun, Activity } from 'lucide-react';

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
                ? "bg-prevenort-primary text-white shadow-lg shadow-orange-500/20"
                : "text-prevenort-text/60 hover:text-prevenort-primary hover:bg-prevenort-primary/5"
        )}>
        {active && <div className="absolute left-0 top-0 bottom-0 w-1 bg-white opacity-20" />}
        <Icon className={cn("w-5 h-5 flex-shrink-0 transition-transform group-hover:scale-110", active ? "text-white" : "text-prevenort-text/40")} />
        <span className="text-sm font-semibold">{label}</span>
    </div>
);

interface LayoutProps {
    children: React.ReactNode;
    currentView: 'dashboard' | 'tenders' | 'staffing' | 'logistics' | 'clinical' | 'audit' | 'shifts' | 'projects' | 'messaging' | 'dms' | 'ideation' | 'admin' | 'institutions' | 'news' | 'stat_multiris';

    onNavigate: (view: any) => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, currentView, onNavigate }) => {
    const [theme, setTheme] = useState<'dark' | 'light'>(() => {
        const saved = localStorage.getItem('prevenort-theme');
        return (saved as 'dark' | 'light') || 'dark';
    });

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('prevenort-theme', theme);
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
        { id: 'dms', name: 'Archivo Digital', icon: FolderSearch },
        { id: 'ideation', name: 'Innovación', icon: Lightbulb },
        { id: 'news', name: 'Noticias Corporativas', icon: Newspaper },
        { id: 'stat_multiris', name: 'Stat Multiris', icon: Activity },

    ] as const;

    return (
        <div className="flex h-screen bg-prevenort-bg text-prevenort-text font-sans">
            {/* Sidebar */}
            <aside className="w-72 border-r border-prevenort-border p-6 flex flex-col bg-prevenort-surface shadow-2xl z-20">
                <div
                    className="flex items-center gap-3 mb-10 px-2 cursor-pointer group"
                    onClick={() => onNavigate('dashboard')}
                >
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-prevenort-primary to-black shadow-xl shadow-orange-500/20 flex items-center justify-center group-hover:rotate-6 transition-transform">
                        <Stethoscope className="w-7 h-7 text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-black tracking-tight text-prevenort-primary leading-none">AMIS</h1>
                        <p className="text-[9px] uppercase tracking-[0.25em] text-prevenort-text/40 font-bold mt-1">Administracion, Medicina, Innovación, Software</p>
                    </div>
                </div>

                <nav className="space-y-1.5 flex-1 overflow-y-auto custom-scrollbar pr-2">
                    {navItems.map((item) => (
                        <SidebarItem
                            key={item.id}
                            icon={item.icon}
                            label={item.name}
                            active={currentView === item.id}
                            onClick={() => onNavigate(item.id)}
                        />
                    ))}

                    {/* Sección de Administración */}
                    <div className="pt-6 mt-6 border-t border-prevenort-border">
                        <p className="text-[10px] uppercase font-black text-prevenort-text/40 tracking-widest px-3 mb-3 text-center">Configuración Central</p>
                        <SidebarItem
                            icon={ShieldCheck}
                            label="Consola Admin"
                            active={currentView === 'admin'}
                            onClick={() => onNavigate('admin')}
                        />
                    </div>
                </nav>

                <div className="mt-auto pt-6 border-t border-prevenort-border space-y-4">
                    <div className="flex items-center gap-3 p-3 bg-prevenort-surface border border-prevenort-border rounded-2xl group hover:border-prevenort-primary/30 transition-colors">
                        <div className="relative">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-prevenort-primary to-black flex items-center justify-center text-white text-xs font-black shadow-lg">AD</div>
                            <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-success border-2 border-prevenort-surface rounded-full" />
                        </div>
                        <div className="overflow-hidden">
                            <p className="text-xs font-bold text-prevenort-text truncate">Administrador</p>
                            <p className="text-[10px] text-prevenort-primary font-bold uppercase tracking-tight">DIRECTOR MÉDICO</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                        <button
                            onClick={() => alert('Próximamente: Preferencias')}
                            className="flex items-center justify-center p-2.5 rounded-xl border border-prevenort-border text-prevenort-text/40 hover:text-prevenort-primary hover:border-prevenort-primary/30 hover:bg-orange-500/5 transition-all"
                        >
                            <Settings className="w-4 h-4" />
                            <span className="ml-2 text-xs font-bold">Ajustes</span>
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-auto flex flex-col bg-prevenort-bg">
                <header className="h-20 border-b border-prevenort-border flex items-center justify-between px-10 glass sticky top-0 z-10 shadow-xl shadow-black/5">
                    <div className="flex items-center gap-4">
                        <div className="flex flex-col">
                            <h2 className="text-[10px] font-black text-prevenort-text/40 uppercase tracking-[0.2em] mb-0.5">Módulo Activo</h2>
                            <h3 className="text-base font-black text-prevenort-text capitalize tracking-tight flex items-center gap-2">
                                {currentView.replace(/_/g, ' ')}
                                <span className="w-1.5 h-1.5 rounded-full bg-prevenort-primary animate-pulse" />
                            </h3>
                        </div>
                        <div className="h-10 w-px bg-prevenort-border mx-4" />
                    </div>

                    <div className="flex items-center gap-8">
                        <div className="relative group flex-1 min-w-[300px]">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-prevenort-text/40 group-focus-within:text-prevenort-primary transition-colors" />
                            <input
                                type="text"
                                placeholder="Buscar en la red médica..."
                                className="bg-prevenort-surface border border-prevenort-border rounded-2xl pl-12 pr-6 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-prevenort-primary/20 w-full transition-all hover:border-prevenort-primary/30"
                            />
                        </div>
                        <div className="flex items-center gap-4">
                            <button
                                onClick={toggleTheme}
                                className="p-3 bg-prevenort-surface border border-prevenort-border rounded-2xl hover:border-prevenort-primary/30 transition-all group"
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
                                className="p-3 bg-prevenort-surface border border-prevenort-border rounded-2xl hover:border-prevenort-primary/30 transition-all relative group"
                            >
                                <Bell className="w-5 h-5 text-prevenort-text/40 group-hover:text-prevenort-primary transition-colors" />
                                <div className="absolute top-2.5 right-2.5 w-2 h-2 bg-prevenort-primary rounded-full border-2 border-prevenort-surface shadow-sm" />
                            </button>
                            <div className="h-10 w-px bg-prevenort-border mx-2" />
                            <div className="text-right hidden sm:block">
                                <p className="text-[10px] font-bold text-prevenort-text/40 uppercase tracking-widest">Estado Sistema</p>
                                <div className="text-[11px] font-black text-success flex items-center justify-end gap-1.5">
                                    SINCRONIZADO
                                    <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                                </div>
                            </div>
                        </div>
                    </div>
                </header>

                <div className="p-10 flex-1">
                    <div className="max-w-7xl mx-auto">
                        {children}
                    </div>
                </div>
            </main>
        </div>
    );
};
