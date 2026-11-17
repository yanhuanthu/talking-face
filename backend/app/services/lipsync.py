from __future__ import annotations

import asyncio
import secrets
from dataclasses import dataclass, field
from datetime import UTC, datetime
from typing import Protocol

from app.schemas import GenerateRequest, GenerateResponse, JobResponse, RenderPlan


class LipSyncEngine(Protocol):
    """Contract that a real lip-sync algorithm adapter must implement."""

    async def submit(self, payload: GenerateRequest) -> GenerateResponse: ...

    async def get_job(self, job_id: str) -> JobResponse | None: ...


@dataclass
class JobRecord:
    response: GenerateResponse
    created_at: datetime = field(default_factory=lambda: datetime.now(UTC))
    status: str = "queued"
    progress: int = 8
    result_url: str | None = None
    error: str | None = None


class StubLipSyncEngine:
    """In-memory algorithm stub used to validate the product workflow.

    Replace this class with a Wav2Lip/MuseTalk/custom inference adapter while
    keeping the ``LipSyncEngine`` contract stable.
    """

    provider = "python-mock-lipsync-adapter"
    version = "stub-0.2.0"

    def __init__(self) -> None:
        self._jobs: dict[str, JobRecord] = {}

    async def submit(self, payload: GenerateRequest) -> GenerateResponse:
        text_length = len((payload.text or "").strip()) if payload.inputMode == "text" else 36
        duration = min(8, max(3, round(text_length / 5.2)))
        job_id = f"VF-{secrets.token_hex(5).upper()}"
        plan = RenderPlan(
            fps=payload.settings.fps,
            resolution=payload.settings.resolution,
            frameCount=duration * payload.settings.fps,
            emotionPrompt=payload.emotion.strip() or "自然、中性",
            visemeStrategy="synthetic-sine-envelope",
        )
        response = GenerateResponse(
            jobId=job_id,
            status="queued",
            provider=self.provider,
            algorithmVersion=self.version,
            estimatedDurationSeconds=duration,
            renderPlan=plan,
            notice="该任务来自 Python 模拟算法，未处理素材二进制。",
        )
        self._jobs[job_id] = JobRecord(response=response)
        asyncio.create_task(self._simulate_pipeline(job_id))
        return response

    async def get_job(self, job_id: str) -> JobResponse | None:
        record = self._jobs.get(job_id)
        if record is None:
            return None
        return JobResponse(
            **record.response.model_dump(exclude={"status"}),
            status=record.status,
            progress=record.progress,
            resultUrl=record.result_url,
            error=record.error,
        )

    async def _simulate_pipeline(self, job_id: str) -> None:
        record = self._jobs[job_id]
        for status, progress, delay in (
            ("analyzing", 34, 0.7),
            ("rendering", 68, 1.1),
            ("done", 100, 1.2),
        ):
            await asyncio.sleep(delay)
            record.status = status
            record.progress = progress
        record.result_url = None


engine: LipSyncEngine = StubLipSyncEngine()
