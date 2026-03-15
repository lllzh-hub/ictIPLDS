# 电力巡检系统 (Power Inspection System)

智能电网监测与缺陷识别系统，采用无人机航拍 + AI 视觉识别技术。

## 📁 项目结构

```
ictIPLDS/
├── backend/                    # Spring Boot 后端服务
├── frontend/                   # React + TypeScript 前端应用
├── database/                   # 数据库脚本
│   ├── schema.sql             # 主数据库脚本
│   ├── migrations/            # 数据库迁移脚本
│   └── seeds/                 # 测试数据
├── scripts/                    # 工具脚本
├── docs/                       # 项目文档
└── README.md                   # 本文件
```

## 🚀 快速开始

### 前置要求
- Java 17+
- Node.js 18+
- MySQL 8.0+

### 后端启动

```bash
cd backend
mvn clean install
mvn spring-boot:run
```

后端服务运行在 `http://localhost:8080`

### 前端启动

```bash
cd frontend
npm install
npm run dev
```

前端应用运行在 `http://localhost:5173`

### 数据库初始化

```bash
# 创建数据库
mysql -u root -p < database/schema.sql

# 导入测试数据
mysql -u root -p power_inspection < database/seeds/test_data.sql

# 执行迁移
mysql -u root -p power_inspection < database/migrations/001_add_confidence.sql
```

## 📚 文档

- [快速开始指南](docs/SETUP.md)
- [API 文档](docs/API.md)
- [架构设计](docs/ARCHITECTURE.md)
- [数据库设计](docs/DATABASE.md)
- [部署指南](docs/DEPLOYMENT.md)

## 🏗️ 技术栈

### 后端
- Spring Boot 3.2.0
- Spring Data JPA
- MySQL 8.0
- Maven

### 前端
- React 19
- TypeScript 5.9
- Vite 7
- Tailwind CSS 3
- ECharts 6

## 📋 主要功能

- ✅ 无人机管理与监控
- ✅ 缺陷自动识别与分类
- ✅ 实时数据导入与处理
- ✅ AI 辅助分析
- ✅ 航线规划与优化
- ✅ 数据可视化展示

## 🔧 配置

### 后端配置 (`backend/src/main/resources/application.properties`)

```properties
# 数据库配置
spring.datasource.url=jdbc:mysql://localhost:3306/power_inspection
spring.datasource.username=root
spring.datasource.password=your_password

# JPA 配置
spring.jpa.hibernate.ddl-auto=update
spring.jpa.show-sql=false
```

### 前端配置 (`frontend/src/constants/api.ts`)

```typescript
export const API_BASE_URL = 'http://localhost:8080/api';
```

## 📝 API 端点

| 方法 | 端点 | 描述 |
|------|------|------|
| GET | `/api/defects` | 获取所有缺陷 |
| POST | `/api/defects` | 创建缺陷 |
| GET | `/api/drones` | 获取所有无人机 |
| POST | `/api/drones` | 创建无人机 |
| POST | `/api/defects/import` | 导入检测数据 |

详见 [API 文档](docs/API.md)

## 🤝 贡献指南

1. Fork 项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 📄 许可证

本项目采用 MIT 许可证。详见 [LICENSE](LICENSE) 文件。

## 📞 联系方式

如有问题或建议，请提交 Issue 或联系项目维护者。

---

**最后更新**: 2026-03-15
