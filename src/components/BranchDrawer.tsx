import React from 'react';
import { X, Bot, User, Quote } from 'lucide-react';
import { Message, Attachment, ModelType } from '@/types';
import { MessageBubble } from './MessageBubble';
import { InputArea } from './InputArea';
import { cn } from '@/lib/utils';

interface BranchDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    messages: Message[];
    onSendMessage: (content: string, attachments: Attachment[]) => void;
    isLoading: boolean;
    currentModel: ModelType;
    onModelClick: () => void;
    replyingTo: string | null;
    onCancelReply: () => void;
    inputContent: string;
    setInputContent: (val: string) => void;
    onStop?: () => void;
}

export const BranchDrawer: React.FC<BranchDrawerProps> = ({
    isOpen,
    onClose,
    messages,
    onSendMessage,
    isLoading,
    currentModel,
    onModelClick,
    replyingTo,
    onCancelReply,
    inputContent,
    setInputContent,
    onStop
}) => {
    const messagesEndRef = React.useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    React.useEffect(() => {
        if (isOpen) {
            setTimeout(scrollToBottom, 100);
        }
    }, [messages, isLoading, isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center pointer-events-none text-foreground">
            {/* Backdrop - only clickable outside the drawer */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm pointer-events-auto transition-opacity"
                onClick={onClose}
            />

            {/* Drawer Content */}
            <div className="relative w-full max-w-4xl h-[85vh] bg-card border-t border-x border-border rounded-t-[2.5rem] shadow-2xl pointer-events-auto flex flex-col animate-in slide-in-from-bottom-full duration-500 ease-out overflow-hidden">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-border/50 bg-secondary/20">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                            <Bot size={18} />
                        </div>
                        <div>
                            <h2 className="text-sm font-semibold">New Branch</h2>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Active Thinking Path</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-secondary transition-colors"
                    >
                        <X size={20} className="text-muted-foreground" />
                    </button>
                </div>

                {/* Messages Trail */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                    {/* Branch Context Anchor */}
                    <div className="mb-8 p-4 rounded-2xl bg-primary/5 border border-primary/10 relative overflow-hidden group">
                        <div className="absolute top-0 left-0 w-1 h-full bg-primary/30" />
                        <div className="flex items-center gap-2 mb-2 text-[10px] font-bold text-primary uppercase tracking-widest opacity-70">
                            <Quote size={10} />
                            <span>Originating Context</span>
                        </div>
                        <p className="text-sm italic text-muted-foreground leading-relaxed">
                            "{replyingTo}"
                        </p>
                    </div>

                    {messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center text-center p-4 opacity-40 py-12">
                            <Bot size={32} className="mb-3 text-primary/50" />
                            <p className="text-xs">Start the new thread based on this context</p>
                        </div>
                    ) : (
                        messages.map((msg, idx) => (
                            <MessageBubble
                                key={msg.id}
                                message={msg}
                                isCompact={true}
                            />
                        ))
                    )}
                    {isLoading && (
                        <div className="flex justify-start animate-pulse pl-4 opacity-50 text-xs italic">
                            Branching thought in progress...
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="p-4 bg-background/50 backdrop-blur-sm border-t border-border/50">
                    <InputArea
                        onSendMessage={onSendMessage}
                        isLoading={isLoading}
                        onModelClick={onModelClick}
                        isLocalModel={!currentModel.includes('gemini')}
                        value={inputContent}
                        onChange={setInputContent}
                        replyingTo={replyingTo}
                        onCancelReply={onCancelReply}
                        onStop={onStop}
                    />
                </div>

                {/* Visual handle */}
                <div className="absolute top-2 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-border/50 rounded-full" />
            </div>
        </div>
    );
};
