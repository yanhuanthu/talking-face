"use client";

import {
  ArrowDownToLine,
  Check,
  ChevronDown,
  CircleHelp,
  Clock3,
  FileAudio,
  FileImage,
  ImageIcon,
  LoaderCircle,
  Mic2,
  Play,
  RotateCcw,
  Sparkles,
  UploadCloud,
  Video,
  WandSparkles,
  X,
  Zap,
} from "lucide-react";
import { ChangeEvent, DragEvent, FormEvent, useEffect, useRef, useState } from "react";

type SourceFile = { file: File; url: string; kind: "image" | "video" };
type AudioFile = { file: File; url: string };
type JobState = "idle" | "queued" | "analyzing" | "rendering" | "done" | "error";

const DEFAULT_TEXT = "你好，很高兴见到你！这是一次自然、清晰的唇形生成体验。";

const stateCopy: Record<JobState, { title: string; detail: string }> = {
  idle: { title: "等待开始", detail: "准备好素材后即可生成" },
  queued: { title: "任务已创建", detail: "正在分配模拟推理资源" },
  analyzing: { title: "分析音素与表情", detail: "计算口型节奏和情感强度" },
  rendering: { title: "合成说话人脸", detail: "正在绘制视频帧与编码" },
  done: { title: "生成完成", detail: "占位视频已准备好" },
  error: { title: "生成失败", detail: "请检查素材后重试" },
};

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function FileDrop({ source, onChange, onClear }: { source: SourceFile | null; onChange: (file: File) => void; onClear: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  function pick(file?: File) {
    if (file && (file.type.startsWith("image/") || file.type.startsWith("video/"))) onChange(file);
  }

  if (source) {
    return (
      <div className="source-card">
        <div className="source-thumb">
          {source.kind === "image" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={source.url} alt="参考素材预览" />
          ) : <video src={source.url} muted playsInline />}
          <span className="source-type">{source.kind === "image" ? <FileImage size={13} /> : <Video size={13} />}{source.kind === "image" ? "图片" : "视频"}</span>
        </div>
        <div className="source-meta"><strong>{source.file.name}</strong><span>{formatBytes(source.file.size)} · 素材已就绪</span></div>
        <button className="icon-btn" type="button" onClick={onClear} aria-label="移除素材"><X size={16} /></button>
      </div>
    );
  }

  return (
    <div className={`dropzone ${dragging ? "is-dragging" : ""}`}
      onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)}
      onDrop={(event: DragEvent<HTMLDivElement>) => { event.preventDefault(); setDragging(false); pick(event.dataTransfer.files[0]); }}
      onClick={() => inputRef.current?.click()} role="button" tabIndex={0}
      onKeyDown={(event) => event.key === "Enter" && inputRef.current?.click()}>
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm" hidden onChange={(event) => pick(event.target.files?.[0])} />
      <span className="drop-icon"><UploadCloud size={22} /></span>
      <strong>拖拽或点击上传</strong><span>JPG、PNG、WebP、MP4 · 最大 100 MB</span>
    </div>
  );
}

function PreviewStage({ source, state, progress }: { source: SourceFile | null; state: JobState; progress: number }) {
  return (
    <div className="preview-stage">
      <div className="stage-grid" />
      <div className="stage-topline"><span><span className={`status-dot ${state !== "idle" ? "active" : ""}`} />实时预览</span><span className="quality-pill">720P <ChevronDown size={13} /></span></div>
      <div className="portrait-frame">
        {source ? source.kind === "image" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img className={state === "rendering" ? "speaking" : ""} src={source.url} alt="参考人物" />
        ) : <video className={state === "rendering" ? "speaking" : ""} src={source.url} muted loop autoPlay playsInline /> : (
          <div className="empty-face">
            <div className="face-orbit orbit-one" /><div className="face-orbit orbit-two" />
            <div className="face-graphic"><span className="eye left" /><span className="eye right" /><span className={`mouth ${state === "rendering" ? "talking" : ""}`} /></div>
            <p>人物预览区</p><span>上传清晰正脸素材以开始</span>
          </div>
        )}
        {state === "rendering" && <div className="scan-line"><span /></div>}
        {(state === "queued" || state === "analyzing" || state === "rendering") && (
          <div className="render-overlay"><LoaderCircle className="spin" size={22} /><strong>{stateCopy[state].title}</strong><span>{progress}%</span></div>
        )}
      </div>
      <div className="timeline"><button type="button" aria-label="播放预览"><Play size={14} fill="currentColor" /></button><div className="timeline-track"><span style={{ width: state === "done" ? "100%" : `${Math.min(progress, 94)}%` }} /></div><span>00:00 / 00:06</span></div>
    </div>
  );
}

export default function Home() {
  const [source, setSource] = useState<SourceFile | null>(null);
  const [audio, setAudio] = useState<AudioFile | null>(null);
  const [mode, setMode] = useState<"text" | "audio">("text");
  const [script, setScript] = useState(DEFAULT_TEXT);
  const [emotion, setEmotion] = useState("温暖、自信，语速自然，结尾带一点微笑");
  const [state, setState] = useState<JobState>("idle");
  const [progress, setProgress] = useState(0);
  const [jobId, setJobId] = useState("");
  const [resultUrl, setResultUrl] = useState("");
  const [error, setError] = useState("");
  const [advanced, setAdvanced] = useState(false);
  const audioInput = useRef<HTMLInputElement>(null);

  useEffect(() => () => {
    if (source) URL.revokeObjectURL(source.url);
    if (audio) URL.revokeObjectURL(audio.url);
    if (resultUrl) URL.revokeObjectURL(resultUrl);
  }, [source, audio, resultUrl]);

  function updateSource(file: File) {
    if (source) URL.revokeObjectURL(source.url);
    setSource({ file, url: URL.createObjectURL(file), kind: file.type.startsWith("video/") ? "video" : "image" });
    setResultUrl(""); setState("idle");
  }

  function updateAudio(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (audio) URL.revokeObjectURL(audio.url);
    setAudio({ file, url: URL.createObjectURL(file) });
  }

  async function recordMockVideo(durationSeconds: number) {
    if (!source || typeof MediaRecorder === "undefined") return "";
    const canvas = document.createElement("canvas"); canvas.width = 720; canvas.height = 720;
    const ctx = canvas.getContext("2d"); if (!ctx) return "";
    const media = source.kind === "image" ? new Image() : document.createElement("video"); media.src = source.url;
    if (media instanceof HTMLVideoElement) { media.muted = true; media.loop = true; media.playsInline = true; await media.play().catch(() => undefined); }
    else await new Promise<void>((resolve) => { media.onload = () => resolve(); });
    const stream = canvas.captureStream(25);
    const recorder = new MediaRecorder(stream, { mimeType: MediaRecorder.isTypeSupported("video/webm;codecs=vp9") ? "video/webm;codecs=vp9" : "video/webm" });
    const chunks: BlobPart[] = []; recorder.ondataavailable = (event) => event.data.size && chunks.push(event.data);
    const result = new Promise<string>((resolve) => { recorder.onstop = () => resolve(URL.createObjectURL(new Blob(chunks, { type: "video/webm" }))); });
    recorder.start(); const started = performance.now(); const total = Math.min(Math.max(durationSeconds, 3), 8) * 1000;
    await new Promise<void>((resolve) => {
      function frame(now: number) {
        const elapsed = now - started;
        const sourceWidth = media instanceof HTMLVideoElement ? media.videoWidth : media.naturalWidth;
        const sourceHeight = media instanceof HTMLVideoElement ? media.videoHeight : media.naturalHeight;
        if (!sourceWidth || !sourceHeight) { requestAnimationFrame(frame); return; }
        const scale = Math.max(canvas.width / sourceWidth, canvas.height / sourceHeight); const width = sourceWidth * scale; const height = sourceHeight * scale;
        ctx!.fillStyle = "#0a0d12"; ctx!.fillRect(0, 0, canvas.width, canvas.height); ctx!.drawImage(media, (canvas.width - width) / 2, (canvas.height - height) / 2, width, height);
        const beat = Math.abs(Math.sin(elapsed / 115)) * (0.55 + 0.45 * Math.abs(Math.sin(elapsed / 410)));
        const gradient = ctx!.createLinearGradient(0, 0, 0, canvas.height); gradient.addColorStop(0, "rgba(7,10,15,0)"); gradient.addColorStop(1, "rgba(7,10,15,.28)"); ctx!.fillStyle = gradient; ctx!.fillRect(0, 0, canvas.width, canvas.height);
        ctx!.fillStyle = `rgba(255,119,104,${0.11 + beat * 0.1})`; ctx!.beginPath(); ctx!.ellipse(360, 474, 34 + beat * 5, 7 + beat * 12, 0, 0, Math.PI * 2); ctx!.fill();
        ctx!.fillStyle = "rgba(255,255,255,.82)"; ctx!.font = "500 15px sans-serif"; ctx!.fillText("VoiceFace Lab · STUB RENDER", 24, 690);
        if (elapsed < total) requestAnimationFrame(frame); else resolve();
      }
      requestAnimationFrame(frame);
    });
    recorder.stop(); if (media instanceof HTMLVideoElement) media.pause(); return result;
  }

  async function generate(event: FormEvent) {
    event.preventDefault(); setError("");
    if (!source) { setError("请先上传参考图片或视频"); return; }
    if (mode === "text" && !script.trim()) { setError("请输入要说的文字"); return; }
    if (mode === "audio" && !audio) { setError("请上传语音文件"); return; }
    setResultUrl(""); setProgress(8); setState("queued");
    try {
      const response = await fetch("/api/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
        source: { name: source.file.name, type: source.file.type, size: source.file.size }, inputMode: mode, text: mode === "text" ? script : undefined,
        audio: audio ? { name: audio.file.name, type: audio.file.type, size: audio.file.size } : undefined, emotion,
        settings: { resolution: "720p", fps: 25, faceEnhance: true },
      }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error || "任务创建失败");
      setJobId(data.jobId); setState("analyzing"); setProgress(34); await new Promise((resolve) => window.setTimeout(resolve, 900));
      setState("rendering"); setProgress(68); const url = await recordMockVideo(data.estimatedDurationSeconds); setProgress(92); await new Promise((resolve) => window.setTimeout(resolve, 500));
      setResultUrl(url); setProgress(100); setState("done");
    } catch (reason) { setState("error"); setError(reason instanceof Error ? reason.message : "生成失败，请重试"); }
  }

  function reset() { setState("idle"); setProgress(0); setResultUrl(""); setJobId(""); setError(""); }

  return (
    <main>
      <header className="app-header">
        <a className="brand" href="#" aria-label="VoiceFace Lab 首页"><span className="brand-mark"><span /><span /><span /><span /><span /></span><span><strong>Talking Face Generation</strong></span></a>
        <div className="header-center"><span className="header-kicker"></span><strong></strong></div>
        {/* <nav><button type="button"><CircleHelp size={16} /> 使用指南</button></nav> */}
      </header>

      <section className="workspace">
        <div className="workspace-heading">
          <div><h1>让每一帧，<em>自然开口</em></h1><p>将静态人像或视频转化为具有自然唇形与情感表达的说话视频。</p></div>
          <div className="stepper" aria-label="生成步骤">{["上传素材", "设置内容", "生成视频"].map((label, index) => <div key={label} className={index === 0 || source ? "active" : ""}><span>{index + 1}</span><small>{label}</small></div>)}</div>
        </div>

        <form className="studio-grid" onSubmit={generate}>
          <section className="panel input-panel">
            <div className="panel-title"><span><ImageIcon size={17} /> 参考人物</span><small>正脸、光线均匀效果更佳</small></div>
            <FileDrop source={source} onChange={updateSource} onClear={() => { if (source) URL.revokeObjectURL(source.url); setSource(null); reset(); }} />
            <div className="section-divider" />
            <div className="panel-title"><span><Mic2 size={17} /> 驱动内容</span><small>文字将使用模拟语音节奏</small></div>
            <div className="mode-tabs"><button type="button" className={mode === "text" ? "active" : ""} onClick={() => setMode("text")}>输入文字</button><button type="button" className={mode === "audio" ? "active" : ""} onClick={() => setMode("audio")}>上传语音</button></div>
            {mode === "text" ? <label className="textarea-wrap"><textarea value={script} onChange={(event) => setScript(event.target.value.slice(0, 300))} placeholder="输入想让人物说的话…" /><span>{script.length} / 300</span></label> : (
              <div className="audio-upload" onClick={() => audioInput.current?.click()}><input ref={audioInput} hidden type="file" accept="audio/*" onChange={updateAudio} /><span className="audio-icon"><FileAudio size={20} /></span>{audio ? <><strong>{audio.file.name}</strong><small>{formatBytes(audio.file.size)}</small></> : <><strong>选择语音文件</strong><small>MP3、WAV、M4A · 最大 20 MB</small></>}</div>
            )}
            <div className="section-divider" />
            <div className="panel-title"><span><Sparkles size={17} /> 情感描述</span><small>用自然语言描述表演方式</small></div>
            <label className="emotion-input"><input value={emotion} onChange={(event) => setEmotion(event.target.value)} placeholder="例如：开心、语气轻快，带一点惊喜" /><WandSparkles size={16} /></label>
            <div className="chips">{["温暖自然", "专业沉稳", "开心活泼", "真诚感动"].map((item) => <button key={item} type="button" onClick={() => setEmotion(item)}>{item}</button>)}</div>
          </section>

          <section className="panel preview-panel"><PreviewStage source={source} state={state} progress={progress} /><div className="preview-caption"><span><Zap size={14} /> 实时预览</span><p>最终画质与口型效果取决于接入的生成模型</p></div></section>

          <aside className="panel control-panel">
            <div className="control-heading"><span className="control-icon"><Video size={18} /></span><div><strong>输出视频参数</strong><small>仅影响最终生成的视频文件</small></div></div>
            <p className="output-hint">以下为输出配置，不属于人物、文字或语音输入</p>
            <div className="setting-row"><span>视频规格<small>输出视频分辨率</small></span><button type="button">720P <ChevronDown size={13} /></button></div>
            <div className="setting-row"><span>输出帧率<small>输出视频画面流畅度</small></span><strong>25 FPS</strong></div>
            <div className="setting-row"><span>输出人脸增强<small>增强输出视频的面部细节</small></span><label className="switch"><input type="checkbox" defaultChecked /><span /></label></div>
            <button className="advanced" type="button" onClick={() => setAdvanced(!advanced)}>更多输出参数 <ChevronDown size={14} className={advanced ? "turned" : ""} /></button>
            {advanced && <div className="advanced-box"><span>嘴部平滑：0.72</span><span>表情强度：0.65</span><span>边缘融合：开启</span></div>}
            <div className="job-status"><div className="status-head"><span>任务状态</span>{jobId && <small>{jobId.slice(0, 12)}</small>}</div><div className={`status-card ${state}`}><span className="status-icon">{state === "done" ? <Check size={18} /> : state === "idle" ? <Clock3 size={18} /> : <LoaderCircle className={state !== "error" ? "spin" : ""} size={18} />}</span><div><strong>{stateCopy[state].title}</strong><small>{stateCopy[state].detail}</small></div>{state !== "idle" && state !== "error" && <b>{progress}%</b>}</div>{state !== "idle" && <div className="progress"><span style={{ width: `${progress}%` }} /></div>}</div>
            {error && <p className="error-message">{error}</p>}
            {state === "done" && resultUrl ? <div className="result-actions"><video src={resultUrl} controls loop playsInline /><a href={resultUrl} download={`voiceface-${jobId || "demo"}.webm`}><ArrowDownToLine size={17} /> 下载占位视频</a><button type="button" onClick={reset}><RotateCcw size={15} /> 重新生成</button></div> : (
              <button className="generate-btn" type="submit" disabled={state === "queued" || state === "analyzing" || state === "rendering"}>{state === "queued" || state === "analyzing" || state === "rendering" ? <LoaderCircle className="spin" size={18} /> : <WandSparkles size={18} />}{state === "idle" || state === "error" ? "开始生成视频" : "正在生成…"}</button>
            )}
            <p className="stub-note"><span>STUB</span> 当前使用模拟后端，不消耗真实算力</p>
          </aside>
        </form>
      </section>
      <footer><span>北京第二外国语学院人工智能与语言科学学院</span><span>算法接口状态：<i /> Python 模拟服务正常</span><span>v0.2.0 · Prototype</span></footer>
    </main>
  );
}
