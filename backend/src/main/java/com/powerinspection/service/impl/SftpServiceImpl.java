package com.powerinspection.service.impl;

import com.jcraft.jsch.*;
import com.powerinspection.service.SftpService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Vector;

@Slf4j
@Service
public class SftpServiceImpl implements SftpService {

    @Value("${sftp.host}")
    private String host;

    @Value("${sftp.port}")
    private int port;

    @Value("${sftp.username}")
    private String username;

    @Value("${sftp.password}")
    private String password;

    @Value("${sftp.enabled:false}")
    private boolean enabled;

    private JSch jsch;
    private Session session;
    private ChannelSftp channelSftp;

    @Override
    public void connect() {
        if (!enabled) {
            log.warn("SFTP is disabled");
            return;
        }

        try {
            jsch = new JSch();
            session = jsch.getSession(username, host, port);
            session.setPassword(password);
            session.setConfig("StrictHostKeyChecking", "no");
            session.connect();

            Channel channel = session.openChannel("sftp");
            channel.connect();
            channelSftp = (ChannelSftp) channel;

            log.info("SFTP connected successfully to {}:{}", host, port);
        } catch (JSchException e) {
            log.error("Failed to connect to SFTP server: {}", e.getMessage(), e);
            throw new RuntimeException("SFTP connection failed", e);
        }
    }

    @Override
    public void disconnect() {
        try {
            if (channelSftp != null && channelSftp.isConnected()) {
                channelSftp.disconnect();
            }
            if (session != null && session.isConnected()) {
                session.disconnect();
            }
            log.info("SFTP disconnected");
        } catch (Exception e) {
            log.error("Error disconnecting SFTP: {}", e.getMessage(), e);
        }
    }

    @Override
    public List<String> listFiles(String remotePath) {
        List<String> fileList = new ArrayList<>();
        try {
            if (!isConnected()) {
                connect();
            }

            Vector<ChannelSftp.LsEntry> entries = channelSftp.ls(remotePath);
            for (ChannelSftp.LsEntry entry : entries) {
                if (!entry.getFilename().startsWith(".")) {
                    fileList.add(entry.getFilename());
                }
            }
            log.info("Listed {} items from {}", fileList.size(), remotePath);
        } catch (SftpException e) {
            log.error("Failed to list files from {}: {}", remotePath, e.getMessage(), e);
            throw new RuntimeException("Failed to list SFTP files", e);
        }
        return fileList;
    }

    @Override
    public Map<String, Long> listFilesWithMtime(String remotePath) {
        Map<String, Long> result = new HashMap<>();
        try {
            if (!isConnected()) {
                connect();
            }
            Vector<ChannelSftp.LsEntry> entries = channelSftp.ls(remotePath);
            for (ChannelSftp.LsEntry entry : entries) {
                if (!entry.getFilename().startsWith(".")) {
                    // getMTime() 返回 Unix 秒级时间戳
                    long mtime = entry.getAttrs().getMTime();
                    result.put(entry.getFilename(), mtime);
                }
            }
            log.info("Listed {} items with mtime from {}", result.size(), remotePath);
        } catch (SftpException e) {
            log.error("Failed to list files with mtime from {}: {}", remotePath, e.getMessage(), e);
            throw new RuntimeException("Failed to list SFTP files with mtime", e);
        }
        return result;
    }

    @Override
    public void downloadFile(String remoteFilePath, String localFilePath) {
        try {
            if (!isConnected()) {
                connect();
            }

            channelSftp.get(remoteFilePath, localFilePath);
            log.info("Downloaded file from {} to {}", remoteFilePath, localFilePath);
        } catch (SftpException e) {
            log.error("Failed to download file from {}: {}", remoteFilePath, e.getMessage(), e);
            throw new RuntimeException("Failed to download SFTP file", e);
        }
    }

    @Override
    public void uploadFile(String localFilePath, String remoteFilePath) {
        try {
            if (!isConnected()) {
                connect();
            }

            channelSftp.put(localFilePath, remoteFilePath);
            log.info("Uploaded file from {} to {}", localFilePath, remoteFilePath);
        } catch (SftpException e) {
            log.error("Failed to upload file to {}: {}", remoteFilePath, e.getMessage(), e);
            throw new RuntimeException("Failed to upload SFTP file", e);
        }
    }

    @Override
    public boolean isConnected() {
        return channelSftp != null && channelSftp.isConnected() && session != null && session.isConnected();
    }
}

