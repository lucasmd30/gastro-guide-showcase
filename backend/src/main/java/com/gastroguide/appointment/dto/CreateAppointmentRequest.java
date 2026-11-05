package com.gastroguide.appointment.dto;

import com.gastroguide.appointment.AppointmentBilling;
import com.gastroguide.appointment.AppointmentModality;
import com.gastroguide.appointment.AppointmentType;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.util.UUID;

public record CreateAppointmentRequest(
        @NotNull UUID patientId,
        @NotNull Instant scheduledAt,
        Integer durationMin,
        @NotNull AppointmentType type,
        /** Ausente vale como presencial — é o caso da maioria. */
        AppointmentModality modality,
        /** Ausente vale como particular. */
        AppointmentBilling billing,
        /** Obrigatório quando {@code billing} é convênio; ignorado nos outros casos. */
        @Size(max = 120) String healthPlan,
        /**
         * Valor do particular, em centavos. Ausente: o padrão do médico para o
         * tipo. Ignorado fora do particular.
         */
        @Min(0) @Max(10_000_000) Integer priceCents,
        String notes,
        /**
         * Encaixe: aceita o horário mesmo que ele se sobreponha a outro
         * agendamento. Ausente vale como não.
         */
        Boolean encaixe) {
}
