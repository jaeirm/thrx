import React from 'react';
import { Cloud, Laptop, ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ModelType } from '@/types';
import { AVAILABLE_MODELS } from '@/lib/models';
// I'll stick to a simple custom dropdown to avoid installing more deps if I can, or install radix-ui/react-dropdown-menu which is standard for good a11y.
// Let's rely on simple state for now to keep it lightweight as requested "efficient".

interface ModelSelectorProps {
    currentModel: ModelType;
    onModelChange: (model: ModelType) => void;
    disabled?: boolean;
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({ currentModel, onModelChange, disabled }) => {
    const [isOpen, setIsOpen] = React.useState(false);

    const models = AVAILABLE_MODELS;

    const selected = models.find(m => m.id === currentModel) || models[0];

    return (
        <div className="relative">
            <button
                onClick={() => !disabled && setIsOpen(!isOpen)}
                disabled={disabled}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-blue-900/30 hover:bg-blue-900/50 transition-colors text-xs font-semibold tracking-wide border border-blue-500/20 text-blue-100 uppercase"
            >
                {selected.type === 'cloud' ? <Cloud size={14} className="text-blue-400" /> : <Laptop size={14} className="text-green-400" />}
                <span>{selected.type === 'cloud' ? 'Cloud Model' : 'Local Model'}</span>
                {/* <span>{selected.name}</span> */}
            </button>

            {isOpen && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
                    <div className="absolute top-full left-0 mt-2 w-64 bg-card border border-border rounded-xl shadow-lg z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-1">
                            <div className="text-xs font-semibold text-muted-foreground px-2 py-1.5">Cloud Models</div>
                            {models.filter(m => m.type === 'cloud').map(model => (
                                <button
                                    key={model.id}
                                    onClick={() => { onModelChange(model.id); setIsOpen(false); }}
                                    className="w-full text-left px-2 py-2 rounded-lg hover:bg-secondary flex items-start gap-3 group"
                                >
                                    <Cloud size={16} className="mt-0.5 text-blue-500 group-hover:text-blue-400" />
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-medium">{model.name}</span>
                                            {currentModel === model.id && <Check size={14} className="text-primary" />}
                                        </div>
                                        <div className="text-xs text-muted-foreground">{model.desc}</div>
                                    </div>
                                </button>
                            ))}

                            <div className="my-1 border-t border-border/50" />

                            <div className="text-xs font-semibold text-muted-foreground px-2 py-1.5">Local (Offline)</div>
                            {models.filter(m => m.type === 'local').map(model => (
                                <button
                                    key={model.id}
                                    onClick={() => { onModelChange(model.id); setIsOpen(false); }}
                                    className="w-full text-left px-2 py-2 rounded-lg hover:bg-secondary flex items-start gap-3 group"
                                >
                                    <Laptop size={16} className="mt-0.5 text-green-500 group-hover:text-green-400" />
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-medium">{model.name}</span>
                                            {currentModel === model.id && <Check size={14} className="text-primary" />}
                                        </div>
                                        <div className="text-xs text-muted-foreground">{model.desc}</div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};
