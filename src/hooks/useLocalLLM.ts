import { useState, useRef, useEffect, useCallback } from 'react';
import * as webllm from "@mlc-ai/web-llm";

export const useLocalLLM = () => {
    const [isModelLoading, setIsModelLoading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [progressText, setProgressText] = useState('');
    const [logs, setLogs] = useState<string[]>([]);
    const [metrics, setMetrics] = useState<string>('');
    const engineRef = useRef<webllm.MLCEngineInterface | null>(null);
    const currentModelIdRef = useRef<string | null>(null);
    const idleTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const isGeneratingRef = useRef<boolean>(false);

    const resetIdleTimer = useCallback(() => {
        if (idleTimeoutRef.current) clearTimeout(idleTimeoutRef.current);
        idleTimeoutRef.current = setTimeout(async () => {
            if (engineRef.current && !isGeneratingRef.current) {
                console.log("[WebLLM] Unloading model due to 2 minutes of inactivity...");
                try {
                    await engineRef.current.unload();
                } catch (e) {
                    console.warn("Unload error", e);
                }
                engineRef.current = null;
                currentModelIdRef.current = null;
                setLogs(prev => [...prev, "Model unloaded to conserve VRAM (idle)."]);
            } else if (isGeneratingRef.current) {
                // If generating, retry in 1 minute
                resetIdleTimer();
            }
        }, 120000); // 2 minutes
    }, []);

    const initEngine = useCallback(async (modelId: string) => {
        setIsModelLoading(true);
        setLogs([]);
        setProgress(0);
        setProgressText('Initializing worker...');

        try {
            if (!engineRef.current) {
                engineRef.current = await webllm.CreateMLCEngine(
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
                    },
                    {
                        context_window_size: 32768
                    }
                );
            } else {
                // Reload model if engine exists
                await engineRef.current.reload(modelId, {
                    context_window_size: 32768
                });
            }

            currentModelIdRef.current = modelId;
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
            resetIdleTimer();
        }
    }, [resetIdleTimer]);

    const generate = useCallback(async (messages: any[], modelId: string, onUpdate: (text: string) => void) => {
        let engine = engineRef.current;

        if (!engine || currentModelIdRef.current !== modelId) {
            engine = await initEngine(modelId);
        }

        if (!engine) throw new Error("Engine initialization failed");

        try {
            const chatMessages: webllm.ChatCompletionMessageParam[] = messages.map(msg => ({
                role: msg.role as "user" | "assistant" | "system",
                content: msg.content
            }));

            isGeneratingRef.current = true;
            const reply = await engine.chat.completions.create({
                messages: chatMessages,
                stream: true,
            });

            let fullText = "";
            let lastUpdate = performance.now();
            for await (const chunk of reply) {
                const delta = chunk.choices[0]?.delta.content || "";
                if (delta) {
                    fullText += delta;
                    const now = performance.now();
                    // Throttle updates to ~20 FPS (every 50ms) to prevent React from choking
                    if (now - lastUpdate > 50) {
                        onUpdate(fullText);
                        lastUpdate = now;
                    }
                }
            }
            // Ensure final update is sent
            onUpdate(fullText);

            const stats = await engine.runtimeStatsText();
            setMetrics(stats);
            setLogs(prev => [...prev, `Generation Complete: ${stats}`]);
        } catch (err) {
            console.error("Generation failed", err);
            throw err;
        } finally {
            isGeneratingRef.current = false;
            resetIdleTimer();
        }
    }, [initEngine, resetIdleTimer]);

    const interrupt = useCallback(async () => {
        const engine = engineRef.current;
        if (engine) {
            await engine.interruptGenerate();
            setIsModelLoading(false);
        }
    }, []);

    const getEngine = useCallback(async (modelId: string) => {
        if (!engineRef.current || currentModelIdRef.current !== modelId) {
            return await initEngine(modelId);
        }
        return engineRef.current;
    }, [initEngine]);

    return {
        isModelLoading,
        progress,
        progressText,
        logs,
        metrics,
        loadModel: initEngine,
        generate,
        interrupt,
        getEngine
    };
};
