import React, { useState } from 'react';
import { Shield, UserPlus, Trash2, CheckCircle2, Lock } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAdminProfiles } from '../../hooks/useAdminProfiles';
import { useAuth } from '../../hooks/useAuth';
import type { UserRole } from '../../hooks/useAuth';

const MODULES = [
    { id: 'dashboard', name: 'Centro de Gestión' },
    { id: 'tenders', name: 'Gestión Institucional' },
    { id: 'staffing', name: 'Gestión RR.HH.' },
    { id: 'shifts', name: 'Turnos Médicos' },
    { id: 'logistics', name: 'Logística Clínica' },
    { id: 'clinical', name: 'Atención Médica' },
    { id: 'audit', name: 'Auditoría Clínica' },
    { id: 'projects', name: 'Planes de Salud' },
    { id: 'messaging', name: 'Comunicación' },
    { id: 'dms', name: 'Archivo Digital' },
    { id: 'ideation', name: 'Innovación Médica' },
] as const;

const ROLE_LABELS: Record<UserRole, string> = {
    'SUPER_ADMIN': 'DIRECCIÓN MÉDICA',
    'ADMIN': 'ADMINISTRADOR',
    'MANAGER': 'GERENTE DE RED',
    'OPERATOR': 'GESTOR CLÍNICO',
    'VIEWER': 'AUDITOR EXTERNO'
};

export const AdminModule: React.FC = () => {
    const { profiles, updateProfile, deleteProfile } = useAdminProfiles();
    const { user: _currentUser } = useAuth();
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

    const selectedProfile = profiles.find(p => p.id === selectedUserId);

    const handleRoleChange = (userId: string, newRole: UserRole) => {
        updateProfile(userId, { role: newRole });
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
                    <h1 className="text-4xl font-black text-prevenort-text tracking-tight uppercase mb-1">Centro de Control Red</h1>
                    <p className="text-[10px] text-prevenort-text/40 font-bold uppercase tracking-[0.3em]">Gestión de Accesos, Perfiles y Seguridad · AMIS Intelligence</p>
                </div>
                <div className="flex gap-3">
                    <button className="flex items-center gap-2.5 px-6 py-3 bg-prevenort-primary text-white hover:opacity-90 rounded-2xl transition-all font-black text-[10px] uppercase tracking-widest shadow-lg shadow-prevenort-primary/25">
                        <UserPlus className="w-4 h-4" />
                        Registrar Usuario
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Lista de Usuarios */}
                <div className="lg:col-span-1 space-y-4">
                    <div className="flex items-center gap-2.5 mb-6 px-2">
                        <div className="p-1.5 bg-prevenort-primary/10 rounded-lg">
                            <Shield className="w-4 h-4 text-prevenort-primary" />
                        </div>
                        <h3 className="text-[10px] font-black text-prevenort-text/40 uppercase tracking-[0.2em]">Cuerpo Médico y Administrativo</h3>
                    </div>
                    <div className="space-y-3">
                        {profiles.map(profile => (
                            <div
                                key={profile.id}
                                onClick={() => setSelectedUserId(profile.id)}
                                className={cn(
                                    "group p-5 rounded-3xl border transition-all cursor-pointer relative overflow-hidden",
                                    selectedUserId === profile.id
                                        ? "bg-prevenort-surface border-prevenort-primary shadow-xl shadow-prevenort-primary/10 scale-[1.02] z-10"
                                        : "bg-prevenort-surface/50 border-prevenort-border hover:bg-prevenort-surface hover:border-prevenort-text/10 hover:shadow-lg"
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
                                            ? "bg-prevenort-primary text-white border-prevenort-primary"
                                            : "bg-prevenort-surface text-prevenort-text/40 border-prevenort-border"
                                    )}>
                                        {profile.full_name[0]}
                                    </div>
                                    <div className="flex-1 overflow-hidden">
                                        <p className="text-sm font-black text-prevenort-text truncate">{profile.full_name}</p>
                                        <p className="text-[10px] text-prevenort-text/40 font-bold truncate mt-0.5">{profile.email}</p>
                                    </div>
                                    <div className="text-right">
                                        <span className={cn(
                                            "text-[8px] font-black px-2.5 py-1 rounded-lg uppercase tracking-wider border shadow-sm",
                                            profile.role === 'SUPER_ADMIN' ? "bg-warning/10 text-warning border-warning/20" :
                                                profile.role === 'ADMIN' ? "bg-info/10 text-info border-info/20" : "bg-prevenort-surface text-prevenort-text/40 border-prevenort-border"
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
                                    <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-prevenort-primary to-blue-800 flex items-center justify-center text-3xl font-black text-white border-4 border-prevenort-surface shadow-2xl">
                                        {selectedProfile.full_name[0]}
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-black text-prevenort-text tracking-tight">{selectedProfile.full_name}</h2>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="px-2 py-0.5 bg-info/10 text-info text-[10px] font-black rounded-lg border border-info/20 uppercase">{selectedProfile.email}</span>
                                            <span className="text-prevenort-text/20">●</span>
                                            <span className="text-[10px] font-bold text-prevenort-text/40 uppercase tracking-widest">{ROLE_LABELS[selectedProfile.role]}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-3">
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
                                    <div className="p-1 px-2 bg-prevenort-surface rounded text-[10px] font-black text-prevenort-text/50">01</div>
                                    <h4 className="text-[10px] uppercase font-black text-prevenort-text/40 tracking-[0.2em]">Nivel de Acceso Institucional</h4>
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
                                                    ? "bg-prevenort-primary border-prevenort-primary text-white shadow-lg shadow-prevenort-primary/20 scale-[1.05]"
                                                    : "bg-prevenort-surface border-prevenort-border text-prevenort-text/40 hover:bg-prevenort-surface hover:border-prevenort-text/10 hover:text-prevenort-text/60",
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
                                        <div className="p-1 px-2 bg-prevenort-surface rounded text-[10px] font-black text-prevenort-text/50">02</div>
                                        <h4 className="text-[10px] uppercase font-black text-prevenort-text/40 tracking-[0.2em]">Directivas de Seguridad Clínica</h4>
                                    </div>
                                    <span className="text-[10px] text-warning font-bold italic px-3 py-1 bg-warning/10 border border-warning/20 rounded-full">
                                        {selectedProfile.role === 'SUPER_ADMIN' ? 'DIRECCIÓN MÉDICA: Facultades Totales' : 'Permisos según Protocolo'}
                                    </span>
                                </div>

                                <div className="bg-prevenort-surface/50 border border-prevenort-border rounded-3xl overflow-hidden shadow-sm">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="border-b border-prevenort-border bg-prevenort-surface">
                                                <th className="px-8 py-5 text-[10px] font-black text-prevenort-text/40 uppercase tracking-widest">Protocolo / Módulo</th>
                                                <th className="px-5 py-5 text-center text-[10px] font-black text-prevenort-text/40 uppercase tracking-widest">Lectura</th>
                                                <th className="px-5 py-5 text-center text-[10px] font-black text-prevenort-text/40 uppercase tracking-widest">Creación</th>
                                                <th className="px-5 py-5 text-center text-[10px] font-black text-prevenort-text/40 uppercase tracking-widest">Edición</th>
                                                <th className="px-5 py-5 text-center text-[10px] font-black text-prevenort-text/40 uppercase tracking-widest">Baja</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-prevenort-border bg-prevenort-surface/30">
                                            {MODULES.map(module => (
                                                <tr key={module.id} className="hover:bg-prevenort-primary/5 transition-colors group">
                                                    <td className="px-8 py-5">
                                                        <span className="text-sm font-extrabold text-prevenort-text/70 group-hover:text-prevenort-primary transition-colors uppercase tracking-tight">{module.name}</span>
                                                    </td>
                                                    {['read', 'create', 'update', 'delete'].map(action => (
                                                        <td key={action} className="px-5 py-5 text-center">
                                                            <div className="flex justify-center">
                                                                {selectedProfile.role === 'SUPER_ADMIN' ? (
                                                                    <CheckCircle2 className="w-6 h-6 text-success/50" />
                                                                ) : (
                                                                    <button className="hover:scale-125 transition-transform">
                                                                        <CheckCircle2 className="w-6 h-6 text-prevenort-text/10 hover:text-success" />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <div className="pt-8 border-t border-prevenort-border flex justify-end">
                                <button className="px-10 py-4 bg-prevenort-text text-prevenort-bg rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-prevenort-primary hover:text-white transition-all shadow-xl">
                                    Consolidar Configuración de Red
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="h-[600px] flex flex-col items-center justify-center card-premium border-2 border-dashed border-prevenort-border bg-prevenort-surface/30">
                            <div className="p-5 bg-prevenort-surface rounded-3xl shadow-lg mb-6 text-prevenort-text/10">
                                <Shield className="w-16 h-16" />
                            </div>
                            <p className="text-prevenort-text/40 text-[10px] font-black uppercase tracking-[0.3em] max-w-xs text-center leading-loose">Selecciona un analista para auditar sus facultades en la red clínica</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

