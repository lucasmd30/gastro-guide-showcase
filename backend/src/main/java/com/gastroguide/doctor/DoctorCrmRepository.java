package com.gastroguide.doctor;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface DoctorCrmRepository extends JpaRepository<DoctorCrm, UUID> {
    List<DoctorCrm> findByDoctorIdOrderByCreatedAtAsc(UUID doctorId);

    Optional<DoctorCrm> findByIdAndDoctorId(UUID id, UUID doctorId);

    Optional<DoctorCrm> findByDoctorIdAndPrincipalTrue(UUID doctorId);

    boolean existsByCrmAndCrmUf(String crm, String crmUf);

    boolean existsByDoctorIdAndCrmUf(UUID doctorId, String crmUf);
}
