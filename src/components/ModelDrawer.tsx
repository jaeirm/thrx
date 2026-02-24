import React from 'react';
import { X, Cloud, Laptop, Check } from 'lucide-react';
import { ModelType } from '@/types';
import { AVAILABLE_MODELS } from '@/lib/models';
import { cn } from '@/lib/utils';

interface ModelDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    currentModel: ModelType;
    onModelSelect: (model: ModelType) => void;
}

export const ModelDrawer: React.FC<ModelDrawerProps> = ({ isOpen, onClose, currentModel, onModelSelect }) => {
    if (!isOpen) return null;

    const models = AVAILABLE_MODELS;

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            {/* Drawer Content */}
            <div className="relative w-full max-w-md bg-card border-t sm:border border-border p-6 rounded-t-3xl sm:rounded-3xl shadow-2xl animate-in slide-in-from-bottom-full duration-300">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold tracking-tight">Select Model</h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-secondary transition-colors">
                        <X size={20} className="text-muted-foreground" />
                    </button>
                </div>

                <div className="space-y-6">
                    <div className="space-y-6 overflow-y-auto max-h-[60vh] pr-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                        {/* Mobile Optimized Models - Highlighted */}
                        <div>
                            <div className="flex items-center gap-2 mb-3 px-2">
                                <span className="text-xs font-bold text-green-400 uppercase tracking-wider">Mobile Optimized</span>
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-green-500/20 text-green-400 border border-green-500/30">RECOMMENDED</span>
                            </div>
                            <div className="space-y-2">
                                {models.filter(m => m.category === 'mobile').map(model => (
                                    <button
                                        key={model.id}
                                        onClick={() => { onModelSelect(model.id); onClose(); }}
                                        className={cn(
                                            "w-full flex items-center gap-4 p-3 rounded-xl transition-all border",
                                            currentModel === model.id
                                                ? "bg-green-500/10 border-green-500/50"
                                                : "bg-secondary/30 border-transparent hover:bg-secondary/50"
                                        )}
                                    >
                                        <div className={cn("p-2 rounded-lg", currentModel === model.id ? "bg-green-600 text-white" : "bg-secondary text-muted-foreground")}>
                                            <Laptop size={20} />
                                        </div>
                                        <div className="flex-1 text-left">
                                            <div className="flex items-center gap-2">
                                                <div className="font-medium">{model.name}</div>
                                                {model.id.includes('1B') && <span className="text-[10px] bg-blue-500/20 text-blue-300 px-1.5 rounded">FASTEST</span>}
                                            </div>
                                            <div className="text-xs text-muted-foreground">{model.desc}</div>
                                            <div className="flex items-center gap-2 mt-1.5 text-[10px] text-muted-foreground/80 font-mono">
                                                <span className="bg-secondary px-1.5 py-0.5 rounded border border-border/50">💾 {model.size}</span>
                                                {model.vram && (
                                                    <span className="bg-secondary px-1.5 py-0.5 rounded border border-border/50">⚡ {model.vram} VRAM</span>
                                                )}
                                            </div>
                                        </div>
                                        {currentModel === model.id && <Check size={18} className="text-green-500" />}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Cloud Models */}
                        <div>
                            <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 px-2">Cloud Models</div>
                            <div className="space-y-2">
                                {models.filter(m => m.category === 'cloud').map(model => (
                                    <button
                                        key={model.id}
                                        onClick={() => { onModelSelect(model.id); onClose(); }}
                                        className={cn(
                                            "w-full flex items-center gap-4 p-3 rounded-xl transition-all border",
                                            currentModel === model.id
                                                ? "bg-primary/10 border-primary/50"
                                                : "bg-secondary/30 border-transparent hover:bg-secondary/50"
                                        )}
                                    >
                                        <div className={cn("p-2 rounded-lg", currentModel === model.id ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground")}>
                                            <Cloud size={20} />
                                        </div>
                                        <div className="flex-1 text-left">
                                            <div className="font-medium">{model.name}</div>
                                            <div className="text-xs text-muted-foreground">{model.desc}</div>
                                        </div>
                                        {currentModel === model.id && <Check size={18} className="text-primary" />}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Desktop / High Performance Models */}
                        <div>
                            <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 px-2">High Performance (Desktop)</div>
                            <div className="space-y-2">
                                {models.filter(m => m.category === 'desktop').map(model => (
                                    <button
                                        key={model.id}
                                        onClick={() => { onModelSelect(model.id); onClose(); }}
                                        className={cn(
                                            "w-full flex items-center gap-4 p-3 rounded-xl transition-all border",
                                            currentModel === model.id
                                                ? "bg-purple-500/10 border-purple-500/50"
                                                : "bg-secondary/30 border-transparent hover:bg-secondary/50"
                                        )}
                                    >
                                        <div className={cn("p-2 rounded-lg", currentModel === model.id ? "bg-purple-600 text-white" : "bg-secondary text-muted-foreground")}>
                                            <Laptop size={20} />
                                        </div>
                                        <div className="flex-1 text-left">
                                            <div className="font-medium">{model.name}</div>
                                            <div className="text-xs text-muted-foreground">{model.desc}</div>
                                            <div className="flex items-center gap-2 mt-1.5 text-[10px] text-muted-foreground/80 font-mono">
                                                <span className="bg-secondary px-1.5 py-0.5 rounded border border-border/50">💾 {model.size}</span>
                                                {model.vram && (
                                                    <span className="bg-secondary px-1.5 py-0.5 rounded border border-border/50">⚡ {model.vram} VRAM</span>
                                                )}
                                            </div>
                                        </div>
                                        {currentModel === model.id && <Check size={18} className="text-purple-500" />}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Safe area spacing */}
                <div className="h-6 sm:h-0"></div>
            </div>
        </div>
    );
};
