# 本地前端连接远程 Python 后端

本项目采用同源代理结构：浏览器只访问本地前端的 `/api/generate`，前端开发服务器再通过 `PYTHON_BACKEND_URL` 请求 Python 后端。远程后端不需要直接暴露到公网，也不需要在浏览器中配置服务器 IP。

```text
浏览器 → 本地前端 127.0.0.1:5173
                  ↓ /api/generate
          127.0.0.1:18000（SSH 隧道入口）
                  ↓ 跳板机 IP1
          目标服务器 IP2:127.0.0.1:8000
                  ↓
             FastAPI 后端
```

当前接口为：

- `GET /health`：后端健康检查
- `POST /api/v1/generate`：创建生成任务
- `GET /api/v1/jobs/{job_id}`：查询任务状态

当前打桩版本没有 WebSocket 接口，因此无需配置 `VITE_WS_URL`。浏览器也不直接访问 FastAPI，所以本地前端场景无需额外配置 CORS。

## 1. 在目标服务器部署后端

以下命令在目标服务器 `IP2` 上执行。示例目录为 `/opt/talking-face`，可替换为实际路径。

### 1.1 使用 Python 虚拟环境

```bash
cd /opt/talking-face/backend
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
cp .env.example .env
```

先以前台方式验证：

```bash
.venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000
```

另开一个服务器终端测试：

```bash
curl http://127.0.0.1:8000/health
```

返回 `"status":"healthy"` 表示后端正常。

### 1.2 使用 systemd 常驻运行

项目提供了 `backend/deploy/voiceface-backend.service`。先按服务器实际情况修改其中的 `User`、`Group`、`WorkingDirectory`、`EnvironmentFile` 和 `ExecStart`，然后执行：

```bash
sudo cp deploy/voiceface-backend.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now voiceface-backend
sudo systemctl status voiceface-backend
```

查看日志：

```bash
sudo journalctl -u voiceface-backend -f
```

### 1.3 使用 Docker（可选）

```bash
cd /opt/talking-face/backend
docker build -t voiceface-backend:latest .
docker run -d \
  --name voiceface-backend \
  --restart unless-stopped \
  --env-file .env \
  -p 127.0.0.1:8000:8000 \
  voiceface-backend:latest
```

端口发布到服务器的 `127.0.0.1`，只能从服务器本机或 SSH 隧道访问，不需要在防火墙中开放 `8000`。

## 2. Windows：使用 Xshell

### 2.1 配置跳板机

1. 在 Xshell 中创建跳板机会话：

   ```text
   名称：跳板机
   主机：IP1
   端口：22
   用户名：跳板机用户名
   ```

2. 创建目标服务器会话：

   ```text
   名称：VoiceFace 服务器
   主机：IP2
   端口：22
   用户名：服务器用户名
   ```

3. 打开目标服务器会话的“属性”，在“连接”页面找到“代理服务器”，添加 `JUMPHOST`：

   ```text
   类型：JUMPHOST
   主机：IP1
   端口：22
   用户名：跳板机用户名
   ```

4. 如果 Xshell 支持选择“会话文件”，直接选择前面创建的“跳板机”会话，以复用认证信息。

5. 保存代理，并将其设为目标服务器会话的默认代理。

### 2.2 配置端口转发

打开“VoiceFace 服务器”会话属性，进入 `连接 → SSH → 隧道`，点击“添加”：

```text
类型：Local（本地/传出）
源主机：127.0.0.1
侦听端口：18000
目标主机：127.0.0.1
目标端口：8000
描述：VoiceFace Python 后端
```

如果存在“仅接受本地连接”选项，请保持选中。保存后连接“VoiceFace 服务器”；使用期间必须保持 Xshell 会话连接。

### 2.3 配置和测试本地前端

在 Windows 项目根目录执行：

```powershell
Copy-Item .env.local.example .env.local
```

确认 `.env.local` 内容为：

```env
PYTHON_BACKEND_URL=http://127.0.0.1:18000
```

测试 SSH 隧道：

```powershell
curl.exe http://127.0.0.1:18000/health
```

启动或重启前端：

```powershell
npm install
npm run dev
```

再测试前端代理是否已经连接 Python 后端：

```powershell
curl.exe -i http://127.0.0.1:5173/api/generate
```

响应头中出现 `X-VoiceFace-Backend: python` 表示本地前端正在通过隧道访问远程 Python 后端。

## 3. macOS：使用系统 SSH

### 3.1 建立 SSH 隧道

打开“终端”，执行：

```bash
ssh -N -J 跳板机用户@IP1 \
  -L 127.0.0.1:18000:127.0.0.1:8000 \
  服务器用户@IP2
```

命令执行后终端通常不会显示内容，这是正常现象。该终端必须保持运行；按 `Control + C` 关闭隧道。

也可以在 `~/.ssh/config` 中配置：

```sshconfig
Host voiceface-jump
  HostName IP1
  User 跳板机用户名
  Port 22

Host voiceface-server
  HostName IP2
  User 服务器用户名
  Port 22
  ProxyJump voiceface-jump
  LocalForward 127.0.0.1:18000 127.0.0.1:8000
  ExitOnForwardFailure yes
```

保存后建立隧道：

```bash
ssh -N voiceface-server
```

### 3.2 配置和测试本地前端

在项目根目录执行：

```bash
cp .env.local.example .env.local
curl http://127.0.0.1:18000/health
npm install
npm run dev
```

另开一个终端验证前端代理：

```bash
curl -i http://127.0.0.1:5173/api/generate
```

响应头中出现 `X-VoiceFace-Backend: python` 表示连接成功。

## 4. 无跳板机时

如果本地可以直接 SSH 到 `IP2`：

```bash
ssh -N \
  -L 127.0.0.1:18000:127.0.0.1:8000 \
  服务器用户@IP2
```

Xshell 中也可以去掉 `JUMPHOST` 代理，保留相同的本地端口转发设置。

## 5. 排查问题

按以下顺序检查：

1. 在 `IP2` 上运行 `curl http://127.0.0.1:8000/health`。
2. 检查后端状态：`systemctl status voiceface-backend` 或 `docker logs voiceface-backend`。
3. 确认本地 `18000` 未被占用。
4. 确认跳板机、目标服务器和 SSH 隧道都保持连接。
5. 修改 `.env.local` 后必须重启 `npm run dev`。
6. 运行 `curl -i http://127.0.0.1:5173/api/generate` 并检查 `X-VoiceFace-Backend` 响应头。

检查本地端口：

```powershell
# Windows
netstat -ano | findstr :18000
```

```bash
# macOS
lsof -nP -iTCP:18000 -sTCP:LISTEN
```

如果 `18000` 已占用，可以改为其他本地端口，但必须同时修改 Xshell/SSH 的本地侦听端口和 `.env.local` 中的 `PYTHON_BACKEND_URL`。
