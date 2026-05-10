import React, { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, Plus, ArrowUp, Mic, Cloud, Laptop, X, Quote, Globe, Square, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Attachment } from '@/types';
import { uploadFile } from '@/lib/upload';

interface InputAreaProps {
    onSendMessage: (content: string, attachments: Attachment[]) => void;
    isLoading: boolean;
    disabled?: boolean;
    onModelClick?: () => void;
    isLocalModel?: boolean;
    currentModel?: string;
    value: string;
    onChange: (val: string) => void;
    replyingTo?: string | null;
    onCancelReply?: () => void;
    isSearchEnabled?: boolean;
    onToggleSearch?: () => void;
    isAgentMode?: boolean;
    onToggleAgent?: () => void;
    onStop?: () => void;
    onAttachmentTokensChange?: (count: number) => void;
}

export const InputArea: React.FC<InputAreaProps> = ({
    onSendMessage,
    isLoading,
    disabled,
    onModelClick,
    isLocalModel,
    currentModel,
    value,
    onChange,
    replyingTo,
    onCancelReply,
    isSearchEnabled,
    onToggleSearch,
    isAgentMode,
    onToggleAgent,
    onStop,
    onAttachmentTokensChange
}) => {
    const [attachments, setAttachments] = useState<Attachment[]>([]);

    // Notify parent of attachment tokens
    useEffect(() => {
        const totalSize = attachments.reduce((sum, att) => {
            // Rough estimate: images are ~500 tokens, files use their size
            if (att.type === 'image') return sum + 2000; // Images are heavy in context
            return sum + (att.size || 0);
        }, 0);
        onAttachmentTokensChange?.(Math.ceil(totalSize / 4));
    }, [attachments, onAttachmentTokensChange]);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadStatus, setUploadStatus] = useState<string>('');
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [isDragging, setIsDragging] = useState(false);

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

    const processFiles = async (files: File[]) => {
        setIsUploading(true);
        setUploadStatus('Starting processing...');
        try {
            const uploaded: Attachment[] = [];
            for (const file of files) {
                const att = await uploadFile(file, (msg) => setUploadStatus(`${file.name}: ${msg}`), true);
                uploaded.push(att);
            }
            setAttachments(prev => [...prev, ...uploaded]);
        } catch (error) {
            console.error("Upload failed", error);
            setUploadStatus('Upload failed');
        } finally {
            setIsUploading(false);
            setTimeout(() => setUploadStatus(''), 3000);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            processFiles(Array.from(e.target.files));
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            processFiles(Array.from(e.dataTransfer.files));
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
                    <div className="flex items-center gap-1.5">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 truncate max-w-[200px]">
                            {currentModel || 'Select LLM Model'}
                        </p>
                        {!isLocalModel && currentModel && (
                            <span className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded bg-primary/20 text-primary border border-primary/30">
                                API
                            </span>
                        )}
                    </div>
                </button>
            </div>

            {/* Main Input Bar */}
            <div 
                className={cn(
                    "relative flex flex-col bg-card rounded-xl shadow-xl border overflow-hidden transition-all duration-200",
                    isDragging ? "border-primary ring-2 ring-primary/20 bg-card/80" : "border-white/10"
                )}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
            >
                {/* Drag Overlay */}
                {isDragging && (
                    <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm pointer-events-none">
                        <div className="flex flex-col items-center gap-2 text-primary animate-pulse">
                            <Cloud size={32} />
                            <p className="text-sm font-medium">Drop files here to attach</p>
                        </div>
                    </div>
                )}

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
                
                {/* Upload Status */}
                {isUploading && uploadStatus && (
                    <div className="flex items-center px-4 py-2 border-b border-white/5 bg-blue-500/10 text-blue-400 text-xs animate-pulse">
                         {uploadStatus}
                    </div>
                )}

                {/* Attachments Preview */}
                {attachments.length > 0 && (
                    <div className="flex gap-3 overflow-x-auto p-3 border-b border-white/5">
                        {attachments.map(att => (
                            <div key={att.id} className="relative group w-16 h-16 shrink-0 rounded-lg overflow-hidden border border-white/10 bg-secondary/50 shadow-sm transition-all hover:ring-2 hover:ring-primary/50">
                                {/* Remove Button */}
                                <button
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setAttachments(prev => prev.filter(a => a.id !== att.id));
                                    }}
                                    className="absolute top-1 right-1 bg-red-500/90 hover:bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity z-10 shadow-md backdrop-blur-sm"
                                    title="Remove attachment"
                                >
                                    <X size={12} strokeWidth={3} />
                                </button>
                                
                                {/* Preview Click Area */}
                                <button 
                                    className="w-full h-full text-left"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        window.open(att.url, '_blank');
                                    }}
                                    title={`Preview ${att.name}`}
                                >
                                    {att.type === 'image' ? (
                                        <img src={att.url} alt={att.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="flex flex-col items-center justify-center w-full h-full p-1 text-muted-foreground hover:text-foreground transition-colors">
                                            <span className="text-[11px] font-bold truncate w-full text-center px-1 text-primary">{att.name.split('.').pop()?.toUpperCase() || 'FILE'}</span>
                                            <span className="text-[9px] truncate w-full text-center opacity-70 mt-1 px-1">{att.name}</span>
                                        </div>
                                    )}
                                </button>
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
                        <button
                            onClick={onToggleAgent}
                            className={cn(
                                "p-2 transition-all",
                                isAgentMode ? "text-amber-400 bg-amber-400/10 rounded-full scale-110 shadow-[0_0_10px_rgba(251,191,36,0.2)]" : "text-muted-foreground hover:text-amber-400"
                            )}
                            title="Toggle Agentic Mode (Tools & Reasoning)"
                        >
                            <Zap size={20} fill={isAgentMode ? "currentColor" : "none"} />
                        </button>
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

        </div>
    );
};
