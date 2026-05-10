import { Attachment } from '@/types';
import { processAndStoreDocument } from './ragEngine';
import { extractStructuredData } from './documentParser';

export const uploadFile = async (file: File, onProgress?: (msg: string) => void, skipRag = false): Promise<Attachment> => {
    try {
        const name = file.name.toLowerCase();
        const isRagSupported = file.type === 'application/pdf' || 
                               file.type === 'text/csv' || 
                               name.endsWith('.pdf') || 
                               name.endsWith('.csv') || 
                               name.endsWith('.xlsx') || 
                               name.endsWith('.xls') || 
                               file.type.startsWith('text/') || 
                               name.endsWith('.txt');

        if (isRagSupported) {
            // Process for RAG (Mark as non-universal if skipRag is true)
            const docId = await processAndStoreDocument(file, onProgress, !skipRag);
            
            let structuredData = undefined;
            if (name.endsWith('.csv') || name.endsWith('.xlsx') || name.endsWith('.xls') || file.type === 'text/csv') {
                try {
                    const data = await extractStructuredData(file);
                    if (data && data.length > 0) structuredData = data;
                } catch (e) {
                    console.error("Failed to extract structured data", e);
                }
            }
            
            return {
                id: docId,
                url: '', 
                type: 'file',
                name: file.name,
                size: file.size,
                isRagDocument: true, // It is still a RAG doc, just maybe not universal
                structuredData
            };
        } else {
            // Standard Base64 approach for Images/Audio (Always chat-specific)
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => {
                    const base64String = reader.result as string;
                    resolve({
                        id: Date.now().toString(),
                        url: base64String,
                        type: file.type.startsWith('image/') ? 'image' :
                              file.type.startsWith('audio/') ? 'audio' : 'file',
                        name: file.name,
                        size: file.size,
                        isRagDocument: false,
                        structuredData: undefined
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
