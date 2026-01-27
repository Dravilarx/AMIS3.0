import React from 'react';
import {
    LayoutDashboard,
    FileText,
    Users,
    Truck,
    Stethoscope,
    ShieldCheck,
    LogOut,
    Bell,
    Search,
    Settings,
    Calendar,
    Layers,
    MessageSquare,
    FolderSearch
} from 'lucide-react';
import { cn } from '../lib/utils';

interface SidebarItemProps {
    icon: React.ElementType;
    label: string;
    active?: boolean;
    onClick?: () => void;
}

const SidebarItem = ({ icon: Icon, label, active, onClick }: SidebarItemProps) => (
    <div
        onClick={onClick}
        className={cn(
            "flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-all duration-200 group",
            active ? "bg-white/10 text-white" : "text-white/40 hover:text-white hover:bg-white/5"
        )}>
        <Icon className="w-5 h-5" />
        <span className="text-sm font-medium">{label}</span>
    </div>
);

interface LayoutProps {
    children: React.ReactNode;
    currentView: 'dashboard' | 'tenders' | 'staffing' | 'logistics' | 'clinical' | 'audit' | 'shifts' | 'projects' | 'messaging' | 'dms';
    onNavigate: (view: 'dashboard' | 'tenders' | 'staffing' | 'logistics' | 'clinical' | 'audit' | 'shifts' | 'projects' | 'messaging' | 'dms') => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, currentView, onNavigate }) => {
    const navItems = [
        { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard },
        { id: 'tenders', name: 'Licitaciones', icon: FileText },
        { id: 'staffing', name: 'RR.HH. 360', icon: Users },
        { id: 'shifts', name: 'Turnos', icon: Calendar },
        { id: 'logistics', name: 'Logística', icon: Truck },
        { id: 'clinical', name: 'Procedimientos', icon: Stethoscope },
        { id: 'audit', name: 'Auditoría IA', icon: ShieldCheck },
        { id: 'projects', name: 'BPM & Proyectos', icon: Layers },
        { id: 'messaging', name: 'Mensajería', icon: MessageSquare },
        { id: 'dms', name: 'Expediente IA', icon: FolderSearch },
    ] as const;

    return (
        <div className="flex h-screen bg-black text-white">
            {/* Sidebar */}
            <aside className="w-64 border-r border-white/5 p-4 flex flex-col">
                <div className="flex items-center gap-2 mb-8 px-2">
                    <div className="w-8 h-8 rounded bg-gradient-to-tr from-blue-600 to-indigo-400 shadow-lg shadow-blue-500/20" />
                    <h1 className="text-xl font-bold tracking-tight">AMIS 3.0</h1>
                </div>

                <nav className="space-y-1 flex-1">
                    {navItems.map((item) => (
                        <SidebarItem
                            key={item.id}
                            icon={item.icon}
                            label={item.name}
                            active={currentView === item.id}
                            onClick={() => onNavigate(item.id)}
                        />
                    ))}
                </nav>

                <div className="mt-auto pt-4 border-t border-white/5 space-y-1">
                    <SidebarItem icon={Bell} label="Notificaciones" />
                    <SidebarItem icon={Settings} label="Configuración" />
                    <div className="h-4" />
                    <SidebarItem icon={LogOut} label="Cerrar Sesión" />
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-auto flex flex-col bg-[#050505]">
                <header className="h-16 border-b border-white/5 flex items-center justify-between px-8 bg-black/50 backdrop-blur-sm sticky top-0 z-10">
                    <div className="flex items-center gap-4">
                        <h2 className="text-sm font-medium text-white/60">Holding Portezuelo</h2>
                        <div className="h-4 w-px bg-white/10" />
                        <h3 className="text-sm font-medium capitalize text-white/40">{currentView}</h3>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                            <input
                                type="text"
                                placeholder="Búsqueda Semántica..."
                                className="bg-white/5 border border-white/10 rounded-full pl-10 pr-4 py-1.5 text-xs focus:outline-none focus:border-blue-500/50 w-64 transition-all"
                            />
                        </div>
                        <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                            <span className="text-[10px] font-bold">DA</span>
                        </div>
                    </div>
                </header>

                <div className="p-8 flex-1">
                    {children}
                </div>
            </main>
        </div>
    );
};
