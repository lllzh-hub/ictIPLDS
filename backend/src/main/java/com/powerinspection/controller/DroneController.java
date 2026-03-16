package com.powerinspection.controller;

import com.powerinspection.entity.Drone;
import com.powerinspection.service.DroneService;
import com.powerinspection.util.CharacterEncodingUtil;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/drones")
@CrossOrigin(origins = "*")
public class DroneController {

    private static final Logger logger = LoggerFactory.getLogger(DroneController.class);

    @Autowired
    private DroneService droneService;

    @GetMapping
    public ResponseEntity<List<Drone>> getAllDrones() {
        logger.info("获取所有无人机列表");
        List<Drone> drones = droneService.getAllDrones();
        return ResponseEntity.ok(drones);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Drone> getDroneById(@PathVariable Long id) {
        logger.info("获取无人机详情，ID: {}", id);
        return droneService.getDroneById(id)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/drone-id/{droneId}")
    public ResponseEntity<Drone> getDroneByDroneId(@PathVariable String droneId) {
        logger.info("根据无人机编号获取详情: {}", droneId);
        return droneService.getDroneByDroneId(droneId)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/status/{status}")
    public ResponseEntity<List<Drone>> getDronesByStatus(@PathVariable Drone.DroneStatus status) {
        logger.info("根据状态获取无人机列表: {}", status);
        List<Drone> drones = droneService.getDronesByStatus(status);
        return ResponseEntity.ok(drones);
    }

    @PostMapping
    public ResponseEntity<Drone> createDrone(@RequestBody Drone drone) {
        logger.info("创建新无人机: {}", drone.getDroneId());
        
        // 确保所有字符串字段使用 UTF-8 编码
        if (drone.getName() != null) {
            drone.setName(CharacterEncodingUtil.ensureUtf8(drone.getName()));
        }
        if (drone.getModel() != null) {
            drone.setModel(CharacterEncodingUtil.ensureUtf8(drone.getModel()));
        }
        if (drone.getCurrentLocation() != null) {
            drone.setCurrentLocation(CharacterEncodingUtil.ensureUtf8(drone.getCurrentLocation()));
        }
        
        Drone createdDrone = droneService.createDrone(drone);
        return ResponseEntity.ok(createdDrone);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Drone> updateDrone(@PathVariable Long id, @RequestBody Drone drone) {
        logger.info("更新无人机信息，ID: {}", id);
        
        // 确保所有字符串字段使用 UTF-8 编码
        if (drone.getName() != null) {
            drone.setName(CharacterEncodingUtil.ensureUtf8(drone.getName()));
        }
        if (drone.getModel() != null) {
            drone.setModel(CharacterEncodingUtil.ensureUtf8(drone.getModel()));
        }
        if (drone.getCurrentLocation() != null) {
            drone.setCurrentLocation(CharacterEncodingUtil.ensureUtf8(drone.getCurrentLocation()));
        }
        
        try {
            Drone updatedDrone = droneService.updateDrone(id, drone);
            return ResponseEntity.ok(updatedDrone);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteDrone(@PathVariable Long id) {
        logger.info("删除无人机，ID: {}", id);
        droneService.deleteDrone(id);
        return ResponseEntity.noContent().build();
    }
}





