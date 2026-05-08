from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from database import ExecutionLog, get_db
from schemas import ExecutionLogResponse
from runtime.executor import manager

router = APIRouter()


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)


@router.get("/executions", response_model=List[ExecutionLogResponse])
def list_executions(
    agent_id: Optional[int] = Query(None),
    workflow_id: Optional[int] = Query(None),
    status: Optional[str] = Query(None),
    limit: int = Query(50, le=200),
    db: Session = Depends(get_db),
):
    q = db.query(ExecutionLog)
    if agent_id is not None:
        q = q.filter(ExecutionLog.agent_id == agent_id)
    if workflow_id is not None:
        q = q.filter(ExecutionLog.workflow_id == workflow_id)
    if status is not None:
        q = q.filter(ExecutionLog.status == status)
    return q.order_by(ExecutionLog.started_at.desc()).limit(limit).all()


@router.get("/executions/{execution_id}", response_model=ExecutionLogResponse)
def get_execution(execution_id: int, db: Session = Depends(get_db)):
    log = db.query(ExecutionLog).filter(ExecutionLog.id == execution_id).first()
    if not log:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Execution not found")
    return log


@router.get("/stats")
def get_stats(db: Session = Depends(get_db)):
    from sqlalchemy import func
    from database import Agent, Workflow, Message
    return {
        "total_agents": db.query(func.count(Agent.id)).scalar(),
        "active_agents": db.query(func.count(Agent.id)).filter(Agent.is_active == True).scalar(),
        "total_workflows": db.query(func.count(Workflow.id)).scalar(),
        "total_executions": db.query(func.count(ExecutionLog.id)).scalar(),
        "total_messages": db.query(func.count(Message.id)).scalar(),
        "total_tokens": db.query(func.sum(ExecutionLog.total_tokens)).scalar() or 0,
        "total_cost": round(db.query(func.sum(ExecutionLog.total_cost)).scalar() or 0, 4),
    }
