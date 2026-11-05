package com.gastroguide.availability.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.time.LocalTime;

/** Horas nulas = dia inteiro; as duas juntas ou nenhuma (o service confere). */
public record CreateAvailabilityBlockRequest(
        @NotNull LocalDate startDate,
        @NotNull LocalDate endDate,
        LocalTime startTime,
        LocalTime endTime,
        @Size(max = 200) String reason) {
}
