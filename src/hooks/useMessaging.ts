import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';
import { processChatWithAI } from '../services/messagingAI';
import type { Message, Channel } from '../types/communication';

const MOCK_CHANNELS: Channel[] = [
    { id: 'CH-001', name: 'General', type: 'project', updatedAt: new Date().toISOString(), isEphemeral: false },
    { id: 'CH-002', name: 'Licitaciones Críticas', type: 'project', updatedAt: new Date().toISOString(), isEphemeral: false },
    { id: 'CH-003', name: 'Guardia 24h', type: 'shift', updatedAt: new Date().toISOString(), isEphemeral: true }
];

const MOCK_MESSAGES: Record<string, Message[]> = {
    'CH-001': [
        { id: 'MSG-001', senderId: 'AI', senderName: 'Agrawall AI', content: 'Bienvenido al ecosistema AMIS 3.0. ¿En qué puedo ayudarte hoy?', timestamp: new Date().toISOString(), type: 'text' }
    ],
    'AI-HELPER': [
        { id: 'MSG-AI-0', senderId: 'AI', senderName: 'Agrawall AI', content: 'Hola. Soy tu asistente Agrawall AI. Puedo ayudarte a analizar informes, revisar licitaciones o gestionar turnos. ¿Qué necesitas?', timestamp: new Date().toISOString(), type: 'text' }
    ]
};

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
            if (data && data.length > 0) {
                setChannels(data.map(c => ({
                    id: c.id,
                    name: c.name,
                    type: c.type as any,
                    updatedAt: c.created_at,
                    isEphemeral: c.is_ephemeral
                })));
            } else {
                setChannels(MOCK_CHANNELS);
            }
        } catch (err) {
            console.error('Error fetching channels, using mock:', err);
            setChannels(MOCK_CHANNELS);
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
                    setMessages(MOCK_MESSAGES['AI-HELPER']);
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
                        type: m.type as any
                    })));
                } else {
                    setMessages(MOCK_MESSAGES[channelId] || []);
                }
            } catch (err) {
                console.error('Error fetching messages, using mock:', err, 'channel:', channelId);
                setMessages(MOCK_MESSAGES[channelId] || []);
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
                            type: newMessage.type
                        }];
                    });
                })
                .subscribe();

            return () => {
                supabase.removeChannel(subscription);
            };
        }
    }, [channelId]);

    const sendMessage = async (content: string, type: Message['type'] = 'text') => {
        if (!channelId || !user) return;

        // Optimistic UI for AI-HELPER
        if (channelId === 'AI-HELPER') {
            const userMsg: Message = {
                id: Date.now().toString(),
                senderId: user.id,
                senderName: user.name,
                content,
                timestamp: new Date().toISOString(),
                type
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
                type: 'text'
            };
            setMessages(prev => [...prev, aiMsg]);
            return;
        }

        const { error } = await supabase.from('messages').insert([{
            channel_id: channelId,
            sender_id: user.id,
            sender_name: user.name,
            content,
            type
        }]);

        if (error) console.error('Error sending message:', error);
    };

    const createChannel = async (name: string, type: 'project' | 'shift' | 'direct' | 'group', isEphemeralValue: boolean = false) => {
        if (!user) return;
        try {
            const { data, error } = await supabase.from('channels').insert([{
                name,
                type,
                is_ephemeral: isEphemeralValue,
                created_by: user.id
            }]).select().single();

            if (data) {
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

    return { messages, channels, loading, sendMessage, fetchChannels, createChannel, deleteChannel };
};


