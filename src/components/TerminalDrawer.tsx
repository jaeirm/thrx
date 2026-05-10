import React, { useEffect, useRef, useState } from 'react';
import { X, Maximize2, Minimize2, Terminal as TerminalIcon, Loader2, Cpu, Globe, Zap, ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSystemBridge } from '@/hooks/useSystemBridge';

interface TerminalDrawerProps {
    isOpen: boolean;
    onClose: () => void;
}

declare global {
    interface Window {
        V86Starter: any;
        V86: any;
        Terminal: any;
        FitAddon: any;
    }
}

const DANGEROUS_COMMANDS = ['rm', 'del', 'format', 'mkfs', 'dd', 'sudo', 'chmod', 'chown', 'rd', 'deltree'];

export const TerminalDrawer: React.FC<TerminalDrawerProps> = ({ isOpen, onClose }) => {
    const terminalRef = useRef<HTMLDivElement>(null);
    const xtermRef = useRef<any>(null);
    const fitAddonRef = useRef<any>(null);
    const v86Ref = useRef<any>(null);
    const nativeBufferRef = useRef('');
    const isWaitingForConfirmationRef = useRef<string | null>(null);
    
    const { isConnected: isBridgeConnected, executeCommand: executeSystemCommand } = useSystemBridge();
    
    const [isMaximized, setIsMaximized] = useState(false);
    const [status, setStatus] = useState<'IDLE' | 'LOADING' | 'BOOTING' | 'READY'>('IDLE');
    const [isTerminalReady, setIsTerminalReady] = useState(false);
    const [terminalMode, setTerminalMode] = useState<'SOVEREIGN' | 'NATIVE'>(isBridgeConnected ? 'NATIVE' : 'SOVEREIGN');

    const prompt = '\r\n\x1b[1;32mthrx@native\x1b[0m:\x1b[1;34m~\x1b[0m$ ';

    useEffect(() => {
        if (isBridgeConnected && status === 'IDLE') {
            setTerminalMode('NATIVE');
        }
    }, [isBridgeConnected, status]);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const loadScripts = async () => {
            if (window.V86Starter) {
                setIsTerminalReady(true);
                return;
            }
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = 'https://cdn.jsdelivr.net/npm/xterm@5.3.0/css/xterm.css';
            document.head.appendChild(link);
            const scripts = [
                'https://cdn.jsdelivr.net/npm/xterm@5.3.0/lib/xterm.js',
                'https://cdn.jsdelivr.net/npm/xterm-addon-fit@0.8.0/lib/xterm-addon-fit.js',
                '/build/libv86.js?v=3'
            ];
            for (const src of scripts) {
                document.querySelectorAll('script[src*="v86_all.js"]').forEach(s => s.remove());
                if (!document.querySelector(`script[src="${src}"]`)) {
                    const script = document.createElement('script');
                    script.src = src;
                    document.head.appendChild(script);
                    await new Promise((resolve) => script.onload = resolve);
                }
            }
            setIsTerminalReady(true);
        };
        loadScripts();
    }, []);

    useEffect(() => {
        if (!isOpen || !isTerminalReady || !terminalRef.current) return;
        let cleanupNative: (() => void) | undefined;
        let term: any;

        const setupXterm = () => {
            term = new (window as any).Terminal({
                cursorBlink: true,
                fontSize: 12,
                fontFamily: 'JetBrains Mono, Menlo, Monaco, "Courier New", monospace',
                theme: {
                    background: 'transparent',
                    foreground: '#ffffff',
                    cursor: terminalMode === 'SOVEREIGN' ? '#3b82f6' : '#fbbf24',
                    selectionBackground: terminalMode === 'SOVEREIGN' ? 'rgba(59, 130, 246, 0.3)' : 'rgba(251, 191, 36, 0.3)',
                },
                allowTransparency: true,
            });
            const fitAddon = new (window as any).FitAddon.FitAddon();
            term.loadAddon(fitAddon);
            term.open(terminalRef.current!);
            setTimeout(() => fitAddon.fit(), 50);
            xtermRef.current = term;
            fitAddonRef.current = fitAddon;
            return term;
        };

        const initV86 = async (term: any) => {
            term.writeln('\x1b[1;34m[Thrx] Initializing Virtual x86 Hardware...\x1b[0m');
            const v86Script = '/build/libv86.js?v=3';
            if (!document.querySelector(`script[src*="libv86.js"]`)) {
                document.querySelectorAll('script[src*="v86_all.js"]').forEach(s => s.remove());
                await new Promise((resolve, reject) => {
                    const script = document.createElement('script');
                    script.src = v86Script;
                    script.async = true;
                    script.onload = resolve;
                    script.onerror = reject;
                    document.head.appendChild(script);
                });
            }
            const V86Constructor = (window as any).V86 || (window as any).V86Starter;
            if (!V86Constructor) {
                term.writeln('\x1b[31m[Thrx Error] V86 Engine failed to load.\x1b[0m');
                return;
            }
            try {
                ['screen_container', 'take_screenshot', 'mute'].forEach(id => {
                    let el = document.getElementById(id);
                    if (!el) {
                        el = document.createElement('div');
                        el.id = id;
                        el.style.display = 'none';
                        document.body.appendChild(el);
                    }
                    if (id === 'screen_container' && el.getElementsByTagName('canvas').length === 0) {
                        el.appendChild(document.createElement('canvas'));
                    }
                });
                const emulator = new V86Constructor({
                    wasm_path: "/build/v86.wasm",
                    memory_size: 512 * 1024 * 1024,
                    vga_memory_size: 8 * 1024 * 1024,
                    vga_as_text_adapter: true,
                    container: document.getElementById('screen_container'),
                    screen_container: document.getElementById('screen_container'),
                    initial_state: { url: "/build/arch_state.bin.zst" },
                    filesystem: { baseurl: "https://i.copy.sh/arch/" },
                    autostart: true,
                });
                const addListener = (event: string, callback: any) => {
                    if (emulator.add_listener) emulator.add_listener(event, callback);
                    else if (emulator.bus?.on) emulator.bus.on(event, callback);
                };
                addListener("serial0-output-char", (char: string) => {
                    term.write(char);
                    if (status !== 'READY') setStatus('READY');
                });
                term.onData((data: string) => {
                    if (emulator.serial0_send) emulator.serial0_send(data);
                    else if (emulator.bus?.send) emulator.bus.send("serial0-input", data);
                });
                addListener("emulator-ready", () => {
                    setStatus('BOOTING');
                    term.writeln('\x1b[1;32m[Thrx] Virtual Hardware Ready. Booting...\x1b[0m');
                });
                v86Ref.current = emulator;
            } catch (err) {
                term.writeln('\x1b[31m[Thrx Error] Emulator initialization failed.\x1b[0m');
            }
        };

        const handleNativeCommand = async (cmd: string, term: any) => {
            // Check for dangerous commands
            const baseCmd = cmd.toLowerCase().split(' ')[0];
            if (DANGEROUS_COMMANDS.includes(baseCmd) && !isWaitingForConfirmationRef.current) {
                isWaitingForConfirmationRef.current = cmd;
                term.writeln('\x1b[1;33m\r\n[SECURITY ALERT] This command is potentially destructive.');
                term.write('\x1b[1;37mAre you sure you want to proceed? (y/n): \x1b[0m');
                return;
            }

            try {
                // Log command (audit)
                if (typeof window !== 'undefined' && (window as any).__TAURI__) {
                    await (window as any).__TAURI__.core.invoke('log_command', { command: cmd });
                }

                const result = await executeSystemCommand(cmd);
                if (result) {
                    if (result.stdout) term.write(result.stdout.replace(/\n/g, '\r\n'));
                    if (result.stderr) term.write('\x1b[31m' + result.stderr.replace(/\n/g, '\r\n') + '\x1b[0m');
                    if (!result.stdout && !result.stderr) term.writeln('\x1b[90m(No output)\x1b[0m');
                }
            } catch (e: any) {
                term.writeln(`\x1b[31m[Bridge Error] ${e.message}\x1b[0m`);
            }
            term.write(prompt);
            nativeBufferRef.current = '';
        };

        const initNative = (term: any) => {
            term.writeln('\x1b[1;36m[Thrx] Connected to Native Host OS Bridge.\x1b[0m');
            term.write(prompt.replace('\r\n', ''));
            setStatus('READY');

            const onDataDisposable = term.onData(async (data: string) => {
                if (isWaitingForConfirmationRef.current) {
                    const char = data.toLowerCase();
                    if (char === 'y') {
                        const cmdToRun = isWaitingForConfirmationRef.current;
                        isWaitingForConfirmationRef.current = null;
                        term.write('y\r\n');
                        await handleNativeCommand(cmdToRun, term);
                    } else if (char === 'n' || char === '\r') {
                        isWaitingForConfirmationRef.current = null;
                        term.write('n\r\n');
                        term.write(prompt);
                        nativeBufferRef.current = '';
                    }
                    return;
                }

                if (data === '\r') {
                    term.write('\r\n');
                    const cmd = nativeBufferRef.current.trim();
                    if (cmd) {
                        await handleNativeCommand(cmd, term);
                    } else {
                        term.write(prompt);
                    }
                } else if (data === '\u007f') {
                    if (nativeBufferRef.current.length > 0) {
                        nativeBufferRef.current = nativeBufferRef.current.slice(0, -1);
                        term.write('\b \b');
                    }
                } else if (data === '\u0003') {
                    nativeBufferRef.current = '';
                    isWaitingForConfirmationRef.current = null;
                    term.write('^C' + prompt);
                } else {
                    const charCode = data.charCodeAt(0);
                    if (charCode >= 32 && charCode <= 126) {
                        nativeBufferRef.current += data;
                        term.write(data);
                    }
                }
            });
            return () => onDataDisposable.dispose();
        };

        const initTimeout = setTimeout(() => {
            const termInstance = setupXterm();
            if (terminalMode === 'SOVEREIGN') {
                initV86(termInstance);
            } else {
                cleanupNative = initNative(termInstance);
            }
        }, 100);

        return () => {
            clearTimeout(initTimeout);
            if (cleanupNative) cleanupNative();
            if (v86Ref.current) v86Ref.current.destroy();
            if (xtermRef.current) xtermRef.current.dispose();
            v86Ref.current = null;
            xtermRef.current = null;
            nativeBufferRef.current = '';
            isWaitingForConfirmationRef.current = null;
        };
    }, [isOpen, isTerminalReady, terminalMode]);

    useEffect(() => {
        const handleResize = () => fitAddonRef.current?.fit();
        window.addEventListener('resize', handleResize);
        setTimeout(handleResize, 100);
        return () => window.removeEventListener('resize', handleResize);
    }, [isOpen, isMaximized]);

    if (!isOpen) return null;

    return (
        <div className={cn("fixed left-0 right-0 bottom-0 z-[80] bg-[#0B0F1A]/95 backdrop-blur-3xl border-t border-white/10 transition-all duration-500 shadow-[0_-20px_50px_rgba(0,0,0,0.6)] flex flex-col overflow-hidden", isMaximized ? "h-[90vh]" : "h-[45vh]")}>
            <div className="flex items-center justify-between px-6 py-3 bg-white/5 border-b border-white/5 shrink-0 select-none">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/20 rounded-lg">
                        <TerminalIcon size={16} className="text-primary" />
                    </div>
                    <div>
                        <h3 className="text-[10px] font-bold text-white uppercase tracking-[0.2em] flex items-center gap-2">
                            {terminalMode === 'SOVEREIGN' ? 'Sovereign Linux Terminal' : 'Native OS Terminal'}
                            {status === 'LOADING' && <Loader2 size={12} className="animate-spin text-primary" />}
                            {status === 'BOOTING' && <Cpu size={12} className="animate-pulse text-amber-500" />}
                            {status === 'READY' && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}
                            {isWaitingForConfirmationRef.current && <ShieldAlert size={12} className="text-amber-500 animate-bounce" />}
                        </h3>
                        <p className="text-[9px] text-muted-foreground font-medium uppercase tracking-widest mt-0.5 opacity-50">
                            {terminalMode === 'SOVEREIGN' ? 'Alpine Linux x86 (v86 Virtual Machine)' : 'Direct Host OS Bridge (Tauri)'}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center bg-black/40 rounded-full p-1 border border-white/5">
                        <button onClick={() => setTerminalMode('SOVEREIGN')} className={cn("flex items-center gap-2 px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider transition-all", terminalMode === 'SOVEREIGN' ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-white")}><Globe size={12} /><span>Sovereign</span></button>
                        <button onClick={() => setTerminalMode('NATIVE')} className={cn("flex items-center gap-2 px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider transition-all", terminalMode === 'NATIVE' ? "bg-amber-500/20 text-amber-500" : "text-muted-foreground hover:text-white")}><Zap size={12} /><span>Native</span></button>
                    </div>
                    <button onClick={() => setIsMaximized(!isMaximized)} className="p-2 text-muted-foreground hover:text-white rounded-lg hover:bg-white/5 transition-all">{isMaximized ? <Minimize2 size={16} /> : <Maximize2 size={16} />}</button>
                    <button onClick={onClose} className="p-2 text-muted-foreground hover:text-red-400 rounded-lg hover:bg-red-400/10 transition-all"><X size={18} /></button>
                </div>
            </div>
            <div className="flex-1 overflow-hidden p-4">
                <div ref={terminalRef} className="w-full h-full [&_.xterm-viewport]:scrollbar-thin [&_.xterm-viewport]:scrollbar-thumb-white/10" />
            </div>
            <div className="px-6 py-1.5 bg-black/40 border-t border-white/[0.02] flex items-center justify-between text-[9px] font-bold text-muted-foreground uppercase tracking-widest">
                <div className="flex items-center gap-4">
                    <span>{terminalMode === 'SOVEREIGN' ? 'Mem: 128MB' : 'OS: Host'}</span>
                    <span>{terminalMode === 'SOVEREIGN' ? 'Arch: x86_32' : 'Shell: System'}</span>
                    <span>{terminalMode === 'SOVEREIGN' ? 'Network: Sandboxed' : 'Network: Direct'}</span>
                </div>
                <div className={cn("transition-colors text-emerald-500", terminalMode === 'SOVEREIGN' ? "text-primary opacity-50" : "opacity-50")}>{terminalMode === 'SOVEREIGN' ? 'v86 Kernel Active' : 'Native Bridge Active'}</div>
            </div>
        </div>
    );
};
