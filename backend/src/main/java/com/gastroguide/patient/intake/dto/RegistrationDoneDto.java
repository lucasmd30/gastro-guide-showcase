package com.gastroguide.patient.intake.dto;

/**
 * Confirmação do link de cadastro. {@code upcoming} só vem quando o link é
 * do próprio paciente (gerado da ficha ou da agenda) — num link sem
 * paciente, a resposta não pode revelar nada de um cadastro que já existia.
 */
public record RegistrationDoneDto(String doctorName, String patientName, UpcomingConsultationDto upcoming) {
}
