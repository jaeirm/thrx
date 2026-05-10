import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Brain, Zap, Globe } from 'lucide-react';

interface EmptyStateProps {
    onChipClick: (text: string) => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ onChipClick }) => {
    return (
        <div className="relative flex flex-col items-center justify-center flex-1 w-full px-8 text-center overflow-hidden min-h-[60vh]">
            
            {/* --- Animated Background Pattern --- */}
            <div className="absolute inset-0 z-0">
                {/* Subtle Grid */}
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)]" />
                
                {/* Pulsating Orbs */}
                <motion.div 
                    animate={{ 
                        scale: [1, 1.2, 1],
                        opacity: [0.1, 0.2, 0.1],
                        x: [0, 50, 0],
                        y: [0, -30, 0]
                    }}
                    transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                    className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 blur-[120px] rounded-full"
                />
                <motion.div 
                    animate={{ 
                        scale: [1, 1.5, 1],
                        opacity: [0.1, 0.15, 0.1],
                        x: [0, -60, 0],
                        y: [0, 40, 0]
                    }}
                    transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                    className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-blue-500/10 blur-[150px] rounded-full"
                />
            </div>

            {/* --- Floating Interactive Nodes --- */}
            <div className="absolute inset-0 z-0 pointer-events-none">
                {[...Array(6)].map((_, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0 }}
                        animate={{ 
                            opacity: [0.2, 0.5, 0.2],
                            y: [0, -20, 0],
                            x: [0, i % 2 === 0 ? 10 : -10, 0]
                        }}
                        transition={{ 
                            duration: 4 + i, 
                            repeat: Infinity, 
                            delay: i * 0.5 
                        }}
                        className="absolute"
                        style={{ 
                            left: `${20 + (i * 12)}%`, 
                            top: `${30 + (i * 8)}%` 
                        }}
                    >
                        <div className="w-1 h-1 bg-primary/40 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
                    </motion.div>
                ))}
            </div>

            {/* --- Main Content --- */}
            <div className="relative z-10 flex flex-col items-center max-w-xl text-center space-y-12">
                
                {/* Central Identity Icon */}
                <motion.div 
                    whileHover={{ scale: 1.05 }}
                    className="relative group cursor-pointer"
                >
                    <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full opacity-50 group-hover:opacity-100 transition-opacity duration-500" />
                    <div className="relative flex items-center justify-center">
                        <div className="absolute w-24 h-24 border border-primary/20 rounded-full animate-[spin_10s_linear_infinite]" />
                        <div className="absolute w-20 h-20 border border-primary/40 rounded-full animate-[spin_6s_linear_infinite_reverse]" />
                        <div className="p-6 bg-background/50 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl overflow-hidden group-hover:border-primary/50 transition-colors">
                            <Sparkles className="w-10 h-10 text-primary animate-pulse" />
                            {/* Inner Glow */}
                            <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                    </div>
                </motion.div>

                <div className="space-y-6">
                    <motion.h1 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="text-5xl font-extralight tracking-tighter text-white sm:text-6xl"
                    >
                        What's on your <span className="font-semibold text-transparent bg-clip-text bg-gradient-to-r from-primary via-blue-400 to-indigo-400">mind?</span>
                    </motion.h1>
                    <motion.p 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.4 }}
                        className="text-sm text-muted-foreground/60 tracking-widest font-light uppercase"
                    >
                        Sovereign Intelligence • Local-First Architecture • Agentic Workflow
                    </motion.p>
                </div>

                {/* Quick Action Chips */}
                <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                    className="flex flex-wrap justify-center gap-3"
                >
                    {[
                        { icon: <Brain size={14} />, label: "Analyze my documents", text: "Analyze the documents in my library and give me a summary." },
                        { icon: <Zap size={14} />, label: "Perform research", text: "Help me research the latest trends in AI agents." },
                        { icon: <Globe size={14} />, label: "Browse the web", text: "Search the web for the current stock price of NVIDIA." }
                    ].map((chip, idx) => (
                        <button
                            key={idx}
                            onClick={() => onChipClick(chip.text)}
                            className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-xs font-medium text-muted-foreground hover:text-white transition-all hover:scale-105 active:scale-95 backdrop-blur-sm"
                        >
                            {chip.icon}
                            {chip.label}
                        </button>
                    ))}
                </motion.div>
            </div>
        </div>
    );
};
