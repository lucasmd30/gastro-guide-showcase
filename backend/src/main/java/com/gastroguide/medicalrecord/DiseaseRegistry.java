package com.gastroguide.medicalrecord;

import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import static com.gastroguide.medicalrecord.DiseaseField.LinkItem;
import static com.gastroguide.medicalrecord.DiseaseField.computed;
import static com.gastroguide.medicalrecord.DiseaseField.TableColumn;
import static com.gastroguide.medicalrecord.DiseaseField.links;
import static com.gastroguide.medicalrecord.DiseaseField.multi;
import static com.gastroguide.medicalrecord.DiseaseField.note;
import static com.gastroguide.medicalrecord.DiseaseField.number;
import static com.gastroguide.medicalrecord.DiseaseField.single;
import static com.gastroguide.medicalrecord.DiseaseField.table;
import static com.gastroguide.medicalrecord.DiseaseField.text;
import static com.gastroguide.medicalrecord.DiseaseField.textRows;

/**
 * Configuração de todas as doenças da Fase 0 — cada doença é uma
 * configuração sobre o motor genérico de prontuário, não uma feature
 * codada do zero (ver "Decisão arquitetural central" na documentação interna).
 *
 * <p>Conteúdo clínico transcrito do protótipo Lovable, campo a campo:
 * as 10 primeiras doenças de
 * {@code frontend-lovable-reference/src/lib/disease-configs.ts}; CBP, CEP e
 * Esteatose dos componentes que as telas do protótipo de fato renderizam
 * ({@code CbpHeader.tsx}, {@code CepHeader.tsx},
 * {@code EsteatoseHeader.tsx}).
 *
 * <p>Contas embutidas no cabeçalho são campos COMPUTED (FIB-4, NAS, PREVENT,
 * meta de LDL-c, dose de AUDC, risco de reativação da HBV): recalculadas na
 * tela e no documento a partir dos campos de entrada, nunca gravadas (contas
 * em {@code frontend/src/lib/computed-fields.ts}). O escore simplificado da
 * HAI ({@code haiScore}) não está aqui porque virou a escala {@code aihsimple}.
 * Nada de IA existe neste arquivo — IA vive em componentes separados do
 * protótipo, fora do motor de doença.
 */
public final class DiseaseRegistry {

    private static final String OUTROS = "Outros";

    /**
     * A caixa que abre ao marcar "Outros" num campo múltiplo. O rótulo começa
     * com o do campo de propósito: é o que faz o documento imprimir o texto na
     * mesma linha dele, em vez de um "Outros" solto.
     */
    private static DiseaseField outros(String multiKey, String multiLabel) {
        return textRows(multiKey + "Outros", multiLabel + " — outros", 2)
                .showIfIncludes(multiKey, List.of(OUTROS));
    }

    private static final DiseaseDefinition DRGE = new DiseaseDefinition(
            "drge", "Doença do Refluxo Gastroesofágico", "DRGE",
            "Fenótipo, classificação de Los Angeles, escore de Hill, Barrett (Praga + biópsia), pHmetria.",
            DiseaseSpecialty.GASTRO,
            List.of(
                    multi("fenotipo", "Fenótipo DRGE (pode marcar mais de um)", List.of(
                            "DRGE erosiva",
                            "DRGE não erosiva (NERD)",
                            "Esôfago de Barrett",
                            "Hipersensibilidade esofágica",
                            "Pirose funcional")),
                    single("criterio", "Critério diagnóstico", List.of(
                            "Clínico (resposta ao IBP)",
                            "EDA com esofagite LA ≥ A",
                            "pHmetria/impedancio-pHmetria (Lyon 2.0)",
                            "Pendente de exame complementar")),
                    single("los", "Classificação LA (EDA)", List.of("Sem esofagite", "LA-A", "LA-B", "LA-C", "LA-D")),
                    single("hill", "Escore de Hill", List.of("I", "II", "III", "IV"))
                            .hint("III/IV = junção incompetente"),
                    single("hernia", "Hérnia hiatal", List.of("Ausente", "Presente"))
                            .inlined(),
                    number("herniaCm", "Hérnia hiatal — tamanho", "cm")
                            .showIfEquals("hernia", "Presente"),
                    textRows("eda", "EDA — descrição/laudo", 2, "Achados da endoscopia, hérnia hiatal, esofagite, biópsias, data"),
                    single("barrett", "Esôfago de Barrett", List.of("Ausente", "Curto (<3 cm)", "Longo (≥3 cm)"))
                            .showIfIncludes("fenotipo", List.of("Esôfago de Barrett")),
                    text("praga", "Praga (C e M)", "Ex.: C2M5")
                            .showIfIncludes("fenotipo", List.of("Esôfago de Barrett")),
                    single("barrettBx", "Biópsia de Barrett", List.of(
                            "Sem displasia",
                            "Displasia de baixo grau (2 patologistas)",
                            "Displasia de alto grau",
                            "Adenocarcinoma"))
                            .hint("Sem displasia: <3 cm a cada 5 anos; ≥3 cm a cada 3 anos; ≥10 cm encaminhar a centro "
                                    + "de referência. Displasia: tratamento endoscópico/centro especializado.")
                            .showIfIncludes("fenotipo", List.of("Esôfago de Barrett")),
                    textRows("phmetria", "pH/impedancio-pHmetria", 2, "IEA %, n° refluxos, IS, SAP, conclusão"),
                    single("status", "Status atual", List.of(
                            "Sintomático em tratamento",
                            "Remissão com IBP",
                            "Remissão sem medicação",
                            "Refratário ao IBP otimizado")),
                    textRows("notas", "Notas adicionais", 2)));

    private static final DiseaseDefinition DII = new DiseaseDefinition(
            "dii", "Doença Inflamatória Intestinal", "DII",
            "Classificação de Montreal, doença perianal, manifestações extraintestinais, tratamento, vigilância de CCR.",
            DiseaseSpecialty.GASTRO,
            List.of(
                    multi("diagnostico", "Diagnóstico (pode marcar mais de um)", List.of("Doença de Crohn", "Retocolite Ulcerativa", "Colite indeterminada")),
                    text("dataDiagnostico", "Data do diagnóstico", "AAAA-MM-DD"),
                    single("rcuExtAtual", "RCU — Montreal: extensão atual", List.of("Proctite (E1)", "Colite esquerda (E2)", "Pancolite (E3)"))
                            .showIfIncludes("diagnostico", List.of("Retocolite Ulcerativa")),
                    single("rcuExtMax", "RCU — Montreal: extensão máxima já documentada", List.of("Proctite (E1)", "Colite esquerda (E2)", "Pancolite (E3)"))
                            .hint("Define início da vigilância de CCR")
                            .showIfIncludes("diagnostico", List.of("Retocolite Ulcerativa")),
                    single("rcuGravidade", "RCU — Montreal: gravidade", List.of("Remissão (S0)", "Leve (S1)", "Moderada (S2)", "Grave (S3)"))
                            .showIfIncludes("diagnostico", List.of("Retocolite Ulcerativa")),
                    single("dcIdadeDx", "DC — Montreal: idade ao diagnóstico", List.of("A1 (<17 anos)", "A2 (17–40 anos)", "A3 (>40 anos)"))
                            .showIfIncludes("diagnostico", List.of("Doença de Crohn")),
                    multi("dcLocalizacao", "DC — Montreal: localização", List.of("L1 íleo terminal", "L2 cólon", "L3 ileocolônica", "L4 TGI superior"))
                            .showIfIncludes("diagnostico", List.of("Doença de Crohn")),
                    single("dcComportamento", "DC — Montreal: comportamento", List.of("B1 inflamatório", "B2 estenosante", "B3 penetrante"))
                            .showIfIncludes("diagnostico", List.of("Doença de Crohn")),
                    single("dcPerianal", "DC — Doença perianal (modificador p)", List.of("Ausente", "Presente"))
                            .showIfIncludes("diagnostico", List.of("Doença de Crohn")),
                    multi("dcPerianalDetalhe", "DC — Detalhamento da doença perianal (se presente)", List.of(
                            "Fístula simples (Parks)",
                            "Fístula complexa (Parks)",
                            "Abscesso ativo",
                            "Seton colocado",
                            "Indicação de RM de pelve"))
                            .showIfEquals("dcPerianal", "Presente"),
                    multi("dcAgressivo", "DC — Fatores de risco de doença agressiva", List.of(
                            "Idade jovem ao diagnóstico",
                            "Doença perianal precoce",
                            "Úlceras profundas na colono",
                            "Comportamento complicado precoce",
                            "Necessidade de corticoide na primeira indução"))
                            .showIfIncludes("diagnostico", List.of("Doença de Crohn")),
                    multi("extraintestinais", "Associações / manifestações extraintestinais", List.of(
                            "Nenhuma associação",
                            "Colangite esclerosante primária",
                            "Pioderma gangrenoso",
                            "Eritema nodoso",
                            "Úlceras orais",
                            "Artrite axial",
                            "Artrite periférica",
                            "Uveíte",
                            "Episclerite",
                            "Osteoporose",
                            "TEV prévio")),
                    multi("remissao", "Status de remissão", List.of(
                            "Sem remissão (doença ativa)",
                            "Clínica",
                            "Endoscópica",
                            "Biológica (calpro < 150-250)",
                            "Histológica")),
                    multi("tratamento", "Tratamento de base", List.of(
                            "Nenhum tratamento",
                            "Corticoide sistêmico",
                            "Budesonida",
                            "Mesalazina",
                            "Azatioprina",
                            "Metotrexato",
                            "Anti-TNF (IFX)",
                            "Anti-TNF (ADA)",
                            "Vedolizumabe",
                            "Ustekinumabe",
                            "Risanquizumabe",
                            "Inibidor de JAK",
                            "Modulador S1P",
                            "Otimização do biológico atual",
                            "Terapia nutricional exclusiva",
                            OUTROS)),
                    outros("tratamento", "Tratamento de base"),
                    table("tratamentosPrevios", "Medicamentos já usados", List.of(
                            new TableColumn("medicamento", "Medicamento", "infliximabe"),
                            new TableColumn("periodo", "Período", "2021-03 a 2023-05"),
                            new TableColumn("motivo", "Motivo da suspensão", "não resposta / perda de resposta / efeito adverso"),
                            new TableColumn("anticorpos", "Anticorpos / nível", "ATI positivo")))
                            .hint("Histórico define a escolha do próximo biológico/pequena molécula."),
                    table("monitoramento", "Monitoramento (calprotectina, PCR, nível sérico)", List.of(
                            new TableColumn("data", "Data", "AAAA-MM-DD"),
                            new TableColumn("calpro", "Calprotectina", "µg/g"),
                            new TableColumn("pcr", "PCR", "mg/L"),
                            new TableColumn("nivel", "Nível IFX/ADA (vale)", "µg/mL"),
                            new TableColumn("anticorpo", "Anticorpo", "neg/pos"))),
                    table("cirurgias", "Cirurgias", List.of(
                            new TableColumn("data", "Data", "AAAA-MM"),
                            new TableColumn("procedimento", "Procedimento", "ressecção ileocecal"),
                            new TableColumn("ostomia", "Ostomia", "não / ileostomia"),
                            new TableColumn("obs", "Observação", "extensão ressecada")))
                            .hint("Ressecção ileocecal → Rutgeerts na colonoscopia de 6–12 meses."),
                    table("preBioRes", "Checklist pré-biológico/JAK — resultados", List.of(
                            new TableColumn("exame", "Exame", "PPD/IGRA, Rx tórax, HBsAg, anti-HBc, anti-HBs, HCV, HIV, VZV, sífilis"),
                            new TableColumn("resultado", "Resultado", "negativo / positivo"),
                            new TableColumn("data", "Data", "AAAA-MM"))),
                    multi("preBio", "Checklist pré-biológico/JAK (realizados)", List.of(
                            "Rx tórax",
                            "PPD ou IGRA",
                            "HBV",
                            "HCV",
                            "HIV",
                            "Varicela-zóster",
                            "Sífilis",
                            "Vacinação atualizada")),
                    single("vigilanciaCCR", "Vigilância de CCR", List.of("Não indicada", "Iniciada (≥8 anos pancolite)", "Antecipada (CEP associada)")),
                    // Caixa, não linha: a médica escreve o exame, não só a data.
                    textRows("ultimaColono", "Data da última colono de vigilância", 2, "AAAA-MM"),
                    single("riscoCCR", "Risco para intervalo de vigilância (BSG/ECCO)", List.of(
                            "Alto — 1 ano (estenose/displasia <5 anos, CEP, inflamação extensa moderada/grave)",
                            "Intermediário — 3 anos (inflamação leve extensa, pólipos pós-inflamatórios, CCR familiar ≥50 anos)",
                            "Baixo — 5 anos (sem fatores acima)"))
                            .hint("CEP associada → vigilância anual desde o diagnóstico."),
                    textRows("notas", "Notas adicionais", 2)));

    private static final DiseaseDefinition DISFAGIA = new DiseaseDefinition(
            "disfagia", "Disfagia", "Disfagia",
            "Triagem orofaríngea x esofágica, sinais de alarme, fatores de risco para EoE, exames e resultados.",
            DiseaseSpecialty.GASTRO,
            List.of(
                    text("desdeQuando", "Desde quando (tempo de evolução)", "Ex.: há 6 meses, piora nas últimas 3 semanas"),
                    single("triagem", "Triagem inicial", List.of(
                            "Disfagia verdadeira (dificuldade real de deglutir)",
                            "Globus (sensação de bolo/aperto sem disfagia objetiva)"))
                            .hint("Se 'Globus', a hipótese já sugere disfagia funcional/globus e dispensa investigação extensa além de checar sinais de alarme."),
                    single("classificacao", "Classificação rápida", List.of("Disfagia orofaríngea", "Disfagia esofágica", "Globus (sem disfagia mecânica)")),
                    single("mecanismo", "Mecanismo suspeito (se esofágica)", List.of("Estrutural/mecânica", "Motora/neuromuscular")),
                    single("localizacao", "Localização", List.of("Garganta/pescoço (orofaríngea)", "Retroesternal (esofágica)")),
                    single("inicio", "Início", List.of("Súbito", "Gradual (meses/anos)")),
                    single("padrao", "Padrão", List.of("Intermitente", "Progressiva")),
                    single("consistencia", "Consistência atual", List.of(
                            "Sem alterações",
                            "Apenas sólidos (sugere causa mecânica)",
                            "Sólidos e líquidos (sugere distúrbio motor/neurológico)")),
                    single("evolucao", "Evolução temporal", List.of(
                            "Sem alterações",
                            "Sólidos e líquidos desde o início (sugere acalasia)",
                            "Só sólidos progredindo p/ líquidos (lesão estrutural progressiva)")),
                    number("eat10", "EAT-10 (triagem)", "pts"),
                    number("eckardt", "Escore de Eckardt (se suspeita de acalasia)", "/12")
                            .hint("Disfagia + regurgitação + dor retroesternal (0–3 cada) + perda de peso (0: nenhuma, "
                                    + "1: <5 kg, 2: 5–10 kg, 3: >10 kg). >3 = sintomático/falha de tratamento."),
                    multi("sintomasAssoc", "Sintomas associados", List.of(
                            "Nenhum",
                            "Engasgos / tosse ao comer",
                            "Regurgitação nasal",
                            "Várias deglutições para o mesmo bolo",
                            "Odinofagia",
                            "Pirose crônica",
                            "Impactação alimentar (ida ao PS)",
                            "Pneumonia de repetição / broncoaspiração")),
                    single("odinofagiaLoc", "Odinofagia — localização", List.of("Alta (orofaríngea/infecciosa)", "Baixa (esofágica)"))
                            .showIfIncludes("sintomasAssoc", List.of("Odinofagia")),
                    multi("atopia", "Fatores de risco para EoE", List.of(
                            "Nenhum",
                            "Atopia (geral)",
                            "Asma",
                            "Rinite alérgica",
                            "Alergia alimentar",
                            "Impactação alimentar recorrente")),
                    multi("alarme", "Sinais de alarme", List.of(
                            "Nenhum",
                            "Perda de peso significativa",
                            "Tabagismo/etilismo",
                            "RT cabeça/pescoço/tórax",
                            "Doença neurológica (AVC, Parkinson, ELA, miastenia)",
                            "Esclerodermia / doença do tecido conjuntivo",
                            "Anemia ferropriva",
                            "Sangramento GI")),
                    multi("hipotese", "Hipótese diagnóstica", List.of(
                            "Disfagia orofaríngea (neurológica/muscular)",
                            "Esofágica motora (acalasia, espasmo)",
                            "Esofágica estrutural (Schatzki, estenose, neoplasia)",
                            "Esofagite eosinofílica",
                            "Disfagia funcional / globus",
                            "Esofagite infecciosa (imunossuprimido)",
                            "Outra")),
                    textRows("hipoteseOutra", "Outra hipótese — descrever", 2)
                            .showIfIncludes("hipotese", List.of("Outra")),
                    multi("examesFeitos", "Exames realizados (marcar para preencher o resultado)", List.of(
                            "EDA",
                            "Videofluoroscopia / videodeglutograma",
                            "Manometria de alta resolução",
                            "Esofagograma baritado",
                            "pH/impedancio-pHmetria",
                            "Sorologia para Chagas",
                            "Outro exame")),
                    textRows("resEda", "Resultado — EDA", 2)
                            .showIfIncludes("examesFeitos", List.of("EDA")),
                    textRows("resVideo", "Resultado — Videofluoroscopia / videodeglutograma", 2)
                            .showIfIncludes("examesFeitos", List.of("Videofluoroscopia / videodeglutograma")),
                    textRows("resManometria", "Resultado — Manometria de alta resolução (Chicago 4.0)", 2)
                            .showIfIncludes("examesFeitos", List.of("Manometria de alta resolução")),
                    textRows("resEsofagograma", "Resultado — Esofagograma baritado", 2)
                            .showIfIncludes("examesFeitos", List.of("Esofagograma baritado")),
                    textRows("resPhmetria", "Resultado — pH/impedancio-pHmetria", 2)
                            .showIfIncludes("examesFeitos", List.of("pH/impedancio-pHmetria")),
                    textRows("resChagas", "Resultado — Sorologia para Chagas", 2)
                            .showIfIncludes("examesFeitos", List.of("Sorologia para Chagas")),
                    textRows("resOutro", "Resultado — outro exame", 2)
                            .showIfIncludes("examesFeitos", List.of("Outro exame")),
                    textRows("notas", "Notas adicionais", 2)));

    private static final DiseaseDefinition EOE = new DiseaseDefinition(
            "eoe", "Esofagite Eosinofílica", "EoE",
            "Critérios diagnósticos formais, fenótipo, doenças alérgicas, endoscopias seriadas e tratamento.",
            DiseaseSpecialty.GASTRO,
            List.of(
                    multi("criterios", "Critérios diagnósticos (formais — os 3 componentes)", List.of(
                            "Sintomas de disfunção esofágica presentes",
                            "Histologia com ≥15 eos/CGA em pelo menos 1 biópsia",
                            "Exclusão de causas secundárias de eosinofilia esofágica"))
                            .hint("Diagnóstico exige os três: sintomas + histologia + exclusão de causas secundárias."),
                    multi("exclusao", "Exclusão de causas secundárias (marcar as descartadas)", List.of(
                            "DRGE refratário",
                            "Acalasia",
                            "Doença de Crohn esofágica",
                            "Síndrome hipereosinofílica",
                            "Vasculite",
                            "Doença do tecido conjuntivo",
                            "Infecção esofágica",
                            "Hipersensibilidade a medicamentos"))
                            .hint("Vinculado ao 3º critério — a exclusão é parte formal do diagnóstico."),
                    single("fenotipo", "Fenótipo predominante", List.of("Inflamatório", "Fibroestenosante"))
                            .hint("Fibroestenosante → considerar dilatação endoscópica associada. Inflamatório → geralmente responde a corticoide tópico isolado."),
                    single("status", "Status atual", List.of(
                            "Atividade clínica e histológica",
                            "Remissão clínica com histologia ativa/pendente de reavaliação",
                            "Remissão completa (<15 eos/CGA)")),
                    // Daqui para baixo é o passo a passo da cliente (04/11/2026), não a
                    // ordem do Lovable. EREFS e EndoFLIP saíram a pedido dela: o EREFS
                    // agora é coluna da tabela de endoscopias.
                    multi("alergias", "Doenças alérgicas associadas", List.of(
                            "Nenhuma", "Asma", "Rinite alérgica", "Dermatite atópica", "Alergia alimentar IgE-mediada")),
                    multi("alimentoGatilho", "Alimento(s) que causaram recaída na reintrodução", List.of(
                            "Leite", "Trigo/glúten", "Ovo", "Soja", "Oleaginosas", "Peixe/frutos do mar", "Nenhum identificado")),
                    table("edasEoe", "Endoscopias — pico de eosinófilos por campo", List.of(
                            new TableColumn("data", "Data", "AAAA-MM"),
                            new TableColumn("pico", "Pico eos/CGA", "ex.: 45"),
                            new TableColumn("erefs", "EREFS", "0–9"),
                            new TableColumn("tratamento", "Em uso de", "IBP, budesonida…")))
                            .hint("Resposta histológica: <15 eos/CGA (profunda ≤6)."),
                    table("tratamentosHist", "Tratamentos — dose, início e resposta", List.of(
                            new TableColumn("tratamento", "Tratamento", "budesonida orodispersível"),
                            new TableColumn("dose", "Dose", "1 mg 2x/dia"),
                            new TableColumn("inicio", "Início", "AAAA-MM"),
                            new TableColumn("resposta", "Resposta", "clínica/histológica"))),
                    multi("tratamento", "Tratamento atual", List.of(
                            "IBP em dose plena",
                            "Corticoide tópico deglutido (budesonida)",
                            "Corticoide tópico (fluticasona)",
                            "Dieta empírica de 6",
                            "Dieta empírica de 4/2/1",
                            "Dieta guiada por teste",
                            "Dilatação endoscópica",
                            "Dupilumabe",
                            OUTROS)),
                    outros("tratamento", "Tratamento atual"),
                    textRows("notas", "Notas adicionais", 2)));

    private static final DiseaseDefinition CIRROSE = new DiseaseDefinition(
            "cirrose", "Cirrose Hepática", "Cirrose",
            "Etiologia, Child-Pugh, MELD-Na, hipertensão portal, ascite, PBE, encefalopatia, rastreio de CHC.",
            DiseaseSpecialty.HEPATO,
            List.of(
                    single("etiologia", "Etiologia principal", List.of(
                            "Álcool",
                            "MASLD/MASH",
                            "Hepatite C (HCV)",
                            "Hepatite B (HBV)",
                            "Autoimune/genética (hemocromatose, Wilson, A1AT)",
                            "Criptogênica")),
                    single("estadiamento", "Estadiamento atual", List.of("Compensada", "Primeira descompensação", "Descompensada recorrente")),
                    single("child", "Child-Pugh atual", List.of("A", "B", "C"))
                            .inlined(),
                    single("childA", "Pontos (Child A)", List.of("A5", "A6"))
                            .inlined()
                            .showIfEquals("child", "A"),
                    single("childB", "Pontos (Child B)", List.of("B7", "B8", "B9"))
                            .inlined()
                            .showIfEquals("child", "B"),
                    single("childC", "Pontos (Child C)", List.of("C10", "C11", "C12", "C13", "C14", "C15"))
                            .inlined()
                            .showIfEquals("child", "C"),
                    number("meld", "MELD-Na (3.0) atual"),
                    single("transplante", "Status transplante", List.of("Não avaliado", "Em investigação", "Na lista ativa", "Transplantado")),
                    single("hp", "Hipertensão portal — EDA", List.of(
                            "Nunca fez",
                            "Sem varizes",
                            "Varizes pequeno calibre",
                            "Médio/grande calibre",
                            "Red spots presentes")),
                    multi("hpExtras", "Outros achados de HP", List.of(
                            "Gastropatia hipertensiva leve",
                            "Gastropatia hipertensiva grave",
                            "GAVE (não responde a betabloq.)")),
                    single("ascite", "Ascite", List.of("Ausente", "Leve", "Moderada", "Tensa", "Refratária")),
                    single("pbePrevio", "História prévia de PBE (peritonite bacteriana espontânea)", List.of(
                            "Sem PBE prévia",
                            "PBE prévia — profilaxia secundária indicada (norfloxacino 400 mg/dia ou SMX-TMP)",
                            "Profilaxia primária indicada (ascite com PTN < 1,5 g/dL + disfunção avançada)"))
                            .hint("PBE prévia → profilaxia secundária contínua com norfloxacino 400 mg/dia (ou SMX-TMP) enquanto houver ascite. Considerar profilaxia primária se PTN ascite < 1,5 g/dL + disfunção hepática/renal avançada."),
                    single("eh", "Encefalopatia hepática — padrão", List.of("Sem EH", "Episódica", "Recorrente (≥2 em 6 m)", "Persistente")),
                    single("ehGrau", "West Haven (grau)", List.of("0", "1", "2", "3", "4")),
                    single("chc", "Rastreio de CHC", List.of("Em dia (US + AFP 6/6 m)", "Atrasado", "Nódulo em investigação", "CHC confirmado")),
                    multi("vacinas", "Vacinas atualizadas", List.of("HAV", "HBV", "Pneumocócica", "Influenza anual", "COVID atualizada")),
                    textRows("notas", "Notas adicionais", 2)));

    private static final DiseaseDefinition GASTRO_OP2 = new DiseaseDefinition(
            // Título alinhado ao card do protótipo, que chama este modelo de
            // "opção 3". O slug continua "gastro-op2" (é a rota do protótipo, e
            // é a chave dos cabeçalhos e registros já gravados no banco).
            "gastro-op2", "Consulta de gastroenterologia geral (opção 3)", "Gastro op.3",
            "Anamnese guiada completa: sintomas GI, antecedentes, revisão de sistemas, antecedentes familiares e exames.",
            DiseaseSpecialty.GASTRO,
            List.of(
                    single("tipoAtendimento", "Tipo de atendimento", List.of("Consulta", "Retorno", "Urgência", "Telemedicina", "Outros")),
                    text("acompanhante", "Acompanhante", "Nome e grau de parentesco"),
                    text("convenio", "Convênio / particular"),
                    textRows("queixaPrincipal", "Queixa principal", 2),
                    single("dorAbdominal", "Dor abdominal", List.of("Ausente", "Presente")),
                    textRows("dorAbdominalDet", "Dor — localização / caráter / irradiação / intensidade (0–10)", 2),
                    single("nauseas", "Náuseas / vômitos", List.of("Ausente", "Presente")),
                    text("nauseasDet", "Náuseas/vômitos — frequência, conteúdo, relação alimentar"),
                    single("dispepsia", "Dispepsia / queimação", List.of("Ausente", "Presente")),
                    text("dispepsiaDet", "Dispepsia — localização, relação com alimentação"),
                    multi("disfagia", "Disfagia / odinofagia", List.of("Sólidos", "Líquidos", "Intermitente", "Progressiva", "Ausente")),
                    single("habitoIntestinal", "Hábito intestinal", List.of("Normal", "Diarreia", "Constipação", "Alternado")),
                    text("habitoDet", "Hábito intestinal — frequência, Bristol, sangue/muco"),
                    multi("sangramento", "Sangramento digestivo", List.of("Ausente", "Hematêmese", "Melena", "Enterorragia", "Hematoquezia")),
                    single("distensao", "Distensão / flatulência", List.of("Ausente", "Presente")),
                    single("perdaPonderal", "Perda ponderal involuntária", List.of("Ausente", "Presente")),
                    text("perdaPonderalDet", "Perda ponderal — quantos kg em quantos meses"),
                    single("ictericia", "Icterícia", List.of("Ausente", "Presente")),
                    text("fatoresGatilho", "Fatores desencadeantes / agravantes"),
                    text("fatoresAlivio", "Fatores de alívio"),
                    textRows("evolucao", "Evolução dos sintomas", 2),
                    multi("antecedentesGI", "Antecedentes GI", List.of(
                            "DRGE",
                            "Úlcera péptica",
                            "Gastrite",
                            "DII (Crohn/RCU)",
                            "Doença celíaca",
                            "SII",
                            "Colelitíase / colecistectomia",
                            "Pancreatite",
                            "Hepatopatia",
                            "Câncer GI")),
                    textRows("antecedentesGIDet", "Antecedentes GI — datas, diagnósticos e detalhes", 2),
                    multi("comorbidades", "Outras comorbidades", List.of(
                            "HAS",
                            "DM",
                            "Dislipidemia",
                            "Doença autoimune",
                            "Doença renal",
                            "Cardiopatia",
                            "Doença tireoidiana")),
                    textRows("cirurgias", "Cirurgias / internações prévias (especialmente abdominais)", 2),
                    multi("revSistemas", "Revisão de sistemas positiva", List.of(
                            "Febre / calafrios",
                            "Perda ponderal",
                            "Dor torácica",
                            "Dispneia",
                            "Palpitações / síncope",
                            "Tosse / expectoração / hemoptise",
                            "Disúria / hematúria",
                            "Cefaleia / déficits neurológicos",
                            "Edema")),
                    text("revSistemasOutros", "Revisão de sistemas — outros"),
                    multi("afGI", "AF — rastreamento GI", List.of(
                            "Câncer GI (parente 1º grau)",
                            "DII familiar",
                            "Doença celíaca familiar",
                            "DM familiar",
                            "HAS familiar")),
                    text("afDet", "AF — tipo, parentesco e idade ao diagnóstico"),
                    textRows("labs", "Laboratoriais principais", 3, "Hb / Ht / Leuc / Plaq · AST / ALT / FA / GGT / BT-BD · Cr/TFG · Na/K · Amilase/Lipase · PCR/VHS · Sorologias · Marcadores tumorais"),
                    multi("imagem", "Imagem / endoscopia", List.of(
                            "US abdominal",
                            "EDA",
                            "Colonoscopia",
                            "TC abdome",
                            "RM abdome",
                            "Elastografia hepática")),
                    textRows("imagemDet", "Imagem/endoscopia — data e achados", 2),
                    textRows("hipoteses", "Hipóteses diagnósticas", 2),
                    textRows("notas", "Notas adicionais", 2)))
            // Aposentado em 06/10/2026: o protótipo fundiu a "opção 3" na Gastro —
            // Guiada. Sai dos cards, mas continua respondendo pelo slug, porque
            // cabeçalhos e registros antigos apontam para ele.
            .retire();

    private static final DiseaseDefinition CELIACA = new DiseaseDefinition(
            "celiaca", "Doença Celíaca", "Celíaca",
            "Sorologia (anti-tTG, EMA, anti-DGP), HLA-DQ2/DQ8, Marsh, manifestações e deficiências nutricionais.",
            DiseaseSpecialty.GASTRO,
            List.of(
                    single("apresentacao", "Forma de apresentação", List.of(
                            "Clássica (sintomas GI predominantes)",
                            "Não clássica / atípica (extra-intestinal)",
                            "Assintomática (rastreio em grupo de risco)",
                            "Refratária (sintomas >12 m com DSG rigorosa)")),
                    single("status", "Status atual", List.of(
                            "Em investigação (sem diagnóstico confirmado)",
                            "Diagnóstico confirmado — início de DSG",
                            "Remissão clínica e sorológica",
                            "Não aderente à DSG (confirmado/suspeito)",
                            "DC refratária (em investigação/confirmada)")),
                    single("marsh", "Marsh atual", List.of(
                            "Marsh 0 (normal)",
                            "Marsh 1 (linfocitose intraepitelial)",
                            "Marsh 2 (hiperplasia de criptas)",
                            "Marsh 3a (atrofia leve)",
                            "Marsh 3b (atrofia moderada)",
                            "Marsh 3c (atrofia total)")),
                    textRows("marshData", "Data da biópsia (Marsh)", 2, "AAAA-MM-DD"),
                    single("ttgStatus", "Anti-transglutaminase IgA", List.of("Reagente", "Não reagente", "Não realizado"))
                            .inlined(),
                    number("ttgIga", "Valor", "U/mL")
                            .rowLabel("Anti-transglutaminase IgA — valor, data e IgA total")
                            .hint("IgA total é obrigatória p/ interpretar. <7 mg/dL = deficiência → usar anti-peptídeo deamidado da gliadina (Anti-DGP) IgG ou transglutaminase IgG.")
                            .showIfEquals("ttgStatus", "Reagente"),
                    text("ttgIgaData", "Data", "AAAA-MM-DD")
                            .rowLabel("Anti-transglutaminase IgA — valor, data e IgA total")
                            .showIfEquals("ttgStatus", "Reagente"),
                    number("igaTotal", "IgA total", "mg/dL")
                            .rowLabel("Anti-transglutaminase IgA — valor, data e IgA total")
                            .showIfEquals("ttgStatus", "Reagente"),
                    text("igaTotalData", "Data da IgA total", "AAAA-MM-DD")
                            .rowLabel("Anti-transglutaminase IgA — valor, data e IgA total")
                            .showIfEquals("ttgStatus", "Reagente"),
                    single("ema", "Anti-endomísio IgA", List.of("Reagente", "Não reagente", "Não realizado"))
                            .inlined(),
                    text("emaValor", "Valor / título", "Ex.: 1/80")
                            .rowLabel("Anti-endomísio IgA — valor e data")
                            .showIfEquals("ema", "Reagente"),
                    text("emaData", "Data", "AAAA-MM-DD")
                            .rowLabel("Anti-endomísio IgA — valor e data")
                            .showIfEquals("ema", "Reagente"),
                    single("dgpStatus", "Anti-peptídeo deamidado da gliadina (Anti-DGP) IgG", List.of("Reagente", "Não reagente", "Não realizado"))
                            .inlined(),
                    text("dgpIgg", "Valor", "Valor + referência")
                            .rowLabel("Anti-peptídeo deamidado da gliadina IgG — valor e data")
                            .showIfEquals("dgpStatus", "Reagente"),
                    text("dgpIggData", "Data", "AAAA-MM-DD")
                            .rowLabel("Anti-peptídeo deamidado da gliadina IgG — valor e data")
                            .showIfEquals("dgpStatus", "Reagente"),
                    single("hla", "HLA-DQ2 / DQ8", List.of(
                            "Não realizado",
                            "DQ2 positivo",
                            "DQ8 positivo",
                            "DQ2 + DQ8 positivos",
                            "Ambos negativos (exclui DC)")),
                    multi("manifestacoes", "Manifestações associadas", List.of(
                            "Nenhuma",
                            "Diarreia crônica / esteatorréia",
                            "Distensão / flatulência",
                            "Perda de peso",
                            "Anemia ferropriva refratária",
                            "Osteoporose/osteopenia precoce",
                            "Dermatite herpetiforme",
                            "Hipertransaminasemia sem causa",
                            "Infertilidade/abortos",
                            "Neuropatia/ataxia pelo glúten",
                            "Aftas orais recorrentes",
                            "Baixa estatura/atraso puberal",
                            "Fadiga crônica")),
                    multi("rastreio", "Grupo de risco para rastreio", List.of(
                            "Nenhum",
                            "Familiar 1º grau de celíaco",
                            "Síndrome de Down",
                            "Síndrome de Turner",
                            "Síndrome de Williams",
                            "DM tipo 1",
                            "Tireoidite de Hashimoto",
                            "Síndrome de Sjögren",
                            "Déficit de IgA seletivo")),
                    multi("deficiencias", "Deficiências nutricionais ativas", List.of(
                            "Nenhuma",
                            "Ferro/ferritina",
                            "Vitamina B12",
                            "Ácido fólico",
                            "Vitamina D / cálcio",
                            "Zinco",
                            "Magnésio",
                            "Albumina/proteínas")),
                    textRows("dexa", "Densitometria óssea (T-score)", 2, "Ex.: L1-L4 -1,8 / colo fêmur -2,1 (AAAA-MM)"),
                    table("ttgSeguimento", "Anti-tTG IgA de controle (seguimento)", List.of(
                            new TableColumn("data", "Data", "AAAA-MM"),
                            new TableColumn("valor", "Anti-tTG IgA", "U/mL"),
                            new TableColumn("lsn", "LSN do método", "U/mL"),
                            new TableColumn("obs", "Observação", "adesão, sintomas")))
                            .hint("Esperada normalização em 12–24 meses de DSG."),
                    multi("vacinasCeliaca", "Vacinas (hipoesplenismo funcional)", List.of(
                            "Pneumocócica (VPC + VPP23)",
                            "Influenza anual",
                            "Hepatite B (checar resposta)",
                            "Meningocócica (se hipoesplenismo)")),
                    textRows("notas", "Notas adicionais", 2)));

    private static final DiseaseDefinition HCV = new DiseaseDefinition(
            "hcv", "Hepatite C", "HCV",
            "PCDT Hepatite C 2026: carga viral, genótipo, fibrose (com Child/MELD se cirrose), esquema DAA e retratamento.",
            DiseaseSpecialty.HEPATO,
            List.of(
                    links("recursos", "Recursos oficiais — PCDT Hepatite C e Coinfecções", List.of(
                            new LinkItem("PCDT Hepatite C e Coinfecções 2026 (MS)", "https://www.gov.br/saude/pt-br/assuntos/pcdt/h/hepatite-c-coinfeccoes/view"),
                            new LinkItem("Formulário GAL — carga viral HCV", "https://www.gov.br/aids/pt-br/sistemas-de-informacao/gal"))),
                    single("genotipo", "Genótipo HCV (opcional — PCDT 2026: não exigido para DAA pangenotípico)", List.of("1a", "1b", "2", "3", "4", "5", "6", "Não genotipado (não obrigatório)"))
                            .inlined(),
                    number("hcvRna", "HCV-RNA", "UI/mL")
                            .rowLabel("HCV-RNA (carga viral)"),
                    text("hcvRnaData", "Data", "AAAA-MM-DD")
                            .rowLabel("HCV-RNA (carga viral)"),
                    single("status", "Status atual", List.of(
                            "Nunca tratado",
                            "Em tratamento",
                            "Curado — RVS12 confirmada",
                            "Falha terapêutica"))
                            .inlined(),
                    number("semanaTto", "Semana atual do tratamento", "sem")
                            .showIfEquals("status", "Em tratamento"),
                    text("rvs12Data", "Data da RVS12", "AAAA-MM-DD")
                            .showIfEquals("status", "Curado — RVS12 confirmada"),
                    textRows("falhaEsquema", "Esquema utilizado na falha (droga, duração, data, motivo)", 2, "Ex.: Sofosbuvir + Daclatasvir 12 sem (2024) — recidiva pós-tratamento")
                            .showIfEquals("status", "Falha terapêutica"),
                    multi("extraHep", "Manifestações extra-hepáticas", List.of(
                            "Nenhuma",
                            "Crioglobulinemia mista",
                            "Artralgia/artrite",
                            "Neuropatia periférica",
                            "Tireoidopatia",
                            "Glomerulonefrite",
                            "Líquen plano")),
                    single("fibrose", "Grau de fibrose atual", List.of("F0-F1", "F2", "F3", "F4 / cirrose"))
                            .inlined()
                            .hint("F3 e F4 mantêm rastreio de CHC semestral vitalício, mesmo após cura."),
                    table("estadiamento", "Métodos de estadiamento (valor e data)", List.of(
                            new TableColumn("metodo", "Método", "APRI / FIB-4 / Fibroscan / ARFI / Biópsia"),
                            new TableColumn("valor", "Valor", "Ex.: 12,8 kPa · APRI 0,72"),
                            new TableColumn("data", "Data", "AAAA-MM"))),
                    single("child", "Child-Pugh", List.of("A", "B", "C"))
                            .inlined()
                            .rowLabel("Escores (F4 / cirrose)")
                            .showIfEquals("fibrose", "F4 / cirrose"),
                    single("childA", "Pontos (Child A)", List.of("A5", "A6"))
                            .inlined()
                            .rowLabel("Escores (F4 / cirrose)")
                            .showIfEquals("fibrose", "F4 / cirrose")
                            .showIfEquals("child", "A"),
                    single("childB", "Pontos (Child B)", List.of("B7", "B8", "B9"))
                            .inlined()
                            .rowLabel("Escores (F4 / cirrose)")
                            .showIfEquals("fibrose", "F4 / cirrose")
                            .showIfEquals("child", "B"),
                    single("childC", "Pontos (Child C)", List.of("C10", "C11", "C12", "C13", "C14", "C15"))
                            .inlined()
                            .rowLabel("Escores (F4 / cirrose)")
                            .showIfEquals("fibrose", "F4 / cirrose")
                            .showIfEquals("child", "C"),
                    number("meld", "MELD-Na")
                            .rowLabel("Escores (F4 / cirrose)")
                            .showIfEquals("fibrose", "F4 / cirrose"),
                    multi("coinfeccoes", "Coinfecções", List.of("HIV", "HBV (HBsAg+)", "HDV", "Sem coinfecção")),
                    text("coinfDetalhes", "Detalhes coinfecções", "HIV: CD4 / CV. HBV: AgHBs, Anti-HBs, DNA-HBV. HDV se HBV+.")
                            .showIfIncludes("coinfeccoes", List.of("HIV", "HBV (HBsAg+)", "HDV")),
                    multi("preDaa", "Checklist pré-DAA (PCDT 2026)", List.of(
                            "HBsAg/anti-HBc verificados (risco de reativação)",
                            "HIV descartado/controlado com TARV",
                            "Gravidez descartada (DAA contraindicado na gestação)",
                            "Interações medicamentosas checadas",
                            "Orientação de abstinência alcoólica")),
                    single("daaSelecionado", "Esquema DAA selecionado (PCDT 2026)", List.of(
                            "Sofosbuvir + Daclatasvir 12 sem (APRI < 1, sem cirrose, primeiro tratamento)",
                            "Sofosbuvir/Velpatasvir 12 sem (APRI ≥ 1 ou cirrose Child A)",
                            "Sofosbuvir/Velpatasvir 12 sem (cirrose Child B/C — sem daclatasvir e sem G/P)",
                            "Glecaprevir/Pibrentasvir 8 sem (DRC grave/diálise — sem cirrose descompensada)",
                            "Glecaprevir/Pibrentasvir 12 sem (DRC grave + cirrose compensada)")),
                    single("retratamento", "Retratamento", List.of("Sim", "Não"))
                            .inlined(),
                    single("esquemaRetratamento", "Esquema de retratamento", List.of(
                            "Sof/Vel/Voxilaprevir 12 sem (falha prévia a DAA — Child A / sem descompensação)",
                            "Sofosbuvir/Velpatasvir 24 sem (Child B/C — voxilaprevir contraindicado)",
                            "Glecaprevir/Pibrentasvir 12–16 sem (falha a esquema sem inibidor de protease)",
                            "Sof/Vel/Vox + ribavirina 12 sem (falha múltipla, caso a caso)"))
                            .hint("Inibidores de protease (voxilaprevir, glecaprevir) são contraindicados em Child B/C.")
                            .showIfEquals("retratamento", "Sim"),
                    textRows("retratamentoNotas", "Notas do retratamento", 2, "Esquema prévio, aderência, RAS, genotipagem (indicada apenas em falha).")
                            .showIfEquals("retratamento", "Sim"),
                    single("rastreioCHC", "Rastreio CHC (F3/F4)", List.of(
                            "Não indicado (F0-F2)",
                            "Em dia (US + AFP 6/6 m)",
                            "Atrasado",
                            "Nódulo em investigação"))
                            .inlined(),
                    textRows("notas", "Notas adicionais", 2)));

    private static final String HBV_REATIVACAO = "Estratificação de risco de reativação";

    private static final DiseaseDefinition HBV = new DiseaseDefinition(
            "hbv", "Hepatite B", "HBV",
            "PCDT Hepatite B: fase da infecção, perfil sorológico, fibrose, indicação e esquema antiviral.",
            DiseaseSpecialty.HEPATO,
            List.of(
                    links("recursos", "Recursos oficiais — PCDT Hepatite B", List.of(
                            new LinkItem("PCDT Hepatite B e Coinfecções (MS)", "https://www.gov.br/saude/pt-br/centrais-de-conteudo/publicacoes/svsa/hepatites/pcdt-da-hepatite-b/view"),
                            new LinkItem("NT 92/2024 — TAF na cirrose descompensada", "https://www.gov.br/aids/pt-br/centrais-de-conteudo/notas-informativas"),
                            new LinkItem("Formulário GAL — carga viral HBV", "https://www.gov.br/aids/pt-br/sistemas-de-informacao/gal"))),
                    single("fase", "Fase da infecção (nomenclatura vigente)", List.of(
                            "Infecção crônica HBeAg-positiva (antiga imunotolerante)",
                            "Hepatite crônica HBeAg-positiva (imunoativa)",
                            "Infecção crônica HBeAg-negativa (antigo portador inativo)",
                            "Hepatite crônica HBeAg-negativa (mutante pré-core)",
                            "HBsAg negativo / infecção resolvida (Anti-HBc+)",
                            "Cirrose por HBV")),
                    single("hbsag", "HBsAg", List.of("Reagente", "Não reagente", "Não realizado"))
                            .inlined()
                            .rowLabel("Perfil sorológico")
                            .hint("Anti-HBc+ com HBsAg− não garante imunidade — pode ser infecção oculta; dosar HBV-DNA antes de imunossupressão. Anti-HBs ≥10 mUI/mL = imunidade."),
                    single("hbeAg", "HBeAg", List.of("Reagente", "Não reagente", "Não realizado"))
                            .inlined()
                            .rowLabel("Perfil sorológico"),
                    single("antiHBe", "Anti-HBe", List.of("Reagente", "Não reagente", "Não realizado"))
                            .inlined()
                            .rowLabel("Perfil sorológico"),
                    single("antiHBc", "Anti-HBc total", List.of("Reagente", "Não reagente", "Não realizado"))
                            .inlined()
                            .rowLabel("Perfil sorológico"),
                    number("antiHBs", "Anti-HBs (mUI/mL)", "mUI/mL")
                            .rowLabel("Perfil sorológico"),
                    multi("coinf", "Coinfecções", List.of("HIV", "HCV", "HDV (se HBsAg+)", "Sem coinfecção"))
                            .inlined(),
                    multi("manifExtra", "Manifestações extra-hepáticas", List.of(
                            "Nenhuma",
                            "Vasculite de pequenos vasos (púrpura palpável)",
                            "Artralgia/artrite de grandes articulações",
                            "Poliarterite nodosa (livedo, HAS refratária, neuropatia)",
                            "Glomerulonefrite membranosa (edema, proteinúria)")),
                    table("seguimentoTab", "Seguimento laboratorial (uma linha por exame)", List.of(
                            new TableColumn("data", "Data", "AAAA-MM-DD"),
                            new TableColumn("hbvdna", "HBV-DNA (UI/mL)", null),
                            new TableColumn("alt", "ALT (U/L)", null),
                            new TableColumn("creat", "Creatinina", null),
                            new TableColumn("child", "Child (se cirrose)", null),
                            new TableColumn("meld", "MELD (se cirrose)", null),
                            new TableColumn("hbsag", "HBsAg (quant./qual.)", null))),
                    single("fibrose", "Grau de fibrose atual", List.of("F0-F1", "F2", "F3", "F4 / cirrose"))
                            .inlined(),
                    single("child", "Child-Pugh", List.of("A", "B", "C"))
                            .inlined()
                            .rowLabel("Escores (se F4 / cirrose)")
                            .showIfEquals("fibrose", "F4 / cirrose"),
                    single("childA", "Pontos (Child A)", List.of("A5", "A6"))
                            .inlined()
                            .rowLabel("Escores (se F4 / cirrose)")
                            .showIfEquals("fibrose", "F4 / cirrose")
                            .showIfEquals("child", "A"),
                    single("childB", "Pontos (Child B)", List.of("B7", "B8", "B9"))
                            .inlined()
                            .rowLabel("Escores (se F4 / cirrose)")
                            .showIfEquals("fibrose", "F4 / cirrose")
                            .showIfEquals("child", "B"),
                    single("childC", "Pontos (Child C)", List.of("C10", "C11", "C12", "C13", "C14", "C15"))
                            .inlined()
                            .rowLabel("Escores (se F4 / cirrose)")
                            .showIfEquals("fibrose", "F4 / cirrose")
                            .showIfEquals("child", "C"),
                    number("meld", "MELD-Na")
                            .rowLabel("Escores (se F4 / cirrose)")
                            .showIfEquals("fibrose", "F4 / cirrose"),
                    multi("metodoFibrose", "Método do estadiamento", List.of("FIB-4", "Fibroscan", "ARFI", "Biópsia"))
                            .inlined(),
                    textRows("fibroseDetalhe", "Data e resultado do método", 2, "Ex.: Fibroscan 8,4 kPa (2025-04) · FIB-4 1,9 (2025-04).\nPCDT: >9 kPa (ALT normal) ou >12 kPa (ALT 1-5×LSN) = tratar."),
                    single("temRiscoReativacao", "Contextos de risco de reativação HBV", List.of("Sim", "Não"))
                            .inlined(),
                    multi("reativacao", "Contextos presentes (PCDT)", List.of(
                            "Corticoide ≥20 mg/d prednisona >4 sem",
                            "Quimioterapia (esp. rituximabe — risco muito alto)",
                            "Biológicos (anti-TNF, anti-IL, JAK)",
                            "Transplante órgão sólido/medula",
                            "Coinfecção HIV"))
                            .showIfEquals("temRiscoReativacao", "Sim"),
                    // O widget hbvRisk do protótipo, achatado em dois campos e a conta.
                    // Os rótulos são a chave da conta (HBV_TERAPIAS em computed-fields.ts).
                    single("reativacaoSero", "Perfil sorológico", List.of(
                            "HBsAg positivo",
                            "HBsAg negativo / anti-HBc positivo",
                            "HBsAg e anti-HBc negativos"))
                            .section(HBV_REATIVACAO)
                            .hint("Selecione o perfil sorológico e a terapia imunossupressora para calcular o risco e a conduta (PCDT Hepatite B).")
                            .showIfEquals("temRiscoReativacao", "Sim"),
                    single("reativacaoTerapia", "Terapia imunossupressora / medicação", List.of(
                            "Rituximabe / anti-CD20 (ou outro anti-linfócito B)",
                            "Transplante de medula / TCTH",
                            "Quimioterapia com antraciclina (doxorrubicina, epirrubicina)",
                            "Corticoide ≥20 mg/d prednisona por >4 semanas",
                            "Transplante de órgão sólido",
                            "Anti-TNF / anti-integrina / anti-IL / inibidor JAK",
                            "Corticoide 10-20 mg/d por >4 semanas",
                            "Inibidores de tirosina-quinase / citotóxicos sem antraciclina",
                            "Azatioprina / 6-MP / metotrexato",
                            "Corticoide <10 mg/d ou curso ≤4 semanas",
                            "Corticoide intra-articular / tópico"))
                            .section(HBV_REATIVACAO)
                            .showIfEquals("temRiscoReativacao", "Sim"),
                    computed("reativacaoRisco", "Risco de reativação", "hbvRisk",
                            List.of("reativacaoSero", "reativacaoTerapia"))
                            .section(HBV_REATIVACAO)
                            .placeholder("Selecione o perfil sorológico e a terapia.")
                            .showIfEquals("temRiscoReativacao", "Sim"),
                    single("gestante", "Gestante HBsAg-positiva", List.of("Sim", "Não", "Não se aplica"))
                            .inlined(),
                    textRows("gestanteConduta", "Gestação — HBV-DNA e conduta", 3, "HBV-DNA + data, semana gestacional, conduta definida.")
                            .hint("Sugestão de conduta: HBV-DNA >200.000 UI/mL (>5,3 log) → TDF 300 mg/d da 28ª semana até 4 semanas pós-parto. RN: vacina HBV + HBIG nas primeiras 12h, independentemente da carga viral materna.")
                            .showIfEquals("gestante", "Sim"),
                    multi("indicacaoTto", "Indicação de tratamento (PCDT Hepatite B)", List.of(
                            "Sem indicação de tratamento",
                            "HBeAg+ com ALT >2×LSN e/ou HBV-DNA >20.000 UI/mL",
                            "HBeAg− com ALT >2×LSN e HBV-DNA >2.000 UI/mL",
                            "Cirrose (qualquer HBV-DNA detectável)",
                            "Elastografia >9 kPa (ALT normal) ou >12 kPa (ALT 1-5×LSN)",
                            "Biópsia METAVIR ≥A2 e/ou ≥F2",
                            "Coinfecção HIV, HCV ou HDV",
                            "História familiar de CHC ou cirrose",
                            "Manifestação extra-hepática",
                            "Imunossupressão / profilaxia de reativação",
                            "Gestante com HBV-DNA >200.000 UI/mL",
                            "Reativação/hepatite aguda grave",
                            "Outros")),
                    textRows("indicacaoOutros", "Outros — especificar", 2)
                            .showIfIncludes("indicacaoTto", List.of("Outros")),
                    single("statusTto", "Status de tratamento", List.of("Nunca tratado", "Em tratamento", "Suspenso", "Em seguimento sem tratamento"))
                            .inlined(),
                    textRows("motivoSuspensao", "Motivo (se suspenso ou sem tratamento)", 2)
                            .showIfEquals("statusTto", "Suspenso", "Em seguimento sem tratamento"),
                    single("antiviral", "Antiviral", List.of(
                            "TDF 300 mg/dia",
                            "ETV 0,5 mg/dia (naive)",
                            "ETV 1 mg/dia (cirrose descompensada)",
                            "ETV 1 mg/dia (histórico de lamivudina)",
                            "TAF 25 mg/dia",
                            "Nenhum"))
                            .rowLabel("Antiviral em uso")
                            .hint("TAF preferível se ClCr<60, osteoporose/fratura, imunossupressão ou transplante (NT 92/2024). ETV com histórico de lamivudina tem até 50% de resistência — preferir TDF/TAF.\nTDF: 300 mg/d se ClCr>50; 48h se 30-49; 72-96h se 10-29; 7/7d se <10. ETV: 1×/d se >50; 48h se 30-49; 72h se 10-29; 5-7d se <10. TAF: 25 mg/d fixa se ClCr ≥15; não indicado <15 (exceto hemodiálise).")
                            .showIfIncludes("indicacaoTto", List.of(
                            "HBeAg+ com ALT >2×LSN e/ou HBV-DNA >20.000 UI/mL",
                            "HBeAg− com ALT >2×LSN e HBV-DNA >2.000 UI/mL",
                            "Cirrose (qualquer HBV-DNA detectável)",
                            "Elastografia >9 kPa (ALT normal) ou >12 kPa (ALT 1-5×LSN)",
                            "Biópsia METAVIR ≥A2 e/ou ≥F2",
                            "Coinfecção HIV, HCV ou HDV",
                            "História familiar de CHC ou cirrose",
                            "Manifestação extra-hepática",
                            "Imunossupressão / profilaxia de reativação",
                            "Gestante com HBV-DNA >200.000 UI/mL",
                            "Reativação/hepatite aguda grave",
                            "Outros")),
                    text("inicioTto", "Data de início", "AAAA-MM-DD")
                            .rowLabel("Antiviral em uso")
                            .showIfIncludes("indicacaoTto", List.of(
                            "HBeAg+ com ALT >2×LSN e/ou HBV-DNA >20.000 UI/mL",
                            "HBeAg− com ALT >2×LSN e HBV-DNA >2.000 UI/mL",
                            "Cirrose (qualquer HBV-DNA detectável)",
                            "Elastografia >9 kPa (ALT normal) ou >12 kPa (ALT 1-5×LSN)",
                            "Biópsia METAVIR ≥A2 e/ou ≥F2",
                            "Coinfecção HIV, HCV ou HDV",
                            "História familiar de CHC ou cirrose",
                            "Manifestação extra-hepática",
                            "Imunossupressão / profilaxia de reativação",
                            "Gestante com HBV-DNA >200.000 UI/mL",
                            "Reativação/hepatite aguda grave",
                            "Outros")),
                    number("clcr", "ClCr atual", "ml/min")
                            .rowLabel("Antiviral em uso")
                            .showIfIncludes("indicacaoTto", List.of(
                            "HBeAg+ com ALT >2×LSN e/ou HBV-DNA >20.000 UI/mL",
                            "HBeAg− com ALT >2×LSN e HBV-DNA >2.000 UI/mL",
                            "Cirrose (qualquer HBV-DNA detectável)",
                            "Elastografia >9 kPa (ALT normal) ou >12 kPa (ALT 1-5×LSN)",
                            "Biópsia METAVIR ≥A2 e/ou ≥F2",
                            "Coinfecção HIV, HCV ou HDV",
                            "História familiar de CHC ou cirrose",
                            "Manifestação extra-hepática",
                            "Imunossupressão / profilaxia de reativação",
                            "Gestante com HBV-DNA >200.000 UI/mL",
                            "Reativação/hepatite aguda grave",
                            "Outros")),
                    single("ttoPrevio", "Já tratou antes?", List.of("Sim", "Não"))
                            .inlined()
                            .rowLabel("Tratamento antiviral prévio")
                            .showIfIncludes("indicacaoTto", List.of(
                            "HBeAg+ com ALT >2×LSN e/ou HBV-DNA >20.000 UI/mL",
                            "HBeAg− com ALT >2×LSN e HBV-DNA >2.000 UI/mL",
                            "Cirrose (qualquer HBV-DNA detectável)",
                            "Elastografia >9 kPa (ALT normal) ou >12 kPa (ALT 1-5×LSN)",
                            "Biópsia METAVIR ≥A2 e/ou ≥F2",
                            "Coinfecção HIV, HCV ou HDV",
                            "História familiar de CHC ou cirrose",
                            "Manifestação extra-hepática",
                            "Imunossupressão / profilaxia de reativação",
                            "Gestante com HBV-DNA >200.000 UI/mL",
                            "Reativação/hepatite aguda grave",
                            "Outros")),
                    textRows("ttoPrevioDetalhe", "Qual tratamento prévio (droga, período, motivo da troca/suspensão, resistência)", 2)
                            .showIfEquals("ttoPrevio", "Sim"),
                    single("rastreioCHC", "Rastreio CHC (US + AFP 6/6 m)", List.of(
                            "Não indicado",
                            "Indicado: homem >40 a",
                            "Indicado: mulher >50 a",
                            "Indicado: F3/F4",
                            "Indicado: história familiar de CHC",
                            "Em dia",
                            "Atrasado",
                            "Nódulo em investigação")),
                    textRows("notas", "Notas / Pérolas de manejo", 3, "• Anti-HBc+ isolado pode ser infecção oculta • TAF preferível se ClCr<60/ossos/imunossup. (NT 92/2024) • ETV + hist. lamivudina = até 50% resistência (usar TDF/TAF) • Soroconversão HBeAg NÃO é cura • Gestante HBV-DNA >200k → TDF 28ª sem + vacina/HBIG no RN em 12h.")));

    private static final String HAI_SIMPLIFICADO = "Simplificado (IAIHG 2008)";
    private static final String HAI_ORIGINAL = "Escore original completo (IAIHG 1999)";
    private static final String HAI_AMBOS = "Ambos";

    private static final DiseaseDefinition HAI = new DiseaseDefinition(
            "hai", "Hepatite Autoimune", "HAI",
            "Critérios diagnósticos (IAIHG), estadiamento, controle laboratorial/histológico seriado e imunossupressão.",
            DiseaseSpecialty.HEPATO,
            List.of(
                    // "calcula abaixo" saiu da opção: não há conta embutida aqui
                    // (o escore simplificado está em Escalas e calculadoras). Não
                    // havia cabeçalho de HAI gravado em produção quando mudou (13/10/2026).
                    single("criteriosModo", "Critérios diagnósticos — modo de preenchimento", List.of(
                            HAI_SIMPLIFICADO, HAI_ORIGINAL, HAI_AMBOS)),
                    // Aparece só depois da escolha, com o título do escore escolhido.
                    // A chave continua criteriosOriginal (é a de sempre).
                    textRows("criteriosOriginal", "Escore — anotações/pontuação", 3,
                            "Pontuação total, itens marcados, resultado pré/pós-tratamento se aplicável.")
                            .dynamicLabel("criteriosModo", java.util.Map.of(
                                    HAI_SIMPLIFICADO, "Escore simplificado (IAIHG 2008) — anotações/pontuação",
                                    HAI_ORIGINAL, "Escore original (IAIHG 1999) — anotações/pontuação",
                                    HAI_AMBOS, "Escores simplificado e original — anotações/pontuação")),
                    // Opções abaixo do rótulo, não ao lado.
                    single("subtipo", "Subtipo sorológico", List.of("Autoanticorpos positivos", "Soronegativa")),
                    single("apresentacao", "Forma de apresentação", List.of(
                            "Assintomática (alteração de enzimas)",
                            "Crônica insidiosa",
                            "Aguda ictérica",
                            "Insuficiência hepática aguda")),
                    multi("doencasAssoc", "Doenças autoimunes associadas", List.of(
                            "Nenhuma associação",
                            "Tireoidite (Hashimoto/Graves)",
                            "Doença celíaca",
                            "DII (RCU/Crohn)",
                            "Diabetes tipo 1",
                            "Sjögren",
                            "AR / LES",
                            "Vitiligo",
                            "Anemia hemolítica autoimune",
                            "CBP (síndrome de overlap)",
                            "CEP (síndrome de overlap)")),
                    single("estadiamento", "Estadiamento", List.of("F0", "F1", "F2", "F3", "F4 / Cirrose"))
                            .inlined(),
                    single("metodoFibrose", "Método do estadiamento", List.of("Biópsia", "Elastografia (Fibroscan/ARFI)", "FIB-4/APRI", "Clínico-radiológico"))
                            .inlined(),
                    text("valorFibrose", "Valor/dado", "Ex.: 9,8 kPa (2025-03) · FIB-4 2,8"),
                    single("child", "Child-Pugh", List.of("A", "B", "C"))
                            .inlined()
                            .rowLabel("Cirrose — Child-Pugh e MELD")
                            .showIfEquals("estadiamento", "F4 / Cirrose"),
                    single("childA", "Pontos (Child A)", List.of("A5", "A6"))
                            .inlined()
                            .rowLabel("Cirrose — Child-Pugh e MELD")
                            .showIfEquals("estadiamento", "F4 / Cirrose")
                            .showIfEquals("child", "A"),
                    single("childB", "Pontos (Child B)", List.of("B7", "B8", "B9"))
                            .inlined()
                            .rowLabel("Cirrose — Child-Pugh e MELD")
                            .showIfEquals("estadiamento", "F4 / Cirrose")
                            .showIfEquals("child", "B"),
                    single("childC", "Pontos (Child C)", List.of("C10", "C11", "C12", "C13", "C14", "C15"))
                            .inlined()
                            .rowLabel("Cirrose — Child-Pugh e MELD")
                            .showIfEquals("estadiamento", "F4 / Cirrose")
                            .showIfEquals("child", "C"),
                    number("meld", "MELD-Na")
                            .rowLabel("Cirrose — Child-Pugh e MELD")
                            .showIfEquals("estadiamento", "F4 / Cirrose"),
                    table("labsSeriados", "Controle laboratorial seriado", List.of(
                            new TableColumn("data", "Data", "AAAA-MM-DD"),
                            new TableColumn("tgo", "TGO (U/L)", null),
                            new TableColumn("tgp", "TGP (U/L)", null),
                            new TableColumn("ggt", "GGT", null),
                            new TableColumn("fa", "FA", null),
                            new TableColumn("bb", "BT/BD", null),
                            new TableColumn("igg", "IgG (mg/dL)", null),
                            new TableColumn("imuno", "Imunossupressão em uso", null)))
                            .hint("Adicione uma linha a cada consulta — o histórico permanece visível nos retornos."),
                    table("histologia", "Histologia (biópsias)", List.of(
                            new TableColumn("data", "Data", "AAAA-MM-DD"),
                            new TableColumn("imuno", "Imunossupressão vigente", null),
                            new TableColumn("interface", "Atividade de interface", "Ausente / leve / moderada / intensa"),
                            new TableColumn("infiltrado", "Infiltrado periportal", "Plasmocitário? linfocitário?"),
                            new TableColumn("roseta", "Roseta hepatocitária", null),
                            new TableColumn("emperipolese", "Emperipolese", null),
                            new TableColumn("fibrose", "Fibrose (METAVIR/Ishak)", null),
                            new TableColumn("conclusao", "Conclusão", "Ex.: HAI em atividade moderada, F2")))
                            .hint("Interface, infiltrado periportal, roseta, emperipolese, fibrose — para acompanhar resposta histológica ao tratamento."),
                    multi("tratamento", "Tratamento atual (pode marcar mais de um)", List.of(
                            "Nenhum",
                            "Prednisona/prednisolona",
                            "Budesonida (não cirrótico)",
                            "Azatioprina",
                            "Micofenolato mofetil (MMF)",
                            "Ciclosporina",
                            "Tacrolimus",
                            "Alopurinol associado (metabolizador preferencial)",
                            "6-mercaptopurina",
                            "Rituximabe (refratária)",
                            "Outros")),
                    textRows("tratamentoOutros", "Outros — especificar", 2)
                            .showIfIncludes("tratamento", List.of("Outros")),
                    table("tratamentoDoses", "Doses do tratamento atual", List.of(
                            new TableColumn("droga", "Medicação", "Ex.: Prednisona"),
                            new TableColumn("dose", "Dose", "Ex.: 40 mg/dia"),
                            new TableColumn("inicio", "Início", "AAAA-MM")))
                            .showIfIncludes("tratamento", List.of(
                            "Prednisona/prednisolona",
                            "Budesonida (não cirrótico)",
                            "Azatioprina",
                            "Micofenolato mofetil (MMF)",
                            "Ciclosporina",
                            "Tacrolimus",
                            "Alopurinol associado (metabolizador preferencial)",
                            "6-mercaptopurina",
                            "Rituximabe (refratária)",
                            "Outros")),
                    single("ttoAnterior", "Tratamento anterior", List.of("Sim", "Não"))
                            .inlined(),
                    textRows("ttoAnteriorDetalhe", "Qual tratamento anterior (droga, dose, período, motivo da troca)", 2)
                            .showIfEquals("ttoAnterior", "Sim"),
                    single("resposta", "Resposta ao tratamento", List.of(
                            "Não avaliado",
                            "Resposta bioquímica completa (TGO/TGP + IgG normais)",
                            "Resposta parcial",
                            "Não resposta",
                            "Recidiva após desmame",
                            "Intolerância")),
                    multi("saudeOssea", "Saúde óssea", List.of("Nenhum", "Cálcio", "Vitamina D", "Bifosfonados", "Denosumabe", "DEXA em dia", OUTROS)),
                    outros("saudeOssea", "Saúde óssea"),
                    multi("vacinacao", "Vacinação", List.of(
                            "Hep A",
                            "Hep B",
                            "Pneumococo",
                            "Influenza anual",
                            "Herpes zoster",
                            "COVID atualizada")),
                    textRows("notas", "Notas / Pérolas de manejo", 5, "• Se efeitos graves do corticoide: Budesonida (não cirrótico) ou desmame precoce associando Azatioprina.\n• Se leucopenia/TGP↑ com Azatioprina: reduzir/suspender; avaliar 6-TGN/6-MMP; se falha, considerar MMF.\n• Painel de metabólitos (AZA): 6-TGN baixo + 6-MMP alto = metabolizador preferencial → associar Alopurinol e reduzir AZA p/ 1/3.\n• Só considerar desmame após ≥ 24 meses de resposta bioquímica completa + biópsia sem atividade.\n• Cirrose descompensada por HAI ainda pode responder — não contraindicar corticoide de rotina.")));

    /* ──────────────── CBP — transcrita de CbpHeader.tsx ──────────────── */

    private static final String CBP_RISCO = "Estratificação de risco ao diagnóstico (SBH)";
    private static final String CBP_AUDC = "Dose de AUDC";
    private static final String CBP_RISCO_HINT =
            "Qualquer item na coluna de risco intermediário a alto já classifica a paciente como "
                    + "intermediário/alto risco — indica seguimento mais estreito e antecipação de 2ª linha.";

    private static final DiseaseDefinition CBP = new DiseaseDefinition(
            "cbp", "Colangite Biliar Primária", "CBP",
            "Estratificação de risco (SBH), critérios diagnósticos, tratamento, prurido e evolução laboratorial.",
            DiseaseSpecialty.HEPATO,
            List.of(
                    single("riscoIdade", "Idade ao diagnóstico",
                            List.of("Idade mais avançada", "Idade mais jovem (≤ 45 anos)"))
                            .section(CBP_RISCO).hint(CBP_RISCO_HINT)
                            .choiceRow("Características clínicas", "Baixo risco", "Risco intermediário a alto"),
                    single("riscoFibrose", "Fibrose",
                            List.of("Ausência de fibrose avançada", "Presença de fibrose avançada"))
                            .section(CBP_RISCO).choiceRow("Características clínicas"),
                    single("riscoGlobe", "GLOBE score", List.of("GLOBE < 0,3", "GLOBE > 0,3"))
                            .section(CBP_RISCO).choiceRow("Características clínicas"),
                    single("riscoResposta", "Resposta bioquímica ao AUDC",
                            List.of("Resposta adequada", "Resposta incompleta"))
                            .section(CBP_RISCO).choiceRow("Características clínicas"),
                    single("riscoSobreposicao", "Sobreposição",
                            List.of("Sem sobreposição", "Sobreposição com HAI e/ou MASLD"))
                            .section(CBP_RISCO).choiceRow("Características clínicas"),
                    single("riscoBioquimico", "FA, bilirrubina, GGT e anticorpos", List.of(
                            "FA/BT/GGT basais mais baixos; anti-gp210 negativo; anti-centrômero negativo",
                            "FA/BT/GGT basais elevados; anti-gp210 e/ou anti-centrômero positivos"))
                            .section(CBP_RISCO).choiceRow("Perfil bioquímico/sorológico"),
                    single("riscoRigidez", "Elastografia", List.of("< 10 kPa", "> 10 kPa"))
                            .section(CBP_RISCO).choiceRow("Rigidez hepática"),
                    multi("criterios", "Critérios diagnósticos (2 de 3)", List.of(
                            "Bioquímica: FA > 1,5x LSN por > 6 meses",
                            "Sorologia: AMA reagente (título ≥ 1:80)",
                            "Outros autoanticorpos (AMA negativo): gp210 / sp100",
                            "Histologia: colangite destrutiva não supurativa e ductopenia")),
                    multi("associacoes", "Associações", List.of(
                            "Nenhuma associação", "Sjögren", "Esclerodermia", "CREST", "Tireoidite",
                            "Artrite reumatoide", "Doença celíaca")),
                    single("estadiamento", "Estadiamento e meta de resposta",
                            List.of("F0", "F1", "F2", "F3", "F4/Cirrose"))
                            .hint("Elasto < 10 kPa / MRE < 4,3 → resposta aos 12 meses (FA ≤ 1,5x LSN e BT normal). "
                                    + "Elasto ≥ 10 kPa / MRE ≥ 4,3 (compensada, sem HP) → resposta aos 6 meses "
                                    + "(FA < 1,9 LSN / BT < 1x LSN). HPCS com descompensação ou Child B/C → avaliar "
                                    + "MELD 3.0 para transplante."),
                    multi("tratamento", "Tratamento de base", List.of(
                            "Ácido Ursodesoxicólico 13-15 mg/kg/dia (1ª linha)",
                            "Bezafibrato 200-400 mg/dia (2ª linha, off-label)",
                            "Seladelpar 5-10 mg/dia (2ª linha)",
                            "Elafibranor 80 mg/dia (2ª linha)",
                            "Fenofibrato 160-200 mg/dia (2ª linha, off-label)",
                            OUTROS)),
                    outros("tratamento", "Tratamento de base"),
                    number("peso", "Peso", "kg").rowLabel(CBP_AUDC),
                    number("doseAudc", "Dose", "mg/dia").rowLabel(CBP_AUDC),
                    computed("audcMgKg", "Dose por peso", "audc", List.of("peso", "doseAudc"))
                            .placeholder("Informe peso e dose.").rowLabel(CBP_AUDC),
                    multi("prurido", "Prurido", List.of(
                            "Nenhum medicamento para prurido",
                            "Colestiramina 4-16 g/dia",
                            "Rifampicina 150-600 mg/dia",
                            "Naltrexona 12,5-50 mg/dia",
                            "Sertralina 75-100 mg/dia",
                            OUTROS)),
                    outros("prurido", "Prurido"),
                    multi("saudeOssea", "Saúde óssea", List.of(
                            "Nenhum", "Cálcio", "Vitamina D", "Bifosfonados", "Denosumabe", OUTROS)),
                    outros("saudeOssea", "Saúde óssea"),
                    table("labs", "Evolução laboratorial (acompanhamento)", List.of(
                            new TableColumn("data", "Data", "AAAA-MM"),
                            new TableColumn("igm", "IgM", null),
                            new TableColumn("fa", "FA", null),
                            new TableColumn("ggt", "GGT", null),
                            new TableColumn("tgo", "TGO", null),
                            new TableColumn("tgp", "TGP", null),
                            new TableColumn("bb", "BB", null),
                            new TableColumn("fibroscan", "FibroScan (kPa)", null)))
                            .hint("Registre a cada consulta. A tabela fica salva no cabeçalho e aparece nos retornos "
                                    + "para acompanhar a resposta ao tratamento."),
                    textRows("notas", "Notas adicionais", 2,
                            "Observações, datas relevantes, biópsia, transplante…")));

    /* ──────────────── CEP — transcrita de CepHeader.tsx ──────────────── */

    private static final DiseaseDefinition CEP = new DiseaseDefinition(
            "cep", "Colangite Esclerosante Primária", "CEP",
            "Perfil diagnóstico, fenótipo, associação com DII, IgG4, estenose dominante e tratamento.",
            DiseaseSpecialty.HEPATO,
            List.of(
                    multi("perfilDx", "Perfil diagnóstico", List.of(
                            "Colangio-RM ('contas de rosário')",
                            "Biópsia hepática compatível",
                            "CPRE diagnóstica")),
                    single("fenotipo", "Fenótipo", List.of(
                            "Grandes ductos",
                            "Pequenos ductos (biópsia compatível + imagem normal)")),
                    // Opções abaixo do rótulo, não ao lado (pedido da cliente, 13/10/2026).
                    single("dii", "DII", List.of("Não", "RCU", "Doença de Crohn")),
                    single("igg4", "IgG4", List.of("IgG4 normal", "IgG4 aumentado")),
                    single("estenoseDom", "Estenose dominante", List.of("Presente", "Ausente", "Sintomática"))
                            .hint("Definição: estenose ≥ 1,5 mm no ducto hepático comum ou ≥ 1,0 mm nos ductos "
                                    + "hepáticos direito/esquerdo a até 2 cm da confluência, vista em colangio-RM ou CPRE."),
                    // Só com estenose dominante presente (decisão do usuário: não em "Sintomática").
                    multi("estenoseManejo", "Manejo da estenose", List.of(
                            "Dilatação por balão", "Stent biliar",
                            "Escovado / biópsia endobiliar", "Dreno biliar", OUTROS))
                            .showIfEquals("estenoseDom", "Presente"),
                    outros("estenoseManejo", "Manejo da estenose")
                            .showIfEquals("estenoseDom", "Presente"),
                    multi("tratamento", "Tratamento de base", List.of(
                            "Ácido Ursodesoxicólico 17–23 mg/kg/dia",
                            "UDCA dose baixa 13–15 mg/kg/dia",
                            OUTROS))
                            .hint("UDCA sem prova de aumento de sobrevida; doses > 28 mg/kg/dia são deletérias."),
                    outros("tratamento", "Tratamento de base"),
                    multi("prurido", "Prurido", List.of(
                            "Nenhum medicamento para prurido",
                            "Colestiramina 4–16 g/dia",
                            "Rifampicina 150–600 mg/dia",
                            "Naltrexona 12,5–50 mg/dia",
                            "Sertralina 75–100 mg/dia",
                            OUTROS)),
                    outros("prurido", "Prurido"),
                    multi("saudeOssea", "Saúde óssea", List.of(
                            "Nenhum", "Cálcio", "Vitamina D", "Bifosfonados", "Denosumabe", OUTROS)),
                    outros("saudeOssea", "Saúde óssea"),
                    textRows("notas", "Notas adicionais", 2, "Observações, datas, biópsia, transplante…")));

    /* ──────────────── Esteatose — transcrita de EsteatoseHeader.tsx ──────────────── */

    private static final String EST_FIB4 = "FIB-4 (estratificação inicial)";
    private static final String EST_ELASTO = "Elastografia hepática";
    private static final String EST_BIOPSIA = "Biópsia hepática";
    private static final String EST_PREVENT = "Risco cardiovascular — PREVENT (AHA)";
    private static final List<String> EST_SIM_NAO = List.of("Sim", "Não");
    // Os dois textos são lidos pela conta da meta de LDL-c (computed-fields.ts).
    private static final String EST_DCV = "DCV aterosclerótica estabelecida";
    private static final String EST_RISCO_EXTREMO = "Risco extremo (eventos recorrentes/polivascular)";

    /**
     * Método de estadiamento (pedido de 14/10/2026): cada método abre só os
     * campos dele. RNM, Fibroscan e ARFI dão o mesmo par fibrose/rigidez e
     * esteatose/CAP, então compartilham os campos que antes eram só da VCTE.
     * As chaves dos campos abertos não mudaram — a V26 marcou o método nos
     * cabeçalhos já gravados, para nada ficar escondido (e ser descartado no
     * próximo salvar, que só envia campo visível).
     */
    private static final String EST_METODO = "metodoEstadiamento";
    private static final List<String> EST_METODOS = List.of("RNM", "FIB-4", "Fibroscan", "ARFI", "Biópsia");
    private static final List<String> EST_METODOS_ELASTO = List.of("RNM", "Fibroscan", "ARFI");

    private static DiseaseField fib4(DiseaseField field) {
        return field.rowLabel(EST_FIB4).showIfIncludes(EST_METODO, List.of("FIB-4"));
    }

    private static DiseaseField elasto(DiseaseField field, String rowLabel) {
        return field.rowLabel(rowLabel).showIfIncludes(EST_METODO, EST_METODOS_ELASTO);
    }

    private static DiseaseField biopsia(DiseaseField field) {
        return field.compact().section(EST_BIOPSIA).showIfIncludes(EST_METODO, List.of("Biópsia"));
    }

    /** Uma célula do quadro PREVENT do protótipo (grade com o link da calculadora oficial). */
    private static DiseaseField prevent(DiseaseField field) {
        return field.rowLabel(EST_PREVENT).style(DiseaseFieldStyle.CALCULATOR_PANEL);
    }

    private static final DiseaseDefinition ESTEATOSE = new DiseaseDefinition(
            "esteatose", "Esteatose Hepática (MASLD/MASH)", "MASLD",
            "FIB-4, elastografia, biópsia, causas a descartar, fatores cardiometabólicos e risco cardiovascular.",
            DiseaseSpecialty.HEPATO,
            List.of(
                    multi(EST_METODO, "Método de estadiamento", EST_METODOS),
                    fib4(number("fib4Idade", "Idade"))
                            .hint("< 1,30 baixo risco (< 2,00 a partir de 65 anos) · até 2,67 → encaminhar elastografia (VCTE) · > 2,67 alto risco (≥ F3)"),
                    fib4(number("fib4Ast", "AST", "U/L")),
                    fib4(number("fib4Alt", "ALT", "U/L")),
                    fib4(number("fib4Plaquetas", "Plaquetas", "10⁹/L")),
                    // Calculado na tela a partir dos quatro acima, como no protótipo.
                    computed("fib4Resultado", "FIB-4", "fib4",
                            List.of("fib4Idade", "fib4Ast", "fib4Alt", "fib4Plaquetas"))
                            .showIfIncludes(EST_METODO, List.of("FIB-4")),
                    elasto(single("elasto", "Fibrose", List.of("F0-F1", "F2", "F3", "F4")).inlined(), EST_ELASTO),
                    elasto(text("elastoKpa", "Rigidez", "kPa"), EST_ELASTO),
                    elasto(single("cap", "Grau", List.of("S1", "S2", "S3")).inlined(), "Esteatose (CAP)"),
                    elasto(text("capValor", "CAP", "dB/m"), "Esteatose (CAP)"),
                    // Os graus têm o 0 para o NAS fechar (esteatose 0–3, inflamação
                    // 0–3, balonização 0–2), e o NAS é conta, não campo digitado
                    // (pedido da cliente, 13/10/2026).
                    biopsia(single("biopsiaFibrose", "Fibrose", List.of("F0", "F1", "F2", "F3", "F4"))),
                    biopsia(single("biopsiaEsteatose", "Esteatose", List.of("0", "1", "2", "3"))),
                    biopsia(single("biopsiaInflam", "Inflamação lobular", List.of("0", "1", "2", "3"))),
                    biopsia(single("biopsiaBalon", "Balonização", List.of("0", "1", "2"))),
                    biopsia(computed("nasCalculado", "NAS (0–8)", "sum",
                            List.of("biopsiaEsteatose", "biopsiaInflam", "biopsiaBalon"))),
                    // Primeiro a pergunta; a lista de causas só abre no "Não" (pedido
                    // de 14/10/2026). Cabeçalhos que já tinham causas marcadas
                    // ganharam "Não" na V26, para a lista continuar aparecendo.
                    single("outrasCausasDescartadas", "Descartadas outras causas de esteatose", EST_SIM_NAO)
                            .buttons().inlined(),
                    multi("causasDescartadas", "Causas a descartar (marcar as já investigadas/descartadas)", List.of(
                            "Álcool (> 20 g/dia mulher, > 30 g/dia homem)",
                            "Doença de Wilson (ceruloplasmina, cobre 24h)",
                            "Hemocromatose (saturação Tf, ferritina)",
                            "Hepatites B/C",
                            "Hepatite autoimune (FAN, ASMA, IgG)",
                            "Colangite biliar primária (AMA, FA)",
                            "Deficiência de α1-antitripsina",
                            "Doença celíaca (anti-tTG)",
                            "Medicamentosa (amiodarona, MTX, tamoxifeno, corticoide)",
                            "Endócrina (hipotireoidismo, hipopituitarismo)",
                            "Síndromes lipodistróficas"))
                            .showIfEquals("outrasCausasDescartadas", "Não"),
                    single("causaPrincipal", "Etiologia provável", List.of(
                            "Metabólica (MASLD)", "Alcoólica (ALD)", "Mista (MetALD)", "Outra")),
                    multi("cardiometabolicos", "Fatores cardiometabólicos (≥ 1 define MASLD)", List.of(
                            "IMC ≥ 25 kg/m² (≥ 23 em asiáticos)",
                            "CA aumentada (≥ 94 H / ≥ 80 M; ≥ 90/80 asiáticos)",
                            "Glicemia jejum ≥ 100 mg/dL ou HbA1c ≥ 5,7% ou DM2",
                            "PA ≥ 130/85 mmHg ou em tratamento",
                            "TG ≥ 150 mg/dL ou em tratamento",
                            "HDL < 40 (H) / < 50 (M) mg/dL ou em tratamento"))
                            .showIfEquals("causaPrincipal", "Metabólica (MASLD)", "Mista (MetALD)"),
                    // Quadro PREVENT do protótipo: a equação é calculada aqui (04/11/2026;
                    // antes o resultado era colado à mão) e "Usar resultado" leva o valor
                    // para riscoCv10, a chave de sempre, que também alimenta a meta de
                    // LDL-c. O que foi gravado continua valendo.
                    prevent(links("preventCalculadora", "Calculadora oficial", List.of(new LinkItem(
                            "Calculadora oficial",
                            "https://professional.heart.org/en/guidelines-and-statements/prevent-calculator")))),
                    prevent(single("preventSexo", "Sexo", List.of("Feminino", "Masculino"))),
                    prevent(text("preventIdade", "Idade (30–79)")),
                    prevent(text("preventPas", "PAS (mmHg)")),
                    prevent(text("preventColTotal", "Col total (mg/dL)")),
                    prevent(text("preventHdl", "HDL (mg/dL)")),
                    prevent(text("preventEgfr", "eGFR (mL/min)")),
                    prevent(text("preventImc", "IMC (kg/m²)")),
                    prevent(text("preventHba1c", "HbA1c % (opcional)", "ex.: 6,2")),
                    prevent(text("preventUacr", "Relação Albumina-Creatinina Urinária mg/g (opcional)", "ex.: 30")),
                    prevent(text("riscoCv10", "Risco 10 anos (%)", "ex.: 8,5")),
                    prevent(single("preventFumante", "Fumante", EST_SIM_NAO)),
                    prevent(single("preventDm", "Diabetes", EST_SIM_NAO)),
                    prevent(single("preventTratHas", "Trata HAS", EST_SIM_NAO)),
                    prevent(single("preventEstatina", "Em estatina", EST_SIM_NAO)),
                    prevent(computed("preventResultado", "PREVENT — resultado", "prevent", List.of(
                            "preventSexo", "preventIdade", "preventPas", "preventColTotal", "preventHdl",
                            "preventEgfr", "preventFumante", "preventDm", "preventTratHas", "preventEstatina",
                            "preventHba1c", "preventUacr"), "riscoCv10")
                            .placeholder("Preencha sexo, idade (30–79), PAS, colesterol total, HDL, eGFR e as 4 "
                                    + "perguntas Sim/Não para calcular automaticamente.")),
                    prevent(text("preventLdl", "LDL-c atual (mg/dL)")),
                    prevent(multi("preventCondicoes", "Condição clínica", List.of(
                            EST_DCV, EST_RISCO_EXTREMO))),
                    prevent(computed("preventMetaLdl", "Meta de LDL-c (SBC 2025)", "ldlGoal",
                            List.of("riscoCv10", "preventCondicoes", "preventLdl"))
                            .placeholder("Calcule ou informe o risco PREVENT (ou marque DCV estabelecida) para ver "
                                    + "a meta de LDL-c.")),
                    prevent(note("preventMetas", "Metas: Diretriz Brasileira de Dislipidemias (SBC 2025) — PREVENT < 5% "
                            + "baixo (<115), 5–19,9% intermediário (<100), ≥ 20% alto (<70); DCV estabelecida <50; "
                            + "extremo <40. Estatina moderada reduz ~30–50% e alta intensidade ≥ 50%; ezetimiba "
                            + "+~20–25%; iPCSK9/inclisirana +~50–60%. Condições como DM com lesão de órgão-alvo, DRC ou "
                            + "LDL ≥ 190 mg/dL podem elevar a categoria — decisão médica.")),
                    prevent(note("preventInstrucao", "Cálculo no próprio prontuário pela equação PREVENT oficial (AHA; "
                            + "Khan SS et al., Circulation 2024, com erratum de out/2026) — risco de DCV total (IAM, "
                            + "AVC e insuficiência cardíaca) em 10 anos. IMC não entra no modelo. Preenchendo HbA1c e/ou "
                            + "Relação Albumina-Creatinina Urinária, o cálculo passa automaticamente para o modelo "
                            + "completo correspondente.")),
                    textRows("notas", "Notas adicionais", 2,
                            "Observações, planos de seguimento, transplante…")));

    // --- Modelos gerais de consulta (não são doenças) ---
    //
    // Os três cards "gerais" de cada aba do protótipo. Entram aqui, e não num
    // registro novo, porque o motor já os representa sem nenhuma mudança —
    // mesmo precedente do GASTRO_OP2, que também é anamnese guiada e não uma
    // doença. O que cada um acrescenta é só configuração.
    //
    // Regra que vale para os três: os campos que o protótipo repete no
    // "Cabeçalho (dados do paciente)" — nome, CPF, nome da mãe, endereço,
    // data de nascimento, naturalidade e procedência — NÃO são transcritos.
    // Eles já são o cadastro do paciente aqui, e já saem no cabeçalho CFM do
    // documento impresso; duplicá-los criaria uma segunda fonte da verdade
    // para o mesmo dado. Só entram os quatro que o cadastro ainda não tem.

    private static final List<String> AUSENTE_PRESENTE = List.of("Ausente", "Presente");
    private static final String SINTOMAS_GI = "Sintomas gastrointestinais";
    private static final String EXAMES_PREVIOS = "Exames prévios";

    // Sexo, profissão, estado civil e religião saíam daqui como "identificação
    // complementar" do cabeçalho. Viraram cadastro do paciente (V19) a pedido
    // da cliente: são identificação, não achado da consulta, e redigitá-los a
    // cada atendimento criaria uma segunda fonte da verdade.

    /**
     * Sintoma da Gastro — Guiada ({@code consulta-gastro.tsx}): pílulas
     * Ausente/Presente e, só com "Presente", as características (quando o
     * protótipo as tem) e o campo de detalhe.
     */
    private static List<DiseaseField> sintoma(String key, String label, List<String> caracteristicas) {
        List<DiseaseField> fields = new java.util.ArrayList<>();
        fields.add(single(key, label, AUSENTE_PRESENTE).buttons().inlined().section(SINTOMAS_GI));
        if (!caracteristicas.isEmpty()) {
            fields.add(multi(key + "Tipo", label + " — características", caracteristicas).buttons().inlined()
                    .section(SINTOMAS_GI).showIfEquals(key, "Presente"));
        }
        fields.add(textRows(key + "Detalhe", label + " — detalhe", 2).section(SINTOMAS_GI)
                .showIfEquals(key, "Presente"));
        return fields;
    }

    private static List<DiseaseField> concat(List<? extends DiseaseField>... groups) {
        return java.util.Arrays.stream(groups).flatMap(List::stream).map(f -> (DiseaseField) f).toList();
    }

    /**
     * "Consulta de Hepatologia — geral" ({@code consulta.tsx}).
     *
     * <p>Só a identificação complementar: todo o corpo dessa tela do protótipo
     * (HMA, antecedentes, hábitos, suplementos/chás/fitoterápicos, antropometria,
     * exame físico e conduta) já é, campo a campo, o conjunto genérico de
     * {@link ConsultationSectionRegistry} que o formulário de registro monta —
     * inclusive o bloco de suplementos, que só aparece em doença HEPATO. Repetir
     * esses campos no cabeçalho os mostraria duas vezes na mesma tela.
     */
    private static final DiseaseDefinition HEPATO_GERAL = new DiseaseDefinition(
            "hepato-geral", "Consulta de Hepatologia — geral", "Hepato geral",
            "Anamnese hepatológica completa: antecedentes, hábitos, suplementos e fitoterápicos, "
                    + "antropometria, exame físico e conduta.",
            DiseaseSpecialty.HEPATO,
            // Só o "Cabeçalho livre" (pedido da cliente: o card de cabeçalho
            // aparecia vazio). Sexo, profissão, estado civil e religião viraram
            // cadastro do paciente (V19), e o resto da tela já é o conjunto
            // genérico de consulta.
            List.of(textRows("cabecalhoLivre", "Cabeçalho livre", 3)),
            false,
            // Primeiro card de "Prontuários modelo", a pedido da cliente.
            0);

    /**
     * "Gastro — Guiada" ({@code consulta-gastro.tsx}; era a "opção 1"). No
     * export de 06/10/2026 o protótipo fundiu nela a antiga "opção 3": a
     * anamnese virou guiada por sintomas (Ausente/Presente + detalhe, com
     * características em disfagia e sangramento), e saíram o hábito
     * alimentar e o bloco de medicações/exposições. AF e cirurgias GI também
     * saíram daqui: o conjunto genérico de consulta já tem esses dois campos,
     * e o protótipo mostra um de cada.
     *
     * <p>As chaves dos sintomas são novas ({@code sint…}) de propósito:
     * {@code dispepsia} era texto livre, e reaproveitar a chave como
     * Ausente/Presente faria cabeçalhos antigos falharem na validação.
     */
    private static final DiseaseDefinition GASTRO_OP1 = new DiseaseDefinition(
            "gastro-op1", "Gastro — Guiada", "Gastro Guiada",
            "Anamnese guiada por sintomas gastrointestinais, antecedentes, exame físico e escalas.",
            DiseaseSpecialty.GASTRO,
            // O cabeçalho ficou só com a caixa livre: a anamnese por sintomas
            // passou para dentro de "Anamnese & antecedentes" (pedido da
            // cliente, 13/10/2026), onde é dado de cada consulta.
            List.of(textRows("cabecalhoLivre", "Cabeçalho livre", 3)),
            false,
            // Primeiro card da aba Gastroenterologia, como no protótipo.
            0).withConsultation(ConsultationSectionRegistry.primeiraConsultaWith(
                    // HMA → sintomas → antecedentes → hábitos → exames →
                    // exames endoscópicos, como nas fotos da cliente. "Outros
                    // exames" saiu: o campo "Exames" genérico já cobre.
                    concat(
                            sintoma("sintDor", "Dor abdominal (localização / caráter / irradiação / intensidade 0–10)",
                                    List.of()),
                            sintoma("sintNauseas", "Náuseas/vômitos — frequência, conteúdo, relação alimentar", List.of()),
                            sintoma("sintDispepsia", "Sintomas dispépticos (azia, regurgitação, plenitude, eructação)",
                                    List.of()),
                            sintoma("sintDisfagia", "Disfagia / odinofagia",
                                    List.of("Sólidos", "Líquidos", "Intermitente", "Progressiva")),
                            // No protótipo o hábito intestinal fica entre a disfagia e o sangramento.
                            List.of(textRows("habito", "Hábito intestinal (forma — Bristol, frequência, sangue, muco)", 2)
                                    .section(SINTOMAS_GI)),
                            sintoma("sintSangramento", "Sangramento digestivo",
                                    List.of("Hematêmese", "Melena", "Enterorragia", "Hematoquezia")),
                            sintoma("sintDistensao", "Distensão / flatulência", List.of()),
                            sintoma("sintPerdaPeso", "Perda ponderal involuntária", List.of())
                    ).stream().map(f -> f.subsection(SINTOMAS_GI)).toList(),
                    List.of(textRows("endoPrevia", "Exames endoscópicos", 2))));

    /**
     * "Gastro — Livre" ({@code branco.tsx}, modelo {@code gastro_primeira};
     * era a "opção 2"). Deixou de ser só texto: no protótipo ganhou
     * antecedentes, hábitos, exame físico estruturado, hipóteses e conduta —
     * que é o conjunto genérico de consulta deste motor. Por isso deixou de
     * ser {@code freeForm}, e o que sobra para o cabeçalho é o campo
     * "Cabeçalho livre".
     */
    private static final DiseaseDefinition GASTRO_BRANCO = new DiseaseDefinition(
            "gastro-branco", "Gastro — Livre", "Gastro Livre",
            "Cabeçalho livre, antecedentes, hábitos, exames, exame físico, hipóteses e conduta.",
            DiseaseSpecialty.GASTRO,
            List.of(textRows("cabecalhoLivre", "Cabeçalho livre", 3)),
            false,
            1);

    /**
     * "Consulta/Retorno — Página em branco" ({@code exames.tsx}): a folha livre,
     * sem modelo nenhum. Aparece nas duas abas.
     *
     * <p>A metade "pedido de exames" da tela do protótipo (catálogo de exames +
     * requisição assinada para impressão) não entra: é uma feature própria, que
     * ainda não existe aqui — a folha livre é a parte que o motor já sustenta.
     */
    private static final DiseaseDefinition PAGINA_BRANCA = new DiseaseDefinition(
            "pagina-branca", "Consulta/Retorno — Página em branco", "Em branco",
            "Cabeçalho livre, escalas e calculadoras, hipótese diagnóstica e conduta.",
            DiseaseSpecialty.AMBAS,
            List.of(textRows("texto", "Anotação livre", 18,
                    "Escreva livremente o registro do atendimento…")),
            true,
            // Depois dos modelos gerais de cada aba (Hepato geral; Gastro Guiada e Livre).
            2);

    public static final Map<String, DiseaseDefinition> ALL = List.of(
                    DRGE, DII, DISFAGIA, EOE, CIRROSE, GASTRO_OP2, CELIACA, HCV, HBV, HAI, CBP, CEP, ESTEATOSE,
                    HEPATO_GERAL, GASTRO_OP1, GASTRO_BRANCO, PAGINA_BRANCA).stream()
            .collect(Collectors.toUnmodifiableMap(DiseaseDefinition::slug, d -> d));

    private DiseaseRegistry() {
    }

    public static DiseaseDefinition getOrThrow(String slug) {
        DiseaseDefinition definition = ALL.get(slug);
        if (definition == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Doença inválida.");
        }
        return definition;
    }

    /**
     * Valida que cada chave em {@code data} corresponde a um campo da doença,
     * e que valores de campos SINGLE/MULTI estão entre as opções permitidas.
     */
    public static void validate(String slug, Map<String, Object> data) {
        DiseaseDefinition definition = getOrThrow(slug);
        Map<String, DiseaseField> fieldsByKey = definition.fields().stream()
                .collect(Collectors.toMap(DiseaseField::key, f -> f));

        for (Map.Entry<String, Object> entry : data.entrySet()) {
            DiseaseField field = fieldsByKey.get(entry.getKey());
            if (field == null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Campo desconhecido para " + slug + ": " + entry.getKey());
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
        } else if (field.type() == DiseaseFieldType.TABLE) {
            // Linhas repetíveis — cada linha é um mapa livre (chave da coluna
            // → valor). Validação fica só na forma (lista de objetos), sem
            // travar em quais colunas exatamente vieram preenchidas.
            if (!(value instanceof List<?> rows) || rows.stream().anyMatch(row -> !(row instanceof Map))) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Valor inválido para " + field.key() + ".");
            }
        } else if (field.type() == DiseaseFieldType.LINKS || field.type() == DiseaseFieldType.NOTE
                || field.type() == DiseaseFieldType.COMPUTED) {
            // Campo somente-leitura (conteúdo vem do próprio config, não do
            // paciente) — nunca deveria chegar valor pra ele.
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Campo somente leitura: " + field.key() + ".");
        }
        // TEXT/NUMBER: qualquer string é aceita, sem validação de formato.
    }
}
