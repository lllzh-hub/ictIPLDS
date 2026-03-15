package com.powerinspection.service;

import com.powerinspection.entity.Drone;
import java.util.List;
import java.util.Optional;

public interface DroneService {
    List<Drone> getAllDrones();
    Optional<Drone> getDroneById(Long id);
    Optional<Drone> getDroneByDroneId(String droneId);
    Drone createDrone(Drone drone);
    Drone updateDrone(Long id, Drone drone);
    void deleteDrone(Long id);
    List<Drone> getDronesByStatus(Drone.DroneStatus status);
}





