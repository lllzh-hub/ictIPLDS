# 架构设计文档

## 系统架构概览

```
┌─────────────────────────────────────────────────────────────┐
│                     前端应用 (React)                         │
│  ┌──────────────┬──────────────┬──────────────┬────────────┐ │
│  │  Dashboard   │ DefectMgmt   │ UAVMgmt      │ FlightPath │ │
│  └──────────────┴──────────────┴──────────────┴────────────┘ │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │              API 层 (Axios)                              │ │
│  └──────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                            ↓ HTTP/REST
┌─────────────────────────────────────────────────────────────┐
│                  后端服务 (Spring Boot)                      │
│  ┌──────────────┬──────────────┬──────────────┐             │
│  │ Controller   │ Service      │ Repository   │             │
│  │ (REST API)   │ (业务逻辑)   │ (数据访问)   │             │
│  └──────────────┴──────────────┴──────────────┘             │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │              异常处理 & 常量管理                          │ │
│  └──────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                            ↓ JDBC
┌─────────────────────────────────────────────────────────────┐
│                    MySQL 数据库                              │
│  ┌──────────────┬──────────────┬──────────────┐             │
│  │ drones       │ defects      │ maintenance  │             │
│  │ (无人机)     │ (缺陷)       │ (维护任务)   │             │
│  └──────────────┴──────────────┴──────────────┘             │
└─────────────────────────────────────────────────────────────┘
```

## 前端架构

### 目录结构

```
frontend/src/
├── api/                    # API 调用层
│   ├── defectApi.ts       # 缺陷 API
│   ├── droneApi.ts        # 无人机 API
│   └── remoteImportApi.ts # 远程导入 API
├── components/            # React 组件
│   ├── common/            # 通用组件
│   │   └── Icon.tsx
│   ├── layouts/           # 布局组件
│   │   └── Layout.tsx
│   └── features/          # 特性组件
│       └── AIAssistant.tsx
├── pages/                 # 页面组件
│   ├── Dashboard.tsx
│   ├── DefectManagement.tsx
│   ├── DefectDetailView.tsx
│   ├── UAVManagement.tsx
│   └── FlightPathPlanning.tsx
├── hooks/                 # 自定义 Hooks
├── types/                 # TypeScript 类型定义
├── constants/             # 常量定义
├── utils/                 # 工具函数
├── assets/                # 静态资源
├── App.tsx                # 根组件
└── main.tsx               # 入口文件
```

### 数据流

```
用户交互
   ↓
页面组件 (Pages)
   ↓
API 调用 (api/)
   ↓
后端服务
   ↓
数据库
   ↓
响应数据
   ↓
状态管理 (useState)
   ↓
UI 更新
```

### 关键组件

| 组件 | 职责 |
|------|------|
| Layout | 提供全局布局和导航 |
| Dashboard | 展示系统概览和实时数据 |
| DefectManagement | 缺陷列表和管理 |
| DefectDetailView | 缺陷详情展示 |
| UAVManagement | 无人机管理 |
| FlightPathPlanning | 航线规划 |
| AIAssistant | AI 辅助功能 |

---

## 后端架构

### 目录结构

```
backend/src/main/java/com/powerinspection/
├── controller/            # 控制层
│   ├── DroneController.java
│   ├── DefectController.java
│   └── AIController.java
├── service/               # 业务逻辑层
│   ├── interfaces/        # 服务接口
│   │   ├── DroneService.java
│   │   ├── DefectService.java
│   │   └── AIService.java
│   └── impl/              # 服务实现
│       ├── DroneServiceImpl.java
│       ├── DefectServiceImpl.java
│       └── AIServiceImpl.java
├── repository/            # 数据访问层
│   ├── DroneRepository.java
│   ├── DefectRepository.java
│   └── MaintenanceTaskRepository.java
├── entity/                # 实体类
│   ├── Drone.java
│   ├── Defect.java
│   └── MaintenanceTask.java
├── dto/                   # 数据传输对象
│   └── DetectionResult.java
├── exception/             # 异常处理
│   ├── BusinessException.java
│   ├── ErrorResponse.java
│   └── GlobalExceptionHandler.java
├── constant/              # 常量定义
│   ├── DroneConstants.java
│   ├── DefectConstants.java
│   └── ApiConstants.java
├── util/                  # 工具类
│   └── ImageUtil.java
└── PowerInspectionApplication.java
```

### 分层设计

```
┌─────────────────────────────────────┐
│      Controller (控制层)             │
│  处理 HTTP 请求和响应               │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│      Service (业务逻辑层)            │
│  实现核心业务逻辑                   │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│      Repository (数据访问层)         │
│  与数据库交互                       │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│      Entity (实体层)                 │
│  数据库表映射                       │
└─────────────────────────────────────┘
```

### 核心服务

#### DroneService
- 获取无人机列表
- 创建/更新/删除无人机
- 按状态查询无人机
- 管理无人机状态

#### DefectService
- 获取缺陷列表
- 创建/更新/删除缺陷
- 按状态/严重程度查询
- 导入检测数据

#### AIService
- 缺陷 AI 分析
- 生成解决方案建议
- 置信度评估

---

## 数据库设计

### 核心表

#### drones (无人机表)
```sql
CREATE TABLE drones (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  drone_id VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  model VARCHAR(100) NOT NULL,
  status ENUM('AVAILABLE', 'IN_FLIGHT', 'CHARGING', 'MAINTENANCE', 'OFFLINE'),
  battery_level DOUBLE,
  current_location VARCHAR(200),
  latitude DOUBLE,
  longitude DOUBLE,
  flight_hours INT,
  last_maintenance_date DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

#### defects (缺陷表)
```sql
CREATE TABLE defects (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  type VARCHAR(100) NOT NULL,
  severity ENUM('critical', 'high', 'medium', 'low'),
  location VARCHAR(200) NOT NULL,
  description TEXT,
  status ENUM('pending', 'in-progress', 'review', 'completed'),
  confidence DOUBLE,
  detected_at DATETIME,
  original_image LONGBLOB,
  detection_image LONGBLOB,
  thermal_image LONGBLOB,
  ai_analysis TEXT,
  solution TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

#### maintenance_tasks (维护任务表)
```sql
CREATE TABLE maintenance_tasks (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  drone_id BIGINT NOT NULL,
  defect_id BIGINT NOT NULL,
  task_type VARCHAR(50),
  status ENUM('pending', 'in-progress', 'completed'),
  assigned_to VARCHAR(100),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (drone_id) REFERENCES drones(id),
  FOREIGN KEY (defect_id) REFERENCES defects(id)
);
```

---

## API 设计原则

### RESTful 设计
- 使用标准 HTTP 方法 (GET, POST, PUT, DELETE)
- 资源导向的 URL 设计
- 统一的响应格式

### 请求/响应格式

**请求:**
```json
{
  "type": "绝缘子污秽",
  "severity": "high",
  "location": "220kV 输电线路 A段"
}
```

**成功响应 (200/201):**
```json
{
  "id": 1,
  "type": "绝缘子污秽",
  "severity": "high",
  "location": "220kV 输电线路 A段",
  "createdAt": "2026-03-15T10:30:00"
}
```

**错误响应 (4xx/5xx):**
```json
{
  "code": "ERROR_CODE",
  "message": "错误描述",
  "timestamp": 1710486600000
}
```

---

## 技术选型

### 前端
- **React 19**: 现代 UI 框架
- **TypeScript**: 类型安全
- **Vite**: 快速构建工具
- **Tailwind CSS**: 原子化 CSS 框架
- **ECharts**: 数据可视化
- **Axios**: HTTP 客户端

### 后端
- **Spring Boot 3.2**: 快速开发框架
- **Spring Data JPA**: ORM 框架
- **MySQL 8.0**: 关系型数据库
- **Maven**: 项目管理工具

---

## 部署架构

```
┌──────────────────────────────────────────────────────┐
│                   Nginx (反向代理)                    │
│  - 静态文件服务                                      │
│  - API 路由转发                                      │
└──────────────────────────────────────────────────────┘
         ↓                              ↓
┌──────────────────────┐      ┌──────────────────────┐
│  前端应用 (React)     │      │  后端服务 (Spring)   │
│  - 构建产物          │      │  - REST API          │
│  - 静态资源          │      │  - 业务逻辑          │
└──────────────────────┘      └──────────────────────┘
                                      ↓
                              ┌──────────────────────┐
                              │   MySQL 数据库       │
                              │  - 数据存储          │
                              │  - 事务管理          │
                              └──────────────────────┘
```

---

**最后更新**: 2026-03-15
