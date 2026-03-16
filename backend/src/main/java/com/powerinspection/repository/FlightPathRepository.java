package com.powerinspection.repository;

import com.powerinspection.entity.FlightPath;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface FlightPathRepository extends JpaRepository<FlightPath, Long> {
    
    List<FlightPath> findByDroneId(String droneId);
    
    Optional<FlightPath> findByDroneIdAndStatus(String droneId, FlightPath.PathStatus status);
    
    List<FlightPath> findByStatus(FlightPath.PathStatus status);
}

