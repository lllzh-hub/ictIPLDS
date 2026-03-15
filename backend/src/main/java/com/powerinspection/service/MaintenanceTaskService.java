package com.powerinspection.service;

import com.powerinspection.entity.MaintenanceTask;
import java.util.List;
import java.util.Optional;

public interface MaintenanceTaskService {
    List<MaintenanceTask> getAllTasks();
    Optional<MaintenanceTask> getTaskById(Long id);
    Optional<MaintenanceTask> getTaskByTaskId(String taskId);
    MaintenanceTask createTask(MaintenanceTask task);
    MaintenanceTask updateTask(Long id, MaintenanceTask task);
    void deleteTask(Long id);
    List<MaintenanceTask> getTasksByStatus(MaintenanceTask.TaskStatus status);
    List<MaintenanceTask> getTasksByPriority(MaintenanceTask.TaskPriority priority);
}





