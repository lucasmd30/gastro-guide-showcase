package com.gastroguide.doctor;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface DoctorHealthPlanRepository extends JpaRepository<DoctorHealthPlan, UUID> {
    List<DoctorHealthPlan> findByDoctorIdOrderByNameAsc(UUID doctorId);

    Optional<DoctorHealthPlan> findByIdAndDoctorId(UUID id, UUID doctorId);

    boolean existsByDoctorIdAndNameIgnoreCase(UUID doctorId, String name);
}
