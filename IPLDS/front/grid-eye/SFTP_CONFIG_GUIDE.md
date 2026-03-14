# SSH/SFTP 直接连接远程服务器配置指南

## 🎯 功能说明

通过 SSH/SFTP 协议直接连接到远程服务器，实时读取检测数据，无需下载到本地。

## ⚙️ 配置步骤

### 1. 获取服务器连接信息

你需要知道以下信息：
- **服务器 IP 地址**：例如 `192.168.1.100` 或域名
- **SSH 端口**：通常是 `22`
- **用户名**：`ma-user`
- **密码**：你的 SSH 登录密码

### 2. 修改 application.properties

编辑 `d:\Desktop\IPLDS\front\backend\src\main\resources\application.properties`：

```properties
# 启用 SFTP 模式
sftp.enabled=true

# 服务器地址（替换为你的实际 IP）
sftp.host=192.168.1.100

# SSH 端口
sftp.port=22

# 用户名
sftp.username=ma-user

# 密码（替换为你的实际密码）
sftp.password=your_password_here

# 远程文件夹路径
sftp.remote.path=/home/ma-user/work/mindyolo-master/captured_subprocess
```

### 3. 查看 MobaXterm 中的连接信息

在 MobaXterm 中：
1. 点击顶部的 "Session" 按钮
2. 查看你当前连接的会话信息
3. 记录下：
   - Remote host（服务器地址）
   - Port（端口）
   - Username（用户名）

### 4. 重新编译后端

```bash
cd d:\Desktop\IPLDS\front\backend
mvn clean package -DskipTests
```

### 5. 启动后端

```bash
java -jar target/power-inspection-backend-1.0.0.jar
```

### 6. 测试连接

启动后端后，访问：
```
http://localhost:8080/api/remote-import/test-connection
```

应该返回：
```json
{
  "success": true,
  "message": "SSH 连接成功"
}
```

### 7. 使用前端导入

1. 打开 http://localhost:5173
2. 进入缺陷管理页面
3. 点击"从远程导入"
4. 系统会直接从远程服务器读取数据

## 🔒 安全建议

### 生产环境配置

**不要在配置文件中明文存储密码！** 使用以下方法之一：

#### 方法 1：使用环境变量

```bash
# Windows
set SFTP_PASSWORD=your_password
java -jar target/power-inspection-backend-1.0.0.jar

# Linux/Mac
export SFTP_PASSWORD=your_password
java -jar target/power-inspection-backend-1.0.0.jar
```

配置文件改为：
```properties
sftp.password=${SFTP_PASSWORD}
```

#### 方法 2：使用 SSH 密钥认证（推荐）

1. 生成 SSH 密钥对
2. 将公钥添加到服务器
3. 修改代码使用密钥文件而不是密码

## 📊 工作流程

```
前端点击"从远程导入"
    ↓
后端建立 SSH 连接
    ↓
通过 SFTP 列出远程文件夹
    ↓
读取 meta.json
    ↓
读取 ir.jpg（红外热力图）
    ↓
读取 rgb.jpg（检测框图）
    ↓
转换为 Base64
    ↓
保存到数据库
    ↓
返回导入结果
```

## 🎨 优势

✅ **实时性**：直接从服务器读取最新数据  
✅ **完整性**：体现系统的完整架构  
✅ **节省空间**：无需下载到本地  
✅ **自动化**：可以定时自动导入  
✅ **安全性**：支持 SSH 加密传输  

## 🔧 故障排查

### 问题 1：连接超时

**原因**：
- 服务器 IP 错误
- 防火墙阻止
- 网络不通

**解决**：
1. ping 服务器 IP
2. 检查防火墙设置
3. 确认 SSH 服务运行中

### 问题 2：认证失败

**原因**：
- 用户名或密码错误
- SSH 密钥不匹配

**解决**：
1. 在 MobaXterm 中测试登录
2. 确认用户名密码正确
3. 检查服务器 SSH 配置

### 问题 3：找不到文件夹

**原因**：
- 远程路径配置错误
- 权限不足

**解决**：
1. 在 MobaXterm 中确认路径
2. 检查用户是否有读取权限
3. 使用绝对路径

## 📝 配置示例

### 示例 1：使用 IP 地址

```properties
sftp.enabled=true
sftp.host=192.168.1.100
sftp.port=22
sftp.username=ma-user
sftp.password=MyPassword123
sftp.remote.path=/home/ma-user/work/mindyolo-master/captured_subprocess
```

### 示例 2：使用域名

```properties
sftp.enabled=true
sftp.host=server.example.com
sftp.port=22
sftp.username=ma-user
sftp.password=MyPassword123
sftp.remote.path=/home/ma-user/work/mindyolo-master/captured_subprocess
```

### 示例 3：使用非标准端口

```properties
sftp.enabled=true
sftp.host=192.168.1.100
sftp.port=2222
sftp.username=ma-user
sftp.password=MyPassword123
sftp.remote.path=/home/ma-user/work/mindyolo-master/captured_subprocess
```

## 🚀 下一步

1. 填写你的服务器连接信息
2. 重新编译后端
3. 测试连接
4. 开始导入数据！

---

**提示**：如果你不确定服务器信息，可以在 MobaXterm 的会话设置中查看。






