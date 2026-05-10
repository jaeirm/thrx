import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(req: Request) {
    try {
        const { messages, model } = await req.json();
        
        // Extract keys from headers
        const openaiKey = req.headers.get('x-openai-key') || '';
        const anthropicKey = req.headers.get('x-anthropic-key') || '';
        const googleKey = req.headers.get('x-google-key') || '';

        // Helper to create a readable stream that the client can consume as raw text
        const createTextStream = (iterator: AsyncIterable<string>) => {
            return new ReadableStream({
                async start(controller) {
                    try {
                        for await (const chunk of iterator) {
                            controller.enqueue(new TextEncoder().encode(chunk));
                        }
                        controller.close();
                    } catch (e) {
                        controller.error(e);
                    }
                }
            });
        };

        // --- GEMINI ---
        if (model.includes('gemini')) {
            if (!googleKey) return new NextResponse('Missing Google API Key', { status: 400 });
            
            const genAI = new GoogleGenerativeAI(googleKey);
            const genModel = genAI.getGenerativeModel({ model });
            
            // Convert universal messages to Gemini format
            const systemInstruction = messages.find((m: any) => m.role === 'system')?.content;
            const history = messages.filter((m: any) => m.role !== 'system');
            
            const formattedHistory = history.slice(0, -1).map((m: any) => ({
                role: m.role === 'user' ? 'user' : 'model',
                parts: [{ text: m.content }]
            }));
            const latestMsg = history[history.length - 1].content;
            
            if (systemInstruction) {
                // @ts-ignore - Some older versions of SDK might need different config
                genModel.systemInstruction = { parts: [{ text: systemInstruction }] };
            }

            const chat = genModel.startChat({ history: formattedHistory });
            const result = await chat.sendMessageStream(latestMsg);
            
            async function* geminiIterator() {
                for await (const chunk of result.stream) {
                    const chunkText = chunk.text();
                    yield chunkText;
                }
            }
            
            return new Response(createTextStream(geminiIterator()), {
                headers: { 'Content-Type': 'text/plain; charset=utf-8' }
            });
        }

        // --- OPENAI ---
        if (model.includes('gpt')) {
            if (!openaiKey) return new NextResponse('Missing OpenAI API Key', { status: 400 });
            
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${openaiKey}`
                },
                body: JSON.stringify({
                    model: model,
                    messages: messages.map((m: any) => ({ role: m.role, content: m.content })),
                    stream: true
                })
            });

            if (!response.ok) {
                const err = await response.text();
                return new NextResponse(`OpenAI Error: ${err}`, { status: response.status });
            }

            async function* openaiIterator() {
                const reader = response.body?.getReader();
                const decoder = new TextDecoder();
                if (!reader) return;
                
                let buffer = '';
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    
                    buffer += decoder.decode(value, { stream: true });
                    const lines = buffer.split('\n');
                    buffer = lines.pop() || '';
                    
                    for (const line of lines) {
                        const trimmedLine = line.trim();
                        if (trimmedLine.startsWith('data: ') && trimmedLine !== 'data: [DONE]') {
                            try {
                                const data = JSON.parse(trimmedLine.slice(6));
                                const content = data.choices[0]?.delta?.content;
                                if (content) yield content;
                            } catch (e) {
                                // Ignore parse errors on partial chunks
                            }
                        }
                    }
                }
            }

            return new Response(createTextStream(openaiIterator()), {
                headers: { 'Content-Type': 'text/plain; charset=utf-8' }
            });
        }

        // --- ANTHROPIC ---
        if (model.includes('claude')) {
            if (!anthropicKey) return new NextResponse('Missing Anthropic API Key', { status: 400 });
            
            const systemMessage = messages.find((m: any) => m.role === 'system')?.content;
            const history = messages.filter((m: any) => m.role !== 'system').map((m: any) => ({
                role: m.role === 'assistant' ? 'assistant' : 'user',
                content: m.content
            }));
            
            const response = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': anthropicKey,
                    'anthropic-version': '2023-06-01'
                },
                body: JSON.stringify({
                    model: model,
                    system: systemMessage,
                    messages: history,
                    max_tokens: 4096,
                    stream: true
                })
            });

            if (!response.ok) {
                const err = await response.text();
                return new NextResponse(`Anthropic Error: ${err}`, { status: response.status });
            }

            async function* anthropicIterator() {
                const reader = response.body?.getReader();
                const decoder = new TextDecoder();
                if (!reader) return;
                
                let buffer = '';
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    
                    buffer += decoder.decode(value, { stream: true });
                    const lines = buffer.split('\n');
                    buffer = lines.pop() || '';
                    
                    for (const line of lines) {
                        const trimmedLine = line.trim();
                        if (trimmedLine.startsWith('data: ')) {
                            try {
                                const data = JSON.parse(trimmedLine.slice(6));
                                if (data.type === 'content_block_delta' && data.delta?.text) {
                                    yield data.delta.text;
                                }
                            } catch (e) {
                                // Ignore
                            }
                        }
                    }
                }
            }

            return new Response(createTextStream(anthropicIterator()), {
                headers: { 'Content-Type': 'text/plain; charset=utf-8' }
            });
        }

        return new NextResponse('Unsupported Model', { status: 400 });
    } catch (error: any) {
        console.error("API Error:", error);
        return new NextResponse(`Server Error: ${error.message}`, { status: 500 });
    }
}
