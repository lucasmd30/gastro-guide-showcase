package com.gastroguide.availability;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface AvailabilityWindowRepository extends JpaRepository<AvailabilityWindow, UUID> {

    @EntityGraph(attributePaths = "rules")
    List<AvailabilityWindow> findByDoctorIdOrderByStartDateAscCreatedAtAsc(UUID doctorId);

    @EntityGraph(attributePaths = "rules")
    Optional<AvailabilityWindow> findByIdAndDoctorId(UUID id, UUID doctorId);
}
