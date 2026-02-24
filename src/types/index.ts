export type Role = 'user' | 'assistant' | 'system';

export interface Attachment {
    id: string;
    url: string;
    type: 'image' | 'file' | 'audio';
    name: string;
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
}

export type ModelType =
    | 'gemini-2.5-flash'
    | 'gemini-2.0-flash'
    // Local Models
    | 'Llama-3.2-3B-Instruct-q4f16_1-MLC'
    | 'Phi-3.5-mini-instruct-q4f16_1-MLC'
    | 'gemma-2-9b-it-q4f32_1-MLC'
    | 'NeuralHermes-2.5-Mistral-7B-q4f16_1-MLC'
    | 'Qwen2-7B-Instruct-q4f16_1-MLC'
    | string; // Allow string for flexibility with dynamic models 
