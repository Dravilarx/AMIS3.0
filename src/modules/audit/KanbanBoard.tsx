import React, { useState } from 'react';
import { Building2, Paperclip, MailIcon } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { AuditCase } from '../../hooks/useAudit';

// ─── Columnas del tablero ───────────────────────────────────────────────────
export const KANBAN_COLUMNS = [
    { id: 'nuevo',        label: 'Nuevo' },
    { id: 'analisis',     label: 'En Análisis' },
    { id: 'accion',       label: 'Acción en Curso' },
    { id: 'verificacion', label: 'Verificación' },
    { id: 'cerrado',      label: 'Cerrado' },
] as const;

// ─── Indicador de gravedad ──────────────────────────────────────────────────
const SEVERITY_CONFIG: Record<string, { label: string; dot: string; text: string }> = {
    baja:    { label: 'Baja',    dot: 'bg-brand-text/30',      text: 'text-brand-text/40' },
    media:   { label: 'Media',   dot: 'bg-brand-primary',      text: 'text-brand-primary' },
    alta:    { label: 'Alta',    dot: 'bg-brand-secondary',    text: 'text-brand-secondary' },
    critica: { label: 'Crítica', dot: 'bg-red-500',            text: 'text-red-400' },
};

interface KanbanBoardProps {
    cases:      AuditCase[];
    onSelect:   (c: AuditCase) => void;
    moveKanban: (auditId: string, newColumn: string) => Promise<{ success: boolean; error?: any }>;
    renderBadge: (level?: number) => React.ReactNode;
}

export const KanbanBoard: React.FC<KanbanBoardProps> = ({ cases, onSelect, moveKanban, renderBadge }) => {
    const [draggingId, setDraggingId] = useState<string | null>(null);
    const [overColumn, setOverColumn] = useState<string | null>(null);

    const handleDrop = async (column: string) => {
        const id = draggingId;
        setDraggingId(null);
        setOverColumn(null);
        if (!id) return;
        const c = cases.find(x => x.id === id);
        if (!c || (c.kanbanColumn || 'nuevo') === column) return;
        await moveKanban(id, column);
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4 items-start">
            {KANBAN_COLUMNS.map(col => {
                const colCases = cases.filter(c => (c.kanbanColumn || 'nuevo') === col.id);
                const isOver   = overColumn === col.id;
                return (
                    <div
                        key={col.id}
                        onDragOver={e => { e.preventDefault(); setOverColumn(col.id); }}
                        onDragLeave={() => setOverColumn(prev => (prev === col.id ? null : prev))}
                        onDrop={() => handleDrop(col.id)}
                        className={cn(
                            'rounded-2xl border bg-brand-surface/40 transition-colors min-h-[120px]',
                            isOver ? 'border-brand-primary bg-brand-primary/5' : 'border-brand-border'
                        )}
                    >
                        {/* Cabecera de columna */}
                        <div className="flex items-center justify-between px-3 py-2.5 border-b border-brand-border">
                            <span className="text-[10px] font-black uppercase tracking-widest text-brand-text/60">{col.label}</span>
                            <span className="text-[10px] font-black text-brand-text/40 bg-brand-bg border border-brand-border rounded-full px-2 py-0.5 min-w-[22px] text-center">
                                {colCases.length}
                            </span>
                        </div>

                        {/* Tarjetas */}
                        <div className="p-2 space-y-2">
                            {colCases.length === 0 ? (
                                <div className="text-center py-6 text-[10px] text-brand-text/20">Sin casos</div>
                            ) : colCases.map(c => {
                                const sev = c.severity ? SEVERITY_CONFIG[c.severity] : null;
                                return (
                                    <div
                                        key={c.id}
                                        draggable
                                        onDragStart={() => setDraggingId(c.id)}
                                        onDragEnd={() => { setDraggingId(null); setOverColumn(null); }}
                                        onClick={() => onSelect(c)}
                                        className={cn(
                                            'p-3 rounded-xl border bg-brand-bg cursor-pointer transition-all space-y-2 group',
                                            'hover:border-brand-primary/50 active:scale-[0.98]',
                                            draggingId === c.id ? 'opacity-40 border-brand-primary' : 'border-brand-border'
                                        )}
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <p className="text-xs font-bold text-brand-text leading-tight group-hover:text-brand-primary transition-colors">
                                                {c.patientName}
                                            </p>
                                            {sev && (
                                                <span className={cn('flex items-center gap-1 text-[8px] font-black uppercase tracking-wider whitespace-nowrap', sev.text)}>
                                                    <span className={cn('w-1.5 h-1.5 rounded-full', sev.dot)} />
                                                    {sev.label}
                                                </span>
                                            )}
                                        </div>

                                        <div>{renderBadge(c.agrawallLevel)}</div>

                                        {(c.providerName || c.institution) && (
                                            <div className="flex items-center gap-1.5 text-[10px] text-brand-text/40">
                                                <Building2 className="w-3 h-3 flex-shrink-0" />
                                                <span className="truncate">{c.providerName || c.institution}</span>
                                            </div>
                                        )}

                                        {(c.documents.length > 0 || c.communications.length > 0) && (
                                            <div className="flex items-center gap-3 pt-1 border-t border-brand-border/50">
                                                {c.documents.length > 0 && (
                                                    <span className="text-[9px] text-brand-text/30 flex items-center gap-0.5">
                                                        <Paperclip className="w-2.5 h-2.5" /> {c.documents.length}
                                                    </span>
                                                )}
                                                {c.communications.length > 0 && (
                                                    <span className="text-[9px] text-brand-text/30 flex items-center gap-0.5">
                                                        <MailIcon className="w-2.5 h-2.5" /> {c.communications.length}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};
