import React from 'react';

interface EmptyStateProps {
    onChipClick: (text: string) => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ onChipClick }) => {
    return (
        <div className="flex flex-col items-center justify-center flex-1 w-full px-8 text-center mt-[-5vh]">
            <div className="flex flex-col items-center max-w-sm text-center">
                {/* Image Container */}
                <div className="mb-8 p-4 rounded-xl bg-primary/10 border border-primary/20">
                    <div className="w-20 h-20 bg-cover rounded-lg overflow-hidden bg-black/50 relative">
                        {/* Abstract Gradient/Image Placeholder since we can't fetch external URLs easily without setup. 
                            Using a CSS gradient to mimic the "neural network" blue feel. 
                        */}
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-900 via-blue-600 to-blue-400 opacity-80" />
                        <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '4px 4px' }}></div>
                    </div>
                </div>

                <h1 className="text-2xl font-bold leading-tight tracking-tight mb-3 text-foreground">New Thinking Session</h1>
                <p className="text-sm text-muted-foreground leading-relaxed mb-8">
                    Your non-linear exploration starts here. Create branches, explore ideas, and let your thoughts flow naturally.
                </p>

                {/* Chips */}
                <div className="flex flex-wrap justify-center gap-2">
                    {['Logic Puzzles', 'Strategic Planning', 'Creative Writing'].map((label) => (
                        <button
                            key={label}
                            onClick={() => onChipClick(label)}
                            className="px-4 py-2 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-all"
                        >
                            {label}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};
