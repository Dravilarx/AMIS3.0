import React, { useState } from 'react';
import {
    MessageSquare,
    Hash,
    Send,
    MoreVertical,
    Clock,
    ShieldCheck,
    Search as SearchIcon,
    Circle
} from 'lucide-react';
import { cn } from '../../lib/utils';
import type { Message, Channel } from '../../types/communication';

const MOCK_CHANNELS: Channel[] = [
    { id: 'ch-1', name: 'Shift-Santiago-26', type: 'shift', lastMessage: 'Entrada validada Dra. Paz', updatedAt: '21:30', isEphemeral: true },
    { id: 'ch-2', name: 'PACS-Implementación', type: 'project', lastMessage: 'Servidor arriba', updatedAt: '20:45' },
    { id: 'ch-3', name: 'Dr. Agrawall', type: 'direct', lastMessage: 'Gracias Robert', updatedAt: '19:00' },
];

const MOCK_MESSAGES: Message[] = [
    { id: 'm1', senderId: 'u1', senderName: 'Sist. Agrawall', content: 'Iniciando canal efímero para el turno de hoy.', timestamp: '08:00', type: 'text' },
    { id: 'm2', senderId: 'u2', senderName: 'Dra. María Paz', content: 'Llegando a sede Providencia.', timestamp: '08:02', type: 'text' },
    { id: 'm3', senderId: 'u1', senderName: 'Sist. Agrawall', content: 'Geocerca validada. Biometría exitosa.', timestamp: '08:03', type: 'text' },
];

export const MessagingHub: React.FC = () => {
    const [activeChannel, setActiveChannel] = useState<Channel>(MOCK_CHANNELS[0]);
    const [messages] = useState<Message[]>(MOCK_MESSAGES);
    const [input, setInput] = useState('');

    return (
        <div className="flex h-[calc(100vh-12rem)] gap-4 animate-in fade-in duration-700">
            {/* Sidebar Channels */}
            <div className="w-72 flex flex-col gap-4">
                <div className="relative">
                    <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                    <input
                        type="text"
                        placeholder="Buscar canales..."
                        className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-xs focus:outline-none focus:border-blue-500/50"
                    />
                </div>

                <div className="flex-1 space-y-1 overflow-auto">
                    {MOCK_CHANNELS.map(ch => (
                        <div
                            key={ch.id}
                            onClick={() => setActiveChannel(ch)}
                            className={cn(
                                "p-3 rounded-xl border cursor-pointer transition-all",
                                activeChannel.id === ch.id
                                    ? "bg-blue-500/10 border-blue-500/30"
                                    : "bg-white/5 border-transparent hover:border-white/10"
                            )}
                        >
                            <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-2">
                                    {ch.type === 'shift' ? <Clock className="w-3 h-3 text-orange-400" /> :
                                        ch.type === 'project' ? <Hash className="w-3 h-3 text-blue-400" /> :
                                            <Circle className="w-2 h-2 fill-emerald-500 text-emerald-500" />}
                                    <span className="text-sm font-bold truncate max-w-[120px]">{ch.name}</span>
                                </div>
                                <span className="text-[9px] text-white/20 font-mono">{ch.updatedAt}</span>
                            </div>
                            <p className="text-[10px] text-white/40 truncate italic">{ch.lastMessage}</p>
                            {ch.isEphemeral && (
                                <div className="mt-2 flex items-center gap-1">
                                    <span className="text-[8px] px-1.5 py-0.5 bg-orange-500/20 text-orange-400 rounded font-black uppercase tracking-tighter">Efímero</span>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 flex flex-col bg-white/5 border border-white/10 rounded-2xl overflow-hidden relative">
                <header className="p-4 border-b border-white/5 flex items-center justify-between bg-black/20">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-600/20 border border-blue-500/20 flex items-center justify-center">
                            <MessageSquare className="w-5 h-5 text-blue-400" />
                        </div>
                        <div>
                            <h3 className="font-bold text-white/90">#{activeChannel.name}</h3>
                            <p className="text-[10px] text-white/40 flex items-center gap-1 lowercase">
                                <ShieldCheck className="w-3 h-3 text-emerald-500/60" /> canal encriptado de extremo a extremo
                            </p>
                        </div>
                    </div>
                    <button className="p-2 text-white/20 hover:text-white transition-colors">
                        <MoreVertical className="w-5 h-5" />
                    </button>
                </header>

                <div className="flex-1 overflow-auto p-6 space-y-6">
                    {messages.map(m => (
                        <div key={m.id} className="flex flex-col gap-1 max-w-[80%]">
                            <div className="flex items-baseline gap-2">
                                <span className="text-xs font-black text-blue-400 tracking-tighter uppercase">{m.senderName}</span>
                                <span className="text-[9px] text-white/20 font-mono">{m.timestamp}</span>
                            </div>
                            <div className="p-3 bg-white/5 border border-white/5 rounded-2xl rounded-tl-none text-sm text-white/80 leading-relaxed shadow-sm">
                                {m.content}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="p-4 bg-black/40 border-t border-white/5">
                    <div className="relative">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Escribe un mensaje para el equipo..."
                            className="w-full bg-white/5 border border-white/10 rounded-xl pl-4 pr-12 py-3 text-sm focus:outline-none focus:border-blue-500/50 transition-all"
                        />
                        <button className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-blue-600 rounded-lg hover:bg-blue-500 transition-all">
                            <Send className="w-4 h-4 text-white" />
                        </button>
                    </div>
                    <p className="text-[9px] text-white/20 mt-2 text-center italic">
                        {activeChannel.isEphemeral ? 'Este canal se auto-destruirá al finalizar el turno.' : 'Mensajería corporativa de Holding Portezuelo.'}
                    </p>
                </div>
            </div>
        </div>
    );
};
