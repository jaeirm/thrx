"use client";

import React from 'react';

import { useSystemBridge } from '../hooks/useSystemBridge';
import { Terminal, Shield, ShieldAlert, Cpu } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const SystemBridgeStatus: React.FC = () => {
    const { isConnected, error, linkBridgeManually } = useSystemBridge();
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            await linkBridgeManually(file);
        }
    };

    return (
        <div className="fixed bottom-4 left-4 z-50">
            <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                className="hidden" 
                accept=".json"
            />
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex items-center gap-3 px-4 py-2 rounded-full border shadow-lg backdrop-blur-md transition-colors ${
                    isConnected 
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                        : 'bg-zinc-900/80 border-zinc-700 text-zinc-400 hover:bg-zinc-800 cursor-pointer group'
                }`}
                onClick={() => !isConnected && fileInputRef.current?.click()}
                title={isConnected ? "Bridge Active" : "Click to manually link bridge file"}
            >
                {isConnected ? (
                    <>
                        <div className="relative">
                            <Cpu size={18} className="animate-pulse" />
                            <div className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-500 rounded-full border border-zinc-900" />
                        </div>
                        <span className="text-sm font-medium">Bridge Active</span>
                    </>
                ) : (
                    <>
                        <ShieldAlert size={18} className="text-zinc-500 group-hover:text-zinc-300 transition-colors" />
                        <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">Bridge Offline</span>
                                <span className="text-[10px] px-1.5 py-0.5 bg-zinc-700 rounded text-zinc-300 opacity-0 group-hover:opacity-100 transition-opacity">Link</span>
                            </div>
                            {error && <span className="text-[10px] opacity-70 truncate max-w-[150px]">{error}</span>}
                        </div>
                    </>
                )}
            </motion.div>
        </div>
    );
};
