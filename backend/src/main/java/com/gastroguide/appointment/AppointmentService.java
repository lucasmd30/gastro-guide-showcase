package com.gastroguide.appointment;

import com.gastroguide.appointment.dto.AppointmentDto;
import com.gastroguide.appointment.dto.CreateAppointmentRequest;
import com.gastroguide.appointment.dto.UpdateAppointmentRequest;
import com.gastroguide.doctor.Doctor;
import com.gastroguide.doctor.DoctorRepository;
import com.gastroguide.patient.Patient;
import com.gastroguide.patient.PatientRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
public class AppointmentService {

    /** Cobre a maior duração plausível de um atendimento anterior que ainda alcance o horário pedido. */
    private static final Duration LOOKBACK = Duration.ofHours(8);

    private final AppointmentRepository appointmentRepository;
    private final PatientRepository patientRepository;
    private final DoctorRepository doctorRepository;

    public AppointmentService(AppointmentRepository appointmentRepository, PatientRepository patientRepository,
                               DoctorRepository doctorRepository) {
        this.appointmentRepository = appointmentRepository;
        this.patientRepository = patientRepository;
        this.doctorRepository = doctorRepository;
    }

    @Transactional(readOnly = true)
    public List<AppointmentDto> list(UUID doctorId, Instant from, Instant to) {
        return appointmentRepository.findByDoctorIdAndScheduledAtBetweenOrderByScheduledAtAsc(doctorId, from, to)
                .stream()
                .map(AppointmentDto::from)
                .toList();
    }

    @Transactional
    public AppointmentDto create(UUID doctorId, CreateAppointmentRequest request) {
        Doctor doctor = doctorRepository.findById(doctorId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Sessão inválida, faça login novamente."));
        Patient patient = patientRepository.findByIdAndDoctorId(request.patientId(), doctorId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Paciente não encontrado."));

        // A duração vem do tipo de atendimento configurado pelo médico
        // (primeira consulta e retorno têm tamanhos diferentes); o pedido só
        // a informa quando quer um encaixe fora do padrão.
        int durationMin = request.durationMin() != null ? request.durationMin() : doctor.minutesFor(request.type());

        AppointmentModality modality = request.modality() != null ? request.modality()
                : AppointmentModality.PRESENCIAL;

        // Encaixe é o médico dizendo que sabe que o horário está ocupado.
        boolean encaixe = Boolean.TRUE.equals(request.encaixe());
        if (!encaixe) {
            rejectIfOverlaps(doctorId, request.scheduledAt(), durationMin, null);
        }

        AppointmentBilling billing = request.billing() != null ? request.billing() : AppointmentBilling.PARTICULAR;
        String healthPlan = requireHealthPlanForConvenio(billing, request.healthPlan());

        Appointment appointment = new Appointment(
                doctor, patient, request.scheduledAt(), durationMin, request.type(), modality,
                blankToNull(request.notes()));
        // Particular nasce com o valor padrão do tipo, a não ser que venha um
        // valor ajustado para esta consulta.
        Integer priceCents = request.priceCents() != null ? request.priceCents() : doctor.priceFor(request.type());
        appointment.setBilling(billing, healthPlan, priceCents);
        appointment.setEncaixe(encaixe);
        appointmentRepository.save(appointment);

        return AppointmentDto.from(appointment);
    }

    @Transactional
    public AppointmentDto update(UUID doctorId, UUID appointmentId, UpdateAppointmentRequest request) {
        Appointment appointment = findOrThrow(doctorId, appointmentId);

        // O conflito só era checado quando o horário mudava — reativar um
        // agendamento CANCELADO (via troca de status, sem tocar em
        // scheduledAt) não passava por essa checagem nenhuma, então
        // cancelar, criar outro no mesmo horário e depois reativar o
        // cancelado produzia dois agendamentos não-cancelados no mesmo
        // instante. Achado da revisão final da Fase 0.
        Instant effectiveScheduledAt = request.scheduledAt() != null ? request.scheduledAt() : appointment.getScheduledAt();
        AppointmentStatus effectiveStatus = request.status() != null ? request.status() : appointment.getStatus();
        boolean scheduledAtChanging = request.scheduledAt() != null && !request.scheduledAt().equals(appointment.getScheduledAt());
        // "Reativar" é voltar a segurar o horário: sair de cancelado ou de
        // falta (que também libera o horário desde 10/10/2026).
        boolean reactivating = !appointment.getStatus().occupiesSlot() && effectiveStatus.occupiesSlot();
        boolean effectiveEncaixe = request.encaixe() != null ? request.encaixe() : appointment.isEncaixe();

        // Deixar de ser encaixe também volta a disputar o horário com os outros.
        boolean leavingEncaixe = appointment.isEncaixe() && !effectiveEncaixe;

        if (!effectiveEncaixe && effectiveStatus.occupiesSlot() && (scheduledAtChanging || reactivating || leavingEncaixe)) {
            rejectIfOverlaps(doctorId, effectiveScheduledAt, appointment.getDurationMin(), appointmentId);
        }

        if (request.scheduledAt() != null) {
            appointment.setScheduledAt(request.scheduledAt());
        }
        if (request.type() != null) {
            appointment.setType(request.type());
        }
        if (request.modality() != null) {
            appointment.setModality(request.modality());
        }
        if (request.billing() != null) {
            appointment.setBilling(request.billing(),
                    requireHealthPlanForConvenio(request.billing(), request.healthPlan()), request.priceCents());
        }
        if (request.status() != null) {
            appointment.setStatus(request.status());
        }
        if (request.notes() != null) {
            appointment.setNotes(blankToNull(request.notes()));
        }
        appointment.setEncaixe(effectiveEncaixe);
        appointmentRepository.saveAndFlush(appointment);

        return AppointmentDto.from(appointment);
    }

    @Transactional
    public void delete(UUID doctorId, UUID appointmentId) {
        Appointment appointment = findOrThrow(doctorId, appointmentId);
        appointmentRepository.delete(appointment);
    }

    /**
     * Recusa se o atendimento pedido <b>se sobrepõe</b> a outro
     * não-cancelado. Com durações por tipo, comparar o instante exato não
     * basta: duas consultas de 45 min às 08:00 e às 08:15 começam em
     * instantes diferentes e mesmo assim colidem.
     *
     * <p>A busca começa antes do horário pedido porque um agendamento que
     * começa antes pode terminar depois dele.
     */
    private void rejectIfOverlaps(UUID doctorId, Instant scheduledAt, int durationMin, UUID ignoredId) {
        Instant end = scheduledAt.plusSeconds(durationMin * 60L);
        boolean overlaps = appointmentRepository
                .findByDoctorIdAndScheduledAtBetweenOrderByScheduledAtAsc(doctorId, scheduledAt.minus(LOOKBACK), end)
                .stream()
                .filter(other -> other.getStatus().occupiesSlot())
                .filter(other -> !other.getId().equals(ignoredId))
                .anyMatch(other -> {
                    Instant otherEnd = other.getScheduledAt().plusSeconds(other.getDurationMin() * 60L);
                    return other.getScheduledAt().isBefore(end) && scheduledAt.isBefore(otherEnd);
                });
        if (overlaps) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Já existe um agendamento nesse horário. Para marcar mesmo assim, use o encaixe.");
        }
    }

    private Appointment findOrThrow(UUID doctorId, UUID appointmentId) {
        return appointmentRepository.findByIdAndDoctorId(appointmentId, doctorId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Agendamento não encontrado."));
    }

    /** Convênio sem o nome do plano não serve para faturar; nos outros casos o plano é descartado. */
    private static String requireHealthPlanForConvenio(AppointmentBilling billing, String healthPlan) {
        if (billing != AppointmentBilling.CONVENIO) {
            return null;
        }
        String plan = blankToNull(healthPlan);
        if (plan == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Informe o plano do convênio.");
        }
        return plan.trim();
    }

    private static String blankToNull(String value) {
        return (value == null || value.isBlank()) ? null : value.trim();
    }
}
