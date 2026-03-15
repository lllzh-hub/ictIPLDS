# 部署指南

## 生产环境部署

### 前置要求

- Linux 服务器 (Ubuntu 20.04+ 或 CentOS 7+)
- Docker 和 Docker Compose (可选)
- Nginx 反向代理
- MySQL 8.0+
- Java 17+
- Node.js 18+

---

## 后端部署

### 1. 构建 JAR 包

```bash
cd backend
mvn clean package -DskipTests
```

生成的 JAR 文件位于 `target/power-inspection-backend-1.0.0.jar`

### 2. 配置生产环境

编辑 `src/main/resources/application-prod.properties`：

```properties
# 服务器配置
server.port=8080
server.servlet.context-path=/api

# 数据库配置
spring.datasource.url=jdbc:mysql://db.example.com:3306/power_inspection?useSSL=true&serverTimezone=UTC
spring.datasource.username=app_user
spring.datasource.password=${DB_PASSWORD}
spring.datasource.driver-class-name=com.mysql.cj.jdbc.Driver

# JPA 配置
spring.jpa.hibernate.ddl-auto=validate
spring.jpa.show-sql=false
spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.MySQL8Dialect
spring.jpa.properties.hibernate.format_sql=false

# 日志配置
logging.level.root=INFO
logging.level.com.powerinspection=INFO
logging.file.name=/var/log/power-inspection/app.log
logging.file.max-size=10MB
logging.file.max-history=30

# 连接池配置
spring.datasource.hikari.maximum-pool-size=20
spring.datasource.hikari.minimum-idle=5
spring.datasource.hikari.connection-timeout=30000
```

### 3. 启动后端服务

```bash
# 使用 systemd 管理服务
sudo tee /etc/systemd/system/power-inspection.service > /dev/null <<EOF
[Unit]
Description=Power Inspection Backend Service
After=network.target

[Service]
Type=simple
User=app
WorkingDirectory=/opt/power-inspection
ExecStart=/usr/bin/java -jar power-inspection-backend-1.0.0.jar --spring.profiles.active=prod
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# 启动服务
sudo systemctl daemon-reload
sudo systemctl enable power-inspection
sudo systemctl start power-inspection

# 查看日志
sudo journalctl -u power-inspection -f
```

### 4. 验证后端

```bash
curl http://localhost:8080/api/drones
```

---

## 前端部署

### 1. 构建生产版本

```bash
cd frontend
npm install
npm run build
```

生成的文件位于 `dist/` 目录

### 2. 配置生产环境

编辑 `src/constants/api.ts`：

```typescript
export const API_BASE_URL = 'https://api.example.com/api';
```

### 3. 使用 Nginx 部署

创建 Nginx 配置文件 `/etc/nginx/sites-available/power-inspection`：

```nginx
upstream backend {
    server localhost:8080;
}

server {
    listen 80;
    server_name example.com www.example.com;
    
    # 重定向到 HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name example.com www.example.com;
    
    # SSL 证书配置
    ssl_certificate /etc/letsencrypt/live/example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    
    # 前端静态文件
    location / {
        root /var/www/power-inspection;
        try_files $uri $uri/ /index.html;
        expires 1d;
        add_header Cache-Control "public, immutable";
    }
    
    # 后端 API 代理
    location /api/ {
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # 健康检查
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}
```

启用配置：

```bash
sudo ln -s /etc/nginx/sites-available/power-inspection /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 4. 部署前端文件

```bash
# 复制构建产物到 Nginx 目录
sudo cp -r frontend/dist/* /var/www/power-inspection/

# 设置权限
sudo chown -R www-data:www-data /var/www/power-inspection
sudo chmod -R 755 /var/www/power-inspection
```

---

## Docker 部署 (可选)

### 1. 创建 Dockerfile

**后端 Dockerfile** (`backend/Dockerfile`):

```dockerfile
FROM openjdk:17-jdk-slim

WORKDIR /app

COPY target/power-inspection-backend-1.0.0.jar app.jar

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar", "--spring.profiles.active=prod"]
```

**前端 Dockerfile** (`frontend/Dockerfile`):

```dockerfile
FROM node:18-alpine as builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

### 2. 创建 Docker Compose 配置

`docker-compose.yml`:

```yaml
version: '3.8'

services:
  mysql:
    image: mysql:8.0
    container_name: power-inspection-db
    environment:
      MYSQL_ROOT_PASSWORD: root_password
      MYSQL_DATABASE: power_inspection
      MYSQL_USER: app_user
      MYSQL_PASSWORD: app_password
    ports:
      - "3306:3306"
    volumes:
      - mysql_data:/var/lib/mysql
      - ./database/schema.sql:/docker-entrypoint-initdb.d/01-schema.sql
      - ./database/seeds/test_data.sql:/docker-entrypoint-initdb.d/02-test_data.sql
    networks:
      - power-inspection-net

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: power-inspection-backend
    environment:
      SPRING_DATASOURCE_URL: jdbc:mysql://mysql:3306/power_inspection
      SPRING_DATASOURCE_USERNAME: app_user
      SPRING_DATASOURCE_PASSWORD: app_password
    ports:
      - "8080:8080"
    depends_on:
      - mysql
    networks:
      - power-inspection-net

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: power-inspection-frontend
    ports:
      - "80:80"
    depends_on:
      - backend
    networks:
      - power-inspection-net

volumes:
  mysql_data:

networks:
  power-inspection-net:
    driver: bridge
```

### 3. 启动 Docker 容器

```bash
# 构建镜像
docker-compose build

# 启动服务
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down
```

---

## 监控和日志

### 1. 日志配置

后端日志位置：`/var/log/power-inspection/app.log`

查看日志：

```bash
# 实时查看
tail -f /var/log/power-inspection/app.log

# 查看最后 100 行
tail -100 /var/log/power-inspection/app.log

# 搜索错误
grep ERROR /var/log/power-inspection/app.log
```

### 2. 性能监控

使用 Spring Boot Actuator：

```bash
# 健康检查
curl http://localhost:8080/actuator/health

# 应用信息
curl http://localhost:8080/actuator/info

# 指标
curl http://localhost:8080/actuator/metrics
```

### 3. 数据库监控

```bash
# 连接数
mysql -u root -p -e "SHOW PROCESSLIST;"

# 表大小
mysql -u root -p -e "SELECT table_name, ROUND(((data_length + index_length) / 1024 / 1024), 2) AS size_mb FROM information_schema.tables WHERE table_schema = 'power_inspection';"
```

---

## 备份和恢复

### 1. 自动备份脚本

创建 `/opt/backup/backup.sh`：

```bash
#!/bin/bash

BACKUP_DIR="/opt/backup"
DB_USER="app_user"
DB_PASSWORD="app_password"
DB_NAME="power_inspection"
DATE=$(date +%Y%m%d_%H%M%S)

# 数据库备份
mysqldump -u $DB_USER -p$DB_PASSWORD $DB_NAME > $BACKUP_DIR/db_$DATE.sql

# 压缩
gzip $BACKUP_DIR/db_$DATE.sql

# 删除 7 天前的备份
find $BACKUP_DIR -name "db_*.sql.gz" -mtime +7 -delete

echo "Backup completed: $BACKUP_DIR/db_$DATE.sql.gz"
```

### 2. 定时备份

添加到 crontab：

```bash
# 每天凌晨 2 点执行备份
0 2 * * * /opt/backup/backup.sh >> /var/log/backup.log 2>&1
```

---

## 故障排查

### 问题 1: 后端无法连接数据库

```bash
# 检查 MySQL 服务
sudo systemctl status mysql

# 测试连接
mysql -h db.example.com -u app_user -p

# 查看后端日志
sudo journalctl -u power-inspection -n 50
```

### 问题 2: 前端无法连接后端

```bash
# 检查 Nginx 配置
sudo nginx -t

# 测试后端连接
curl http://localhost:8080/api/drones

# 查看 Nginx 日志
sudo tail -f /var/log/nginx/error.log
```

### 问题 3: 性能下降

```bash
# 检查磁盘空间
df -h

# 检查内存使用
free -h

# 检查数据库连接数
mysql -u root -p -e "SHOW PROCESSLIST;"

# 优化数据库
mysql -u root -p -e "OPTIMIZE TABLE power_inspection.defects;"
```

---

## 安全建议

1. **使用 HTTPS**: 配置 SSL/TLS 证书
2. **防火墙**: 限制端口访问
3. **数据库密码**: 使用强密码
4. **定期更新**: 更新依赖和系统补丁
5. **备份**: 定期备份数据库
6. **日志监控**: 监控异常日志

---

**最后更新**: 2026-03-15
