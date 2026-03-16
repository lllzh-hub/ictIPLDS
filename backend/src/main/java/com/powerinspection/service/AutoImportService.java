package com.powerinspection.service;

import java.util.List;

public interface AutoImportService {
    /**
     * 启动自动导入任务
     */
    void startAutoImport();

    /**
     * 停止自动导入任务
     */
    void stopAutoImport();

    /**
     * 检查自动导入是否运行中
     */
    boolean isRunning();

    /**
     * 获取已导入的文件夹列表
     */
    List<String> getImportedFolders();

    /**
     * 清空已导入的文件夹记录
     */
    void clearImportedFolders();
}

