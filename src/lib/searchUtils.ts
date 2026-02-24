/**
 * Determines if a user query should trigger a web search based on heuristics.
 * This balances efficiency (avoiding search for "hi") with effectiveness (caching "openclaw means?").
 */
export type SearchAction = 'SEARCH' | 'LOCAL';

export const analyzeQuery = (query: string): SearchAction => {
    const q = query.trim().toLowerCase();
    const wordCount = q.split(/\s+/).length;

    // 1. Greeting / Low-Signal Filter (Mandatory)
    // "hi", "hello", "thanks", "ok", "hmm" -> LOCAL
    const greetings = [
        'hi', 'hello', 'hey', 'good morning', 'good afternoon', 'good evening',
        'ok', 'okay', 'thanks', 'thank you', 'cool', 'great', 'yes', 'no', 'bye',
        'hmm', 'ah', 'oh', 'wow'
    ];

    // Clean punctuation
    const cleanQuery = q.replace(/[^\w\s]/g, '');

    // Strict Greeting Rule: < 3 words AND matches greeting list
    if (wordCount < 3 && greetings.includes(cleanQuery)) {
        return 'LOCAL';
    }

    // 2. Everything else -> SEARCH (Always)
    return 'SEARCH';
};

// Deprecated, keeping for backward compatibility if needed temporarily
export const shouldPerformSearch = (query: string): boolean => {
    return analyzeQuery(query) === 'SEARCH';
};
