package com.gastroguide.availability.dto;

import java.time.Instant;

/** Um horário livre da grade — {@code durationMin} vem do slot da faixa que o gerou. */
public record AvailabilitySlotDto(Instant scheduledAt, int durationMin) {
}
