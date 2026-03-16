package com.powerinspection.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.jdbc.core.JdbcTemplate;
import java.util.*;

@RestController
@RequestMapping("/api/uav")
@CrossOrigin(origins = "*")
public class UAVController {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> getAllUAVs() {
        String sql = "SELECT id, uav_id as uavId, name, status, battery as battery, speed, latitude, longitude, altitude FROM uav";
        List<Map<String, Object>> uavs = jdbcTemplate.queryForList(sql);
        return ResponseEntity.ok(uavs);
    }

    @GetMapping("/{uavId}")
    public ResponseEntity<Map<String, Object>> getUAVByUavId(@PathVariable String uavId) {
        String sql = "SELECT id, uav_id as uavId, name, status, battery as battery, speed, latitude, longitude, altitude FROM uav WHERE uav_id = ?";
        try {
            Map<String, Object> uav = jdbcTemplate.queryForMap(sql, uavId);
            return ResponseEntity.ok(uav);
        } catch (Exception e) {
            return ResponseEntity.notFound().build();
        }
    }
}
