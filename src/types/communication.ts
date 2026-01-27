export interface Message {
    id: string;
    senderId: string;
    senderName: string;
    content: string;
    timestamp: string;
    type: 'text' | 'image' | 'file';
}

export interface Channel {
    id: string;
    name: string;
    type: 'shift' | 'project' | 'direct';
    lastMessage?: string;
    updatedAt: string;
    isEphemeral?: boolean; // Ephemeral channels for shifts (M8)
}

export interface Document {
    id: string;
    title: string;
    type: 'pdf' | 'doc' | 'image';
    category: 'clinical' | 'legal' | 'logistics';
    contentSummary: string; // Used for semantic search (M9)
    url: string;
    createdAt: string;
    signed?: boolean;
}
