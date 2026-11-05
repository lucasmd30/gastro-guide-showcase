package com.gastroguide.exam;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ExamComboFavoriteRepository extends JpaRepository<ExamComboFavorite, UUID> {
    List<ExamComboFavorite> findByDoctorIdOrderByComboNameAsc(UUID doctorId);

    Optional<ExamComboFavorite> findByDoctorIdAndComboName(UUID doctorId, String comboName);
}
