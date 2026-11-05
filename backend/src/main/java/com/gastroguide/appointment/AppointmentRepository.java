package com.gastroguide.appointment;

import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface AppointmentRepository extends JpaRepository<Appointment, UUID> {
    List<Appointment> findByDoctorIdAndScheduledAtBetweenOrderByScheduledAtAsc(
            UUID doctorId, Instant from, Instant to);

    Optional<Appointment> findByIdAndDoctorId(UUID id, UUID doctorId);

    /** Próxima consulta do paciente com um dos status dados, a partir de {@code after}. */
    Optional<Appointment> findFirstByDoctorIdAndPatientIdAndStatusInAndScheduledAtAfterOrderByScheduledAtAsc(
            UUID doctorId, UUID patientId, Collection<AppointmentStatus> statuses, Instant after);

    boolean existsByDoctorIdAndScheduledAtAndStatusNot(
            UUID doctorId, Instant scheduledAt, AppointmentStatus excludedStatus);

    boolean existsByDoctorIdAndScheduledAtAndStatusNotAndIdNot(
            UUID doctorId, Instant scheduledAt, AppointmentStatus excludedStatus, UUID excludedId);
}
