import { useEffect, useRef } from 'react';
import { fsSync } from '@/lib/fileSystemSync';
import { telegramPoller } from '@/lib/polling/telegramPoller';

export const useAgentDaemon = (onTelegramMessage?: (chatId: string, text: string) => Promise<string>) => {
    const workerRef = useRef<Worker | null>(null);

    useEffect(() => {
        // Initialize the Web Worker
        workerRef.current = new Worker(new URL('../workers/heartbeat.worker.ts', import.meta.url));
        
        const savedHeartbeatStr = localStorage.getItem('thrx_agent_last_seen');
        const lastHeartbeatAt = savedHeartbeatStr ? parseInt(savedHeartbeatStr, 10) : 0;

        // Start the heartbeat
        workerRef.current.postMessage({ 
            type: 'START',
            payload: { lastHeartbeatAt } 
        });

        // Handle visibility changes for Sleep Mode
        const handleVisibilityChange = () => {
            if (workerRef.current) {
                workerRef.current.postMessage({
                    type: 'SET_VISIBILITY',
                    payload: document.visibilityState
                });
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        let lastHeartbeatModified = 0;

        // Handle incoming messages from the worker
        workerRef.current.onmessage = async (e: MessageEvent) => {
            const { type, payload } = e.data;

            if (type === 'SAVE_STATE') {
                localStorage.setItem('thrx_agent_last_seen', payload.lastHeartbeatAt.toString());
            } else if (type === 'CHECK_TASKS') {
                if (fsSync.isReady()) {
                    const modified = await fsSync.getFileLastModified('HEARTBEAT.md');
                    if (modified && modified !== lastHeartbeatModified) {
                        lastHeartbeatModified = modified;
                        const heartbeatContent = await fsSync.readFile('HEARTBEAT.md');
                        if (heartbeatContent) {
                            // Basic parsing of structured HEARTBEAT.md
                            const tasksSection = heartbeatContent.split('## Tasks')[1]?.trim() || '';
                            // console.log("[Daemon] New heartbeat content detected.");
                        }
                    }
                }
            } else if (type === 'POLL_MESSAGES') {
                await telegramPoller.poll(onTelegramMessage);
            }
        };

        // Save final state before unload
        const handleBeforeUnload = () => {
            if (fsSync.isReady()) {
                // Try to save state.
                // Note: file system operations during unload are not guaranteed.
                // localStorage is more reliable.
                localStorage.setItem('thrx_agent_last_seen', Date.now().toString());
            }
        };
        
        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('beforeunload', handleBeforeUnload);
            workerRef.current?.terminate();
        };
    }, []);

    return null;
};
