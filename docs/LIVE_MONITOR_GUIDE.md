# 实时监控组件 - 功能说明与集成指南

## 功能概述

实时监控组件已升级，支持以下功能：

### 1. 无人机视角切换
- ✅ 支持从数据库动态加载无人机列表
- ✅ 点击无人机按钮快速切换视角
- ✅ 实时显示无人机状态（工作中/待机）
- ✅ 显示无人机电池电量指示

### 2. 视频输入支持
- ✅ **无人机1 (UAV-01)**：已配置视频文件输入
  - 视频文件位置：`docs/0f84fa38c795c5dc0f612ca789e306eb_raw.mp4`
  - 通过后端 API 提供：`http://localhost:8081/api/video/stream/0f84fa38c795c5dc0f612ca789e306eb_raw.mp4`
  
- 🔄 **无人机2 (UAV-02)**：预留实时摄像头接口
  - 已预留接口，等待后续集成实时视频流

### 3. 显示信息
- 实时显示无人机名称、速度、坐标、高度、电池电量
- 视频播放器支持暂停、播放、音量控制
- 视频信息叠加层显示 LIVE 状态

---

## 技术架构

### 前端组件
**文件位置**：`frontend/src/components/features/LiveMonitor.tsx`

```typescript
// 主要功能：
- 从后端 API 获取无人机列表
- 根据无人机 ID 动态设置视频源
- 支持无人机视角切换
- 实时显示无人机状态信息
```

### 后端 API
**文件位置**：`backend/src/main/java/com/powerinspection/controller/VideoController.java`

**API 端点**：
- `GET /api/video/stream/{filename}` - 获取视频文件流
- `GET /api/video/info/{filename}` - 获取视频文件信息

---

## 集成实时摄像头视频流 - 步骤指南

### 方案 A：使用 RTMP/HLS 流（推荐）

#### 1. 后端集成 RTMP 支持

在 `VideoController.java` 中添加 RTMP 流处理：

```java
@GetMapping("/rtmp/{streamKey}")
public ResponseEntity<Resource> streamRTMP(@PathVariable String streamKey) {
    // 从 RTMP 服务器获取流
    // 例如：rtmp://localhost:1935/live/{streamKey}
    // 需要部署 Nginx RTMP 模块或 SRS 流媒体服务器
}
```

#### 2. 前端配置 HLS 播放器

在 `LiveMonitor.tsx` 中集成 HLS.js：

```bash
npm install hls.js
```

```typescript
import Hls from 'hls.js';

// 在 useEffect 中初始化 HLS
useEffect(() => {
  if (videoRef.current && currentUAV?.videoSource?.includes('.m3u8')) {
    const hls = new Hls();
    hls.loadSource(currentUAV.videoSource);
    hls.attachMedia(videoRef.current);
  }
}, [currentUAV]);
```

#### 3. 部署流媒体服务器

**选项 1：使用 SRS（Simple RTMP Server）**
```bash
# 安装 SRS
docker run -d -p 1935:1935 -p 8080:8080 ossrs/srs:latest

# 摄像头推流命令
ffmpeg -i rtsp://camera_ip:554/stream -c:v libx264 -c:a aac -f flv rtmp://localhost:1935/live/uav-02
```

**选项 2：使用 Nginx + RTMP 模块**
```nginx
rtmp {
    server {
        listen 1935;
        chunk_size 4096;
        
        application live {
            live on;
            record off;
            hls on;
            hls_path /tmp/hls;
            hls_fragment 3;
            hls_playlist_length 20;
        }
    }
}
```

### 方案 B：使用 WebRTC（低延迟）

#### 1. 后端集成 WebRTC

```java
// 需要集成 WebRTC 库，如 Kurento 或 Janus
@PostMapping("/webrtc/offer")
public ResponseEntity<?> handleWebRTCOffer(@RequestBody String offer) {
    // 处理 WebRTC offer
    // 返回 answer
}
```

#### 2. 前端使用 WebRTC

```typescript
const peerConnection = new RTCPeerConnection();

// 获取远程流
peerConnection.ontrack = (event) => {
  if (videoRef.current) {
    videoRef.current.srcObject = event.streams[0];
  }
};

// 发送 offer
const offer = await peerConnection.createOffer();
await peerConnection.setLocalDescription(offer);
// 发送 offer 到后端...
```

### 方案 C：使用 Motion JPEG（简单）

#### 1. 后端提供 MJPEG 流

```java
@GetMapping("/mjpeg/{cameraId}")
public ResponseEntity<?> streamMJPEG(@PathVariable String cameraId) {
    return ResponseEntity.ok()
        .contentType(MediaType.valueOf("multipart/x-mixed-replace;boundary=frame"))
        .body(new StreamingResponseBody(outputStream -> {
            // 持续写入 JPEG 帧
        }));
}
```

#### 2. 前端显示 MJPEG

```typescript
// 直接在 img 标签中使用
<img src="http://localhost:8081/api/video/mjpeg/uav-02" />
```

---

## 配置步骤

### 1. 更新无人机数据库记录

为 UAV-02 添加视频源配置：

```sql
UPDATE uav 
SET video_source = 'rtmp://localhost:1935/live/uav-02'
WHERE uav_id = 'UAV-02';
```

### 2. 修改 LiveMonitor 组件

```typescript
// 在 fetchUAVList 中更新视频源映射
const uavWithVideo = data.map((uav: UAVInfo) => ({
  ...uav,
  videoSource: 
    uav.uavId === 'UAV-01' 
      ? 'http://localhost:8081/api/video/stream/0f84fa38c795c5dc0f612ca789e306eb_raw.mp4'
      : uav.uavId === 'UAV-02'
      ? 'http://localhost:8081/api/video/hls/uav-02/playlist.m3u8'
      : undefined
}));
```

### 3. 启动摄像头推流

```bash
# 从 RTSP 摄像头推流到 RTMP 服务器
ffmpeg -rtsp_transport tcp -i rtsp://camera_ip:554/stream \
  -c:v libx264 -preset veryfast -b:v 2500k \
  -c:a aac -b:a 128k \
  -f flv rtmp://localhost:1935/live/uav-02
```

---

## 测试方法

### 1. 测试无人机视角切换
- 打开仪表板
- 点击不同的无人机按钮
- 验证视频源是否正确切换

### 2. 测试视频播放
- 验证 UAV-01 视频正常播放
- 检查视频控制条功能
- 验证音量和全屏功能

### 3. 测试实时流（配置后）
- 启动摄像头推流
- 切换到 UAV-02
- 验证实时视频显示

---

## 故障排查

### 问题 1：视频无法加载
**解决方案**：
- 检查后端 API 是否运行：`curl http://localhost:8081/api/video/info/0f84fa38c795c5dc0f612ca789e306eb_raw.mp4`
- 检查视频文件路径是否正确
- 检查浏览器控制台错误信息

### 问题 2：CORS 错误
**解决方案**：
- 确保 `VideoController` 有 `@CrossOrigin(origins = "*")`
- 检查后端 CORS 配置

### 问题 3：实时流延迟高
**解决方案**：
- 使用 WebRTC 而不是 HLS（延迟更低）
- 调整编码参数（降低分辨率或比特率）
- 检查网络连接质量

---

## 文件清单

### 新增文件
- ✅ `frontend/src/components/features/LiveMonitor.tsx` - 实时监控组件
- ✅ `backend/src/main/java/com/powerinspection/controller/VideoController.java` - 视频 API 控制器

### 修改文件
- ✅ `frontend/src/pages/Dashboard.tsx` - 集成 LiveMonitor 组件
- ✅ `frontend/vite.config.ts` - 配置文件服务

---

## 下一步

1. **部署流媒体服务器**（如需实时流）
2. **配置摄像头推流**
3. **测试实时视频播放**
4. **优化视频质量和延迟**

---

## 支持的视频格式

- MP4 (H.264 + AAC)
- HLS (.m3u8)
- RTMP 流
- WebRTC
- Motion JPEG

---

**最后更新**：2026-03-15
**版本**：1.0
