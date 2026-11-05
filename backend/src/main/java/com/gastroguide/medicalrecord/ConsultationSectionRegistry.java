package com.gastroguide.medicalrecord;

import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import static com.gastroguide.medicalrecord.DiseaseField.single;
import static com.gastroguide.medicalrecord.DiseaseField.text;
import static com.gastroguide.medicalrecord.DiseaseField.textRows;

/**
 * Campos de consulta que se aplicam a qualquer registro, independente de
 * doença — anamnese, antecedentes, hábitos, antropometria, exame físico.
 * Não é configuração de doença (por isso não vive em DiseaseRegistry): é
 * config por tipo de registro.
 *
 * <p>Estrutura transcrita de
 * {@code frontend-lovable-reference/src/components/DiseaseConsultaPage.tsx}
 * (primeira consulta) e {@code DiseaseRetornoPage.tsx} (retorno/evolução),
 * incluindo o agrupamento visual: no protótipo, hábitos, suplementos e
 * antropometria vivem <b>dentro</b> do card "Anamnese &amp; antecedentes",
 * como subtítulos, e o exame físico é um card à parte. Fica de fora tudo
 * que depende de IA (transcrição, extração de exames, resumo de retorno) e
 * o que é feature própria maior (pedido de exames, calculadoras).
 */
public final class ConsultationSectionRegistry {

    private static final String ANAMNESE = "Anamnese & antecedentes";
    private static final String EXAME_FISICO = "Exame físico";
    private static final String HIPOTESE_CONDUTA = "Hipótese diagnóstica e conduta";

    private static final String HABITOS = "Hábitos";
    /**
     * No protótipo este bloco só aparece em doenças de Hepatologia
     * ({@code config.specialty === "hepato"}). O filtro é do frontend, como
     * todo {@code showIf}: a validação aqui é por tipo de registro, não por
     * doença, e amarrar as duas configs não traria ganho nenhum.
     */
    public static final String SUPLEMENTOS = "Suplementos, chás, fitoterápicos, fórmulas, hormonal e AINEs";
    private static final String ANTROPOMETRIA = "Antropometria";

    private static final List<String> SIM_NAO = List.of("Sim", "Não");
    private static final List<String> MODOS = List.of("Normal", "Alterado", "Não realizado");

    /** O atalho dos antecedentes no protótipo: um clique grava "Nega" no campo. */
    private static final String NEGA = "Nega";

    private static final List<DiseaseField> ANAMNESE_ANTECEDENTES = List.of(
            textRows("hma", "HMA — História da moléstia atual", 2).section(ANAMNESE),
            textRows("ap", "AP — Antecedentes pessoais / comorbidades", 2).section(ANAMNESE).quickFill(NEGA),
            textRows("internacao", "Internações prévias", 2).section(ANAMNESE).quickFill(NEGA),
            textRows("med", "MED — Medicações em uso", 2).section(ANAMNESE).quickFill(NEGA),
            textRows("alergia", "Alergias", 2).section(ANAMNESE).quickFill(NEGA),
            textRows("af", "AF — Antecedentes familiares", 2).section(ANAMNESE).quickFill(NEGA),
            textRows("cirurgia", "Cirurgias prévias", 2).section(ANAMNESE).quickFill(NEGA));

    /**
     * "Exames" (era "Exames anexados/transcritos pelo paciente") vem logo
     * antes da antropometria, a pedido da cliente. A chave continua
     * {@code examesAnexados} — é o que registros já gravados usam, e o rótulo
     * é só apresentação.
     */
    private static final List<DiseaseField> EXAMES_FIELDS = List.of(
            textRows("examesAnexados", "Exames", 3,
                    "Exames trazidos pelo paciente, laudos, resultados…").section(ANAMNESE));

    /** Par "Sim/Não + detalhe" — o detalhe só aparece no "Sim", como o YesNoText do protótipo. */
    private static List<DiseaseField> simNaoComDetalhe(String key, String label, String subsection,
            String placeholder) {
        return List.of(
                single(key, label, SIM_NAO).buttons().inlined().section(ANAMNESE).subsection(subsection),
                textRows(key + "Detalhe", label + " — detalhe", 2, placeholder)
                        .section(ANAMNESE).subsection(subsection)
                        .showIfEquals(key, "Sim"));
    }

    /** O "Sim" do álcool abre, além do detalhe, a calculadora de dose (como no YesNoText do protótipo). */
    private static List<DiseaseField> alcool() {
        List<DiseaseField> par = simNaoComDetalhe("alcool", "Álcool", HABITOS,
                "Tipo, quantidade (g/dia), frequência, tempo de uso.");
        return List.of(par.get(0), par.get(1).style(DiseaseFieldStyle.ALCOHOL_CALCULATOR));
    }

    private static final List<DiseaseField> HABITOS_FIELDS = concat(
            alcool(),
            simNaoComDetalhe("tabagismo", "Tabagismo", HABITOS, "Maços/ano, tempo, ex-tabagista?"),
            simNaoComDetalhe("exercicio", "Atividade física", HABITOS, "Modalidade, frequência, duração."));

    private static final List<DiseaseField> SUPLEMENTOS_FIELDS = concat(
            simNaoComDetalhe("suplementos", "Suplementos", SUPLEMENTOS, "Quais suplementos? Há quanto tempo?"),
            simNaoComDetalhe("chas", "Chás", SUPLEMENTOS, "Quais chás? Há quanto tempo?"),
            simNaoComDetalhe("fitoterapicos", "Fitoterápicos", SUPLEMENTOS, "Quais fitoterápicos? Há quanto tempo?"),
            simNaoComDetalhe("hormonal", "Reposição hormonal", SUPLEMENTOS,
                    "Qual reposição hormonal? Há quanto tempo?"),
            simNaoComDetalhe("aines", "AINEs (uso regular)", SUPLEMENTOS, "Quais aines (uso regular)? Há quanto tempo?"),
            simNaoComDetalhe("formulas", "Fórmulas manipuladas", SUPLEMENTOS,
                    "Quais fórmulas manipuladas? Há quanto tempo?"));

    /** Peso e altura lado a lado; o IMC é derivado e calculado no formulário, nunca persistido. */
    private static final List<DiseaseField> ANTROPOMETRIA_FIELDS = List.of(
            text("peso", "Peso (kg)").section(ANAMNESE).subsection(ANTROPOMETRIA).rowLabel(ANTROPOMETRIA),
            text("altura", "Altura (cm)").section(ANAMNESE).subsection(ANTROPOMETRIA).rowLabel(ANTROPOMETRIA));

    /** Região do exame físico: o modo (Normal/Alterado/Não realizado) e o campo de achados que o acompanha. */
    private static List<DiseaseField> regiao(String key, String label, String normal) {
        return List.of(
                single(key, label, MODOS).style(DiseaseFieldStyle.EXAM_MODE).inlined().section(EXAME_FISICO),
                textRows(key + "Achados", label + " — achados", 2, normal)
                        .style(DiseaseFieldStyle.EXAM_FINDINGS).section(EXAME_FISICO)
                        .showIfEquals(key, "Normal", "Alterado"));
    }

    private static final String SINAIS_VITAIS = "Sinais vitais";

    /**
     * Sinais vitais numa linha só, abrindo o exame físico (pedido da
     * cliente). Texto e não número: PA se escreve "120/80". Retorno e
     * evolução usam as mesmas chaves, então o documento imprime igual nos
     * três tipos.
     */
    private static List<DiseaseField> sinaisVitais(String section) {
        return Stream.of(
                        text("pa", "PA (mmHg)", "120/80"),
                        text("fc", "FC (bpm)"),
                        text("fr", "FR (irpm)"),
                        text("satO2", "SatO₂ (%)"))
                .map(f -> section == null ? f.rowLabel(SINAIS_VITAIS) : f.section(section).rowLabel(SINAIS_VITAIS))
                .toList();
    }

    private static final List<DiseaseField> EXAME_FISICO_FIELDS = concat(
            sinaisVitais(EXAME_FISICO),
            regiao("exGeral", "Geral",
                    "BEG, LOTE, hidratado, acianótico, anictérico, afebril, eupneico em ar ambiente."),
            regiao("exCabeca", "Cabeça e pescoço",
                    "Mucosas coradas; sem linfonodomegalias; tireoide impalpável; sem estase jugular."),
            regiao("exRespiratorio", "Respiratório",
                    "Tórax simétrico; MV+ bilateralmente sem ruídos adventícios."),
            regiao("exCardio", "Cardiovascular",
                    "RCR 2T BNF sem sopros; pulsos periféricos cheios e simétricos."),
            regiao("exAbdome", "Abdome",
                    "Plano, flácido, indolor à palpação; RHA+; fígado e baço impalpáveis; sem sinais de ascite; "
                            + "Murphy/Blumberg negativos."),
            regiao("exMmii", "Membros inferiores",
                    "Sem edema; panturrilhas livres; pulsos pediosos presentes e simétricos."),
            regiao("exNeuro", "Neurológico",
                    "Vigil, orientado em tempo e espaço; sem flapping; sem déficits focais."),
            List.of(textRows("exEspecifico",
                    "Exame físico específico realizado (manobras, escores, achados dirigidos)", 3,
                    "Ex.: Murphy positivo, Blumberg negativo, sinal do piparote presente, toque retal, "
                            + "exame perianal…").section(EXAME_FISICO)));

    /**
     * Hipótese diagnóstica saiu da anamnese e passou a abrir o último card,
     * junto da conduta (pedido da cliente): é a conclusão do atendimento, não
     * mais um campo no meio dos antecedentes. As duas chaves continuam as
     * mesmas, então registro já gravado segue imprimindo igual.
     */
    private static final List<DiseaseField> HIPOTESE_CONDUTA_FIELDS = List.of(
            textRows("hipotese", "Hipótese diagnóstica", 3).section(HIPOTESE_CONDUTA),
            textRows("conduta", "Conduta", 5,
                    "Plano terapêutico, exames solicitados, retorno, orientações…").section(HIPOTESE_CONDUTA));

    private static final List<DiseaseField> PRIMEIRA_CONSULTA = concat(
            ANAMNESE_ANTECEDENTES, HABITOS_FIELDS, SUPLEMENTOS_FIELDS, EXAMES_FIELDS, ANTROPOMETRIA_FIELDS,
            EXAME_FISICO_FIELDS,
            HIPOTESE_CONDUTA_FIELDS);

    /**
     * Retorno: os campos sem seção formam o card "Retorno" (o frontend o
     * nomeia pelo tipo do registro), e hipótese/conduta passaram ao card
     * "Hipótese diagnóstica e conduta", depois das escalas, como na consulta
     * (pedido de 14/10/2026). Só a seção mudou — as chaves são as de sempre,
     * então retorno já gravado imprime igual.
     */
    private static final List<DiseaseField> RETORNO = concat(
            List.of(
                    textRows("queixa", "Queixa principal hoje", 2),
                    textRows("evolucao", "Evolução desde a última consulta", 3),
                    textRows("adesao", "Adesão & efeitos adversos das medicações", 2),
                    textRows("alergia", "Alergias (medicamentos, alimentos, contrastes)", 2),
                    textRows("habito", "Hábitos / dieta / álcool / peso", 2)),
            sinaisVitais(null),
            List.of(
                    textRows("exameFisico", "Exame físico dirigido", 3),
                    textRows("novosExames", "Avaliação dos exames trazidos / solicitados", 3),
                    textRows("hipotese", "Hipótese / estadiamento atualizados", 2).section(HIPOTESE_CONDUTA),
                    textRows("conduta", "Conduta hoje", 4).section(HIPOTESE_CONDUTA)));

    private static final String EVOLUCAO = "Evolução";

    /**
     * Evolução deixou de ser igual ao retorno (pedido de 14/10/2026): quatro
     * cards — "Evolução" (evolução desde a última consulta, medicações,
     * hábitos, suplementos, exames e antropometria), o exame físico da
     * consulta, escalas e "Hipótese diagnóstica e conduta". Tudo reaproveita
     * os campos da consulta, só trocando a seção; as chaves são as mesmas,
     * então o documento imprime evolução e consulta do mesmo jeito.
     */
    private static final List<DiseaseField> EVOLUCAO_FIELDS = concat(
            List.of(
                    textRows("evolucao", "Evolução desde a última consulta", 3).section(EVOLUCAO),
                    textRows("med", "MED — Medicações em uso", 2).section(EVOLUCAO).quickFill(NEGA)),
            inSection(HABITOS_FIELDS, EVOLUCAO),
            inSection(SUPLEMENTOS_FIELDS, EVOLUCAO),
            inSection(EXAMES_FIELDS, EVOLUCAO),
            inSection(ANTROPOMETRIA_FIELDS, EVOLUCAO),
            EXAME_FISICO_FIELDS,
            HIPOTESE_CONDUTA_FIELDS);

    private static List<DiseaseField> inSection(List<DiseaseField> fields, String section) {
        return fields.stream().map(f -> f.section(section)).toList();
    }

    @SafeVarargs
    private static List<DiseaseField> concat(List<DiseaseField>... groups) {
        return Stream.of(groups).flatMap(List::stream).toList();
    }

    private ConsultationSectionRegistry() {
    }

    public static List<DiseaseField> fieldsFor(MedicalRecordType type) {
        return switch (type) {
            case PRIMEIRA_CONSULTA -> PRIMEIRA_CONSULTA;
            case RETORNO -> RETORNO;
            case EVOLUCAO -> EVOLUCAO_FIELDS;
        };
    }

    /**
     * Os campos de consulta de um registro: os do modelo, quando ele tem um
     * conjunto próprio de primeira consulta (Gastro — Guiada), senão os
     * genéricos do tipo.
     */
    public static List<DiseaseField> fieldsFor(MedicalRecordType type, String diseaseSlug) {
        if (type == MedicalRecordType.PRIMEIRA_CONSULTA && diseaseSlug != null) {
            DiseaseDefinition disease = DiseaseRegistry.ALL.get(diseaseSlug);
            if (disease != null && disease.consultationFields() != null) {
                return disease.consultationFields();
            }
        }
        return fieldsFor(type);
    }

    /**
     * Primeira consulta genérica com campos do modelo encaixados: depois da
     * HMA (a anamnese guiada por sintomas) e depois de "Exames" (exames
     * endoscópicos). É o que a Gastro — Guiada usa, na ordem pedida pela
     * cliente em 13/10/2026.
     */
    public static List<DiseaseField> primeiraConsultaWith(List<DiseaseField> afterHma,
            List<DiseaseField> afterExames) {
        return concat(
                ANAMNESE_ANTECEDENTES.subList(0, 1),
                afterHma.stream().map(f -> f.section(ANAMNESE)).toList(),
                ANAMNESE_ANTECEDENTES.subList(1, ANAMNESE_ANTECEDENTES.size()),
                HABITOS_FIELDS, SUPLEMENTOS_FIELDS, EXAMES_FIELDS,
                afterExames.stream().map(f -> f.section(ANAMNESE)).toList(),
                ANTROPOMETRIA_FIELDS, EXAME_FISICO_FIELDS, HIPOTESE_CONDUTA_FIELDS);
    }

    /**
     * Valida que cada chave em {@code data} corresponde a um campo válido
     * pro tipo de registro, e que valores de campos SINGLE estão entre as
     * opções permitidas — mesma lógica de DiseaseRegistry.validate.
     */
    public static void validate(MedicalRecordType type, Map<String, Object> data) {
        validate(type, null, data);
    }

    public static void validate(MedicalRecordType type, String diseaseSlug, Map<String, Object> data) {
        Map<String, DiseaseField> fieldsByKey = fieldsFor(type, diseaseSlug).stream()
                .collect(Collectors.toMap(DiseaseField::key, f -> f));

        for (Map.Entry<String, Object> entry : data.entrySet()) {
            DiseaseField field = fieldsByKey.get(entry.getKey());
            if (field == null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Campo desconhecido para " + type + ": " + entry.getKey());
            }
            validateValue(field, entry.getValue());
        }
    }

    private static void validateValue(DiseaseField field, Object value) {
        if (value == null) {
            return;
        }
        if (field.type() == DiseaseFieldType.SINGLE) {
            if (!(value instanceof String str) || !field.options().contains(str)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Valor inválido para " + field.key() + ".");
            }
        } else if (field.type() == DiseaseFieldType.MULTI) {
            // Nenhum campo de consulta é MULTI hoje, mas sem este branch o
            // primeiro que for adicionado aceitaria qualquer JSON sem
            // validação nenhuma — achado da revisão final da Fase 0.
            if (!(value instanceof List<?> list)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Valor inválido para " + field.key() + ".");
            }
            for (Object item : list) {
                if (!(item instanceof String str) || !field.options().contains(str)) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                            "Valor inválido para " + field.key() + ".");
                }
            }
        } else if (field.type() == DiseaseFieldType.COMPUTED) {
            // Recalculado a partir dos campos de entrada; nunca é gravado.
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Campo somente leitura: " + field.key() + ".");
        }
        // TEXT: qualquer string é aceita, sem validação de opções.
    }
}
