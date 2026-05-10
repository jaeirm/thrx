import { useCallback, useState } from 'react';
import * as webllm from "@mlc-ai/web-llm";
import { useLocalLLM } from './useLocalLLM';
import { useSystemBridge } from './useSystemBridge';
import { agentTools, executeTool } from '../lib/agentTools';


export const useAgent = () => {
    const { getEngine, isModelLoading, progress, progressText, logs, metrics, loadModel, interrupt, generate } = useLocalLLM();
    const { executeCommand: executeSystemCommand } = useSystemBridge();
    const [isAgentRunning, setIsAgentRunning] = useState(false);


    const quickGen = async (engine: any, messages: any[], stop: string[]) => {
        const res = await engine.chat.completions.create({
            messages,
            stream: false,
            stop,
            max_tokens: 150
        });
        return res.choices[0].message.content || "";
    };

    const prepareMessages = (messages: webllm.ChatCompletionMessageParam[], systemPrompt: string): webllm.ChatCompletionMessageParam[] => {
        const existingSystem = messages.find(m => m.role === "system");
        const mergedContent = existingSystem ? `${existingSystem.content}\n\n${systemPrompt}` : systemPrompt;
        return [
            { role: "system", content: mergedContent },
            ...messages.filter(m => m.role !== "system")
        ];
    };

    const generateAgent = useCallback(async (
        messages: any[], 
        modelId: string, 
        onUpdate: (text: string) => void,
        onStatusUpdate: (status: string | null) => void
    ) => {
        setIsAgentRunning(true);
        const engine = await getEngine(modelId);
        if (!engine) throw new Error("Engine initialization failed");

        try {
            const chatMessages: webllm.ChatCompletionMessageParam[] = messages.map(msg => ({
                role: msg.role as "user" | "assistant" | "system",
                content: msg.content
            }));

            // Inject System Context
            const now = new Date();
            const systemContext = `Current Time: ${now.toLocaleTimeString()}\nDate: ${now.toLocaleDateString()} (${now.toLocaleDateString(undefined, { weekday: 'long' })})`;
            
            const nativeToolModels = ["Hermes", "Llama-3.1"];
            const useNativeTools = nativeToolModels.some(m => modelId.includes(m));

            if (!useNativeTools) {
                // GUIDED PIPELINE for 0.5B models
                let searchResult = "";
                let knowledgeResult = "";
                let mathResult = "";
                let currentQuery = messages[messages.length - 1].content;

                // 1. Intent Analysis (Consolidated for latency)
                onStatusUpdate("Analyzing intent...");
                const intentJson = await quickGen(engine, [
                    { role: "system", content: "Analyze the user query and output ONLY a JSON object with boolean fields 'knowledge' (needs internal docs/personal info), 'search' (needs web info), and 'math' (needs calculation). Example: {\"knowledge\":true,\"search\":false,\"math\":false}" },
                    { role: "user", content: currentQuery }
                ], ["\n"]);
                
                let intent = { knowledge: false, search: false, math: false };
                try {
                    intent = JSON.parse(intentJson.match(/\{.*\}/)?.[0] || "{}");
                } catch (e) {}

                if (intent.knowledge) {
                    onStatusUpdate("Searching knowledge base...");
                    knowledgeResult = await executeTool("knowledge_base_search", { query: currentQuery }, { executeSystemCommand });
                }


                if (intent.search) {
                    onStatusUpdate("Generating search query...");
                    const queryGen = await quickGen(engine, [{ role: "system", content: "Output ONLY a search engine query for this request." }, { role: "user", content: currentQuery }], ["\n"]);
                    onStatusUpdate(`Searching: ${queryGen}...`);
                    searchResult = await executeTool("web_search", { query: queryGen }, { executeSystemCommand });
                }


                if (intent.math) {
                    onStatusUpdate("Generating math expression...");
                    const mathGen = await quickGen(engine, [{ role: "system", content: "Output ONLY a mathematical expression (e.g., 2026-1967) for this request. Use search results if available." }, { role: "user", content: `Query: ${currentQuery}\nSearch Result: ${searchResult}\nKnowledge: ${knowledgeResult}` }], ["\n"]);
                    onStatusUpdate(`Calculating: ${mathGen}...`);
                    mathResult = await executeTool("calculator", { expression: mathGen.replace(/[^0-9+\-*/(). ]/g, '') }, { executeSystemCommand });
                }


                // 4. Final Answer
                onStatusUpdate("Synthesizing...");
                const finalPrompt = `System Context: ${systemContext}
User Query: ${currentQuery}
Knowledge Base: ${knowledgeResult}
Search Results: ${searchResult}
Math Results: ${mathResult}

Answer the user comprehensively based on the above data. If information is missing, admit it.`;
                
                let finalAnswer = "";
                const reply = await engine.chat.completions.create({
                    messages: [
                        { role: "system", content: "You are a helpful AI assistant that answers questions based on provided search results and context." },
                        { role: "user", content: finalPrompt }
                    ],
                    stream: true
                });
                for await (const chunk of reply) {
                    if (chunk.choices[0]?.delta?.content) {
                        finalAnswer += chunk.choices[0].delta.content;
                        onUpdate(finalAnswer);
                    }
                }
                return;
            }

            // NATIVE TOOL CALLING (for Hermes/Llama-3.1)
            let currentMessages = [...chatMessages];
            // Ensure first message is system if we have one
            const hasSystem = currentMessages.some(m => m.role === "system");
            if (!hasSystem) {
                currentMessages.unshift({ role: "system", content: `You are a helpful AI assistant with tool calling capabilities.\n\n${systemContext}` });
            } else {
                // Update existing system message
                currentMessages = currentMessages.map(m => m.role === "system" ? { ...m, content: `${m.content}\n\n${systemContext}` } : m);
            }

            let keepRunning = true;
            let iterations = 0;
            let fullText = "";

            while (keepRunning && iterations < 5) {
                iterations++;
                const reply = await engine.chat.completions.create({
                    messages: currentMessages,
                    stream: true,
                    tools: agentTools,
                    tool_choice: "auto"
                });

                let chunkText = "";
                let toolCallBuilder: any = null;
                for await (const chunk of reply) {
                    const delta = chunk.choices[0]?.delta;
                    if (delta?.content) {
                        chunkText += delta.content;
                        fullText += delta.content;
                        onUpdate(fullText);
                    }
                    if (delta?.tool_calls) {
                        for (const tc of delta.tool_calls) {
                            if (!toolCallBuilder) {
                                toolCallBuilder = {
                                    id: tc.id || `call_${Date.now()}`,
                                    type: "function",
                                    function: { name: tc.function?.name || "", arguments: "" }
                                };
                            }
                            if (tc.function?.arguments) toolCallBuilder.function.arguments += tc.function.arguments;
                        }
                    }
                }

                if (toolCallBuilder) {
                    onStatusUpdate(`Executing ${toolCallBuilder.function.name}...`);
                    const toolResult = await executeTool(toolCallBuilder.function.name, JSON.parse(toolCallBuilder.function.arguments || "{}"), { executeSystemCommand });
                    currentMessages.push({ role: "assistant", content: null, tool_calls: [toolCallBuilder] });
                    currentMessages.push({ role: "tool", tool_call_id: toolCallBuilder.id, content: toolResult });
                } else {

                    keepRunning = false;
                }
            }
        } catch (err) {
            console.error(err);
            throw err;
        } finally {
            setIsAgentRunning(false);
            onStatusUpdate(null);
        }
    }, [getEngine, generate]);

    return { isModelLoading, progress, progressText, logs, metrics, loadModel, generate, generateAgent, interrupt, isAgentRunning };
};
