# API 文档

基础 URL: `http://localhost:8080/api`

## 缺陷管理 API

### 获取所有缺陷

```http
GET /defects
```

**响应示例:**
```json
[
  {
    "id": 1,
    "type": "绝缘子污秽",
    "severity": "high",
    "location": "220kV 输电线路 A段",
    "description": "绝缘子表面污秽严重",
    "status": "pending",
    "confidence": 0.95,
    "createdAt": "2026-03-15T10:30:00",
    "updatedAt": "2026-03-15T10:30:00"
  }
]
```

### 获取单个缺陷

```http
GET /defects/{id}
```

**参数:**
- `id` (path): 缺陷 ID

**响应示例:**
```json
{
  "id": 1,
  "type": "绝缘子污秽",
  "severity": "high",
  "location": "220kV 输电线路 A段",
  "description": "绝缘子表面污秽严重",
  "status": "pending",
  "confidence": 0.95,
  "originalImage": "base64_encoded_image",
  "detectionImage": "base64_encoded_image",
  "thermalImage": "base64_encoded_image",
  "aiAnalysis": "AI 分析结果",
  "solution": "建议清洗处理",
  "createdAt": "2026-03-15T10:30:00",
  "updatedAt": "2026-03-15T10:30:00"
}
```

### 按状态获取缺陷

```http
GET /defects/status/{status}
```

**参数:**
- `status` (path): 缺陷状态 (pending, in-progress, review, completed)

### 按严重程度获取缺陷

```http
GET /defects/severity/{severity}
```

**参数:**
- `severity` (path): 严重程度 (critical, high, medium, low)

### 创建缺陷

```http
POST /defects
Content-Type: application/json

{
  "type": "绝缘子污秽",
  "severity": "high",
  "location": "220kV 输电线路 A段",
  "description": "绝缘子表面污秽严重",
  "status": "pending",
  "confidence": 0.95
}
```

**响应:** 201 Created
```json
{
  "id": 1,
  "type": "绝缘子污秽",
  "severity": "high",
  "location": "220kV 输电线路 A段",
  "description": "绝缘子表面污秽严重",
  "status": "pending",
  "confidence": 0.95,
  "createdAt": "2026-03-15T10:30:00",
  "updatedAt": "2026-03-15T10:30:00"
}
```

### 更新缺陷

```http
PUT /defects/{id}
Content-Type: application/json

{
  "type": "绝缘子污秽",
  "severity": "high",
  "location": "220kV 输电线路 A段",
  "description": "绝缘子表面污秽严重",
  "status": "in-progress",
  "confidence": 0.95
}
```

### 删除缺陷

```http
DELETE /defects/{id}
```

**响应:** 204 No Content

### 导入检测数据

```http
POST /defects/import
Content-Type: application/json

{
  "detected": true,
  "defects": [
    {
      "type": "绝缘子污秽",
      "confidence": 0.95,
      "bbox": [100, 100, 200, 200],
      "category_id": 1,
      "description": "绝缘子表面污秽"
    }
  ],
  "image_base64": "...",
  "location": {
    "latitude": 22.54,
    "longitude": 114.05,
    "altitude": 100
  },
  "timestamp": "2026-03-15T10:30:00",
  "drone_id": "UAV-01"
}
```

**响应:**
```json
{
  "success": true,
  "count": 1,
  "defects": [...],
  "message": "导入成功"
}
```

---

## 无人机管理 API

### 获取所有无人机

```http
GET /drones
```

**响应示例:**
```json
[
  {
    "id": 1,
    "droneId": "UAV-01",
    "name": "无人机 01",
    "model": "DJI Matrice 300",
    "status": "AVAILABLE",
    "batteryLevel": 95.5,
    "currentLocation": "基地",
    "latitude": 22.54,
    "longitude": 114.05,
    "flightHours": 120,
    "lastMaintenanceDate": "2026-03-01T00:00:00",
    "createdAt": "2026-03-15T10:30:00",
    "updatedAt": "2026-03-15T10:30:00"
  }
]
```

### 获取单个无人机

```http
GET /drones/{id}
```

### 按编号获取无人机

```http
GET /drones/drone-id/{droneId}
```

### 按状态获取无人机

```http
GET /drones/status/{status}
```

**参数:**
- `status` (path): 无人机状态 (AVAILABLE, IN_FLIGHT, CHARGING, MAINTENANCE, OFFLINE)

### 创建无人机

```http
POST /drones
Content-Type: application/json

{
  "droneId": "UAV-02",
  "name": "无人机 02",
  "model": "DJI Matrice 300",
  "status": "AVAILABLE",
  "batteryLevel": 100,
  "currentLocation": "基地",
  "latitude": 22.54,
  "longitude": 114.05,
  "flightHours": 0
}
```

### 更新无人机

```http
PUT /drones/{id}
Content-Type: application/json

{
  "status": "IN_FLIGHT",
  "batteryLevel": 85.5,
  "currentLocation": "巡检区域 A"
}
```

### 删除无人机

```http
DELETE /drones/{id}
```

---

## 错误响应

所有错误响应遵循以下格式：

```json
{
  "code": "ERROR_CODE",
  "message": "错误描述",
  "timestamp": 1710486600000
}
```

### 常见错误码

| 错误码 | HTTP 状态 | 描述 |
|--------|----------|------|
| BUSINESS_ERROR | 400 | 业务逻辑错误 |
| NOT_FOUND | 404 | 资源不存在 |
| SYSTEM_ERROR | 500 | 系统内部错误 |

---

## 状态码

| 状态码 | 描述 |
|--------|------|
| 200 | 请求成功 |
| 201 | 资源创建成功 |
| 204 | 请求成功，无返回内容 |
| 400 | 请求参数错误 |
| 404 | 资源不存在 |
| 500 | 服务器内部错误 |

---

## 测试 API

使用 `docs/api-test.http` 文件在 VS Code REST Client 扩展中测试 API。

或使用 curl 命令：

```bash
# 获取所有缺陷
curl http://localhost:8080/api/defects

# 创建缺陷
curl -X POST http://localhost:8080/api/defects \
  -H "Content-Type: application/json" \
  -d '{
    "type": "绝缘子污秽",
    "severity": "high",
    "location": "220kV 输电线路 A段",
    "description": "绝缘子表面污秽严重",
    "status": "pending",
    "confidence": 0.95
  }'
```

---

**最后更新**: 2026-03-15
