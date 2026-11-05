package com.gastroguide.patient.intake;

/**
 * Para que serve o link, escolhido por quem o gera (V20).
 *
 * <p>Mesmo num link de {@link #AGENDAMENTO}, um paciente que já tem consulta
 * futura não recebe calendário — vê a consulta e só completa o cadastro.
 * Essa trava existe para o caso de a secretária ter marcado pela agenda
 * depois de mandar o link.
 */
public enum IntakeLinkPurpose {
    /** O paciente escolhe o horário (e se cadastra, se ainda não tiver cadastro). */
    AGENDAMENTO,
    /** O paciente só preenche o cadastro; o horário, se houver, foi marcado pela clínica. */
    CADASTRO
}
