package com.powerinspection.service;

import com.powerinspection.entity.Defect;
import java.util.List;

public interface RemoteImportService {
    /**
     * 从远程文件夹导入缺陷数据
     */
    List<Defect> importFromFolder(String folderName);
    
    /**
     * 从所有远程文件夹导入缺陷数据
     */
    List<Defect> importFromAllFolders();
}

