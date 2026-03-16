package com.powerinspection.service;

import com.powerinspection.entity.FlightPath;
import com.powerinspection.repository.FlightPathRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class FlightPathService {
    
    @Autowired
    private FlightPathRepository flightPathRepository;
    
    public List<FlightPath> getAllFlightPaths() {
        return flightPathRepository.findAll();
    }
    
    public Optional<FlightPath> getFlightPathById(Long id) {
        return flightPathRepository.findById(id);
    }
    
    public List<FlightPath> getFlightPathsByDroneId(String droneId) {
        return flightPathRepository.findByDroneId(droneId);
    }
    
    public Optional<FlightPath> getActiveFlightPath(String droneId) {
        return flightPathRepository.findByDroneIdAndStatus(droneId, FlightPath.PathStatus.ACTIVE);
    }
    
    public FlightPath createFlightPath(FlightPath flightPath) {
        return flightPathRepository.save(flightPath);
    }
    
    public FlightPath updateFlightPath(Long id, FlightPath flightPath) {
        return flightPathRepository.findById(id)
            .map(existing -> {
                existing.setName(flightPath.getName());
                existing.setDescription(flightPath.getDescription());
                existing.setPathData(flightPath.getPathData());
                existing.setSpacing(flightPath.getSpacing());
                existing.setDirection(flightPath.getDirection());
                existing.setFlightHeight(flightPath.getFlightHeight());
                existing.setStartLat(flightPath.getStartLat());
                existing.setStartLon(flightPath.getStartLon());
                existing.setEndLat(flightPath.getEndLat());
                existing.setEndLon(flightPath.getEndLon());
                existing.setWaypointCount(flightPath.getWaypointCount());
                existing.setTotalLength(flightPath.getTotalLength());
                existing.setStatus(flightPath.getStatus());
                return flightPathRepository.save(existing);
            })
            .orElseThrow(() -> new RuntimeException("FlightPath not found with id: " + id));
    }
    
    public void deleteFlightPath(Long id) {
        flightPathRepository.deleteById(id);
    }
    
    public FlightPath activateFlightPath(Long id) {
        return flightPathRepository.findById(id)
            .map(flightPath -> {
                // 先将该无人机的其他航线设为非激活状态
                List<FlightPath> activePaths = flightPathRepository.findByDroneIdAndStatus(
                    flightPath.getDroneId(), 
                    FlightPath.PathStatus.ACTIVE
                ).stream().toList();
                
                activePaths.forEach(path -> {
                    path.setStatus(FlightPath.PathStatus.DRAFT);
                    flightPathRepository.save(path);
                });
                
                // 激活当前航线
                flightPath.setStatus(FlightPath.PathStatus.ACTIVE);
                return flightPathRepository.save(flightPath);
            })
            .orElseThrow(() -> new RuntimeException("FlightPath not found with id: " + id));
    }
}

