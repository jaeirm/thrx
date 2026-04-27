export type Role = 'user' | 'assistant' | 'system';

export interface Attachment {
    id: string;
    url: string; // Base64 data URI or reference
    type: 'image' | 'file' | 'audio';
    name: string;
    isRagDocument?: boolean; // Indicates if it has been embedded
}

export interface Message {
    id: string;
    created_at: string;
    chat_id: string;
    role: Role;
    content: string;
    model?: string;
    attachments?: Attachment[];
    replyTo?: string;
    parentId?: string;
}

export interface Chat {
    id: string;
    created_at: string;
    title: string;
    user_id?: string;
    parentId?: string; // For grouping in sidebar
    rootMessageId?: string; // The message it branched from
    branchText?: string; // The specific text that was branched from the parent message
}

export interface DocumentMeta {
    id: string;
    name: string;
    type: string;
    parsedAt: string;
}

export interface DocumentChunk {
    id: string;
    documentId: string;
    chunkIndex: number;
    text: string;
    vector: number[];
}

export type ModelType =
    | 'gemini-2.5-flash'
    | 'gemini-2.0-flash'
    // Local Models
    | 'Llama-3.2-1B-Instruct-q4f16_1-MLC'
    | 'Llama-3.2-3B-Instruct-q4f16_1-MLC'
    | 'Phi-3.5-mini-instruct-q4f16_1-MLC'
    | 'gemma-2-9b-it-q4f32_1-MLC'
    | 'NeuralHermes-2.5-Mistral-7B-q4f16_1-MLC'
    | 'Qwen2-7B-Instruct-q4f16_1-MLC'
    | string; // Allow string for flexibility with dynamic models 
