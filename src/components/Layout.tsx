import { useState, useEffect } from 'react';
import { LayoutDashboard, FileText, Users, Calendar, Truck, Stethoscope, ShieldCheck, Layers, MessageSquare, FolderSearch, Bell, Settings, Lightbulb, Search, Building2, Newspaper, Moon, Sun, Activity, UserCheck, Headphones, LogOut, Hospital, Globe, ClipboardList, BarChart2, Clock, Inbox, BookOpen, Menu, Palette, Check, Send, Lock } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { ChangePasswordModal } from './ChangePasswordModal';

import { cn } from '../lib/utils';
import { Logo } from './Logo';
import { getLevelForRole, getLabelForRole } from '../lib/accessLevels';

// Temas disponibles (deben existir como [data-theme='id'] en index.css)
const THEMES: { id: string; label: string; dot: string }[] = [
    { id: 'dark',      label: 'Moro (oscuro)', dot: '#3db3a0' },
    { id: 'light',     label: 'Claro',         dot: '#3db3a0' },
    { id: 'vermellon', label: 'Vermellón',     dot: '#ff4536' },
    { id: 'cobalto',   label: 'Cobalto',       dot: '#3b82f6' },
    { id: 'esmeralda', label: 'Esmeralda',     dot: '#2fd08a' },
    { id: 'violeta',   label: 'Violeta',       dot: '#9b7dff' },
    { id: 'ambar',     label: 'Ámbar',         dot: '#f5a524' },
];

// data-theme válidos en index.css (para el toggle claro/oscuro)
const VALID_THEMES = ['dark', 'light', 'vermellon', 'vermellon-light', 'cobalto', 'esmeralda', 'violeta', 'ambar'];

// Orden del menú lateral = fuente única para el filtro por permisos y para la
// vista inicial tras login (App.tsx). Mantener sincronizado con CurrentView.
export const NAV_ITEMS = [
    { id: 'dashboard', name: 'Panel Principal', icon: LayoutDashboard },
    { id: 'tenders', name: 'Licitaciones', icon: FileText },
    { id: 'staffing', name: 'Gestión RR.HH.', icon: Users },
    { id: 'shifts', name: 'Turnos Médicos', icon: Calendar },
    { id: 'cuarto_turno', name: '4° Turno', icon: Clock },
    { id: 'dashboard_cuarto_turno', name: 'Dashboard 4° Turno', icon: BarChart2 },
    { id: 'solicitudes',  name: 'Solicitudes', icon: Inbox },
    { id: 'protocolos',   name: 'Protocolos', icon: BookOpen },
    { id: 'logistics', name: 'Logística Salud', icon: Truck },
    { id: 'institutions', name: 'Red de Centros', icon: Building2 },
    { id: 'clinical', name: 'Procedimientos', icon: Stethoscope },
    { id: 'audit', name: 'Calidad', icon: ShieldCheck },
    { id: 'projects', name: 'Proyectos BPM', icon: Layers },
    { id: 'messaging', name: 'Mensajería', icon: MessageSquare },
    { id: 'dispatch', name: 'Centro de Despacho', icon: Headphones },
    { id: 'asistente', name: 'Asistente', icon: Send },
    { id: 'dms', name: 'Archivo Digital', icon: FolderSearch },
    { id: 'ideation', name: 'Innovación', icon: Lightbulb },
    { id: 'news', name: 'Noticias Corporativas', icon: Newspaper },
    { id: 'stat_multiris', name: 'Stat Multiris', icon: Activity },
    { id: 'stat_multiris_html', name: 'Stat Multiris (HTML)', icon: Globe },
    { id: 'wizard_competencias', name: 'Mi Auto-evaluación', icon: ClipboardList },
    { id: 'b2b_portal', name: 'Portal B2B', icon: Hospital },
    { id: 'secretary_command', name: 'Torre de Control', icon: Activity },
    { id: 'radiology_worklist', name: 'Worklist Radiológica', icon: FileText },
] as const;

interface SidebarItemProps {
    icon: React.ElementType;
    label: string;
    active?: boolean;
    onClick?: () => void;
    permission?: string;
    collapsed?: boolean;
}

const SidebarItem = ({ icon: Icon, label, active, onClick, collapsed }: SidebarItemProps) => (
    <div
        onClick={onClick}
        title={collapsed ? label : undefined}
        className={cn(
            "flex items-center gap-3 py-2 rounded-lg cursor-pointer transition-all duration-200 group relative overflow-hidden",
            collapsed ? "px-0 justify-center" : "px-3",
            active
                ? "bg-brand-primary text-white shadow-lg shadow-teal-500/20"
                : "text-brand-text/60 hover:text-brand-primary hover:bg-brand-primary/5"
        )}>
        {active && !collapsed && <div className="absolute left-0 top-0 bottom-0 w-1 bg-white opacity-20" />}
        <Icon className={cn("w-5 h-5 flex-shrink-0 transition-transform group-hover:scale-110", active ? "text-white" : "text-brand-text/40")} />
        {!collapsed && <span className="text-sm font-semibold whitespace-nowrap">{label}</span>}
    </div>
);

interface LayoutProps {
    children: React.ReactNode;
    currentView: 'dashboard' | 'tenders' | 'staffing' | 'logistics' | 'clinical' | 'audit' | 'shifts' | 'projects' | 'messaging' | 'dms' | 'ideation' | 'admin' | 'institutions' | 'news' | 'stat_multiris' | 'stat_multiris_html' | 'ai_knowledge' | 'ai_access' | 'dispatch' | 'b2b_portal' | 'secretary_command' | 'radiology_worklist' | 'wizard_competencias' | 'resumen_competencias' | 'auditoria_rrhh' | 'portal_medicos_admin' | 'cuarto_turno' | 'dashboard_cuarto_turno' | 'solicitudes' | 'protocolos' | 'portal_institucional' | 'asistente' | 'permisos_carpetas';

    onNavigate: (view: 'dashboard' | 'tenders' | 'staffing' | 'logistics' | 'clinical' | 'audit' | 'shifts' | 'projects' | 'messaging' | 'dms' | 'ideation' | 'admin' | 'institutions' | 'news' | 'stat_multiris' | 'stat_multiris_html' | 'ai_knowledge' | 'ai_access' | 'dispatch' | 'b2b_portal' | 'secretary_command' | 'radiology_worklist' | 'wizard_competencias' | 'resumen_competencias' | 'auditoria_rrhh' | 'portal_medicos_admin' | 'cuarto_turno' | 'dashboard_cuarto_turno' | 'solicitudes' | 'protocolos' | 'portal_institucional' | 'asistente' | 'permisos_carpetas') => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, currentView, onNavigate }) => {
    const { user, signOut, isRecoveringPassword, hasModuleAccess } = useAuth();
    const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
    const [collapsed, setCollapsed] = useState(false);
    const [theme, setTheme] = useState<string>(() => {
        const saved = localStorage.getItem('brand-theme');
        return saved || 'vermellon';   // default: vermellón (oscuro) = tema de marca AMIS
    });
    const [themeMenuOpen, setThemeMenuOpen] = useState(false);

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('brand-theme', theme);
    }, [theme]);

    // ¿El tema activo es "claro"? (moro 'light' o cualquier '<paleta>-light')
    const esClaro = theme === 'light' || theme.endsWith('-light');

    // Toggle claro/oscuro: alterna el sufijo '-light' del tema activo.
    // Si la paleta no tiene variante '-light', mantiene el tema actual.
    const toggleLightDark = () => {
        setTheme(prev => {
            if (prev === 'dark')  return 'light';
            if (prev === 'light') return 'dark';
            if (prev.endsWith('-light')) return prev.slice(0, -'-light'.length); // → versión oscura
            const claro = `${prev}-light`;
            return VALID_THEMES.includes(claro) ? claro : prev; // solo si existe el '-light'
        });
    };

    const navItems = NAV_ITEMS;

    // Etiquetas de roles de aplicación (no jerárquicos). Los 5 roles con nivel
    // se muestran vía getLabelForRole; este mapa cubre el resto.
    const ROLE_LABELS: Record<string, string> = {
        'VIEWER': 'AUDITOR EXTERNO',
        'PARTNER': 'CENTRO DERIVADOR',
        'MED_CHIEF': 'JEFE DE SERVICIO',
        'ADMIN_SECRETARY': 'SECRETARÍA ADM.'
    };

    const miNivel = getLevelForRole(user?.role);

    return (
        <div className="flex h-screen bg-brand-bg text-brand-text font-sans">
            {/* Sidebar */}
            <aside className={cn(
                "border-r border-brand-border flex flex-col bg-brand-surface shadow-2xl z-20 transition-[width] duration-300 ease-in-out",
                collapsed ? "w-20 p-3" : "w-72 p-6"
            )}>
                {/* Botón colapsar / expandir */}
                <button
                    onClick={() => setCollapsed(c => !c)}
                    title={collapsed ? 'Expandir menú' : 'Colapsar menú'}
                    className={cn(
                        "flex items-center justify-center w-9 h-9 rounded-xl border border-brand-border text-brand-text/40 hover:text-brand-primary hover:border-brand-primary/30 hover:bg-brand-primary/5 transition-all mb-4",
                        collapsed ? "mx-auto" : "ml-auto"
                    )}
                >
                    <Menu className="w-4 h-4" />
                </button>

                <div
                    className={cn(
                        "flex items-center gap-3 mb-10 cursor-pointer group",
                        collapsed ? "justify-center px-0" : "px-2"
                    )}
                    onClick={() => onNavigate('dashboard')}
                    title={collapsed ? 'AMIS' : undefined}
                >
                    <div className="shrink-0 group-hover:rotate-6 transition-transform">
                        <Logo type="mark" height={28} />
                    </div>
                    {!collapsed && (
                        <div>
                            <h1 className="text-xl font-black tracking-tight text-brand-primary leading-none">AMIS</h1>
                            <p className="text-[9px] uppercase tracking-[0.25em] text-brand-text/40 font-bold mt-1">Administracion, Medicina, Innovación, Software</p>
                        </div>
                    )}
                </div>

                <nav className="space-y-1.5 flex-1 overflow-y-auto custom-scrollbar pr-2">
                    {navItems.filter(item => hasModuleAccess(item.id)).map((item) => (
                        <SidebarItem
                            key={item.id}
                            icon={item.icon}
                            label={item.name}
                            active={currentView === item.id}
                            onClick={() => onNavigate(item.id)}
                            collapsed={collapsed}
                        />
                    ))}

                        {/* Configuración Central — consolas admin (Jefatura y Dirección, nivel ≤ 2) */}
                        {miNivel <= 2 && (
                            <>
                                {collapsed
                                    ? <div className="my-3 border-t border-brand-border" />
                                    : <p className="text-[10px] uppercase font-black text-brand-text/40 tracking-widest px-3 mb-3 text-center">Configuración Central</p>
                                }
                                {/* Consola Admin (gestión de usuarios/permisos): solo Dirección (nivel 1) */}
                                {miNivel <= 1 && (
                                <SidebarItem
                                    icon={ShieldCheck}
                                    label="Consola Admin"
                                    active={currentView === 'admin'}
                                    onClick={() => onNavigate('admin')}
                                    collapsed={collapsed}
                                />
                                )}
                                {/* Permisos de carpetas (Archivo Digital): solo Dirección (nivel 1) */}
                                {miNivel <= 1 && (
                                <SidebarItem
                                    icon={Lock}
                                    label="Permisos de Carpetas"
                                    active={currentView === 'permisos_carpetas'}
                                    onClick={() => onNavigate('permisos_carpetas')}
                                    collapsed={collapsed}
                                />
                                )}
                                <SidebarItem
                                    icon={UserCheck}
                                    label="Configuración Bot"
                                    active={currentView === 'ai_access'}
                                    onClick={() => onNavigate('ai_access')}
                                    collapsed={collapsed}
                                />
                                <SidebarItem
                                    icon={BarChart2}
                                    label="Resumen Competencias"
                                    active={currentView === 'resumen_competencias'}
                                    onClick={() => onNavigate('resumen_competencias')}
                                    collapsed={collapsed}
                                />
                                <SidebarItem
                                    icon={ClipboardList}
                                    label="Auditoría RR.HH."
                                    active={currentView === 'auditoria_rrhh'}
                                    onClick={() => onNavigate('auditoria_rrhh')}
                                    collapsed={collapsed}
                                />
                                <SidebarItem
                                    icon={Stethoscope}
                                    label="Portal Médicos"
                                    active={currentView === 'portal_medicos_admin'}
                                    onClick={() => onNavigate('portal_medicos_admin')}
                                    collapsed={collapsed}
                                />
                                <SidebarItem
                                    icon={Building2}
                                    label="Portal Institucional"
                                    active={currentView === 'portal_institucional'}
                                    onClick={() => onNavigate('portal_institucional')}
                                    collapsed={collapsed}
                                />
                            </>
                        )}
                </nav>

                <div className="mt-auto pt-6 border-t border-brand-border space-y-4">
                    <div className={cn(
                        "flex items-center gap-3 bg-brand-surface border border-brand-border rounded-2xl group hover:border-brand-primary/30 transition-colors",
                        collapsed ? "p-2 justify-center" : "p-3"
                    )}>
                        <div className="relative shrink-0">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-primary to-black flex items-center justify-center text-white text-xs font-black shadow-lg" title={collapsed ? (user?.name || 'Usuario') : undefined}>
                                {user?.name?.[0] || 'U'}
                            </div>
                            <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-success border-2 border-brand-surface rounded-full" />
                        </div>
                        {!collapsed && (
                            <div className="overflow-hidden">
                                <p className="text-xs font-bold text-brand-text truncate">{user?.name || 'Cargando...'}</p>
                                <p className="text-[10px] text-brand-primary font-bold uppercase tracking-tight">
                                    {user?.role ? (getLevelForRole(user.role) !== 99 ? getLabelForRole(user.role) : (ROLE_LABELS[user.role] || 'Usuario')) : 'Usuario'}
                                </p>
                            </div>
                        )}
                    </div>
                    <div className={cn("gap-2", collapsed ? "flex flex-col" : "grid grid-cols-2")}>
                        <button
                            onClick={() => setIsChangePasswordOpen(true)}
                            title={collapsed ? 'Cambiar Clave' : undefined}
                            className="flex items-center justify-center p-2.5 rounded-xl border border-brand-border text-brand-text/40 hover:text-brand-primary hover:border-brand-primary/30 hover:bg-teal-500/5 transition-all"
                        >
                            <Settings className="w-4 h-4" />
                            {!collapsed && <span className="ml-2 text-xs font-bold">Cambiar Clave</span>}
                        </button>
                        <button
                            onClick={async () => {
                                await signOut();
                                window.location.href = '/';
                            }}
                            title={collapsed ? 'Salir' : undefined}
                            className="flex items-center justify-center p-2.5 rounded-xl border border-danger/20 text-danger hover:bg-danger hover:text-white hover:border-danger transition-all"
                        >
                            <LogOut className="w-4 h-4" />
                            {!collapsed && <span className="ml-2 text-xs font-bold">Salir</span>}
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
                            {/* Toggle claro/oscuro del tema activo (alterna sufijo -light) */}
                            <button
                                onClick={toggleLightDark}
                                className="p-3 bg-brand-surface border border-brand-border rounded-2xl hover:border-brand-primary/30 transition-all group"
                                title={esClaro ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro'}
                            >
                                {esClaro ? (
                                    <Moon className="w-5 h-5 text-info group-hover:scale-110 transition-transform" />
                                ) : (
                                    <Sun className="w-5 h-5 text-warning group-hover:scale-110 transition-transform" />
                                )}
                            </button>

                            <div className="relative">
                                <button
                                    onClick={() => setThemeMenuOpen(o => !o)}
                                    className="p-3 bg-brand-surface border border-brand-border rounded-2xl hover:border-brand-primary/30 transition-all group"
                                    title="Cambiar paleta"
                                >
                                    <Palette className="w-5 h-5 text-brand-primary group-hover:scale-110 transition-transform" />
                                </button>

                                {themeMenuOpen && (
                                    <>
                                        {/* Cierre al clic fuera */}
                                        <div className="fixed inset-0 z-30" onClick={() => setThemeMenuOpen(false)} />
                                        <div className="absolute right-0 mt-2 w-52 z-40 bg-brand-surface border border-brand-border rounded-2xl shadow-2xl p-1.5 animate-in fade-in zoom-in-95 duration-150">
                                            <p className="px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-brand-text/40">Tema</p>
                                            {THEMES.map(t => {
                                                const active = theme === t.id || theme === `${t.id}-light`;
                                                return (
                                                    <button
                                                        key={t.id}
                                                        onClick={() => { setTheme(t.id); setThemeMenuOpen(false); }}
                                                        className={cn(
                                                            'w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition-colors',
                                                            active ? 'bg-brand-primary/10 text-brand-text' : 'text-brand-text/60 hover:bg-brand-bg hover:text-brand-text'
                                                        )}
                                                    >
                                                        <span className="w-3 h-3 rounded-full shrink-0 border border-black/10" style={{ backgroundColor: t.dot }} />
                                                        <span className="flex-1 text-xs font-bold">{t.label}</span>
                                                        {active && <Check className="w-3.5 h-3.5 text-brand-primary" />}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </>
                                )}
                            </div>

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
