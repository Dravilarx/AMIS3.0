export interface Message {
    id: string;
    senderId: string;
    senderName: string;
    content: string;
    timestamp: string;
    type: 'text' | 'image' | 'file';
    parentId?: string; // Para hilos
    replyTo?: {
        id: string;
        senderName: string;
        content: string;
    };
    isSaved?: boolean; // Para mensajes destacados/guardados
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
    signedAt?: string;
    signerName?: string;
    signatureFingerprint?: string;
    visibility: 'community' | 'profile' | 'user';
    targetId?: string; // UID del usuario o ID del perfil
    projectId?: string;
    taskId?: string;
    requirementId?: string; // ID del requerimiento de la batería que satisface
    /** Campos para Control de Inducción y Auditoría */
    isLocked?: boolean; // Si es true, el usuario no puede borrarlo
    isValidated?: boolean; // Validado por Agrawall AI
    aiObservation?: string; // Feedback de la IA
    expiryDate?: string; // Fecha de vencimiento para alertas
    requestedSigners?: string[]; // Roles o UIDs permitidos para firmar
    status?: 'draft' | 'pending' | 'signed' | 'rejected';
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

