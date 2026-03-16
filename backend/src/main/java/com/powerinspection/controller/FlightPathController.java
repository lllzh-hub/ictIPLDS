package com.powerinspection.controller;

import com.powerinspection.entity.FlightPath;
import com.powerinspection.service.FlightPathService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/flight-paths")
@CrossOrigin(origins = "*")
public class FlightPathController {

    private static final Logger logger = LoggerFactory.getLogger(FlightPathController.class);

    @Autowired
    private FlightPathService flightPathService;

    @GetMapping
    public ResponseEntity<List<FlightPath>> getAllFlightPaths() {
        logger.info("获取所有航线规划");
        List<FlightPath> flightPaths = flightPathService.getAllFlightPaths();
        return ResponseEntity.ok(flightPaths);
    }

    @GetMapping("/{id}")
    public ResponseEntity<FlightPath> getFlightPathById(@PathVariable Long id) {
        logger.info("获取航线规划详情，ID: {}", id);
        return flightPathService.getFlightPathById(id)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/drone/{droneId}")
    public ResponseEntity<List<FlightPath>> getFlightPathsByDroneId(@PathVariable String droneId) {
        logger.info("获取无人机的航线规划列表: {}", droneId);
        List<FlightPath> flightPaths = flightPathService.getFlightPathsByDroneId(droneId);
        return ResponseEntity.ok(flightPaths);
    }

    @GetMapping("/drone/{droneId}/active")
    public ResponseEntity<FlightPath> getActiveFlightPath(@PathVariable String droneId) {
        logger.info("获取无人机的激活航线: {}", droneId);
        return flightPathService.getActiveFlightPath(droneId)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<FlightPath> createFlightPath(@RequestBody FlightPath flightPath) {
        logger.info("创建新航线规划，无人机: {}", flightPath.getDroneId());
        FlightPath createdFlightPath = flightPathService.createFlightPath(flightPath);
        return ResponseEntity.ok(createdFlightPath);
    }

    @PutMapping("/{id}")
    public ResponseEntity<FlightPath> updateFlightPath(@PathVariable Long id, @RequestBody FlightPath flightPath) {
        logger.info("更新航线规划，ID: {}", id);
        try {
            FlightPath updatedFlightPath = flightPathService.updateFlightPath(id, flightPath);
            return ResponseEntity.ok(updatedFlightPath);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @PutMapping("/{id}/activate")
    public ResponseEntity<FlightPath> activateFlightPath(@PathVariable Long id) {
        logger.info("激活航线规划，ID: {}", id);
        try {
            FlightPath activatedFlightPath = flightPathService.activateFlightPath(id);
            return ResponseEntity.ok(activatedFlightPath);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteFlightPath(@PathVariable Long id) {
        logger.info("删除航线规划，ID: {}", id);
        flightPathService.deleteFlightPath(id);
        return ResponseEntity.noContent().build();
    }
}

