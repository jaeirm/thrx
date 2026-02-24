import React, { useEffect, useRef } from 'react';
import { Terminal, Cpu, CheckCircle2, Loader2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface LocalModelStatusProps {
    isOpen: boolean;
    onClose: () => void;
    modelName: string;
    progress: number;
    logs: string[];
    isComplete: boolean;
}

export const LocalModelStatus: React.FC<LocalModelStatusProps> = ({
    isOpen,
    onClose,
    modelName,
    progress,
    logs,
    isComplete
}) => {
    const logsEndRef = useRef<HTMLDivElement>(null);

    // Auto-scroll logs
    useEffect(() => {
        if (logsEndRef.current) {
            logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [logs]);

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            >
                <motion.div
                    initial={{ scale: 0.95, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.95, opacity: 0, y: 20 }}
                    className="w-full max-w-2xl bg-[#0d1117] border border-slate-700/50 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
                >
                    {/* Terminal Header */}
                    <div className="flex items-center justify-between px-4 py-3 bg-slate-900 border-b border-slate-700/50">
                        <div className="flex items-center gap-3">
                            <div className="flex gap-1.5">
                                <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50" />
                                <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/50" />
                                <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/50" />
                            </div>
                            <div className="flex items-center gap-2 ml-2 text-slate-400 text-xs font-mono">
                                <Terminal size={12} />
                                <span>loading_sequence.sh</span>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-slate-500 hover:text-slate-300 transition-colors"
                        >
                            <X size={16} />
                        </button>
                    </div>

                    {/* Status Info */}
                    <div className="p-6 bg-slate-900/50 border-b border-slate-700/30">
                        <div className="flex items-start justify-between mb-4">
                            <div>
                                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                    <Cpu className="text-blue-500" size={20} />
                                    Initializing {modelName}
                                </h3>
                                <p className="text-sm text-slate-400 mt-1 truncate max-w-[400px]">
                                    {logs.length > 0 ? logs[logs.length - 1].replace(/^\[.*?\]\s*/, '') : "Starting engine..."}
                                </p>
                            </div>
                            <div className="text-right">
                                <div className="text-2xl font-mono font-bold text-blue-400">
                                    {Math.round(progress * 100)}%
                                </div>
                                <div className="text-xs text-slate-500 uppercase tracking-wider">Complete</div>
                            </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                            <motion.div
                                className="h-full bg-gradient-to-r from-blue-600 to-cyan-500"
                                initial={{ width: 0 }}
                                animate={{ width: `${progress * 100}%` }}
                                transition={{ type: "spring", stiffness: 50, damping: 15 }}
                            />
                        </div>
                    </div>

                    {/* Terminal Logs */}
                    <div className="flex-1 bg-black/80 font-mono text-xs p-4 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
                        <div className="space-y-1">
                            {logs.length === 0 && (
                                <div className="text-slate-500 animate-pulse">Waiting for engine start...</div>
                            )}
                            {logs.map((log, index) => (
                                <div key={index} className="flex gap-2">
                                    <span className="text-slate-600 min-w-[30px] select-none">{(index + 1).toString().padStart(3, '0')}</span>
                                    <span className={cn(
                                        "break-all",
                                        log.toLowerCase().includes('error') ? "text-red-400" :
                                            log.toLowerCase().includes('finish') || log.toLowerCase().includes('loaded') ? "text-green-400" :
                                                "text-slate-300"
                                    )}>
                                        <span className="text-blue-500/50 mr-2">$</span>
                                        {log}
                                    </span>
                                </div>
                            ))}
                            <div ref={logsEndRef} />
                        </div>
                    </div>

                    {/* Footer Actions */}
                    {isComplete && (
                        <div className="p-4 bg-slate-900 border-t border-slate-700/50 flex justify-end">
                            <button
                                onClick={onClose}
                                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-medium text-sm"
                            >
                                <CheckCircle2 size={16} />
                                Ready to Chat
                            </button>
                        </div>
                    )}
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};
