"""
LangGraph-based multi-agent executor.

Each workflow maps to a StateGraph where nodes are agents and edges define
the message flow between them. Execution events are broadcast via the
monitoring WebSocket manager.
"""
import asyncio
import json
from datetime import datetime, timezone
from typing import Any, Annotated, TypedDict

from langchain_anthropic import ChatAnthropic
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage, BaseMessage
from langgraph.graph import StateGraph, END
from langgraph.prebuilt import ToolNode
from langgraph.graph.message import add_messages
from sqlalchemy.orm import Session

from database import Agent, Workflow, ExecutionLog, get_db
from runtime.tools import get_tools_for_agent
from runtime.memory import get_agent_memories, get_conversation_history, save_message, build_memory_context

import os
from dotenv import load_dotenv

load_dotenv()


# ── WebSocket broadcast ────────────────────────────────────────────────────────

class ConnectionManager:
    def __init__(self):
        self.active_connections: list = []

    async def connect(self, websocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, data: dict):
        dead = []
        for ws in self.active_connections:
            try:
                await ws.send_text(json.dumps(data))
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(ws)


manager = ConnectionManager()


def _log_event(execution_id: int, level: str, message: str, db: Session) -> dict:
    entry = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "level": level,
        "message": message,
        "execution_id": execution_id,
    }
    log = db.query(ExecutionLog).filter(ExecutionLog.id == execution_id).first()
    if log:
        logs = list(log.logs or [])
        logs.append(entry)
        log.logs = logs
        db.commit()
    asyncio.create_task(manager.broadcast({"type": "log", **entry}))
    return entry


# ── Single-agent execution ─────────────────────────────────────────────────────

class AgentState(TypedDict):
    messages: Annotated[list[BaseMessage], add_messages]


def build_single_agent_graph(agent_cfg: Agent) -> StateGraph:
    tools = get_tools_for_agent(agent_cfg.tools or [])
    llm = ChatAnthropic(
        model=agent_cfg.model,
        temperature=agent_cfg.temperature,
        max_tokens=agent_cfg.guardrails.get("max_tokens", 4096) if agent_cfg.guardrails else 4096,
    )
    llm_with_tools = llm.bind_tools(tools) if tools else llm

    def call_model(state: AgentState) -> AgentState:
        return {"messages": [llm_with_tools.invoke(state["messages"])]}

    def should_continue(state: AgentState) -> str:
        last = state["messages"][-1]
        if hasattr(last, "tool_calls") and last.tool_calls:
            return "tools"
        return "end"

    graph = StateGraph(AgentState)
    graph.add_node("agent", call_model)
    if tools:
        graph.add_node("tools", ToolNode(tools))
        graph.add_conditional_edges("agent", should_continue, {"tools": "tools", "end": END})
        graph.add_edge("tools", "agent")
    else:
        graph.add_edge("agent", END)
    graph.set_entry_point("agent")
    return graph.compile()


async def execute_agent(
    agent_id: int,
    message: str,
    channel: str = "ui",
    context: dict = None,
    db: Session = None,
) -> dict:
    close_db = False
    if db is None:
        db = next(get_db())
        close_db = True

    agent_cfg = db.query(Agent).filter(Agent.id == agent_id).first()
    if not agent_cfg:
        return {"error": f"Agent {agent_id} not found"}

    log = ExecutionLog(
        agent_id=agent_id,
        status="running",
        input_data={"message": message, "channel": channel},
        output_data={},
        logs=[],
        started_at=datetime.now(timezone.utc),
    )
    db.add(log)
    db.commit()
    db.refresh(log)

    try:
        save_message(db, agent_id, "user", message, channel=channel, execution_id=log.id)
        _log_event(log.id, "info", f"Agent '{agent_cfg.name}' starting on message: {message[:100]}", db)

        memories = get_agent_memories(db, agent_id) if agent_cfg.memory_enabled else []
        history = get_conversation_history(db, agent_id, limit=10) if agent_cfg.memory_enabled else []

        system_parts = [agent_cfg.system_prompt]
        if memories:
            system_parts.append(build_memory_context(memories))
        if context:
            system_parts.append(f"## Additional context:\n{json.dumps(context, indent=2)}")

        system_msg = SystemMessage(content="\n\n".join(system_parts))
        prior_msgs = [
            HumanMessage(content=m["content"]) if m["role"] == "user" else AIMessage(content=m["content"])
            for m in history[:-1]
        ]
        input_msgs = [system_msg] + prior_msgs + [HumanMessage(content=message)]

        graph = build_single_agent_graph(agent_cfg)
        result = await asyncio.get_event_loop().run_in_executor(
            None, lambda: graph.invoke({"messages": input_msgs})
        )

        last_ai = next(
            (m for m in reversed(result["messages"]) if isinstance(m, AIMessage)), None
        )
        output_text = last_ai.content if last_ai else "No response generated."
        usage = getattr(last_ai, "usage_metadata", None) or {}
        tokens = usage.get("total_tokens", 0) if usage else 0
        cost = round(tokens * 0.000003, 6)

        save_message(db, agent_id, "assistant", output_text, channel=channel, execution_id=log.id, tokens_used=tokens)
        _log_event(log.id, "info", f"Agent '{agent_cfg.name}' completed. Tokens: {tokens}", db)

        log.status = "completed"
        log.output_data = {"response": output_text}
        log.total_tokens = tokens
        log.total_cost = cost
        log.finished_at = datetime.now(timezone.utc)
        db.commit()

        await manager.broadcast({
            "type": "execution_complete",
            "execution_id": log.id,
            "agent_id": agent_id,
            "response": output_text,
        })

        return {"execution_id": log.id, "response": output_text, "tokens": tokens, "cost": cost}

    except Exception as e:
        log.status = "failed"
        log.output_data = {"error": str(e)}
        log.finished_at = datetime.now(timezone.utc)
        db.commit()
        _log_event(log.id, "error", f"Agent execution failed: {str(e)}", db)
        await manager.broadcast({"type": "execution_failed", "execution_id": log.id, "error": str(e)})
        return {"error": str(e), "execution_id": log.id}
    finally:
        if close_db:
            db.close()


# ── Multi-agent workflow execution ─────────────────────────────────────────────

class WorkflowState(TypedDict):
    messages: Annotated[list[BaseMessage], add_messages]
    current_node: str
    agent_outputs: dict[str, str]
    iteration: int


async def execute_workflow(
    workflow_id: int,
    input_message: str,
    context: dict = None,
    db: Session = None,
) -> dict:
    close_db = False
    if db is None:
        db = next(get_db())
        close_db = True

    workflow = db.query(Workflow).filter(Workflow.id == workflow_id).first()
    if not workflow:
        return {"error": f"Workflow {workflow_id} not found"}

    log = ExecutionLog(
        workflow_id=workflow_id,
        status="running",
        input_data={"message": input_message},
        output_data={},
        logs=[],
        started_at=datetime.now(timezone.utc),
    )
    db.add(log)
    db.commit()
    db.refresh(log)

    try:
        _log_event(log.id, "info", f"Workflow '{workflow.name}' started", db)

        nodes = workflow.nodes or []
        edges = workflow.edges or []

        agent_nodes = [n for n in nodes if n.get("type") == "agent" and n.get("agent_id")]
        if not agent_nodes:
            return {"error": "Workflow has no agent nodes"}

        # Build adjacency map
        adj: dict[str, list[str]] = {}
        for e in edges:
            adj.setdefault(e["source"], []).append(e["target"])

        # Find entry node (not a target of any edge)
        targets = {e["target"] for e in edges}
        entry_nodes = [n["id"] for n in agent_nodes if n["id"] not in targets]
        if not entry_nodes:
            entry_nodes = [agent_nodes[0]["id"]]

        node_map = {n["id"]: n for n in agent_nodes}
        agent_outputs: dict[str, str] = {}
        total_tokens = 0

        # Execute nodes sequentially following the graph
        visited = set()
        queue = list(entry_nodes)
        current_input = input_message

        while queue:
            node_id = queue.pop(0)
            if node_id in visited:
                continue
            visited.add(node_id)

            node = node_map.get(node_id)
            if not node:
                continue

            agent_id = node["agent_id"]
            _log_event(log.id, "info", f"Executing node '{node_id}' (agent_id={agent_id})", db)

            await manager.broadcast({
                "type": "node_start",
                "execution_id": log.id,
                "node_id": node_id,
                "agent_id": agent_id,
            })

            result = await execute_agent(agent_id, current_input, context=context, db=db)
            agent_outputs[node_id] = result.get("response", result.get("error", ""))
            total_tokens += result.get("tokens", 0)

            current_input = agent_outputs[node_id]

            await manager.broadcast({
                "type": "node_complete",
                "execution_id": log.id,
                "node_id": node_id,
                "output": current_input[:500],
            })

            for next_node in adj.get(node_id, []):
                if next_node not in visited:
                    queue.append(next_node)

        final_output = current_input
        log.status = "completed"
        log.output_data = {"response": final_output, "agent_outputs": agent_outputs}
        log.total_tokens = total_tokens
        log.total_cost = round(total_tokens * 0.000003, 6)
        log.finished_at = datetime.now(timezone.utc)
        db.commit()

        _log_event(log.id, "info", f"Workflow '{workflow.name}' completed. Total tokens: {total_tokens}", db)
        await manager.broadcast({
            "type": "workflow_complete",
            "execution_id": log.id,
            "workflow_id": workflow_id,
            "response": final_output,
        })

        return {
            "execution_id": log.id,
            "response": final_output,
            "agent_outputs": agent_outputs,
            "total_tokens": total_tokens,
        }

    except Exception as e:
        log.status = "failed"
        log.output_data = {"error": str(e)}
        log.finished_at = datetime.now(timezone.utc)
        db.commit()
        _log_event(log.id, "error", f"Workflow execution failed: {str(e)}", db)
        return {"error": str(e), "execution_id": log.id}
    finally:
        if close_db:
            db.close()
