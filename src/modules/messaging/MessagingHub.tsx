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
import { supabase } from '../../lib/supabase';

export const MessagingHub: React.FC = () => {
    const { user } = useAuth();
    const { messages, channels, createChannel, deleteChannel } = useMessaging();
    const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
    const [input, setInput] = useState('');
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
    const [attachment, setAttachment] = useState<File | null>(null);
    const [isSending, setIsSending] = useState(false);

    // Search unified state
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    // User tags info for group modal
    const [selectedUsersInfo, setSelectedUsersInfo] = useState<{ id: string, name: string }[]>([]);

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

    // Buscador global de personas (Dinámico)
    useEffect(() => {
        if (searchTerm.trim().length <= 2) {
            setSearchResults([]);
            return;
        }
        const fetchUsers = async () => {
            setIsSearching(true);
            try {
                // Separamos por espacios la búsqueda
                const parts = searchTerm.toLowerCase().split(' ').filter(p => p.length > 0);
                const queryText = `%${parts.join('%')}%`;

                const [profilesRes, profsRes] = await Promise.all([
                    supabase.from('profiles')
                        .select('id, full_name, role, rut')
                        .or(`full_name.ilike.${queryText},rut.ilike.${queryText}`)
                        .limit(10),
                    supabase.from('professionals')
                        .select('id, name, last_name, role, national_id')
                        .or(`name.ilike.${queryText},last_name.ilike.${queryText},national_id.ilike.${queryText}`)
                        .limit(10)
                ]);

                const combinedProfiles: any[] = [];
                if (profilesRes.data) {
                    combinedProfiles.push(...profilesRes.data.map((p: any) => ({
                        id: p.id,
                        full_name: p.full_name,
                        rut: p.rut,
                        role: p.role || 'Admin/App',
                        source: 'perfil'
                    })));
                }
                if (profsRes.data) {
                    combinedProfiles.push(...profsRes.data.map((p: any) => ({
                        id: p.id,
                        full_name: `${p.name} ${p.last_name}`,
                        rut: p.national_id,
                        role: p.role,
                        source: 'clínico'
                    })));
                }
                // deduplicate
                const unique = Array.from(new Map(combinedProfiles.map(item => [item.id, item])).values());
                setSearchResults(unique.slice(0, 15));
            } catch (err) {
                console.error('Error searching users:', err);
            } finally {
                setIsSearching(false);
            }
        };
        const debounce = setTimeout(fetchUsers, 400);
        return () => clearTimeout(debounce);
    }, [searchTerm]);

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
        const personName = p.full_name;
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
        if ((!input.trim() && !attachment) || !activeChannelId || isSending) return;

        setIsSending(true);
        let sentContent = input.trim();

        if (attachment) {
            try {
                const fileExt = attachment.name.split('.').pop();
                const filePath = `chat_attachments/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

                const { error: uploadError } = await supabase.storage.from('documents').upload(filePath, attachment);
                let fileUrl = '';

                if (!uploadError) {
                    const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(filePath);
                    fileUrl = publicUrl;
                }

                const attachMd = fileUrl ? `\n\n[📎 Archivo Adjunto: ${attachment.name}](${fileUrl})` : `\n\n[📎 Archivo Adjunto: ${attachment.name}]`;
                sentContent += attachMd;
            } catch (err) {
                console.error('Error uploading file:', err);
                sentContent += `\n\n[📎 Archivo Adjunto (Error): ${attachment.name}]`;
            }
        }

        const options = replyToMessage ? {
            replyTo: {
                id: replyToMessage.id,
                senderName: replyToMessage.senderName,
                content: replyToMessage.content
            }
        } : undefined;

        await sendToChannel(sentContent, attachment ? 'file' : 'text', options);
        setInput('');
        setAttachment(null);
        setReplyToMessage(null);
        setIsSending(false);
    };

    const handleCancelReply = () => {
        setReplyToMessage(null);
    };

    useEffect(() => {
        if (replyToMessage) {
            inputRef.current?.focus();
        }
    }, [replyToMessage]);

    const handleAttachment = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setAttachment(file);
        if (fileInputRef.current) fileInputRef.current.value = '';
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
            setSelectedUsersInfo([]);
        }
    };

    const toggleProfessionalSelection = (userObj: { id: string, name: string }) => {
        setSelectedProfessionals(prev => {
            if (prev.includes(userObj.id)) {
                setSelectedUsersInfo(current => current.filter(u => u.id !== userObj.id));
                return prev.filter(pId => pId !== userObj.id);
            } else {
                setSelectedUsersInfo(current => [...current, userObj]);
                return [...prev, userObj.id];
            }
        });
    };

    return (
        <div className="flex h-[calc(100vh-12rem)] gap-4 animate-in fade-in duration-700 relative">
            {/* Sidebar Messaging unified */}
            <div className="w-80 flex flex-col gap-4">
                <div className="flex items-center justify-between p-2">
                    <h2 className="text-sm font-black uppercase tracking-widest text-brand-text">Mensajes</h2>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setIsCreatingGroup(true)}
                            className="p-2 hover:bg-info/10 rounded-lg text-info/60 hover:text-info transition-all active:scale-95"
                            title="Nuevo Grupo o Modalidad"
                        >
                            <Plus className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                <div className="relative">
                    <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-text/20" />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Buscar colegas para chatear..."
                        className="w-full bg-brand-surface border border-brand-border rounded-lg pl-10 pr-4 py-3 text-sm text-brand-text focus:outline-none focus:border-info/50 transition-all shadow-sm"
                    />
                    {isSearching && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            <Loader2 className="w-3 h-3 animate-spin text-info/50" />
                        </div>
                    )}
                </div>

                <div className="flex-1 space-y-1 overflow-auto custom-scrollbar">
                    {searchTerm.length > 2 ? (
                        <>
                            <div className="px-2 mb-2">
                                <span className="text-[10px] uppercase font-black text-success/60 tracking-[0.2em]">Resultados de Búsqueda</span>
                            </div>
                            {searchResults.length === 0 && !isSearching ? (
                                <p className="text-[10px] text-brand-text/40 text-center py-4">No se encontraron colegas.</p>
                            ) : searchResults.map(user => (
                                <div
                                    key={user.id}
                                    onClick={() => {
                                        handleSelectPerson(user);
                                        setSearchTerm(''); // Clear after selecting
                                    }}
                                    className="p-3 rounded-xl border border-transparent bg-brand-surface cursor-pointer hover:border-brand-border transition-all flex items-center gap-3"
                                >
                                    <div className="relative">
                                        <div className="w-8 h-8 rounded-lg flex items-center justify-center border border-brand-border bg-brand-surface">
                                            <UserIcon className="w-4 h-4 text-brand-text/40" />
                                        </div>
                                        <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-success border-2 border-brand-bg rounded-full" />
                                    </div>
                                    <div>
                                        <span className="text-sm font-bold text-brand-text">{user.full_name}</span>
                                        <p className="text-[9px] text-brand-text/30 uppercase font-bold tracking-wider">{user.role}</p>
                                    </div>
                                </div>
                            ))}
                        </>
                    ) : (
                        <>
                            <div className="px-2 mb-2">
                                <span className="text-[10px] uppercase font-black text-info/60 tracking-[0.2em]">Conversaciones</span>
                            </div>
                            <div
                                onClick={() => setActiveChannelId('AI-HELPER')}
                                className={cn(
                                    "p-3 rounded-xl border cursor-pointer transition-all mb-2",
                                    activeChannelId === 'AI-HELPER'
                                        ? "bg-purple-500/10 border-purple-500/30 shadow-[0_0_20px_rgba(168,85,247,0.1)]"
                                        : "bg-brand-surface border-transparent hover:border-purple-500/20"
                                )}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center border border-purple-500/30">
                                        <Bot className="w-4 h-4 text-purple-400" />
                                    </div>
                                    <div>
                                        <span className="text-sm font-bold text-purple-400">Agrawall AI</span>
                                        <p className="text-[9px] text-purple-400/60 uppercase font-bold tracking-wider">Asistente Inteligente</p>
                                    </div>
                                </div>
                            </div>
                            {channels.map(ch => (
                                <div
                                    key={ch.id}
                                    onClick={() => setActiveChannelId(ch.id)}
                                    className={cn(
                                        "p-3 rounded-xl border cursor-pointer transition-all group",
                                        activeChannelId === ch.id
                                            ? "bg-info/10 border-info/30 shadow-[0_0_20px_rgba(59,130,246,0.1)]"
                                            : "bg-brand-surface border-transparent hover:border-brand-border"
                                    )}
                                >
                                    <div className="flex items-center justify-between mb-1">
                                        <div className="flex items-center gap-2">
                                            {ch.type === 'direct' ? <UserIcon className={cn("w-3 h-3", activeChannelId === ch.id ? "text-info" : "text-brand-text/40")} /> :
                                                ch.type === 'shift' ? <Clock className="w-3 h-3 text-warning" /> :
                                                    ch.type === 'project' ? <Hash className="w-3 h-3 text-info" /> :
                                                        <Circle className="w-2 h-2 fill-purple-500 text-purple-500" />}
                                            <span className={cn("text-sm font-bold truncate max-w-[120px]", activeChannelId === ch.id ? "text-brand-text" : "text-brand-text/80")}>
                                                {ch.name}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {ch.id !== 'CH-001' && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (confirm('¿Estás seguro de eliminar este canal o chat?')) {
                                                            deleteChannel(ch.id);
                                                            if (activeChannelId === ch.id) setActiveChannelId('CH-001');
                                                        }
                                                    }}
                                                    className="p-1.5 text-transparent group-hover:text-danger/60 hover:text-danger hover:bg-danger/10 rounded-lg transition-all"
                                                >
                                                    <Trash2 className="w-3 h-3" />
                                                </button>
                                            )}
                                            <span className="text-[9px] text-brand-text/20 font-mono">
                                                {new Date(ch.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                    </div>
                                    {ch.isEphemeral && (
                                        <div className="mt-2 flex items-center gap-1">
                                            <span className="text-[8px] px-1.5 py-0.5 bg-warning/20 text-warning rounded-md font-black uppercase tracking-tighter">Efímero</span>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </>
                    )}
                </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 flex flex-col bg-brand-surface/60 border border-brand-border rounded-2xl overflow-hidden relative backdrop-blur-md shadow-2xl">
                {activeChannel || activeChannelId === 'AI-HELPER' ? (
                    <>
                        <header className="p-4 border-b border-brand-border flex items-center justify-between bg-gradient-to-r from-info/5 to-transparent">
                            <div className="flex items-center gap-3">
                                <div className={cn(
                                    "w-10 h-10 rounded-xl flex items-center justify-center shadow-lg transition-all",
                                    activeChannelId === 'AI-HELPER'
                                        ? "bg-purple-600/20 border border-purple-500/30 shadow-purple-500/10"
                                        : "bg-info/20 border border-info/20 shadow-info/10"
                                )}>
                                    {activeChannelId === 'AI-HELPER' ? <Bot className="w-5 h-5 text-purple-400" /> : <MessageSquare className="w-5 h-5 text-info" />}
                                </div>
                                <div>
                                    <h3 className="font-black text-brand-text tracking-widest uppercase text-sm">
                                        {activeChannelId === 'AI-HELPER' ? 'Agrawall AI Helper' :
                                            activeChannel?.type === 'direct' ? activeChannel.name : `#${activeChannel?.name}`}
                                    </h3>
                                    <div className="flex items-center gap-2">
                                        <p className="text-[10px] text-brand-text/40 flex items-center gap-1 font-mono uppercase tracking-widest">
                                            <ShieldCheck className="w-3 h-3 text-success/60" /> canal encriptado M8
                                        </p>
                                        {activeChannel?.isEphemeral && (
                                            <span className="text-[9px] px-1.5 py-0.5 bg-warning/20 text-warning rounded-md font-black uppercase tracking-tighter animate-pulse">Efímero</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button className="p-2 text-brand-text/20 hover:text-brand-text transition-colors bg-brand-surface rounded-lg border border-brand-border">
                                    <SearchIcon className="w-4 h-4" />
                                </button>
                                <button className="p-2 text-brand-text/20 hover:text-brand-text transition-colors">
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
                                        <Loader2 className="w-8 h-8 text-info animate-spin" />
                                        <span className="text-[10px] font-bold text-info/40 uppercase tracking-[0.2em]">Sincronizando...</span>
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
                                                m.senderId === user?.id ? "text-success" : "text-info"
                                        )}>
                                            {m.senderName}
                                        </span>
                                        <span className="text-[8px] text-brand-text/20 font-mono">
                                            {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                        {m.isSaved && <BookmarkCheck className="w-3 h-3 text-warning fill-warning/20" />}
                                    </div>

                                    {/* Referencia a Respuesta */}
                                    {m.replyTo && (
                                        <div className={cn(
                                            "mb-1 p-2 rounded-xl bg-brand-surface border-l-2 border-info/50 flex items-center gap-2 max-w-full overflow-hidden opacity-60 scale-95 origin-bottom",
                                            m.senderId === user?.id ? "mr-4" : "ml-4"
                                        )}>
                                            <CornerDownRight className="w-3 h-3 text-info shrink-0" />
                                            <div className="truncate text-[10px]">
                                                <span className="font-bold text-info">{m.replyTo.senderName}:</span> <span className="text-brand-text/60">{m.replyTo.content}</span>
                                            </div>
                                        </div>
                                    )}

                                    {/* Burbuja del mensaje */}
                                    <div className="relative group/bubble">
                                        <div className={cn(
                                            "p-4 border text-sm leading-relaxed shadow-lg backdrop-blur-sm transition-all whitespace-pre-wrap break-words",
                                            m.senderId === user?.id
                                                ? "bg-info/10 border-info/20 rounded-3xl rounded-tr-none text-brand-text"
                                                : "bg-brand-surface border-brand-border rounded-3xl rounded-tl-none text-brand-text/80"
                                        )}>
                                            {(() => {
                                                if (m.content.includes('[📎 Archivo Adjunto')) {
                                                    const parts = m.content.split('\n\n[📎');
                                                    const textPart = parts[0];
                                                    const attachPart = '[📎' + parts.slice(1).join('\n\n[📎');

                                                    const linkMatch = attachPart.match(/\]\((.*?)\)/);
                                                    const url = linkMatch ? linkMatch[1] : null;
                                                    const nameMatch = attachPart.match(/Archivo Adjunto(?: \(Error\))?: (.*?)\]/);
                                                    const name = nameMatch ? nameMatch[1] : 'Archivo Adjunto';

                                                    return (
                                                        <div className="flex flex-col gap-2">
                                                            {textPart && <span>{textPart}</span>}
                                                            {url ? (
                                                                <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-3 bg-info/10 hover:bg-info/20 rounded-xl border border-info/30 transition-colors font-medium text-xs break-all text-info mt-1">
                                                                    <Paperclip className="w-4 h-4 shrink-0" />
                                                                    <span className="truncate">{name}</span>
                                                                </a>
                                                            ) : (
                                                                <div className="flex items-center gap-2 p-3 bg-black/10 rounded-xl border border-black/5 font-medium text-xs opacity-60 mt-1">
                                                                    <Paperclip className="w-4 h-4 shrink-0" />
                                                                    <span className="truncate">{name} (Local/Simulado)</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                }
                                                return m.content;
                                            })()}
                                        </div>

                                        {/* Acciones Rápidas */}
                                        <div className={cn(
                                            "absolute top-0 opacity-0 group-hover/msg:opacity-100 transition-all flex items-center gap-1 bg-brand-surface border border-brand-border p-1 rounded-xl shadow-2xl z-10 scale-90 group-hover/msg:scale-100",
                                            m.senderId === user?.id ? "right-full mr-2" : "left-full ml-2"
                                        )}>
                                            <button
                                                onClick={() => setReplyToMessage(m)}
                                                className="p-1.5 hover:bg-brand-primary/5 rounded-lg text-brand-text/40 hover:text-info transition-colors"
                                                title="Responder"
                                            >
                                                <Reply className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                                onClick={() => saveMessage(m.id, !!m.isSaved)}
                                                className={cn(
                                                    "p-1.5 hover:bg-brand-primary/5 rounded-lg transition-colors",
                                                    m.isSaved ? "text-warning" : "text-brand-text/40 hover:text-warning"
                                                )}
                                                title={m.isSaved ? "Quitar de guardados" : "Guardar mensaje"}
                                            >
                                                <Bookmark className={cn("w-3.5 h-3.5", m.isSaved && "fill-current")} />
                                            </button>
                                            <button
                                                onClick={() => {
                                                    if (confirm('¿Borrar mensaje?')) removeMessage(m.id);
                                                }}
                                                className="p-1.5 hover:bg-danger/10 rounded-lg text-brand-text/40 hover:text-danger transition-colors"
                                                title="Eliminar"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <form onSubmit={handleSend} className="p-4 bg-brand-bg/40 border-t border-brand-border backdrop-blur-md relative">
                            {/* Visualizador de Respuesta en curso */}
                            {replyToMessage && (
                                <div className="absolute bottom-full left-0 right-0 p-3 bg-info/10 backdrop-blur-xl border-t border-info/20 flex items-center justify-between animate-in slide-in-from-bottom-2 duration-300">
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        <div className="w-1 h-8 bg-info rounded-full shrink-0" />
                                        <div className="flex flex-col overflow-hidden">
                                            <span className="text-[10px] font-black text-info uppercase tracking-widest">Respondiendo a {replyToMessage.senderName}</span>
                                            <p className="text-xs text-brand-text/60 truncate italic">{replyToMessage.content}</p>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleCancelReply}
                                        className="p-2 hover:bg-brand-primary/5 rounded-lg text-brand-text/40 hover:text-brand-text transition-colors"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            )}

                            {/* Visualizador de Archivo Adjunto */}
                            {attachment && (
                                <div className="absolute bottom-full left-0 right-0 p-3 bg-brand-surface border-t border-brand-border flex items-center justify-between animate-in slide-in-from-bottom-2 duration-300 z-10">
                                    <div className="flex items-center gap-3 overflow-hidden text-info">
                                        <div className="w-10 h-10 rounded-xl bg-info/10 flex items-center justify-center shrink-0">
                                            <Paperclip className="w-5 h-5" />
                                        </div>
                                        <div className="flex flex-col overflow-hidden">
                                            <span className="text-[10px] font-black uppercase tracking-widest">Archivo Adjunto Listo</span>
                                            <p className="text-sm font-bold truncate">{attachment.name}</p>
                                            <p className="text-[10px] opacity-60">{Math.round(attachment.size / 1024)} KB</p>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setAttachment(null)}
                                        className="p-2 hover:bg-danger/10 rounded-xl text-brand-text/40 hover:text-danger flex-shrink-0 transition-colors"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                            )}

                            <div className="relative group">
                                <div className="absolute left-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                                    <button
                                        type="button"
                                        className="p-2 text-brand-text/20 hover:text-brand-text/60 hover:bg-brand-primary/5 rounded-lg transition-all"
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
                                    className="w-full bg-brand-surface border border-brand-border rounded-2xl pl-12 pr-24 py-4 text-sm text-brand-text focus:outline-none focus:border-info/50 transition-all font-light placeholder:text-brand-text/20"
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
                                        className="p-2 text-brand-text/20 hover:text-brand-text/60 hover:bg-brand-primary/5 rounded-lg transition-all"
                                        title="Adjuntar archivo o imagen"
                                    >
                                        <Paperclip className="w-4 h-4" />
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={(!input.trim() && !attachment) || isSending}
                                        className="p-2.5 bg-info text-white rounded-xl hover:opacity-90 transition-all active:scale-95 disabled:opacity-20 shadow-lg shadow-info/20"
                                    >
                                        {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>
                            <p className="text-[9px] text-brand-text/10 mt-3 text-center uppercase font-bold tracking-[0.2em]">
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
                        <div className="w-20 h-20 rounded-3xl bg-brand-surface border border-brand-border flex items-center justify-center animate-pulse">
                            <MessageSquare className="w-10 h-10 text-brand-text/10" />
                        </div>
                        <div className="text-center">
                            <h4 className="text-brand-text/60 font-black uppercase tracking-[0.3em] text-xs mb-2">Canal no Seleccionado</h4>
                            <p className="text-brand-text/20 text-[10px] font-mono">Selecciona un canal o colega para iniciar la transmisión...</p>
                        </div>
                    </div>
                )}
            </div >
            {/* Modal de Creación (Canal o Grupo) */}
            {
                (isCreatingChannel || isCreatingGroup) && (
                    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                        <div className="w-full max-w-md bg-brand-surface border border-brand-border rounded-2xl shadow-2xl p-6 animate-in zoom-in-95 duration-300">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-lg font-black uppercase tracking-widest text-brand-text">
                                    {isCreatingChannel ? 'Nuevo Canal' : 'Crear Grupo'}
                                </h3>
                                <button
                                    onClick={() => { setIsCreatingChannel(false); setIsCreatingGroup(false); }}
                                    className="p-2 hover:bg-brand-primary/5 rounded-full text-brand-text/40 transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="space-y-6">
                                <div>
                                    <label className="text-[10px] uppercase font-black text-brand-text/40 tracking-widest mb-2 block">Nombre del {isCreatingChannel ? 'Canal' : 'Grupo'}</label>
                                    <input
                                        type="text"
                                        value={newName}
                                        onChange={(e) => setNewName(e.target.value)}
                                        placeholder={isCreatingChannel ? "ej. Licitaciones-2026" : "ej. La Oficina"}
                                        className="w-full bg-brand-bg border border-brand-border rounded-xl px-4 py-3 text-sm text-brand-text focus:outline-none focus:border-info/50 transition-all font-light"
                                        autoFocus
                                    />
                                </div>

                                <div className="flex items-center justify-between p-4 bg-brand-bg rounded-xl border border-brand-border">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <Clock className="w-3.5 h-3.5 text-warning" />
                                            <span className="text-xs font-bold text-brand-text uppercase tracking-wider">Modo Efímero</span>
                                        </div>
                                        <p className="text-[10px] text-brand-text/40">Los mensajes se autodestruyen después del tiempo definido.</p>
                                    </div>
                                    <button
                                        onClick={() => setIsEphemeral(!isEphemeral)}
                                        className={cn(
                                            "w-12 h-6 rounded-full transition-all relative",
                                            isEphemeral ? "bg-warning/80 shadow-[0_0_15px_rgba(249,115,22,0.3)]" : "bg-brand-border"
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
                                        <label className="text-[10px] uppercase font-black text-brand-text/40 tracking-widest mb-2 block">Duración</label>
                                        <div className="grid grid-cols-3 gap-2">
                                            {['24h', '7d', '30d'].map(d => (
                                                <button
                                                    key={d}
                                                    onClick={() => setDuration(d)}
                                                    className={cn(
                                                        "py-2 text-[10px] uppercase font-black rounded-lg border transition-all",
                                                        duration === d
                                                            ? "bg-warning/20 border-warning text-warning"
                                                            : "bg-brand-bg border-brand-border text-brand-text/20 hover:text-brand-text/40"
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
                                        <label className="text-[10px] uppercase font-black text-brand-text/40 tracking-widest block">Seleccionar Colegas ({selectedProfessionals.length})</label>

                                        {/* Tag list for selected users inside modal */}
                                        {selectedUsersInfo.length > 0 && (
                                            <div className="flex flex-wrap gap-2 mb-2">
                                                {selectedUsersInfo.map(u => (
                                                    <div key={u.id} className="text-[10px] bg-info/10 text-info border border-info/20 rounded-full px-2 py-1 flex items-center gap-1">
                                                        <span>{u.name}</span>
                                                        <button onClick={() => toggleProfessionalSelection({ id: u.id, name: u.name })} className="hover:text-danger hover:bg-danger/10 rounded-full p-0.5">
                                                            <X className="w-2.5 h-2.5" />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* Shared search term is active here too since it's global, but we can instruct them to use the main search box. 
                                            Wait, it's a modal over the main interface, so the main search box is covered! 
                                            We need a specific search box here. 
                                            Let's use the same `searchTerm` for simplicity or a local one. 
                                            Actually, since `searchTerm` auto-populates `searchResults` via useEffect, we can just render an input linked to `searchTerm`! 
                                        */}
                                        <div className="relative">
                                            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-text/20" />
                                            <input
                                                type="text"
                                                value={searchTerm}
                                                onChange={(e) => setSearchTerm(e.target.value)}
                                                placeholder="Buscar por nombre o RUT..."
                                                className="w-full bg-brand-bg border border-brand-border rounded-xl pl-10 pr-4 py-3 text-xs text-brand-text focus:outline-none focus:border-info/50"
                                            />
                                        </div>

                                        <div className="max-h-48 overflow-y-auto custom-scrollbar space-y-1 pr-2">
                                            {searchTerm.length > 2 && searchResults.map(p => (
                                                <div
                                                    key={p.id}
                                                    onClick={() => {
                                                        toggleProfessionalSelection({ id: p.id, name: p.full_name });
                                                        setSearchTerm(''); // Limpiar para buscar otro
                                                    }}
                                                    className={cn(
                                                        "p-2 rounded-lg border transition-all cursor-pointer flex items-center justify-between group",
                                                        selectedProfessionals.includes(p.id)
                                                            ? "bg-info/10 border-info/30"
                                                            : "bg-brand-bg border-transparent hover:bg-brand-primary/5"
                                                    )}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-6 h-6 rounded bg-brand-surface flex items-center justify-center border border-brand-border">
                                                            <UserIcon className="w-3 h-3 text-brand-text/40" />
                                                        </div>
                                                        <span className="text-xs text-brand-text/80">{p.full_name}</span>
                                                    </div>
                                                    <div className={cn(
                                                        "w-4 h-4 rounded-full border flex items-center justify-center transition-all",
                                                        selectedProfessionals.includes(p.id)
                                                            ? "bg-info border-info"
                                                            : "border-brand-border group-hover:border-brand-text/20"
                                                    )}>
                                                        {selectedProfessionals.includes(p.id) && <Check className="w-2.5 h-2.5 text-white" />}
                                                    </div>
                                                </div>
                                            ))}
                                            {searchTerm.length <= 2 && (
                                                <p className="text-[10px] text-brand-text/30 text-center py-4 italic">Escribe al menos 3 caracteres para buscar...</p>
                                            )}
                                        </div>
                                    </div>
                                )}

                                <button
                                    onClick={handleCreate}
                                    disabled={!newName.trim()}
                                    className="w-full py-4 bg-info hover:opacity-90 disabled:opacity-20 text-white rounded-xl font-black uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-2 shadow-xl shadow-info/20"
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

