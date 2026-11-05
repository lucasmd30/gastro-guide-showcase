package com.gastroguide.patient.intake.dto;

import com.gastroguide.appointment.AppointmentBilling;
import com.gastroguide.appointment.AppointmentType;

import java.time.Instant;

/** Confirmação mostrada ao paciente depois de agendar. */
public record ScheduledConsultationDto(Instant scheduledAt, int durationMin, AppointmentType type,
        String doctorName, String patientName, AppointmentBilling billing, String healthPlan) {
}
