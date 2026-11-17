import { NextRequest, NextResponse } from "next/server";

type GeneratePayload = {
  source?: { name?: string; type?: string; size?: number };
  inputMode?: "text" | "audio";
  text?: string;
  audio?: { name?: string; type?: string; size?: number };
  emotion?: string;
  settings?: { resolution?: string; fps?: number; faceEnhance?: boolean };
};

export async function POST(request: NextRequest) {
  let body: GeneratePayload;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "请求格式无效" }, { status: 400 }); }

  const pythonBackendUrl = process.env.PYTHON_BACKEND_URL?.replace(/\/$/, "");
  if (pythonBackendUrl) {
    try {
      const response = await fetch(`${pythonBackendUrl}/api/v1/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      return new NextResponse(await response.text(), {
        status: response.status,
        headers: {
          "Content-Type": response.headers.get("Content-Type") ?? "application/json",
          "X-VoiceFace-Backend": "python",
        },
      });
    } catch {
      return NextResponse.json(
        { error: "Python 后端暂时不可用" },
        { status: 502, headers: { "X-VoiceFace-Backend": "python-unavailable" } },
      );
    }
  }

  if (!body.source?.name || !body.source.type?.match(/^(image|video)\//)) {
    return NextResponse.json({ error: "缺少有效的参考图片或视频" }, { status: 422 });
  }
  if (body.inputMode === "text" && !body.text?.trim()) {
    return NextResponse.json({ error: "文字内容不能为空" }, { status: 422 });
  }
  if (body.inputMode === "audio" && !body.audio?.name) {
    return NextResponse.json({ error: "缺少语音文件信息" }, { status: 422 });
  }

  const textLength = body.inputMode === "text" ? body.text?.trim().length ?? 0 : 36;
  const estimatedDurationSeconds = Math.min(8, Math.max(3, Math.round(textLength / 5.2)));
  const suffix = crypto.randomUUID().replaceAll("-", "").slice(0, 10).toUpperCase();

  return NextResponse.json({
    jobId: `VF-${suffix}`,
    status: "queued",
    provider: "mock-lipsync-adapter",
    algorithmVersion: "stub-0.1.0",
    estimatedDurationSeconds,
    renderPlan: {
      fps: body.settings?.fps ?? 25,
      resolution: body.settings?.resolution ?? "720p",
      frameCount: estimatedDurationSeconds * (body.settings?.fps ?? 25),
      emotionPrompt: body.emotion?.trim() || "自然、中性",
      visemeStrategy: "synthetic-sine-envelope",
    },
    notice: "该响应来自模拟算法适配器，未上传或处理素材二进制。",
  }, { status: 202, headers: { "X-VoiceFace-Backend": "worker-fallback" } });
}

export async function GET() {
  const pythonBackendUrl = process.env.PYTHON_BACKEND_URL?.replace(/\/$/, "");
  if (pythonBackendUrl) {
    try {
      const response = await fetch(`${pythonBackendUrl}/health`);
      return new NextResponse(await response.text(), {
        status: response.status,
        headers: {
          "Content-Type": response.headers.get("Content-Type") ?? "application/json",
          "X-VoiceFace-Backend": "python",
        },
      });
    } catch {
      return NextResponse.json({ status: "unhealthy", error: "Python 后端暂时不可用" }, { status: 502 });
    }
  }
  return NextResponse.json({
    service: "voiceface-generation-stub",
    status: "healthy",
    algorithmConnected: false,
    timestamp: new Date().toISOString(),
  }, { headers: { "X-VoiceFace-Backend": "worker-fallback" } });
}
