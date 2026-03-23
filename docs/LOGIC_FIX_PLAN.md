# 系统逻辑修复计划

> 文档日期：2026-03-23  
> 涉及文件：`RemoteImportServiceImpl.java`、`realtime_detect.py`、`AutoImportServiceImpl.java`

---

## 一、问题清单与优先级

| # | 优先级 | 问题描述 | 影响范围 |
|---|--------|----------|----------|
| P1 | **高** | `RemoteImportServiceImpl` 自动导入时未插入 `[HIGH_CONFIDENCE]` 标记，置信度路由失效 | AI 分析逻辑错误 |
| P2 | **高** | 置信度只取第一个检测结果，应取所有结果中的最大值 | AI prompt 选择错误 |
| P3 | **高** | `hasDefect` 二次过滤阈值为 `0.3`，与约定低阈值一致，但判断逻辑冗余且语义不清 | 误判判定逻辑混乱 |
| P4 | **高** | 双缓冲模式（`--dual-buffer`）输出文件不符合后端扫描格式，后端无法识别 | 双缓冲模式完全失效 |
| P5 | **中** | `RemoteImportServiceImpl` 的 `isFalsePositive` 判断在 `analysis` 清理前做，逻辑正确但与 `AIController` 不对称 | 代码一致性 |
| P6 | **低** | `AutoImportServiceImpl` 时间线文件路径硬依赖 `localImportFolder`，若该目录不存在会 NPE | 鲁棒性 |

---

## 二、阈值约定（全局统一）

| 名称 | 值 | 含义 |
|------|----|------|
| 低阈值（Python 检测过滤） | `0.3` | Python 侧 `--threshold 0.3`，低于此分数的检测框直接丢弃 |
| 高阈值（AI prompt 路由） | `0.85` | 置信度 ≥ 85%：使用高置信度 prompt，跳过误判判断 |

> Python 输出的 JSON 中，所有 `score` 已经是过滤后的值（≥0.3）。  
> 后端不需要再做低阈值过滤，只需用最大 score 与 0.85 比较来选择 prompt。

---

## 三、修复详情

### P1 + P2 + P3：`RemoteImportServiceImpl` 置信度判断与 prompt 路由

**当前错误逻辑：**
```java
// 只取第一个检测结果的 score
Object score = firstDetection.get("score");
confidence = ((Number) score).doubleValue();

// taskInfo 里无论置信度多高都不插入 [HIGH_CONFIDENCE]
StringBuilder sb = new StringBuilder();
sb.append("检测模型识别结果：\n");
...
sb.append("\n请结合上方图片，独立判断是否存在真实缺陷，并给出完整分析。");

// hasDefect 二次过滤用 0.3（逻辑冗余）
detections.stream().anyMatch(d -> {
    ...score >= 0.3  // Python 已过滤，这里判断永远为 true
});
```

**修复后逻辑：**
```java
// 1. 取所有检测结果中的最大置信度
double maxScore = 0.0;
String primaryType = "检测缺陷_" + folderName;
if (detections != null && !detections.isEmpty()) {
    for (Map<String, Object> det : detections) {
        Object sc = det.get("score");
        if (sc instanceof Number && ((Number) sc).doubleValue() > maxScore) {
            maxScore = ((Number) sc).doubleValue();
            Object cn = det.get("class_name");
            if (cn != null) primaryType = cn.toString();
        }
    }
}
defect.setConfidence(maxScore);
defect.setType(primaryType);

// 2. hasDefect：信任 Python 已过滤结果，直接判断 is_defect 字段
boolean hasDefect = detections != null && !detections.isEmpty() &&
    detections.stream().anyMatch(d -> Boolean.TRUE.equals(d.get("is_defect")));

// 3. 根据置信度决定 prompt 路由
boolean highConfidence = maxScore >= 0.85;
StringBuilder sb = new StringBuilder();
if (highConfidence) {
    sb.append("[HIGH_CONFIDENCE]\n");
    log.info("置信度 {:.1f}% >= 85%，使用高置信度 prompt", maxScore * 100);
} else {
    log.info("置信度 {:.1f}% < 85%，使用低置信度 prompt（含误判判断）", maxScore * 100);
}
sb.append("检测模型识别结果：\n");
// ... 其余字段不变 ...
if (highConfidence) {
    sb.append("\n请结合上方图片，对该缺陷给出完整的专业分析。");
} else {
    sb.append("\n请结合上方图片，独立判断是否存在真实缺陷，并给出完整分析。");
}
```

**修改文件：** `RemoteImportServiceImpl.java`  
**修改方法：** `importFromFolder()` 内的 detections 解析段 + taskInfo 构建段

---

### P4：Python 双缓冲模式输出结构与后端不兼容

**当前双缓冲模式输出结构：**
```
results/dual_detection/defect_frames/
  infer000001_s1f5_s2f5/
    stream1_raw.jpg      ← 后端找不到（应为 stream1_frame_N.jpg）
    stream1_vis.jpg
    stream2_raw.jpg
    stream2_vis.jpg
    meta.json            ← 后端找不到（应为 stream1_detections.json）
```

**后端期望结构（多进程模式已符合）：**
```
results/dual_detection/
  timestamp_0_200/
    stream1_frame_5.jpg
    stream1_detections.json
    stream2_frame_5.jpg
    stream2_detections.json
```

**修复方案（修改 Python `run_detection_dualbuffer` 函数）：**

将双缓冲模式的保存逻辑改为与多进程模式完全一致的格式：

```python
# 修改 run_detection_dualbuffer 中保存缺陷帧的代码段
if has_defect:
    defect_count += 1
    
    # 使用 stream1 的时间戳作为目录名（与多进程模式一致）
    timestamp_str = f'{ts1:.3f}'.replace('.', '_')
    event_dir = os.path.join(out_dir, f'timestamp_{timestamp_str}')
    os.makedirs(event_dir, exist_ok=True)
    
    # stream1：原始帧（使用 stream1_frame_N.jpg 命名）
    frame1_path = os.path.join(event_dir, f'stream1_frame_{idx1}.jpg')
    cv2.imwrite(frame1_path, frame1)
    
    # stream1：检测结果 JSON
    detection_data1 = {
        'stream_id': 1,
        'frame': idx1,
        'video_time': round(ts1, 4),
        'detection_timestamp': datetime.datetime.now().isoformat(),
        'detections': dets1,
    }
    json_path1 = os.path.join(event_dir, 'stream1_detections.json')
    with open(json_path1, 'w', encoding='utf-8') as f:
        json.dump(detection_data1, f, ensure_ascii=False, indent=2)
    
    # stream2：原始帧
    frame2_path = os.path.join(event_dir, f'stream2_frame_{idx2}.jpg')
    cv2.imwrite(frame2_path, frame2)
    
    # stream2：检测结果 JSON
    detection_data2 = {
        'stream_id': 2,
        'frame': idx2,
        'video_time': round(ts2, 4),
        'detection_timestamp': datetime.datetime.now().isoformat(),
        'detections': dets2,
    }
    json_path2 = os.path.join(event_dir, 'stream2_detections.json')
    with open(json_path2, 'w', encoding='utf-8') as f:
        json.dump(detection_data2, f, ensure_ascii=False, indent=2)
    
    print(f'[推理#{infer_idx:5d}] '
          f'S1帧{idx1}({ts1:.2f}s) S2帧{idx2}({ts2:.2f}s) '
          f'缺陷[{"1" if has_defect1 else "-"}{"2" if has_defect2 else "-"}] '
          f'-> {event_dir}')
```

同时，`out_dir` 应直接指向 `dual_detection/`（不再嵌套 `defect_frames/` 子目录）：

```python
# 修改前
out_dir    = args.output_dir
frames_dir = os.path.join(out_dir, 'defect_frames')
os.makedirs(frames_dir, exist_ok=True)

# 修改后（直接使用 output_dir，不创建 defect_frames 子目录）
out_dir = args.output_dir
os.makedirs(out_dir, exist_ok=True)
```

**修改文件：** `realtime_detect.py`  
**修改函数：** `run_detection_dualbuffer()`

---

### P5：`RemoteImportServiceImpl` 的 `isFalsePositive` 判断时机

当前：在 `analysis`（已去除 VERDICT 行）之前判断，逻辑正确。  
但是判断的是 `analysis` 变量（`---SOLUTION_SPLIT---` 分割前），而 `VERDICT` 行在 analysis 部分，**逻辑正确，无需修改**。  
仅需保持与 `AIController` 一致，统一在 `isFalsePositive` 为 `false` 时也显式写入 `setIsFalsePositive(false)`：

```java
// 修改前（只在误判时设置）
if (isFalsePositive) {
    defect.setIsFalsePositive(true);
}

// 修改后（始终明确设置）
defect.setIsFalsePositive(isFalsePositive);
```

---

### P6：`AutoImportServiceImpl` 时间线文件路径鲁棒性

`@PostConstruct` 中 `timelineFile = Paths.get(localImportFolder, ".import_timeline")` 在目录不存在时 `loadTimeline()` 不会 NPE（只是返回），但 `saveTimeline()` 中 `Files.createDirectories` 已做保护，**可以接受，无需修改**。

---

## 四、完整修改后的运行流程

```
【Python 侧（realtime_detect.py）】
视频帧读取（--threshold 0.3 过滤）
  │
  ├─ 单进程模式 / 多进程模式 → timestamp_X_XXX/ 目录
  │     stream1_frame_N.jpg
  │     stream1_detections.json  { score已>=0.3 }
  │     stream2_frame_N.jpg
  │     stream2_detections.json
  │
  └─ 双缓冲模式（修复后）→ 同上格式，直接写 output_dir/timestamp_X_XXX/

【后端 AutoImportServiceImpl（每30秒扫描）】
  SFTP listFilesWithMtime(dual_detection/)
  比对时间线，发现新/更新文件夹
  │
  └─ 调用 RemoteImportServiceImpl.importFromFolder(folderName)

【RemoteImportServiceImpl.importFromFolder()】
  下载 stream1_frame_N.jpg + stream1_detections.json
  下载 stream2_frame_N.jpg + stream2_detections.json
  │
  ├─ 解析 stream1_detections.json
  │     取所有 detections 中最大 score → maxScore
  │     取 maxScore 对应的 class_name → primaryType
  │
  ├─ 判断 hasDefect
  │     detections 中存在 is_defect=true → hasDefect=true
  │     否则 → hasDefect=false
  │
  ├─ 构建 taskInfo
  │     maxScore >= 0.85 → 插入 [HIGH_CONFIDENCE] 标记
  │     maxScore < 0.85  → 不插入（启用误判判断）
  │     hasDefect=false  → 插入 [无缺陷] 前缀
  │
  ├─ 将图片编码为 Base64 存入 Defect 实体
  │
  └─ 调用 aiService.analyzeDefectWithImages(taskInfo, imagePaths)

【HuaweiCloudAIServiceImpl】
  selectSystemPrompt(taskInfo)
  ├─ 含 [HIGH_CONFIDENCE] → SYSTEM_PROMPT_HIGH_CONFIDENCE
  │     AI 直接输出 [VERDICT:DEFECT_CONFIRMED] + 完整分析
  └─ 不含标记 → SYSTEM_PROMPT_LOW_CONFIDENCE
        AI 自行判断 [VERDICT:DEFECT_CONFIRMED 或 FALSE_POSITIVE]

【RemoteImportServiceImpl（AI回调处理）】
  解析 ---SOLUTION_SPLIT---  → analysis / solution
  检测 [VERDICT:FALSE_POSITIVE] → isFalsePositive
  清除 VERDICT 标记行
  解析 ---META_JSON---  → misdetectionType / severityTimeline / suggestedDeadline
  设置 defect.setIsFalsePositive(isFalsePositive)  ← 始终显式设置
  保存 Defect 到数据库
```

---

## 五、需要修改的文件汇总

### 文件1：`RemoteImportServiceImpl.java`

**修改点1：取最大置信度**

找到：
```java
if (detections != null && !detections.isEmpty()) {
    Map<String, Object> firstDetection = detections.get(0);
    Object className = firstDetection.get("class_name");
    if (className != null) {
        type = className.toString();
    }
    Object score = firstDetection.get("score");
    if (score != null && score instanceof Number) {
        confidence = ((Number) score).doubleValue();
    }
}
```
替换为：
```java
if (detections != null && !detections.isEmpty()) {
    for (Map<String, Object> det : detections) {
        Object sc = det.get("score");
        if (sc instanceof Number && ((Number) sc).doubleValue() > confidence) {
            confidence = ((Number) sc).doubleValue();
            Object cn = det.get("class_name");
            if (cn != null) type = cn.toString();
        }
    }
}
```

**修改点2：hasDefect 判断简化**

找到：
```java
boolean hasDefect = detections != null && !detections.isEmpty() &&
    detections.stream().anyMatch(d -> {
        Object isDefect = d.get("is_defect");
        Object score = d.get("score");
        return (isDefect == null || Boolean.TRUE.equals(isDefect)) &&
               (score == null || ((Number) score).doubleValue() >= 0.3);
    });
```
替换为：
```java
boolean hasDefect = detections != null && !detections.isEmpty() &&
    detections.stream().anyMatch(d -> Boolean.TRUE.equals(d.get("is_defect")));
```

**修改点3：taskInfo 构建加入置信度路由**

找到：
```java
} else {
    StringBuilder sb = new StringBuilder();
    sb.append("检测模型识别结果：\n");
    ...
    sb.append("\n请结合上方图片，独立判断是否存在真实缺陷，并给出完整分析。");
    taskInfo = sb.toString();
}
```
替换为：
```java
} else {
    boolean highConfidence = defect.getConfidence() != null && defect.getConfidence() >= 0.85;
    StringBuilder sb = new StringBuilder();
    if (highConfidence) {
        sb.append("[HIGH_CONFIDENCE]\n");
        log.info("置信度 {}% >= 85%，使用高置信度 prompt",
                String.format("%.1f", defect.getConfidence() * 100));
    } else {
        log.info("置信度 {}% < 85%，使用低置信度 prompt（含误判判断）",
                String.format("%.1f", defect.getConfidence() * 100));
    }
    sb.append("检测模型识别结果：\n");
    sb.append("缺陷类型: ").append(defect.getType()).append("\n");
    sb.append("位置: ").append(defect.getLocation()).append("\n");
    sb.append("严重程度: ").append(defect.getSeverity()).append("\n");
    sb.append("置信度: ").append(String.format("%.1f%%", defect.getConfidence() * 100)).append("\n");
    sb.append("描述: ").append(defect.getDescription() != null ? defect.getDescription() : "无").append("\n");
    sb.append("原图检测框(stream1): ").append(objectMapper.writeValueAsString(detections)).append("\n");
    if (defect.getSolution() != null) {
        sb.append("红外图检测框(stream2): ").append(defect.getSolution()).append("\n");
    }
    if (highConfidence) {
        sb.append("\n请结合上方图片，对该缺陷给出完整的专业分析。");
    } else {
        sb.append("\n请结合上方图片，独立判断是否存在真实缺陷，并给出完整分析。");
    }
    taskInfo = sb.toString();
}
```

**修改点4：isFalsePositive 始终显式设置**

找到：
```java
if (isFalsePositive) {
    defect.setIsFalsePositive(true);
}
```
替换为：
```java
defect.setIsFalsePositive(isFalsePositive);
```

---

### 文件2：`realtime_detect.py`

**修改点1：`run_detection_dualbuffer` 中去除 `defect_frames` 子目录**

找到：
```python
out_dir    = args.output_dir
frames_dir = os.path.join(out_dir, 'defect_frames')
os.makedirs(frames_dir, exist_ok=True)
ts_str     = datetime.datetime.now().strftime('%Y%m%d_%H%M%S')
json_path  = os.path.join(out_dir, f'dualbuffer_results_{ts_str}.json')
```
替换为：
```python
out_dir   = args.output_dir
os.makedirs(out_dir, exist_ok=True)
ts_str    = datetime.datetime.now().strftime('%Y%m%d_%H%M%S')
json_path = os.path.join(out_dir, f'dualbuffer_results_{ts_str}.json')
```

**修改点2：双缓冲缺陷保存格式改为与多进程模式一致**

找到（`if has_defect:` 块内）：
```python
base_name = (f'infer{infer_idx:06d}'
             f'_s1f{idx1}_s2f{idx2}')
ev_dir = os.path.join(frames_dir, base_name)
os.makedirs(ev_dir, exist_ok=True)

# 流1：原图 + 标注图
cv2.imwrite(os.path.join(ev_dir, 'stream1_raw.jpg'), frame1)
ann1 = draw_boxes_cv2(frame1, labels1, boxes1, scores1, args.threshold)
cv2.imwrite(os.path.join(ev_dir, 'stream1_vis.jpg'), ann1)

# 流2：原图 + 标注图
cv2.imwrite(os.path.join(ev_dir, 'stream2_raw.jpg'), frame2)
ann2 = draw_boxes_cv2(frame2, labels2, boxes2, scores2, args.threshold)
cv2.imwrite(os.path.join(ev_dir, 'stream2_vis.jpg'), ann2)

# 元数据 JSON
frame_result['saved_dir'] = ev_dir
with open(os.path.join(ev_dir, 'meta.json'), 'w', encoding='utf-8') as jf:
    json.dump(frame_result, jf, ensure_ascii=False, indent=2)

print(f'[推理#{infer_idx:5d}] '
      f'S1帧{idx1}({ts1:.2f}s) S2帧{idx2}({ts2:.2f}s) '
      f'缺陷[{"1" if has_defect1 else "-"}{"2" if has_defect2 else "-"}] '
      f'fps={infer_fps:.1f} -> {base_name}')
```
替换为：
```python
# 使用 stream1 时间戳命名目录，与多进程模式保持一致
timestamp_str = f'{ts1:.3f}'.replace('.', '_')
ev_dir = os.path.join(out_dir, f'timestamp_{timestamp_str}')
os.makedirs(ev_dir, exist_ok=True)

# stream1：原始帧（命名与多进程模式一致）
cv2.imwrite(os.path.join(ev_dir, f'stream1_frame_{idx1}.jpg'), frame1)

# stream1：检测结果 JSON
detection_data1 = {
    'stream_id': 1,
    'frame': idx1,
    'video_time': round(ts1, 4),
    'detection_timestamp': datetime.datetime.now().isoformat(),
    'detections': dets1,
}
with open(os.path.join(ev_dir, 'stream1_detections.json'), 'w', encoding='utf-8') as jf:
    json.dump(detection_data1, jf, ensure_ascii=False, indent=2)

# stream2：原始帧
cv2.imwrite(os.path.join(ev_dir, f'stream2_frame_{idx2}.jpg'), frame2)

# stream2：检测结果 JSON
detection_data2 = {
    'stream_id': 2,
    'frame': idx2,
    'video_time': round(ts2, 4),
    'detection_timestamp': datetime.datetime.now().isoformat(),
    'detections': dets2,
}
with open(os.path.join(ev_dir, 'stream2_detections.json'), 'w', encoding='utf-8') as jf:
    json.dump(detection_data2, jf, ensure_ascii=False, indent=2)

print(f'[推理#{infer_idx:5d}] '
      f'S1帧{idx1}({ts1:.2f}s) S2帧{idx2}({ts2:.2f}s) '
      f'缺陷[{"1" if has_defect1 else "-"}{"2" if has_defect2 else "-"}] '
      f'-> {ev_dir}')
```

---

## 六、修改后各模式输出结构对比

| 模式 | 修改前 | 修改后 |
|------|--------|--------|
| 多进程 | `dual_detection/timestamp_0_200/{stream1_frame_5.jpg, stream1_detections.json, ...}` | 不变 ✓ |
| 双缓冲 | `dual_detection/defect_frames/infer000001_s1f5_s2f5/{stream1_raw.jpg, meta.json, ...}` | `dual_detection/timestamp_0_200/{stream1_frame_5.jpg, stream1_detections.json, ...}` ✓ |
| 单进程共享模式 | `dual_detection/timestamp_0_200/{stream1_frame_5.jpg, stream1_detections.json, ...}` | 不变 ✓ |

---

## 七、置信度路由完整决策树

```
RemoteImportServiceImpl.importFromFolder()
        │
        ├─ hasDefect = false
        │       taskInfo = "[无缺陷] ..."
        │       → selectSystemPrompt → LOW_CONFIDENCE prompt
        │       → AI 输出 [VERDICT:FALSE_POSITIVE]
        │       → isFalsePositive = true
        │
        └─ hasDefect = true
                │
                ├─ maxScore >= 0.85（高置信度）
                │       taskInfo = "[HIGH_CONFIDENCE]\n检测模型识别结果..."
                │       → selectSystemPrompt → HIGH_CONFIDENCE prompt
                │       → AI 直接输出 [VERDICT:DEFECT_CONFIRMED] + 专业分析
                │       → isFalsePositive = false（强制）
                │
                └─ maxScore < 0.85（低置信度，0.3~0.85之间）
                        taskInfo = "检测模型识别结果..."
                        → selectSystemPrompt → LOW_CONFIDENCE prompt
                        → AI 自行判断 DEFECT_CONFIRMED 或 FALSE_POSITIVE
                        → isFalsePositive 由 AI 响应决定
```

---

## 八、本次不修改的内容

| 项目 | 原因 |
|------|------|
| `AIController.java` | 逻辑已正确，置信度路由、META_JSON 解析、`suggestedDeadline` 均已完善 |
| `HuaweiCloudAIServiceImpl.java` | 两套 prompt 已正确，`selectSystemPrompt()` 逻辑正确 |
| `AutoImportServiceImpl.java` | 时间线机制正确，定时扫描逻辑正确 |
| `GlobalExceptionHandler.java` | 已修复 `ClientAbortException` 处理 |
| Python 多进程模式 | 输出格式已符合后端要求，无需修改 |
| Python 单进程共享模式 | 输出格式已符合后端要求，无需修改 |

  