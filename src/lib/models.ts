import { ModelType } from "@/types";

export interface AIModel {
    id: ModelType;
    name: string;
    type: 'cloud' | 'local';
    desc: string;
    size?: string; // e.g. "3.8GB"
    vram?: string; // e.g. "4GB"
    provider?: string; // e.g. "Google", "Meta", "Microsoft"
    category: 'mobile' | 'desktop' | 'cloud';
}

export const AVAILABLE_MODELS: AIModel[] = [
    // Cloud Models
    {
        id: 'gemini-2.5-flash',
        name: 'Gemini 2.5 Flash',
        type: 'cloud',
        desc: 'Newest, fast, multimodal',
        provider: 'Google',
        category: 'cloud'
    },
    {
        id: 'gemini-2.0-flash',
        name: 'Gemini 2.0 Flash',
        type: 'cloud',
        desc: 'Previous stable version',
        provider: 'Google',
        category: 'cloud'
    },

    // Local Models (Mobile Optimized)
    {
        id: 'Llama-3.2-1B-Instruct-q4f16_1-MLC',
        name: 'Llama 3.2 1B',
        type: 'local',
        desc: 'Ultra-lightweight, perfect for mobile',
        size: '880MB',
        vram: '1.5GB',
        provider: 'Meta',
        category: 'mobile'
    },
    {
        id: 'Phi-3.5-mini-instruct-q4f16_1-MLC',
        name: 'Phi-3.5 Mini',
        type: 'local',
        desc: 'High performance, efficient',
        size: '2.5GB',
        vram: '3.5GB',
        provider: 'Microsoft',
        category: 'mobile'
    },
    {
        id: 'Llama-3.2-3B-Instruct-q4f16_1-MLC',
        name: 'Llama 3.2 3B',
        type: 'local',
        desc: 'Balanced performance & speed',
        size: '2.4GB',
        vram: '3.5GB',
        provider: 'Meta',
        category: 'mobile'
    },

    // Local Models (High Performance / Desktop)
    {
        id: 'gemma-2-9b-it-q4f32_1-MLC',
        name: 'Gemma 2 9B',
        type: 'local',
        desc: 'Google\'s open model (High RAM)',
        size: '6.4GB',
        vram: '10GB',
        provider: 'Google',
        category: 'desktop'
    },
    {
        id: 'NeuralHermes-2.5-Mistral-7B-q4f16_1-MLC',
        name: 'Hermes 2.5 Mistral',
        type: 'local',
        desc: 'Uncensored, instruction following',
        size: '4.1GB',
        vram: '6GB',
        provider: 'Nous Research',
        category: 'desktop'
    },
    {
        id: 'Qwen2-7B-Instruct-q4f16_1-MLC',
        name: 'Qwen2 7B',
        type: 'local',
        desc: 'Strong multilingual model',
        size: '4.4GB',
        vram: '6GB',
        provider: 'Alibaba',
        category: 'desktop'
    }
];

export const DEFAULT_CLOUD_MODEL = 'gemini-2.5-flash';
export const DEFAULT_LOCAL_MODEL = 'Phi-3.5-mini-instruct-q4f16_1-MLC';
