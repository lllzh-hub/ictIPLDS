package com.powerinspection;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class PowerInspectionApplication {
    public static void main(String[] args) {
        SpringApplication.run(PowerInspectionApplication.class, args);
    }
}






