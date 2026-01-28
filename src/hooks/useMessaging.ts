import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Message, Channel } from '../types/communication';

const MOCK_CHANNELS: Channel[] = [
    { id: 'CH-001', name: 'General', type: 'text', updatedAt: new Date().toISOString(), isEphemeral: false },
    { id: 'CH-002', name: 'Licitaciones Críticas', type: 'project', updatedAt: new Date().toISOString(), isEphemeral: false },
    { id: 'CH-003', name: 'Guardia 24h', type: 'shift', updatedAt: new Date().toISOString(), isEphemeral: true }
];

const MOCK_MESSAGES: Record<string, Message[]> = {
    'CH-001': [
        { id: 'MSG-001', senderId: 'AI', senderName: 'Agrawall AI', content: 'Bienvenido al ecosistema AMIS 3.0. ¿En qué puedo ayudarte hoy?', timestamp: new Date().toISOString(), type: 'text' }
    ]
};

export const useMessaging = (channelId?: string) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [channels, setChannels] = useState<Channel[]>([]);
    const [loading, setLoading] = useState(true);

    // Cargar canales
    const fetchChannels = async () => {
        try {
            const { data, error } = await supabase.from('channels').select('*');
            if (error) throw error;
            if (data) setChannels(data.map(c => ({
                id: c.id,
                name: c.name,
                type: c.type as any,
                updatedAt: c.created_at,
                isEphemeral: c.is_ephemeral
            })));
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
                const { data, error } = await supabase
                    .from('messages')
                    .select('*')
                    .eq('channel_id', channelId)
                    .order('created_at', { ascending: true });

                if (error) throw error;

                if (data) setMessages(data.map(m => ({
                    id: m.id,
                    senderId: m.sender_id,
                    senderName: m.sender_name,
                    content: m.content,
                    timestamp: m.created_at,
                    type: m.type as any
                })));
            } catch (err) {
                console.error('Error fetching messages, using mock:', err);
                setMessages(MOCK_MESSAGES[channelId] || []);
            } finally {
                setLoading(false);
            }
        };

        fetchMessages();

        // SUSCRIPCIÓN REALTIME
        const channel = supabase
            .channel(`channel_${channelId}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'messages',
                filter: `channel_id=eq.${channelId}`
            }, (payload) => {
                const newMessage = payload.new as any;
                setMessages((prev) => [...prev, {
                    id: newMessage.id,
                    senderId: newMessage.sender_id,
                    senderName: newMessage.sender_name,
                    content: newMessage.content,
                    timestamp: newMessage.created_at,
                    type: newMessage.type
                }]);
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [channelId]);

    const sendMessage = async (content: string, senderName: string) => {
        if (!channelId) return;
        await supabase.from('messages').insert([{
            channel_id: channelId,
            sender_id: 'system-user', // Mock user
            sender_name: senderName,
            content,
            type: 'text'
        }]);
    };

    return { messages, channels, loading, sendMessage };
};
