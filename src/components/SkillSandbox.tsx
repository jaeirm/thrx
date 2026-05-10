// SkillSandbox.tsx
import React, { useEffect, useRef } from 'react';

// Defines the API we inject into the iframe
const SAFE_API = `
const safeAPI = {
    log: (...args) => window.parent.postMessage({ type: 'LOG', payload: args }, '*'),
    // Add safe methods here like fetch constraints, memory reading wrappers, etc.
};
`;

export const SkillSandbox = () => {
    const iframeRef = useRef<HTMLIFrameElement>(null);

    useEffect(() => {
        const handleMessage = (e: MessageEvent) => {
            // Here we receive messages FROM the sandbox (like LOG or completion)
            if (e.data && e.data.type === 'LOG') {
                console.log("[Skill Sandbox]:", ...e.data.payload);
            } else if (e.data && e.data.type === 'SKILL_RESULT') {
                if (!e.data.payload.success) {
                    console.error("[Skill Sandbox] Execution Error (Sandbox Blocked):", e.data.payload.error);
                } else {
                    console.log("[Skill Sandbox] Execution Success:", e.data.payload.result);
                }
            }
        };
        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, []);

    // Create the iframe HTML content with safe API injected
    const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <script>
                ${SAFE_API}

                window.addEventListener('message', async (e) => {
                    if (e.data && e.data.type === 'EXECUTE_SKILL') {
                        const { code, args, id } = e.data.payload;
                        try {
                            // Even though we use eval inside the iframe, the iframe is sandboxed
                            // and has no access to parent DOM, cookies, or localStorage.
                            const asyncFunc = new Function('args', 'safeAPI', \`
                                return (async () => {
                                    \${code}
                                })();
                            \`);
                            const result = await asyncFunc(args, safeAPI);
                            window.parent.postMessage({ type: 'SKILL_RESULT', payload: { id, success: true, result } }, '*');
                        } catch (error) {
                            window.parent.postMessage({ type: 'SKILL_RESULT', payload: { id, success: false, error: error.message } }, '*');
                        }
                    }
                });
            </script>
        </head>
        <body></body>
        </html>
    `;

    return (
        <iframe 
            ref={iframeRef}
            id="thrx-skill-sandbox"
            sandbox="allow-scripts" // Strict sandbox: NO allow-same-origin, NO allow-top-navigation
            srcDoc={htmlContent}
            style={{ display: 'none' }} 
            title="Skill Sandbox"
        />
    );
};
