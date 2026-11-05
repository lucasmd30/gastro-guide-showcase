package com.gastroguide.availability.dto;

import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;

/**
 * Período da janela. Manda sempre os dois campos — {@code endDate} nulo é
 * "sem data de fim", e não "não mexer": com um campo opcional não daria para
 * distinguir os dois, e reabrir uma janela encerrada ficaria impossível.
 */
public record UpdateAvailabilityWindowRequest(@NotNull LocalDate startDate, LocalDate endDate) {
}
