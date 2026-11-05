package com.gastroguide.medicalrecord;

/**
 * Como um campo é apresentado. Só afeta renderização — valor persistido e
 * validação são idênticos em todos os casos.
 *
 * <ul>
 * <li>{@code RADIO} (padrão): bolinha/caixinha, usada no cabeçalho de doença.
 * <li>{@code BUTTONS}: pílulas Sim/Não dos hábitos e suplementos.
 * <li>{@code EXAM_MODE}: pílulas Normal/Alterado/Não realizado do exame
 * físico, coloridas por modo.
 * <li>{@code EXAM_FINDINGS}: o campo de achados que acompanha um
 * {@code EXAM_MODE}. Em "Normal" mostra a frase padrão da região (o
 * {@code placeholder} do campo) como texto, sem input; em "Alterado" abre
 * o campo para digitação.
 * <li>{@code COMPACT}: rótulo cinza em caixa normal com as opções logo ao
 * lado — itens de um bloco que já tem título (biópsia hepática).
 * <li>{@code CHOICE_TABLE}: campos SINGLE seguidos com este estilo viram uma
 * tabela (linha = campo, coluna = opção, célula clicável) com selo da pior
 * coluna marcada — a estratificação de risco da CBP.
 * <li>{@code CALCULATOR_PANEL}: campos seguidos com este estilo e o mesmo
 * {@code rowLabel} viram um quadro em grade — os dados de entrada de uma
 * calculadora externa (PREVENT da Esteatose). Um LINKS do grupo vai para o
 * canto do título; um NOTE, para o rodapé.
 * <li>{@code ALCOHOL_CALCULATOR}: campo de texto com a calculadora de dose de
 * álcool logo abaixo — o resultado entra no próprio texto.
 * </ul>
 */
public enum DiseaseFieldStyle {
    RADIO, BUTTONS, EXAM_MODE, EXAM_FINDINGS, COMPACT, CHOICE_TABLE, CALCULATOR_PANEL, ALCOHOL_CALCULATOR
}
