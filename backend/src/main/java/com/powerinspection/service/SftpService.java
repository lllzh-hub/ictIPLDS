package com.powerinspection.service;

import java.util.List;

public interface SftpService {
    /**
     * 连接到SFTP服务器
     */
    void connect();

    /**
     * 断开SFTP连接
     */
    void disconnect();

    /**
     * 列出远程目录中的文件
     */
    List<String> listFiles(String remotePath);

    /**
     * 下载文件
     */
    void downloadFile(String remoteFilePath, String localFilePath);

    /**
     * 上传文件
     */
    void uploadFile(String localFilePath, String remoteFilePath);

    /**
     * 检查连接状态
     */
    boolean isConnected();
}

