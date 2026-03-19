package com.powerinspection.service.impl;

import com.powerinspection.service.AutoImportService;
import com.powerinspection.service.RemoteImportService;
import com.powerinspection.service.SftpService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import jakarta.annotation.PostConstruct;
import java.io.*;
import java.nio.file.*;
import java.util.*;

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

    @Value("${defect.import.folder:D:/Desktop/example_responses}")
    private String localImportFolder;

    private volatile boolean running = false;

    /**
     * 时间线文件路径，记录每个文件夹最后一次成功导入时的远端 mtime（Unix 秒）
     * 格式：每行 folderName=mtime
     */
    private Path timelineFile;

    /** 内存缓存：folderName -> 上次成功导入时的 mtime */
    private final Map<String, Long> lastImportedMtime = new HashMap<>();

    @PostConstruct
    public void init() {
        timelineFile = Paths.get(localImportFolder, ".import_timeline");
        loadTimeline();
        if (autoImportEnabled) {
            running = true;
            log.info("Auto import service 已启动，时间线文件: {}", timelineFile);
        }
    }

    // ----------------------------------------------------------------
    // 时间线持久化
    // ----------------------------------------------------------------

    private void loadTimeline() {
        lastImportedMtime.clear();
        if (!Files.exists(timelineFile)) {
            log.info("时间线文件不存在，将从头开始扫描: {}", timelineFile);
            return;
        }
        try (BufferedReader reader = Files.newBufferedReader(timelineFile)) {
            String line;
            while ((line = reader.readLine()) != null) {
                line = line.trim();
                if (line.isEmpty() || line.startsWith("#")) continue;
                int eq = line.lastIndexOf('=');
                if (eq > 0) {
                    String folder = line.substring(0, eq);
                    long mtime = Long.parseLong(line.substring(eq + 1));
                    lastImportedMtime.put(folder, mtime);
                }
            }
            log.info("加载时间线成功，已记录 {} 个文件夹", lastImportedMtime.size());
        } catch (Exception e) {
            log.warn("加载时间线失败，将重新扫描所有文件夹: {}", e.getMessage());
            lastImportedMtime.clear();
        }
    }

    private void saveTimeline() {
        try {
            // 确保目录存在
            Files.createDirectories(timelineFile.getParent());
            try (BufferedWriter writer = Files.newBufferedWriter(timelineFile)) {
                writer.write("# Auto Import Timeline - last imported mtime per folder");
                writer.newLine();
                writer.write("# Updated: " + new Date());
                writer.newLine();
                for (Map.Entry<String, Long> entry : lastImportedMtime.entrySet()) {
                    writer.write(entry.getKey() + "=" + entry.getValue());
                    writer.newLine();
                }
            }
        } catch (Exception e) {
            log.error("保存时间线失败: {}", e.getMessage());
        }
    }

    // ----------------------------------------------------------------
    // AutoImportService 接口实现
    // ----------------------------------------------------------------

    @Override
    public void startAutoImport() {
        if (!autoImportEnabled) {
            log.warn("Auto import is disabled in configuration");
            return;
        }
        running = true;
        log.info("Auto import service started");
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
        return new ArrayList<>(lastImportedMtime.keySet());
    }

    @Override
    public void clearImportedFolders() {
        lastImportedMtime.clear();
        try {
            Files.deleteIfExists(timelineFile);
        } catch (Exception e) {
            log.warn("删除时间线文件失败: {}", e.getMessage());
        }
        log.info("已清除时间线记录，下次扫描将重新导入所有文件夹");
    }

    // ----------------------------------------------------------------
    // 定时扫描
    // ----------------------------------------------------------------

    @Scheduled(fixedDelayString = "${auto.import.interval:30000}")
    public void scanAndImport() {
        if (!running || !autoImportEnabled) {
            return;
        }

        try {
            if (!sftpService.isConnected()) {
                log.info("SFTP not connected, attempting to reconnect");
                sftpService.connect();
            }

            // 获取远端文件夹列表及其 mtime
            Map<String, Long> remoteFolders = sftpService.listFilesWithMtime(remotePath);
            log.info("扫描到 {} 个远端文件夹", remoteFolders.size());

            boolean timelineChanged = false;

            for (Map.Entry<String, Long> entry : remoteFolders.entrySet()) {
                String folder = entry.getKey();
                long remoteMtime = entry.getValue();

                Long lastMtime = lastImportedMtime.get(folder);

                if (lastMtime != null && remoteMtime <= lastMtime) {
                    // 文件夹未发生变化，跳过
                    log.debug("跳过未变化的文件夹: {} (mtime={}, last={})", folder, remoteMtime, lastMtime);
                    continue;
                }

                // 新文件夹或有更新
                String reason = lastMtime == null ? "新文件夹" : "文件夹已更新";
                log.info("{}，开始导入: {} (remoteMtime={}, lastMtime={})", reason, folder, remoteMtime, lastMtime);

                try {
                        remoteImportService.importFromFolder(folder);
                    // 导入成功后记录时间线
                    lastImportedMtime.put(folder, remoteMtime);
                    timelineChanged = true;
                    log.info("导入成功，更新时间线: {} -> {}", folder, remoteMtime);
                    } catch (Exception e) {
                    log.error("导入文件夹失败，不更新时间线: {} - {}", folder, e.getMessage());
                }
            }

            if (timelineChanged) {
                saveTimeline();
            }

        } catch (Exception e) {
            log.error("定时扫描发生错误: {}", e.getMessage(), e);
            try {
                sftpService.disconnect();
                sftpService.connect();
            } catch (Exception reconnectError) {
                log.error("重连 SFTP 失败: {}", reconnectError.getMessage());
            }
        }
    }
}
