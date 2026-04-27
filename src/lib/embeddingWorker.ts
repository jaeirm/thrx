// Web worker node shims requirement for Next.js isolated scope
if (typeof self !== 'undefined' && !(self as any).process) {
    (self as any).process = { env: {} };
}

import { pipeline, env } from '@xenova/transformers';

// Setup environment purely for the isolated Web Worker context
env.allowLocalModels = false;
env.useBrowserCache = true; // Re-enable cache, it wasn't the deadlock

// Force configure ONNX backends
if (!env.backends.onnx) env.backends.onnx = {} as any;
if (!env.backends.onnx.wasm) env.backends.onnx.wasm = {} as any;

env.backends.onnx.wasm.numThreads = 1; // Safest for multi-browser compatibility
env.backends.onnx.wasm.simd = false; // Disable SIMD to prevent hard WASM crashes on inference
env.backends.onnx.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2/dist/';

let extractor: any = null;

self.addEventListener('message', async (event) => {
    const { id, text, type } = event.data;

    try {
        if (type === 'init') {
            if (!extractor) {
                console.log("[Worker] Starting pipeline initialization...");
                extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
                    quantized: true, // Force 8-bit quantization to prevent OOM
                    progress_callback: (x: any) => {
                        console.log("[Worker Progress]", x);
                        self.postMessage({ type: 'progress', data: x });
                    }
                });
                console.log("[Worker] Pipeline initialized successfully!");
            }
            self.postMessage({ id, type: 'init_done' });
        } else if (type === 'embed') {
            if (!extractor) {
                throw new Error("Worker extractor not initialized");
            }
            const output = await extractor(text, { pooling: 'mean', normalize: true });
            self.postMessage({ id, type: 'embed_done', data: Array.from(output.data) });
        }
    } catch (err: any) {
        self.postMessage({ id, type: 'error', error: err.message || err.toString() });
    }
});
