# Talking Face Generation

一个说话人脸生成系统原型。前端支持上传参考图片/视频、输入文字或语音、填写情感描述，并展示完整的模拟任务流程；独立 Python 后端位于 `backend/`，前端通过 `app/api/generate/route.ts` 代理访问。

## 本地运行

```bash
npm install
npm run dev
```

## 替换真实算法

在 `backend/app/services/lipsync.py` 中实现 `LipSyncEngine` 协议，并保持返回字段 `jobId`、`status`、`estimatedDurationSeconds` 与任务查询契约即可。当前素材二进制仅在浏览器本地用于预览，不会上传到打桩后端。

Python 后端的启动方式和接口说明见 [`backend/README.md`](backend/README.md)。

## 本地前端连接远程后端

项目已经通过 `app/api/generate/route.ts` 提供同源代理。远程后端经 SSH 隧道映射到本地后，只需创建 `.env.local`：

```bash
cp .env.local.example .env.local
npm run dev
```

默认配置会将前端代理连接到 `http://127.0.0.1:18000`。远程服务器部署、Windows/Xshell 跳板机和 macOS SSH 隧道的完整步骤见 [`docs/REMOTE_BACKEND.md`](docs/REMOTE_BACKEND.md)。

---

## Prerequisites

- Node.js `>=22.13.0`
- Portable: Windows, macOS, or Linux; no Bash required
- Managed Linux: managed Linux runtime with Bash, `flock`, `curl`, `sha256sum`, and GNU `timeout`
- Git and `tar` (including Windows `tar.exe`) are required for publishing; portable publication does not require Bash


