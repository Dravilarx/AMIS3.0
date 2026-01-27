import React, { useState, useEffect, useRef } from 'react';
import {
    MessageSquare,
    Hash,
    Send,
    MoreVertical,
    Clock,
    ShieldCheck,
    Search as SearchIcon,
    Circle,
    Loader2
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useMessaging } from '../../hooks/useMessaging';

export const MessagingHub: React.FC = () => {
    const { messages, channels } = useMessaging();
    const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
    const [input, setInput] = useState('');
    const scrollRef = useRef<HTMLDivElement>(null);

    // Seleccionar primer canal por defecto
    useEffect(() => {
        if (channels.length > 0 && !activeChannelId) {
            setActiveChannelId(channels[0].id);
        }
    }, [channels]);

    // Auto-scroll al recibir mensajes
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const activeChannel = channels.find(c => c.id === activeChannelId);
    const { messages: channelMessages, loading: messagesLoading, sendMessage: sendToChannel } = useMessaging(activeChannelId || undefined);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || !activeChannelId) return;

        await sendToChannel(input, 'Coordinador Central');
        setInput('');
    };

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

                <div className="flex-1 space-y-1 overflow-auto custom-scrollbar">
                    {channels.map(ch => (
                        <div
                            key={ch.id}
                            onClick={() => setActiveChannelId(ch.id)}
                            className={cn(
                                "p-3 rounded-xl border cursor-pointer transition-all",
                                activeChannelId === ch.id
                                    ? "bg-blue-500/10 border-blue-500/30 shadow-[0_0_20px_rgba(59,130,246,0.1)]"
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
                                <span className="text-[9px] text-white/20 font-mono">
                                    {new Date(ch.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
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
            <div className="flex-1 flex flex-col bg-white/5 border border-white/10 rounded-2xl overflow-hidden relative backdrop-blur-sm">
                {activeChannel ? (
                    <>
                        <header className="p-4 border-b border-white/5 flex items-center justify-between bg-black/20">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-blue-600/20 border border-blue-500/20 flex items-center justify-center">
                                    <MessageSquare className="w-5 h-5 text-blue-400" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-white/90">#{activeChannel.name}</h3>
                                    <p className="text-[10px] text-white/40 flex items-center gap-1 lowercase">
                                        <ShieldCheck className="w-3 h-3 text-emerald-500/60" /> canal encriptado M8 realtime
                                    </p>
                                </div>
                            </div>
                            <button className="p-2 text-white/20 hover:text-white transition-colors">
                                <MoreVertical className="w-5 h-5" />
                            </button>
                        </header>

                        <div
                            ref={scrollRef}
                            className="flex-1 overflow-auto p-6 space-y-6 flex flex-col scroll-smooth h-full"
                        >
                            {messagesLoading ? (
                                <div className="flex-1 flex items-center justify-center">
                                    <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                                </div>
                            ) : channelMessages.map(m => (
                                <div key={m.id} className="flex flex-col gap-1 max-w-[80%] animate-in slide-in-from-bottom-2 duration-300">
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-xs font-black text-blue-400 tracking-tighter uppercase">{m.senderName}</span>
                                        <span className="text-[9px] text-white/20 font-mono">
                                            {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                    <div className="p-3 bg-white/5 border border-white/5 rounded-2xl rounded-tl-none text-sm text-white/80 leading-relaxed shadow-sm">
                                        {m.content}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <form onSubmit={handleSend} className="p-4 bg-black/40 border-t border-white/5">
                            <div className="relative">
                                <input
                                    type="text"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    placeholder="Escribe un mensaje para el equipo..."
                                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-4 pr-12 py-3 text-sm focus:outline-none focus:border-blue-500/50 transition-all font-light"
                                />
                                <button
                                    type="submit"
                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-blue-600 rounded-lg hover:bg-blue-500 transition-all active:scale-95"
                                >
                                    <Send className="w-4 h-4 text-white" />
                                </button>
                            </div>
                            <p className="text-[9px] text-white/20 mt-2 text-center italic">
                                {activeChannel.isEphemeral ? 'Este canal se auto-destruirá al finalizar el turno.' : 'Mensajería corporativa de Holding Portezuelo.'}
                            </p>
                        </form>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center space-y-4">
                        <MessageSquare className="w-12 h-12 text-white/5" />
                        <p className="text-white/40 text-sm font-mono">Selecciona un canal para iniciar la transmisión...</p>
                    </div>
                )}
            </div>
        </div>
    );
};
