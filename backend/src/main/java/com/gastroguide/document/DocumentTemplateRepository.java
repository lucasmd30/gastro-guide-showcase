package com.gastroguide.document;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface DocumentTemplateRepository extends JpaRepository<DocumentTemplate, UUID> {
    List<DocumentTemplate> findByDoctorIdOrderByNameAsc(UUID doctorId);

    Optional<DocumentTemplate> findByIdAndDoctorId(UUID id, UUID doctorId);
}
