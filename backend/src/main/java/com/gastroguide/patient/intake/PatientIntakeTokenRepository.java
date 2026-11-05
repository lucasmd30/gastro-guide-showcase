package com.gastroguide.patient.intake;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface PatientIntakeTokenRepository extends JpaRepository<PatientIntakeToken, UUID> {
    Optional<PatientIntakeToken> findByTokenHash(String tokenHash);

    @Modifying
    @Query("update PatientIntakeToken t set t.revokedAt = current_timestamp "
            + "where t.patient.id = :patientId and t.revokedAt is null")
    void revokeAllForPatient(@Param("patientId") UUID patientId);
}
