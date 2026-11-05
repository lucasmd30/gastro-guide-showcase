package com.gastroguide.doctor;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface DoctorRqeRepository extends JpaRepository<DoctorRqe, UUID> {
    List<DoctorRqe> findByDoctorIdOrderByCreatedAtAsc(UUID doctorId);

    Optional<DoctorRqe> findByIdAndDoctorId(UUID id, UUID doctorId);

    Optional<DoctorRqe> findByDoctorIdAndPrincipalTrue(UUID doctorId);

    boolean existsByDoctorIdAndSpecialty(UUID doctorId, String specialty);
}
