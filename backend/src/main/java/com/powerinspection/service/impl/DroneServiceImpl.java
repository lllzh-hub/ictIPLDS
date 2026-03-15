package com.powerinspection.service.impl;

import com.powerinspection.entity.Drone;
import com.powerinspection.repository.DroneRepository;
import com.powerinspection.service.DroneService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Optional;

@Service
public class DroneServiceImpl implements DroneService {

    @Autowired
    private DroneRepository droneRepository;

    @Override
    public List<Drone> getAllDrones() {
        return droneRepository.findAll();
    }

    @Override
    public Optional<Drone> getDroneById(Long id) {
        return droneRepository.findById(id);
    }

    @Override
    public Optional<Drone> getDroneByDroneId(String droneId) {
        return droneRepository.findByDroneId(droneId);
    }

    @Override
    public Drone createDrone(Drone drone) {
        return droneRepository.save(drone);
    }

    @Override
    public Drone updateDrone(Long id, Drone drone) {
        return droneRepository.findById(id)
            .map(existingDrone -> {
                if (drone.getName() != null) existingDrone.setName(drone.getName());
                if (drone.getModel() != null) existingDrone.setModel(drone.getModel());
                if (drone.getStatus() != null) existingDrone.setStatus(drone.getStatus());
                if (drone.getBatteryLevel() != null) existingDrone.setBatteryLevel(drone.getBatteryLevel());
                if (drone.getCurrentLocation() != null) existingDrone.setCurrentLocation(drone.getCurrentLocation());
                if (drone.getLatitude() != null) existingDrone.setLatitude(drone.getLatitude());
                if (drone.getLongitude() != null) existingDrone.setLongitude(drone.getLongitude());
                if (drone.getFlightHours() != null) existingDrone.setFlightHours(drone.getFlightHours());
                if (drone.getLastMaintenanceDate() != null) existingDrone.setLastMaintenanceDate(drone.getLastMaintenanceDate());
                return droneRepository.save(existingDrone);
            })
            .orElseThrow(() -> new RuntimeException("无人机不存在"));
    }

    @Override
    public void deleteDrone(Long id) {
        droneRepository.deleteById(id);
    }

    @Override
    public List<Drone> getDronesByStatus(Drone.DroneStatus status) {
        return droneRepository.findByStatus(status);
    }
}





