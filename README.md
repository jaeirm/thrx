# Thrx

> Transform linear chat into an **interactive, node-based flow** that visualizes ideas, context, and dialogue as a **living knowledge graph**.  
> Built for clarity, collaboration, and creativity — to explore, branch, and flow through conversations like a **mind map in motion**.

---

## Overview

**Thrx** reimagines how conversations are represented.  
Instead of scrolling through endless chat logs, Thrx lets you **see conversations as connected nodes** — each message, branch, and idea becomes part of a dynamic, visual flow.

Whether you’re building an AI chat app, a collaborative note system, or a knowledge engine — Thrx provides the foundation.

---
<img width="981" height="666" alt="image" src="https://github.com/user-attachments/assets/4afd5a37-a4b8-44c2-9f9a-9837aba73a73" />

### Concept

When the user **selects any part of the text** in the chat or graph view:

- A **hover tooltip** appears with two options:
  - **Follow up:** continues the conversation linearly in the current thread.
  - **Create Branch:** spawns a **new chat branch** (visually represented as a new node in the graph).

Each branch becomes its own node in the **Graph Viewer**, maintaining parent-child links so users can navigate their exploration paths visually — like “conversation forking” in a knowledge graph.

---

###Implementation Concept (React Flow + React)

Here’s the functional breakdown you’d build into `Thrx`:

1. **Text Selection Listener** → detects user-highlighted text.
2. **Tooltip Component** → shows “Follow up” / “Create Branch” actions near the selection.
3. **Branch Manager Hook** → handles adding a new node to the React Flow graph and linking it.
4. **Graph Viewer** → updates live with new nodes and edges representing chat flows.
5. **Persistence Layer** → stores conversation structure (like a tree) in local storage or a backend (e.g., Supabase / Postgres).

---

## Tech Stack

| Layer | Technology |
|-------|-------------|
| **Frontend** | React, Vite, React Flow |
| **Backend** | Node.js, Express |
| **AI Engine** | Ollama (`phi3:mini` by default) |
| **Database (optional)** | PostgreSQL (future) |
| **License** | MIT |

---

## Setting Started

### 1. Clone the Repository
```bash
git clone https://github.com/jaeirm/thrx.git
cd thrx
