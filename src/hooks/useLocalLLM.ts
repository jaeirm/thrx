import { useState, useRef, useEffect, useCallback } from 'react';
import * as webllm from "@mlc-ai/web-llm";

export const useLocalLLM = () => {
    const [isModelLoading, setIsModelLoading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [progressText, setProgressText] = useState('');
    const [logs, setLogs] = useState<string[]>([]);
    const engineRef = useRef<webllm.MLCEngineInterface | null>(null);

    const initEngine = useCallback(async (modelId: string) => {
        setIsModelLoading(true);
        setLogs([]);
        setProgress(0);
        setProgressText('Initializing worker...');

        try {
            if (!engineRef.current) {
                // Create a new worker
                const worker = new Worker(
                    new URL('../workers/llm.worker.ts', import.meta.url),
                    { type: 'module' }
                );

                engineRef.current = await webllm.CreateWebWorkerMLCEngine(
                    worker,
                    modelId,
                    {
                        initProgressCallback: (report) => {
                            setProgress(report.progress);
                            setProgressText(report.text);
                            setLogs(prev => {
                                if (prev[prev.length - 1] !== report.text) {
                                    return [...prev, report.text];
                                }
                                return prev;
                            });
                        }
                    }
                );
            } else {
                // Reload model if engine exists
                await engineRef.current.reload(modelId);
            }

            return engineRef.current;
        } catch (error) {
            console.error("Failed to load local model:", error);
            const errorMessage = (error as Error).message || String(error);

            let userMessage = `Error: ${errorMessage}`;
            if (errorMessage.includes('Cache') || errorMessage.includes('quota')) {
                userMessage += ' (Try clearing your browser cache/storage for this site to free up space, or check your connection.)';
            }

            setLogs(prev => [...prev, userMessage]);
            throw error;
        } finally {
            setIsModelLoading(false);
        }
    }, []);

    const generate = useCallback(async (messages: any[], modelId: string, onUpdate: (text: string) => void) => {
        let engine = engineRef.current;

        if (!engine) {
            engine = await initEngine(modelId);
        }

        if (!engine) throw new Error("Engine initialization failed");

        try {
            // Map our messages to WebLLM format if needed, but for now we expect the caller to pass compatible structure
            // or we map it here. Let's map it here to be safe and flexible.
            const chatMessages: webllm.ChatCompletionMessageParam[] = messages.map(msg => ({
                role: msg.role as "user" | "assistant" | "system",
                content: msg.content
            }));

            const reply = await engine.chat.completions.create({
                messages: chatMessages,
                stream: true,
            });

            let fullText = "";
            for await (const chunk of reply) {
                const delta = chunk.choices[0]?.delta.content || "";
                if (delta) {
                    fullText += delta;
                    onUpdate(fullText);
                }
            }
        } catch (err) {
            console.error("Generation failed", err);
            throw err;
        }
    }, [initEngine]);

    const interrupt = useCallback(async () => {
        const engine = engineRef.current;
        if (engine) {
            await engine.interruptGenerate();
            setIsModelLoading(false);
        }
    }, []);

    return {
        isModelLoading,
        progress,
        progressText,
        logs,
        loadModel: initEngine,
        generate,
        interrupt
    };
};
