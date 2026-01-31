import React, { useState } from 'react';
import { Shield, ShieldAlert, UserPlus, Trash2, CheckCircle2, Lock } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAdminProfiles } from '../../hooks/useAdminProfiles';
import { useAuth } from '../../hooks/useAuth';
import type { UserRole } from '../../hooks/useAuth';

const MODULES = [
    { id: 'dashboard', name: 'Panel Principal' },
    { id: 'tenders', name: 'Licitaciones' },
    { id: 'staffing', name: 'RR.HH. 360' },
    { id: 'shifts', name: 'Turnos y Guardias' },
    { id: 'logistics', name: 'Logística' },
    { id: 'clinical', name: 'Operación Clínica' },
    { id: 'audit', name: 'Auditoría IA' },
    { id: 'projects', name: 'BPM & Proyectos' },
    { id: 'messaging', name: 'Mensajería' },
    { id: 'dms', name: 'Documentos' },
    { id: 'ideation', name: 'Lluvia de Ideas' },
] as const;

const ROLE_LABELS: Record<UserRole, string> = {
    'SUPER_ADMIN': 'ADMIN MAESTRO',
    'ADMIN': 'ADMINISTRADOR',
    'MANAGER': 'GERENTE',
    'OPERATOR': 'OPERADOR',
    'VIEWER': 'OBSERVADOR'
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
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-4xl font-black text-white/90 tracking-tighter uppercase mb-1">Panel de Control maestro</h1>
                    <p className="text-xs text-white/40 font-mono uppercase tracking-[0.3em]">Gestión de Accesos, Perfiles y Seguridad de AMIS 3.0</p>
                </div>
                <div className="flex gap-2">
                    <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-xl transition-all font-bold text-xs uppercase tracking-widest border border-blue-400/20 shadow-lg shadow-blue-600/20">
                        <UserPlus className="w-4 h-4" />
                        Añadir Usuario
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Lista de Usuarios */}
                <div className="lg:col-span-1 space-y-4">
                    <div className="flex items-center gap-2 mb-4 px-2">
                        <Shield className="w-4 h-4 text-blue-400" />
                        <h3 className="text-xs font-black text-white/40 uppercase tracking-[0.2em]">Administradores y Staff</h3>
                    </div>
                    {profiles.map(profile => (
                        <div
                            key={profile.id}
                            onClick={() => setSelectedUserId(profile.id)}
                            className={cn(
                                "group p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden",
                                selectedUserId === profile.id
                                    ? "bg-blue-600/10 border-blue-500/50"
                                    : "bg-white/[0.02] border-white/5 hover:border-white/10"
                            )}
                        >
                            {profile.email === 'marcelo.avila@amis.global' && (
                                <div className="absolute top-0 right-0 p-2 opacity-20 group-hover:opacity-100 transition-opacity">
                                    <Lock className="w-3 h-3 text-amber-500" />
                                </div>
                            )}
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-white/10 to-white/5 border border-white/5 flex items-center justify-center font-bold text-white/60">
                                    {profile.full_name[0]}
                                </div>
                                <div className="flex-1 overflow-hidden">
                                    <p className="text-sm font-bold text-white/90 truncate">{profile.full_name}</p>
                                    <p className="text-[10px] text-white/30 font-mono truncate">{profile.email}</p>
                                </div>
                                <div className="text-right">
                                    <span className={cn(
                                        "text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-tighter",
                                        profile.role === 'SUPER_ADMIN' ? "bg-amber-500/10 text-amber-500" :
                                            profile.role === 'ADMIN' ? "bg-blue-500/10 text-blue-500" : "bg-white/10 text-white/40"
                                    )}>
                                        {ROLE_LABELS[profile.role]}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Detalle de Permisos */}
                <div className="lg:col-span-2">
                    {selectedProfile ? (
                        <div className="card-premium space-y-8 animate-in slide-in-from-right-4 duration-500">
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-3xl font-black border border-white/20">
                                        {selectedProfile.full_name[0]}
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-black text-white tracking-tighter">{selectedProfile.full_name}</h2>
                                        <p className="text-blue-400 font-mono text-xs uppercase">{selectedProfile.email}</p>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    {selectedProfile.email !== 'marcelo.avila@amis.global' && (
                                        <button
                                            onClick={() => handleDelete(selectedProfile.id)}
                                            className="p-2 bg-red-500/10 border border-red-500/20 rounded-xl hover:bg-red-500/20 text-red-500 transition-all"
                                            title="Eliminar Administrador"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Selector de Rol */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-2">
                                    <ShieldAlert className="w-4 h-4 text-white/40" />
                                    <h4 className="text-[10px] uppercase font-black text-white/40 tracking-[0.2em]">Asignación de Perfil</h4>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    {(['ADMIN', 'MANAGER', 'OPERATOR', 'VIEWER'] as UserRole[]).map(role => (
                                        <button
                                            key={role}
                                            disabled={selectedProfile.email === 'marcelo.avila@amis.global'}
                                            onClick={() => handleRoleChange(selectedProfile.id, role)}
                                            className={cn(
                                                "px-4 py-3 rounded-xl border text-[10px] font-black tracking-widest transition-all",
                                                selectedProfile.role === role
                                                    ? "bg-blue-600 border-blue-400 text-white shadow-lg shadow-blue-500/20"
                                                    : "bg-white/[0.02] border-white/5 text-white/40 hover:border-white/10 hover:text-white/60",
                                                selectedProfile.email === 'marcelo.avila@amis.global' && "opacity-50 cursor-not-allowed"
                                            )}
                                        >
                                            {ROLE_LABELS[role]}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Matriz de Permisos por Módulo */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Shield className="w-4 h-4 text-white/40" />
                                        <h4 className="text-[10px] uppercase font-black text-white/40 tracking-[0.2em]">Permisos Granulares por Módulo</h4>
                                    </div>
                                    <span className="text-[10px] text-amber-500/60 font-mono italic">
                                        {selectedProfile.role === 'SUPER_ADMIN' ? 'SUPER-USER: Todos los permisos heredados' : 'Modifica permisos específicos'}
                                    </span>
                                </div>

                                <div className="bg-white/[0.01] border border-white/5 rounded-2xl overflow-hidden">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="border-b border-white/5 bg-white/[0.02]">
                                                <th className="px-6 py-4 text-[10px] font-black text-white/30 uppercase tracking-widest">Módulo</th>
                                                <th className="px-4 py-4 text-center text-[10px] font-black text-white/30 uppercase tracking-widest">Lectura</th>
                                                <th className="px-4 py-4 text-center text-[10px] font-black text-white/30 uppercase tracking-widest">Creación</th>
                                                <th className="px-4 py-4 text-center text-[10px] font-black text-white/30 uppercase tracking-widest">Edición</th>
                                                <th className="px-4 py-4 text-center text-[10px] font-black text-white/30 uppercase tracking-widest">Borrado</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/[0.02]">
                                            {MODULES.map(module => (
                                                <tr key={module.id} className="hover:bg-white/[0.01] transition-colors group">
                                                    <td className="px-6 py-4">
                                                        <span className="text-sm font-bold text-white/80 group-hover:text-blue-400 transition-colors uppercase tracking-tight">{module.name}</span>
                                                    </td>
                                                    {['read', 'create', 'update', 'delete'].map(action => (
                                                        <td key={action} className="px-4 py-4 text-center">
                                                            <div className="flex justify-center">
                                                                {selectedProfile.role === 'SUPER_ADMIN' ? (
                                                                    <CheckCircle2 className="w-5 h-5 text-emerald-500/40" />
                                                                ) : (
                                                                    <button className="hover:scale-110 transition-transform">
                                                                        <CheckCircle2 className="w-5 h-5 text-white/10 hover:text-emerald-500" />
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

                            <div className="pt-6 border-t border-white/5 flex justify-end">
                                <button className="px-8 py-3 bg-white text-black rounded-xl font-black text-xs uppercase tracking-widest hover:bg-blue-500 hover:text-white transition-all">
                                    Guardar Cambios de Seguridad
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center card-premium border-dashed border-white/5 opacity-50">
                            <Shield className="w-12 h-12 text-white/10 mb-4" />
                            <p className="text-white/30 text-xs italic font-mono uppercase tracking-[0.2em]">Selecciona un usuario para auditar permisos</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
