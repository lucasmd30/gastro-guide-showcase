package com.gastroguide.availability.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record UpdateAppointmentDurationsRequest(
        @NotNull @Min(5) @Max(240) Integer firstVisitMinutes,
        @NotNull @Min(5) @Max(240) Integer followUpMinutes,
        /** Valor padrão do particular, em centavos. Nulo = sem padrão (os dois vão sempre juntos). */
        @Min(0) @Max(10_000_000) Integer firstVisitPriceCents,
        @Min(0) @Max(10_000_000) Integer followUpPriceCents) {
}
