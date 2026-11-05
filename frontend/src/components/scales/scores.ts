/**
 * Contas das escalas que vieram do export do Lovable de 27/10/2026, onde
 * ficam separadas da tela e têm testes (`liver-risk-scores`, `audit-scores`,
 * `crohn-scores`, `mayo-score`). As fórmulas e os cortes são os de lá, que a
 * cliente conferiu ("o do Lovable está certo"); aqui só ficam juntas.
 */

/**
 * Número clínico digitado: vazio ou com lixo ("12abc") não vira zero nem 12 —
 * diferente do `num` das primitivas, que aceita o prefixo numérico.
 */
export function clinicalNumber(value: string): number | null {
  if (!value.trim()) return null;
  const result = Number(value.trim().replace(",", "."));
  return Number.isFinite(result) ? result : null;
}

const positive = (value: number | null | undefined): value is number =>
  value !== null && value !== undefined && Number.isFinite(value) && value > 0;

function valid(value: number | null, min: number, max = Infinity, integer = false): value is number {
  return value !== null && Number.isFinite(value) && value >= min && value <= max && (!integer || Number.isInteger(value));
}

/* ------------------------------------------------------------------ */
/* ANTICIPATE / ANTICIPATE-NASH (Barcelona Liver Unit)                 */
/* ------------------------------------------------------------------ */

export const ANTICIPATE_REFERENCE = "https://www.bcn-liverhuvh.com/resources";

/** Com `bmi` é o ANTICIPATE-NASH; sem, o ANTICIPATE (plaquetas limitadas a 150). */
export function calculateAnticipate(lsm: number | null, platelets: number | null, bmi?: number | null) {
  if (!positive(lsm) || !positive(platelets) || (bmi !== undefined && !positive(bmi))) return null;
  const nash = bmi !== undefined;
  const effectivePlatelets = nash ? platelets : Math.min(platelets, 150);
  const lp = nash
    ? -3.9529402 + 2.2835809 * Math.log(lsm) - 0.033777725 * bmi! - 0.014490895 * effectivePlatelets
    : -6.3320165 + 3.1001014 * Math.log(lsm) - 0.020481545 * effectivePlatelets;
  const probability = 1 / (1 + Math.exp(-lp));
  const baseline = nash ? 0.996 : 0.997;
  const coefficient = nash ? 5.157606 : 5.1846183;
  const lre = -Math.expm1(Math.log(baseline) * Math.exp(coefficient * probability));
  return { csph: probability * 100, lre3: lre * 100, capped: effectivePlatelets !== platelets };
}

/* ------------------------------------------------------------------ */
/* UK-PBC                                                              */
/* ------------------------------------------------------------------ */

export const UK_PBC_REFERENCE = "https://www.mdapp.co/uk-pbc-risk-score-calculator-360/";

export type UkPbcInput = {
  alp: number | null; alpUln: number | null;
  transaminase: number | null; transaminaseUln: number | null;
  bilirubin: number | null; bilirubinUln: number | null;
  albumin: number | null; albuminLln: number | null;
  platelets: number | null; plateletsLln: number | null;
};

/**
 * Equação publicada (Carbone et al., 2016). A versão anterior daqui esquecia
 * o `/10` dentro do logaritmo da bilirrubina e superestimava o risco.
 */
export function calculateUkPbc(input: UkPbcInput) {
  const values = Object.values(input);
  if (!values.every(positive)) return null;
  const { alp, alpUln, transaminase, transaminaseUln, bilirubin, bilirubinUln, albumin, albuminLln, platelets, plateletsLln } =
    input as Record<keyof UkPbcInput, number>;
  const lp =
    0.0287854 * (alp / alpUln - 1.722136304) -
    0.0422873 * (10 / (transaminase / transaminaseUln) - 8.675729006) +
    1.4199 * (Math.log(bilirubin / bilirubinUln / 10) + 2.709607778) -
    1.960303 * (albumin / albuminLln - 1.17673001) -
    0.4161954 * (platelets / plateletsLln - 1.873564875);
  const risk = (baseline: number) => -Math.expm1(Math.log(baseline) * Math.exp(lp)) * 100;
  const result = { r5: risk(0.982), r10: risk(0.941), r15: risk(0.893) };
  return Object.values(result).every(Number.isFinite) ? result : null;
}

/* ------------------------------------------------------------------ */
/* AUDIT / AUDIT-C                                                     */
/* ------------------------------------------------------------------ */

export const AUDIT_REFERENCE =
  "https://www.msdmanuals.com/pt/profissional/multimedia/clinical-calculator/question%C3%A1rio-audit-para-triagem-do-consumo-de-bebidas-alco%C3%B3licas";
export const AUDIT_C_REFERENCE = "https://www.tadeclinicagem.com.br/guia/calculadoras/82/audit-c/";

type AuditOption = readonly [string, number];
const frequency: AuditOption[] = [["Nunca", 0], ["Uma vez por mês ou menos", 1], ["Duas a quatro vezes por mês", 2], ["Duas a três vezes por semana", 3], ["Quatro ou mais vezes por semana", 4]];
const quantity: AuditOption[] = [["1 ou 2", 0], ["3 ou 4", 1], ["5 ou 6", 2], ["7 a 9", 3], ["10 ou mais", 4]];
const recurrence: AuditOption[] = [["Nunca", 0], ["Menos de uma vez por mês", 1], ["Mensalmente", 2], ["Semanalmente", 3], ["Diariamente ou quase diariamente", 4]];
const consequences: AuditOption[] = [["Não", 0], ["Sim, mas não no último ano", 2], ["Sim, durante o último ano", 4]];

export type AuditItem = { question: string; options: AuditOption[] };

export const AUDIT_ITEMS: AuditItem[] = [
  { question: "Com que frequência você consome bebidas que contêm álcool?", options: frequency },
  { question: "Quantas bebidas com álcool você consome em um dia normal?", options: quantity },
  { question: "Com que frequência você consome cinco ou mais bebidas em uma única ocasião?", options: recurrence },
  { question: "No último ano, com que frequência você não conseguiu parar de beber depois de ter começado?", options: recurrence },
  { question: "No último ano, com que frequência deixou de fazer algo normalmente esperado de você por causa da bebida?", options: recurrence },
  { question: "No último ano, com que frequência precisou de uma bebida pela manhã para se recuperar de uma noite de bebedeira?", options: recurrence },
  { question: "No último ano, com que frequência sentiu culpa ou remorso depois de beber?", options: recurrence },
  { question: "No último ano, com que frequência esqueceu o que aconteceu durante a noite devido à bebedeira?", options: recurrence },
  { question: "Você ou outra pessoa sofreu alguma lesão porque você bebeu?", options: consequences },
  { question: "Algum parente, amigo ou profissional de saúde se preocupou com seu consumo ou sugeriu que diminuísse?", options: consequences },
];

export const AUDIT_C_ITEMS: AuditItem[] = [
  { question: "Com que frequência consumiu bebida alcoólica nos últimos 12 meses?", options: frequency },
  { question: "Quando bebe, quantas doses-padrão costuma consumir em um dia?", options: quantity },
  { question: "Nos últimos 12 meses, com que frequência consumiu seis ou mais doses na mesma ocasião?", options: recurrence },
];

const answered = (items: AuditItem[], answers: readonly (number | null)[], index: number) =>
  answers[index] !== null && items[index].options.some(([, value]) => value === answers[index]);

export function calculateAudit(answers: readonly (number | null)[]) {
  if (answers.length !== 10 || !answers.every((_, i) => answered(AUDIT_ITEMS, answers, i))) return null;
  const total = answers.reduce<number>((acc, answer) => acc + (answer ?? 0), 0);
  const category =
    total < 8 ? "baixo risco" : total < 16 ? "risco médio" : total < 20 ? "alto risco" : "provável dependência — requer avaliação diagnóstica";
  return { total, category };
}

export function calculateAuditC(answers: readonly (number | null)[], sex: "male" | "female" | null) {
  if (answers.length !== 3 || !answered(AUDIT_C_ITEMS, answers, 0)) return null;
  // Sem consumo no ano, as perguntas 2 e 3 não se aplicam.
  if (answers[0] === 0) return { total: 0, category: "sem consumo nos últimos 12 meses" };
  if (!answers.every((_, i) => answered(AUDIT_C_ITEMS, answers, i)) || sex === null) return null;
  const total = answers.reduce<number>((acc, answer) => acc + (answer ?? 0), 0);
  const positiveScreen = total >= (sex === "female" ? 3 : 4);
  return {
    total,
    category: positiveScreen
      ? "rastreamento positivo — avaliar consumo e possíveis danos"
      : "abaixo do ponto de corte — não exclui risco",
  };
}

/* ------------------------------------------------------------------ */
/* Doença de Crohn: CDAI e Harvey-Bradshaw                             */
/* ------------------------------------------------------------------ */

export type ClinicalSex = "male" | "female";

export const CDAI_COMPLICATIONS = [
  "Artrite / artralgia",
  "Irite / uveíte",
  "Eritema nodoso, pioderma gangrenoso ou estomatite aftosa",
  "Fissura anal, fístula ou abscesso",
  "Outra fístula",
  "Febre >37,8 °C na última semana",
];

export const HBI_COMPLICATIONS = [
  "Artralgia", "Uveíte", "Eritema nodoso", "Úlceras aftosas", "Pioderma gangrenoso", "Fissuras anais", "Nova fístula", "Abscesso",
];

export function cdaiCategory(total: number) {
  return total < 150 ? "remissão" : total < 220 ? "leve" : total <= 450 ? "moderada a grave" : "grave";
}

export function hbiCategory(total: number) {
  return total < 5 ? "remissão" : total < 8 ? "leve" : total <= 16 ? "moderada" : "grave";
}

/**
 * CDAI (Best et al.): fezes = total em 7 dias ×2; dor e bem-estar = média
 * diária ×35 e ×49; complicações ×20; antidiarreico ×30; massa (0/2/5) ×10;
 * hematócrito (47 homem / 42 mulher − Hct) ×6; desvio do peso ideal (%).
 */
export function calculateCdai(input: {
  stools: number | null; pain: number | null; wellbeing: number | null; sex: ClinicalSex | null;
  hematocrit: number | null; weight: number | null; idealWeight: number | null;
  antidiarrheal: number | null; mass: number | null; complications: number;
}) {
  const { stools, pain, wellbeing, sex, hematocrit, weight, idealWeight, antidiarrheal, mass, complications } = input;
  if (
    !valid(stools, 0, Infinity, true) || !valid(pain, 0, 3) || !valid(wellbeing, 0, 4) || !sex ||
    !valid(hematocrit, 0, 100) || !valid(weight, Number.MIN_VALUE) || !valid(idealWeight, Number.MIN_VALUE) ||
    (antidiarrheal !== 0 && antidiarrheal !== 1) || (mass !== 0 && mass !== 2 && mass !== 5) ||
    !valid(complications, 0, 6, true)
  ) {
    return null;
  }
  const hematocritDifference = (sex === "male" ? 47 : 42) - hematocrit;
  const weightDifference = (100 * (idealWeight - weight)) / idealWeight;
  const total =
    2 * stools + 35 * pain + 49 * wellbeing + 20 * complications + 30 * antidiarrheal + 10 * mass +
    6 * hematocritDifference + weightDifference;
  return { total, category: cdaiCategory(total), hematocritDifference, weightDifference };
}

export function calculateHbi(input: {
  wellbeing: number | null; pain: number | null; stools: number | null; mass: number | null; complications: number;
}) {
  const { wellbeing, pain, stools, mass, complications } = input;
  if (
    !valid(wellbeing, 0, 4, true) || !valid(pain, 0, 3, true) || !valid(stools, 0, Infinity, true) ||
    !valid(mass, 0, 3, true) || !valid(complications, 0, 8, true)
  ) {
    return null;
  }
  const total = wellbeing + pain + stools + mass + complications;
  return { total, category: hbiCategory(total) };
}

/* ------------------------------------------------------------------ */
/* Mayo completo (RCU)                                                 */
/* ------------------------------------------------------------------ */

export const MAYO_REFERENCE = "https://www.mdcalc.com/calc/3675/mayo-score-disease-activity-index-dai-ulcerative-colitis";

export const MAYO_ITEMS: { key: string; label: string; options: string[] }[] = [
  { key: "freq", label: "Frequência evacuatória", options: [
    "Normal (habitual do paciente)", "1–2 evacuações/dia acima do habitual", "3–4 evacuações/dia acima do habitual", ">4 evacuações/dia acima do habitual",
  ] },
  { key: "sang", label: "Sangramento retal", options: [
    "Ausente", "Sangue visível com fezes em menos de metade das evacuações", "Sangue visível com fezes em metade ou mais das evacuações", "Eliminação de sangue sem fezes",
  ] },
  { key: "endo", label: "Aspecto da mucosa à endoscopia", options: [
    "Normal ou doença inativa", "Leve: eritema, redução do padrão vascular e friabilidade discreta", "Moderada: eritema acentuado, ausência de padrão vascular, friabilidade e erosões", "Grave: sangramento espontâneo e ulcerações",
  ] },
  { key: "pga", label: "Avaliação global do médico", options: ["Normal", "Doença leve", "Doença moderada", "Doença grave"] },
];

/** Remissão exige total ≤2 **e** nenhum subescore acima de 1. */
export function calculateMayo(values: Record<string, number>) {
  const scores = MAYO_ITEMS.map(({ key }) => values[key]);
  if (scores.some((score) => !Number.isInteger(score) || score < 0 || score > 3)) return null;
  const total = scores.reduce((acc, score) => acc + score, 0);
  const remission = total <= 2 && scores.every((score) => score <= 1);
  const category = remission
    ? "remissão"
    : total <= 2
      ? "não atende ao critério de remissão (subescore >1)"
      : total <= 5
        ? "atividade leve"
        : total <= 10
          ? "atividade moderada"
          : "atividade grave";
  return { total, category };
}

/*
 * I-SEE — índice de gravidade da esofagite eosinofílica (export do Lovable de
 * 04/11/2026, `eoe-scores.ts`). Dellon et al., AGA 2022; tabela em Dellon,
 * Gastroenterol Hepatol 2023 (PMC10524433).
 */
export const ISEE_SYMPTOMS = [["Nenhum", 0], ["Semanal", 1], ["Diário", 2], ["Várias vezes ao dia ou prejudica a vida social", 4]] as const;
export const ISEE_COMPLICATIONS = [
  ["Impactação alimentar com ida à emergência ou endoscopia (≥18 anos)", 2],
  ["Impactação alimentar com ida à emergência ou endoscopia (<18 anos)", 4],
  ["Hospitalização por EoE", 4],
  ["Perfuração esofágica", 15],
  ["Desnutrição (IMC < p5 ou queda na curva de crescimento)", 15],
  ["Inflamação persistente exigindo dieta elementar, corticoide sistêmico ou imunomodulador", 15],
] as const;
export const ISEE_INFL_ENDO = [["Nenhum", 0], ["Localizado", 1], ["Difuso", 2]] as const;
export const ISEE_INFL_HISTO = [["<15 eos/CGA", 0], ["15–60 eos/CGA", 1], [">60 eos/CGA", 2]] as const;
export const ISEE_FIB_ENDO = [
  ["Nenhum", 0],
  ["Presente, aparelho passa facilmente", 1],
  ["Presente, exige dilatação ou passagem justa do aparelho padrão", 2],
  ["Aparelho padrão não passa, dilatações repetidas (adulto) ou qualquer dilatação (<18 anos)", 15],
] as const;
export const ISEE_FIB_HISTO = [["Nenhum", 0], ["Hiperplasia da camada basal ou fibrose da lâmina própria (ou disqueratose/alteração epitelial de superfície sem lâmina própria)", 2]] as const;

export function iseeCategory(total: number) {
  if (total < 1) return "inativa";
  if (total <= 6) return "leve";
  if (total <= 14) return "moderada";
  return "grave";
}
export function calculateIsee(parts: { symptoms: number; complications: number[]; inflEndo: number; inflHisto: number; fibEndo: number; fibHisto: number }) {
  const total = parts.symptoms + parts.complications.reduce((a, b) => a + b, 0) + parts.inflEndo + parts.inflHisto + parts.fibEndo + parts.fibHisto;
  return { total, category: iseeCategory(total) };
}
