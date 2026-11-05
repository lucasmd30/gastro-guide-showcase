package com.gastroguide.medicalrecord;

import java.util.List;
import java.util.stream.Stream;

/**
 * Um campo do motor de prontuário — usado tanto pela config de doença
 * ({@link DiseaseRegistry}) quanto pelas seções genéricas de consulta
 * ({@link ConsultationSectionRegistry}).
 *
 * <p>Os atributos {@code section}, {@code subsection}, {@code rowLabel},
 * {@code inline} e {@code style} são puramente de renderização: agrupam e
 * apresentam campos numa lista <b>plana</b>, sem aninhar nada. É de
 * propósito — validação, persistência e o documento CFM percorrem a lista
 * plana, então um marcador de agrupamento não obriga nenhum deles a
 * achatar árvore.
 */
public record DiseaseField(
        String key,
        String label,
        DiseaseFieldType type,
        List<String> options,
        String placeholder,
        Integer rows,
        String hint,
        String section,
        String subsection,
        String rowLabel,
        Boolean inline,
        DiseaseFieldStyle style,
        String suffix,
        List<TableColumn> columns,
        List<LinkItem> links,
        List<ShowIf> showIf,
        /** Texto que um clique preenche (o botão "Nega" dos antecedentes). Nulo = sem atalho. */
        String quickFill,
        /** Campo COMPUTED: a conta e os campos que a alimentam. Nulo nos demais. */
        Computed computed,
        /** Rótulo que muda conforme a opção escolhida em outro campo. Nulo = rótulo fixo. */
        DynamicLabel dynamicLabel) {

    /** Coluna de um campo TABLE (linhas repetíveis, ex.: seguimento laboratorial). */
    public record TableColumn(String key, String label, String placeholder) {
    }

    /** Link de referência estático de um campo LINKS — não é dado do paciente, é conteúdo do config. */
    public record LinkItem(String label, String url) {
    }

    /**
     * Visibilidade condicional: mostra o campo só se o campo {@code key}
     * tiver um valor entre {@code equals} (campo SINGLE) ou tiver
     * interseção com {@code includes} (campo MULTI). Puramente uma
     * preocupação de UI — o backend não a impõe na validação (frontend
     * decide o que renderizar; validação continua checando só "chave
     * conhecida + valor entre as opções", sem depender do estado de outros
     * campos). Um campo pode acumular mais de uma condição — todas
     * precisam casar (E lógico) —, que é como um campo dentro de um grupo
     * condicional herda a condição do grupo sem perder a sua.
     *
     * <p>Invariante coberta por teste: um {@code includes} só faz sentido
     * apontando para um campo MULTI. Apontar para um SINGLE nunca casa
     * (string não é array), e foi exatamente esse engano que deixou os
     * campos condicionais de DRGE e DII inalcançáveis por toda a Fase 0.
     */
    public record ShowIf(String key, List<String> equals, List<String> includes) {
    }

    /**
     * Conta feita na tela a partir de outros campos do mesmo formulário
     * ({@code inputs}, na ordem que a conta espera). {@code formula} é o nome
     * de uma conta conhecida pelo frontend (`lib/computed-fields.ts`): "fib4",
     * "sum". Como o IMC, o resultado não é gravado — é recalculado dos campos
     * de entrada, na tela e no documento. Com {@code applyTo}, a tela oferece
     * "Usar resultado", que copia o valor para esse campo (o PREVENT no
     * "Risco 10 anos").
     */
    public record Computed(String formula, List<String> inputs, String applyTo) {
    }

    /**
     * Rótulo que acompanha a opção escolhida no campo {@code key} (ex.: a
     * caixa de anotações da HAI vira "Escore simplificado…" ou "Escore
     * original…"). Só apresentação; quem esconde o campo antes da escolha é o
     * {@code showIf}.
     */
    public record DynamicLabel(String key, java.util.Map<String, String> labels) {
    }

    private static DiseaseField base(String key, String label, DiseaseFieldType type) {
        return new DiseaseField(key, label, type, null, null, null, null, null, null, null, null, null, null, null,
                null, null, null, null, null);
    }

    public static DiseaseField single(String key, String label, List<String> options) {
        return base(key, label, DiseaseFieldType.SINGLE).options(options);
    }

    public static DiseaseField multi(String key, String label, List<String> options) {
        return base(key, label, DiseaseFieldType.MULTI).options(options);
    }

    public static DiseaseField text(String key, String label) {
        return base(key, label, DiseaseFieldType.TEXT);
    }

    public static DiseaseField text(String key, String label, String placeholder) {
        return base(key, label, DiseaseFieldType.TEXT).placeholder(placeholder);
    }

    public static DiseaseField textRows(String key, String label, int rows) {
        return base(key, label, DiseaseFieldType.TEXT).rows(rows);
    }

    public static DiseaseField textRows(String key, String label, int rows, String placeholder) {
        return base(key, label, DiseaseFieldType.TEXT).rows(rows).placeholder(placeholder);
    }

    public static DiseaseField number(String key, String label) {
        return base(key, label, DiseaseFieldType.NUMBER);
    }

    public static DiseaseField number(String key, String label, String suffix) {
        return base(key, label, DiseaseFieldType.NUMBER).suffix(suffix);
    }

    public static DiseaseField table(String key, String label, List<TableColumn> columns) {
        return new DiseaseField(key, label, DiseaseFieldType.TABLE, null, null, null, null, null, null, null, null,
                null, null, columns, null, null, null, null, null);
    }

    public static DiseaseField links(String key, String label, List<LinkItem> links) {
        return new DiseaseField(key, label, DiseaseFieldType.LINKS, null, null, null, null, null, null, null, null,
                null, null, null, links, null, null, null, null);
    }

    /**
     * Valor calculado a partir de outros campos — somente leitura, nunca
     * gravado (o backend recusa valor nele, como num NOTE).
     */
    public static DiseaseField computed(String key, String label, String formula, List<String> inputs) {
        return computed(key, label, formula, inputs, null);
    }

    public static DiseaseField computed(String key, String label, String formula, List<String> inputs, String applyTo) {
        return new DiseaseField(key, label, DiseaseFieldType.COMPUTED, null, null, null, null, null, null, null, null,
                null, null, null, null, null, null, new Computed(formula, inputs, applyTo), null);
    }

    /** Aviso clínico somente-leitura embutido na seção certa (ex.: contraindicação) — texto vem do config, nunca do paciente. */
    public static DiseaseField note(String key, String text) {
        return base(key, text, DiseaseFieldType.NOTE);
    }

    public DiseaseField options(List<String> newOptions) {
        return new DiseaseField(key, label, type, newOptions, placeholder, rows, hint, section, subsection, rowLabel,
                inline, style, suffix, columns, links, showIf, quickFill, computed, dynamicLabel);
    }

    public DiseaseField placeholder(String newPlaceholder) {
        return new DiseaseField(key, label, type, options, newPlaceholder, rows, hint, section, subsection, rowLabel,
                inline, style, suffix, columns, links, showIf, quickFill, computed, dynamicLabel);
    }

    public DiseaseField rows(int newRows) {
        return new DiseaseField(key, label, type, options, placeholder, newRows, hint, section, subsection, rowLabel,
                inline, style, suffix, columns, links, showIf, quickFill, computed, dynamicLabel);
    }

    public DiseaseField hint(String newHint) {
        return new DiseaseField(key, label, type, options, placeholder, rows, newHint, section, subsection, rowLabel,
                inline, style, suffix, columns, links, showIf, quickFill, computed, dynamicLabel);
    }

    public DiseaseField section(String newSection) {
        return new DiseaseField(key, label, type, options, placeholder, rows, hint, newSection, subsection, rowLabel,
                inline, style, suffix, columns, links, showIf, quickFill, computed, dynamicLabel);
    }

    /** Subtítulo dentro de uma seção (ex.: "Hábitos" dentro de "Anamnese & antecedentes"). */
    public DiseaseField subsection(String newSubsection) {
        return new DiseaseField(key, label, type, options, placeholder, rows, hint, section, newSubsection, rowLabel,
                inline, style, suffix, columns, links, showIf, quickFill, computed, dynamicLabel);
    }

    /** Campos consecutivos com o mesmo rowLabel são renderizados lado a lado, sob esse rótulo. */
    public DiseaseField rowLabel(String newRowLabel) {
        return new DiseaseField(key, label, type, options, placeholder, rows, hint, section, subsection, newRowLabel,
                inline, style, suffix, columns, links, showIf, quickFill, computed, dynamicLabel);
    }

    /** Rótulo e opções na mesma linha (o {@code inline: true} do protótipo). */
    public DiseaseField inlined() {
        return new DiseaseField(key, label, type, options, placeholder, rows, hint, section, subsection, rowLabel,
                true, style, suffix, columns, links, showIf, quickFill, computed, dynamicLabel);
    }

    public DiseaseField style(DiseaseFieldStyle newStyle) {
        return new DiseaseField(key, label, type, options, placeholder, rows, hint, section, subsection, rowLabel,
                inline, newStyle, suffix, columns, links, showIf, quickFill, computed, dynamicLabel);
    }

    /** Pílulas em vez de bolinha — hábitos e suplementos (Sim/Não). */
    public DiseaseField buttons() {
        return style(DiseaseFieldStyle.BUTTONS);
    }

    public DiseaseField suffix(String newSuffix) {
        return new DiseaseField(key, label, type, options, placeholder, rows, hint, section, subsection, rowLabel,
                inline, style, newSuffix, columns, links, showIf, quickFill, computed, dynamicLabel);
    }

    /**
     * Atalho de preenchimento ao lado do rótulo — o botão "Nega" dos
     * antecedentes no protótipo. Só apresentação: o valor gravado é o texto
     * comum, então validação e documento não mudam.
     */
    public DiseaseField quickFill(String text) {
        return new DiseaseField(key, label, type, options, placeholder, rows, hint, section, subsection, rowLabel,
                inline, style, suffix, columns, links, showIf, text, computed, dynamicLabel);
    }

    public DiseaseField showIfEquals(String targetKey, String... values) {
        return plus(new ShowIf(targetKey, List.of(values), null));
    }

    public DiseaseField showIfIncludes(String targetKey, List<String> values) {
        return plus(new ShowIf(targetKey, null, values));
    }

    /** Rótulo conforme a opção de {@code targetKey}; aparece só depois da escolha (showIf nas opções do mapa). */
    public DiseaseField dynamicLabel(String targetKey, java.util.Map<String, String> labels) {
        DiseaseField withLabel = new DiseaseField(key, label, type, options, placeholder, rows, hint, section,
                subsection, rowLabel, inline, style, suffix, columns, links, showIf, quickFill, computed,
                new DynamicLabel(targetKey, labels));
        return withLabel.plus(new ShowIf(targetKey, List.copyOf(labels.keySet()), null));
    }

    /** Linha compacta: rótulo cinza e opções logo ao lado (os itens da biópsia hepática). */
    public DiseaseField compact() {
        return style(DiseaseFieldStyle.COMPACT);
    }

    /**
     * Linha de uma tabela de escolha: campos SINGLE seguidos com este estilo
     * viram uma tabela só, uma linha por campo e uma coluna por opção, como a
     * estratificação de risco da CBP no protótipo. {@code headers} são os
     * títulos das colunas (vão no primeiro campo da tabela) e {@code domain},
     * a legenda pequena sob o nome da linha.
     */
    public DiseaseField choiceRow(String domain, String... headers) {
        DiseaseField row = style(DiseaseFieldStyle.CHOICE_TABLE).placeholder(domain);
        if (headers.length == 0) {
            return row;
        }
        List<TableColumn> cols = java.util.Arrays.stream(headers).map(h -> new TableColumn(h, h, null)).toList();
        return new DiseaseField(row.key, row.label, row.type, row.options, row.placeholder, row.rows, row.hint,
                row.section, row.subsection, row.rowLabel, row.inline, row.style, row.suffix, cols, row.links,
                row.showIf, row.quickFill, row.computed, row.dynamicLabel);
    }

    /** Acumula condições: um campo dentro de um grupo condicional herda a condição do grupo e mantém a sua. */
    private DiseaseField plus(ShowIf condition) {
        List<ShowIf> next = showIf == null
                ? List.of(condition)
                : Stream.concat(showIf.stream(), Stream.of(condition)).toList();
        return new DiseaseField(key, label, type, options, placeholder, rows, hint, section, subsection, rowLabel,
                inline, style, suffix, columns, links, next, quickFill, computed, dynamicLabel);
    }
}
