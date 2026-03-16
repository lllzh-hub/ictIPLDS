package com.powerinspection.config;

import com.powerinspection.service.SftpService;
import com.powerinspection.service.AutoImportService;
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

    @Autowired
    private AutoImportService autoImportService;

    @Value("${sftp.enabled:false}")
    private boolean sftpEnabled;

    @Value("${auto.import.enabled:false}")
    private boolean autoImportEnabled;

    @Override
    public void run(String... args) {
        if (sftpEnabled) {
            try {
                log.info("Initializing SFTP connection...");
                sftpService.connect();
                log.info("SFTP connection initialized successfully");

                // 如果启用了自动导入，则启动自动导入服务
                if (autoImportEnabled) {
                    log.info("Starting auto import service...");
                    autoImportService.startAutoImport();
                    log.info("Auto import service started");
                }
            } catch (Exception e) {
                log.error("Failed to initialize SFTP connection: {}", e.getMessage(), e);
            }
        } else {
            log.info("SFTP is disabled, skipping connection initialization");
        }
    }
}

