import { Attachment } from '@/types';

export const uploadFile = async (file: File): Promise<Attachment> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const base64String = reader.result as string;
            resolve({
                id: Date.now().toString(),
                url: base64String, // Store as Base64 Data URI
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
};
