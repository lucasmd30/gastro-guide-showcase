package com.gastroguide.exam;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ExamComboRepository extends JpaRepository<ExamCombo, UUID> {
    List<ExamCombo> findByDoctorIdOrderByNameAsc(UUID doctorId);

    Optional<ExamCombo> findByIdAndDoctorId(UUID id, UUID doctorId);

    boolean existsByDoctorIdAndNameIgnoreCase(UUID doctorId, String name);

    boolean existsByDoctorIdAndNameIgnoreCaseAndIdNot(UUID doctorId, String name, UUID id);
}
