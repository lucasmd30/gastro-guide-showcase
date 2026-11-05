/**
 * Equações PREVENT (AHA) — risco de DCV total em 10 anos.
 * Fonte: Khan SS, Matsushita K, Sang Y, et al. "Development and Validation of
 * the American Heart Association Predicting Risk of Cardiovascular Disease
 * EVENTs (PREVENT) Equations." Circulation. 2024;149(6):430-449.
 * DOI: 10.1161/CIRCULATIONAHA.123.067626
 * Coeficientes transcritos da planilha suplementar oficial já corrigida pelo
 * erratum de 14/10/2026 (DOI: 10.1161/CIR.0000000000001491 — rótulos das
 * linhas de HbA1c invertidos na Tabela 3), via pacote CRAN preventr 0.12.1.
 *
 * Modelos oficiais (cada um tem seu próprio conjunto de coeficientes):
 * - base: sem preditores opcionais;
 * - hba1c: adiciona HbA1c (linear, centrada em 5,3%, com interação por DM);
 * - uacr: adiciona UACR (ln da razão albumina/creatinina urinária, mg/g);
 * - full: HbA1c + UACR + SDI. Como o SDI é baseado no censo dos EUA e não tem
 *   equivalente brasileiro, usamos o indicador oficial "Missing SDI".
 *
 * Unidades de entrada: colesterol total e HDL em mg/dL (convertidos com 0,02586
 * para mmol/L, como na publicação), PAS em mmHg, eGFR em mL/min/1,73 m²,
 * idade em anos (modelo validado para 30–79 anos), HbA1c em %, UACR em mg/g.
 */

export type PreventModelo = "base" | "hba1c" | "uacr" | "full";

export interface PreventInputs {
  sexo: "M" | "F";
  idade: number; // anos, 30–79
  sbp: number; // mmHg
  colTotal: number; // mg/dL
  hdl: number; // mg/dL
  fumante: boolean;
  dm: boolean;
  tratHas: boolean; // em uso de anti-hipertensivo
  estatina: boolean;
  egfr: number; // mL/min/1,73 m²
  hba1c?: number | null; // %, opcional
  uacr?: number | null; // mg/g, opcional
}

export interface PreventResult {
  risco10: number; // % DCV total em 10 anos
  modelo: PreventModelo;
}

const MGDL_TO_MMOL = 0.02586;

interface CoefSet {
  const: number;
  age: number;
  nonHdl: number;
  hdl: number;
  sbpMin: number;
  sbpMax: number;
  dm: number;
  smoke: number;
  egfrMin: number;
  egfrMax: number;
  antiHtn: number;
  statin: number;
  antiHtnSbp: number;
  statinNonHdl: number;
  ageNonHdl: number;
  ageHdl: number;
  ageSbp: number;
  ageDm: number;
  ageSmoke: number;
  ageEgfr: number;
  hba1cNoDm?: number;
  hba1cDm?: number;
  missingHba1c?: number;
  lnUacr?: number;
  missingUacr?: number;
  missingSdi?: number;
}

const BASE_MEN: CoefSet = {
  const: -3.031168,
  age: 0.7688528,
  nonHdl: 0.0736174,
  hdl: -0.0954431,
  sbpMin: -0.4347345,
  sbpMax: 0.3362658,
  dm: 0.7692857,
  smoke: 0.4386871,
  egfrMin: 0.5378979,
  egfrMax: 0.0164827,
  antiHtn: 0.288879,
  statin: -0.1337349,
  antiHtnSbp: -0.0475924,
  statinNonHdl: 0.150273,
  ageNonHdl: -0.0517874,
  ageHdl: 0.0191169,
  ageSbp: -0.1049477,
  ageDm: -0.2251948,
  ageSmoke: -0.0895067,
  ageEgfr: -0.1543702,
};

const BASE_WOMEN: CoefSet = {
  const: -3.307728,
  age: 0.7939329,
  nonHdl: 0.0305239,
  hdl: -0.1606857,
  sbpMin: -0.2394003,
  sbpMax: 0.360078,
  dm: 0.8667604,
  smoke: 0.5360739,
  egfrMin: 0.6045917,
  egfrMax: 0.0433769,
  antiHtn: 0.3151672,
  statin: -0.1477655,
  antiHtnSbp: -0.0663612,
  statinNonHdl: 0.1197879,
  ageNonHdl: -0.0819715,
  ageHdl: 0.0306769,
  ageSbp: -0.0946348,
  ageDm: -0.27057,
  ageSmoke: -0.078715,
  ageEgfr: -0.1636046,
};

const HBA1C_MEN: CoefSet = {
  const: -3.040901,
  age: 0.769918,
  nonHdl: 0.060509,
  hdl: -0.088853,
  sbpMin: -0.417713,
  sbpMax: 0.328866,
  dm: 0.475947,
  smoke: 0.438566,
  egfrMin: 0.533462,
  egfrMax: 0.020643,
  antiHtn: 0.291752,
  statin: -0.138331,
  antiHtnSbp: -0.048262,
  statinNonHdl: 0.13938,
  ageNonHdl: -0.04635,
  ageHdl: 0.020593,
  ageSbp: -0.103772,
  ageDm: -0.17377,
  ageSmoke: -0.091584,
  ageEgfr: -0.163704,
  hba1cNoDm: 0.13159,
  hba1cDm: 0.129519,
  missingHba1c: -0.012837,
};

const HBA1C_WOMEN: CoefSet = {
  const: -3.306162,
  age: 0.785818,
  nonHdl: 0.019444,
  hdl: -0.152196,
  sbpMin: -0.229668,
  sbpMax: 0.346578,
  dm: 0.536624,
  smoke: 0.541168,
  egfrMin: 0.59319,
  egfrMax: 0.047246,
  antiHtn: 0.315857,
  statin: -0.153517,
  antiHtnSbp: -0.068775,
  statinNonHdl: 0.105475,
  ageNonHdl: -0.076112,
  ageHdl: 0.030747,
  ageSbp: -0.090597,
  ageDm: -0.224186,
  ageSmoke: -0.080186,
  ageEgfr: -0.166729,
  hba1cNoDm: 0.133835,
  hba1cDm: 0.162241,
  missingHba1c: -0.01425,
};

const UACR_MEN: CoefSet = {
  const: -3.510705,
  age: 0.776865,
  nonHdl: 0.065995,
  hdl: -0.095111,
  sbpMin: -0.420667,
  sbpMax: 0.312015,
  dm: 0.698521,
  smoke: 0.431467,
  egfrMin: 0.384136,
  egfrMax: 0.009384,
  antiHtn: 0.267649,
  statin: -0.139097,
  antiHtnSbp: -0.057931,
  statinNonHdl: 0.138372,
  ageNonHdl: -0.048833,
  ageHdl: 0.020041,
  ageSbp: -0.102454,
  ageDm: -0.223635,
  ageSmoke: -0.089485,
  ageEgfr: -0.132185,
  lnUacr: 0.188797,
  missingUacr: 0.091698,
};

const UACR_WOMEN: CoefSet = {
  const: -3.738341,
  age: 0.796925,
  nonHdl: 0.025663,
  hdl: -0.158811,
  sbpMin: -0.22557,
  sbpMax: 0.339665,
  dm: 0.804751,
  smoke: 0.528534,
  egfrMin: 0.480351,
  egfrMax: 0.043447,
  antiHtn: 0.298521,
  statin: -0.149779,
  antiHtnSbp: -0.074289,
  statinNonHdl: 0.106756,
  ageNonHdl: -0.077813,
  ageHdl: 0.030677,
  ageSbp: -0.090717,
  ageDm: -0.270512,
  ageSmoke: -0.083056,
  ageEgfr: -0.138925,
  lnUacr: 0.179304,
  missingUacr: 0.013207,
};

const FULL_MEN: CoefSet = {
  const: -3.631387,
  age: 0.784758,
  nonHdl: 0.053449,
  hdl: -0.091128,
  sbpMin: -0.492197,
  sbpMax: 0.297241,
  dm: 0.452705,
  smoke: 0.372664,
  egfrMin: 0.388685,
  egfrMax: 0.008166,
  antiHtn: 0.250805,
  statin: -0.153848,
  antiHtnSbp: -0.047469,
  statinNonHdl: 0.141538,
  ageNonHdl: -0.043645,
  ageHdl: 0.019955,
  ageSbp: -0.102269,
  ageDm: -0.176251,
  ageSmoke: -0.071587,
  ageEgfr: -0.142867,
  lnUacr: 0.177285,
  missingUacr: 0.109567,
  hba1cNoDm: 0.10483,
  hba1cDm: 0.11657,
  missingHba1c: -0.023007,
  missingSdi: 0.144759,
};

const FULL_WOMEN: CoefSet = {
  const: -3.860385,
  age: 0.771679,
  nonHdl: 0.006211,
  hdl: -0.154776,
  sbpMin: -0.193312,
  sbpMax: 0.307122,
  dm: 0.496753,
  smoke: 0.466605,
  egfrMin: 0.47807,
  egfrMax: 0.052908,
  antiHtn: 0.303489,
  statin: -0.155652,
  antiHtnSbp: -0.066703,
  statinNonHdl: 0.106182,
  ageNonHdl: -0.074227,
  ageHdl: 0.028824,
  ageSbp: -0.087519,
  ageDm: -0.22671,
  ageSmoke: -0.067613,
  ageEgfr: -0.149323,
  lnUacr: 0.164592,
  missingUacr: 0.019841,
  hba1cNoDm: 0.141256,
  hba1cDm: 0.129851,
  missingHba1c: -0.003166,
  missingSdi: 0.180451,
};

const COEFS: Record<PreventModelo, { M: CoefSet; F: CoefSet }> = {
  base: { M: BASE_MEN, F: BASE_WOMEN },
  hba1c: { M: HBA1C_MEN, F: HBA1C_WOMEN },
  uacr: { M: UACR_MEN, F: UACR_WOMEN },
  full: { M: FULL_MEN, F: FULL_WOMEN },
};

/** Retorna null quando alguma entrada obrigatória está ausente/fora do domínio. */
export function calculatePrevent(i: PreventInputs): PreventResult | null {
  if (!(i.idade >= 30 && i.idade <= 79)) return null;
  if (!(i.sbp > 0) || !(i.colTotal > 0) || !(i.hdl > 0) || !(i.egfr > 0)) return null;

  const hasHba1c = i.hba1c != null && i.hba1c > 0;
  const hasUacr = i.uacr != null && i.uacr > 0;
  const modelo: PreventModelo = hasHba1c && hasUacr ? "full" : hasHba1c ? "hba1c" : hasUacr ? "uacr" : "base";
  const c = COEFS[modelo][i.sexo];

  const ageT = (i.idade - 55) / 10;
  const nonHdl = (i.colTotal - i.hdl) * MGDL_TO_MMOL - 3.5;
  const hdlT = (i.hdl * MGDL_TO_MMOL - 1.3) / 0.3;
  const sbpMin = (Math.min(i.sbp, 110) - 110) / 20;
  const sbpMax = (Math.max(i.sbp, 110) - 130) / 20;
  const egfrMin = (Math.min(i.egfr, 60) - 60) / -15;
  const egfrMax = (Math.max(i.egfr, 60) - 90) / -15;
  const dm = i.dm ? 1 : 0;
  const smoke = i.fumante ? 1 : 0;
  const antiHtn = i.tratHas ? 1 : 0;
  const statin = i.estatina ? 1 : 0;

  let logOdds =
    c.const +
    c.age * ageT +
    c.nonHdl * nonHdl +
    c.hdl * hdlT +
    c.sbpMin * sbpMin +
    c.sbpMax * sbpMax +
    c.dm * dm +
    c.smoke * smoke +
    c.egfrMin * egfrMin +
    c.egfrMax * egfrMax +
    c.antiHtn * antiHtn +
    c.statin * statin +
    c.antiHtnSbp * antiHtn * sbpMax +
    c.statinNonHdl * statin * nonHdl +
    c.ageNonHdl * ageT * nonHdl +
    c.ageHdl * ageT * hdlT +
    c.ageSbp * ageT * sbpMax +
    c.ageDm * ageT * dm +
    c.ageSmoke * ageT * smoke +
    c.ageEgfr * ageT * egfrMin;

  if (modelo === "hba1c" || modelo === "full") {
    const hba1cNoDm = hasHba1c && !i.dm ? i.hba1c! - 5.3 : 0;
    const hba1cDm = hasHba1c && i.dm ? i.hba1c! - 5.3 : 0;
    const missingHba1c = hasHba1c ? 0 : 1;
    logOdds +=
      (c.hba1cNoDm ?? 0) * hba1cNoDm +
      (c.hba1cDm ?? 0) * hba1cDm +
      (c.missingHba1c ?? 0) * missingHba1c;
  }

  if (modelo === "uacr" || modelo === "full") {
    const lnUacr = hasUacr ? Math.log(i.uacr!) : 0;
    const missingUacr = hasUacr ? 0 : 1;
    logOdds += (c.lnUacr ?? 0) * lnUacr + (c.missingUacr ?? 0) * missingUacr;
  }

  if (modelo === "full") {
    // SDI é baseado no censo dos EUA e não tem equivalente brasileiro:
    // usamos o indicador oficial "Missing SDI" da equação completa.
    logOdds += c.missingSdi ?? 0;
  }

  const risk = 1 / (1 + Math.exp(-logOdds));
  return { risco10: risk * 100, modelo };
}

/** Rótulo amigável do modelo usado no cálculo. */
export function preventModeloRotulo(modelo: PreventModelo): string {
  switch (modelo) {
    case "hba1c":
      return "modelo com HbA1c";
    case "uacr":
      return "modelo com Relação Albumina-Creatinina Urinária";
    case "full":
      return "modelo completo (HbA1c + Relação Albumina-Creatinina Urinária)";
    default:
      return "modelo básico";
  }
}

/** Interpretação prática das faixas usadas em prevenção primária. */
export function preventCategoria(risco10: number): string {
  if (risco10 < 5) return "Risco baixo (< 5%)";
  if (risco10 < 7.5) return "Risco borderline (5–7,4%)";
  if (risco10 < 20) return "Risco intermediário (7,5–19,9%)";
  return "Risco alto (≥ 20%)";
}
