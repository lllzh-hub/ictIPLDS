无人机数据处理指南

## 一、无人机数据处理方法

### 1. 无人机-01 和 无人机-02 的处理

无人机-01 (UAV-01):
- 状态: IN_FLIGHT (飞行中)
- 电池: 85%
- 位置: 22.54°N, 114.05°E
- 任务: Zone-A 巡检任务
- 处理方法: 
  ✓ 实时监控电池状态，当电池低于 20% 时发出警告
  ✓ 记录飞行轨迹和采集的图像数据
  ✓ 任务完成后自动返回充电站

无人机-02 (UAV-02):
- 状态: AVAILABLE (可用)
- 电池: 92%
- 位置: 22.58°N, 114.01°E
- 任务: 无
- 处理方法:
  ✓ 待命状态，随时可以接收新任务
  ✓ 定期进行系统检查和校准
  ✓ 电池保持在 80-95% 的最优范围

### 2. 其他无人机数据处理

无人机-03 至 无人机-12 的统一处理方案:

| 无人机 | 状态 | 电池 | 处理方法 |
|--------|------|------|---------|
| UAV-03 | AVAILABLE | 78% | 待命，可接收任务 |
| UAV-04 | MAINTENANCE | 0% | 维护中，暂不可用 |
| UAV-05 | IN_FLIGHT | 65% | 飞行中，监控电池 |
| UAV-06 | OFFLINE | 0% | 离线状态，需检查通信 |
| UAV-07 | IN_FLIGHT | 72% | 飞行中，执行缺陷复查 |
| UAV-08 | AVAILABLE | 88% | 待命，可接收任务 |
| UAV-09 | AVAILABLE | 81% | 待命，可接收任务 |
| UAV-10 | AVAILABLE | 95% | 待命，电池充满 |
| UAV-11 | MAINTENANCE | 15% | 维护中，充电中 |
| UAV-12 | IN_FLIGHT | 58% | 飞行中，紧急巡检 |

## 二、数据库初始化步骤

### 步骤 1: 执行初始化脚本

在 MySQL 中执行以下命令:

```sql
-- 连接到数据库
USE power_inspection;

-- 执行初始化脚本
SOURCE /path/to/init-all-data.sql;
```

### 步骤 2: 验证数据插入

执行验证查询:

```sql
-- 查看无人机数据
SELECT drone_id, name, status, battery_level FROM drones ORDER BY drone_id;

-- 查看维护团队
SELECT team_id, name, leader, status FROM maintenance_team;

-- 查看维护任务
SELECT task_id, title, priority, status FROM maintenance_tasks;

-- 查看缺陷记录
SELECT type, location, severity, status FROM defects;
```

## 三、前端数据展示处理

### 1. 无人机管理页面 (UAVManagement.tsx)

前端从后端获取无人机数据的流程:

```
1. 页面加载 → 调用 GET /api/drones
2. 后端返回所有无人机列表
3. 前端转换数据格式:
   - droneId → id
   - name → name
   - status → 映射到前端状态 (working/standby/online/maintenance/offline)
   - batteryLevel → battery
   - latitude/longitude → location
4. 显示在无人机列表中
```

### 2. 数据映射关系

后端状态 → 前端状态:
- IN_FLIGHT → working (作业中)
- AVAILABLE → standby (待机)
- CHARGING → standby (待机)
- MAINTENANCE → maintenance (维护中)
- OFFLINE → offline (离线)

### 3. 实时更新机制

```javascript
// 每 5 秒更新一次无人机数据
useEffect(() => {
  const interval = setInterval(() => {
    // 更新电池电量 (模拟消耗)
    // 更新位置信息
    // 更新任务状态
  }, 5000);
  
  return () => clearInterval(interval);
}, []);
```

## 四、中文乱码解决方案

### 问题原因
MySQL JDBC 驱动不支持 `utf8mb4` 编码名称

### 解决方案
已在 application.properties 中修改:
```properties
# 修改前
characterEncoding=utf8mb4

# 修改后
characterEncoding=utf8
```

### 验证方法
1. 重启后端服务
2. 查看无人机名称是否正常显示
3. 检查数据库中的中文数据是否正确

## 五、数据一致性检查

### 检查清单

□ 无人机表 (drones) 有 12 条记录
□ 维护团队表 (maintenance_team) 有 4 条记录
□ 维护任务表 (maintenance_tasks) 有 4 条记录
□ 缺陷表 (defects) 有 8 条记录
□ 所有中文字段显示正常，无乱码
□ 前端能正常获取并显示无人机列表
□ 无人机状态和电池信息实时更新

## 六、常见问题排查

### 问题 1: 前端显示 "暂无无人机数据"
解决方案:
1. 检查后端服务是否正常运行
2. 检查数据库连接是否成功
3. 执行 SELECT COUNT(*) FROM drones; 验证数据是否存在
4. 查看浏览器控制台是否有错误信息

### 问题 2: 无人机名称显示乱码
解决方案:
1. 确认已修改 application.properties 中的字符编码
2. 重启后端服务
3. 清空浏览器缓存
4. 检查数据库字符集设置

### 问题 3: 无人机数据不更新
解决方案:
1. 检查前端定时器是否正常工作
2. 查看网络请求是否成功
3. 检查后端是否有错误日志
4. 验证数据库连接是否稳定

## 七、后续优化建议

1. 添加无人机实时位置追踪
2. 实现无人机任务自动分配
3. 添加无人机故障预警机制
4. 实现无人机数据的历史记录查询
5. 添加无人机性能分析报表
