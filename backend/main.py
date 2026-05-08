import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import Base, engine
from api import agents, workflows, messages, monitoring
from integrations.telegram import start_telegram_bot

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s — %(message)s")
logger = logging.getLogger(__name__)

_telegram_task = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _telegram_task
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables initialized")
    _telegram_task = asyncio.create_task(start_telegram_bot())
    yield
    if _telegram_task:
        _telegram_task.cancel()
        try:
            await _telegram_task
        except asyncio.CancelledError:
            pass


app = FastAPI(
    title="AI Agent Orchestration Platform",
    description="Build, configure, and run multi-agent AI workflows powered by LangGraph.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(agents.router, prefix="/api/agents", tags=["Agents"])
app.include_router(workflows.router, prefix="/api/workflows", tags=["Workflows"])
app.include_router(messages.router, prefix="/api/messages", tags=["Messages"])
app.include_router(monitoring.router, prefix="/api/monitoring", tags=["Monitoring"])


@app.get("/health", tags=["Health"])
def health_check():
    return {"status": "ok", "service": "AI Agent Orchestration Platform"}


if __name__ == "__main__":
    import uvicorn
    import os
    uvicorn.run(
        "main:app",
        host=os.getenv("HOST", "0.0.0.0"),
        port=int(os.getenv("PORT", 8000)),
        reload=True,
    )
