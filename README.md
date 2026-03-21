# 🏆 ICT 创新赛题 1 - ictIPLDS 复现与部署说明

## 📖 项目说明

本项目为一个完整的前后端业务系统 + 缺陷检测算法模块的组合工程，旨在实现电力巡检场景下的智能化缺陷识别与管理。

### 技术栈构成

- **前端页面**：`frontend/`（Vite + React + TypeScript）
- **后端服务**：`backend/`（Java 17 + Spring Boot + Maven）
- **数据持久化**：`database/power_inspection.sql`（MySQL）
- **核心算法**：`rtdetrv2_mindspore/`（基于 MindSpore 框架的 RT-DETRv2 目标检测模型）

💡 **架构备注**：本仓库中，前后端构成业务系统底座，核心的缺陷识别能力由单独的 MindSpore 算法模块提供。

---

## 📂 核心目录与香橙派部署指南

MindSpore 与香橙派（OrangePi）相关的部署代码均位于 `rtdetrv2_mindspore/` 目录下：

- `rtdetrv2_mindspore/`：算法主目录
- `rtdetrv2_mindspore/references/deploy/`：👉 **香橙派（NPU）部署核心参考目录**
- `rtdetrv2_mindspore/tools/`：包含推理、导出及评测工具（如 `train.py`, `eval_coco.py`）
- `rtdetrv2_mindspore/configs/`：算法配置文件（如网络结构、超参数设置）

---

## 一、环境准备

### 基础开发环境 (Windows 10/11)

- **Node.js**: 18+ & **npm**: 9+
- **Java**: JDK 17
- **Maven**: 3.8+
- **Python**: 3.9+（建议 3.10）
- **数据库**: MySQL 8.x

### ModelArts 推理服务器

```
mindspore_ascend:mindspore_2.6.0rc1-cann_8.1.rc1-py_3.10-euler_2.10.11-aarch64-snt9b-20250628184338-b1da9c0
```

### 香橙派（OrangePi）

```
mindspore_2.6.0rc1   
cann_8.1.rc1             
py_3.9
```

---

## 二、快速复现步骤

建议严格按照以下顺序进行项目启动：**数据库 ➔ 后端 ➔ 前端 ➔ 算法模块**

### Step 1. 初始化数据库

在 MySQL 中创建名为 `power_inspection` 的数据库，并导入数据：

```bash
mysql -u root -p power_inspection < database/power_inspection.sql
```

### Step 2. 启动后端服务

打开终端，进入后端目录并编译运行：

```bash
cd backend
mvn clean package -DskipTests
mvn spring-boot:run
```

后端服务默认启动在：`http://localhost:8080`

### Step 3. 启动前端服务

打开新终端，进入前端目录安装依赖并启动：

```bash
cd frontend
npm install
npm run dev
```

前端页面默认启动在：`http://localhost:5173`

### Step 4. 运行 MindSpore 算法模块

进入算法目录，执行训练、评估或实时检测脚本（以电力线缺陷微调模型 V6 为例）：

```bash
cd rtdetrv2_mindspore

# 1. 模型训练
python tools/train.py -c configs/rtdetrv2/rtdetrv2_r50vd_finetune_powerline_v6.yml

# 2. 模型评估
python tools/eval_coco.py \
    -c /home/ma-user/work/rtdetrv2_mindspore/configs/rtdetrv2/rtdetrv2_r50vd_finetune_powerline_v4.yml \
    -r /home/ma-user/work/rtdetrv2_mindspore/weights/powerlinev2.ckpt \
    -a /home/ma-user/work/powerline/annotations_valid.json \
    -i /home/ma-user/work/powerline/images/valid/

# 3. 实时推理检测
python tools/realtime_detect.py \
    -c configs/rtdetrv2/rtdetrv2_r50vd_finetune_powerline_v4_rgb.yml \
    -r weights/final_rgb.ckpt \
    --config-2 configs/rtdetrv2/rtdetrv2_r50vd_finetune_powerline_v4_ir.yml \
    --resume-2 weights/final_ir.ckpt \
    --backend mindspore \
    --device npu \
    --source camera \
    --camera-id 0 \
    --camera-id-2 1 \
    --shared-dir results/rgb_ir_dual_camera/ \
    --threshold 0.4 \
    --time-window 0.5
```

---

## 三、服务器部署与在线访问

本项目已在远程服务器环境完成完整部署，并通过公网域名提供访问服务，可进行在线演示与功能验证。

### 服务器运行环境

- **操作系统**：Linux (Euler / Ubuntu Server)
- **前端**：Node.js + Vite + React
- **后端**：Java 17 + Spring Boot
- **数据库**：MySQL 8.x
- **算法模块**：MindSpore 2.6 + CANN 8.1 + NPU
- **部署方式**：前后端分离 + Nginx 反向代理 + 域名解析

### 在线访问地址

**http://powerinspect.top**

#### 说明

1. 前端页面已部署至服务器，并由 Nginx 提供静态资源服务
2. 后端 SpringBoot 服务运行在服务器端口，并通过反向代理映射到域名
3. MySQL 数据库运行在服务器本地，用于存储巡检记录与缺陷信息
4. MindSpore 算法模块运行在推理服务器 / NPU 设备上，通过接口与后端通信
5. 用户可直接通过浏览器访问域名进行系统操作与缺陷检测结果查看

### 部署结构示意

```
用户浏览器
    ↓
powerinspect.top (Nginx)
    ↓
Frontend (5173 build)
    ↓
Backend (8080 SpringBoot)
    ↓
MySQL + MindSpore 推理模块
```

---

## 四、系统联调流程

完整的端到端工作流如下：

1. **数据准备**：确保后端已成功连接 MySQL 数据库。

2. **API 对接**：前端 `frontend/` 正确配置并指向后端 `http://localhost:8080` 的 API 地址。

3. **算法接入**：将测试图片送入 `rtdetrv2_mindspore` 模块进行推理，输出缺陷检测结果（带边界框的图片或 JSON 结构化坐标数据）。

4. **结果回传**：后端接收算法模块的输出数据，并落库保存。

5. **前端展示**：用户在 Web 页面查看巡检记录与缺陷可视化结果。

---

## 📄 许可证

MIT License

---

**最后更新**：2026-03-21  
**版本**：v1.0（完整部署版）
