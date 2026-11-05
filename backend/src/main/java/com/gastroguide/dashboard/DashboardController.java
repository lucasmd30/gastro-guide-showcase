package com.gastroguide.dashboard;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

/** Sob /api/medicos/**, que já é só do médico no SecurityConfig: a distribuição por doença é dado clínico. */
@RestController
@RequestMapping("/api/medicos/me/dashboard")
public class DashboardController {

    private final DashboardService service;

    public DashboardController(DashboardService service) {
        this.service = service;
    }

    @GetMapping
    public DashboardDto dashboard(@AuthenticationPrincipal(expression = "doctorId") UUID doctorId) {
        return service.dashboard(doctorId);
    }
}
