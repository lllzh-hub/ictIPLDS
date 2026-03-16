package com.powerinspection.repository;

import com.powerinspection.entity.CameraConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface CameraConfigRepository extends JpaRepository<CameraConfig, Long> {
    Optional<CameraConfig> findByUavId(String uavId);
}
