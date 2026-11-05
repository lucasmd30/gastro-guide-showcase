package com.gastroguide.availability.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;
import java.util.List;

/** Janela nova já nasce com pelo menos uma faixa — janela vazia não abre horário nenhum. */
public record CreateAvailabilityWindowRequest(
        @NotNull LocalDate startDate,
        LocalDate endDate,
        @NotEmpty List<@Valid CreateAvailabilityRuleRequest> rules) {
}
