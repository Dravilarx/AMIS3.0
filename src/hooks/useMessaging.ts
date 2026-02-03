import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';
import { processChatWithAI } from '../services/messagingAI';
import type { Message, Channel } from '../types/communication';

export const useMessaging = (channelId?: string) => {
    const { user } = useAuth();
    const [messages, setMessages] = useState<Message[]>([]);
    const [channels, setChannels] = useState<Channel[]>([]);
    const [loading, setLoading] = useState(true);

    // Cargar canales
    const fetchChannels = async () => {
        try {
            const { data, error } = await supabase.from('channels').select('*');
            if (error) throw error;
            if (data) {
                setChannels(data.map(c => ({
                    id: c.id,
                    name: c.name,
                    type: c.type as any,
                    updatedAt: c.created_at,
                    isEphemeral: c.is_ephemeral
                })));
            }
        } catch (err) {
            console.error('Error fetching channels:', err);
            setChannels([]);
        }
    };

    // Cargar mensajes y suscribirse
    useEffect(() => {
        fetchChannels();
        if (!channelId) return;

        const fetchMessages = async () => {
            try {
                setLoading(true);

                if (channelId === 'AI-HELPER') {
                    setMessages([{
                        id: 'MSG-AI-WELCOME',
                        senderId: 'AI',
                        senderName: 'Agrawall AI',
                        content: 'Hola. Soy tu asistente Agrawall AI. Estoy listo para usar datos reales de la base de datos.',
                        timestamp: new Date().toISOString(),
                        type: 'text'
                    }]);
                    setLoading(false);
                    return;
                }

                const { data, error } = await supabase
                    .from('messages')
                    .select('*')
                    .eq('channel_id', channelId)
                    .order('created_at', { ascending: true });

                if (error) throw error;

                if (data && data.length > 0) {
                    setMessages(data.map(m => ({
                        id: m.id,
                        senderId: m.sender_id,
                        senderName: m.sender_name,
                        content: m.content,
                        timestamp: m.created_at,
                        type: m.type as any,
                        parentId: m.parent_id,
                        replyTo: m.reply_to,
                        isSaved: m.is_saved
                    })));
                } else {
                    // Si es un canal nuevo o vacío, podemos poner un mensaje de bienvenida de la IA localmente si es AI-HELPER
                    if (channelId === 'AI-HELPER') {
                        setMessages([{
                            id: 'MSG-AI-WELCOME',
                            senderId: 'AI',
                            senderName: 'Agrawall AI',
                            content: 'Hola. Soy tu asistente Agrawall AI. Estoy listo para usar datos reales de la base de datos.',
                            timestamp: new Date().toISOString(),
                            type: 'text'
                        }]);
                    } else {
                        setMessages([]);
                    }
                }
            } catch (err) {
                console.error('Error fetching messages:', err, 'channel:', channelId);
                setMessages([]);
            } finally {
                setLoading(false);
            }
        };

        fetchMessages();

        // SUSCRIPCIÓN REALTIME
        if (channelId !== 'AI-HELPER') {
            const subscription = supabase
                .channel(`channel_${channelId}`)
                .on('postgres_changes', {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'messages',
                    filter: `channel_id=eq.${channelId}`
                }, (payload) => {
                    const newMessage = payload.new as any;
                    setMessages((prev) => {
                        if (prev.some(m => m.id === newMessage.id)) return prev;
                        return [...prev, {
                            id: newMessage.id,
                            senderId: newMessage.sender_id,
                            senderName: newMessage.sender_name,
                            content: newMessage.content,
                            timestamp: newMessage.created_at,
                            type: newMessage.type,
                            parentId: newMessage.parent_id,
                            replyTo: newMessage.reply_to,
                            isSaved: newMessage.is_saved
                        }];
                    });
                })
                .subscribe();

            return () => {
                supabase.removeChannel(subscription);
            };
        }
    }, [channelId]);

    const sendMessage = async (content: string, type: Message['type'] = 'text', options?: { parentId?: string, replyTo?: Message['replyTo'] }) => {
        if (!channelId || !user) return;

        // Optimistic UI for AI-HELPER
        if (channelId === 'AI-HELPER') {
            const userMsg: Message = {
                id: Date.now().toString(),
                senderId: user.id,
                senderName: user.name,
                content,
                timestamp: new Date().toISOString(),
                type,
                ...options
            };
            setMessages(prev => [...prev, userMsg]);

            // Trigger AI Response
            const aiResponse = await processChatWithAI(content);
            const aiMsg: Message = {
                id: (Date.now() + 1).toString(),
                senderId: 'AI',
                senderName: 'Agrawall AI',
                content: aiResponse,
                timestamp: new Date().toISOString(),
                type: 'text',
                parentId: options?.parentId
            };
            setMessages(prev => [...prev, aiMsg]);
            return;
        }

        const { error } = await supabase.from('messages').insert([{
            channel_id: channelId,
            sender_id: user.id,
            sender_name: user.name,
            content,
            type,
            parent_id: options?.parentId,
            reply_to: options?.replyTo
        }]);

        if (error) console.error('Error sending message:', error);
    };

    const deleteMessage = async (id: string) => {
        try {
            const { error } = await supabase.from('messages').delete().eq('id', id);
            if (error) throw error;
            setMessages(prev => prev.filter(m => m.id !== id));
        } catch (err) {
            console.error('Error deleting message:', err);
            // Fallback para modo demo
            setMessages(prev => prev.filter(m => m.id !== id));
        }
    };

    const toggleSaveMessage = async (id: string, currentStatus: boolean) => {
        try {
            const { error } = await supabase.from('messages').update({ is_saved: !currentStatus }).eq('id', id);
            if (error) throw error;
            setMessages(prev => prev.map(m => m.id === id ? { ...m, isSaved: !currentStatus } : m));
        } catch (err) {
            console.error('Error toggling save status:', err);
            // Fallback para modo demo
            setMessages(prev => prev.map(m => m.id === id ? { ...m, isSaved: !currentStatus } : m));
        }
    };

    const createChannel = async (name: string, type: 'project' | 'shift' | 'direct' | 'group', isEphemeralValue: boolean = false, _members?: string[]) => {
        if (!user) return;
        try {
            const { data, error } = await supabase.from('channels').insert([{
                name,
                type,
                is_ephemeral: isEphemeralValue,
                created_by: user.id
            }]).select().single();

            if (data) {
                // Si hay miembros, podrías insertarlos en una tabla channel_members si existiera.
                // Por ahora, asumimos que el canal es visible para los involucrados.
                await fetchChannels();
                return data.id;
            }
            if (error) throw error;
        } catch (err) {
            console.error('Error creating channel:', err);
            // Fallback para modo demo
            const newCh: Channel = {
                id: `CH-${Date.now()}`,
                name,
                type: type as any,
                updatedAt: new Date().toISOString(),
                isEphemeral: isEphemeralValue
            };
            setChannels(prev => [...prev, newCh]);
            return newCh.id;
        }
    };

    const deleteChannel = async (id: string) => {
        try {
            const { error } = await supabase.from('channels').delete().eq('id', id);
            if (error) throw error;
            await fetchChannels();
        } catch (err) {
            console.error('Error deleting channel:', err);
            // Fallback para modo demo
            setChannels(prev => prev.filter(c => c.id !== id));
        }
    };

    return { messages, channels, loading, sendMessage, fetchChannels, createChannel, deleteChannel, deleteMessage, toggleSaveMessage };
};


