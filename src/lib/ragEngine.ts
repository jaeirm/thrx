import { db } from './db';
import { parseDocument } from './documentParser';
import { chunkText, computeIDF, scoreChunkTFIDF } from './localEmbedding';

function getRagConfig() {
    try {
        const saved = localStorage.getItem('thrx_rag_config');
        if (saved) return JSON.parse(saved);
    } catch(e) {}
    // Limit default chunk size to 500 to keep LLM context light and extremely fast
    return { chunkSize: 500, chunkOverlap: 100, topK: 3 };
}

export async function processAndStoreDocument(file: File, onProgress?: (msg: string) => void): Promise<string> {
    const docId = Date.now().toString() + '-' + file.name;
    const config = getRagConfig();
    
    // 1. Parse File
    if (onProgress) onProgress(`Parsing ${file.name}...`);
    const text = await parseDocument(file);
    
    // 2. Add to Dexie metadata
    await db.documents.add({
        id: docId,
        name: file.name,
        type: file.type || file.name.split('.').pop() || 'unknown',
        parsedAt: new Date().toISOString()
    });

    // 3. Chunk text
    if (onProgress) onProgress(`Chunking text...`);
    const chunks = chunkText(text, config.chunkSize, config.chunkOverlap);
    
    // 4. Save to DB without Neural Vectors (Instant)
    for (let i = 0; i < chunks.length; i++) {
        if (onProgress) onProgress(`Saving chunk ${i + 1}/${chunks.length}...`);
        
        await db.documentChunks.add({
            id: `${docId}-${i}`,
            documentId: docId,
            chunkIndex: i,
            text: chunks[i],
            vector: [] // Empty vector, no longer needed
        });
    }
    
    if (onProgress) onProgress(`Complete!`);
    return docId;
}

export async function searchRelevantContext(query: string, defaultTopK?: number): Promise<string> {
    const config = getRagConfig();
    const activeTopK = defaultTopK || config.topK || 3;

    // Fetch all chunks
    const allChunks = await db.documentChunks.toArray();
    
    if (allChunks.length === 0) return '';

    // Compute global IDF for all documents currently in the DB
    const allDocsTokens = allChunks.map(c => c.text.toLowerCase().split(/\s+/));
    const globalIdf = computeIDF(allDocsTokens);

    // Score using TF-IDF
    const scoredChunks = allChunks.map(chunk => {
        return {
            ...chunk,
            score: scoreChunkTFIDF(query, chunk.text, globalIdf)
        };
    });

    // Sort by highest score
    scoredChunks.sort((a, b) => b.score - a.score);
    
    // Filter out zero-score matches
    const validChunks = scoredChunks.filter(c => c.score > 0).slice(0, activeTopK);
    
    console.log("[RAG Search Results TF-IDF]:", validChunks.map(c => ({ text: c.text, score: c.score })));

    if (validChunks.length === 0) return '';

    return `\n\n--- DOCUMENT CONTEXT START ---\n${validChunks.map((c, i) => `[Source Chunk ${i+1}]:\n${c.text}`).join('\n\n')}\n--- DOCUMENT CONTEXT END ---\n`;
}
