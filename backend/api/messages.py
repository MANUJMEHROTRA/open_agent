from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from database import Message, get_db
from schemas import MessageResponse

router = APIRouter()


@router.get("/", response_model=List[MessageResponse])
def list_messages(
    agent_id: Optional[int] = Query(None),
    workflow_id: Optional[int] = Query(None),
    channel: Optional[str] = Query(None),
    limit: int = Query(100, le=500),
    db: Session = Depends(get_db),
):
    q = db.query(Message)
    if agent_id is not None:
        q = q.filter(Message.agent_id == agent_id)
    if workflow_id is not None:
        q = q.filter(Message.workflow_id == workflow_id)
    if channel is not None:
        q = q.filter(Message.channel == channel)
    return q.order_by(Message.created_at.desc()).limit(limit).all()


@router.get("/agent/{agent_id}", response_model=List[MessageResponse])
def get_agent_messages(agent_id: int, limit: int = 50, db: Session = Depends(get_db)):
    return (
        db.query(Message)
        .filter(Message.agent_id == agent_id)
        .order_by(Message.created_at.asc())
        .limit(limit)
        .all()
    )
