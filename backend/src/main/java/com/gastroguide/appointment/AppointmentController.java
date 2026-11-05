package com.gastroguide.appointment;

import com.gastroguide.appointment.dto.AppointmentDto;
import com.gastroguide.appointment.dto.CreateAppointmentRequest;
import com.gastroguide.appointment.dto.UpdateAppointmentRequest;
import com.gastroguide.doctor.DoctorHealthPlanService;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/agenda")
public class AppointmentController {

    private final AppointmentService appointmentService;
    private final DoctorHealthPlanService healthPlanService;

    public AppointmentController(AppointmentService appointmentService, DoctorHealthPlanService healthPlanService) {
        this.appointmentService = appointmentService;
        this.healthPlanService = healthPlanService;
    }

    /**
     * Os convênios que o médico cadastrou no perfil, para o "Plano" da
     * agenda. Fica sob /api/agenda (e não só em /api/medicos/me/convenios,
     * que é exclusivo do médico) porque quem marca pela agenda costuma ser a
     * secretária. Só leitura: a lista continua sendo do médico.
     */
    @GetMapping("/convenios")
    public List<String> healthPlans(@AuthenticationPrincipal(expression = "doctorId") UUID doctorId) {
        return healthPlanService.names(doctorId);
    }

    @GetMapping
    public List<AppointmentDto> list(
            @AuthenticationPrincipal(expression = "doctorId") UUID doctorId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant to) {
        return appointmentService.list(doctorId, from, to);
    }

    @PostMapping
    public AppointmentDto create(@AuthenticationPrincipal(expression = "doctorId") UUID doctorId,
                                  @Valid @RequestBody CreateAppointmentRequest request) {
        return appointmentService.create(doctorId, request);
    }

    @PutMapping("/{appointmentId}")
    public AppointmentDto update(@AuthenticationPrincipal(expression = "doctorId") UUID doctorId,
                                  @PathVariable UUID appointmentId,
                                  @Valid @RequestBody UpdateAppointmentRequest request) {
        return appointmentService.update(doctorId, appointmentId, request);
    }

    @DeleteMapping("/{appointmentId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@AuthenticationPrincipal(expression = "doctorId") UUID doctorId,
                        @PathVariable UUID appointmentId) {
        appointmentService.delete(doctorId, appointmentId);
    }
}
