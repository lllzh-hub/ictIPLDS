package com.powerinspection.service;

import com.powerinspection.entity.Defect;
import java.util.List;
import java.util.Optional;

public interface DefectService {
    List<Defect> getAllDefects();
    Optional<Defect> getDefectById(Long id);
    List<Defect> getDefectsByStatus(String status);
    List<Defect> getDefectsBySeverity(String severity);
    List<Defect> getDefectsByLocation(String location);
    Defect createDefect(Defect defect);
    Defect updateDefect(Long id, Defect defect);
    void deleteDefect(Long id);
}

