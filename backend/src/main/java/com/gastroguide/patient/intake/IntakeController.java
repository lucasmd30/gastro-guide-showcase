package com.gastroguide.patient.intake;

import com.gastroguide.appointment.AppointmentType;
import com.gastroguide.availability.dto.AvailabilitySlotDto;
import com.gastroguide.common.RateLimiter;
import com.gastroguide.patient.dto.PatientRequest;
import com.gastroguide.patient.intake.dto.IdentifiedPatientDto;
import com.gastroguide.patient.intake.dto.IdentifyPatientRequest;
import com.gastroguide.patient.intake.dto.IntakeContextDto;
import com.gastroguide.patient.intake.dto.RegistrationDoneDto;
import com.gastroguide.patient.intake.dto.ScheduleIntakeRequest;
import com.gastroguide.patient.intake.dto.ScheduledConsultationDto;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.Duration;
import java.util.List;

/**
 * Única rota pública (sem autenticação) do sistema — o token no path é a
 * única forma de autorização aqui, então precisa ser opaco, hasheado no
 * banco (nunca em texto puro) e rate-limitado por IP como qualquer outra
 * rota de auth (ver AuthController).
 */
@RestController
@RequestMapping("/api/intake")
public class IntakeController {

    private static final Duration FIVE_MINUTES = Duration.ofMinutes(5);
    private static final Duration FIFTEEN_MINUTES = Duration.ofMinutes(15);

    private final IntakeService intakeService;
    private final RateLimiter rateLimiter;

    public IntakeController(IntakeService intakeService, RateLimiter rateLimiter) {
        this.intakeService = intakeService;
        this.rateLimiter = rateLimiter;
    }

    @GetMapping("/{token}")
    public IntakeContextDto get(@PathVariable String token, HttpServletRequest httpRequest) {
        limitOrThrow(httpRequest);
        return intakeService.getByToken(token);
    }

    /** Os horários dependem do tipo: primeira consulta e retorno têm durações diferentes. */
    @GetMapping("/{token}/horarios")
    public List<AvailabilitySlotDto> slots(@PathVariable String token,
            @RequestParam(required = false) AppointmentType tipo, HttpServletRequest httpRequest) {
        limitOrThrow(httpRequest);
        return intakeService.availableSlots(token, tipo);
    }

    /**
     * Identificação do paciente que volta (fluxo de retorno). É POST, e não
     * GET, porque CPF e data de nascimento não podem ir na URL — query
     * string aparece em log de servidor, histórico e {@code Referer}.
     */
    @PostMapping("/{token}/identificar")
    public IdentifiedPatientDto identify(@PathVariable String token,
            @Valid @RequestBody IdentifyPatientRequest request, HttpServletRequest httpRequest) {
        limitOrThrow(httpRequest);
        // Bucket próprio, bem mais apertado que o geral: cada chamada aqui é
        // um palpite de "esse CPF é paciente daqui?". 10 por 15 min por IP
        // torna a varredura inviável sem atrapalhar quem erra o próprio CPF.
        if (!rateLimiter.tryConsume("intake:identify:" + clientIp(httpRequest), 10, FIFTEEN_MINUTES)) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,
                    "Muitas tentativas. Tente novamente em alguns minutos.");
        }
        return intakeService.identify(token, request);
    }

    @PostMapping("/{token}/agendar")
    public ScheduledConsultationDto schedule(@PathVariable String token,
            @Valid @RequestBody ScheduleIntakeRequest request, HttpServletRequest httpRequest) {
        limitOrThrow(httpRequest);
        return intakeService.schedule(token, request);
    }

    /**
     * Link de cadastro, ou link de agendamento de quem já tem consulta
     * marcada: o paciente só preenche os dados, sem escolher horário.
     */
    @PostMapping("/{token}/cadastro")
    public RegistrationDoneDto completeRegistration(@PathVariable String token,
            @Valid @RequestBody PatientRequest request, HttpServletRequest httpRequest) {
        limitOrThrow(httpRequest);
        return intakeService.completeRegistration(token, request);
    }

    private void limitOrThrow(HttpServletRequest httpRequest) {
        if (!rateLimiter.tryConsume("intake:ip:" + clientIp(httpRequest), 30, FIVE_MINUTES)) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "Muitas tentativas. Tente novamente em instantes.");
        }
    }

    /** Mesma lógica de AuthController.clientIp — ver o comentário lá. */
    private static String clientIp(HttpServletRequest request) {
        return request.getRemoteAddr();
    }
}
