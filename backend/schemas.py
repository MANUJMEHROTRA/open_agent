from pydantic import BaseModel, Field
from typing import Optional, List, Any, Dict
from datetime import datetime


# ── Agent schemas ──────────────────────────────────────────────────────────────

class AgentBase(BaseModel):
    name: str
    role: str
    system_prompt: str
    model: str = "claude-sonnet-4-6"
    tools: List[str] = []
    channels: List[str] = []
    memory_enabled: bool = True
    max_iterations: int = 10
    temperature: float = 0.7
    guardrails: Dict[str, Any] = {}
    schedule: Optional[str] = None
    skills: List[str] = []
    interaction_rules: Dict[str, Any] = {}


class AgentCreate(AgentBase):
    pass


class AgentUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    system_prompt: Optional[str] = None
    model: Optional[str] = None
    tools: Optional[List[str]] = None
    channels: Optional[List[str]] = None
    memory_enabled: Optional[bool] = None
    max_iterations: Optional[int] = None
    temperature: Optional[float] = None
    guardrails: Optional[Dict[str, Any]] = None
    schedule: Optional[str] = None
    skills: Optional[List[str]] = None
    interaction_rules: Optional[Dict[str, Any]] = None
    is_active: Optional[bool] = None


class AgentResponse(AgentBase):
    id: int
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ── Workflow schemas ───────────────────────────────────────────────────────────

class WorkflowNode(BaseModel):
    id: str
    type: str = "agent"         # agent, condition, trigger, output
    agent_id: Optional[int] = None
    position: Dict[str, float] = {"x": 0, "y": 0}
    data: Dict[str, Any] = {}


class WorkflowEdge(BaseModel):
    id: str
    source: str
    target: str
    condition: Optional[str] = None
    label: Optional[str] = None


class WorkflowBase(BaseModel):
    name: str
    description: Optional[str] = None
    nodes: List[Dict[str, Any]] = []
    edges: List[Dict[str, Any]] = []


class WorkflowCreate(WorkflowBase):
    template_id: Optional[str] = None


class WorkflowUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    nodes: Optional[List[Dict[str, Any]]] = None
    edges: Optional[List[Dict[str, Any]]] = None
    status: Optional[str] = None


class WorkflowResponse(WorkflowBase):
    id: int
    status: str
    template_id: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ── Execution schemas ──────────────────────────────────────────────────────────

class ExecuteWorkflowRequest(BaseModel):
    input_message: str
    context: Dict[str, Any] = {}


class ExecuteAgentRequest(BaseModel):
    message: str
    context: Dict[str, Any] = {}


class ExecutionLogResponse(BaseModel):
    id: int
    agent_id: Optional[int]
    workflow_id: Optional[int]
    status: str
    input_data: Dict[str, Any]
    output_data: Dict[str, Any]
    logs: List[Dict[str, Any]]
    total_tokens: int
    total_cost: float
    started_at: datetime
    finished_at: Optional[datetime]

    class Config:
        from_attributes = True


# ── Message schemas ────────────────────────────────────────────────────────────

class MessageResponse(BaseModel):
    id: int
    agent_id: int
    workflow_id: Optional[int]
    execution_id: Optional[int]
    role: str
    content: str
    channel: str
    tokens_used: int
    extra_data: Dict[str, Any]
    created_at: datetime

    class Config:
        from_attributes = True


# ── Memory schemas ─────────────────────────────────────────────────────────────

class MemoryCreate(BaseModel):
    key: str
    value: str
    memory_type: str = "fact"


class MemoryResponse(MemoryCreate):
    id: int
    agent_id: int
    created_at: datetime

    class Config:
        from_attributes = True


# ── Available tools / models ───────────────────────────────────────────────────

AVAILABLE_TOOLS = [
    {"id": "web_search", "name": "Web Search", "description": "Search the web using DuckDuckGo"},
    {"id": "calculator", "name": "Calculator", "description": "Evaluate mathematical expressions"},
    {"id": "get_current_time", "name": "Get Current Time", "description": "Get the current date and time"},
    {"id": "http_request", "name": "HTTP Request", "description": "Make HTTP GET/POST requests to external APIs"},
    {"id": "send_message_to_agent", "name": "Message Agent", "description": "Send a message to another agent in the workflow"},
    {"id": "summarize_text", "name": "Summarize Text", "description": "Summarize long text content"},
]

AVAILABLE_MODELS = [
    {"id": "claude-opus-4-7", "name": "Claude Opus 4.7 (Most Capable)"},
    {"id": "claude-sonnet-4-6", "name": "Claude Sonnet 4.6 (Balanced)"},
    {"id": "claude-haiku-4-5-20251001", "name": "Claude Haiku 4.5 (Fast)"},
]
