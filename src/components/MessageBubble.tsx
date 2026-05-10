import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils';
import { Message, Chat } from '@/types';
import { Bot, User, Cpu, Eye, Quote, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';

interface MessageBubbleProps {
    message: Message;
    onViewLogs?: () => void;
    branchInfo?: {
        currentIndex: number;
        total: number;
        onNavigate: (direction: 'prev' | 'next') => void;
    };
    isCompact?: boolean;
    messageBranches?: Chat[];
    onBranchNavigate?: (chatId: string) => void;
    onParentNavigate?: () => void;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message, onViewLogs, branchInfo, isCompact, messageBranches, onBranchNavigate, onParentNavigate }) => {
    const isUser = message.role === 'user';
    const isSystem = message.role === 'system';

    let processedContent = message.content;
    if (messageBranches && processedContent) {
        messageBranches.forEach(branch => {
            if (branch.branchText && processedContent.includes(branch.branchText)) {
                processedContent = processedContent.replaceAll(
                    branch.branchText,
                    `[${branch.branchText}](#branch-${branch.id})`
                );
            }
        });
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            data-message-id={message.id}
            className={cn(
                "flex w-full gap-4",
                isCompact ? "mb-3" : "mb-6",
                isUser ? "flex-row-reverse" : "flex-row"
            )}
        >
            <div className={cn(
                "flex-shrink-0 rounded-full flex items-center justify-center",
                isCompact ? "w-6 h-6" : "w-8 h-8",
                isUser ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                isSystem && "bg-destructive/10 text-destructive"
            )}>
                {isUser ? <User size={isCompact ? 14 : 18} /> : isSystem ? <Cpu size={isCompact ? 14 : 18} /> : <Bot size={isCompact ? 14 : 18} />}
            </div>

            <div className={cn(
                "flex flex-col",
                isCompact ? "max-w-[90%]" : "max-w-[85%] md:max-w-[70%]",
                isUser ? "items-end" : "items-start"
            )}>
                <div className={cn(
                    "selection:bg-blue-500/30",
                    isCompact ? "text-xs px-3 py-2" : "text-sm md:text-base px-4 py-3",
                    isUser
                        ? "rounded-2xl shadow-sm bg-primary text-primary-foreground rounded-tr-sm"
                        : "pl-0 pr-4 py-1 text-foreground"
                )}>
                    {/* Reply Context UI */}
                    {isUser && message.replyTo && (
                        <div
                            onClick={(e) => {
                                e.stopPropagation();
                                if (onParentNavigate) {
                                    onParentNavigate();
                                    return;
                                }

                                // Find text in DOM
                                const startNode = e.currentTarget;
                                const frames = document.querySelectorAll('.prose'); // Search in AI/User message bodies
                                for (const frame of Array.from(frames)) {
                                    if (frame.textContent?.includes(message.replyTo!)) {
                                        // Ensure we don't scroll to self if self contains it (unlikely for replyTo metadata itself, but checking)
                                        // The 'frame' is likely the AI response.
                                        frame.scrollIntoView({ behavior: 'smooth', block: 'center' });

                                        // Flash highlight
                                        const originalTransition = (frame as HTMLElement).style.transition;
                                        (frame as HTMLElement).style.transition = "background-color 0.5s ease";
                                        (frame as HTMLElement).style.backgroundColor = "rgba(255, 255, 0, 0.2)";
                                        setTimeout(() => {
                                            (frame as HTMLElement).style.backgroundColor = "transparent";
                                            setTimeout(() => {
                                                (frame as HTMLElement).style.transition = originalTransition;
                                            }, 500);
                                        }, 1000);
                                        break;
                                    }
                                }
                            }}
                            className="flex items-center gap-2 mb-2 p-2 rounded-lg bg-black/10 dark:bg-white/10 cursor-pointer hover:bg-black/20 dark:hover:bg-white/20 transition-colors border-l-2 border-primary-foreground/50"
                        >
                            <Quote size={12} className="opacity-70" />
                            <span className="text-xs italic opacity-80 truncate max-w-[200px] md:max-w-[300px]">
                                Referring to: "{message.replyTo}"
                            </span>
                        </div>
                    )}

                    {message.content ? (
                        <div className="prose dark:prose-invert max-w-none break-words leading-relaxed">
                            <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                components={{
                                    pre: ({ node, ...props }) => <div className="overflow-auto w-full my-3 bg-black/40 border border-white/5 p-4 rounded-xl shadow-sm" {...props as any} />,
                                    code: ({ node, className, children, ...props }) => {
                                        return <code className={cn("bg-black/20 text-foreground/90 px-1.5 py-0.5 rounded-md text-[0.9em] font-mono border border-white/5", className)} {...props}>{children}</code>
                                    },
                                    h1: ({ node, ...props }) => <h1 className="text-2xl font-bold mt-6 mb-4 text-foreground tracking-tight" {...props} />,
                                    h2: ({ node, ...props }) => <h2 className="text-xl font-semibold mt-5 mb-3 text-foreground/90 border-b border-white/10 pb-2" {...props} />,
                                    h3: ({ node, ...props }) => <h3 className="text-lg font-medium mt-4 mb-2 text-foreground/80" {...props} />,
                                    h4: ({ node, ...props }) => <h4 className="text-base font-medium mt-3 mb-2 text-foreground/80" {...props} />,
                                    p: ({ node, ...props }) => <p className="mb-4 leading-relaxed text-foreground/80" {...props} />,
                                    ul: ({ node, ...props }) => <ul className="list-disc list-outside ml-5 mb-5 space-y-2 text-foreground/80 marker:text-foreground/40" {...props} />,
                                    ol: ({ node, ...props }) => <ol className="list-decimal list-outside ml-5 mb-5 space-y-2 text-foreground/80 marker:text-foreground/40" {...props} />,
                                    li: ({ node, ...props }) => <li className="pl-1 leading-relaxed" {...props} />,
                                    strong: ({ node, ...props }) => <strong className="font-semibold text-foreground" {...props} />,
                                    blockquote: ({ node, ...props }) => <blockquote className="border-l-4 border-white/20 pl-4 py-1 pr-4 my-5 bg-white/5 rounded-r-lg italic text-foreground/70" {...props} />,
                                    table: ({ node, ...props }) => <div className="overflow-x-auto my-5 rounded-lg border border-white/10 bg-black/20"><table className="w-full border-collapse text-sm" {...props} /></div>,
                                    th: ({ node, ...props }) => <th className="bg-white/5 border-b border-white/10 px-4 py-3 font-medium text-left text-foreground/90" {...props} />,
                                    td: ({ node, ...props }) => <td className="border-b border-white/5 px-4 py-3 text-foreground/80" {...props} />,
                                    hr: ({ node, ...props }) => <hr className="my-6 border-white/10" {...props} />,
                                    a: ({ node, href, children, ...props }) => {
                                        if (href?.startsWith('#branch-')) {
                                            const chatId = href.replace('#branch-', '');
                                            return (
                                                <span
                                                    className="bg-emerald-500/20 text-emerald-400 border-b border-emerald-500/50 cursor-pointer relative group transition-colors hover:bg-emerald-500/40 px-1 flex-inline items-center rounded-sm"
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        onBranchNavigate?.(chatId);
                                                    }}
                                                >
                                                    {children}
                                                    <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-black text-xs font-medium rounded-md shadow-xl opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10 border border-emerald-500/30">
                                                        Go to branch ➔
                                                    </span>
                                                </span>
                                            );
                                        }
                                        return <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary font-medium hover:text-primary/80 hover:underline underline-offset-2 decoration-primary/50 transition-colors" {...props}>{children}</a>;
                                    }
                                }}
                            >
                                {processedContent}
                            </ReactMarkdown>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2">
                            <span className="italic opacity-50">Thinking...</span>
                            {onViewLogs && (
                                <button
                                    onClick={onViewLogs}
                                    className="p-1 hover:bg-black/10 dark:hover:bg-white/10 rounded-full transition-colors"
                                    title="View process logs"
                                >
                                    <Eye size={14} className="opacity-70" />
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {/* Attachments - simple view for now */}
                {message.attachments && message.attachments.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                        {message.attachments.map(att => (
                            <div key={att.id} className="text-xs bg-muted px-2 py-1 rounded border overflow-hidden max-w-[200px] truncate">
                                {att.type === 'image' && <img src={att.url} alt="attachment" className="h-20 w-auto object-cover rounded mb-1" />}
                                <span>{att.name}</span>
                            </div>
                        ))}
                    </div>
                )}

                <div className="flex items-center justify-between w-full mt-1 px-1">
                    <div className="text-[10px] text-muted-foreground">
                        {message.model && <span className="opacity-70">{message.model} • </span>}
                        {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>

                    {branchInfo && (
                        <div className="flex items-center gap-1 bg-black/20 dark:bg-white/5 rounded-full px-1.5 py-0.5 border border-white/5">
                            <button
                                onClick={() => branchInfo.onNavigate('prev')}
                                disabled={branchInfo.currentIndex === 0}
                                className="p-0.5 hover:text-primary disabled:opacity-30 transition-colors"
                            >
                                <ChevronLeft size={12} />
                            </button>
                            <span className="text-[9px] font-medium min-w-[30px] text-center text-muted-foreground">
                                {branchInfo.currentIndex + 1} / {branchInfo.total}
                            </span>
                            <button
                                onClick={() => branchInfo.onNavigate('next')}
                                disabled={branchInfo.currentIndex === branchInfo.total - 1}
                                className="p-0.5 hover:text-primary disabled:opacity-30 transition-colors"
                            >
                                <ChevronRight size={12} />
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </motion.div>
    );
};
