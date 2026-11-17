from __future__ import annotations

import os
from datetime import UTC, datetime

from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware

from app.schemas import GenerateRequest, GenerateResponse, JobResponse
from app.services.lipsync import engine


def _allowed_origins() -> list[str]:
    raw = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173")
    return [origin.strip() for origin in raw.split(",") if origin.strip()]


app = FastAPI(
    title="VoiceFace Lip-sync API",
    description="Talking-face generation API with a replaceable algorithm adapter.",
    version="0.2.0",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins(),
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)


@app.get("/health")
async def health() -> dict[str, object]:
    return {
        "service": "voiceface-python-backend",
        "status": "healthy",
        "algorithmConnected": False,
        "algorithmMode": "stub",
        "timestamp": datetime.now(UTC).isoformat(),
    }


@app.post(
    "/api/v1/generate",
    response_model=GenerateResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
async def generate(payload: GenerateRequest) -> GenerateResponse:
    return await engine.submit(payload)


@app.get("/api/v1/jobs/{job_id}", response_model=JobResponse)
async def get_job(job_id: str) -> JobResponse:
    job = await engine.get_job(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="任务不存在")
    return job
