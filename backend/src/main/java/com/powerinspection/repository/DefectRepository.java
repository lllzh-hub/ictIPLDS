package com.powerinspection.repository;

import com.powerinspection.entity.Defect;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DefectRepository extends JpaRepository<Defect, Long> {
    List<Defect> findByStatus(String status);
    List<Defect> findBySeverity(String severity);
    List<Defect> findByLocation(String location);
}

