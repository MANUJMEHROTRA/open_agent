from sqlalchemy import create_engine, Column, Integer, String, Text, Boolean, DateTime, Float, ForeignKey, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime, timezone
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./agents.db")
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


class Agent(Base):
    __tablename__ = "agents"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    role = Column(String(255), nullable=False)
    system_prompt = Column(Text, nullable=False)
    model = Column(String(100), default="claude-sonnet-4-6")
    tools = Column(JSON, default=list)          # list of tool names
    channels = Column(JSON, default=list)       # ["telegram", "slack", etc.]
    memory_enabled = Column(Boolean, default=True)
    max_iterations = Column(Integer, default=10)
    temperature = Column(Float, default=0.7)
    guardrails = Column(JSON, default=dict)     # {max_tokens, forbidden_topics, etc.}
    schedule = Column(String(255), nullable=True)   # cron expression
    skills = Column(JSON, default=list)         # skill names
    interaction_rules = Column(JSON, default=dict)  # rules for inter-agent communication
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    messages = relationship("Message", back_populates="agent", cascade="all, delete-orphan")
    memories = relationship("AgentMemory", back_populates="agent", cascade="all, delete-orphan")
    executions = relationship("ExecutionLog", back_populates="agent", cascade="all, delete-orphan")


class Workflow(Base):
    __tablename__ = "workflows"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    nodes = Column(JSON, default=list)   # [{id, type, agent_id, position, data}]
    edges = Column(JSON, default=list)   # [{id, source, target, condition}]
    status = Column(String(50), default="draft")  # draft, active, running, error
    template_id = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    executions = relationship("ExecutionLog", back_populates="workflow", cascade="all, delete-orphan")


class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    agent_id = Column(Integer, ForeignKey("agents.id"), nullable=False)
    workflow_id = Column(Integer, ForeignKey("workflows.id"), nullable=True)
    execution_id = Column(Integer, ForeignKey("execution_logs.id"), nullable=True)
    role = Column(String(50), nullable=False)   # user, assistant, system, tool
    content = Column(Text, nullable=False)
    channel = Column(String(50), default="ui")  # ui, telegram, slack
    tokens_used = Column(Integer, default=0)
    extra_data = Column(JSON, default=dict)   # renamed: 'metadata' is reserved by SQLAlchemy
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    agent = relationship("Agent", back_populates="messages")


class ExecutionLog(Base):
    __tablename__ = "execution_logs"

    id = Column(Integer, primary_key=True, index=True)
    agent_id = Column(Integer, ForeignKey("agents.id"), nullable=True)
    workflow_id = Column(Integer, ForeignKey("workflows.id"), nullable=True)
    status = Column(String(50), default="running")  # running, completed, failed, cancelled
    input_data = Column(JSON, default=dict)
    output_data = Column(JSON, default=dict)
    logs = Column(JSON, default=list)           # [{timestamp, level, message}]
    total_tokens = Column(Integer, default=0)
    total_cost = Column(Float, default=0.0)
    started_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    finished_at = Column(DateTime, nullable=True)

    agent = relationship("Agent", back_populates="executions")
    workflow = relationship("Workflow", back_populates="executions")


class AgentMemory(Base):
    __tablename__ = "agent_memories"

    id = Column(Integer, primary_key=True, index=True)
    agent_id = Column(Integer, ForeignKey("agents.id"), nullable=False)
    key = Column(String(255), nullable=False)
    value = Column(Text, nullable=False)
    memory_type = Column(String(50), default="fact")  # fact, preference, context
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    agent = relationship("Agent", back_populates="memories")
