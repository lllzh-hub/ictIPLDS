package com.powerinspection.service.impl;

import com.powerinspection.service.AutoImportService;
import com.powerinspection.service.RemoteImportService;
import com.powerinspection.service.SftpService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.concurrent.CopyOnWriteArrayList;

@Slf4j
@Service
public class AutoImportServiceImpl implements AutoImportService {

    @Autowired
    private SftpService sftpService;

    @Autowired
    private RemoteImportService remoteImportService;

    @Value("${sftp.remote.path}")
    private String remotePath;

    @Value("${auto.import.enabled:false}")
    private boolean autoImportEnabled;

    @Value("${auto.import.interval:30000}")
    private long autoImportInterval;

    private volatile boolean running = false;
    private final List<String> importedFolders = new CopyOnWriteArrayList<>();

    @Override
    public void startAutoImport() {
        if (!autoImportEnabled) {
            log.warn("Auto import is disabled in configuration");
            return;
        }
        running = true;
        log.info("Auto import service started, interval: {} ms", autoImportInterval);
    }

    @Override
    public void stopAutoImport() {
        running = false;
        log.info("Auto import service stopped");
    }

    @Override
    public boolean isRunning() {
        return running && autoImportEnabled;
    }

    @Override
    public List<String> getImportedFolders() {
        return new ArrayList<>(importedFolders);
    }

    @Override
    public void clearImportedFolders() {
        importedFolders.clear();
        log.info("Cleared imported folders list");
    }

    /**
     * 定时扫描远程文件夹并导入
     */
    @Scheduled(fixedDelayString = "${auto.import.interval:30000}")
    public void scanAndImport() {
        if (!running || !autoImportEnabled) {
            return;
        }

        try {
            log.debug("Starting scheduled scan for remote folders");

            if (!sftpService.isConnected()) {
                log.info("SFTP not connected, attempting to reconnect");
                sftpService.connect();
            }

            // 获取远程文件夹列表
            List<String> remoteFolders = sftpService.listFiles(remotePath);
            log.info("Found {} remote folders", remoteFolders.size());

            // 遍历文件夹，导入未导入过的文件夹
            for (String folder : remoteFolders) {
                if (!importedFolders.contains(folder)) {
                    try {
                        log.info("Importing new folder: {}", folder);
                        remoteImportService.importFromFolder(folder);
                        importedFolders.add(folder);
                        log.info("Successfully imported folder: {}", folder);
                    } catch (Exception e) {
                        log.error("Failed to import folder {}: {}", folder, e.getMessage());
                    }
                }
            }

        } catch (Exception e) {
            log.error("Error during scheduled scan: {}", e.getMessage(), e);
            // 尝试重新连接
            try {
                sftpService.disconnect();
                sftpService.connect();
            } catch (Exception reconnectError) {
                log.error("Failed to reconnect SFTP: {}", reconnectError.getMessage());
            }
        }
    }
}

