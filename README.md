# AI Agent Orchestration Platform

A full-stack platform for creating, configuring, and running collaborative multi-agent AI workflows — powered by **LangGraph**, **FastAPI**, and **React**.

---

## Architecture

```
┌──────────────────────────────────────────────────┐
│                   React Frontend                  │
│  Agents │ Workflow Builder │ Monitor │ Templates  │
│              (React Flow canvas)                  │
└──────────────────┬───────────────────────────────┘
                   │  HTTP + WebSocket
┌──────────────────▼───────────────────────────────┐
│             FastAPI Backend (Python)              │
│  /api/agents  /api/workflows  /api/monitoring     │
│  WebSocket: /api/monitoring/ws  (live events)     │
└─────┬───────────────────────┬─────────────────────┘
      │                       │
┌─────▼──────┐     ┌──────────▼─────────────────────┐
│  SQLite DB  │     │  LangGraph Runtime              │
│  (agents,   │     │  • StateGraph per workflow      │
│   workflows,│     │  • ToolNode (web search, calc…) │
│   messages, │     │  • Claude via langchain-anthropic│
│   executions│     │  • Multi-agent message passing  │
│   memories) │     └──────────────────┬──────────────┘
└─────────────┘                        │
                            ┌──────────▼──────────┐
                            │  Telegram Bot        │
                            │  (python-telegram-bot│
                            │  routes to agent)    │
                            └─────────────────────┘
```

### Key Design Decisions

| Decision | Choice | Rationale |
|---|---|---|
| AI Framework | **LangGraph** | Best control over multi-agent state machines; native tool support; cycles/feedback loops |
| Backend | **FastAPI** | Async-first, type-safe, auto-generated OpenAPI docs, familiar to Python teams |
| Database | **SQLite** | Zero-config, runs fully local, sufficient for the problem scope |
| Frontend | **React + Vite + TailwindCSS** | Fast iteration, minimal dependencies, excellent ecosystem |
| Workflow UI | **React Flow** | Best-in-class visual graph editor for React |
| Messaging | **Telegram** | Easiest bot API with free hosting, good Python library |
| LLM | **Claude (Anthropic)** | Strong reasoning, large context, reliable tool use |

---

## Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+
- An Anthropic API key

### Single setup command

```bash
bash setup.sh
```

Then edit `backend/.env`:
```env
ANTHROPIC_API_KEY=sk-ant-...
TELEGRAM_BOT_TOKEN=...   # optional
TELEGRAM_AGENT_ID=1      # set after creating an agent
```

### Run

**Terminal 1 — Backend:**
```bash
cd backend
source .venv/bin/activate
python main.py
# → http://localhost:8000
# → http://localhost:8000/docs  (Swagger UI)
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm run dev
# → http://localhost:3000
```

---

## Features

### Agent Management
- Create agents with: name, role, system prompt, model, tools, channels
- Advanced config: temperature, max iterations, memory toggle, cron schedule, guardrails (max tokens, forbidden topics)
- Built-in chat panel to talk to any agent directly from the UI
- Long-term memory per agent (key-value facts persisted in SQLite)

### Workflow Builder
- Visual drag-and-drop canvas (React Flow)
- Add agent nodes from the sidebar palette
- Draw directed edges between agents (output of one feeds next)
- Save and execute workflows with a custom input message
- Execution results shown inline

### Monitoring
- **Live WebSocket stream** of all execution events (node start/complete, logs, errors)
- Token usage chart (last 20 executions)
- Full execution log table with per-execution log drill-down
- Platform-wide stats: agent count, total executions, messages, tokens, cost

### Templates
- **Research & Summarize**: Researcher agent → Summarizer agent
- **Customer Support Pipeline**: Triage → Support → Follow-up
- Assign your real agents to template roles and create the workflow in one click
- Adding new templates: edit `WORKFLOW_TEMPLATES` in `backend/api/workflows.py`

### Telegram Integration
- One Telegram bot maps to one configured agent
- Users message the bot; the agent responds using full tool access and memory
- Set `TELEGRAM_BOT_TOKEN` and `TELEGRAM_AGENT_ID` in `.env`
- Adding new channels: implement a similar pattern in `backend/integrations/`

---

## Available Agent Tools

| Tool | Description |
|---|---|
| `web_search` | DuckDuckGo search (no API key needed) |
| `calculator` | Safe math expression evaluator |
| `get_current_time` | Current UTC datetime |
| `http_request` | Make GET/POST requests to external APIs |
| `summarize_text` | Extractive text summarizer |

---

## API Reference

Swagger UI: `http://localhost:8000/docs`

Key endpoints:
- `GET/POST /api/agents/` — list / create agents
- `POST /api/agents/{id}/execute` — run a single agent
- `GET/POST /api/workflows/` — list / create workflows
- `POST /api/workflows/{id}/execute` — run a workflow
- `GET /api/monitoring/stats` — platform stats
- `WS /api/monitoring/ws` — real-time event stream

---

## Extending the Platform

### Add a workflow template
In `backend/api/workflows.py`, add an entry to `WORKFLOW_TEMPLATES`:
```python
{
    "id": "my_template",
    "name": "My Template",
    "description": "What this workflow does",
    "nodes": [...],
    "edges": [...],
}
```

### Add a new messaging channel
1. Create `backend/integrations/my_channel.py`
2. Implement an async `start_my_channel()` function that routes messages to `execute_agent()`
3. Start it as an `asyncio.create_task()` in `backend/main.py`'s lifespan

### Add a new tool
In `backend/runtime/tools.py`, add a function decorated with `@tool` and add it to `ALL_TOOLS`.

---

## Impact Metrics

| Metric | Notes |
|---|---|
| Configurable dimensions per agent | 10+ (name, role, prompt, model, tools, channels, memory, iterations, temperature, guardrails, schedule) |
| Time to first working workflow | ~5 minutes from setup |
| End-to-end task completion rate | Depends on agent config and LLM quality |
| Agent-to-agent message reliability | Sequential graph execution, 100% delivery within a workflow run |
