package com.gastroguide.availability;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface AvailabilityRuleRepository extends JpaRepository<AvailabilityRule, UUID> {

    Optional<AvailabilityRule> findByIdAndWindowIdAndDoctorId(UUID id, UUID windowId, UUID doctorId);
}
