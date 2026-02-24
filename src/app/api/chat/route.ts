import { NextRequest, NextResponse } from 'next/server';
import { getGeminiModel } from '@/lib/gemini';
import { Message } from '@/types';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
    try {
        const { messages, model, systemInstruction } = await req.json();

        const geminiModel = getGeminiModel(model || 'gemini-2.5-flash');

        // Convert internal message format to Gemini format
        // Gemini expects: { role: "user" | "model", parts: [{ text: "..." }] }
        // System instruction is handled separately in model config usually, or prepended.
        // transform messages to Gemini history format
        let history = messages.slice(0, -1).map((msg: Message) => ({
            role: msg.role === 'user' ? 'user' : 'model',
            parts: [{ text: msg.content }]
        }));

        // Ensure history starts with user message (Gemini requirement)
        // Remove valid system messages or model messages until we find a user message
        while (history.length > 0 && history[0].role !== 'user') {
            history.shift();
        }

        const lastMessage = messages[messages.length - 1];

        // Start chat
        const chat = geminiModel.startChat({
            history: history,
            generationConfig: {
                maxOutputTokens: 8192,
            },
            // systemInstruction: "You are a helpful assistant." // Optional: Add if needed
        });

        const result = await chat.sendMessageStream(lastMessage.content);

        // Create a stream from the response
        const stream = new ReadableStream({
            async start(controller) {
                const encoder = new TextEncoder();
                try {
                    for await (const chunk of result.stream) {
                        const text = chunk.text();
                        if (text) {
                            controller.enqueue(encoder.encode(text));
                        }
                    }
                } catch (error) {
                    console.error("Stream error:", error);
                    controller.error(error);
                } finally {
                    controller.close();
                }
            }
        });

        return new NextResponse(stream, {
            headers: {
                'Content-Type': 'text/plain; charset=utf-8',
                'Transfer-Encoding': 'chunked',
            },
        });

    } catch (error: any) {
        console.error('Error in chat API:', error);
        return NextResponse.json(
            { error: error.message || 'Internal Server Error' },
            { status: 500 }
        );
    }
}
