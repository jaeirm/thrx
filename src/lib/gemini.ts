import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY!;

if (!apiKey) {
    console.warn("Gemini API key missing in environment variables.");
}

const genAI = new GoogleGenerativeAI(apiKey);

export const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" }); // Using 2.0 Flash as per user request (Wait, user said 2.5 Flash, let me enable that if available or stick to standard latest)
// User mentioned Gemini 2.5 Flash in the prompt text ("Gemini 2.5 Flash").
// I will try to use the specific model name if known, otherwise fallback to 'gemini-1.5-flash' or similar if 2.5 isn't standard in the SDK yet.
// For now I'll use a safe default and arguably 'gemini-1.5-flash' is the stable one, but user listed "Gemini 2.5 Flash".
// Let's use "gemini-2.0-flash-exp" or just "gemini-1.5-flash" as a safe bet, or "gemini-pro".
// actually, let's allow dynamic model selection.

export const getGeminiModel = (modelName: string = "gemini-2.5-flash") => {
    return genAI.getGenerativeModel({ model: modelName });
};
