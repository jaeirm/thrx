// Optimized for Llama 3.2 1B -> Smaller chunks (e.g. 256 tokens ~ 1000 characters) with overlap
export function chunkText(text: string, chunkSize: number = 1000, overlap: number = 200): string[] {
    const chunks: string[] = [];
    let i = 0;
    while (i < text.length) {
        chunks.push(text.slice(i, i + chunkSize));
        i += chunkSize - overlap;
    }
    return chunks;
}

// --------------------------------------------------------------------------------
// Native TF-IDF Search Implementation
// Replaces heavy Neural Embeddings with an instant, crash-proof Javascript algorithm
// --------------------------------------------------------------------------------

/**
 * Normalizes text and splits into lowercase tokens
 */
function tokenize(text: string): string[] {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ') // Replace punctuation with space
        .split(/\s+/)
        .filter(word => word.length > 2); // Ignore extremely short words like "a", "is"
}

/**
 * Computes Term Frequencies for a single document
 */
function computeTF(tokens: string[]): Record<string, number> {
    const tf: Record<string, number> = {};
    if (tokens.length === 0) return tf;
    
    tokens.forEach(token => {
        tf[token] = (tf[token] || 0) + 1;
    });
    
    // Normalize by document length
    for (const token in tf) {
        tf[token] = tf[token] / tokens.length;
    }
    return tf;
}

/**
 * Computes Inverse Document Frequencies across all documents
 */
export function computeIDF(documents: string[][]): Record<string, number> {
    const idf: Record<string, number> = {};
    const N = documents.length;
    
    // Count how many documents contain each word
    documents.forEach(docTokens => {
        const uniqueTokens = new Set(docTokens);
        uniqueTokens.forEach(token => {
            idf[token] = (idf[token] || 0) + 1;
        });
    });
    
    // Calculate smoothed log idf to ensure words in a 1-document database don't get an IDF of 0
    for (const token in idf) {
        idf[token] = Math.log(1 + (N / idf[token]));
    }
    
    return idf;
}

/**
 * Scores a document chunk against a query using TF-IDF
 */
export function scoreChunkTFIDF(query: string, chunk: string, globalIdf: Record<string, number>): number {
    const queryTokens = tokenize(query);
    const chunkTokens = tokenize(chunk);
    
    if (queryTokens.length === 0 || chunkTokens.length === 0) return 0;
    
    const chunkTf = computeTF(chunkTokens);
    
    let score = 0;
    // Score is the sum of TF-IDF for all words in the query that exist in the chunk
    queryTokens.forEach(token => {
        const tf = chunkTf[token] || 0;
        const idf = globalIdf[token] || 0; // If word only exists in query, IDF is 0
        score += tf * idf;
    });
    
    return score;
}
