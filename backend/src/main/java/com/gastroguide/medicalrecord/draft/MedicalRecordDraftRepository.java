package com.gastroguide.medicalrecord.draft;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface MedicalRecordDraftRepository extends JpaRepository<MedicalRecordDraft, UUID> {
    Optional<MedicalRecordDraft> findByPatientIdAndFormKey(UUID patientId, String formKey);
}
