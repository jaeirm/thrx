import React, { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, Plus, ArrowUp, Mic, Cloud, Laptop, X, Quote, Globe, Square } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Attachment } from '@/types';
import { uploadFile } from '@/lib/upload';

interface InputAreaProps {
    onSendMessage: (content: string, attachments: Attachment[]) => void;
    isLoading: boolean;
    disabled?: boolean;
    onModelClick?: () => void;
    isLocalModel?: boolean;
    value: string;
    onChange: (val: string) => void;
    replyingTo?: string | null;
    onCancelReply?: () => void;
    isSearchEnabled?: boolean;
    onToggleSearch?: () => void;
    onStop?: () => void;
}

export const InputArea: React.FC<InputAreaProps> = ({
    onSendMessage,
    isLoading,
    disabled,
    onModelClick,
    isLocalModel,
    value,
    onChange,
    replyingTo,
    onCancelReply,
    isSearchEnabled,
    onToggleSearch,
    onStop
}) => {
    const [attachments, setAttachments] = useState<Attachment[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
        }
    }, [value]);

    const handleSend = () => {
        if ((!value.trim() && attachments.length === 0) || isLoading || disabled || isUploading) return;
        onSendMessage(value, attachments);
        setAttachments([]);
        onChange('');
        onCancelReply?.();
        if (textareaRef.current) textareaRef.current.style.height = 'auto';
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setIsUploading(true);
            try {
                const files = Array.from(e.target.files);
                const uploaded = await Promise.all(files.map(file => uploadFile(file)));
                setAttachments(prev => [...prev, ...uploaded]);
            } catch (error) {
                console.error("Upload failed", error);
            } finally {
                setIsUploading(false);
                if (fileInputRef.current) fileInputRef.current.value = '';
            }
        }
    };

    return (
        <div className="w-full max-w-2xl mx-auto px-4 pb-10 flex flex-col gap-3">

            {/* Model Status Pill */}
            <div className="flex justify-start">
                <button
                    onClick={onModelClick}
                    className="flex h-7 shrink-0 items-center justify-center gap-x-1.5 rounded-full bg-slate-200 dark:bg-slate-800 px-3 border border-slate-300 dark:border-slate-700 hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors"
                >
                    {isLocalModel ? <Laptop size={14} className="text-green-600 dark:text-green-400" /> : <Cloud size={14} className="text-primary" />}
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                        {isLocalModel ? 'Local Model' : 'Cloud Model'}
                    </p>
                </button>
            </div>

            {/* Main Input Bar */}
            <div className="relative flex flex-col bg-card rounded-xl shadow-xl border border-white/10 overflow-hidden">

                {/* Reply Banner */}
                {replyingTo && (
                    <div className="flex items-center gap-2 px-4 py-2 bg-secondary/50 border-b border-white/5 animate-in slide-in-from-bottom-2 fade-in">
                        <Quote size={14} className="text-primary shrink-0" />
                        <div className="flex-1 text-xs text-muted-foreground truncate italic">
                            Replying to: "{replyingTo}"
                        </div>
                        <button
                            onClick={onCancelReply}
                            className="p-1 text-muted-foreground hover:text-foreground rounded-full hover:bg-white/10"
                        >
                            <X size={14} />
                        </button>
                    </div>
                )}

                {/* Attachments Preview */}
                {attachments.length > 0 && (
                    <div className="flex gap-2 overflow-x-auto p-2 border-b border-white/5">
                        {attachments.map(att => (
                            <div key={att.id} className="relative w-10 h-10 rounded overflow-hidden border border-white/10">
                                {att.type === 'image' ? (
                                    <img src={att.url} alt={att.name} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="bg-secondary text-[8px] p-1 text-center w-full h-full flex items-center justify-center">{att.type}</div>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                <div className="flex items-center px-4 py-3 gap-2">
                    {/* Input Field */}
                    <div className="flex-1">
                        <textarea
                            ref={textareaRef}
                            value={value}
                            onChange={(e) => onChange(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Ask something, explore an idea, or start thinking"
                            rows={1}
                            disabled={isLoading || disabled}
                            className="w-full bg-transparent border-none focus:ring-0 text-foreground placeholder:text-muted-foreground/60 text-sm py-1 resize-none min-h-[24px] max-h-[150px] scrollbar-hide outline-none"
                        />
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-1">
                        <button className="p-2 text-muted-foreground hover:text-primary transition-colors">
                            <Plus size={20} />
                        </button>
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="p-2 text-muted-foreground hover:text-primary transition-colors"
                            disabled={isUploading}
                        >
                            <Paperclip size={20} />
                        </button>
                        {/* Search is always enabled now, so hiding the toggle
                        <button
                            onClick={onToggleSearch}
                            className={cn(
                                "p-2 transition-colors transition-all",
                                isSearchEnabled ? "text-blue-400 bg-blue-400/10 rounded-full" : "text-muted-foreground hover:text-primary"
                            )}
                            title="Toggle Web Search"
                        >
                            <Globe size={20} />
                        </button>
                        */}
                        <button className="p-2 text-muted-foreground hover:text-primary transition-colors">
                            <Mic size={20} />
                        </button>

                        <input
                            type="file"
                            multiple
                            ref={fileInputRef}
                            className="hidden"
                            onChange={handleFileSelect}
                        />
                    </div>
                </div>

                {/* Send/Submit Row */}
                <div className="flex items-center justify-end px-4 py-2 bg-secondary/30 border-t border-white/5">
                    <button
                        onClick={isLoading ? onStop : handleSend}
                        disabled={(!value.trim() && attachments.length === 0 && !isLoading) || isUploading || disabled}
                        className={cn(
                            "flex items-center justify-center w-8 h-8 rounded-full shadow-sm transition-all hover:scale-105 active:scale-95",
                            isLoading
                                ? "bg-red-500 hover:bg-red-600 text-white"
                                : "bg-primary text-primary-foreground",
                            (value.trim() || attachments.length > 0 || isLoading) ? "opacity-100" : "opacity-50 cursor-not-allowed"
                        )}
                    >
                        {isLoading ? <Square size={14} fill="currentColor" /> : <ArrowUp size={18} />}
                    </button>
                </div>
            </div>

            {/* Footer Hint */}
            <div className="text-center">
                <p className="text-[10px] text-muted-foreground uppercase tracking-[0.1em]">
                    Powered by Thrx Intelligence • v2.4.0
                </p>
            </div>
        </div>
    );
};
