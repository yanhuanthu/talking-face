from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field, model_validator


class MediaMetadata(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    type: str = Field(min_length=1, max_length=100)
    size: int = Field(ge=0, le=100 * 1024 * 1024)


class RenderSettings(BaseModel):
    resolution: Literal["480p", "720p", "1080p"] = "720p"
    fps: int = Field(default=25, ge=15, le=60)


class GenerateRequest(BaseModel):
    source: MediaMetadata
    inputMode: Literal["text", "audio"]
    text: str | None = Field(default=None, max_length=300)
    audio: MediaMetadata | None = None
    emotion: str = Field(default="自然、中性", max_length=200)
    settings: RenderSettings = Field(default_factory=RenderSettings)

    @model_validator(mode="after")
    def validate_driver_input(self) -> "GenerateRequest":
        if not self.source.type.startswith(("image/", "video/")):
            raise ValueError("source 必须是图片或视频")
        if self.inputMode == "text" and not (self.text or "").strip():
            raise ValueError("文字模式下 text 不能为空")
        if self.inputMode == "audio" and self.audio is None:
            raise ValueError("语音模式下 audio 不能为空")
        return self


class RenderPlan(BaseModel):
    fps: int
    resolution: str
    frameCount: int
    emotionPrompt: str
    visemeStrategy: str


class GenerateResponse(BaseModel):
    jobId: str
    status: Literal["queued", "analyzing", "rendering", "done", "failed"]
    provider: str
    algorithmVersion: str
    estimatedDurationSeconds: int
    renderPlan: RenderPlan
    notice: str


class JobResponse(GenerateResponse):
    progress: int = Field(ge=0, le=100)
    resultUrl: str | None = None
    error: str | None = None
