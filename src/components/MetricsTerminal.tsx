import React, { useState, useEffect, useRef } from 'react';
import { Terminal, ChevronUp, ChevronDown, Activity, Cpu, DollarSign, Database } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ModelType } from '@/types';

interface MetricsTerminalProps {
    logs: string[];
    modelId: ModelType;
    metrics: string; // "prefill: 10 tok/s, decode: 20 tok/s" etc.
}

export const MetricsTerminal: React.FC<MetricsTerminalProps> = ({ logs, modelId, metrics }) => {
    const [isOpen, setIsOpen] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto-scroll logic
    useEffect(() => {
        if (scrollRef.current && isOpen) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [logs, isOpen]);

    return (
        <div 
            className={cn(
                "relative z-40 bg-[#0d1117] border-t border-white/10 font-mono transition-all duration-300 ease-in-out flex flex-col shadow-[0_-10px_40px_rgba(0,0,0,0.5)] shrink-0 w-full",
                isOpen ? "h-64" : "h-10"
            )}
        >
            {/* Header Bar */}
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="h-10 flex shrink-0 items-center justify-between px-4 bg-[#161b22] hover:bg-[#1f242c] transition-colors border-b border-black cursor-pointer text-xs"
            >
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2 text-primary font-semibold">
                        <Terminal size={14} />
                        SYSTEM TERMINAL
                    </div>

                    <div className="hidden sm:flex items-center gap-6 text-muted-foreground opacity-80">
                        <div className="flex items-center gap-1.5" title="Active Core Model">
                            <Cpu size={12} className="text-purple-400" />
                            {modelId.includes('Llama') ? 'Llama 3.2 1B (Local)' : modelId}
                        </div>
                        <div className="flex items-center gap-1.5" title="Hardware Analytics">
                            <Activity size={12} className={metrics ? "text-green-400 animate-pulse" : "text-gray-500"} />
                            {metrics || "Idle"}
                        </div>
                        <div className="flex items-center gap-1.5" title="Local RAG Cost (100% Free)">
                            <DollarSign size={12} className="text-emerald-400" />
                            $0.00
                        </div>
                    </div>
                </div>
                
                <div className="flex items-center gap-2 text-muted-foreground">
                    {!isOpen && <span className="opacity-50 hidden sm:inline">{logs.length > 0 ? logs[logs.length-1] : 'Waiting...'}</span>}
                    {isOpen ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                </div>
            </button>

            {/* Terminal Body */}
            <div 
                ref={scrollRef}
                className={cn(
                    "flex-1 overflow-y-auto p-4 space-y-1.5 text-[11px] leading-relaxed scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent",
                    !isOpen && "hidden"
                )}
            >
                {logs.length === 0 ? (
                    <div className="text-muted-foreground opacity-50 italic">System initialized. Awaiting commands...</div>
                ) : (
                    logs.map((log, i) => {
                        const isError = log.toLowerCase().includes('error') || log.toLowerCase().includes('fail');
                        const isSuccess = log.toLowerCase().includes('complete') || log.toLowerCase().includes('done') || log.toLowerCase().includes('success');
                        
                        return (
                            <div key={i} className="flex gap-3">
                                <span className="text-slate-600 shrink-0 w-20">[{new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}]</span>
                                <span className={cn(
                                    "break-words",
                                    isError ? "text-red-400" : isSuccess ? "text-green-400" : "text-slate-300"
                                )}>
                                    {log}
                                </span>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};
