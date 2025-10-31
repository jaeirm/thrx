import express from "express";
import cors from "cors";
import { spawn } from "child_process";

const app = express();
app.use(express.json());
app.use(cors());

app.post("/api/chat", async (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: "Message required" });

  // Set headers for streaming
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const ollama = spawn("ollama", ["run", "phi3:mini"], { stdio: ["pipe", "pipe", "inherit"] });

  // Write the user prompt to Ollama
  ollama.stdin.write(message + "\n");
  ollama.stdin.end();

  // Stream Ollama output as it arrives
  ollama.stdout.on("data", (chunk) => {
    const text = chunk.toString();
    res.write(`data: ${text}\n\n`);
  });

  ollama.on("close", () => {
    res.write("data: [DONE]\n\n");
    res.end();
  });

  ollama.on("error", (err) => {
    console.error("Ollama error:", err);
    res.write(`data: [ERROR] ${err.message}\n\n`);
    res.end();
  });
});

app.listen(5000, () => console.log("Streaming server running on http://localhost:5000"));
