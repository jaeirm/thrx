// heartbeat.worker.ts

let heartbeatInterval: ReturnType<typeof setTimeout> | null = null;
let isSleeping = false;

// Backoff configuration
const MIN_INTERVAL = 5000;
const MAX_INTERVAL = 300000; // 5 minutes
let currentInterval = MIN_INTERVAL;

let lastHeartbeatAt = 0;

self.onmessage = (e: MessageEvent) => {
    const { type, payload } = e.data;

    switch (type) {
        case 'START':
            if (payload?.lastHeartbeatAt) {
                lastHeartbeatAt = payload.lastHeartbeatAt;
                console.log(`[Worker] Resuming from last heartbeat at ${lastHeartbeatAt}`);
            }
            startHeartbeat();
            break;
            
        case 'STOP':
            stopHeartbeat();
            break;
            
        case 'SET_VISIBILITY':
            const wasSleeping = isSleeping;
            isSleeping = payload === 'hidden';
            
            if (isSleeping) {
                console.log(`[Worker] Visibility hidden. Entering Sleep Mode (Exponential Backoff).`);
                // Next tick will start backoff
            } else {
                console.log(`[Worker] Visibility visible. Resuming active loop (${MIN_INTERVAL}ms).`);
                currentInterval = MIN_INTERVAL;
                if (wasSleeping) {
                    // Trigger immediate sync tick on wake
                    stopHeartbeat();
                    scheduleTick(0);
                }
            }
            break;
    }
};

function startHeartbeat() {
    if (heartbeatInterval) return;
    console.log(`[Worker] Heartbeat started.`);
    
    // Calculate if we missed a lot of time
    const now = Date.now();
    if (lastHeartbeatAt > 0 && (now - lastHeartbeatAt) > MAX_INTERVAL) {
        console.log(`[Worker] Reconciling missed interval. Last run was ${(now - lastHeartbeatAt)/1000}s ago.`);
        // E.g., handle immediate catch-up logic
    }
    
    scheduleTick(0);
}

function stopHeartbeat() {
    if (heartbeatInterval) {
        clearTimeout(heartbeatInterval);
        heartbeatInterval = null;
        console.log('[Worker] Heartbeat stopped.');
    }
}

async function tick() {
    const now = Date.now();
    lastHeartbeatAt = now;
    
    // Save state via main thread
    self.postMessage({ type: 'SAVE_STATE', payload: { lastHeartbeatAt } });
    
    // 1. Tell main thread to check the HEARTBEAT.md
    self.postMessage({ type: 'CHECK_TASKS' });

    // 2. Poll Messaging Platforms (e.g. Telegram)
    self.postMessage({ type: 'POLL_MESSAGES' });

    // Calculate next interval
    if (isSleeping) {
        currentInterval = Math.min(currentInterval * 2, MAX_INTERVAL);
    } else {
        currentInterval = MIN_INTERVAL;
    }

    scheduleTick(currentInterval);
}

function scheduleTick(delayMs: number) {
    if (heartbeatInterval) clearTimeout(heartbeatInterval);
    heartbeatInterval = setTimeout(tick, delayMs);
}

export {};
