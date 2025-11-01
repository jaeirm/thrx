import express from 'express';
import type { Request, Response } from 'express';
import cors from 'cors';
import { spawn } from 'child_process';

const app = express();
app.use(express.json());
app.use(cors());

app.post('/api/chat', async (req: Request, res: Response) => {
  const { message } = req.body as { message?: string };
  if (!message) return res.status(400).json({ error: 'Message required' });

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  (res as any).flushHeaders?.();

  const ollama = spawn('ollama', ['run', 'phi3:mini'], {
    stdio: ['pipe', 'pipe', 'inherit'],
  });

  ollama.stdin.write(message + '\n');
  ollama.stdin.end();

  let buffer = '';

  ollama.stdout.on('data', (chunk: Buffer) => {
    buffer += chunk.toString();

    const sentences = buffer.split(/(?<=[.!?])\s+|\n+/);
    buffer = sentences.pop() || '';

    for (const sentence of sentences) {
      res.write(`data: ${sentence.trim()}\n\n`);
      (res as any).flush?.();
    }
  });

  ollama.on('close', () => {
    if (buffer.trim()) res.write(`data: ${buffer.trim()}\n\n`);
    res.write('data: [DONE]\n\n');
    (res as any).flush?.();
    res.end();
  });

  ollama.on('error', (err: Error) => {
    console.error('Ollama error:', err);
    res.write(`data: [ERROR] ${err.message}\n\n`);
    res.end();
  });
});

app.listen(5000, () =>
  console.log('Streaming server running on http://localhost:5000')
);
