# 实时监控组件 - 更新说明

## 🔧 修改内容

### 1. ✅ 修复错误
- 修复了组件加载和渲染问题
- 改进了错误处理机制
- 添加了加载状态管理

### 2. ✅ 无人机视角切换 - 下拉框方式
**位置**：实时监控卡片左上角
- 改为下拉框（select）选择无人机
- 显示数据库中所有无人机名称
- 点击下拉框可快速切换视角
- 默认选择第一个无人机

### 3. ✅ 视频作为预置输入
**特性**：
- 视频文件作为预置输入源
- 仅当选中该无人机时才加载和播放视频
- 未选中时自动停止播放，防止页面卡顿
- 支持后续切换为实时视频输入

**实现方式**：
```typescript
// 获取视频源
const getVideoSource = (uavId: string): string | null => {
  if (uavId === 'UAV-01') {
    return 'http://localhost:8081/api/video/stream/0f84fa38c795c5dc0f612ca789e306eb_raw.mp4';
  }
  return null; // 其他无人机预留实时视频输入接口
};

// 当选择改变时，只有选中的无人机才会播放视频
useEffect(() => {
  if (videoRef.current && selectedUAVId) {
    const videoSource = getVideoSource(selectedUAVId);
    if (videoSource) {
      videoRef.current.src = videoSource;
      videoRef.current.play();
    } else {
      // 未选中时停止播放
      videoRef.current.pause();
      videoRef.current.src = '';
    }
  }
}, [selectedUAVId]);
```

### 4. ✅ 卡片位置保持不变
- 实时监控卡片保持在原位置
- 不添加到最右侧
- 保持原有的网格布局

---

## 📋 使用说明

### 基本操作
1. 打开仪表板
2. 在实时监控卡片左上角找到"选择无人机"下拉框
3. 点击下拉框选择不同的无人机
4. 选中 UAV-01 时会自动播放视频
5. 选中其他无人机时显示"暂无视频源"或"预留实时摄像头视频输入接口"

### 视频切换
- **当前**：使用预置的视频文件（docs 目录下的 MP4 文件）
- **后续**：可指定设备输入号，切换为实时视频输入
- **优势**：未选中时不播放，避免页面卡顿

---

## 🎯 后续集成实时视频

### 步骤 1：配置视频源
在 `getVideoSource` 函数中添加实时视频输入：

```typescript
const getVideoSource = (uavId: string): string | null => {
  if (uavId === 'UAV-01') {
    return 'http://localhost:8081/api/video/stream/0f84fa38c795c5dc0f612ca789e306eb_raw.mp4';
  }
  if (uavId === 'UAV-02') {
    // 指定设备输入号，例如：/dev/video0
    return 'http://localhost:8081/api/video/rtmp/uav-02'; // RTMP 流
  }
  return null;
};
```

### 步骤 2：后端配置
在 `VideoController` 中添加实时视频流端点：

```java
@GetMapping("/rtmp/{uavId}")
public ResponseEntity<?> streamRTMP(@PathVariable String uavId) {
  // 根据 uavId 获取对应的实时视频流
  // 例如：rtmp://localhost:1935/live/{uavId}
}
```

### 步骤 3：启动摄像头推流
```bash
ffmpeg -i /dev/video0 -c:v libx264 -preset veryfast -b:v 2500k \
  -c:a aac -b:a 128k -f flv rtmp://localhost:1935/live/uav-02
```

---

## 📁 修改的文件

### 前端
1. **`frontend/src/components/features/LiveMonitor.tsx`** - 完全重写
   - 改为下拉框选择无人机
   - 实现视频预置输入机制
   - 未选中时停止播放

2. **`frontend/src/pages/Dashboard.tsx`** - 小幅修改
   - 移除 `gridColumn: 'span 2'` 样式
   - 保持卡片在原位置

---

## 🔍 关键改进

| 功能 | 之前 | 现在 |
|------|------|------|
| 无人机选择 | 按钮组 | 下拉框 |
| 视频播放 | 始终加载 | 仅选中时加载 |
| 页面性能 | 可能卡顿 | 优化，防止卡顿 |
| 卡片位置 | 跨越两列 | 保持原位置 |
| 错误处理 | 基础 | 完善 |

---

## ✨ 特性

✅ **下拉框选择**
- 简洁的 UI 设计
- 易于选择无人机
- 显示无人机名称和 ID

🎥 **智能视频加载**
- 仅选中时加载视频
- 未选中时停止播放
- 防止页面卡顿

📊 **实时信息显示**
- 无人机名称、速度、坐标、高度、电池
- 工作状态指示
- 实时更新显示

🔌 **可扩展接口**
- 预留实时摄像头接口
- 支持多种视频流格式
- 易于集成新的视频源

---

## 🚀 快速测试

```bash
# 1. 启动后端
cd backend && mvn spring-boot:run

# 2. 启动前端（新终端）
cd frontend && npm run dev

# 3. 访问应用
# http://localhost:5173

# 4. 测试
# - 打开仪表板
# - 在实时监控卡片找到下拉框
# - 选择不同的无人机
# - 观察视频加载和播放情况
```

---

## 📝 注意事项

1. **视频文件路径**
   - 确保 `docs/0f84fa38c795c5dc0f612ca789e306eb_raw.mp4` 存在
   - 后端需要正确配置文件访问权限

2. **数据库数据**
   - 确保数据库中有 UAV 数据
   - 无人机 ID 应该与代码中的映射一致

3. **性能优化**
   - 未选中的视频不会加载，节省带宽
   - 视频播放器使用 `muted` 属性，避免音频问题
   - 使用 `loop` 属性，视频循环播放

---

**更新日期**：2026-03-15
**版本**：2.0
**状态**：✅ 完成
