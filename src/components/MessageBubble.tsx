import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils';
import { Message } from '@/types';
import { Bot, User, Cpu, Eye, Quote } from 'lucide-react';
import { motion } from 'framer-motion';

interface MessageBubbleProps {
    message: Message;
    onViewLogs?: () => void;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message, onViewLogs }) => {
    const isUser = message.role === 'user';
    const isSystem = message.role === 'system';

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
                "flex w-full mb-6 gap-4",
                isUser ? "flex-row-reverse" : "flex-row"
            )}
        >
            <div className={cn(
                "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
                isUser ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                isSystem && "bg-destructive/10 text-destructive"
            )}>
                {isUser ? <User size={18} /> : isSystem ? <Cpu size={18} /> : <Bot size={18} />}
            </div>

            <div className={cn(
                "flex flex-col max-w-[85%] md:max-w-[70%]",
                isUser ? "items-end" : "items-start"
            )}>
                <div className={cn(
                    "text-sm md:text-base selection:bg-blue-500/30",
                    isUser
                        ? "px-4 py-3 rounded-2xl shadow-sm bg-primary text-primary-foreground rounded-tr-sm"
                        : "pl-0 pr-4 py-1 text-foreground"
                )}>
                    {/* Reply Context UI */}
                    {isUser && message.replyTo && (
                        <div
                            onClick={(e) => {
                                e.stopPropagation();
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
                                    pre: ({ node, ...props }) => <div className="overflow-auto w-full my-2 bg-black/50 p-2 rounded-lg" {...props as any} />,
                                    code: ({ node, className, children, ...props }) => {
                                        return <code className={cn("bg-black/20 px-1 py-0.5 rounded text-sm", className)} {...props}>{children}</code>
                                    }
                                }}
                            >
                                {message.content}
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

                <div className="text-[10px] text-muted-foreground mt-1 px-1">
                    {message.model && <span className="opacity-70">{message.model} • </span>}
                    {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
            </div>
        </motion.div>
    );
};
