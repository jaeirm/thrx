import Dexie, { type EntityTable } from 'dexie';
import { Chat, Message, DocumentMeta, DocumentChunk } from '@/types';

const db = new Dexie('ChatDB') as Dexie & {
    chats: EntityTable<Chat, 'id'>;
    messages: EntityTable<Message, 'id'>;
    documents: EntityTable<DocumentMeta, 'id'>;
    documentChunks: EntityTable<DocumentChunk, 'id'>;
};

db.version(1).stores({
    chats: 'id, created_at, parentId',
    messages: 'id, chat_id, created_at',
    documents: 'id, parsedAt',
    documentChunks: 'id, documentId'
});

export { db };
