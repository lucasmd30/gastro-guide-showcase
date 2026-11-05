package com.gastroguide.availability.dto;

import jakarta.validation.constraints.NotNull;

import java.time.DayOfWeek;
import java.time.LocalTime;

/** Uma faixa de atendimento. Sem duração: quem dá o tamanho do horário é o tipo de atendimento. */
public record CreateAvailabilityRuleRequest(
        @NotNull DayOfWeek weekday,
        @NotNull LocalTime startTime,
        @NotNull LocalTime endTime) {
}
