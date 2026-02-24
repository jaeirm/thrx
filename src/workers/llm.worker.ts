import { WebWorkerMLCEngineHandler, MLCEngine } from "@mlc-ai/web-llm";

// A handler that forwards messages between the main thread and the MLCEngine
const engine = new MLCEngine();
const handler = new (WebWorkerMLCEngineHandler as any)(engine);

self.onmessage = (msg: MessageEvent) => {
    handler.onmessage(msg);
};
