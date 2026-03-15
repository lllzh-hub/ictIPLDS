package com.powerinspection.controller;

import com.powerinspection.entity.MaintenanceTask;
import com.powerinspection.service.MaintenanceTaskService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/maintenance-tasks")
@CrossOrigin(origins = "*")
public class MaintenanceTaskController {

    private static final Logger logger = LoggerFactory.getLogger(MaintenanceTaskController.class);

    @Autowired
    private MaintenanceTaskService taskService;

    @GetMapping
    public ResponseEntity<List<MaintenanceTask>> getAllTasks() {
        logger.info("获取所有维护任务列表");
        List<MaintenanceTask> tasks = taskService.getAllTasks();
        return ResponseEntity.ok(tasks);
    }

    @GetMapping("/{id}")
    public ResponseEntity<MaintenanceTask> getTaskById(@PathVariable Long id) {
        logger.info("获取维护任务详情，ID: {}", id);
        return taskService.getTaskById(id)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/task-id/{taskId}")
    public ResponseEntity<MaintenanceTask> getTaskByTaskId(@PathVariable String taskId) {
        logger.info("根据任务编号获取详情: {}", taskId);
        return taskService.getTaskByTaskId(taskId)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/status/{status}")
    public ResponseEntity<List<MaintenanceTask>> getTasksByStatus(@PathVariable MaintenanceTask.TaskStatus status) {
        logger.info("根据状态获取维护任务列表: {}", status);
        List<MaintenanceTask> tasks = taskService.getTasksByStatus(status);
        return ResponseEntity.ok(tasks);
    }

    @GetMapping("/priority/{priority}")
    public ResponseEntity<List<MaintenanceTask>> getTasksByPriority(@PathVariable MaintenanceTask.TaskPriority priority) {
        logger.info("根据优先级获取维护任务列表: {}", priority);
        List<MaintenanceTask> tasks = taskService.getTasksByPriority(priority);
        return ResponseEntity.ok(tasks);
    }

    @PostMapping
    public ResponseEntity<MaintenanceTask> createTask(@RequestBody MaintenanceTask task) {
        logger.info("创建新维护任务: {}", task.getTaskId());
        MaintenanceTask createdTask = taskService.createTask(task);
        return ResponseEntity.ok(createdTask);
    }

    @PutMapping("/{id}")
    public ResponseEntity<MaintenanceTask> updateTask(@PathVariable Long id, @RequestBody MaintenanceTask task) {
        logger.info("更新维护任务信息，ID: {}", id);
        try {
            MaintenanceTask updatedTask = taskService.updateTask(id, task);
            return ResponseEntity.ok(updatedTask);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTask(@PathVariable Long id) {
        logger.info("删除维护任务，ID: {}", id);
        taskService.deleteTask(id);
        return ResponseEntity.noContent().build();
    }
}





