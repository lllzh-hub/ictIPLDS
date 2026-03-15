# 快速开始指南

## 环境准备

### 系统要求
- Windows 10+ / macOS 10.15+ / Linux
- 4GB RAM 最低配置
- 10GB 磁盘空间

### 软件依赖

#### Java 环境
```bash
# 检查 Java 版本
java -version

# 需要 Java 17 或更高版本
# 下载地址: https://www.oracle.com/java/technologies/downloads/
```

#### Node.js 环境
```bash
# 检查 Node.js 版本
node -v
npm -v

# 需要 Node.js 18+ 和 npm 9+
# 下载地址: https://nodejs.org/
```

#### MySQL 数据库
```bash
# 检查 MySQL 版本
mysql --version

# 需要 MySQL 8.0 或更高版本
# 下载地址: https://www.mysql.com/downloads/
```

## 项目初始化

### 1. 克隆或解压项目

```bash
cd ictIPLDS
```

### 2. 数据库初始化

```bash
# 连接到 MySQL
mysql -u root -p

# 在 MySQL 命令行中执行
source database/schema.sql;
source database/seeds/test_data.sql;
source database/migrations/001_add_confidence.sql;

# 或使用命令行一次性执行
mysql -u root -p < database/schema.sql
mysql -u root -p power_inspection < database/seeds/test_data.sql
mysql -u root -p power_inspection < database/migrations/001_add_confidence.sql
```

### 3. 后端配置

编辑 `backend/src/main/resources/application.properties`：

```properties
# 数据库连接
spring.datasource.url=jdbc:mysql://localhost:3306/power_inspection?useSSL=false&serverTimezone=UTC
spring.datasource.username=root
spring.datasource.password=your_mysql_password
spring.datasource.driver-class-name=com.mysql.cj.jdbc.Driver

# JPA 配置
spring.jpa.hibernate.ddl-auto=update
spring.jpa.show-sql=false
spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.MySQL8Dialect

# 应用配置
server.port=8080
spring.application.name=power-inspection-backend
```

### 4. 后端启动

```bash
cd backend

# 使用 Maven 启动
mvn clean install
mvn spring-boot:run

# 或使用 IDE 直接运行 PowerInspectionApplication.java
```

启动成功后，控制台输出：
```
Started PowerInspectionApplication in X.XXX seconds
```

### 5. 前端配置

前端配置已预设，无需修改。如需更改 API 地址，编辑 `frontend/src/constants/api.ts`：

```typescript
export const API_BASE_URL = 'http://localhost:8080/api';
```

### 6. 前端启动

```bash
cd frontend

# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build
```

启动成功后，访问 `http://localhost:5173`

## 验证安装

### 后端验证

```bash
# 测试后端 API
curl http://localhost:8080/api/drones

# 应返回无人机列表 JSON
```

### 前端验证

在浏览器中访问 `http://localhost:5173`，应看到登录页面或仪表板。

## 常见问题

### Q: 数据库连接失败
**A:** 检查以下项：
- MySQL 服务是否运行
- 用户名和密码是否正确
- 数据库是否已创建

```bash
# 检查 MySQL 状态
mysql -u root -p -e "SELECT 1"
```

### Q: 前端无法连接后端
**A:** 检查以下项：
- 后端服务是否运行在 8080 端口
- 防火墙是否阻止了连接
- API 地址配置是否正确

```bash
# 检查后端是否运行
curl http://localhost:8080/api/drones
```

### Q: npm install 失败
**A:** 尝试清除缓存并重新安装：

```bash
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

### Q: 端口被占用
**A:** 修改配置文件中的端口号：

```properties
# 后端 (application.properties)
server.port=8081

# 前端 (vite.config.ts)
export default defineConfig({
  server: {
    port: 5174
  }
})
```

## 开发工作流

### 后端开发

```bash
cd backend

# 运行测试
mvn test

# 代码检查
mvn checkstyle:check

# 构建 JAR
mvn clean package
```

### 前端开发

```bash
cd frontend

# 运行开发服务器（带热重载）
npm run dev

# 代码检查
npm run lint

# 构建生产版本
npm run build

# 预览生产版本
npm run preview
```

## 下一步

- 阅读 [API 文档](API.md) 了解可用的 API 端点
- 查看 [架构设计](ARCHITECTURE.md) 理解系统设计
- 参考 [部署指南](DEPLOYMENT.md) 进行生产部署

---

**需要帮助？** 查看 [常见问题](FAQ.md) 或提交 Issue。
