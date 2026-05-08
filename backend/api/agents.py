from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List

from database import Agent, get_db
from schemas import AgentCreate, AgentUpdate, AgentResponse, ExecuteAgentRequest, AVAILABLE_TOOLS, AVAILABLE_MODELS
from runtime.executor import execute_agent

router = APIRouter()


@router.get("/", response_model=List[AgentResponse])
def list_agents(db: Session = Depends(get_db)):
    return db.query(Agent).order_by(Agent.created_at.desc()).all()


@router.post("/", response_model=AgentResponse, status_code=201)
def create_agent(payload: AgentCreate, db: Session = Depends(get_db)):
    agent = Agent(**payload.model_dump())
    db.add(agent)
    db.commit()
    db.refresh(agent)
    return agent


@router.get("/tools")
def list_available_tools():
    return AVAILABLE_TOOLS


@router.get("/models")
def list_available_models():
    return AVAILABLE_MODELS


@router.get("/{agent_id}", response_model=AgentResponse)
def get_agent(agent_id: int, db: Session = Depends(get_db)):
    agent = db.query(Agent).filter(Agent.id == agent_id).first()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    return agent


@router.put("/{agent_id}", response_model=AgentResponse)
def update_agent(agent_id: int, payload: AgentUpdate, db: Session = Depends(get_db)):
    agent = db.query(Agent).filter(Agent.id == agent_id).first()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(agent, field, value)
    db.commit()
    db.refresh(agent)
    return agent


@router.delete("/{agent_id}", status_code=204)
def delete_agent(agent_id: int, db: Session = Depends(get_db)):
    agent = db.query(Agent).filter(Agent.id == agent_id).first()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    db.delete(agent)
    db.commit()


@router.post("/{agent_id}/execute")
async def run_agent(agent_id: int, payload: ExecuteAgentRequest, db: Session = Depends(get_db)):
    agent = db.query(Agent).filter(Agent.id == agent_id).first()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    result = await execute_agent(agent_id, payload.message, context=payload.context, db=db)
    if "error" in result and "execution_id" not in result:
        raise HTTPException(status_code=500, detail=result["error"])
    return result


@router.get("/{agent_id}/memories")
def get_agent_memories(agent_id: int, db: Session = Depends(get_db)):
    from database import AgentMemory
    memories = db.query(AgentMemory).filter(AgentMemory.agent_id == agent_id).all()
    return memories


@router.post("/{agent_id}/memories")
def add_agent_memory(agent_id: int, payload: dict, db: Session = Depends(get_db)):
    from runtime.memory import save_agent_memory
    save_agent_memory(db, agent_id, payload["key"], payload["value"], payload.get("memory_type", "fact"))
    return {"status": "saved"}


@router.delete("/{agent_id}/memories/{memory_id}", status_code=204)
def delete_agent_memory(agent_id: int, memory_id: int, db: Session = Depends(get_db)):
    from database import AgentMemory
    memory = db.query(AgentMemory).filter(
        AgentMemory.id == memory_id, AgentMemory.agent_id == agent_id
    ).first()
    if not memory:
        raise HTTPException(status_code=404, detail="Memory not found")
    db.delete(memory)
    db.commit()
