// skillRunner.ts

export interface SkillResult {
    success: boolean;
    result?: any;
    error?: string;
}

/**
 * Executes a dynamically loaded JavaScript string inside the sandboxed iframe.
 */
export async function runSkillLogic(codeString: string, args: Record<string, any> = {}): Promise<SkillResult> {
    return new Promise((resolve) => {
        const iframe = document.getElementById('thrx-skill-sandbox') as HTMLIFrameElement;
        if (!iframe || !iframe.contentWindow) {
            resolve({ success: false, error: "Sandbox iframe not found or not ready" });
            return;
        }

        const messageId = Date.now().toString() + Math.random().toString();

        const handleMessage = (e: MessageEvent) => {
            if (e.data && e.data.type === 'SKILL_RESULT' && e.data.payload.id === messageId) {
                window.removeEventListener('message', handleMessage);
                if (e.data.payload.success) {
                    resolve({ success: true, result: e.data.payload.result });
                } else {
                    resolve({ success: false, error: e.data.payload.error });
                }
            }
        };

        window.addEventListener('message', handleMessage);

        iframe.contentWindow.postMessage({
            type: 'EXECUTE_SKILL',
            payload: { code: codeString, args, id: messageId }
        }, '*'); // targetOrigin is '*' because the iframe is sandboxed and its origin is 'null'

        // Optional timeout
        setTimeout(() => {
            window.removeEventListener('message', handleMessage);
            resolve({ success: false, error: "Skill execution timed out." });
        }, 10000);
    });
}
