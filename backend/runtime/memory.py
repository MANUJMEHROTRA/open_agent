from sqlalchemy.orm import Session
from database import AgentMemory, Message
from typing import Optional
from datetime import datetime, timezone


def get_agent_memories(db: Session, agent_id: int) -> list[dict]:
    memories = db.query(AgentMemory).filter(AgentMemory.agent_id == agent_id).all()
    return [{"key": m.key, "value": m.value, "type": m.memory_type} for m in memories]


def save_agent_memory(db: Session, agent_id: int, key: str, value: str, memory_type: str = "fact"):
    existing = db.query(AgentMemory).filter(
        AgentMemory.agent_id == agent_id,
        AgentMemory.key == key
    ).first()
    if existing:
        existing.value = value
    else:
        memory = AgentMemory(agent_id=agent_id, key=key, value=value, memory_type=memory_type)
        db.add(memory)
    db.commit()


def get_conversation_history(db: Session, agent_id: int, limit: int = 20) -> list[dict]:
    messages = (
        db.query(Message)
        .filter(Message.agent_id == agent_id)
        .order_by(Message.created_at.desc())
        .limit(limit)
        .all()
    )
    return [{"role": m.role, "content": m.content} for m in reversed(messages)]


def save_message(
    db: Session,
    agent_id: int,
    role: str,
    content: str,
    channel: str = "ui",
    workflow_id: Optional[int] = None,
    execution_id: Optional[int] = None,
    tokens_used: int = 0,
    extra_data: dict = None,
) -> Message:
    msg = Message(
        agent_id=agent_id,
        role=role,
        content=content,
        channel=channel,
        workflow_id=workflow_id,
        execution_id=execution_id,
        tokens_used=tokens_used,
        extra_data=extra_data or {},
        created_at=datetime.now(timezone.utc),
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)
    return msg


def build_memory_context(memories: list[dict]) -> str:
    if not memories:
        return ""
    lines = ["## Agent Memory (long-term facts you remember):"]
    for m in memories:
        lines.append(f"- [{m['type']}] {m['key']}: {m['value']}")
    return "\n".join(lines)
