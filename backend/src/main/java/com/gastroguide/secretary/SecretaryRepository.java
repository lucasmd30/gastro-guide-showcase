package com.gastroguide.secretary;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface SecretaryRepository extends JpaRepository<Secretary, UUID> {
    Optional<Secretary> findByEmail(String email);

    List<Secretary> findByDoctorIdOrderByCreatedAtAsc(UUID doctorId);

    Optional<Secretary> findByIdAndDoctorId(UUID id, UUID doctorId);

    boolean existsByEmail(String email);
}
