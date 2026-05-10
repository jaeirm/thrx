"use client";

import { useState, useEffect, useCallback } from 'react';

import { fsSync } from '../lib/fileSystemSync';
import { get, set } from 'idb-keyval';

interface BridgeConfig {
    port: number;
    token: string;
}

interface ExecuteResponse {
    stdout: string;
    stderr: string;
    status: number;
}

export const useSystemBridge = () => {
    const [config, setConfig] = useState<BridgeConfig | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const discoverBridge = useCallback(async () => {
        try {
            // 1. Try Tauri Auto-Discovery (if running inside Tauri)
            if (typeof window !== 'undefined' && (window as any).__TAURI__) {
                try {
                    console.log("[Bridge] Detected Tauri environment, fetching native config...");
                    const tauriConfig: BridgeConfig = await (window as any).__TAURI__.core.invoke('get_bridge_config');
                    if (tauriConfig) {
                        console.log("[Bridge] Found native Tauri config!");
                        setConfig(tauriConfig);
                        setIsConnected(true);
                        setError(null);
                        await set('thrx_bridge_config', tauriConfig);
                        return;
                    }
                } catch (e) {
                    console.warn("[Bridge] Tauri invoke failed, falling back to other methods:", e);
                }
            }

            // 2. Try Persisted Config from IDB
            const savedConfig = await get('thrx_bridge_config');
            if (savedConfig) {
                console.log("[Bridge] Found persisted config in IDB");
                setConfig(savedConfig);
                setIsConnected(true);
                setError(null);
                // Verify connection (optional but good)
                return;
            }

            // 3. Try Auto-Discovery in Synced Folder
            if (fsSync.isReady()) {
                const configContent = await fsSync.readFile('thrx_bridge.json');
                if (configContent) {
                    console.log("[Bridge] Found config in synced folder!");
                    const parsedConfig: BridgeConfig = JSON.parse(configContent);
                    setConfig(parsedConfig);
                    setIsConnected(true);
                    setError(null);
                    await set('thrx_bridge_config', parsedConfig);
                } else {
                    console.log("[Bridge] thrx_bridge.json not found in synced folder.");
                    setIsConnected(false);
                }
            }
        } catch (e: any) {
            console.error("Failed to discover bridge:", e);
            setError(e.message);
            setIsConnected(false);
        }
    }, []);

    const linkBridgeManually = async (file: File) => {
        try {
            const content = await file.text();
            const parsedConfig: BridgeConfig = JSON.parse(content);
            if (parsedConfig.port && parsedConfig.token) {
                setConfig(parsedConfig);
                setIsConnected(true);
                setError(null);
                await set('thrx_bridge_config', parsedConfig);
                return true;
            }
            throw new Error("Invalid bridge config format");
        } catch (e: any) {
            setError("Invalid bridge file: " + e.message);
            return false;
        }
    };


    useEffect(() => {
        discoverBridge();
        // Poll for discovery every 5 seconds if not connected
        const interval = setInterval(() => {
            if (!isConnected) discoverBridge();
        }, 5000);
        return () => clearInterval(interval);
    }, [discoverBridge, isConnected]);

    const executeCommand = async (command: string): Promise<ExecuteResponse | null> => {
        // 1. Prioritize Native Tauri IPC
        if (typeof window !== 'undefined' && (window as any).__TAURI__) {
            try {
                const res: ExecuteResponse = await (window as any).__TAURI__.core.invoke('execute_command', { command });
                return res;
            } catch (e: any) {
                console.error("[Bridge] Native IPC execution failed:", e);
                // Fallback to HTTP if IPC fails for some reason
            }
        }

        // 2. Fallback to Local HTTP Bridge
        if (!config) {
            setError("Bridge not connected");
            return null;
        }

        try {
            const res = await fetch(`http://127.0.0.1:${config.port}/execute`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: config.token, command })
            });

            if (!res.ok) {
                const errText = await res.text();
                throw new Error(errText || `Bridge error: ${res.status}`);
            }

            return await res.json();
        } catch (e: any) {
            setError(e.message);
            console.error("Bridge execution failed:", e);
            return null;
        }
    };

    return { isConnected, executeCommand, error, discoverBridge, linkBridgeManually };
};
