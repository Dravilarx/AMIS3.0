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
    Loader2,
    Users,
    Paperclip,
    Plus,
    Bot,
    User as UserIcon,
    X,
    Check,
    Trash2,
    Reply,
    Bookmark,
    BookmarkCheck,
    CornerDownRight
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useMessaging } from '../../hooks/useMessaging';
import { useAuth } from '../../hooks/useAuth';
import { useProfessionals } from '../../hooks/useProfessionals';

export const MessagingHub: React.FC = () => {
    const { user } = useAuth();
    const { messages, channels, createChannel, deleteChannel } = useMessaging();
    const { professionals } = useProfessionals();
    const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
    const [input, setInput] = useState('');
    const [tab, setTab] = useState<'channels' | 'people'>('channels');
    const scrollRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const [isCreatingChannel, setIsCreatingChannel] = useState(false);
    const [isCreatingGroup, setIsCreatingGroup] = useState(false);
    const [newName, setNewName] = useState('');
    const [isEphemeral, setIsEphemeral] = useState(false);
    const [duration, setDuration] = useState('24h');
    const [replyToMessage, setReplyToMessage] = useState<any | null>(null);
    const [selectedProfessionals, setSelectedProfessionals] = useState<string[]>([]);

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
    const {
        messages: channelMessages,
        loading: messagesLoading,
        sendMessage: sendToChannel,
        deleteMessage: removeMessage,
        toggleSaveMessage: saveMessage
    } = useMessaging(activeChannelId || undefined);

    const handleSelectPerson = async (p: any) => {
        // Encontrar o crear un canal directo con la persona
        const personName = `${p.name} ${p.lastName}`;
        const existingChannel = channels.find(c => c.type === 'direct' && c.name === personName);

        if (existingChannel) {
            setActiveChannelId(existingChannel.id);
        } else {
            const id = await createChannel(personName, 'direct');
            if (id) setActiveChannelId(id);
        }
    };

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || !activeChannelId) return;

        const options = replyToMessage ? {
            replyTo: {
                id: replyToMessage.id,
                senderName: replyToMessage.senderName,
                content: replyToMessage.content
            }
        } : undefined;

        await sendToChannel(input, 'text', options);
        setInput('');
        setReplyToMessage(null);
    };

    const handleCancelReply = () => {
        setReplyToMessage(null);
    };

    useEffect(() => {
        if (replyToMessage) {
            inputRef.current?.focus();
        }
    }, [replyToMessage]);

    const handleAttachment = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !activeChannelId) return;

        // Simulación de envío de adjunto
        const fileName = file.name;
        await sendToChannel(`[Archivo Adjunto: ${fileName}]`, 'file');
    };

    const handleCreate = async () => {
        if (!newName.trim()) return;
        const type = isCreatingChannel ? 'project' : 'group';
        const id = await createChannel(newName, type, isEphemeral, selectedProfessionals);
        if (id) {
            setActiveChannelId(id);
            setNewName('');
            setIsEphemeral(false);
            setIsCreatingChannel(false);
            setIsCreatingGroup(false);
            setSelectedProfessionals([]);
        }
    };

    const toggleProfessionalSelection = (id: string) => {
        setSelectedProfessionals(prev =>
            prev.includes(id) ? prev.filter(pId => pId !== id) : [...prev, id]
        );
    };

    return (
        <div className="flex h-[calc(100vh-12rem)] gap-4 animate-in fade-in duration-700 relative">
            {/* Sidebar Channels & People */}
            <div className="w-80 flex flex-col gap-4">
                <div className="flex bg-white/5 p-1 rounded-xl border border-white/5">
                    <button
                        onClick={() => setTab('channels')}
                        className={cn(
                            "flex-1 flex items-center justify-center gap-2 py-2 text-[10px] uppercase font-bold tracking-widest transition-all rounded-lg",
                            tab === 'channels' ? "bg-white/10 text-white" : "text-white/40 hover:text-white/60"
                        )}
                    >
                        <Hash className="w-3 h-3" /> Canales
                    </button>
                    <button
                        onClick={() => setTab('people')}
                        className={cn(
                            "flex-1 flex items-center justify-center gap-2 py-2 text-[10px] uppercase font-bold tracking-widest transition-all rounded-lg",
                            tab === 'people' ? "bg-white/10 text-white" : "text-white/40 hover:text-white/60"
                        )}
                    >
                        <Users className="w-3 h-3" /> Personas
                    </button>
                </div>

                <div className="relative">
                    <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                    <input
                        type="text"
                        placeholder={tab === 'channels' ? "Buscar canales..." : "Buscar colegas..."}
                        className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-xs focus:outline-none focus:border-blue-500/50"
                    />
                </div>

                <div className="flex-1 space-y-1 overflow-auto custom-scrollbar">
                    {tab === 'channels' ? (
                        <>
                            <div className="flex items-center justify-between px-2 mb-2">
                                <span className="text-[10px] uppercase font-black text-blue-500/60 tracking-[0.2em]">Canales</span>
                                <button
                                    onClick={() => setIsCreatingChannel(true)}
                                    className="p-1 hover:bg-blue-500/10 rounded-lg text-blue-400/60 hover:text-blue-400 transition-all active:scale-95"
                                    title="Nuevo Canal"
                                >
                                    <Plus className="w-3.5 h-3.5" />
                                </button>
                            </div>
                            {channels.map(ch => (
                                <div
                                    key={ch.id}
                                    onClick={() => setActiveChannelId(ch.id)}
                                    className={cn(
                                        "p-3 rounded-xl border cursor-pointer transition-all group",
                                        activeChannelId === ch.id
                                            ? "bg-blue-500/10 border-blue-500/30 shadow-[0_0_20px_rgba(59,130,246,0.1)]"
                                            : "bg-white/5 border-transparent hover:border-white/10"
                                    )}
                                >
                                    <div className="flex items-center justify-between mb-1">
                                        <div className="flex items-center gap-2">
                                            {ch.type === 'shift' ? <Clock className="w-3 h-3 text-orange-400" /> :
                                                ch.type === 'project' ? <Hash className="w-3 h-3 text-blue-400" /> :
                                                    <Circle className="w-2 h-2 fill-purple-500 text-purple-500" />}
                                            <span className="text-sm font-bold truncate max-w-[120px]">{ch.name}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {ch.id !== 'CH-001' && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (confirm('¿Estás seguro de eliminar este canal/grupo?')) {
                                                            deleteChannel(ch.id);
                                                            if (activeChannelId === ch.id) setActiveChannelId('CH-001');
                                                        }
                                                    }}
                                                    className="p-1.5 text-white/0 group-hover:text-red-400/60 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
                                                >
                                                    <Trash2 className="w-3 h-3" />
                                                </button>
                                            )}
                                            <span className="text-[9px] text-white/20 font-mono">
                                                {new Date(ch.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                    </div>
                                    {ch.isEphemeral && (
                                        <div className="mt-2 flex items-center gap-1">
                                            <span className="text-[8px] px-1.5 py-0.5 bg-orange-500/20 text-orange-400 rounded font-black uppercase tracking-tighter">Efímero</span>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </>
                    ) : (
                        <>
                            <div className="flex items-center justify-between px-2 mb-2">
                                <span className="text-[10px] uppercase font-black text-purple-500/60 tracking-[0.2em]">Colegas en Línea</span>
                                <button
                                    onClick={() => setIsCreatingGroup(true)}
                                    className="p-1 hover:bg-purple-500/10 rounded-lg text-purple-400/60 hover:text-purple-400 transition-all active:scale-95"
                                    title="Crear Grupo"
                                >
                                    <Plus className="w-3.5 h-3.5" />
                                </button>
                            </div>
                            <div
                                onClick={() => setActiveChannelId('AI-HELPER')}
                                className={cn(
                                    "p-3 rounded-xl border cursor-pointer transition-all mb-2",
                                    activeChannelId === 'AI-HELPER'
                                        ? "bg-purple-500/10 border-purple-500/30 shadow-[0_0_20px_rgba(168,85,247,0.1)]"
                                        : "bg-white/5 border-transparent hover:border-purple-500/20"
                                )}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center border border-purple-500/30">
                                        <Bot className="w-4 h-4 text-purple-400" />
                                    </div>
                                    <div>
                                        <span className="text-sm font-bold text-purple-200">Agrawall AI</span>
                                        <p className="text-[9px] text-purple-400/60 uppercase font-bold tracking-wider">Asistente Inteligente</p>
                                    </div>
                                </div>
                            </div>
                            {professionals.map(p => (
                                <div
                                    key={p.id}
                                    onClick={() => handleSelectPerson(p)}
                                    className={cn(
                                        "p-3 rounded-xl border cursor-pointer transition-all flex items-center gap-3",
                                        activeChannel?.name === `${p.name} ${p.lastName}`
                                            ? "bg-blue-500/10 border-blue-500/30 shadow-[0_0_20px_rgba(59,130,246,0.1)]"
                                            : "bg-white/5 border-transparent hover:border-white/10"
                                    )}
                                >
                                    <div className="relative">
                                        <div className={cn(
                                            "w-8 h-8 rounded-lg flex items-center justify-center border transition-all",
                                            activeChannel?.name === `${p.name} ${p.lastName}`
                                                ? "bg-blue-500/20 border-blue-500/30"
                                                : "bg-white/5 border-white/10"
                                        )}>
                                            <UserIcon className={cn(
                                                "w-4 h-4",
                                                activeChannel?.name === `${p.name} ${p.lastName}` ? "text-blue-400" : "text-white/40"
                                            )} />
                                        </div>
                                        <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-[#0A0A0B] rounded-full" />
                                    </div>
                                    <div>
                                        <span className={cn(
                                            "text-sm font-bold",
                                            activeChannel?.name === `${p.name} ${p.lastName}` ? "text-white" : "text-white/80"
                                        )}>{p.name} {p.lastName}</span>
                                        <p className="text-[9px] text-white/30 uppercase font-bold tracking-wider">{p.role}</p>
                                    </div>
                                </div>
                            ))}
                        </>
                    )}
                </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 flex flex-col bg-[#0A0A0B]/60 border border-white/10 rounded-2xl overflow-hidden relative backdrop-blur-md shadow-2xl">
                {activeChannel || activeChannelId === 'AI-HELPER' ? (
                    <>
                        <header className="p-4 border-b border-white/5 flex items-center justify-between bg-gradient-to-r from-blue-500/5 to-transparent">
                            <div className="flex items-center gap-3">
                                <div className={cn(
                                    "w-10 h-10 rounded-xl flex items-center justify-center shadow-lg transition-all",
                                    activeChannelId === 'AI-HELPER'
                                        ? "bg-purple-600/20 border border-purple-500/30 shadow-purple-500/10"
                                        : "bg-blue-600/20 border border-blue-500/20 shadow-blue-500/10"
                                )}>
                                    {activeChannelId === 'AI-HELPER' ? <Bot className="w-5 h-5 text-purple-400" /> : <MessageSquare className="w-5 h-5 text-blue-400" />}
                                </div>
                                <div>
                                    <h3 className="font-black text-white tracking-widest uppercase text-sm">
                                        {activeChannelId === 'AI-HELPER' ? 'Agrawall AI Helper' :
                                            activeChannel?.type === 'direct' ? activeChannel.name : `#${activeChannel?.name}`}
                                    </h3>
                                    <div className="flex items-center gap-2">
                                        <p className="text-[10px] text-white/40 flex items-center gap-1 font-mono uppercase tracking-widest">
                                            <ShieldCheck className="w-3 h-3 text-emerald-500/60" /> canal encriptado M8
                                        </p>
                                        {activeChannel?.isEphemeral && (
                                            <span className="text-[9px] px-1.5 py-0.5 bg-orange-500/20 text-orange-400 rounded-md font-black uppercase tracking-tighter animate-pulse">Efímero</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button className="p-2 text-white/20 hover:text-white transition-colors bg-white/5 rounded-lg border border-white/5">
                                    <SearchIcon className="w-4 h-4" />
                                </button>
                                <button className="p-2 text-white/20 hover:text-white transition-colors">
                                    <MoreVertical className="w-5 h-5" />
                                </button>
                            </div>
                        </header>

                        <div
                            ref={scrollRef}
                            className="flex-1 overflow-auto p-6 space-y-6 flex flex-col scroll-smooth h-full bg-[radial-gradient(circle_at_50%_0%,_rgba(59,130,246,0.03),_transparent)]"
                        >
                            {messagesLoading ? (
                                <div className="flex-1 flex items-center justify-center">
                                    <div className="flex flex-col items-center gap-4">
                                        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                                        <span className="text-[10px] font-bold text-blue-500/40 uppercase tracking-[0.2em]">Sincronizando...</span>
                                    </div>
                                </div>
                            ) : channelMessages.map(m => (
                                <div
                                    key={m.id}
                                    className={cn(
                                        "flex flex-col gap-1 max-w-[85%] animate-in slide-in-from-bottom-2 duration-300 group/msg relative",
                                        m.senderId === user?.id ? "ml-auto items-end" : "items-start"
                                    )}
                                >
                                    {/* Cabecera del mensaje */}
                                    <div className="flex items-baseline gap-2 px-2">
                                        <span className={cn(
                                            "text-[10px] font-black tracking-tighter uppercase",
                                            m.senderId === 'AI' ? "text-purple-400" :
                                                m.senderId === user?.id ? "text-emerald-400" : "text-blue-400"
                                        )}>
                                            {m.senderName}
                                        </span>
                                        <span className="text-[8px] text-white/20 font-mono">
                                            {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                        {m.isSaved && <BookmarkCheck className="w-3 h-3 text-orange-400 fill-orange-400/20" />}
                                    </div>

                                    {/* Referencia a Respuesta */}
                                    {m.replyTo && (
                                        <div className={cn(
                                            "mb-1 p-2 rounded-xl bg-white/5 border-l-2 border-blue-500/50 flex items-center gap-2 max-w-full overflow-hidden opacity-60 scale-95 origin-bottom",
                                            m.senderId === user?.id ? "mr-4" : "ml-4"
                                        )}>
                                            <CornerDownRight className="w-3 h-3 text-blue-500 shrink-0" />
                                            <div className="truncate text-[10px]">
                                                <span className="font-bold text-blue-400">{m.replyTo.senderName}:</span> {m.replyTo.content}
                                            </div>
                                        </div>
                                    )}

                                    {/* Burbuja del mensaje */}
                                    <div className="relative group/bubble">
                                        <div className={cn(
                                            "p-4 border text-sm leading-relaxed shadow-lg backdrop-blur-sm transition-all",
                                            m.senderId === user?.id
                                                ? "bg-blue-600/10 border-blue-500/20 rounded-3xl rounded-tr-none text-white/90"
                                                : "bg-white/5 border-white/5 rounded-3xl rounded-tl-none text-white/80"
                                        )}>
                                            {m.content}
                                        </div>

                                        {/* Acciones Rápidas */}
                                        <div className={cn(
                                            "absolute top-0 opacity-0 group-hover/msg:opacity-100 transition-all flex items-center gap-1 bg-[#0A0A0B] border border-white/10 p-1 rounded-xl shadow-2xl z-10 scale-90 group-hover/msg:scale-100",
                                            m.senderId === user?.id ? "right-full mr-2" : "left-full ml-2"
                                        )}>
                                            <button
                                                onClick={() => setReplyToMessage(m)}
                                                className="p-1.5 hover:bg-white/5 rounded-lg text-white/40 hover:text-blue-400 transition-colors"
                                                title="Responder"
                                            >
                                                <Reply className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                                onClick={() => saveMessage(m.id, !!m.isSaved)}
                                                className={cn(
                                                    "p-1.5 hover:bg-white/5 rounded-lg transition-colors",
                                                    m.isSaved ? "text-orange-400" : "text-white/40 hover:text-orange-400"
                                                )}
                                                title={m.isSaved ? "Quitar de guardados" : "Guardar mensaje"}
                                            >
                                                <Bookmark className={cn("w-3.5 h-3.5", m.isSaved && "fill-current")} />
                                            </button>
                                            <button
                                                onClick={() => {
                                                    if (confirm('¿Borrar mensaje?')) removeMessage(m.id);
                                                }}
                                                className="p-1.5 hover:bg-red-400/10 rounded-lg text-white/40 hover:text-red-400 transition-colors"
                                                title="Eliminar"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <form onSubmit={handleSend} className="p-4 bg-black/40 border-t border-white/5 backdrop-blur-md relative">
                            {/* Visualizador de Respuesta en curso */}
                            {replyToMessage && (
                                <div className="absolute bottom-full left-0 right-0 p-3 bg-blue-500/10 backdrop-blur-xl border-t border-blue-500/20 flex items-center justify-between animate-in slide-in-from-bottom-2 duration-300">
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        <div className="w-1 h-8 bg-blue-500 rounded-full shrink-0" />
                                        <div className="flex flex-col overflow-hidden">
                                            <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Respondiendo a {replyToMessage.senderName}</span>
                                            <p className="text-xs text-white/60 truncate italic">{replyToMessage.content}</p>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleCancelReply}
                                        className="p-2 hover:bg-white/5 rounded-lg text-white/40 hover:text-white transition-colors"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            )}

                            <div className="relative group">
                                <div className="absolute left-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                                    <button
                                        type="button"
                                        className="p-2 text-white/20 hover:text-white/60 hover:bg-white/5 rounded-lg transition-all"
                                    >
                                        <Plus className="w-4 h-4" />
                                    </button>
                                </div>
                                <input
                                    ref={inputRef}
                                    type="text"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    placeholder={activeChannelId === 'AI-HELPER' ? "Pregúntale algo a Agrawall AI..." :
                                        activeChannel?.type === 'direct' ? `Escribe un mensaje para ${activeChannel.name}...` :
                                            "Escribe un mensaje para el equipo..."}
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-24 py-4 text-sm focus:outline-none focus:border-blue-500/50 transition-all font-light placeholder:text-white/20"
                                />
                                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={handleAttachment}
                                        className="hidden"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        className="p-2 text-white/20 hover:text-white/60 hover:bg-white/5 rounded-lg transition-all"
                                        title="Adjuntar archivo o imagen"
                                    >
                                        <Paperclip className="w-4 h-4" />
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={!input.trim()}
                                        className="p-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-500 transition-all active:scale-95 disabled:opacity-20 shadow-lg shadow-blue-500/20"
                                    >
                                        <Send className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                            <p className="text-[9px] text-white/10 mt-3 text-center uppercase font-bold tracking-[0.2em]">
                                {activeChannelId === 'AI-HELPER'
                                    ? 'Sesión de asistencia asistida por IA Gemini 2.0'
                                    : activeChannel?.isEphemeral
                                        ? 'Atención: Canal efímero de guardia (Destrucción automática activa)'
                                        : 'Sistema de Comunicación Segura Holding Portezuelo'}
                            </p>
                        </form>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center space-y-6 bg-[radial-gradient(circle_at_50%_50%,_rgba(59,130,246,0.05),_transparent)]">
                        <div className="w-20 h-20 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center animate-pulse">
                            <MessageSquare className="w-10 h-10 text-white/10" />
                        </div>
                        <div className="text-center">
                            <h4 className="text-white/60 font-black uppercase tracking-[0.3em] text-xs mb-2">Canal no Seleccionado</h4>
                            <p className="text-white/20 text-[10px] font-mono">Selecciona un canal o colega para iniciar la transmisión...</p>
                        </div>
                    </div>
                )}
            </div >
            {/* Modal de Creación (Canal o Grupo) */}
            {
                (isCreatingChannel || isCreatingGroup) && (
                    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                        <div className="w-full max-w-md bg-[#0A0A0B] border border-white/10 rounded-2xl shadow-2xl p-6 animate-in zoom-in-95 duration-300">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-lg font-black uppercase tracking-widest text-white">
                                    {isCreatingChannel ? 'Nuevo Canal' : 'Crear Grupo'}
                                </h3>
                                <button
                                    onClick={() => { setIsCreatingChannel(false); setIsCreatingGroup(false); }}
                                    className="p-2 hover:bg-white/5 rounded-full text-white/40 transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="space-y-6">
                                <div>
                                    <label className="text-[10px] uppercase font-black text-white/40 tracking-widest mb-2 block">Nombre del {isCreatingChannel ? 'Canal' : 'Grupo'}</label>
                                    <input
                                        type="text"
                                        value={newName}
                                        onChange={(e) => setNewName(e.target.value)}
                                        placeholder={isCreatingChannel ? "ej. Licitaciones-2026" : "ej. La Oficina"}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500/50 transition-all font-light"
                                        autoFocus
                                    />
                                </div>

                                <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <Clock className="w-3.5 h-3.5 text-orange-400" />
                                            <span className="text-xs font-bold text-white uppercase tracking-wider">Modo Efímero</span>
                                        </div>
                                        <p className="text-[10px] text-white/40">Los mensajes se autodestruyen después del tiempo definido.</p>
                                    </div>
                                    <button
                                        onClick={() => setIsEphemeral(!isEphemeral)}
                                        className={cn(
                                            "w-12 h-6 rounded-full transition-all relative",
                                            isEphemeral ? "bg-orange-500/80 shadow-[0_0_15px_rgba(249,115,22,0.3)]" : "bg-white/10"
                                        )}
                                    >
                                        <div className={cn(
                                            "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                                            isEphemeral ? "right-1" : "left-1"
                                        )} />
                                    </button>
                                </div>

                                {isEphemeral && (
                                    <div className="animate-in slide-in-from-top-2">
                                        <label className="text-[10px] uppercase font-black text-white/40 tracking-widest mb-2 block">Duración</label>
                                        <div className="grid grid-cols-3 gap-2">
                                            {['24h', '7d', '30d'].map(d => (
                                                <button
                                                    key={d}
                                                    onClick={() => setDuration(d)}
                                                    className={cn(
                                                        "py-2 text-[10px] uppercase font-black rounded-lg border transition-all",
                                                        duration === d
                                                            ? "bg-orange-500/20 border-orange-500 text-orange-400"
                                                            : "bg-white/5 border-white/5 text-white/20 hover:text-white/40"
                                                    )}
                                                >
                                                    {d === '24h' ? '24 Horas' : d === '7d' ? '7 Días' : '30 Días'}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Selección de Colegas para Grupo */}
                                {isCreatingGroup && (
                                    <div className="space-y-3">
                                        <label className="text-[10px] uppercase font-black text-white/40 tracking-widest block">Seleccionar Colegas ({selectedProfessionals.length})</label>
                                        <div className="max-h-48 overflow-y-auto custom-scrollbar space-y-1 pr-2">
                                            {professionals.map(p => (
                                                <div
                                                    key={p.id}
                                                    onClick={() => toggleProfessionalSelection(p.id)}
                                                    className={cn(
                                                        "p-2 rounded-lg border transition-all cursor-pointer flex items-center justify-between group",
                                                        selectedProfessionals.includes(p.id)
                                                            ? "bg-blue-500/10 border-blue-500/30"
                                                            : "bg-white/5 border-transparent hover:bg-white/10"
                                                    )}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-6 h-6 rounded bg-white/5 flex items-center justify-center border border-white/10">
                                                            <UserIcon className="w-3 h-3 text-white/40" />
                                                        </div>
                                                        <span className="text-xs text-white/80">{p.name} {p.lastName}</span>
                                                    </div>
                                                    <div className={cn(
                                                        "w-4 h-4 rounded-full border flex items-center justify-center transition-all",
                                                        selectedProfessionals.includes(p.id)
                                                            ? "bg-blue-500 border-blue-500"
                                                            : "border-white/10 group-hover:border-white/20"
                                                    )}>
                                                        {selectedProfessionals.includes(p.id) && <Check className="w-2.5 h-2.5 text-white" />}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <button
                                    onClick={handleCreate}
                                    disabled={!newName.trim()}
                                    className="w-full py-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-20 text-white rounded-xl font-black uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-2 shadow-xl shadow-blue-500/20"
                                >
                                    <Check className="w-4 h-4" /> Finalizar Creación
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
};

