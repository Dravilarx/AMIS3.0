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
    type: 'pdf' | 'doc' | 'excel' | 'markdown' | 'image' | 'video';
    category: 'clinical' | 'legal' | 'logistics' | 'commercial' | 'hr' | 'academic' | 'other';
    contentSummary: string; // Used for semantic search (M9)
    url: string;
    createdAt: string;
    signed?: boolean;
    visibility: 'community' | 'profile' | 'user';
    targetId?: string; // UID del usuario o ID del perfil
    projectId?: string;
    taskId?: string;
    requirementId?: string; // ID del requerimiento de la batería que satisface
}

export interface DocumentRequirement {
    id: string;
    label: string;
    description?: string;
    isRequired: boolean;
    category: Document['category'];
}

export interface DocumentBattery {
    id: string;
    name: string;
    description: string;
    requirements: DocumentRequirement[];
}

