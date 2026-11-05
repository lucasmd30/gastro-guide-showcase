package com.gastroguide.patient.intake.dto;

import java.time.Instant;

public record PatientIntakeLinkDto(String token, Instant expiresAt) {
}
