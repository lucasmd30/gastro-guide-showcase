package com.gastroguide.patient.intake.dto;

import com.gastroguide.appointment.AppointmentType;
import com.gastroguide.patient.dto.PatientDto;
import com.gastroguide.patient.intake.IntakeLinkPurpose;

import java.util.List;

/**
 * O que o paciente vê ao abrir o link: o cadastro dele, se já existir, o
 * tipo de consulta escolhido por quem gerou o link, e o nome do médico —
 * nada além disso, porque a rota é pública.
 *
 * <p>{@code purpose} {@code CADASTRO}, ou {@code upcoming} preenchido (o
 * paciente já tem consulta marcada), fazem o link pedir só o cadastro, sem
 * calendário.
 *
 * <p>{@code healthPlans} são os convênios que o médico atende ("Meu
 * perfil"): o paciente que escolhe convênio escolhe um destes. Vazio, o link
 * só oferece atendimento particular.
 */
public record IntakeContextDto(PatientDto patient, AppointmentType appointmentType, String doctorName,
        IntakeLinkPurpose purpose, UpcomingConsultationDto upcoming, List<String> healthPlans) {
}
