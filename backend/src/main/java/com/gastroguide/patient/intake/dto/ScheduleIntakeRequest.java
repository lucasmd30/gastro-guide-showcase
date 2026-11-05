package com.gastroguide.patient.intake.dto;

import com.gastroguide.appointment.AppointmentBilling;
import com.gastroguide.appointment.AppointmentModality;
import com.gastroguide.appointment.AppointmentType;
import com.gastroguide.patient.dto.PatientRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;

import java.time.Instant;

/**
 * Cadastro e horário chegam juntos de propósito: em duas chamadas, um
 * horário tomado no meio do caminho deixaria um paciente cadastrado sem
 * consulta nenhuma.
 *
 * <p>{@code type} é a escolha do paciente entre primeira consulta e retorno
 * (V14). É opcional aqui, e não {@code @NotNull}, porque um link antigo já
 * carrega o tipo no próprio token — nesse caso o cliente não precisa mandar
 * nada. Quem cobra a presença de um dos dois é
 * {@link com.gastroguide.patient.intake.IntakeService#schedule}, que é o
 * único lado que sabe se o token traz tipo.
 *
 * <p>{@code billing} é a escolha do paciente entre particular e convênio, e
 * {@code healthPlan} o convênio, que precisa ser um dos que o médico atende.
 * Também validados no service (cortesia não é opção do paciente).
 */
public record ScheduleIntakeRequest(@NotNull @Valid PatientRequest patient, @NotNull Instant scheduledAt,
        AppointmentType type, AppointmentModality modality, AppointmentBilling billing, String healthPlan) {
}
