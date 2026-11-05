import type { DiseaseFieldSummary } from "@/lib/api";
import { fib4Faixa, fib4Value } from "@/lib/fib4";
import { ldlGoal, ldlReducaoNecessaria } from "@/lib/ldl-goal";
import { calculatePrevent, preventCategoria, preventModeloRotulo } from "@/lib/prevent-score";

type Values = Record<string, unknown>;

/** Resultado de uma conta: o texto principal e, opcionalmente, o complemento, a cor e o valor puro. */
export type ComputedResult = {
  text: string;
  /** Segunda linha (conduta, categoria). */
  detail?: string;
  tone?: "ok" | "warn" | "alert";
  /** O que "Usar resultado" copia para o campo `computed.applyTo`. */
  value?: string;
};

/** Aceita vírgula decimal ("1,5"), como as calculadoras. */
function num(value: unknown): number | null {
  if (typeof value !== "string" || value.trim() === "") return null;
  const n = parseFloat(value.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function fmt(n: number, decimals: number): string {
  return n.toFixed(decimals).replace(".", ",");
}

/**
 * Risco de reativação da HBV (o `hbvRisk` do protótipo). Os rótulos são as
 * opções dos campos `reativacaoSero` e `reativacaoTerapia` da config.
 */
const HBV_SERO: Record<string, "hbsag" | "antihbc" | "naive"> = {
  "HBsAg positivo": "hbsag",
  "HBsAg negativo / anti-HBc positivo": "antihbc",
  "HBsAg e anti-HBc negativos": "naive",
};
const HBV_ANTI_CD20 = "Rituximabe / anti-CD20 (ou outro anti-linfócito B)";
const HBV_TERAPIAS: Record<string, 1 | 2 | 3> = {
  [HBV_ANTI_CD20]: 1,
  "Transplante de medula / TCTH": 1,
  "Quimioterapia com antraciclina (doxorrubicina, epirrubicina)": 1,
  "Corticoide ≥20 mg/d prednisona por >4 semanas": 1,
  "Transplante de órgão sólido": 2,
  "Anti-TNF / anti-integrina / anti-IL / inibidor JAK": 2,
  "Corticoide 10-20 mg/d por >4 semanas": 2,
  "Inibidores de tirosina-quinase / citotóxicos sem antraciclina": 2,
  "Azatioprina / 6-MP / metotrexato": 3,
  "Corticoide <10 mg/d ou curso ≤4 semanas": 3,
  "Corticoide intra-articular / tópico": 3,
};

const LDL_DCV = "DCV aterosclerótica estabelecida";
const LDL_EXTREMO = "Risco extremo (eventos recorrentes/polivascular)";

/**
 * As contas que um campo COMPUTED pode pedir (o nome vem do backend, em
 * `DiseaseField.Computed.formula`). Cada uma recebe os valores dos campos de
 * entrada, na ordem da config, e devolve o resultado — ou nulo enquanto
 * faltar alguma entrada.
 */
const FORMULAS: Record<string, (inputs: unknown[]) => ComputedResult | null> = {
  /** FIB-4 com o corte de idade do protótipo (`lib/fib4.ts`). */
  fib4: ([idade, ast, alt, plaquetas]) => {
    const a = num(idade), s = num(ast), l = num(alt), p = num(plaquetas);
    if (a === null || s === null || l === null || p === null) return null;
    const value = fib4Value(a, s, l, p);
    if (value === null) return null;
    return { text: `${fmt(value, 2)} — ${fib4Faixa(value, a)}` };
  },
  /** Soma simples (NAS = esteatose + inflamação lobular + balonização), só com todas preenchidas. */
  sum: (inputs) => {
    const numbers = inputs.map(num);
    if (numbers.some((n) => n === null)) return null;
    return { text: String((numbers as number[]).reduce((a, b) => a + b, 0)) };
  },
  /** Dose de AUDC por peso; a meta da CBP é 13–15 mg/kg/dia. */
  audc: ([peso, dose]) => {
    const p = num(peso), d = num(dose);
    if (p === null || d === null || p <= 0 || d <= 0) return null;
    const mgKg = d / p;
    const faixa = mgKg < 13 ? "abaixo da meta 13–15" : mgKg > 15 ? "acima de 13–15" : "adequada";
    return { text: `${fmt(mgKg, 1)} mg/kg/dia — ${faixa}`, tone: mgKg < 13 || mgKg > 15 ? "alert" : "ok" };
  },
  hbvRisk: ([sero, terapia]) => {
    const perfil = typeof sero === "string" ? HBV_SERO[sero] : undefined;
    const tier = typeof terapia === "string" ? HBV_TERAPIAS[terapia] : undefined;
    if (!perfil || !tier) return null;

    let nivel: "Alto" | "Moderado" | "Baixo";
    if (perfil === "naive") nivel = "Baixo";
    else if (perfil === "hbsag") nivel = tier === 3 ? "Moderado" : "Alto";
    else nivel = tier === 1 ? "Alto" : tier === 2 ? "Moderado" : "Baixo";

    const detail =
      perfil === "naive"
        ? "Sem risco relevante — vacinar se anti-HBs negativo; sem profilaxia."
        : nivel === "Baixo"
          ? "Sem profilaxia de rotina: monitorar ALT, HBsAg e HBV-DNA a cada 3 meses durante e por 12 meses após a imunossupressão."
          : `Profilaxia antiviral (TDF 300 mg/d ou ETV 0,5 mg/d) iniciada 1-2 semanas antes da imunossupressão e mantida por ≥12 meses após o término${terapia === HBV_ANTI_CD20 ? " (≥18 meses após anti-CD20)" : ""}.`;
    return { text: nivel, detail, tone: nivel === "Alto" ? "alert" : nivel === "Moderado" ? "warn" : "ok" };
  },
  /** Equação PREVENT (`lib/prevent-score.ts`), como o cabeçalho de Esteatose do protótipo. */
  prevent: ([sexo, idade, pas, colTotal, hdl, egfr, fumante, dm, tratHas, estatina, hba1c, uacr]) => {
    const yesNo = [fumante, dm, tratHas, estatina];
    if ((sexo !== "Feminino" && sexo !== "Masculino") || yesNo.some((v) => v !== "Sim" && v !== "Não")) return null;
    const a1c = num(hba1c), acr = num(uacr);
    const result = calculatePrevent({
      sexo: sexo === "Feminino" ? "F" : "M",
      idade: num(idade) ?? 0,
      sbp: num(pas) ?? 0,
      colTotal: num(colTotal) ?? 0,
      hdl: num(hdl) ?? 0,
      egfr: num(egfr) ?? 0,
      fumante: fumante === "Sim",
      dm: dm === "Sim",
      tratHas: tratHas === "Sim",
      estatina: estatina === "Sim",
      hba1c: a1c !== null && a1c > 0 ? a1c : null,
      uacr: acr !== null && acr > 0 ? acr : null,
    });
    if (!result) return null;
    const value = fmt(result.risco10, 1);
    return {
      text: `PREVENT 10 anos (DCV total): ${value}%`,
      detail: `${preventCategoria(result.risco10)} · ${preventModeloRotulo(result.modelo)}`,
      value,
    };
  },
  /** Meta de LDL-c pelo risco (`lib/ldl-goal.ts`, SBC 2025). */
  ldlGoal: ([risco, condicoes, ldlAtual]) => {
    const marcadas = Array.isArray(condicoes) ? condicoes : [];
    const goal = ldlGoal({
      risco10: num(risco),
      dcvEstabelecida: marcadas.includes(LDL_DCV),
      riscoExtremo: marcadas.includes(LDL_EXTREMO),
    });
    if (!goal) return null;
    const reducao = ldlReducaoNecessaria(num(ldlAtual) ?? 0, goal.metaLdl);
    const falta = reducao === null ? "" : reducao === 0 ? " · já na meta" : ` · redução necessária ≈ ${reducao}%`;
    return {
      text: `${goal.rotulo}: meta LDL-c < ${goal.metaLdl} mg/dL · não-HDL < ${goal.metaNaoHdl} mg/dL${falta}`,
      detail: `Como atingir: ${goal.medicacoes}`,
    };
  },
};

/** O resultado de um campo COMPUTED a partir dos demais valores do formulário (ou do registro gravado). */
export function computeResult(field: DiseaseFieldSummary, values: Values): ComputedResult | null {
  if (field.type !== "COMPUTED" || !field.computed) return null;
  const formula = FORMULAS[field.computed.formula];
  if (!formula) return null;
  return formula(field.computed.inputs.map((key) => values[key]));
}

/** O resultado em uma linha, para o documento impresso. */
export function computeField(field: DiseaseFieldSummary, values: Values): string | null {
  const result = computeResult(field, values);
  if (!result) return null;
  return result.detail ? `${result.text} — ${result.detail}` : result.text;
}

/** O rótulo do campo, trocado conforme a opção escolhida quando ele tem rótulo dinâmico. */
export function fieldLabel(field: DiseaseFieldSummary, values: Values): string {
  if (!field.dynamicLabel) return field.label;
  const chosen = values[field.dynamicLabel.key];
  return (typeof chosen === "string" && field.dynamicLabel.labels[chosen]) || field.label;
}
