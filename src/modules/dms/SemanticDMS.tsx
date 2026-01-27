import React, { useState } from 'react';
import {
    FileText,
    Search,
    Sparkles,
    FileDown,
    ShieldCheck,
    Loader2,
    Lock
} from 'lucide-react';
import { cn } from '../../lib/utils';
import type { Document } from '../../types/communication';
import { searchDocumentsSemantically } from './semanticSearch';

const MOCK_DOCS: Document[] = [
    {
        id: 'd1', title: 'Manual de Procedimientos Quirúrgicos', type: 'pdf',
        category: 'clinical', contentSummary: 'Protocolos detallados para cirugías menores y mayores en red Providencia.',
        url: '#', createdAt: '2024-01-10', signed: true
    },
    {
        id: 'd2', title: 'Contrato Marco Holding Portezuelo 2024', type: 'pdf',
        category: 'legal', contentSummary: 'Acuerdo legal principal con entidades mutuales y prestadores de salud.',
        url: '#', createdAt: '2023-12-15', signed: true
    },
    {
        id: 'd3', title: 'Guía de Logística y Traslados', type: 'doc',
        category: 'logistics', contentSummary: 'Instrucciones para la coordinación de traslados de especialistas entre ciudades.',
        url: '#', createdAt: '2024-01-05'
    },
    {
        id: 'd4', title: 'Protocolo de Seguridad del Paciente', type: 'pdf',
        category: 'clinical', contentSummary: 'Normativas de seguridad, identificación y prevención de caídas.',
        url: '#', createdAt: '2024-01-20', signed: true
    },
];

export const SemanticDMS: React.FC = () => {
    const [query, setQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [relevantIds, setRelevantIds] = useState<string[] | null>(null);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!query.trim()) {
            setRelevantIds(null);
            return;
        }

        setIsSearching(true);
        try {
            const ids = await searchDocumentsSemantically(query, MOCK_DOCS);
            setRelevantIds(ids);
        } catch (err) {
            console.error(err);
        } finally {
            setIsSearching(false);
        }
    };

    const filteredDocs = relevantIds
        ? MOCK_DOCS.filter(d => relevantIds.includes(d.id))
        : MOCK_DOCS;

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-1000">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-black text-white/90 tracking-tighter uppercase">DMS Inteligente</h2>
                    <p className="text-xs text-white/40 font-mono">Semantic Search & Digital Assets Management</p>
                </div>

                <form onSubmit={handleSearch} className="relative group w-full md:w-96">
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Busca por concepto (ej: 'seguridad del paciente' o 'acuerdos legales')..."
                        className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-sm focus:outline-none focus:border-blue-500/50 transition-all shadow-2xl"
                    />
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-focus-within:text-blue-400" />
                    <button
                        type="submit"
                        disabled={isSearching}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 bg-blue-600/20 hover:bg-blue-600/40 rounded-lg transition-all"
                    >
                        {isSearching ? <Loader2 className="w-4 h-4 animate-spin text-blue-400" /> : <Sparkles className="w-4 h-4 text-blue-400" />}
                    </button>
                </form>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {filteredDocs.map(doc => (
                    <div key={doc.id} className="group bg-white/5 border border-white/10 rounded-2xl p-5 hover:bg-white/[0.07] hover:border-blue-500/30 transition-all flex flex-col gap-4 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                            <FileDown className="w-4 h-4 text-blue-400 cursor-pointer" />
                        </div>

                        <div className={cn(
                            "w-12 h-12 rounded-xl flex items-center justify-center border",
                            doc.category === 'clinical' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" :
                                doc.category === 'legal' ? "bg-blue-500/10 border-blue-500/20 text-blue-400" :
                                    "bg-orange-500/10 border-orange-500/20 text-orange-400"
                        )}>
                            <FileText className="w-6 h-6" />
                        </div>

                        <div>
                            <h4 className="font-bold text-sm text-white/90 leading-tight mb-1">{doc.title}</h4>
                            <p className="text-[10px] text-white/40 line-clamp-2 italic">{doc.contentSummary}</p>
                        </div>

                        <div className="mt-auto pt-4 border-t border-white/5 flex items-center justify-between">
                            <span className="text-[9px] font-mono text-white/20 uppercase">{doc.category} ● {doc.createdAt}</span>
                            {doc.signed ? (
                                <div className="flex items-center gap-1">
                                    <ShieldCheck className="w-3 h-3 text-emerald-500" />
                                    <span className="text-[8px] text-emerald-500 font-bold uppercase tracking-tighter">Firmado</span>
                                </div>
                            ) : (
                                <div className="flex items-center gap-1">
                                    <Lock className="w-3 h-3 text-white/20" />
                                    <span className="text-[8px] text-white/20 font-bold uppercase tracking-tighter">Pendiente</span>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {filteredDocs.length === 0 && (
                <div className="py-20 text-center animate-in fade-in duration-700">
                    <Search className="w-12 h-12 text-white/5 mx-auto mb-4" />
                    <p className="text-white/40 text-sm italic">No se encontraron documentos relevantes para "{query}"</p>
                </div>
            )}
        </div>
    );
};
