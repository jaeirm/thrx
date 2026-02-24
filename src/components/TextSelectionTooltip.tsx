import React, { useEffect, useState, useRef } from 'react';
import { MessageSquarePlus } from 'lucide-react';

interface TextSelectionTooltipProps {
    onQuote: (text: string) => void;
}

export const TextSelectionTooltip: React.FC<TextSelectionTooltipProps> = ({ onQuote }) => {
    const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
    const [selectedText, setSelectedText] = useState('');
    const tooltipRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleSelectionChange = () => {
            const selection = window.getSelection();
            if (!selection || selection.isCollapsed || !selection.toString().trim()) {
                // Delay hiding to allow for clicks inside tooltip if needed (though onMouseDown prevents this usually)
                // Actually, just hide efficiently.
                setPosition(null);
                setSelectedText('');
                return;
            }

            const text = selection.toString().trim();
            if (text.length < 3) return; // Ignore tiny selections

            const range = selection.getRangeAt(0);
            const rect = range.getBoundingClientRect();

            // Calculate position: centered above the selection
            // We need to account for scroll, but generic fixed positioning acts relative to viewport which getBoundingClientRect returns.
            // So we can use fixed positioning for the tooltip.

            setPosition({
                x: rect.left + rect.width / 2,
                y: rect.top - 10 // 10px above selection
            });
            setSelectedText(text);
        };

        const handleMouseDown = (e: MouseEvent) => {
            // Hide if clicking outside tooltip and logic suggests we are starting a new selection or clearing
            if (tooltipRef.current && !tooltipRef.current.contains(e.target as Node)) {
                // We rely on selectionchange to clear it, but sometimes explicit clear is good.
                // Actually selectionchange usually fires on mouse down/click. 
            }
        };

        // We use mouseup/keyup to detect end of selection actions more reliably than just selectionchange sometimes
        // But selectionchange is the standard. Let's stick to simple event listeners.
        document.addEventListener('selectionchange', handleSelectionChange);
        // Clean up
        return () => {
            document.removeEventListener('selectionchange', handleSelectionChange);
        };
    }, []);

    const handleQuoteClick = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        onQuote(selectedText);
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
            onMouseDown={(e) => e.preventDefault()} // Prevent clearing selection when clicking tooltip
        >
            <button
                onClick={handleQuoteClick}
                className="flex items-center gap-2 px-3 py-2 bg-slate-900 border border-slate-700 text-white text-xs font-medium rounded-lg shadow-xl hover:bg-slate-800 transition-colors"
            >
                <MessageSquarePlus size={14} className="text-blue-400" />
                Ask about selection
                {/* Arrow down */}
                <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-slate-900 border-b border-r border-slate-700 rotate-45"></div>
            </button>
        </div>
    );
};
