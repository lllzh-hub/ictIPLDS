# 电力巡检系统后端

## 项目说明
这是电力巡检系统的后端服务，基于 Spring Boot 3.2.2 开发。

## 技术栈
- Java 21
- Spring Boot 3.2.2
- Spring Data JPA
- MySQL 8.0
- 阿里云通义千问 AI

## 快速开始

### 1. 配置数据库
创建 MySQL 数据库：
```sql
CREATE DATABASE power_inspection CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 2. 配置 API Key
编辑 `src/main/resources/application.properties`，设置：
- 数据库连接信息
- 阿里云通义千问 API Key

### 3. 运行项目
```bash
mvn clean install
mvn spring-boot:run
```

服务将在 http://localhost:8080 启动

## API 接口

### 缺陷管理
- GET /api/defects - 获取所有缺陷
- GET /api/defects/{id} - 获取单个缺陷
- GET /api/defects/status/{status} - 按状态查询
- GET /api/defects/severity/{severity} - 按严重程度查询
- POST /api/defects - 创建缺陷
- PUT /api/defects/{id} - 更新缺陷
- DELETE /api/defects/{id} - 删除缺陷

### AI 分析
- POST /api/ai/analyze - AI 智能分析缺陷
  - 请求体: `{"taskInfo": "缺陷描述"}`
  - 响应: `{"analysis": "AI 分析结果"}`

