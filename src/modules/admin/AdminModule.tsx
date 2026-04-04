import React, { useState } from 'react';
import { Shield, UserPlus, Lock, Trash2, X, CheckCircle2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAdminProfiles } from '../../hooks/useAdminProfiles';
import { useAuth, type UserRole, type UserPermissions } from '../../hooks/useAuth';
import { ClinicOnboarding } from './ClinicOnboarding';
import { ProcedureHomologation } from './ProcedureHomologation';
import { CriticalPathologies } from './CriticalPathologies';
import { CreateInternalUserModal } from './CreateInternalUserModal';

const MODULES = [
    { id: 'dashboard', name: 'Panel Principal' },
    { id: 'tenders', name: 'Licitaciones' },
    { id: 'staffing', name: 'Gestión RR.HH.' },
    { id: 'shifts', name: 'Turnos Médicos' },
    { id: 'logistics', name: 'Logística Salud' },
    { id: 'institutions', name: 'Red de Centros' },
    { id: 'clinical', name: 'Procedimientos' },
    { id: 'audit', name: 'Auditoría IA' },
    { id: 'projects', name: 'Proyectos BPM' },
    { id: 'messaging', name: 'Mensajería' },
    { id: 'dispatch', name: 'Centro de Despacho' },
    { id: 'dms', name: 'Archivo Digital' },
    { id: 'ideation', name: 'Innovación' },
    { id: 'news', name: 'Noticias Corporativas' },
    { id: 'stat_multiris', name: 'Stat Multiris' },
] as const;

const ROLE_LABELS: Record<UserRole, string> = {
    'SUPER_ADMIN': 'DIRECCIÓN MÉDICA',
    'ADMIN': 'ADMINISTRADOR',
    'MANAGER': 'GERENTE DE RED',
    'OPERATOR': 'GESTOR CLÍNICO',
    'VIEWER': 'AUDITOR EXTERNO',
    'ADMIN_SECRETARY': 'SECRETARÍA ADN',
    'PARTNER': 'LABORATORIO/SOCIO',
    'MED_CHIEF': 'JEFE DE SERVICIO'
};

export const AdminModule: React.FC = () => {
    const { profiles, updateProfile, deleteProfile, createProfile } = useAdminProfiles();
    const { user: _currentUser } = useAuth();
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'internal' | 'b2b' | 'homologation' | 'alertas'>('internal');

    const [showB2BModal, setShowB2BModal] = useState(false);
    const [showInternalModal, setShowInternalModal] = useState(false);
    const [localPerms, setLocalPerms] = useState<Partial<UserPermissions>>({});

    const selectedProfile = profiles.find(p => p.id === selectedUserId);

    React.useEffect(() => {
        if (selectedProfile) {
            setLocalPerms(selectedProfile.permissions || {});
        } else {
            setLocalPerms({});
        }
    }, [selectedUserId, selectedProfile]);

    const handleRoleChange = (userId: string, newRole: UserRole) => {
        updateProfile(userId, { role: newRole });
    };

    const togglePermission = (moduleId: string, action: string) => {
        if (selectedProfile?.role === 'SUPER_ADMIN') return;
        
        setLocalPerms(prev => {
            const moduleKey = moduleId as keyof UserPermissions;
            const modulePerms = (prev[moduleKey] as any) || { read: false, create: false, update: false, delete: false };
            return {
                ...prev,
                [moduleKey]: {
                    ...modulePerms,
                    [action]: !modulePerms[action]
                }
            };
        });
    };

    const handleConsolidate = async () => {
        if (!selectedUserId) return;
        const result = await updateProfile(selectedUserId, { permissions: localPerms as any });
        if (result.success) {
            alert('✅ Facultades consolidadas exitosamente en la red AMIS.');
            setSelectedUserId(null); // Limpiar pantalla tras consolidar
        } else {
            alert('❌ Error: ' + result.error);
        }
    };

    const handleDelete = async (userId: string) => {
        if (confirm('¿Estás seguro de eliminar a este administrador? Esta acción es irreversible.')) {
            const result = await deleteProfile(userId);
            if (!result.success) alert(result.error);
        }
    };

    return (
        <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black text-brand-text tracking-tight uppercase mb-1">Centro de Control Red</h1>
                    <p className="text-[10px] text-brand-text/40 font-bold uppercase tracking-[0.3em]">Gestión de Accesos, Perfiles y Seguridad · AMIS Intelligence</p>
                </div>
                <div className="flex gap-3">
                    {activeTab === 'internal' ? (
                        <button 
                            onClick={() => setShowInternalModal(true)}
                            className="flex items-center gap-2.5 px-6 py-3 bg-brand-primary text-white hover:opacity-90 rounded-2xl transition-all font-black text-[10px] uppercase tracking-widest shadow-lg shadow-brand-primary/25"
                        >
                            <UserPlus className="w-4 h-4" />
                            Registrar Analista Interno
                        </button>
                    ) : (
                        <button 
                            onClick={() => setShowB2BModal(true)}
                            className="flex items-center gap-2.5 px-6 py-3 bg-brand-text text-brand-bg hover:opacity-90 rounded-2xl transition-all font-black text-[10px] uppercase tracking-widest shadow-lg shadow-brand-text/25"
                        >
                            <UserPlus className="w-4 h-4" />
                            Alta Manual de Médico (B2B)
                        </button>
                    )}
                </div>
            </div>

            <CreateInternalUserModal 
                isOpen={showInternalModal}
                onClose={() => setShowInternalModal(false)}
                onCreated={createProfile}
            />

            {/* TAB SELECTOR */}
            <div className="flex bg-brand-surface/50 border border-brand-border p-1.5 rounded-2xl w-fit flex-wrap gap-1">
                <button 
                  onClick={() => setActiveTab('internal')}
                  className={cn("px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all", activeTab === 'internal' ? 'bg-brand-bg text-brand-text shadow-sm' : 'text-brand-text/40 hover:text-brand-text/80')}
                >
                    Organigrama Interno
                </button>
                <button 
                  onClick={() => setActiveTab('b2b')}
                  className={cn("px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all", activeTab === 'b2b' ? 'bg-brand-bg text-brand-text shadow-sm' : 'text-brand-text/40 hover:text-brand-text/80')}
                >
                    Whitelist Clínicas B2B
                </button>
                <button 
                  onClick={() => setActiveTab('homologation')}
                  className={cn("px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all", activeTab === 'homologation' ? 'bg-info/10 text-info border border-info/20 shadow-sm' : 'text-brand-text/40 hover:text-brand-text/80')}
                >
                    Diccionario Clínico
                </button>
                <button 
                  onClick={() => setActiveTab('alertas')}
                  className={cn("px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all", activeTab === 'alertas' ? 'bg-danger/10 text-danger border border-danger/20 shadow-sm' : 'text-brand-text/40 hover:text-brand-text/80')}
                >
                    Matriz de Alertas Rojas
                </button>
            </div>

            {activeTab === 'internal' ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Lista de Usuarios */}
                <div className="lg:col-span-1 space-y-4">
                    <div className="flex items-center gap-2.5 mb-6 px-2">
                        <div className="p-1.5 bg-brand-primary/10 rounded-lg">
                            <Shield className="w-4 h-4 text-brand-primary" />
                        </div>
                        <h3 className="text-[10px] font-black text-brand-text/40 uppercase tracking-[0.2em]">Cuerpo Médico y Administrativo</h3>
                    </div>
                    <div className="space-y-3 max-h-[calc(100vh-280px)] overflow-y-auto pr-2 custom-scrollbar">
                        {profiles.map(profile => (
                            <div
                                key={profile.id}
                                onClick={() => setSelectedUserId(profile.id)}
                                className={cn(
                                    "group p-5 rounded-3xl border transition-all cursor-pointer relative overflow-hidden",
                                    selectedUserId === profile.id
                                        ? "bg-brand-surface border-brand-primary shadow-xl shadow-brand-primary/10 scale-[1.02] z-10"
                                        : "bg-brand-surface/50 border-brand-border hover:bg-brand-surface hover:border-brand-text/10 hover:shadow-lg"
                                )}
                            >
                                {profile.email === 'marcelo.avila@amis.global' && (
                                    <div className="absolute top-4 right-4 p-1 px-2 bg-warning/10 rounded-lg border border-warning/20 transition-opacity">
                                        <Lock className="w-3 h-3 text-warning" />
                                    </div>
                                )}
                                <div className="flex items-center gap-4">
                                    <div className={cn(
                                        "w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg shadow-sm border transition-colors",
                                        selectedUserId === profile.id
                                            ? "bg-brand-primary text-white border-brand-primary"
                                            : "bg-brand-surface text-brand-text/40 border-brand-border"
                                    )}>
                                        {profile.full_name[0]}
                                    </div>
                                    <div className="flex-1 overflow-hidden">
                                        <p className="text-sm font-black text-brand-text truncate">{profile.full_name}</p>
                                        <p className="text-[10px] text-brand-text/40 font-bold truncate mt-0.5">{profile.email}</p>
                                    </div>
                                    <div className="text-right">
                                        <span className={cn(
                                            "text-[8px] font-black px-2.5 py-1 rounded-lg uppercase tracking-wider border shadow-sm",
                                            profile.role === 'SUPER_ADMIN' ? "bg-warning/10 text-warning border-warning/20" :
                                                profile.role === 'ADMIN' ? "bg-info/10 text-info border-info/20" : "bg-brand-surface text-brand-text/40 border-brand-border"
                                        )}>
                                            {ROLE_LABELS[profile.role]}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Detalle de Permisos */}
                <div className="lg:col-span-2">
                    {selectedProfile ? (
                        <div className="card-premium space-y-8 animate-in slide-in-from-right-4 duration-500">
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-5">
                                    <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-brand-primary to-blue-800 flex items-center justify-center text-3xl font-black text-white border-4 border-brand-surface shadow-2xl">
                                        {selectedProfile.full_name[0]}
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-black text-brand-text tracking-tight">{selectedProfile.full_name}</h2>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="px-2 py-0.5 bg-info/10 text-info text-[10px] font-black rounded-lg border border-info/20 uppercase">{selectedProfile.email}</span>
                                            <span className="text-brand-text/20">●</span>
                                            <span className="text-[10px] font-bold text-brand-text/40 uppercase tracking-widest">{ROLE_LABELS[selectedProfile.role]}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setSelectedUserId(null)}
                                        className="p-3 bg-brand-surface border border-brand-border rounded-2xl hover:bg-brand-bg text-brand-text/40 hover:text-brand-text transition-all shadow-sm"
                                        title="Cerrar Vista"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                    {selectedProfile.email !== 'marcelo.avila@amis.global' && (
                                        <button
                                            onClick={() => handleDelete(selectedProfile.id)}
                                            className="p-3 bg-danger/10 border border-danger/20 rounded-2xl hover:bg-danger/20 text-danger transition-all shadow-sm"
                                            title="Retirar del Sistema"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Selector de Rol */}
                            <div className="space-y-5">
                                <div className="flex items-center gap-2.5">
                                    <div className="p-1 px-2 bg-brand-surface rounded text-[10px] font-black text-brand-text/50">01</div>
                                    <h4 className="text-[10px] uppercase font-black text-brand-text/40 tracking-[0.2em]">Nivel de Acceso Institucional</h4>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    {(['ADMIN', 'MANAGER', 'OPERATOR', 'VIEWER'] as UserRole[]).map(role => (
                                        <button
                                            key={role}
                                            disabled={selectedProfile.email === 'marcelo.avila@amis.global'}
                                            onClick={() => handleRoleChange(selectedProfile.id, role)}
                                            className={cn(
                                                "px-4 py-4 rounded-2xl border text-[9px] font-black tracking-widest transition-all shadow-sm",
                                                selectedProfile.role === role
                                                    ? "bg-brand-primary border-brand-primary text-white shadow-lg shadow-brand-primary/20 scale-[1.05]"
                                                    : "bg-brand-surface border-brand-border text-brand-text/40 hover:bg-brand-surface hover:border-brand-text/10 hover:text-brand-text/60",
                                                selectedProfile.email === 'marcelo.avila@amis.global' && "opacity-50 cursor-not-allowed"
                                            )}
                                        >
                                            {ROLE_LABELS[role]}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Matriz de Permisos por Módulo */}
                            <div className="space-y-5">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2.5">
                                        <div className="p-1 px-2 bg-brand-surface rounded text-[10px] font-black text-brand-text/50">02</div>
                                        <h4 className="text-[10px] uppercase font-black text-brand-text/40 tracking-[0.2em]">Directivas de Seguridad Clínica</h4>
                                    </div>
                                    <span className="text-[10px] text-warning font-bold italic px-3 py-1 bg-warning/10 border border-warning/20 rounded-full">
                                        {selectedProfile.role === 'SUPER_ADMIN' ? 'DIRECCIÓN MÉDICA: Facultades Totales' : 'Permisos según Protocolo'}
                                    </span>
                                </div>

                                <div className="bg-brand-surface/50 border border-brand-border rounded-3xl overflow-hidden shadow-sm">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="border-b border-brand-border bg-brand-surface">
                                                <th className="px-8 py-5 text-[10px] font-black text-brand-text/40 uppercase tracking-widest">Protocolo / Módulo</th>
                                                <th className="px-5 py-5 text-center text-[10px] font-black text-brand-text/40 uppercase tracking-widest">Lectura</th>
                                                <th className="px-5 py-5 text-center text-[10px] font-black text-brand-text/40 uppercase tracking-widest">Creación</th>
                                                <th className="px-5 py-5 text-center text-[10px] font-black text-brand-text/40 uppercase tracking-widest">Edición</th>
                                                <th className="px-5 py-5 text-center text-[10px] font-black text-brand-text/40 uppercase tracking-widest">Baja</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-brand-border bg-brand-surface/30">
                                            {MODULES.map(module => (
                                                <tr key={module.id} className="hover:bg-brand-primary/5 transition-colors group">
                                                    <td className="px-8 py-5">
                                                        <span className="text-sm font-extrabold text-brand-text/70 group-hover:text-brand-primary transition-colors uppercase tracking-tight">{module.name}</span>
                                                    </td>
                                                    {['read', 'create', 'update', 'delete'].map(action => {
                                                        const moduleKey = module.id as keyof UserPermissions;
                                                        const isActive = selectedProfile.role === 'SUPER_ADMIN' || (localPerms[moduleKey] as any)?.[action] === true;
                                                        return (
                                                            <td key={action} className="px-5 py-5 text-center">
                                                                <div className="flex justify-center">
                                                                    <button 
                                                                        disabled={selectedProfile.role === 'SUPER_ADMIN'}
                                                                        onClick={() => togglePermission(module.id, action)}
                                                                        className={cn(
                                                                            "transition-all duration-300",
                                                                            selectedProfile.role !== 'SUPER_ADMIN' && "hover:scale-125"
                                                                        )}
                                                                    >
                                                                        <CheckCircle2 className={cn(
                                                                            "w-6 h-6 transition-colors",
                                                                            isActive ? "text-brand-primary drop-shadow-[0_0_8px_rgba(255,107,0,0.4)]" : "text-brand-text/10"
                                                                        )} />
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        );
                                                    })}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <div className="pt-8 border-t border-brand-border flex justify-end">
                                <button 
                                    onClick={handleConsolidate}
                                    className="px-10 py-4 bg-brand-text text-brand-bg rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-brand-primary hover:text-white transition-all shadow-xl active:scale-95"
                                >
                                    Consolidar Configuración de Red
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="h-[600px] flex flex-col items-center justify-center card-premium border-2 border-dashed border-brand-border bg-brand-surface/30">
                            <div className="p-5 bg-brand-surface rounded-3xl shadow-lg mb-6 text-brand-text/10">
                                <Shield className="w-16 h-16" />
                            </div>
                            <p className="text-brand-text/40 text-[10px] font-black uppercase tracking-[0.3em] max-w-xs text-center leading-loose">Selecciona un analista para auditar sus facultades en la red clínica</p>
                        </div>
                    )}
                </div>
            </div>
            ) : activeTab === 'b2b' ? (
                <ClinicOnboarding isAddModalOpen={showB2BModal} onCloseModal={() => setShowB2BModal(false)} />
            ) : activeTab === 'homologation' ? (
                <ProcedureHomologation />
            ) : (
                <CriticalPathologies />
            )}
        </div>
    );
};
