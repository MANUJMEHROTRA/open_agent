# AI ENGINEER HIRING CHALLENGE
## AI Agent Orchestration Platform

**Category:** AI-SOLUTION · Yuno AI Team

---

## Project Overview

**Category:** ai-solution  
**Title:** AI Agent Orchestration Platform

### Problem Statement
Build a platform where users can:

- Create AI agents
- Configure how they behave and operate:
  - Personality
  - Tools
  - Schedules
  - Memory
  - Limits
- Connect them into collaborative workflows

### Core Requirements
Agents must:

- Run on a real runtime
- Execute real tools
- Communicate with each other
- Complete tasks autonomously

At least **one agent** must be reachable through an external messaging channel:

- WhatsApp
- Telegram
- Slack

This allows a human to interact with it conversationally.

The platform must also include a **web UI** for visually managing everything.

---

## Business Context

The candidate must deliver:

1. **Working repository**
2. **README** explaining:
   - Architecture decisions
   - How to run the project
3. **Recorded demo** (video or GIF) showing:
   - End-to-end workflow
   - Live conversation with an agent through the chosen messaging channel

A **live demo session** will be scheduled to:

- Walk through the code
- Discuss tradeoffs

### Evaluation Weights

| Criteria | Weight |
|---|---:|
| Working end-to-end demo | 40% |
| Architecture and code quality | 30% |
| UI/UX and configurability | 20% |
| Documentation | 10% |

---

## Impact Metrics

Measure:

- Number of configurable dimensions per agent
- Time from zero to a working multi-agent workflow
- End-to-end task completion rate
- Agent-to-agent message reliability

---

## Technical Requirements

### Required Languages
Candidate’s choice — must justify the decision in the README.

### AI Frameworks
Must integrate one of:

- openclaw.ai *(always-on agent framework with SOUL.md / MEMORY)*
- LangGraph
- CrewAI
- AutoGen
- Custom runtime

Must justify the choice in README.

### Development Tools
Candidate’s choice for:

- Frontend stack
- Backend stack

Must include:

- Web-based UI
- Persistence layer
- Messaging channel integration

### Cloud Platforms
Optional — the project must run **fully local** with a **single setup command**.

### Other Requirements

- Agents must communicate asynchronously
- Message history must be persisted
- Message history must be visible in UI
- At least one agent must connect to:
  - WhatsApp
  - Telegram
  - Slack
- Chosen runtime must actually execute agent logic *(not a UI mockup)*

---

## Success Criteria

### Functional Requirements

#### Agent CRUD
Support:

- Name
- Role
- System prompt
- Model
- Tools
- Channels

#### Agent Configuration
Support:

- Schedules
- Memory
- Skills
- Interaction rules
- Guardrails

#### Workflow Builder
Include:

- Visual workflow builder
- Conditions
- Feedback loops

#### Templates
Provide at least:

- 2 pre-built workflow templates

#### External Integration
Connect to at least one:

- WhatsApp
- Telegram
- Slack

#### Monitoring
Live monitoring with:

- Real-time logs
- Inter-agent messages
- Token tracking
- Cost tracking

#### Demo
Must show:

- 2+ agents
- Executing a real task
- End-to-end workflow working

---

## Performance Benchmarks

N/A — focus is on:

- Functionality
- Architecture

The system should:

- Feel responsive
- Work smoothly end-to-end

---

## Code Quality Standards

Must include:

- Clear separation between:
  - UI layer
  - Agent runtime integration
  - Data / persistence layer

- Tests for critical paths:
  - Agent creation
  - Workflow execution
  - Message delivery

- README with:
  - Architecture diagram
  - Setup instructions
  - Runtime choice justification

- Instructions for:
  - Adding new workflow templates
  - Adding new messaging channels

---

**Yuno AI Team · Confidential · AI Engineer Hiring Challenge**