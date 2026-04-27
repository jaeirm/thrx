import { Attachment } from '@/types';
import { processAndStoreDocument } from './ragEngine';

export const uploadFile = async (file: File, onProgress?: (msg: string) => void): Promise<Attachment> => {
    try {
        const isRagSupported = file.type === 'application/pdf' || 
                               file.type === 'text/csv' || 
                               file.name.endsWith('.pdf') || 
                               file.name.endsWith('.csv') || 
                               file.name.endsWith('.xlsx') || 
                               file.name.endsWith('.xls') || 
                               file.type.startsWith('text/') || 
                               file.name.endsWith('.txt');

        if (isRagSupported) {
            // Process for RAG
            const docId = await processAndStoreDocument(file, onProgress);
            
            return {
                id: docId,
                url: '', // No need to store whole file in base64 if it's in DB chunks
                type: 'file',
                name: file.name,
                isRagDocument: true
            };
        } else {
            // Standard Base64 approach for Images/Audio
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => {
                    const base64String = reader.result as string;
                    resolve({
                        id: Date.now().toString(),
                        url: base64String,
                        type: file.type.startsWith('image/') ? 'image' :
                              file.type.startsWith('audio/') ? 'audio' : 'file',
                        name: file.name
                    });
                };
                reader.onerror = (error) => {
                    console.error('Error reading file:', error);
                    reject(error);
                };
                reader.readAsDataURL(file);
            });
        }
    } catch (error) {
        console.error('Error in uploadFile:', error);
        throw error;
    }
};
