# 数据与后端连接指南

按下面顺序操作即可让前端、后端、数据库连通。

---

## 第一步：准备 MySQL 数据库

### 不用 Navicat：用命令行导入（推荐）

未安装 Navicat 也没关系，用 **MySQL 自带命令行** 即可完成建库和导入。

**若你已安装过 MySQL**：可直接从下面第 2 步「打开命令行并进入项目根目录」开始，确认 MySQL 服务已启动即可。

**忘记 MySQL 装在哪了？** 用下面任一方式找到路径后，用「完整路径\bin\mysql.exe」执行命令即可（见本段末尾说明）。

- **方法一：用命令行查**  
  打开 **cmd** 或 **PowerShell**，输入：
  ```bash
  where mysql
  ```
  若显示路径（如 `C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe`），那就是安装目录下的 `bin` 文件夹；MySQL 根目录就是去掉 `\bin\mysql.exe` 的那一段。

- **方法二：看 Windows 服务**  
  按 `Win + R`，输入 `services.msc` 回车 → 在列表里找到 **MySQL** 或 **MySQL80**（名字可能带版本号）→ 双击 → 在「常规」里看「可执行文件的路径」。路径类似 `"C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqld.exe" ...`，则 MySQL 根目录就是 `C:\Program Files\MySQL\MySQL Server 8.0`，命令行工具在 `C:\Program Files\MySQL\MySQL Server 8.0\bin`。

- **方法三：常见位置**  
  在资源管理器里看这些文件夹是否存在：  
  - `C:\Program Files\MySQL\MySQL Server 8.0` 或 `MySQL Server 5.7`  
  - `C:\Program Files (x86)\MySQL`  
  - 若用 XAMPP：`C:\xampp\mysql`  
  - 若用 MobaXterm 自带 MySQL：在 MobaXterm 安装目录下找 `mysql` 或相关子目录  

找到后，第 3、4 步不用写 `mysql`，改用**完整路径**，例如（请改成你机器上的路径）：
```bash
"C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root -p -P 3306
```
导入时同理：
```bash
"C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root -p -P 3306 power_inspection < power_inspection.sql
```

---

1. **确认 MySQL 已安装并启动**  
   - 若未安装：安装 [MySQL 8.x](https://dev.mysql.com/downloads/mysql/) 或使用 XAMPP / MobaXterm 等自带的 MySQL。  
   - Windows：在「服务」里确认 MySQL 服务已启动，或命令行执行 `net start mysql`（服务名可能是 `MySQL80` 等，以本机为准）。

2. **打开命令行并进入项目根目录**  
   - 在资源管理器中打开项目根目录 **IPLDS**（即和 `power_inspection.sql` 同一层）。  
   - 在地址栏输入 `cmd` 回车，或在该目录下 Shift+右键 →「在此处打开 PowerShell 窗口」。

3. **登录 MySQL 并建库**  
   - 执行（把 `root` 和 `3306` 改成你的用户名和端口，默认一般是 `root` 和 `3306`）：
   ```bash
   mysql -u root -p -P 3306
   ```
   - 输入密码后进入 MySQL，执行：
   ```sql
   CREATE DATABASE IF NOT EXISTS power_inspection CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   exit
   ```

4. **导入 SQL 文件**  
   - 仍在 **IPLDS** 目录下（有 `power_inspection.sql` 的目录），执行（同样把 `root`、`3306` 改成你的）：
   ```bash
   mysql -u root -p -P 3306 power_inspection < power_inspection.sql
   ```
   - 输入密码后回车，无报错即导入成功。

5. **后端配置与 MySQL 一致**  
   - 编辑 **`front/backend/src/main/resources/application.properties`**。  
   - 把 `spring.datasource.url` 里的端口、以及 `username`、`password` 改成和你登录 MySQL 时用的**一致**（例如 `root`、`3306`、你的密码）。

---

### 若使用 Navicat（可选）

若之后重新安装 Navicat，可按下面步骤操作：

1. **连接 MySQL**
   - 打开 Navicat，点击「连接」→ 选择「MySQL」。
   - 填写：连接名（随意）、主机 `localhost`、端口（一般是 `3306`）、用户名（如 `root`）、密码。
   - 点击「测试连接」，成功后再「确定」保存。

2. **建库（若还没有）**
   - 在左侧该连接上右键 →「新建数据库」。
   - 数据库名：`power_inspection`。
   - 字符集：`utf8mb4`，排序规则：`utf8mb4_unicode_ci`。
   - 确定。

3. **导入项目数据**
   - 在左侧双击打开 `power_inspection` 数据库（或选中后点「打开」）。
   - 菜单栏选「查询」→「新建查询」；或直接按 `Ctrl+Q` 打开查询窗口。
   - 在查询窗口里点「打开」或「打开 SQL 文件」，选择项目根目录下的 **`power_inspection.sql`**（路径示例：`D:\Users\ganji\Documents\GitHub\IPLDS\power_inspection.sql`）。
   - 确认当前数据库是 `power_inspection`（窗口上方或左侧可选），然后点击「运行」执行整份 SQL。
   - 执行成功后，左侧刷新表列表，应能看到 `ai_chat_history`、`defect`、`drone`、`maintenance_task` 等表及数据。

4. **后端配置与 Navicat 一致**
   - 后端用到的**主机、端口、用户名、密码**要和你在 Navicat 里填的完全一致。
   - 编辑 **`front/backend/src/main/resources/application.properties`**，把 `spring.datasource.url` 里的端口、以及 `username`、`password` 改成和 Navicat 连接一致（例如 Navicat 用 3306 和 root/123456，这里就写 3306 和 root/123456）。

---

## 第二步：配置后端连接数据库

### 1. 修改数据库连接信息

编辑：

**`front/backend/src/main/resources/application.properties`**

按你的本机环境修改这几项：

```properties
# 端口：本机 MySQL 一般是 3306；若用 SSH 隧道等则改为对应本地端口（如 3307）
spring.datasource.url=jdbc:mysql://localhost:3306/power_inspection?useSSL=false&serverTimezone=Asia/Shanghai&characterEncoding=utf8&allowPublicKeyRetrieval=true
spring.datasource.username=root
spring.datasource.password=你的MySQL密码
```

- 若数据库不在本机，把 `localhost` 改成实际 IP 或主机名。
- 若需 AI 分析功能，再填写华为云 ModelArts 的 `huaweicloud.api.key`、`huaweicloud.endpoint`、`huaweicloud.service.id`（不填则 AI 接口可能报错，其余接口仍可用）。

### 2. 启动后端

在项目目录下执行：

```bash
cd front/backend
mvn clean spring-boot:run
```

看到类似 `Started PowerInspectionApplication` 且无报错，说明已连上数据库并在 **8081** 端口提供 API。

### 3. 验证后端与数据是否连通

- 浏览器或 Postman 访问：  
  `http://localhost:8081/api/defects`  
  应返回 JSON（缺陷列表，可能为空数组）。
- 若返回 404，确认路径为 `/api/defects`（带前缀 `/api`）。

---

## 第三步：让前端连上后端

前端已配置为请求 `http://localhost:8081/api`，只要后端在本机 **8081** 端口运行即可。

### 1. 启动前端

新开一个终端：

```bash
cd front/grid-eye
npm install
npm run dev
```

### 2. 在浏览器中验证

- 打开终端里提示的地址（一般为 `http://localhost:5173`）。
- 进入「缺陷管理」等页面，若能看到从接口拉取的数据（或空列表），说明前后端已连通。

### 3. 若前端部署在不同机器或端口

- 后端需允许跨域：在 Spring Boot 中增加 CORS 配置（允许前端域名和端口）。
- 前端需改 API 基地址：修改 `front/grid-eye/src/api/defectApi.ts` 中的 `API_BASE_URL`，改为实际后端地址，例如：

  ```ts
  const API_BASE_URL = 'http://你的后端IP:8081/api';
  ```

---

## 连接关系小结

```
┌─────────────────┐     HTTP (8081)      ┌─────────────────┐     JDBC (3306)      ┌─────────────────┐
│  前端 grid-eye  │  ◄─────────────────►  │  后端 Spring    │  ◄─────────────────►  │  MySQL          │
│  localhost:5173 │   /api/defects 等    │  Boot :8081     │   power_inspection   │  power_inspection│
└─────────────────┘                      └─────────────────┘                      └─────────────────┘
```

- **数据与后端连接**：在 `application.properties` 里配置正确的 `url`、`username`、`password`，并先执行 `power_inspection.sql` 建表并导入数据。
- **前端与后端连接**：后端 **8081** 端口正常运行，前端已指向 `http://localhost:8081/api`。

---

## 常见问题

| 现象 | 处理 |
|------|------|
| 后端启动报 “Access denied for user” | 检查 `application.properties` 中用户名、密码、库名是否与 MySQL 一致。 |
| 后端报 “Unknown database 'power_inspection'” | 先在 MySQL 中执行 `CREATE DATABASE power_inspection;`，再执行 `power_inspection.sql`。 |
| 前端请求 404 或 CORS 错误 | 确认请求地址为 `http://localhost:8081/api/...`，且后端已启动；若跨域，需在后端配置 CORS。 |
| 前端一直加载或网络错误 | 检查后端是否在 8081 端口启动；若改了端口，需同步改前端 `API_BASE_URL`。 |

按上述步骤做完后，数据与后端的连接就完成了；前端通过 `/api` 访问后端，后端通过 JDBC 访问 MySQL。
