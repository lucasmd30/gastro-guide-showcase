package com.gastroguide.medicalrecord;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface PatientDiseaseHeaderRepository extends JpaRepository<PatientDiseaseHeader, UUID> {
    Optional<PatientDiseaseHeader> findByPatientIdAndDisease(UUID patientId, String disease);
}
