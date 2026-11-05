package com.gastroguide.patient.intake.dto;

/**
 * Resposta da identificação no fluxo de retorno.
 *
 * <p>Quando não bate, devolve {@code found = false} e nada mais — sem
 * distinguir "CPF não existe" de "data de nascimento errada", mesma
 * convenção genérica do login (ver {@code AuthService}). Quando bate,
 * devolve só nome e CPF: o suficiente pro paciente conferir que é o
 * cadastro dele, e nada de telefone, e-mail, endereço ou dado clínico.
 *
 * <p>{@code upcoming} é a consulta futura que ele já tem, se tiver — aí o
 * link não oferece outro horário. Só sai depois dos dois fatores baterem.
 */
public record IdentifiedPatientDto(boolean found, String name, String cpf, UpcomingConsultationDto upcoming) {

    public static IdentifiedPatientDto notFound() {
        return new IdentifiedPatientDto(false, null, null, null);
    }
}
