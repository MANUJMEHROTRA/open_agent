from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from database import Workflow, ExecutionLog, get_db
from schemas import WorkflowCreate, WorkflowUpdate, WorkflowResponse, ExecuteWorkflowRequest, ExecutionLogResponse
from runtime.executor import execute_workflow

router = APIRouter()

WORKFLOW_TEMPLATES = [
    {
        "id": "research_summarize",
        "name": "Research & Summarize",
        "description": "One agent researches a topic online, a second summarizes the findings into a concise report.",
        "nodes": [
            {
                "id": "researcher",
                "type": "agent",
                "position": {"x": 100, "y": 200},
                "data": {"label": "Researcher", "role": "Research Agent"},
            },
            {
                "id": "summarizer",
                "type": "agent",
                "position": {"x": 500, "y": 200},
                "data": {"label": "Summarizer", "role": "Summarization Agent"},
            },
        ],
        "edges": [
            {"id": "e1", "source": "researcher", "target": "summarizer", "label": "passes findings"}
        ],
    },
    {
        "id": "customer_support",
        "name": "Customer Support Pipeline",
        "description": "A triage agent classifies the query, then routes it to a specialized support agent.",
        "nodes": [
            {
                "id": "triage",
                "type": "agent",
                "position": {"x": 100, "y": 200},
                "data": {"label": "Triage Agent", "role": "Query Classifier"},
            },
            {
                "id": "support",
                "type": "agent",
                "position": {"x": 500, "y": 200},
                "data": {"label": "Support Agent", "role": "Issue Resolver"},
            },
            {
                "id": "followup",
                "type": "agent",
                "position": {"x": 900, "y": 200},
                "data": {"label": "Follow-up Agent", "role": "Customer Follow-up"},
            },
        ],
        "edges": [
            {"id": "e1", "source": "triage", "target": "support", "label": "classified query"},
            {"id": "e2", "source": "support", "target": "followup", "label": "resolved issue"},
        ],
    },
]


@router.get("/templates")
def list_templates():
    return WORKFLOW_TEMPLATES


@router.get("/", response_model=List[WorkflowResponse])
def list_workflows(db: Session = Depends(get_db)):
    return db.query(Workflow).order_by(Workflow.created_at.desc()).all()


@router.post("/", response_model=WorkflowResponse, status_code=201)
def create_workflow(payload: WorkflowCreate, db: Session = Depends(get_db)):
    workflow = Workflow(**payload.model_dump())
    db.add(workflow)
    db.commit()
    db.refresh(workflow)
    return workflow


@router.get("/{workflow_id}", response_model=WorkflowResponse)
def get_workflow(workflow_id: int, db: Session = Depends(get_db)):
    wf = db.query(Workflow).filter(Workflow.id == workflow_id).first()
    if not wf:
        raise HTTPException(status_code=404, detail="Workflow not found")
    return wf


@router.put("/{workflow_id}", response_model=WorkflowResponse)
def update_workflow(workflow_id: int, payload: WorkflowUpdate, db: Session = Depends(get_db)):
    wf = db.query(Workflow).filter(Workflow.id == workflow_id).first()
    if not wf:
        raise HTTPException(status_code=404, detail="Workflow not found")
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(wf, field, value)
    db.commit()
    db.refresh(wf)
    return wf


@router.delete("/{workflow_id}", status_code=204)
def delete_workflow(workflow_id: int, db: Session = Depends(get_db)):
    wf = db.query(Workflow).filter(Workflow.id == workflow_id).first()
    if not wf:
        raise HTTPException(status_code=404, detail="Workflow not found")
    db.delete(wf)
    db.commit()


@router.post("/{workflow_id}/execute")
async def run_workflow(workflow_id: int, payload: ExecuteWorkflowRequest, db: Session = Depends(get_db)):
    wf = db.query(Workflow).filter(Workflow.id == workflow_id).first()
    if not wf:
        raise HTTPException(status_code=404, detail="Workflow not found")
    result = await execute_workflow(workflow_id, payload.input_message, context=payload.context, db=db)
    if "error" in result and "execution_id" not in result:
        raise HTTPException(status_code=500, detail=result["error"])
    return result


@router.get("/{workflow_id}/executions", response_model=List[ExecutionLogResponse])
def get_workflow_executions(workflow_id: int, db: Session = Depends(get_db)):
    return (
        db.query(ExecutionLog)
        .filter(ExecutionLog.workflow_id == workflow_id)
        .order_by(ExecutionLog.started_at.desc())
        .limit(50)
        .all()
    )
