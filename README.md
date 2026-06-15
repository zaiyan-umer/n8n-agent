# n8n Agent AI

n8n Agent AI is an intelligent, autonomous agent designed to build, verify, and update [n8n](https://n8n.io/) workflows through natural language. 

Instead of manually dragging and dropping nodes, users can simply describe the automation they need (e.g., *"Create a workflow that fetches unread emails from Gmail and posts them to a Slack channel"*). The agent intelligently queries a vector database of n8n node documentation, generates the workflow JSON, verifies its syntax, self-corrects using an LLM Critic, and streams the entire process back to the user in real-time.

<img width="1056" height="827" alt="agent-ui" src="https://github.com/user-attachments/assets/72f174d7-8183-4e61-a9e3-2f63bb376240" />
*The n8n Agent AI streaming its internal thought process and generating workflows.*

<br>
<br>

<img width="1358" height="484" alt="workflow" src="https://github.com/user-attachments/assets/91498cfc-6743-4ce2-af50-f90e96d6cfd2" />
*The fully deployed and syntax-verified workflow running inside n8n.*

---

## Key Features

### 🧠 Intelligent Workflow Generation
Powered by the Vercel AI SDK and Gemini models, the agent doesn't just guess n8n JSON structures. It uses a **Retrieval-Augmented Generation (RAG)** approach to fetch the exact schema and parameter requirements for requested nodes, ensuring high-fidelity outputs.

### 🔄 Multi-Stage Self-Correction Pipeline
The agent operates using a robust pipeline to guarantee workflow validity:
1. **Intent Parsing**: Determines if the user is asking to create a *new* workflow or update an *existing* one.
2. **Vector Retrieval**: Queries PostgreSQL (via `pgvector`) to pull exact documentation for the requested integration nodes.
3. **Generation**: Drafts the initial n8n workflow JSON.
4. **Syntax Verification**: A deterministic engine checks for broken node connections, missing required fields, or cyclic loops.
5. **LLM Critic**: An independent LLM evaluates the generated workflow against the original user prompt. If the critic finds issues, it feeds the errors back into the generator for a self-correction loop.

### ⚡ Real-Time Thought Streaming
Gone are the days of staring at a loading spinner. The backend pipeline is fully streamed to the frontend via **Server-Sent Events (SSE)**. Users can watch the agent's internal "thinking" process in real-time—seeing when it retrieves data, when it verifies syntax, and when it deploys.

### 📊 Full Observability
Deeply integrated with **Laminar AI**, every step of the agent's pipeline—from intent classification to final generation—is traced and logged. This ensures complete observability into latency, token usage, and LLM decision-making.

---

## Tech Stack

- **Frontend Framework:** Next.js (App Router) & React
- **AI Orchestration:** Vercel AI SDK
- **LLM Provider:** Google Gemini (`gemini-3.5-flash` / `gemini-2.5-flash`)
- **Database & Vector Search:** Neon (PostgreSQL) with `pgvector`
- **ORM:** Drizzle ORM
- **Observability:** Laminar AI

---

## Prerequisites

To run this project locally, you will need:
- Node.js (v18+)
- A Neon PostgreSQL database instance (with pgvector extension enabled)
- **An active n8n instance:** You must deploy n8n (either via [Docker](https://docs.n8n.io/hosting/installation/docker/) or [n8n Cloud](https://n8n.io/cloud/)) and generate a Public API key.
- API Keys for:
  - Google AI (Gemini)
  - Laminar AI

## Getting Started

1. **Install dependencies:**
   ```bash
   npm install
   # or
   pnpm install
   ```

2. **Configure Environment Variables:**
   Create a `.env` file in the root directory and populate it with your keys:
   ```env
   # Database
   DATABASE_URL="postgresql://user:password@hostname/dbname?sslmode=require"

   # AI Models
   GOOGLE_GENERATIVE_AI_API_KEY="your_google_api_key"
   WORKFLOW_MODEL="gemini-3.1-flash"
   GENERAL_MODEL="gemini-3.1-flash-lite-preview"

   # Observability
   LMNR_PROJECT_API_KEY="your_laminar_key"

   # n8n Integration
   N8N_URL="http://localhost:5678" # Or your cloud deployment URL
   N8N_API_KEY="your_n8n_api_key"
   ```

3. **Run Database Migrations:**
   Initialize your Drizzle schema and set up the vector tables.
   ```bash
   npm run db:push
   ```

4. **Start the Development Server:**
   ```bash
   npm run dev
   ```

5. **Access the Application:**
   Open [http://localhost:3000](http://localhost:3000) in your browser to interact with the n8n Agent AI.

---

*Disclaimer: AI can make mistakes. Always verify important workflows before deploying them to a production n8n instance.*
