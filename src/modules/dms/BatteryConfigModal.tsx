import React, { useState } from 'react';
import { X, Plus, Trash2, Settings2, Save, ListFilter, Layout } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useBatteries } from './useBatteries';
import type { DocumentBattery, DocumentRequirement, Document } from '../../types/communication';

interface BatteryConfigModalProps {
    onClose: () => void;
}

const CATEGORIES: Document['category'][] = ['clinical', 'legal', 'logistics', 'commercial', 'hr', 'academic', 'other'];

export const BatteryConfigModal: React.FC<BatteryConfigModalProps> = ({ onClose }) => {
    const { batteries, addBattery, updateBattery, deleteBattery } = useBatteries();
    const [selectedBattery, setSelectedBattery] = useState<DocumentBattery | null>(null);
    const [isEditing, setIsEditing] = useState(false);

    // Estado local para edición
    const [editData, setEditData] = useState<Omit<DocumentBattery, 'id'>>({
        name: '',
        description: '',
        requirements: []
    });

    const handleSelectBattery = (battery: DocumentBattery) => {
        setSelectedBattery(battery);
        setEditData({
            name: battery.name,
            description: battery.description,
            requirements: [...battery.requirements]
        });
        setIsEditing(true);
    };

    const handleNewBattery = () => {
        setSelectedBattery(null);
        setEditData({
            name: 'Nueva Batería',
            description: '',
            requirements: [
                { id: `req-${Date.now()}`, label: 'Nuevo Requisito', isRequired: true, category: 'other' }
            ]
        });
        setIsEditing(true);
    };

    const handleAddRequirement = () => {
        setEditData({
            ...editData,
            requirements: [
                ...editData.requirements,
                { id: `req-${Date.now()}`, label: '', isRequired: true, category: 'hr' }
            ]
        });
    };

    const handleRemoveRequirement = (id: string) => {
        setEditData({
            ...editData,
            requirements: editData.requirements.filter(r => r.id !== id)
        });
    };

    const handleUpdateRequirement = (id: string, updates: Partial<DocumentRequirement>) => {
        setEditData({
            ...editData,
            requirements: editData.requirements.map(r => r.id === id ? { ...r, ...updates } : r)
        });
    };

    const handleSave = () => {
        if (!editData.name.trim()) return;

        if (selectedBattery) {
            updateBattery(selectedBattery.id, editData);
        } else {
            addBattery(editData);
        }
        setIsEditing(false);
        setSelectedBattery(null);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <div className="card-premium w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col relative animate-in fade-in zoom-in duration-300">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-full transition-colors z-10"
                >
                    <X className="w-5 h-5 text-white/40" />
                </button>

                <div className="p-8 border-b border-white/5">
                    <div className="flex items-center gap-3 mb-2">
                        <Settings2 className="w-6 h-6 text-blue-400" />
                        <h2 className="text-2xl font-black tracking-tighter uppercase whitespace-nowrap">Configuración de Baterías</h2>
                    </div>
                    <p className="text-xs text-white/40 font-mono uppercase tracking-widest">Define estructuras documentales para procesos de negocio</p>
                </div>

                <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
                    {/* Panel Izquierdo: Lista de Baterías */}
                    {!isEditing && (
                        <div className="w-full p-6 space-y-4">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-sm font-bold text-white/60 flex items-center gap-2">
                                    <ListFilter className="w-4 h-4" /> Baterías Activas
                                </h3>
                                <button
                                    onClick={handleNewBattery}
                                    className="px-4 py-1.5 bg-blue-500 hover:bg-blue-600 rounded-lg text-xs font-bold uppercase transition-all"
                                >
                                    + Crear Nueva
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 overflow-y-auto max-h-[50vh]">
                                {batteries.map(battery => (
                                    <button
                                        key={battery.id}
                                        onClick={() => handleSelectBattery(battery)}
                                        className="text-left p-5 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 hover:border-blue-500/30 transition-all group"
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <Layout className="w-5 h-5 text-white/20 group-hover:text-blue-400 transition-colors" />
                                            <span className="text-[10px] font-mono text-white/20">{battery.requirements.length} REQS</span>
                                        </div>
                                        <h4 className="font-bold text-sm mb-1">{battery.name}</h4>
                                        <p className="text-[10px] text-white/40 line-clamp-2">{battery.description}</p>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Panel de Edición */}
                    {isEditing && (
                        <div className="flex-1 flex flex-col bg-white/[0.02] animate-in slide-in-from-right-4 duration-300">
                            <div className="p-6 border-b border-white/5 space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] uppercase font-bold text-white/40 tracking-widest">Nombre de la Batería</label>
                                        <input
                                            type="text"
                                            value={editData.name}
                                            onChange={e => setEditData({ ...editData, name: e.target.value })}
                                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:border-blue-500/50 outline-none"
                                            placeholder="Ej: Ingreso Staff Médico"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] uppercase font-bold text-white/40 tracking-widest">Descripción</label>
                                        <input
                                            type="text"
                                            value={editData.description}
                                            onChange={e => setEditData({ ...editData, description: e.target.value })}
                                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:border-blue-500/50 outline-none"
                                            placeholder="Propósito de este set documental"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6 space-y-3">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-[10px] uppercase font-bold text-white/40 tracking-widest">Requerimientos Específicos</h3>
                                    <button
                                        onClick={handleAddRequirement}
                                        className="text-[10px] font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1 uppercase"
                                    >
                                        <Plus className="w-3 h-3" /> Añadir Item
                                    </button>
                                </div>

                                {editData.requirements.map((req) => (
                                    <div key={req.id} className="flex flex-col md:flex-row items-center gap-4 p-4 bg-white/5 border border-white/5 rounded-2xl group hover:border-white/20 transition-all">
                                        <div className="flex-1 w-full space-y-1">
                                            <input
                                                type="text"
                                                value={req.label}
                                                onChange={e => handleUpdateRequirement(req.id, { label: e.target.value })}
                                                className="w-full bg-transparent border-none text-sm font-bold focus:ring-0 p-0 placeholder:text-white/10"
                                                placeholder="Nombre del documento (ej: Título Profesional)"
                                            />
                                            <div className="flex items-center gap-4">
                                                <select
                                                    value={req.category}
                                                    onChange={e => handleUpdateRequirement(req.id, { category: e.target.value as any })}
                                                    className="bg-transparent border-none p-0 text-[10px] text-white/40 hover:text-white/60 outline-none cursor-pointer uppercase"
                                                >
                                                    {CATEGORIES.map(cat => <option key={cat} value={cat} className="bg-[#0a0a0a]">{cat}</option>)}
                                                </select>

                                                <button
                                                    onClick={() => handleUpdateRequirement(req.id, { isRequired: !req.isRequired })}
                                                    className={cn(
                                                        "text-[10px] uppercase font-bold transition-all",
                                                        req.isRequired ? "text-amber-500" : "text-white/20 hover:text-white/40"
                                                    )}
                                                >
                                                    {req.isRequired ? 'Obligatorio' : 'Opcional'}
                                                </button>
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => handleRemoveRequirement(req.id)}
                                            className="p-2 text-red-500/40 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}

                                {editData.requirements.length === 0 && (
                                    <div className="text-center py-10 border border-dashed border-white/10 rounded-2xl">
                                        <p className="text-xs text-white/20 uppercase tracking-widest font-mono">No hay requisitos configurados</p>
                                    </div>
                                )}
                            </div>

                            <div className="p-6 border-t border-white/5 flex gap-3">
                                <button
                                    onClick={() => {
                                        setIsEditing(false);
                                        setSelectedBattery(null);
                                    }}
                                    className="flex-1 py-3 border border-white/10 rounded-xl text-xs font-bold uppercase transition-all hover:bg-white/5"
                                >
                                    Descartar
                                </button>
                                <button
                                    onClick={handleSave}
                                    className="flex-[2] py-3 bg-white text-black rounded-xl text-xs font-black uppercase tracking-widest hover:bg-white/90 transition-all flex items-center justify-center gap-2"
                                >
                                    <Save className="w-4 h-4 font-bold" /> Guardar Batería
                                </button>
                                {selectedBattery && (
                                    <button
                                        onClick={() => {
                                            deleteBattery(selectedBattery.id);
                                            setIsEditing(false);
                                            setSelectedBattery(null);
                                        }}
                                        className="p-3 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500/20 transition-all"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
