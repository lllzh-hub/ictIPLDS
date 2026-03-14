package com.powerinspection.repository;

import com.powerinspection.entity.Drone;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface DroneRepository extends JpaRepository<Drone, Long> {
    Optional<Drone> findByDroneId(String droneId);
    List<Drone> findByStatus(Drone.DroneStatus status);
}





