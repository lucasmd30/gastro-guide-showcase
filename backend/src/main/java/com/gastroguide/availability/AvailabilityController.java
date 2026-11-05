package com.gastroguide.availability;

import com.gastroguide.appointment.AppointmentType;
import com.gastroguide.availability.dto.AppointmentDurationsDto;
import com.gastroguide.availability.dto.AvailabilityBlockDto;
import com.gastroguide.availability.dto.AvailabilityRuleDto;
import com.gastroguide.availability.dto.AvailabilitySlotDto;
import com.gastroguide.availability.dto.AvailabilityWindowDto;
import com.gastroguide.availability.dto.UpdateAvailabilityWindowRequest;
import com.gastroguide.availability.dto.CreateAvailabilityBlockRequest;
import com.gastroguide.availability.dto.CreateAvailabilityRuleRequest;
import com.gastroguide.availability.dto.CreateAvailabilityWindowRequest;
import com.gastroguide.availability.dto.UpdateAppointmentDurationsRequest;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Janelas de atendimento, bloqueios e horários livres. Fica sob
 * {@code /api/agenda}, que não entra em nenhum matcher {@code ROLE_DOCTOR}
 * do SecurityConfig — horário de atendimento é dado de agenda, não dado
 * clínico, então a secretária administra também.
 */
@RestController
@RequestMapping("/api/agenda")
public class AvailabilityController {

    private final AvailabilityService availabilityService;

    public AvailabilityController(AvailabilityService availabilityService) {
        this.availabilityService = availabilityService;
    }

    // ---- Janelas -----------------------------------------------------------

    @GetMapping("/janelas")
    public List<AvailabilityWindowDto> listWindows(@AuthenticationPrincipal(expression = "doctorId") UUID doctorId) {
        return availabilityService.listWindows(doctorId);
    }

    @PostMapping("/janelas")
    @ResponseStatus(HttpStatus.CREATED)
    public AvailabilityWindowDto createWindow(@AuthenticationPrincipal(expression = "doctorId") UUID doctorId,
            @Valid @RequestBody CreateAvailabilityWindowRequest request) {
        return availabilityService.createWindow(doctorId, request);
    }

    /** Período da janela: encerrar, adiantar o começo ou reabrir. */
    @PatchMapping("/janelas/{windowId}")
    public AvailabilityWindowDto updateWindow(@AuthenticationPrincipal(expression = "doctorId") UUID doctorId,
            @PathVariable UUID windowId, @Valid @RequestBody UpdateAvailabilityWindowRequest request) {
        return availabilityService.updateWindow(doctorId, windowId, request);
    }

    @DeleteMapping("/janelas/{windowId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteWindow(@AuthenticationPrincipal(expression = "doctorId") UUID doctorId,
            @PathVariable UUID windowId) {
        availabilityService.deleteWindow(doctorId, windowId);
    }

    @PostMapping("/janelas/{windowId}/faixas")
    @ResponseStatus(HttpStatus.CREATED)
    public AvailabilityRuleDto addRule(@AuthenticationPrincipal(expression = "doctorId") UUID doctorId,
            @PathVariable UUID windowId, @Valid @RequestBody CreateAvailabilityRuleRequest request) {
        return availabilityService.addRule(doctorId, windowId, request);
    }

    /** Edita a faixa no lugar — dia da semana e horário. */
    @PutMapping("/janelas/{windowId}/faixas/{ruleId}")
    public AvailabilityRuleDto updateRule(@AuthenticationPrincipal(expression = "doctorId") UUID doctorId,
            @PathVariable UUID windowId, @PathVariable UUID ruleId,
            @Valid @RequestBody CreateAvailabilityRuleRequest request) {
        return availabilityService.updateRule(doctorId, windowId, ruleId, request);
    }

    @DeleteMapping("/janelas/{windowId}/faixas/{ruleId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteRule(@AuthenticationPrincipal(expression = "doctorId") UUID doctorId,
            @PathVariable UUID windowId, @PathVariable UUID ruleId) {
        availabilityService.deleteRule(doctorId, windowId, ruleId);
    }

    // ---- Bloqueios ---------------------------------------------------------

    @GetMapping("/bloqueios")
    public List<AvailabilityBlockDto> listBlocks(@AuthenticationPrincipal(expression = "doctorId") UUID doctorId) {
        return availabilityService.listBlocks(doctorId);
    }

    @PostMapping("/bloqueios")
    @ResponseStatus(HttpStatus.CREATED)
    public AvailabilityBlockDto createBlock(@AuthenticationPrincipal(expression = "doctorId") UUID doctorId,
            @Valid @RequestBody CreateAvailabilityBlockRequest request) {
        return availabilityService.createBlock(doctorId, request);
    }

    @DeleteMapping("/bloqueios/{blockId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteBlock(@AuthenticationPrincipal(expression = "doctorId") UUID doctorId,
            @PathVariable UUID blockId) {
        availabilityService.deleteBlock(doctorId, blockId);
    }

    // ---- Horários ----------------------------------------------------------

    /**
     * Horários livres para um atendimento do tipo pedido — o tamanho de cada
     * um é a duração configurada para esse tipo. Sem {@code de}/{@code ate},
     * devolve a mesma grade que o paciente vê no link; com o intervalo, os
     * livres dele a partir de agora, sem a antecedência mínima do paciente
     * (o consultório pode encaixar alguém daqui a uma hora).
     */
    @GetMapping("/horarios")
    public List<AvailabilitySlotDto> slots(@AuthenticationPrincipal(expression = "doctorId") UUID doctorId,
            @RequestParam(defaultValue = "PRIMEIRA_CONSULTA") AppointmentType tipo,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant de,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant ate) {
        if (de != null && ate != null) {
            return availabilityService.slotsFromNow(doctorId, tipo, de, ate);
        }
        return availabilityService.openSlots(doctorId, tipo);
    }

    // ---- Durações por tipo -------------------------------------------------

    @GetMapping("/duracoes")
    public AppointmentDurationsDto durations(@AuthenticationPrincipal(expression = "doctorId") UUID doctorId) {
        return availabilityService.durations(doctorId);
    }

    @PutMapping("/duracoes")
    public AppointmentDurationsDto updateDurations(@AuthenticationPrincipal(expression = "doctorId") UUID doctorId,
            @Valid @RequestBody UpdateAppointmentDurationsRequest request) {
        return availabilityService.updateDurations(doctorId, request);
    }
}
