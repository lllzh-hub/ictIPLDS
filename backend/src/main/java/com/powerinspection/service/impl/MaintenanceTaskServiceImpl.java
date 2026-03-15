package com.powerinspection.service.impl;

import com.powerinspection.entity.MaintenanceTask;
import com.powerinspection.repository.MaintenanceTaskRepository;
import com.powerinspection.service.MaintenanceTaskService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Optional;

@Service
public class MaintenanceTaskServiceImpl implements MaintenanceTaskService {

    @Autowired
    private MaintenanceTaskRepository taskRepository;

    @Override
    public List<MaintenanceTask> getAllTasks() {
        return taskRepository.findAll();
    }

    @Override
    public Optional<MaintenanceTask> getTaskById(Long id) {
        return taskRepository.findById(id);
    }

    @Override
    public Optional<MaintenanceTask> getTaskByTaskId(String taskId) {
        return taskRepository.findByTaskId(taskId);
    }

    @Override
    public MaintenanceTask createTask(MaintenanceTask task) {
        return taskRepository.save(task);
    }

    @Override
    public MaintenanceTask updateTask(Long id, MaintenanceTask task) {
        return taskRepository.findById(id)
            .map(existingTask -> {
                if (task.getTitle() != null) existingTask.setTitle(task.getTitle());
                if (task.getDescription() != null) existingTask.setDescription(task.getDescription());
                if (task.getPriority() != null) existingTask.setPriority(task.getPriority());
                if (task.getStatus() != null) existingTask.setStatus(task.getStatus());
                if (task.getLocation() != null) existingTask.setLocation(task.getLocation());
                if (task.getAssignedTo() != null) existingTask.setAssignedTo(task.getAssignedTo());
                if (task.getEquipmentId() != null) existingTask.setEquipmentId(task.getEquipmentId());
                if (task.getEquipmentType() != null) existingTask.setEquipmentType(task.getEquipmentType());
                if (task.getScheduledDate() != null) existingTask.setScheduledDate(task.getScheduledDate());
                if (task.getCompletedDate() != null) existingTask.setCompletedDate(task.getCompletedDate());
                if (task.getEstimatedDuration() != null) existingTask.setEstimatedDuration(task.getEstimatedDuration());
                return taskRepository.save(existingTask);
            })
            .orElseThrow(() -> new RuntimeException("维护任务不存在"));
    }

    @Override
    public void deleteTask(Long id) {
        taskRepository.deleteById(id);
    }

    @Override
    public List<MaintenanceTask> getTasksByStatus(MaintenanceTask.TaskStatus status) {
        return taskRepository.findByStatus(status);
    }

    @Override
    public List<MaintenanceTask> getTasksByPriority(MaintenanceTask.TaskPriority priority) {
        return taskRepository.findByPriority(priority);
    }
}





