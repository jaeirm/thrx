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

export async function processAndStoreDocument(file: File, onProgress?: (msg: string) => void, isUniversal = true): Promise<string> {
    const docId = Date.now().toString() + '-' + file.name;
    const config = getRagConfig();
    
    // 1. Parse File
    if (onProgress) onProgress(`Parsing ${file.name}...`);
    const text = await parseDocument(file);
    
    if (!text || text.trim().length === 0) {
        throw new Error(`Failed to extract text from ${file.name}. The file might be empty, encrypted, or contain only images.`);
    }

    // 2. Add to Dexie metadata
    await db.documents.add({
        id: docId,
        name: file.name,
        type: file.type || file.name.split('.').pop() || 'unknown',
        parsedAt: new Date().toISOString(),
        isUniversal
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

export const identityPhrases = ["who am i", "whats my name", "what is my name", "my name", "who is this", "tell me about myself", "about me", "my profile", "my resume", "my background", "my experience"];

export async function searchRelevantContext(query: string, defaultTopK?: number): Promise<string> {
    const config = getRagConfig();
    const activeTopK = defaultTopK || config.topK || 5;

    // Expand identity queries to improve TF-IDF matching for resumes
    let searchTerms = query.toLowerCase();
    if (identityPhrases.some(p => searchTerms.includes(p))) {
        searchTerms += " name profile resume about biography education experience contact personal";
    }

    // Fetch universal documents (including legacy ones where isUniversal is undefined)
    const universalDocs = await db.documents.filter(d => d.isUniversal !== false).toArray();
    const universalDocIds = universalDocs.map(d => d.id);
    const docNamesMap = new Map(universalDocs.map(d => [d.id, d.name]));

    // Efficiently fetch only chunks belonging to universal documents
    const universalChunks = await db.documentChunks.where('documentId').anyOf(universalDocIds).toArray();
    
    if (universalChunks.length === 0) return '';

    // Compute global IDF for all documents currently in the DB
    const allDocsTokens = universalChunks.map(c => {
        const docName = docNamesMap.get(c.documentId) || '';
        return `${docName} ${c.text}`.toLowerCase().split(/\s+/);
    });
    const globalIdf = computeIDF(allDocsTokens);

    // Score using TF-IDF
    const scoredChunks = universalChunks.map(chunk => {
        const docName = (docNamesMap.get(chunk.documentId) || '').toLowerCase();
        const searchableText = `${docName} ${chunk.text}`;
        let score = scoreChunkTFIDF(searchTerms, searchableText, globalIdf);

        // Boost first chunks of resume/profile documents for identity queries
        const isIdentityQuery = identityPhrases.some(p => query.toLowerCase().includes(p));
        const isResumeDoc = docName.includes("resume") || docName.includes("cv") || docName.includes("profile") || docName.includes("about");
        if (isIdentityQuery && isResumeDoc && chunk.chunkIndex === 0) {
            score += 10; // Significant boost to ensure it's picked up
        }

        return {
            ...chunk,
            score
        };
    });

    // Sort by highest score
    scoredChunks.sort((a, b) => b.score - a.score);
    
    // Filter out zero-score matches
    let validChunks = scoredChunks.filter(c => c.score > 0).slice(0, activeTopK);
    
    // STITCHING: If we have multiple chunks from the same document, 
    // sort them by index and merge if they are adjacent to provide better context flow.
    const chunksByDoc: Record<string, typeof validChunks> = {};
    validChunks.forEach(c => {
        if (!chunksByDoc[c.documentId]) chunksByDoc[c.documentId] = [];
        chunksByDoc[c.documentId].push(c);
    });

    const stitchedContexts = Object.entries(chunksByDoc).map(([docId, chunks]) => {
        chunks.sort((a, b) => a.chunkIndex - b.chunkIndex);
        
        let mergedText = chunks[0].text;
        for (let i = 1; i < chunks.length; i++) {
            // If they are strictly adjacent, merge with a subtle separator
            if (chunks[i].chunkIndex === chunks[i-1].chunkIndex + 1) {
                mergedText += "\n" + chunks[i].text;
            } else {
                mergedText += "\n\n[...] \n\n" + chunks[i].text;
            }
        }
        
        return `[Source: ${docNamesMap.get(docId)}]:\n${mergedText}`;
    });

    console.log(`[RAG Search] Query: "${query}" | Found ${validChunks.length} chunks | Stitched into ${stitchedContexts.length} blocks`);

    if (stitchedContexts.length === 0) {
        console.warn("[RAG] No relevant context found.");
        return '';
    }

    return `\n\n--- UNIVERSAL KNOWLEDGE CONTEXT START ---\n${stitchedContexts.join('\n\n---\n\n')}\n--- UNIVERSAL KNOWLEDGE CONTEXT END ---\n`;
}
