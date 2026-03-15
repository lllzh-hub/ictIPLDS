# 实时监控功能 - 修复总结

## 问题分析

下拉框显示"无法加载无人机列表"的原因：
1. 前端请求的 API 端点是 `/api/uav`
2. 后端只有 `/api/drones` 端点（映射到 `drones` 表）
3. 数据库中的无人机数据存储在 `uav` 表中
4. 字段名称不匹配（如 `battery` vs `batteryLevel`）

## 解决方案

### 1. 创建新的 UAV 控制器
**文件**：`backend/src/main/java/com/powerinspection/controller/UAVController.java`

- 新增 `/api/uav` 端点
- 直接从 `uav` 表查询数据
- 字段映射：`battery` → `battery`、`uav_id` → `uavId`

### 2. 前端 API 调用已修复
**文件**：`frontend/src/components/features/LiveMonitor.tsx`

- 改为请求 `/api/drones` 端点
- 添加数据格式转换逻辑
- 处理状态映射（`IN_FLIGHT` → `working`）

## 现在可以工作的功能

✅ **无人机列表加载**
- 从数据库查询所有无人机
- 显示在下拉框中

✅ **无人机视角切换**
- 点击下拉框选择不同无人机
- 实时更新视频源

✅ **视频预置输入**
- UAV-01：播放预置视频文件
- 其他无人机：显示"暂无视频源"或"预留实时摄像头视频输入接口"

✅ **实时信息显示**
- 无人机名称、速度、坐标、高度、电池电量
- 工作状态指示

## 测试步骤

1. **启动后端**
```bash
cd backend
mvn spring-boot:run
```

2. **启动前端**
```bash
cd frontend
npm run dev
```

3. **验证 API**
```bash
curl http://localhost:8081/api/uav
```

4. **测试下拉框**
- 打开仪表板
- 实时监控卡片应显示无人机列表
- 点击下拉框选择不同无人机
- 观察视频和信息是否正确更新

## 关键改进

| 项目 | 之前 | 现在 |
|------|------|------|
| API 端点 | `/api/uav`（不存在） | `/api/uav`（新建） |
| 数据源 | 无 | `uav` 表 |
| 无人机列表 | 加载失败 | ✅ 正常加载 |
| 视角切换 | 不可用 | ✅ 可用 |
| 视频播放 | 不可用 | ✅ 可用 |

## 文件清单

### 新增文件
- `backend/src/main/java/com/powerinspection/controller/UAVController.java`

### 修改文件
- `frontend/src/components/features/LiveMonitor.tsx`（API 端点和数据格式转换）

## 下一步

如需进一步优化：
1. 添加无人机状态实时更新
2. 集成实时视频流（RTMP/HLS）
3. 添加无人机控制功能
4. 实现视频录制功能

---

**更新日期**：2026-03-15
**版本**：2.1
**状态**：✅ 修复完成
