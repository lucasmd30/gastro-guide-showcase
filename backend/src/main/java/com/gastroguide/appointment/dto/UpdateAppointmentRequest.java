package com.gastroguide.appointment.dto;

import com.gastroguide.appointment.AppointmentBilling;
import com.gastroguide.appointment.AppointmentModality;
import com.gastroguide.appointment.AppointmentStatus;
import com.gastroguide.appointment.AppointmentType;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;

import java.time.Instant;

/**
 * Campos nulos não mudam. {@code billing}, {@code healthPlan} e
 * {@code priceCents} vão juntos: mandar {@code billing} redefine os três (o
 * plano some fora do convênio, o valor some fora do particular, e valor
 * nulo no particular é "sem valor"). {@code encaixe} nulo mantém o que o
 * agendamento já é.
 */
public record UpdateAppointmentRequest(
        Instant scheduledAt, AppointmentType type, AppointmentModality modality, AppointmentStatus status,
        AppointmentBilling billing, @Size(max = 120) String healthPlan,
        @Min(0) @Max(10_000_000) Integer priceCents,
        String notes,
        Boolean encaixe) {
}
