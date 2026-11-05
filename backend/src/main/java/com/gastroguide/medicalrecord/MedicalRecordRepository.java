package com.gastroguide.medicalrecord;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface MedicalRecordRepository extends JpaRepository<MedicalRecord, UUID> {
    List<MedicalRecord> findByPatientIdOrderByCreatedAtDesc(UUID patientId);

    Optional<MedicalRecord> findByIdAndPatientId(UUID id, UUID patientId);
}
