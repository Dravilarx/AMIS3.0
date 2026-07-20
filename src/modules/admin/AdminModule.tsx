import React, { useState } from 'react';
import { Shield, UserPlus, Lock, Trash2, X, PanelLeftClose, PanelLeftOpen, Search, Users, ChevronRight } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAdminProfiles } from '../../hooks/useAdminProfiles';
import { useAuth, type UserRole, type UserPermissions } from '../../hooks/useAuth';
import { getLevelForRole, getLabelForRole, ROLE_LEVEL_ORDER } from '../../lib/accessLevels';
import { ClinicOnboarding } from './ClinicOnboarding';
import { ProcedureHomologation } from './ProcedureHomologation';
import { CriticalPathologies } from './CriticalPathologies';
import { CreateInternalUserModal } from './CreateInternalUserModal';
import { CargosManager } from './CargosManager';
import { BulkOnboardPanel } from './BulkOnboardPanel';
import { MODULES } from './permissionModules';

// Etiquetas de roles de aplicación no jerárquicos. Los 5 roles con nivel se
// muestran vía getLabelForRole (accessLevels). El rol ADMIN ya no existe.
const APP_ROLE_LABELS: Record<string, string> = {
    'VIEWER': 'AUDITOR EXTERNO',
    'ADMIN_SECRETARY': 'SECRETARÍA ADN',
    'PARTNER': 'LABORATORIO/SOCIO',
    'MED_CHIEF': 'JEFE DE SERVICIO'
};

// Etiqueta española para cualquier rol (nivel jerárquico o app_role).
const roleLabel = (role?: string | null): string =>
    getLevelForRole(role) !== 99 ? getLabelForRole(role) : (APP_ROLE_LABELS[role || ''] || role || 'Sin rol');

export const AdminModule: React.FC = () => {
    const { profiles, updateProfile, deleteProfile, createProfile } = useAdminProfiles();
    const { user: _currentUser, isSuperAdmin } = useAuth();
    const puedeAltaMasiva = isSuperAdmin();
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'internal' | 'cargos' | 'b2b' | 'homologation' | 'alertas' | 'bulk'>('internal');

    const [showB2BModal, setShowB2BModal] = useState(false);
    const [showInternalModal, setShowInternalModal] = useState(false);
    const [localPerms, setLocalPerms] = useState<Partial<UserPermissions>>({});

    // ── Estado del organigrama de tres columnas (solo UI) ──
    const [personSearch, setPersonSearch] = useState('');
    const [selectedRole, setSelectedRole] = useState<UserRole | 'ALL'>('ALL');
    const [rolesCollapsed, setRolesCollapsed] = useState(false);

    const selectedProfile = profiles.find(p => p.id === selectedUserId);

    // Conteo de personas por rol (solo roles con al menos una persona)
    const ROLE_ORDER: UserRole[] = ['SUPER_ADMIN', 'MANAGER', 'COORDINATOR', 'STAFF', 'OPERATOR', 'VIEWER', 'MED_CHIEF', 'ADMIN_SECRETARY', 'PARTNER'];
    const roleCounts = ROLE_ORDER
        .map(role => ({ role, count: profiles.filter(p => p.role === role).length }))
        .filter(r => r.count > 0);

    // Personas visibles según rol seleccionado + buscador en vivo (nombre/correo)
    const visiblePeople = profiles.filter(p => {
        const matchRole = selectedRole === 'ALL' || p.role === selectedRole;
        const q = personSearch.trim().toLowerCase();
        const matchSearch = !q || p.full_name.toLowerCase().includes(q) || p.email.toLowerCase().includes(q);
        return matchRole && matchSearch;
    });

    const roleBadgeCls = (role: UserRole) =>
        role === 'SUPER_ADMIN' ? 'bg-warning/10 text-warning border-warning/20' :
        role === 'MANAGER' ? 'bg-info/10 text-info border-info/20' :
        'bg-brand-surface text-brand-text/40 border-brand-border';

    // Etiquetas cortas de los cuatro permisos por módulo
    const PERM_ACTIONS: { key: string; letter: string; label: string }[] = [
        { key: 'read',   letter: 'L', label: 'Lectura'  },
        { key: 'create', letter: 'C', label: 'Creación' },
        { key: 'update', letter: 'E', label: 'Edición'  },
        { key: 'delete', letter: 'B', label: 'Baja'     },
    ];

    React.useEffect(() => {
        if (selectedProfile) {
            setLocalPerms(selectedProfile.permissions || {});
        } else {
            setLocalPerms({});
        }
    }, [selectedUserId, selectedProfile]);

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

    const handleRoleChange = async (newRole: UserRole) => {
        if (!selectedUserId) return;
        const result = await updateProfile(selectedUserId, { role: newRole });
        if (!result.success) alert('❌ Error al cambiar el rol: ' + result.error);
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
                  onClick={() => setActiveTab('cargos')}
                  className={cn("px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all", activeTab === 'cargos' ? 'bg-brand-bg text-brand-text shadow-sm' : 'text-brand-text/40 hover:text-brand-text/80')}
                >
                    Gestor de Cargos
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
                {puedeAltaMasiva && (
                  <button
                    onClick={() => setActiveTab('bulk')}
                    className={cn("px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all", activeTab === 'bulk' ? 'bg-brand-primary/10 text-brand-primary border border-brand-primary/20 shadow-sm' : 'text-brand-text/40 hover:text-brand-text/80')}
                  >
                    Alta Masiva de Cuentas
                  </button>
                )}
            </div>

            {activeTab === 'internal' ? (
                <div className="border border-brand-border rounded-3xl bg-brand-surface/30 overflow-hidden shadow-sm">
                    {/* ── Barra superior ── */}
                    <div className="flex items-center gap-3 px-4 py-3 border-b border-brand-border bg-brand-surface/50">
                        <button
                            onClick={() => setRolesCollapsed(c => !c)}
                            title={rolesCollapsed ? 'Mostrar roles' : 'Colapsar roles'}
                            className="p-2 rounded-xl border border-brand-border text-brand-text/40 hover:text-brand-text hover:bg-brand-bg transition-all shrink-0"
                        >
                            {rolesCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
                        </button>
                        <div className="relative flex-1 max-w-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-text/30" />
                            <input
                                value={personSearch}
                                onChange={e => setPersonSearch(e.target.value)}
                                placeholder="Buscar por nombre o correo..."
                                className="w-full bg-brand-bg border border-brand-border rounded-xl pl-9 pr-3 py-2 text-xs text-brand-text outline-none focus:border-brand-primary/50 focus:ring-1 focus:ring-brand-primary/20 placeholder:text-brand-text/20"
                            />
                        </div>
                        <button
                            onClick={() => setShowInternalModal(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-brand-primary text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:opacity-90 transition-all shadow-sm shrink-0"
                        >
                            <UserPlus className="w-3.5 h-3.5" /> Nuevo
                        </button>
                    </div>

                    {/* ── Tres columnas ── */}
                    <div className="flex h-[calc(100vh-340px)] min-h-[440px]">
                        {/* IZQUIERDA · Roles */}
                        {!rolesCollapsed && (
                            <div className="w-[140px] shrink-0 border-r border-brand-border bg-brand-surface/40 overflow-y-auto custom-scrollbar py-2">
                                <button
                                    onClick={() => setSelectedRole('ALL')}
                                    className={cn(
                                        'w-full flex items-center justify-between gap-1 px-3 py-2.5 text-left transition-colors border-l-2',
                                        selectedRole === 'ALL'
                                            ? 'border-brand-primary bg-brand-primary/5 text-brand-text'
                                            : 'border-transparent text-brand-text/50 hover:text-brand-text hover:bg-brand-surface'
                                    )}
                                >
                                    <span className="text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5"><Users className="w-3 h-3" /> Todos</span>
                                    <span className="text-[10px] font-mono text-brand-text/30">{profiles.length}</span>
                                </button>
                                {roleCounts.map(({ role, count }) => (
                                    <button
                                        key={role}
                                        onClick={() => setSelectedRole(role)}
                                        className={cn(
                                            'w-full flex items-center justify-between gap-1 px-3 py-2.5 text-left transition-colors border-l-2',
                                            selectedRole === role
                                                ? 'border-brand-primary bg-brand-primary/5 text-brand-text'
                                                : 'border-transparent text-brand-text/50 hover:text-brand-text hover:bg-brand-surface'
                                        )}
                                    >
                                        <span className="text-[9px] font-black uppercase tracking-wider leading-tight">{roleLabel(role)}</span>
                                        <span className="text-[10px] font-mono text-brand-text/30 shrink-0">{count}</span>
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* CENTRO · Personas */}
                        <div className="flex-1 min-w-0 border-r border-brand-border overflow-y-auto custom-scrollbar">
                            <div className="px-4 py-2.5 border-b border-brand-border bg-brand-surface/30 sticky top-0 z-10">
                                <p className="text-[10px] font-black text-brand-text/40 uppercase tracking-[0.2em]">
                                    {selectedRole === 'ALL' ? 'Cuerpo Médico y Administrativo' : roleLabel(selectedRole)} · {visiblePeople.length}
                                </p>
                            </div>
                            <div className="p-2 space-y-1">
                                {visiblePeople.length === 0 ? (
                                    <p className="text-center text-[10px] text-brand-text/30 py-10">Sin personas para este filtro.</p>
                                ) : visiblePeople.map(profile => (
                                    <button
                                        key={profile.id}
                                        onClick={() => setSelectedUserId(profile.id)}
                                        className={cn(
                                            'w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl border text-left transition-all group',
                                            selectedUserId === profile.id
                                                ? 'bg-brand-primary/10 border-brand-primary/40'
                                                : 'bg-brand-surface/50 border-transparent hover:bg-brand-surface hover:border-brand-border'
                                        )}
                                    >
                                        <div className={cn(
                                            'w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm shrink-0 border',
                                            selectedUserId === profile.id
                                                ? 'bg-brand-primary text-white border-brand-primary'
                                                : 'bg-brand-surface text-brand-text/40 border-brand-border'
                                        )}>
                                            {profile.full_name[0]}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-black text-brand-text break-words leading-tight">{profile.full_name}</p>
                                            <p className="text-[10px] text-brand-text/40 font-bold break-all leading-tight mt-0.5">{profile.email}</p>
                                        </div>
                                        {profile.email === 'marcelo.avila@amis.global' && <Lock className="w-3 h-3 text-warning shrink-0" />}
                                        {selectedUserId === profile.id && <ChevronRight className="w-3.5 h-3.5 text-brand-primary shrink-0" />}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* DERECHA · Permisos */}
                        <div className="w-[236px] shrink-0 bg-brand-surface/40 overflow-y-auto custom-scrollbar">
                            {selectedProfile ? (
                                <div className="flex flex-col h-full">
                                    {/* Cabecera persona */}
                                    <div className="px-4 py-3 border-b border-brand-border bg-brand-surface/30 sticky top-0 z-10">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="min-w-0">
                                                <p className="text-sm font-black text-brand-text break-words leading-tight">{selectedProfile.full_name}</p>
                                                <p className="text-[9px] text-brand-text/40 font-bold break-all mt-0.5">{selectedProfile.email}</p>
                                                <span className={cn('inline-block mt-1.5 text-[8px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider border', roleBadgeCls(selectedProfile.role))}>
                                                    {roleLabel(selectedProfile.role)}
                                                </span>
                                                {/* Selector de rol jerárquico (5 niveles, etiqueta ES). No aplica a SUPER_ADMIN dueño. */}
                                                <div className="mt-2">
                                                    <label className="block text-[8px] font-black text-brand-text/30 uppercase tracking-widest mb-1">Nivel de acceso</label>
                                                    <select
                                                        value={ROLE_LEVEL_ORDER.includes(selectedProfile.role) ? selectedProfile.role : ''}
                                                        onChange={(e) => e.target.value && handleRoleChange(e.target.value as UserRole)}
                                                        className="w-full bg-brand-bg border border-brand-border rounded-lg px-2 py-1.5 text-[10px] font-bold text-brand-text outline-none focus:border-brand-primary/50"
                                                    >
                                                        {!ROLE_LEVEL_ORDER.includes(selectedProfile.role) && (
                                                            <option value="">{roleLabel(selectedProfile.role)} (sin nivel)</option>
                                                        )}
                                                        {ROLE_LEVEL_ORDER.map(r => (
                                                            <option key={r} value={r}>{getLabelForRole(r)}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>
                                            <div className="flex flex-col gap-1.5 shrink-0">
                                                <button onClick={() => setSelectedUserId(null)} title="Cerrar" className="p-1.5 rounded-lg border border-brand-border text-brand-text/40 hover:text-brand-text hover:bg-brand-bg transition-all">
                                                    <X className="w-3.5 h-3.5" />
                                                </button>
                                                {selectedProfile.email !== 'marcelo.avila@amis.global' && (
                                                    <button onClick={() => handleDelete(selectedProfile.id)} title="Retirar" className="p-1.5 rounded-lg border border-danger/20 text-danger hover:bg-danger/10 transition-all">
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Matriz de permisos por módulo */}
                                    <div className="flex-1 px-2 py-2">
                                        <div className="flex items-center justify-between px-2 mb-1.5">
                                            <p className="text-[9px] font-black text-brand-text/40 uppercase tracking-[0.2em]">Permisos</p>
                                            <span className="text-[8px] font-bold text-warning/80">
                                                {selectedProfile.role === 'SUPER_ADMIN' ? 'Totales' : 'Protocolo'}
                                            </span>
                                        </div>
                                        <div className="space-y-0.5">
                                            {MODULES.map(module => {
                                                const moduleKey = module.id as keyof UserPermissions;
                                                return (
                                                    <div key={module.id} className="px-2 py-1.5 rounded-xl hover:bg-brand-surface/60 transition-colors">
                                                        <p className="text-[10px] font-bold text-brand-text/70 truncate mb-1" title={module.name}>{module.name}</p>
                                                        <div className="flex gap-1">
                                                            {PERM_ACTIONS.map(({ key, letter, label }) => {
                                                                const isActive = selectedProfile.role === 'SUPER_ADMIN' || (localPerms[moduleKey] as any)?.[key] === true;
                                                                return (
                                                                    <button
                                                                        key={key}
                                                                        title={label}
                                                                        disabled={selectedProfile.role === 'SUPER_ADMIN'}
                                                                        onClick={() => togglePermission(module.id, key)}
                                                                        className={cn(
                                                                            'w-7 h-7 rounded-lg text-[9px] font-black border transition-all',
                                                                            isActive
                                                                                ? 'bg-brand-primary/15 text-brand-primary border-brand-primary/30'
                                                                                : 'bg-brand-surface text-brand-text/20 border-brand-border',
                                                                            selectedProfile.role !== 'SUPER_ADMIN' && 'hover:border-brand-primary/40'
                                                                        )}
                                                                    >
                                                                        {letter}
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Consolidar */}
                                    <div className="px-3 py-3 border-t border-brand-border sticky bottom-0 bg-brand-surface/60 backdrop-blur">
                                        <button
                                            onClick={handleConsolidate}
                                            className="w-full px-4 py-3 bg-brand-text text-brand-bg rounded-2xl font-black text-[9px] uppercase tracking-widest hover:bg-brand-primary hover:text-white transition-all active:scale-95"
                                        >
                                            Consolidar
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-center px-4">
                                    <Shield className="w-12 h-12 text-brand-text/10 mb-3" />
                                    <p className="text-brand-text/40 text-[9px] font-black uppercase tracking-[0.2em] leading-relaxed">Selecciona una persona<br />para editar sus permisos</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            ) : activeTab === 'cargos' ? (
                <CargosManager />
            ) : activeTab === 'b2b' ? (
                <ClinicOnboarding isAddModalOpen={showB2BModal} onCloseModal={() => setShowB2BModal(false)} />
            ) : activeTab === 'homologation' ? (
                <ProcedureHomologation />
            ) : activeTab === 'bulk' ? (
                puedeAltaMasiva ? <BulkOnboardPanel /> : <CriticalPathologies />
            ) : (
                <CriticalPathologies />
            )}
        </div>
    );
};
