"use client";

import React, { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { MessageBubble } from './MessageBubble';
import { InputArea } from './InputArea';
import { Chat, Message, Attachment, ModelType } from '@/types';
import { ModelSelector } from './ModelSelector';
import { NodeGraph } from './NodeGraph';
import { useChatStorage } from '@/hooks/useChatStorage';
import { useAgent } from '@/hooks/useAgent';
import { useAgentDaemon } from '@/hooks/useAgentDaemon';
import { EmptyState } from './EmptyState';
import { ModelDrawer } from './ModelDrawer';
import { TextSelectionTooltip } from './TextSelectionTooltip';
import { LocalModelStatus } from './LocalModelStatus';
import { BranchDrawer } from './BranchDrawer';
import { SettingsDrawer } from './SettingsDrawer';
import { MetricsTerminal } from './MetricsTerminal';
import { shouldPerformSearch, analyzeQuery } from '@/lib/searchUtils';
import { searchRelevantContext, identityPhrases } from '@/lib/ragEngine';
import { db } from '@/lib/db';
import { cn } from '@/lib/utils';
import { Menu, Zap, Settings, MessageSquare, Map as MapIcon, GitBranch, Quote, Share2, ChevronRight } from 'lucide-react';
import { FolderSyncStatus } from './FolderSyncStatus';
import { SkillSandbox } from './SkillSandbox';
import { DataVizDrawer } from './DataVizDrawer';
import { TerminalDrawer } from './TerminalDrawer';
import { Terminal as TerminalIcon, BarChart3 } from 'lucide-react';

export const ChatInterface = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isDataVizOpen, setIsDataVizOpen] = useState(false);
    const [currentChatId, setCurrentChatId] = useState<string | undefined>(undefined);
    const [allMessages, setAllMessages] = useState<Message[]>([]);
    const [mainActiveMessageId, setMainActiveMessageId] = useState<string | null>(null);
    const [branchActiveMessageId, setBranchActiveMessageId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [currentModel, setCurrentModel] = useState<ModelType>('gemini-2.5-flash');
    const [isModelDrawerOpen, setIsModelDrawerOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isTerminalOpen, setIsTerminalOpen] = useState(false);
    const [isBranchDrawerOpen, setIsBranchDrawerOpen] = useState(false);
    const [branchPointId, setBranchPointId] = useState<string | null>(null);
    const [inputContent, setInputContent] = useState('');
    const [branchInputContent, setBranchInputContent] = useState('');
    const [replyingTo, setReplyingTo] = useState<string | null>(null);
    const [branchReplyingTo, setBranchReplyingTo] = useState<string | null>(null);
    const [branchContextText, setBranchContextText] = useState<string>('');
    const [activeBranchChatId, setActiveBranchChatId] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'chat' | 'graph'>('chat');
    const [showLocalStatus, setShowLocalStatus] = useState(false);
    const [attachmentTokens, setAttachmentTokens] = useState(0);
    const [branchAttachmentTokens, setBranchAttachmentTokens] = useState(0);
    const [isSearchEnabled, setIsSearchEnabled] = useState(true);
    const [isAgentMode, setIsAgentMode] = useState(false);
    const [agentStatus, setAgentStatus] = useState<string | null>(null);
    const [ragStatus, setRagStatus] = useState<string | null>(null);
    const abortControllerRef = React.useRef<AbortController | null>(null);
    const skipNextLoadRef = React.useRef(false);

    const { chats, saveChat, loadMessages, deleteChat, clearAllChats } = useChatStorage();
    const { 
        isModelLoading, 
        progress, 
        progressText, 
        logs, 
        metrics, 
        loadModel, 
        generate: generateLocal,
        generateAgent,
        interrupt: interruptLocal,
        isAgentRunning 
    } = useAgent();
    
    const handleTelegramMessage = async (chatId: string, text: string): Promise<string> => {
        return new Promise(async (resolve, reject) => {
             let finalContent = "Sorry, failed to generate.";
             
             if (currentModel.includes('gemini') || currentModel.includes('gpt') || currentModel.includes('claude')) {
                 // Cloud Generation for Telegram
                 try {
                     const openaiKey = localStorage.getItem('thrx_openai_key') || '';
                     const anthropicKey = localStorage.getItem('thrx_anthropic_key') || '';
                     const googleKey = localStorage.getItem('thrx_google_key') || '';
                     
                     if (currentModel.includes('gpt') && !openaiKey) throw new Error("Missing OpenAI API Key in Settings");
                     if (currentModel.includes('claude') && !anthropicKey) throw new Error("Missing Anthropic API Key in Settings");
                     if (currentModel.includes('gemini') && !googleKey) throw new Error("Missing Google API Key in Settings");

                     const response = await fetch('/api/chat', {
                         method: 'POST',
                         headers: { 
                             'Content-Type': 'application/json',
                             'x-openai-key': openaiKey,
                             'x-anthropic-key': anthropicKey,
                             'x-google-key': googleKey
                         },
                         body: JSON.stringify({
                             messages: [{ role: 'user', content: text }],
                             model: currentModel
                         })
                     });
                     
                     if (!response.ok) {
                         const errText = await response.text();
                         throw new Error(`Failed to fetch from cloud: ${errText}`);
                     }
                     
                     const reader = response.body?.getReader();
                     const decoder = new TextDecoder();
                     let aiContent = '';
                     
                     if (reader) {
                         while (true) {
                             const { done, value } = await reader.read();
                             if (done) break;
                             aiContent += decoder.decode(value, { stream: true });
                         }
                     }
                     resolve(aiContent || finalContent);
                 } catch (e: any) {
                     console.error("[Telegram Cloud] Error:", e);
                     reject(new Error("Cloud API Error: " + (e.message || "Unknown error")));
                 }
             } else {
                 // Local WebLLM Generation for Telegram
                 generateLocal([{ role: 'user', content: text }], currentModel, (chunk) => {
                     finalContent = chunk;
                 }).then(() => {
                     resolve(finalContent);
                 }).catch((e: any) => {
                     console.error("[Telegram LLM] Error:", e);
                     reject(new Error("Local WebLLM Error: " + (e.message || "Unknown error")));
                 });
             }
        });
    };

    // Mount the background pseudo-daemon
    useAgentDaemon(handleTelegramMessage);

    const messagesEndRef = React.useRef<HTMLDivElement>(null);
    const scrollContainerRef = React.useRef<HTMLDivElement>(null);
    const [isUserScrolled, setIsUserScrolled] = useState(false);

    const handleScroll = () => {
        if (!scrollContainerRef.current) return;
        const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
        const isNearBottom = scrollHeight - scrollTop - clientHeight < 150;
        setIsUserScrolled(!isNearBottom);
    };

    const getTrail = (targetId: string | null) => {
        if (!targetId) return [];
        const trail: Message[] = [];
        let curr: Message | undefined = allMessages.find(m => m.id === targetId);
        while (curr) {
            trail.unshift(curr);
            curr = allMessages.find(m => m.id === curr?.parentId);
        }
        return trail;
    };

    const activeChatRef = React.useMemo(() => chats.find(c => c.id === currentChatId), [chats, currentChatId]);

    // Filter messages to show only the trail to the active message
    const messages = React.useMemo(() => {
        let fullTrail: Message[] = [];
        const targetId = mainActiveMessageId;
        if (!targetId) {
            // If no active message, but we have messages, default to the latest leaf
            if (allMessages.length > 0) {
                // Find all messages that are NOT parents of anyone
                const parentIds = new Set(allMessages.map(m => m.parentId).filter(Boolean));
                const leaves = allMessages.filter(m => !parentIds.has(m.id));
                // Sort leaves by date and pick latest
                const latestLeaf = leaves.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];

                fullTrail = getTrail(latestLeaf?.id || null);
            }
        } else {
            fullTrail = getTrail(targetId);
        }

        if (activeChatRef && activeChatRef.rootMessageId) {
            const rootIndex = fullTrail.findIndex(m => m.id === activeChatRef.rootMessageId);
            if (rootIndex !== -1) {
                return fullTrail.slice(rootIndex + 1);
            }
        }

        return fullTrail;
    }, [allMessages, mainActiveMessageId, activeChatRef]);

    const branchMessages = React.useMemo(() => {
        if (!isBranchDrawerOpen || !branchPointId || !branchActiveMessageId) return [];

        // Trace from branchActiveMessageId back to branchPointId (exclusive)
        const fullTrail = getTrail(branchActiveMessageId);
        const branchPointIndex = fullTrail.findIndex(m => m.id === branchPointId);

        if (branchPointIndex === -1) return fullTrail;
        return fullTrail.slice(branchPointIndex + 1);
    }, [allMessages, branchActiveMessageId, isBranchDrawerOpen, branchPointId]);

    const activeDataVizMessage = React.useMemo(() => {
        // Find the most recent message in the trail that has structured data
        for (let i = messages.length - 1; i >= 0; i--) {
            const att = messages[i].attachments?.find(a => a.structuredData && a.structuredData.length > 0);
            if (att) return { data: att.structuredData, fileName: att.name };
        }
        return null;
    }, [messages]);

    // Close data viz if no active data when switching chats
    useEffect(() => {
        if (!activeDataVizMessage) setIsDataVizOpen(false);
    }, [activeDataVizMessage]);

    const scrollToBottom = (force = false) => {
        if (!force && isUserScrolled) return;
        // Only use smooth scrolling if it's forced (e.g. initial load or intentional scroll to bottom), 
        // to prevent jerky behavior during generation
        messagesEndRef.current?.scrollIntoView({ behavior: force ? "smooth" : "auto" });
    };

    useEffect(() => {
        // When messages change, only auto-scroll if user hasn't scrolled up manually
        scrollToBottom();
    }, [messages, isLoading]);

    // Force scroll to bottom on new chat
    useEffect(() => {
        setIsUserScrolled(false);
        setTimeout(() => scrollToBottom(true), 100);
    }, [currentChatId]);

    // Load messages when chat changes
    useEffect(() => {
        if (currentChatId) {
            if (skipNextLoadRef.current) {
                skipNextLoadRef.current = false;
                return;
            }
            loadMessages(currentChatId).then(msgs => {
                setAllMessages(msgs);
                // Reset active message to latest leaf on chat change
                setMainActiveMessageId(null);
                setBranchActiveMessageId(null);
            });
        } else {
            setAllMessages([]);
            setMainActiveMessageId(null);
            setBranchActiveMessageId(null);
        }
    }, [currentChatId, loadMessages]);



    // Initial persistence of model choice & Mobile Detection
    useEffect(() => {
        const savedModel = localStorage.getItem('thrx_model');
        if (savedModel) {
            setCurrentModel(savedModel as ModelType);
        } else {
            // No saved model, check for mobile
            const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
            if (isMobile) {
                console.log("Mobile device detected, defaulting to lightweight model.");
                setCurrentModel('Llama-3.2-1B-Instruct-q4f16_1-MLC');
                localStorage.setItem('thrx_model', 'Llama-3.2-1B-Instruct-q4f16_1-MLC'); // Save this preference so it sticks
            }
        }
    }, []);

    const handleModelSelect = async (model: ModelType) => {
        setCurrentModel(model);
        localStorage.setItem('thrx_model', model);
        setIsModelDrawerOpen(false);

        if (!model.includes('gemini')) {
            // It's a local model, trigger load immediately
            setShowLocalStatus(true);
            try {
                // We don't await this blocking UI, but we trigger it
                loadModel(model).catch(e => console.error("Background load failed", e));
            } catch (e) {
                console.error("Model load failed", e);
            }
        }
    };

    const handleStop = async () => {
        if (currentModel.includes('gemini')) {
            // Stop Cloud
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
                abortControllerRef.current = null;
            }
        } else {
            // Stop Local
            if (interruptLocal) {
                await interruptLocal();
            }
        }
        setIsLoading(false);
    };

    const handleBranch = (text: string, messageId?: string) => {
        if (messageId) {
            setBranchPointId(messageId);
            setBranchActiveMessageId(messageId);
        } else {
            const lastId = messages[messages.length - 1]?.id || null;
            setBranchPointId(lastId);
            setBranchActiveMessageId(lastId);
        }
        setBranchReplyingTo(text);
        setBranchContextText(text);
        setActiveBranchChatId(null);
        setIsBranchDrawerOpen(true);
    };

    const handleQuote = (text: string, messageId?: string) => {
        if (messageId) {
            setMainActiveMessageId(messageId);
        }
        setReplyingTo(text);
    };

    const handleSendMessage = async (content: string, attachments: Attachment[], customReplyTo?: string | null) => {
        if (!content.trim() && attachments.length === 0) return;

        // UI Content: Clean (no "Referring to..." prefix)
        // AI Context: Will be constructed separately
        let uiContent = content;

        let chatId = (isBranchDrawerOpen && activeBranchChatId) ? activeBranchChatId : currentChatId;
        let newChatCreated = false;
        let activeChatObj = chats.find(c => c.id === chatId);

        // BRANCHING LOGIC: If sending from drawer, create a NEW sub-chat
        if (customReplyTo && currentChatId) {
            let actualParentChatId = currentChatId;
            if (branchPointId) {
                const sourceMsg = allMessages.find(m => m.id === branchPointId);
                if (sourceMsg && sourceMsg.chat_id) {
                    actualParentChatId = sourceMsg.chat_id;
                }
            }

            const newBranchChatId = Date.now().toString();
            const newBranchChat: Chat = {
                id: newBranchChatId,
                title: content.slice(0, 30) + (content.length > 30 ? '...' : ''),
                created_at: new Date().toISOString(),
                parentId: actualParentChatId,
                rootMessageId: branchPointId || undefined,
                branchText: customReplyTo || undefined
            };

            // Ancestors path to branch from
            const ancestors = getTrail(branchPointId);

            // ENVIRONMENT ISOLATION: Prune the local state to just this path
            setAllMessages(ancestors);
            setMainActiveMessageId(branchPointId);
            setBranchActiveMessageId(null);

            await saveChat(newBranchChat, ancestors);

            // Switch to the new session
            skipNextLoadRef.current = true;
            chatId = newBranchChatId;
            setActiveBranchChatId(newBranchChatId);
            newChatCreated = true;
            activeChatObj = newBranchChat;
        } else if (!chatId) {
            chatId = Date.now().toString();
            skipNextLoadRef.current = true;
            setCurrentChatId(chatId);
            newChatCreated = true;

            const newChat: Chat = {
                id: chatId,
                title: content.slice(0, 30) + (content.length > 30 ? '...' : ''),
                created_at: new Date().toISOString()
            };

            await saveChat(newChat, []);
            activeChatObj = newChat;
        }

        const parentId = (customReplyTo
            ? branchActiveMessageId
            : (messages[messages.length - 1]?.id)) || undefined;

        const userMsg: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: uiContent,
            created_at: new Date().toISOString(),
            chat_id: chatId,
            attachments,
            replyTo: (customReplyTo !== undefined ? customReplyTo : replyingTo) || undefined, // Explicit metadata
            parentId: parentId
        };

        // Clear reply state
        if (customReplyTo) {
            setBranchReplyingTo(null);
        } else {
            setReplyingTo(null);
        }

        // Optimistic update
        setAllMessages(prev => [...prev, userMsg]);
        if (isBranchDrawerOpen) {
            setBranchActiveMessageId(userMsg.id);
        } else {
            setMainActiveMessageId(userMsg.id);
        }
        setIsLoading(true);

        const aiMsgId = (Date.now() + 1).toString();
        const aiMsg: Message = {
            id: aiMsgId,
            role: 'assistant',
            content: '',
            created_at: new Date().toISOString(),
            chat_id: chatId,
            model: currentModel,
            parentId: userMsg.id
        };
        setAllMessages(prev => [...prev, aiMsg]);
        if (isBranchDrawerOpen) {
            setBranchActiveMessageId(aiMsgId);
        } else {
            setMainActiveMessageId(aiMsgId);
        }

        const getTrailFromList = (list: Message[], leafId: string | null) => {
            if (!leafId) return [];
            const trail: Message[] = [];
            let curr = list.find(m => m.id === leafId);
            while (curr) {
                trail.unshift(curr);
                curr = list.find(m => m.id === curr?.parentId);
            }
            return trail;
        };

        // Handle attachments for local model compatibility (if needed) or just pass them through
        // Currently useLocalLLM assumes text mostly, but we can extend later.

        try {
            let willSearch = false;

            // Note: analyzeQuery logic might need context too? 
            // "Detailed" check handles this implicitly by not searching for greetings.
            // For now, check based on raw content is fine.

            if (isSearchEnabled) {
                // 1. Greeting / Low-Signal Filter
                const action = analyzeQuery(content);
                const isIdentityQuery = identityPhrases.some(p => content.toLowerCase().includes(p));

                if (action === 'LOCAL' || isIdentityQuery) {
                    console.log("[Search Logic] Personal or Greeting detected -> Skipping Web Search");
                    willSearch = false;
                } else {
                    // 2. Standard Query -> Executing Search
                    willSearch = true;
                }
            }

            // Search Context
            let finalSearchContext = "";

            // Function to perform search and augment content with Compressed Context
            const performWebSearch = async (query: string) => {
                // Context-Aware Query Rewriting
                // This logic needs to use the same 'replyingTo' or context logic
                // But wait, 'replyingTo' was cleared above via setReplyingTo(null)
                // However, 'userMsg' has it, or we captured it in local scope before clearing?
                // Actually setReplyingTo is async/state, but 'replyingTo' var in existing closure is stale/current?
                // It is const from render? Yes. So 'replyingTo' variable here is still valid.

                try {
                    const searchRes = await fetch('/api/search', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ query })
                    });

                    if (searchRes.ok) {
                        const searchData = await searchRes.json();

                        // 3. Context Compression
                        // Extract only Title, Snippet, URL. Limit to top 4 results.
                        if (searchData.results && searchData.results.length > 0) {
                            const compressedContext = searchData.results
                                .slice(0, 4) // Top 4 only
                                .map((r: any, i: number) => `Result ${i + 1}:\nTitle: ${r.title}\nSource: ${r.url}\nSummary: ${r.content}`)
                                .join('\n\n');

                            // 4. Clean Reply Prompt Design using XML
                            return `<web_search_results>\n${compressedContext}\n</web_search_results>`;
                        }
                    }
                } catch (e) {
                    console.error("Search error", e);
                }
                return null;
            };

            if (willSearch) {
                // Calculate effective search query
                let searchQuery = content;

                if (userMsg.replyTo) { // Use local userMsg data which is safe
                    searchQuery = `${userMsg.replyTo} ${content}`;
                    console.log(`[Search Logic] Selection detected -> Search Query: "${searchQuery}"`);
                } else if (content.split(' ').length < 5 && messages.length > 0) {
                    const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
                    if (lastUserMsg) {
                        searchQuery = `${lastUserMsg.content} ${content}`;
                        console.log(`[Search Logic] Short query -> Rewritten: "${searchQuery}"`);
                    }
                }

                const searchContext = await performWebSearch(searchQuery);
                if (searchContext) finalSearchContext = searchContext;
            }

            // --- LOCAL RAG CONTEXT SEARCH ---
            let ragContext = "";
            try {
                const queryToSearch = userMsg.replyTo ? `${userMsg.replyTo} ${content}` : content;
                
                // If the user explicitly attached a document, dump its contents directly into context
                if (userMsg.attachments && userMsg.attachments.some(a => a.isRagDocument)) {
                    const attachedRagDocs = userMsg.attachments.filter(a => a.isRagDocument);
                    let attachedText = "";
                    for (const att of attachedRagDocs) {
                        const chunks = await db.documentChunks.where('documentId').equals(att.id).toArray();
                        chunks.sort((a, b) => a.chunkIndex - b.chunkIndex);
                        attachedText += `\nDocument Name: ${att.name}\n`;
                        attachedText += chunks.map(c => c.text).join('\n\n');
                    }
                    ragContext = `\n\n--- ATTACHED DOCUMENT CONTEXT ---\n${attachedText}\n--- END ATTACHED DOCUMENT CONTEXT ---\n`;
                } else {
                    // SMART RAG: Perform a lightweight intent check even in standard mode
                    // to see if we should search the knowledge base.
                    const isIdentityQuery = identityPhrases.some(p => queryToSearch.toLowerCase().includes(p));
                    const needsKnowledge = queryToSearch.length > 5 && (
                        analyzeQuery(queryToSearch) === 'SEARCH' || isIdentityQuery
                    );

                    if (needsKnowledge) {
                        setRagStatus("Searching personal files...");
                        // Use more context (4) for identity to prevent cutoffs, 2 for speed elsewhere
                        const topK = isIdentityQuery ? 4 : 2;
                        ragContext = await searchRelevantContext(queryToSearch, topK);
                        if (ragContext) setRagStatus("Context found!");
                        else setRagStatus(null);
                        setTimeout(() => setRagStatus(null), 2000);
                    }
                }
            } catch (e) {
                console.error("Local RAG search failed:", e);
            }

            // Construct Context Blocks for System Role
            let systemContext = "You are Thrx, a professional AI assistant.";
            const contextBlocks = [];
            if (ragContext) contextBlocks.push(ragContext);
            if (finalSearchContext) contextBlocks.push(finalSearchContext);

            if (contextBlocks.length > 0) {
                const mergedContext = contextBlocks.join('\n\n').slice(0, 3000);
                systemContext = `You are Thrx, a professional AI assistant. The following context contains authorized personal information about the user you are talking to, retrieved from their local files. Use this information to answer their personal questions accurately.
                
--- USER DATA CONTEXT START ---
${mergedContext}
--- USER DATA CONTEXT END ---`;
            }

            // Construct pure AI Prompt for the User Role
            let aiPromptContent = content;
            if (userMsg.attachments && userMsg.attachments.some(a => a.isRagDocument) && content.split(' ').length < 10) {
                aiPromptContent = `${content}\n\n(Note: I have attached a document. Please prioritize performing the requested action on the attached data rather than providing a generic definition.)`;
            }
            if (userMsg.replyTo) {
                aiPromptContent = `Context: "${userMsg.replyTo}"\n\n${aiPromptContent}`;
            }

            let shouldRunLocal = !['gemini', 'gpt', 'claude'].some(provider => currentModel.toLowerCase().includes(provider));
            let fallbackTriggered = false;

            if (!shouldRunLocal) {
                // Cloud Generation
                const openaiKey = localStorage.getItem('thrx_openai_key') || '';
                const anthropicKey = localStorage.getItem('thrx_anthropic_key') || '';
                const googleKey = localStorage.getItem('thrx_google_key') || '';
                
                let missingKey = '';
                if (currentModel.includes('gpt') && !openaiKey) missingKey = "OpenAI API Key";
                if (currentModel.includes('claude') && !anthropicKey) missingKey = "Anthropic API Key";
                if (currentModel.includes('gemini') && !googleKey) missingKey = "Google API Key";

                if (missingKey) {
                    setAllMessages(prev => prev.map(msg => 
                        msg.id === aiMsgId 
                            ? { ...msg, role: 'system', content: `⚠️ Missing ${missingKey} in Settings. Please add your key to use cloud models, or switch to a local model for offline use.` } 
                            : msg
                    ));
                    setIsLoading(false);
                    return;
                }

                let cloudHistory = [];
                if (systemContext) {
                    cloudHistory.push({ role: 'system', content: systemContext });
                }
                cloudHistory.push(...getTrail(parentId || null));
                cloudHistory.push({ ...userMsg, content: aiPromptContent });

                try {
                    const response = await fetch('/api/chat', {
                        method: 'POST',
                        headers: { 
                            'Content-Type': 'application/json',
                            'x-openai-key': openaiKey,
                            'x-anthropic-key': anthropicKey,
                            'x-google-key': googleKey
                        },
                        body: JSON.stringify({
                            messages: cloudHistory.map(m => ({
                                role: m.role,
                                content: m.content,
                                attachments: (m as any).attachments // Pass attachments to API safely
                            })),
                            model: currentModel
                        })
                    });

                    if (!response.ok) {
                        const errorText = await response.text();
                        console.warn(`Cloud API Failed (${response.status}): ${errorText}. Falling back to local model.`);
                        fallbackTriggered = true;
                        shouldRunLocal = true;
                    } else if (!response.body) {
                        throw new Error('No response body');
                    } else {
                        const reader = response.body.getReader();
                        const decoder = new TextDecoder();
                        let aiContent = '';

                        while (true) {
                            const { done, value } = await reader.read();
                            if (done) break;
                            const text = decoder.decode(value, { stream: true });
                            aiContent += text;

                            setAllMessages(prev => prev.map(msg =>
                                msg.id === aiMsgId ? { ...msg, content: aiContent } : msg
                            ));
                        }

                        // Save complete chat after generation
                        const chatToSave = activeChatObj || { id: chatId, title: 'New Chat', created_at: new Date().toISOString() };
                        const latestAllMessages = await new Promise<Message[]>(resolve => {
                            setAllMessages(prev => {
                                resolve(getTrailFromList(prev, aiMsgId));
                                return prev;
                            });
                        });
                        await saveChat(chatToSave, latestAllMessages);
                        console.log("[Storage] AI response saved.");
                    }
                } catch (error) {
                    console.warn(`Cloud API Network Error. Falling back to local model.`, error);
                    fallbackTriggered = true;
                    shouldRunLocal = true;
                }
            }

            if (shouldRunLocal) {
                // Local Generation
                // Slidding Windows: Limit history to last 5 messages to dramatically speed up WebLLM prefill tokens
                const fullHistory = getTrail(parentId || null);
                const recentHistory = fullHistory.slice(-5);
                
                let history = [];
                if (systemContext) {
                    history.push({ role: 'system', content: systemContext });
                }
                history.push(...recentHistory);
                history.push({ ...userMsg, content: aiPromptContent });
                
                const fallbackPrefix = fallbackTriggered ? "> *[Cloud API failed. Falling back to local offline AI processing...]*\n\n" : "";
                let generatedText = fallbackPrefix;

                const baseHistory = getTrailFromList(allMessages, parentId || null);
                const cleanHistoryToSave = [...baseHistory, userMsg, aiMsg];

                // Persist Current State BEFORE sending
                const chatToSave = activeChatObj || { id: chatId, title: 'New Chat', created_at: new Date().toISOString() };
                await saveChat(chatToSave, cleanHistoryToSave);

                console.log("[Storage] User message saved before generation.");

                const localModelToUse = fallbackTriggered ? 'Llama-3-8B-Instruct-q4f32_1-MLC' : currentModel;

                if (isAgentMode && !fallbackTriggered) {
                    await generateAgent(history, localModelToUse, (text) => {
                        generatedText = text;
                        setAllMessages(prev => prev.map(msg =>
                            msg.id === aiMsgId ? { ...msg, content: text } : msg
                        ));
                    }, setAgentStatus);
                } else {
                    if (fallbackTriggered) {
                        setAllMessages(prev => prev.map(msg =>
                            msg.id === aiMsgId ? { ...msg, content: generatedText } : msg
                        ));
                    }
                    await generateLocal(history, localModelToUse, (text) => {
                        generatedText = fallbackPrefix + text;
                        setAllMessages(prev => prev.map(msg =>
                            msg.id === aiMsgId ? { ...msg, content: generatedText } : msg
                        ));
                    });
                }

                // Save complete chat after generation
                setAllMessages(prev => {
                    const updated = prev.map(msg => msg.id === aiMsgId ? { ...msg, content: generatedText } : msg);
                    saveChat(chatToSave, getTrailFromList(updated, aiMsgId));
                    return updated;
                });
                console.log("[Storage] AI response saved.");

                // 6. Optional Uncertainty Fallback
                // Check if the model refused due to lack of knowledge
                const refusalPhrases = [
                    "i don't have access", "i cannot browse", "as an ai", "knowledge cutoff",
                    "i'm not aware", "i do not have real-time"
                ];
                const isRefusal = refusalPhrases.some(p => generatedText.toLowerCase().includes(p));

                if (isRefusal && !willSearch && isSearchEnabled) { // Only fallback if we DIDN'T search already
                    console.log("[Fallback] Refusal detected -> Triggering Emergency Search");

                    // Update UI to show we are falling back
                    setAllMessages(prev => prev.map(msg =>
                        msg.id === aiMsgId ? { ...msg, content: generatedText + "\n\n*[Auto-Fallback: Browsing web for real-time info...]*" } : msg
                    ));

                    const fallbackContext = await performWebSearch(content);

                    if (fallbackContext) {
                        // Regenerate with new context
                        aiPromptContent = fallbackContext;
                        history = [...getTrail(parentId || null), { ...userMsg, content: aiPromptContent }];

                        await generateLocal(history, currentModel, (text) => {
                            setAllMessages(prev => {
                                const updated = prev.map(msg => msg.id === aiMsgId ? { ...msg, content: text } : msg);
                                saveChat(chatToSave, getTrailFromList(updated, aiMsgId));
                                return updated;
                            });
                        });
                    }
                }
            }
        } catch (error) {
            console.error(error);
            setAllMessages(prev => [...prev, {
                id: Date.now().toString(),
                role: 'system',
                content: 'Error: Failed to get response from AI. ' + (error as any).message,
                created_at: new Date().toISOString(),
                chat_id: currentChatId || 'temp',
                parentId: aiMsgId
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex h-screen bg-background text-foreground overflow-hidden relative font-sans selection:bg-blue-500/30">
            {/* Global Skill Sandbox */}
            <SkillSandbox />

            {/* Top Progress Bar - REMOVED in favor of Modal */}


            <Sidebar
                isOpen={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
                chats={chats}
                currentChatId={currentChatId}
                onSelectChat={setCurrentChatId}
                onNewChat={() => {
                    setCurrentChatId(undefined);
                    setAllMessages([]);
                    setMainActiveMessageId(null);
                    setBranchActiveMessageId(null);
                    setIsSidebarOpen(false);
                }}
                onClearChats={() => {
                    clearAllChats();
                    setCurrentChatId(undefined);
                    setAllMessages([]);
                    setMainActiveMessageId(null);
                    setBranchActiveMessageId(null);
                    setIsSidebarOpen(false);
                }}
                onSettingsClick={() => setIsSettingsOpen(true)}
            />

            <div className="flex-1 flex flex-col h-full relative z-10 min-w-0">
                {/* Custom Thrx Header */}
                <header className="h-16 flex items-center justify-between px-6 sticky top-0 z-40 bg-background/50 backdrop-blur-xl border-b border-white/5">
                    {/* Noise Texture Overlay */}
                    <div className="absolute inset-0 pointer-events-none opacity-[0.03] mix-blend-overlay" style={{ backgroundImage: 'url("https://grainy-gradients.vercel.app/noise.svg")' }} />
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                            className="p-2 text-muted-foreground hover:text-white transition-colors -ml-2"
                        >
                            <Menu size={24} />
                        </button>
                        {currentChatId && (
                            <div className="flex items-center gap-2 text-muted-foreground/60 border-l border-white/10 pl-3">
                                <span className="text-sm font-medium truncate max-w-[200px]">
                                    {chats.find(c => c.id === currentChatId)?.title || "Branch"}
                                </span>
                            </div>
                        )}
                    </div>
                    <div className="flex items-center gap-4">
                        {/* View Toggle */}
                        {currentChatId && (
                            <div className="flex items-center bg-secondary/30 rounded-full p-1 border border-white/5">
                                <button
                                    onClick={() => setViewMode('chat')}
                                    className={cn(
                                        "p-1.5 rounded-full transition-all flex items-center gap-2 px-3",
                                        viewMode === 'chat' ? "bg-primary text-white shadow-sm" : "text-muted-foreground hover:text-white"
                                    )}
                                >
                                    <MessageSquare size={14} />
                                    <span className="text-xs font-medium">Chat</span>
                                </button>
                                <button
                                    onClick={() => setViewMode('graph')}
                                    className={cn(
                                        "p-1.5 rounded-full transition-all flex items-center gap-2 px-3",
                                        viewMode === 'graph' ? "bg-primary text-white shadow-sm" : "text-muted-foreground hover:text-white"
                                    )}
                                >
                                    <MapIcon size={14} />
                                    <span className="text-xs font-medium">Map</span>
                                </button>
                                {activeDataVizMessage && (
                                    <button
                                        onClick={() => setIsDataVizOpen(!isDataVizOpen)}
                                        className={cn(
                                            "p-1.5 rounded-full transition-all flex items-center gap-2 px-3 border-l border-white/10 ml-1 pl-4",
                                            isDataVizOpen ? "text-primary" : "text-emerald-400 hover:text-emerald-300"
                                        )}
                                        title="View Auto-Generated Charts for Attached Data"
                                    >
                                        <BarChart3 size={14} />
                                        <span className="text-xs font-medium">Chart</span>
                                    </button>
                                )}
                            </div>
                        )}
                        {/* <button
                            onClick={() => setIsTerminalOpen(true)}
                            className="p-2 text-muted-foreground hover:text-white rounded-xl hover:bg-white/5 transition-all"
                            title="Open System Terminal"
                        >
                            <TerminalIcon size={20} />
                        </button> */}
                        <button 
                            onClick={() => setIsSettingsOpen(true)}
                            className="p-2 text-muted-foreground hover:text-white rounded-xl hover:bg-white/5 transition-all"
                            title="Settings"
                        >
                            <Settings size={20} />
                        </button>
                        <FolderSyncStatus />
                        <div className="group relative">
                            <div className="absolute -inset-2 bg-gradient-to-r from-primary via-blue-400 to-indigo-500 rounded-lg blur opacity-20 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
                            <div className="relative text-transparent bg-clip-text bg-gradient-to-r from-white via-blue-200 to-primary font-bold text-3xl tracking-tighter ml-2 cursor-default select-none">
                                Thrx
                            </div>
                        </div>
                    </div>




                </header>

                {/* Messages Area */}
                <main className="flex-1 flex relative overflow-hidden">
                    <div className="flex-1 flex flex-col relative overflow-hidden">
                        {viewMode === 'chat' ? (
                        <div 
                            ref={scrollContainerRef}
                            onScroll={handleScroll}
                            className="flex-1 overflow-y-auto px-4 w-full scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent"
                        >
                            <div className="max-w-3xl mx-auto py-6">
                                {activeChatRef?.rootMessageId && activeChatRef?.branchText && (
                                    <div className="mb-6 p-4 rounded-xl border border-white/5 bg-secondary/20">
                                        <div className="flex items-center gap-2 mb-2 text-[10px] font-bold text-primary uppercase tracking-widest opacity-70">
                                            <Quote size={10} />
                                            <span>Originating Context</span>
                                        </div>
                                        <p className="text-sm italic text-muted-foreground leading-relaxed break-words">
                                            "{activeChatRef.branchText}"
                                        </p>
                                    </div>
                                )}
                                {messages.length === 0 ? (
                                    <div className="h-full flex items-center justify-center min-h-[50vh]">
                                        <EmptyState onChipClick={(text) => handleSendMessage(text, [])} />
                                    </div>
                                ) : (
                                    <div className="space-y-6 pb-32">
                                        {messages.map((msg, index) => {
                                            // Count siblings and identify current branch index
                                            const siblings = allMessages.filter(m => m.parentId === msg.parentId);
                                            const currentBranchIndex = siblings.findIndex(m => m.id === msg.id);
                                            const totalBranches = siblings.length;

                                            const messageBranches = chats.filter(c => c.rootMessageId === msg.id && c.branchText);

                                            return (
                                                <MessageBubble
                                                    key={msg.id}
                                                    message={msg}
                                                    onViewLogs={() => setShowLocalStatus(true)}
                                                    messageBranches={messageBranches}
                                                    onBranchNavigate={(id: string) => {
                                                        setCurrentChatId(id);
                                                        setViewMode('chat');
                                                    }}
                                                    onParentNavigate={activeChatRef?.parentId ? () => setCurrentChatId(activeChatRef?.parentId) : undefined}
                                                    branchInfo={totalBranches > 1 ? {
                                                        currentIndex: currentBranchIndex,
                                                        total: totalBranches,
                                                        onNavigate: (direction: 'prev' | 'next') => {
                                                            const newIndex = direction === 'next' ? currentBranchIndex + 1 : currentBranchIndex - 1;
                                                            if (newIndex >= 0 && newIndex < totalBranches) {
                                                                setMainActiveMessageId(siblings[newIndex].id);
                                                            }
                                                        }
                                                    } : undefined}
                                                />
                                            );
                                        })}
                                        {isLoading && messages[messages.length - 1]?.role === 'user' && (
                                            <div className="flex justify-start animate-pulse pl-4 opacity-50 text-sm italic">
                                                Generating response...
                                            </div>
                                        )}
                                        <div ref={messagesEndRef} />
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                            <NodeGraph
                                chats={chats}
                                currentChatId={currentChatId}
                                onSelectChat={(id) => {
                                    setCurrentChatId(id);
                                    setViewMode('chat'); // Switch back to chat view on select
                                }}
                            />
                        )}
                    </div>

                    <DataVizDrawer
                        isOpen={isDataVizOpen}
                        onClose={() => setIsDataVizOpen(false)}
                        data={activeDataVizMessage?.data || null}
                        fileName={activeDataVizMessage?.fileName}
                        onAnalyzeChart={(prompt) => {
                            // If chat view isn't active, switch to it
                            if (viewMode !== 'chat') setViewMode('chat');
                            // Send the prompt to the AI
                            handleSendMessage(prompt, []);
                        }}
                    />
                </main>

                {/* Footer Input Area */}
                <div className="flex flex-col items-center w-full z-20 bg-background/80 backdrop-blur-md border-t border-border/50">
                    {agentStatus && (
                        <div className="w-full max-w-3xl px-4 pt-4">
                            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-2 flex items-center gap-2 animate-in fade-in slide-in-from-bottom-1">
                                <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-500/80">
                                    Agent Action: {agentStatus}
                                </span>
                            </div>
                        </div>
                    )}
                    {ragStatus && (
                        <div className="w-full max-w-3xl px-4 pt-4">
                            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-2 flex items-center gap-2 animate-in fade-in slide-in-from-bottom-1">
                                <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-500/80">
                                    {ragStatus}
                                </span>
                            </div>
                        </div>
                    )}
                    <div className="w-full max-w-3xl p-4">
                        <InputArea
                            onSendMessage={handleSendMessage}
                            isLoading={isLoading || isAgentRunning}
                            onModelClick={() => setIsModelDrawerOpen(true)}
                            isLocalModel={!currentModel.includes('gemini')}
                            currentModel={currentModel}
                            value={inputContent}
                            onChange={setInputContent}
                            replyingTo={replyingTo}
                            onCancelReply={() => setReplyingTo(null)}
                            isSearchEnabled={isSearchEnabled}
                            onToggleSearch={() => setIsSearchEnabled(!isSearchEnabled)}
                            isAgentMode={isAgentMode}
                            onToggleAgent={() => setIsAgentMode(!isAgentMode)}
                            onStop={handleStop}
                            onAttachmentTokensChange={setAttachmentTokens}
                        />
                    </div>
                </div>

                <ModelDrawer
                    isOpen={isModelDrawerOpen}
                    onClose={() => setIsModelDrawerOpen(false)}
                    currentModel={currentModel}
                    onModelSelect={handleModelSelect}
                />

                <TextSelectionTooltip
                    onQuote={handleQuote}
                    onBranch={handleBranch}
                />

                <BranchDrawer
                    isOpen={isBranchDrawerOpen}
                    onClose={() => setIsBranchDrawerOpen(false)}
                    messages={branchMessages}
                    onSendMessage={(content, attachments) => handleSendMessage(content, attachments, branchReplyingTo)}
                    isLoading={isLoading}
                    currentModel={currentModel}
                    onModelClick={() => setIsModelDrawerOpen(true)}
                    replyingTo={branchReplyingTo}
                    branchContextText={branchContextText}
                    onCancelReply={() => setBranchReplyingTo(null)}
                    inputContent={branchInputContent}
                    setInputContent={setBranchInputContent}
                    onStop={handleStop}
                    onParentNavigate={() => setIsBranchDrawerOpen(false)}
                    onAttachmentTokensChange={setBranchAttachmentTokens}
                />

                <SettingsDrawer 
                    isOpen={isSettingsOpen} 
                    onClose={() => setIsSettingsOpen(false)} 
                />

                {/* <TerminalDrawer
                    isOpen={isTerminalOpen}
                    onClose={() => setIsTerminalOpen(false)}
                /> */}

                <LocalModelStatus
                    isOpen={showLocalStatus}
                    onClose={() => setShowLocalStatus(false)}
                    modelName={currentModel}
                    progress={progress}
                    logs={logs}
                    isComplete={!isModelLoading && progress === 1}
                />

                {/* Bottom Real-Time Metrics & Terminal (Now inside flexible box) */}
                {/* <MetricsTerminal 
                    logs={logs} 
                    modelId={currentModel} 
                    metrics={metrics || ''} 
                    tokenCount={
                        Math.ceil((isBranchDrawerOpen ? branchInputContent : inputContent).length / 4) + 
                        (isBranchDrawerOpen ? branchAttachmentTokens : attachmentTokens)
                    }
                /> */}
                <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.3)_100%)] z-[5]" />
            </div>
        </div>
    );
};
