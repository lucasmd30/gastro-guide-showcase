package com.gastroguide.appointment.dto;

import com.gastroguide.appointment.Appointment;
import com.gastroguide.appointment.AppointmentBilling;
import com.gastroguide.appointment.AppointmentModality;
import com.gastroguide.appointment.AppointmentStatus;
import com.gastroguide.appointment.AppointmentType;

import java.time.Instant;

public record AppointmentDto(
        String id, String patientId, String patientName, Instant scheduledAt, int durationMin,
        AppointmentType type, AppointmentModality modality, AppointmentBilling billing, String healthPlan,
        /** Valor do particular, em centavos; nulo fora do particular ou sem valor informado. */
        Integer priceCents,
        AppointmentStatus status, String notes,
        /** Marcado de propósito sobre outro agendamento. */
        boolean encaixe,
        Instant createdAt, Instant updatedAt) {
    public static AppointmentDto from(Appointment appointment) {
        return new AppointmentDto(
                appointment.getId().toString(),
                appointment.getPatient().getId().toString(),
                appointment.getPatient().getName(),
                appointment.getScheduledAt(),
                appointment.getDurationMin(),
                appointment.getType(),
                appointment.getModality(),
                appointment.getBilling(),
                appointment.getHealthPlan(),
                appointment.getPriceCents(),
                appointment.getStatus(),
                appointment.getNotes(),
                appointment.isEncaixe(),
                appointment.getCreatedAt(),
                appointment.getUpdatedAt());
    }
}
