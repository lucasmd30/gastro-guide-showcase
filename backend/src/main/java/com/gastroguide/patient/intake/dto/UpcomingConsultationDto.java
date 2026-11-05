package com.gastroguide.patient.intake.dto;

import com.gastroguide.appointment.Appointment;
import com.gastroguide.appointment.AppointmentModality;
import com.gastroguide.appointment.AppointmentType;

import java.time.Instant;

/**
 * Consulta futura que o paciente já tem marcada — pela secretária na agenda
 * ou por um link anterior. Quando existe, o link não oferece outro horário:
 * mostra esta e, no máximo, pede para completar o cadastro.
 */
public record UpcomingConsultationDto(Instant scheduledAt, int durationMin, AppointmentType type,
        AppointmentModality modality) {

    public static UpcomingConsultationDto from(Appointment appointment) {
        return new UpcomingConsultationDto(appointment.getScheduledAt(), appointment.getDurationMin(),
                appointment.getType(), appointment.getModality());
    }
}
