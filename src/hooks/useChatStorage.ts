import { useState, useCallback, useEffect } from 'react';
import { get, set, del, keys } from 'idb-keyval';
import { Chat, Message } from '@/types';

export const useChatStorage = () => {
    const [chats, setChats] = useState<Chat[]>([]);
    const [isLoadingChats, setIsLoadingChats] = useState(true);

    // Load available chats (metadata)
    const loadChats = useCallback(async () => {
        setIsLoadingChats(true);
        try {
            const allKeys = await keys();
            // Filter keys that start with 'chat-metadata-'
            const chatKeys = allKeys.filter(k => typeof k === 'string' && k.startsWith('chat-metadata-'));
            const loadedChats = await Promise.all(chatKeys.map(k => get(k)));

            // Sort by created_at desc
            const sortedChats = (loadedChats.filter(Boolean) as Chat[]).sort((a, b) =>
                new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            );

            setChats(sortedChats);
        } catch (error) {
            console.error('Failed to load chats:', error);
        } finally {
            setIsLoadingChats(false);
        }
    }, []);

    // Load messages for a specific chat
    const loadMessages = useCallback(async (chatId: string): Promise<Message[]> => {
        try {
            const msgs = await get(`chat-messages-${chatId}`);
            return msgs || [];
        } catch (error) {
            console.error(`Failed to load messages for chat ${chatId}:`, error);
            return [];
        }
    }, []);

    // Save a chat (metadata + messages)
    const saveChat = useCallback(async (chat: Chat, messages: Message[]) => {
        try {
            await Promise.all([
                set(`chat-metadata-${chat.id}`, chat),
                set(`chat-messages-${chat.id}`, messages)
            ]);

            // Update local state if it's a new chat or title changed
            setChats(prev => {
                const exists = prev.find(c => c.id === chat.id);
                if (exists) {
                    return prev.map(c => c.id === chat.id ? chat : c);
                }
                return [chat, ...prev];
            });
        } catch (error) {
            console.error(`Failed to save chat ${chat.id}:`, error);
        }
    }, []);

    // Delete a chat
    const deleteChat = useCallback(async (chatId: string) => {
        try {
            await Promise.all([
                del(`chat-metadata-${chatId}`),
                del(`chat-messages-${chatId}`)
            ]);
            setChats(prev => prev.filter(c => c.id !== chatId));
        } catch (error) {
            console.error(`Failed to delete chat ${chatId}:`, error);
        }
    }, []);

    // Clear all chats
    const clearAllChats = useCallback(async () => {
        try {
            const allKeys = await keys();
            const chatKeys = allKeys.filter(k => typeof k === 'string' && (k.startsWith('chat-metadata-') || k.startsWith('chat-messages-')));
            await Promise.all(chatKeys.map(k => del(k)));
            setChats([]);
        } catch (error) {
            console.error('Failed to clear all chats:', error);
        }
    }, []);

    // Initial load
    useEffect(() => {
        loadChats();
    }, [loadChats]);

    return {
        chats,
        isLoadingChats,
        loadMessages,
        saveChat,
        deleteChat,
        clearAllChats,
        refreshChats: loadChats
    };
};
