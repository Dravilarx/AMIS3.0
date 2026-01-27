import { LayoutDashboard, FileText, Users, Calendar, Truck, Stethoscope, ShieldCheck, Layers, MessageSquare, FolderSearch, Bell, Settings, LogOut, Lightbulb, Search } from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuth, type UserRole } from '../hooks/useAuth';

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
            "flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-all duration-200 group",
            active ? "bg-white/10 text-white" : "text-white/40 hover:text-white hover:bg-white/5"
        )}>
        <Icon className="w-5 h-5 flex-shrink-0" />
        <span className="text-sm font-medium">{label}</span>
    </div>
);

interface LayoutProps {
    children: React.ReactNode;
    currentView: 'dashboard' | 'tenders' | 'staffing' | 'logistics' | 'clinical' | 'audit' | 'shifts' | 'projects' | 'messaging' | 'dms' | 'ideation';
    onNavigate: (view: any) => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, currentView, onNavigate }) => {
    const { user, setRole, hasPermission } = useAuth();

    const navItems = [
        { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard, perm: 'view_dashboard' },
        { id: 'tenders', name: 'Licitaciones', icon: FileText, perm: 'view_tenders' },
        { id: 'staffing', name: 'RR.HH. 360', icon: Users, perm: 'manage_staffing' },
        { id: 'shifts', name: 'Turnos', icon: Calendar, perm: 'manage_staffing' },
        { id: 'logistics', name: 'Logística', icon: Truck, perm: 'all' },
        { id: 'clinical', name: 'Procedimientos', icon: Stethoscope, perm: 'clinical_workflow' },
        { id: 'audit', name: 'Auditoría IA', icon: ShieldCheck, perm: 'audit_dashboard' },
        { id: 'projects', name: 'BPM & Proyectos', icon: Layers, perm: 'all' },
        { id: 'messaging', name: 'Mensajería', icon: MessageSquare, perm: 'messaging' },
        { id: 'dms', name: 'Expediente IA', icon: FolderSearch, perm: 'all' },
        { id: 'ideation', name: 'Lluvia de Ideas', icon: Lightbulb, perm: 'all' },
    ] as const;

    const filteredNav = navItems.filter(item => hasPermission(item.perm));

    return (
        <div className="flex h-screen bg-black text-white">
            {/* Sidebar */}
            <aside className="w-64 border-r border-white/5 p-4 flex flex-col bg-[#050505]">
                <div className="flex items-center gap-2 mb-8 px-2">
                    <div className="w-10 h-10 rounded bg-gradient-to-tr from-blue-600 to-indigo-400 shadow-xl shadow-blue-500/20 flex items-center justify-center font-black italic">
                        A
                    </div>
                    <div>
                        <h1 className="text-lg font-black tracking-tighter leading-none">AMIS 3.0</h1>
                        <p className="text-[8px] uppercase tracking-[0.2em] text-white/30 font-mono mt-1">UVC Engine v3</p>
                    </div>
                </div>

                <nav className="space-y-1 flex-1 overflow-y-auto custom-scrollbar">
                    {filteredNav.map((item) => (
                        <SidebarItem
                            key={item.id}
                            icon={item.icon}
                            label={item.name}
                            active={currentView === item.id}
                            onClick={() => onNavigate(item.id)}
                        />
                    ))}
                </nav>

                <div className="mt-auto pt-6 border-t border-white/5 space-y-4">
                    <div className="flex items-center gap-3 px-3 py-2 bg-white/[0.02] rounded-xl border border-white/5">
                        <img src={user?.avatar} alt="Avatar" className="w-8 h-8 rounded-lg bg-white/5" />
                        <div className="overflow-hidden">
                            <p className="text-xs font-bold text-white/90 truncate">{user?.name}</p>
                            <p className="text-[10px] text-blue-400 font-mono uppercase tracking-tighter">{user?.role}</p>
                        </div>
                    </div>
                    <div className="space-y-1">
                        <SidebarItem icon={Bell} label="Notificaciones" />
                        <SidebarItem icon={LogOut} label="Cerrar Sesión" />
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-auto flex flex-col bg-black">
                <header className="h-16 border-b border-white/5 flex items-center justify-between px-8 bg-black/40 backdrop-blur-xl sticky top-0 z-10">
                    <div className="flex items-center gap-4">
                        <div className="flex flex-col">
                            <h2 className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Entorno Maestro</h2>
                            <h3 className="text-sm font-bold capitalize text-white/80">{currentView.replace(/_/g, ' ')}</h3>
                        </div>
                        <div className="h-6 w-px bg-white/10" />

                        {/* Role Switcher for Demo */}
                        <div className="flex items-center gap-2 p-1 bg-white/5 rounded-lg border border-white/10">
                            {(['ARCHITECT', 'COORDINATOR', 'AUDITOR'] as UserRole[]).map((r) => (
                                <button
                                    key={r}
                                    onClick={() => setRole(r)}
                                    className={cn(
                                        "px-2 py-1 rounded text-[8px] font-black uppercase tracking-widest transition-all",
                                        user?.role === r ? "bg-blue-500 text-white shadow-lg shadow-blue-500/20" : "text-white/20 hover:text-white/40"
                                    )}
                                >
                                    {r}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="relative group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/20 group-hover:text-blue-400 transition-colors" />
                            <input
                                type="text"
                                placeholder="Búsqueda Inteligente..."
                                className="bg-white/5 border border-white/5 rounded-xl pl-9 pr-4 py-2 text-xs focus:outline-none focus:border-blue-500/50 w-72 transition-all hover:bg-white/[0.08]"
                            />
                        </div>
                        <div className="flex items-center gap-3">
                            <button className="p-2 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all relative">
                                <Bell className="w-4 h-4 text-white/40" />
                                <div className="absolute top-2 right-2 w-1.5 h-1.5 bg-red-500 rounded-full border border-black shadow-sm" />
                            </button>
                            <button className="p-2 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all">
                                <Settings className="w-4 h-4 text-white/40" />
                            </button>
                        </div>
                    </div>
                </header>

                <div className="p-8 flex-1 bg-gradient-to-b from-[#0a0a0a] to-black">
                    {children}
                </div>
            </main>
        </div>
    );
};
