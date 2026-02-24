import React, { useEffect, useState, useRef } from 'react';
import { MessageSquarePlus } from 'lucide-react';

interface TextSelectionTooltipProps {
    onQuote: (text: string, messageId?: string) => void;
    onBranch: (text: string, messageId?: string) => void;
}

export const TextSelectionTooltip: React.FC<TextSelectionTooltipProps> = ({ onQuote, onBranch }) => {
    const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
    const [selectedText, setSelectedText] = useState('');
    const [activeMessageId, setActiveMessageId] = useState<string | undefined>(undefined);
    const tooltipRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleSelectionChange = () => {
            const selection = window.getSelection();
            if (!selection || selection.isCollapsed || !selection.toString().trim()) {
                setPosition(null);
                setSelectedText('');
                setActiveMessageId(undefined);
                return;
            }

            const text = selection.toString().trim();
            if (text.length < 3) return; // Ignore tiny selections

            // Find parent message ID
            let messageId: string | undefined = undefined;
            let node: Node | null = selection.anchorNode;
            while (node && node !== document.body) {
                if (node instanceof HTMLElement && node.hasAttribute('data-message-id')) {
                    messageId = node.getAttribute('data-message-id') || undefined;
                    break;
                }
                node = node.parentNode;
            }

            const range = selection.getRangeAt(0);
            const rect = range.getBoundingClientRect();

            setPosition({
                x: rect.left + rect.width / 2,
                y: rect.top - 10 // 10px above selection
            });
            setSelectedText(text);
            setActiveMessageId(messageId);
        };

        document.addEventListener('selectionchange', handleSelectionChange);
        return () => {
            document.removeEventListener('selectionchange', handleSelectionChange);
        };
    }, []);

    const handleQuoteClick = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        onQuote(selectedText, activeMessageId);
        window.getSelection()?.removeAllRanges();
        setPosition(null);
    };

    const handleBranchClick = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        onBranch(selectedText, activeMessageId);
        window.getSelection()?.removeAllRanges();
        setPosition(null);
    };

    if (!position) return null;

    return (
        <div
            ref={tooltipRef}
            className="fixed z-50 animate-in fade-in zoom-in-95 duration-200"
            style={{
                left: position.x,
                top: position.y,
                transform: 'translate(-50%, -100%)'
            }}
            onMouseDown={(e) => e.preventDefault()}
        >
            <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-700 text-white rounded-xl shadow-2xl relative">
                <button
                    onClick={handleQuoteClick}
                    className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-slate-800 transition-colors rounded-lg text-xs font-medium"
                    title="Quote in current chat"
                >
                    <MessageSquarePlus size={14} className="text-blue-400" />
                    Ask
                </button>
                <div className="w-px h-4 bg-slate-700 mx-0.5"></div>
                <button
                    onClick={handleBranchClick}
                    className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-slate-800 transition-colors rounded-lg text-xs font-medium"
                    title="Create new conversation branch"
                >
                    <div className="w-3.5 h-3.5 border-l-2 border-b-2 border-emerald-400 rounded-bl-sm rotate-45 transform -translate-y-0.5"></div>
                    Branch
                </button>

                {/* Arrow down */}
                <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-slate-900 border-b border-r border-slate-700 rotate-45"></div>
            </div>
        </div>
    );
};
