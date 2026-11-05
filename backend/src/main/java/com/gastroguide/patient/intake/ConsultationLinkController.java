package com.gastroguide.patient.intake;

import com.gastroguide.appointment.AppointmentType;
import com.gastroguide.patient.intake.dto.PatientIntakeLinkDto;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

/**
 * Geração do link de consulta. Recurso próprio (e não mais
 * {@code /api/pacientes/{id}/link-cadastro}) porque o link deixou de
 * pertencer a um paciente: ele pode existir antes do cadastro. Não entra em
 * nenhum matcher {@code ROLE_DOCTOR}, então a secretária também gera.
 */
@RestController
@RequestMapping("/api/links-consulta")
public class ConsultationLinkController {

    private final IntakeService intakeService;

    public ConsultationLinkController(IntakeService intakeService) {
        this.intakeService = intakeService;
    }

    /**
     * {@code patientId} nulo gera um link para paciente ainda não cadastrado.
     *
     * <p>{@code type} é opcional e hoje não é mais enviado pelo app: quem
     * escolhe entre primeira consulta e retorno é o próprio paciente, dentro
     * do link (V14). O campo continua aceito para não quebrar nada que ainda
     * mande o tipo — quando vem preenchido, ele prevalece sobre a escolha.
     */
    public record CreateConsultationLinkRequest(UUID patientId, AppointmentType type, IntakeLinkPurpose purpose) {
    }

    /** {@code purpose} ausente vale como {@link IntakeLinkPurpose#AGENDAMENTO}, o comportamento de antes da V20. */
    @PostMapping
    public PatientIntakeLinkDto create(@AuthenticationPrincipal(expression = "doctorId") UUID doctorId,
            @Valid @RequestBody CreateConsultationLinkRequest request) {
        IntakeLinkPurpose purpose = request.purpose() != null ? request.purpose() : IntakeLinkPurpose.AGENDAMENTO;
        return intakeService.generateLink(doctorId, request.patientId(), request.type(), purpose);
    }
}
