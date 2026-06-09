import React from 'react';
import { CheckCircle2, AlertCircle, FolderSearch, UploadCloud, Sparkles, Trash } from 'lucide-react';
import { cn } from '../../../lib/utils';
import type { TabProps } from './types';
import type { Document } from '../../../types/communication';

interface Battery {
    id: string;
    name: string;
    requirements: {
        id: string;
        label: string;
        category: string;
        isRequired: boolean;
    }[];
}

interface TabExpedienteProps extends TabProps {
    batteries:             Battery[];
    selectedBatteryId:     string;
    setSelectedBatteryId:  (id: string) => void;
    professionalDocuments: Document[];
    batteryProgress:       number;
    onRequirementUpload:   (req: any) => void;
}

export const TabExpediente: React.FC<TabExpedienteProps> = ({
    batteries, selectedBatteryId, setSelectedBatteryId,
    professionalDocuments, batteryProgress, onRequirementUpload,
}) => {
    const selectedBattery = batteries.find(b => b.id === selectedBatteryId);

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">

            {/* Selector de Batería */}
            <div className="p-4 bg-brand-surface/50 border border-brand-border rounded-2xl">
                <label className="text-[10px] uppercase font-bold text-brand-text/40 tracking-widest block mb-4">
                    Asignar Batería Documental
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                    <select
                        className="bg-brand-surface border border-brand-border rounded-lg w-full px-4 py-2 text-sm text-brand-text outline-none"
                        value={selectedBatteryId}
                        onChange={e => setSelectedBatteryId(e.target.value)}>
                        <option value="">Seleccionar batería...</option>
                        {batteries.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                    {selectedBattery && (
                        <div className="space-y-2">
                            <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest">
                                <span className="text-brand-text/40">Cumplimiento</span>
                                <span className="text-info">{batteryProgress}%</span>
                            </div>
                            <div className="w-full h-1.5 bg-brand-surface rounded-full overflow-hidden">
                                <div className="h-full bg-info transition-all duration-500" style={{ width: `${batteryProgress}%` }} />
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Lista de Requerimientos */}
            {selectedBattery ? (
                <div className="space-y-2">
                    {selectedBattery.requirements.map(req => {
                        const doc = professionalDocuments.find(d => d.requirementId === req.id);
                        return (
                            <div key={req.id} className="flex items-center justify-between p-3 bg-brand-surface/50 border border-brand-border rounded-xl group hover:border-brand-primary/20 transition-all">
                                <div className="flex items-center gap-3">
                                    {doc
                                        ? <CheckCircle2 className="w-5 h-5 text-success" />
                                        : <AlertCircle className={cn('w-5 h-5', req.isRequired ? 'text-warning' : 'text-brand-text/10')} />
                                    }
                                    <div className="flex flex-col">
                                        <p className="text-sm font-bold text-brand-text/90">{req.label}</p>
                                        <p className="text-[10px] text-brand-text/30 uppercase tracking-tighter">
                                            {req.category} • {req.isRequired ? 'Obligatorio' : 'Opcional'}
                                        </p>
                                        {doc?.isValidated && (
                                            <div className="flex items-center gap-1 mt-1">
                                                <Sparkles className="w-2.5 h-2.5 text-info" />
                                                <span className="text-[8px] font-bold text-info uppercase tracking-widest">Validado Agrawall AI</span>
                                            </div>
                                        )}
                                        {doc?.expiryDate && (
                                            <p className="text-[9px] text-warning font-bold mt-1">
                                                Vence: {new Date(doc.expiryDate).toLocaleDateString()}
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {doc ? (
                                        <div className="flex items-center gap-1">
                                            <button type="button" onClick={() => window.open(doc.url, '_blank')}
                                                className="px-3 py-1.5 bg-brand-surface rounded-lg text-[10px] font-bold uppercase hover:bg-brand-primary/10 transition-all text-brand-text">
                                                Ver
                                            </button>
                                            <button type="button" title={doc.isLocked ? 'Bloqueado por Auditoría' : 'Eliminar'}
                                                disabled={doc.isLocked}
                                                className={cn('p-1.5 rounded-lg transition-colors',
                                                    doc.isLocked ? 'text-brand-text/10 cursor-not-allowed' : 'text-brand-text/20 hover:bg-danger/10 hover:text-danger')}>
                                                <Trash className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    ) : (
                                        <button type="button" onClick={() => onRequirementUpload(req)}
                                            className="flex items-center gap-2 px-3 py-1.5 bg-info/10 border border-info/20 rounded-lg text-[10px] font-bold uppercase text-info hover:bg-info/20 transition-all">
                                            <UploadCloud className="w-3.5 h-3.5" /> Cargar
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="text-center py-12 border border-dashed border-brand-border rounded-2xl">
                    <FolderSearch className="w-8 h-8 text-brand-text/10 mx-auto mb-4" />
                    <p className="text-sm text-brand-text/40">
                        Selecciona una batería para visualizar los requerimientos de este perfil profesional.
                    </p>
                </div>
            )}
        </div>
    );
};
