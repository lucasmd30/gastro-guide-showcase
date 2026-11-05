package com.gastroguide.patient.intake.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;

/**
 * Identificação do paciente que volta pelo link, no fluxo de retorno.
 *
 * <p>Vai no corpo de um POST, nunca na URL: CPF e data de nascimento são
 * dado pessoal, e query string vaza em log de servidor, histórico do
 * navegador e cabeçalho {@code Referer}.
 *
 * <p>A data de nascimento é exigida junto com o CPF de propósito. Só com o
 * CPF, qualquer pessoa de posse do link (que circula por WhatsApp) poderia
 * varrer CPFs e descobrir quem é paciente deste consultório — num
 * consultório de gastro/hepatologia, o próprio vínculo já é informação de
 * saúde. Com dois fatores, acertar por tentativa deixa de ser viável.
 */
public record IdentifyPatientRequest(@NotBlank String cpf, @NotNull LocalDate birthDate) {
}
