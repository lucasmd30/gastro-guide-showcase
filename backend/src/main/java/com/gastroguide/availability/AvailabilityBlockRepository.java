package com.gastroguide.availability;

import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface AvailabilityBlockRepository extends JpaRepository<AvailabilityBlock, UUID> {

    List<AvailabilityBlock> findByDoctorIdOrderByStartDateAscCreatedAtAsc(UUID doctorId);

    /** Bloqueios que ainda alcançam {@code day} ou depois — os passados não interessam à tela. */
    List<AvailabilityBlock> findByDoctorIdAndEndDateGreaterThanEqualOrderByStartDateAscCreatedAtAsc(UUID doctorId,
            LocalDate day);

    Optional<AvailabilityBlock> findByIdAndDoctorId(UUID id, UUID doctorId);
}
