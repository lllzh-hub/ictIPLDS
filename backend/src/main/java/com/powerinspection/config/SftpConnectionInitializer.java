package com.powerinspection.config;

import com.powerinspection.service.SftpService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

@Slf4j
@Component
public class SftpConnectionInitializer implements CommandLineRunner {

    @Autowired
    private SftpService sftpService;

    @Value("${sftp.enabled:false}")
    private boolean sftpEnabled;

    @Override
    public void run(String... args) {
        if (sftpEnabled) {
            try {
                log.info("Initializing SFTP connection...");
                sftpService.connect();
                log.info("SFTP connection initialized successfully");
            } catch (Exception e) {
                log.error("Failed to initialize SFTP connection: {}", e.getMessage(), e);
            }
        } else {
            log.info("SFTP is disabled, skipping connection initialization");
        }
    }
}

