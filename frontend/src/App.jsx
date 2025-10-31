import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import "./App.css";

function App() {
  const [message, setMessage] = useState("");
  const [chat, setChat] = useState([]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;

    // Add user message
    setChat((prev) => [...prev, { role: "user", text: message }]);
    setMessage("");

    // Placeholder for AI
    setChat((prev) => [...prev, { role: "assistant", text: "" }]);

    try {
      const response = await fetch(import.meta.env.VITE_CHATAPI, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      let aiText = "";
      let wordBuffer = "";
      let wordCount = 0;
      let batch = [];

      const pushText = (text) => {
        aiText += text;
        setChat((prev) => {
          const updated = [...prev];
          updated[updated.length - 1].text = aiText;
          return updated;
        });
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });

        // Clean Ollama output
        const cleaned = chunk
          .replace(/^data:\s*/gm, "")
          .replace(/\[DONE\]/g, "")
          .replace(/\r?\n|\r/g, " ");

        wordBuffer += cleaned;

        // Split by whitespace into words
        const words = wordBuffer.split(/\s+/);
        wordBuffer = words.pop() || "";

        for (const word of words) {
          batch.push(word);
          wordCount++;

          // Every 5 words → emit text
          if (wordCount % 10 === 0) {
            pushText(batch.join(" ") + " ");
            batch = [];
            await new Promise((r) => setTimeout(r, 80)); // short natural delay
          }
        }
      }

      // Flush remaining batch
      if (batch.length > 0 || wordBuffer) {
        pushText(batch.join(" ") + " " + wordBuffer);
      }
    } catch (err) {
      console.error("Error:", err);
      setChat((prev) => [
        ...prev,
        { role: "assistant", text: "⚠️ Error connecting to backend." },
      ]);
    }
  };

  return (
    <div className="app-container">
      <div className="chat-box">
        {chat.map((msg, i) => (
          <div
            key={i}
            className={`chat-message ${msg.role === "user" ? "user" : "assistant"}`}
          >
            <div className="chat-label">
              {msg.role === "user" ? "You" : "AI"}:
            </div>
            <ReactMarkdown>{msg.text}</ReactMarkdown>
          </div>
        ))}
      </div>

      <form onSubmit={sendMessage} className="chat-form">
        <input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type a message..."
          autoFocus
        />
        <button type="submit">Send</button>
      </form>
    </div>
  );
}

export default App;
