package com.powerinspection.repository;

import com.powerinspection.entity.MaintenanceTask;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface MaintenanceTaskRepository extends JpaRepository<MaintenanceTask, Long> {
    Optional<MaintenanceTask> findByTaskId(String taskId);
    List<MaintenanceTask> findByStatus(MaintenanceTask.TaskStatus status);
    List<MaintenanceTask> findByPriority(MaintenanceTask.TaskPriority priority);
    List<MaintenanceTask> findByAssignedTo(String assignedTo);
}





