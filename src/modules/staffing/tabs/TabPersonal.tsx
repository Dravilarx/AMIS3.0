import React from 'react';
// useState solo se usaba para el estado del botón del Portal Médico (aparcado, ver abajo).
import { Briefcase, User, UploadCloud, X, CheckCircle2 } from 'lucide-react';
// Loader2 y "Link as LinkIcon" solo se usaban en el botón del Portal Médico (aparcado, ver abajo).
import { cn, formatRUT, formatPhone } from '../../../lib/utils';
// import { supabase } from '../../../lib/supabase'; // solo se usaba en handleGeneratePortalLink (aparcado)
import { useAuth } from '../../../hooks/useAuth';
import { useRoles, useTeams } from '../../../hooks/useCatalogs';
import { EditableCatalogField } from './EditableCatalogField';
import type { TabProps } from './types';
import type { Professional } from '../../../types/core';

interface TabPersonalProps extends TabProps {
    existingProfessionals?: Professional[];
    rutError:       string | null;
    setRutError:    (v: string | null) => void;
    onPhotoUpload:  (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const TabPersonal: React.FC<TabPersonalProps> = ({
    formData, setFormData, initialData,
    existingProfessionals, rutError, setRutError, onPhotoUpload,
}) => {
    const { user }  = useAuth();
    const isAlejandra = user?.email === 'alejandra.versalovic@amis.global';

    const { items: roleItems, add: addRole, remove: removeRole, rename: renameRole } = useRoles();
    const { items: teamItems, add: addTeam, remove: removeTeam, rename: renameTeam } = useTeams();

    // Portal Médico APARCADO (ver nota en App.tsx): su ruta pública /portal-medico
    // fue retirada porque el acceso anónimo directo a la base ya no es válido
    // (tablas cerradas por RLS). Lógica del botón de generación de link queda
    // comentada, no borrada, para cuando se rediseñe el portal.
    // const [generatingLink, setGeneratingLink] = useState(false);
    // const [portalLink,     setPortalLink]     = useState<string | null>(null);

    // const handleGeneratePortalLink = async () => {
    //     if (!initialData?.id) return;
    //     setGeneratingLink(true);
    //     try {
    //         await supabase.from('portal_tokens').delete().eq('professional_id', initialData.id);
    //         const { data, error } = await supabase
    //             .from('portal_tokens')
    //             .insert({ professional_id: initialData.id })
    //             .select('token')
    //             .single();
    //         if (error) throw error;
    //         const url = `${window.location.origin}/portal-medico?token=${data.token}`;
    //         setPortalLink(url);
    //         await navigator.clipboard.writeText(url);
    //     } catch (err: any) {
    //         console.error('Error generando link:', err.message);
    //     } finally {
    //         setGeneratingLink(false);
    //     }
    // };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">

            {/* Foto */}
            <div className="flex flex-col items-center justify-center p-6 bg-brand-surface/50 border border-brand-border rounded-2xl">
                <label className="relative cursor-pointer group">
                    <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-dashed border-brand-border group-hover:border-brand-primary/50 flex items-center justify-center bg-brand-surface/50 transition-all">
                        {formData.photoUrl ? (
                            <img src={formData.photoUrl} alt="Foto" className="w-full h-full object-cover" />
                        ) : (
                            <div className="flex flex-col items-center">
                                <UploadCloud className="w-6 h-6 text-brand-text/20 group-hover:text-brand-primary" />
                                <span className="text-[10px] text-brand-text/40 mt-1 uppercase tracking-widest font-bold">Foto</span>
                            </div>
                        )}
                    </div>
                    <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={onPhotoUpload} />
                    {formData.photoUrl && (
                        <button type="button" className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
                            onClick={e => { e.preventDefault(); setFormData(p => ({ ...p, photoUrl: '' })); }}>
                            <X className="w-3 h-3" />
                        </button>
                    )}
                </label>
            </div>

            {/* Cargo y Rol */}
            <div className="space-y-4 p-4 bg-brand-surface/50 border border-brand-border rounded-2xl">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                        <Briefcase className="w-4 h-4 text-blue-400" />
                        <h3 className="text-sm font-bold uppercase tracking-widest text-brand-text/60">Información del Cargo</h3>
                    </div>
                    <button type="button"
                        onClick={() => setFormData(p => ({ ...p, isActive: !p.isActive }))}
                        className={cn(
                            'flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-wider transition-all duration-300 border-2',
                            formData.isActive
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                                : 'bg-red-500/10 text-red-400 border-red-500/30 hover:bg-red-500/20'
                        )}>
                        <span className={cn('w-2.5 h-2.5 rounded-full', formData.isActive ? 'bg-emerald-500 animate-pulse' : 'bg-red-500')} />
                        {formData.isActive ? 'ACTIVO' : 'INACTIVO'}
                    </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <EditableCatalogField
                        label="Cargo / Rol Principal"
                        value={formData.role}
                        onChange={val => setFormData(p => ({ ...p, role: val as any }))}
                        items={roleItems} onAdd={addRole} onRemove={removeRole} onRename={renameRole}
                    />
                    <div className="space-y-2">
                        <label className="text-[10px] uppercase font-bold text-brand-text/40 tracking-widest">Estatus de Info</label>
                        <select
                            className="bg-brand-surface border border-brand-border rounded-lg w-full px-4 py-2 text-sm text-brand-text focus:border-info/50 outline-none appearance-none"
                            value={formData.infoStatus || 'incomplete'}
                            onChange={e => setFormData(p => ({ ...p, infoStatus: e.target.value as any }))}>
                            <option value="incomplete">Incompleto</option>
                            <option value="pending">Pendiente Validación</option>
                            <option value="complete">Completo</option>
                        </select>
                    </div>
                    {isAlejandra && (
                        <div className="md:col-span-2 flex items-center gap-3 bg-emerald-500/10 p-3 rounded-lg border border-emerald-500/20">
                            <input type="checkbox" id="isVerified"
                                checked={formData.isVerified}
                                onChange={e => setFormData(p => ({ ...p, isVerified: e.target.checked }))}
                                className="w-4 h-4 rounded border-brand-border bg-brand-surface text-emerald-500" />
                            <label htmlFor="isVerified" className="text-xs uppercase font-bold text-emerald-400 tracking-widest flex items-center gap-2 cursor-pointer">
                                <CheckCircle2 className="w-4 h-4" /> Validación Oficial por Alejandra Versalovic
                            </label>
                        </div>
                    )}
                    <div className="space-y-2">
                        <label className="text-[10px] uppercase font-bold text-brand-text/40 tracking-widest">Email Corporativo</label>
                        <input type="email"
                            className="bg-brand-surface border border-brand-border rounded-lg w-full px-4 py-2 text-sm text-brand-text focus:border-info/50 outline-none"
                            value={formData.email}
                            onChange={e => setFormData(p => ({ ...p, email: e.target.value }))} />
                    </div>
                </div>
            </div>

            {/* Datos Personales */}
            <div className="space-y-4 p-4 bg-brand-surface/50 border border-brand-border rounded-2xl">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-emerald-400" />
                        <h3 className="text-sm font-bold uppercase tracking-widest text-brand-text/60">Datos Personales</h3>
                    </div>
                    {/* Botón "Generar link" del Portal Médico APARCADO — ver nota junto
                        a handleGeneratePortalLink más arriba. No borrado, solo desactivado. */}
                    {/* {initialData?.id && (
                        <div className="flex items-center gap-2">
                            {portalLink && (
                                <span className="text-[9px] text-emerald-400 font-black uppercase tracking-wider flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3" /> Copiado
                                </span>
                            )}
                            <button type="button" onClick={handleGeneratePortalLink} disabled={generatingLink}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-info/10 border border-info/20 text-info rounded-lg text-[10px] font-black uppercase hover:bg-info/20 transition-all disabled:opacity-50">
                                {generatingLink ? <Loader2 className="w-3 h-3 animate-spin" /> : <LinkIcon className="w-3 h-3" />}
                                {portalLink ? 'Regenerar link' : 'Enviar link al médico'}
                            </button>
                        </div>
                    )} */}
                </div>
                {/* {portalLink && (
                    <div className="flex items-center gap-2 px-3 py-2 bg-info/5 border border-info/20 rounded-xl mb-3">
                        <span className="text-[10px] text-info/70 font-mono truncate flex-1">{portalLink}</span>
                        <button type="button" onClick={() => navigator.clipboard.writeText(portalLink)}
                            className="text-[9px] font-black uppercase text-info hover:text-info/80 flex-shrink-0">Copiar</button>
                    </div>
                )} */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-[10px] uppercase font-bold text-brand-text/40 tracking-widest">Nombres</label>
                        <input required
                            className="bg-brand-surface border border-brand-border rounded-lg w-full px-4 py-2 text-sm text-brand-text focus:border-info/50 outline-none"
                            value={formData.name}
                            onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] uppercase font-bold text-brand-text/40 tracking-widest">Apellidos</label>
                        <input required
                            className="bg-brand-surface border border-brand-border rounded-lg w-full px-4 py-2 text-sm text-brand-text focus:border-info/50 outline-none"
                            value={formData.lastName}
                            onChange={e => setFormData(p => ({ ...p, lastName: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] uppercase font-bold text-brand-text/40 tracking-widest">RUT / DNI</label>
                        <input
                            className={cn(
                                'bg-brand-surface border rounded-lg w-full px-4 py-2 text-sm text-brand-text focus:border-info/50 outline-none',
                                rutError ? 'border-red-500/50' : 'border-brand-border'
                            )}
                            value={formData.nationalId}
                            onChange={e => {
                                const formatted = formatRUT(e.target.value);
                                setFormData(p => ({ ...p, nationalId: formatted }));
                                const clean = e.target.value.replace(/[^0-9kK]/g, '');
                                if (clean.length >= 8) {
                                    import('../../../hooks/useProfessionals').then(({ validateRUT }) => {
                                        setRutError(validateRUT(formatted) ? null : 'RUT inválido');
                                    });
                                } else {
                                    setRutError(null);
                                }
                            }} />
                        {rutError && <p className="text-xs text-red-400 mt-1">{rutError}</p>}
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] uppercase font-bold text-brand-text/40 tracking-widest">Nacionalidad</label>
                        <input list="nationalities-list"
                            className="bg-brand-surface border border-brand-border rounded-lg w-full px-4 py-2 text-sm text-brand-text focus:border-info/50 outline-none"
                            value={formData.nationality}
                            onChange={e => setFormData(p => ({ ...p, nationality: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] uppercase font-bold text-brand-text/40 tracking-widest">Fecha Nacimiento</label>
                        <input type="date"
                            className="bg-brand-surface border border-brand-border rounded-lg w-full px-4 py-2 text-sm text-brand-text focus:border-info/50 outline-none"
                            value={formData.birthDate}
                            onChange={e => setFormData(p => ({ ...p, birthDate: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] uppercase font-bold text-brand-text/40 tracking-widest">Teléfono</label>
                        <input
                            className="bg-brand-surface border border-brand-border rounded-lg w-full px-4 py-2 text-sm text-brand-text focus:border-info/50 outline-none"
                            value={formData.phone}
                            onChange={e => setFormData(p => ({ ...p, phone: e.target.value }))}
                            onBlur={e => setFormData(p => ({ ...p, phone: formatPhone(e.target.value) }))} />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] uppercase font-bold text-brand-text/40 tracking-widest">Ciudad</label>
                        <input list="cities-list"
                            className="bg-brand-surface border border-brand-border rounded-lg w-full px-4 py-2 text-sm text-brand-text focus:border-info/50 outline-none"
                            value={formData.residence.city}
                            onChange={e => setFormData(p => ({ ...p, residence: { ...p.residence, city: e.target.value } }))} />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] uppercase font-bold text-brand-text/40 tracking-widest">Región</label>
                        <input list="regions-list"
                            className="bg-brand-surface border border-brand-border rounded-lg w-full px-4 py-2 text-sm text-brand-text focus:border-info/50 outline-none"
                            value={formData.residence.region}
                            onChange={e => setFormData(p => ({ ...p, residence: { ...p.residence, region: e.target.value } }))} />
                    </div>
                    <EditableCatalogField
                        label="Equipo / Unidad"
                        value={formData.team || ''}
                        onChange={val => setFormData(p => ({ ...p, team: val }))}
                        items={teamItems} onAdd={addTeam} onRemove={removeTeam} onRename={renameTeam}
                    />
                    <div className="space-y-2">
                        <label className="text-[10px] uppercase font-bold text-brand-text/40 tracking-widest">Asociado con</label>
                        <select
                            className="bg-brand-surface border border-brand-border rounded-lg w-full px-4 py-2 text-sm text-brand-text focus:border-info/50 outline-none"
                            value={formData.associatedWith || ''}
                            onChange={e => setFormData(p => ({ ...p, associatedWith: e.target.value }))}>
                            <option value="">Seleccionar radiólogo asociado (opcional)...</option>
                            {existingProfessionals
                                ?.filter(p => p.role === 'Radiólogo' && p.id !== initialData?.id)
                                .sort((a, b) => (a.lastName || '').localeCompare(b.lastName || ''))
                                .map(p => (
                                    <option key={p.id} value={p.id}>
                                        {p.lastName ? `${p.lastName}, ` : ''}{p.name}
                                    </option>
                                ))}
                        </select>
                    </div>
                </div>
            </div>
        </div>
    );
};
