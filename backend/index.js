import express from "express";
import cors from "cors";
import { spawn } from "child_process";

const app = express();
app.use(express.json());
app.use(cors());

app.post("/api/chat", async (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: "Message required" });

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  const ollama = spawn("ollama", ["run", "phi3:mini"], {
    stdio: ["pipe", "pipe", "inherit"],
  });

  ollama.stdin.write(message + "\n");
  ollama.stdin.end();

  let buffer = "";

  ollama.stdout.on("data", (chunk) => {
    buffer += chunk.toString();

    // ✅ Detect sentence or word boundary
    const sentences = buffer.split(/(?<=[.!?])\s+|\n+/);

    // Keep last incomplete sentence in buffer
    buffer = sentences.pop() || "";

    for (const sentence of sentences) {
      res.write(`data: ${sentence.trim()}\n\n`);
      res.flush?.();
    }
  });

  ollama.on("close", () => {
    // Flush any remaining partial text
    if (buffer.trim()) {
      res.write(`data: ${buffer.trim()}\n\n`);
    }
    res.write("data: [DONE]\n\n");
    res.flush?.();
    res.end();
  });

  ollama.on("error", (err) => {
    console.error("Ollama error:", err);
    res.write(`data: [ERROR] ${err.message}\n\n`);
    res.end();
  });
});

app.listen(5000, () =>
  console.log("✅ Streaming server running on http://localhost:5000")
);