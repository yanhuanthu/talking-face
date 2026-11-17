# 唇形生成系统 后端

该目录是独立的 Python/FastAPI 后端。当前使用内存任务队列和模拟唇形算法，用于验证前后端流程。

## 启动

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

接口文档启动后位于 `http://127.0.0.1:8000/docs`。

## 接口

- `GET /health`：服务与算法状态
- `POST /api/v1/generate`：创建生成任务
- `GET /api/v1/jobs/{job_id}`：查询任务进度

## 前端连接

前端 Worker 通过 `PYTHON_BACKEND_URL` 环境变量连接本服务，例如：

```bash
PYTHON_BACKEND_URL=http://127.0.0.1:8000 npm run dev
```

线上部署时将其设为 Python 服务的 HTTPS 地址。未设置时，前端代理会使用兼容打桩，确保演示站点仍可运行。

如果后端部署在远程服务器、前端在本地运行，推荐让后端只监听远程服务器的 `127.0.0.1:8000`，然后通过 SSH 隧道映射到本地 `127.0.0.1:18000`：

```bash
PYTHON_BACKEND_URL=http://127.0.0.1:18000 npm run dev
```

Windows/Xshell、macOS/系统 SSH、systemd 和 Docker 的完整配置见 [`../docs/REMOTE_BACKEND.md`](../docs/REMOTE_BACKEND.md)。

## 接入真实算法

在 `app/services/lipsync.py` 新建实现 `LipSyncEngine` 协议的适配器，并将文件底部的 `engine` 实例切换为真实实现。HTTP 层和前端契约无需修改。
