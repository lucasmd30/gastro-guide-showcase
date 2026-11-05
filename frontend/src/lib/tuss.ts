// Cópia literal de frontend-lovable-reference/src/data/tuss.ts (export de
// 27/10/2026) — recopiar se a cliente mudar os códigos lá.

// Códigos TUSS (Tabela 22 — ANS, termos vigentes) para os exames mais usados
// em gastroenterologia e hepatologia. Exames sem código mapeado simplesmente
// não exibem TUSS no pedido.

export const TUSS_CODES: Record<string, string> = {
  // ---------- Bioquímica / hepatograma ----------
  "AST (TGO)": "40302504",
  "ALT (TGP)": "40302512",
  "Bilirrubinas total e frações": "40301397",
  "Fosfatase alcalina": "40301885",
  "Gama-GT": "40301990",
  Albumina: "40301222",
  "Proteínas totais e frações": "40302385",
  "Tempo de protrombina (TP/INR)": "40304590",
  "Tempo de tromboplastina parcial ativada (TTPA)": "40304639",
  Creatinina: "40301630",
  Ureia: "40302580",
  "Depuração de creatinina (clearance)": "40301508",
  Sódio: "40302423",
  Potássio: "40302318",
  "Cálcio total": "40301400",
  Fósforo: "40301931",
  Glicose: "40302040",
  "Hemoglobina glicada": "40302733",
  "Colesterol total": "40301605",
  "HDL-colesterol": "40301583",
  "LDL-colesterol": "40301591",
  "VLDL-colesterol": "40302695",
  Triglicérides: "40302547",
  Ferritina: "40316270",
  Ferro: "40301842",
  Transferrina: "40302520",
  "Índice de saturação da transferrina": "40321231",
  "Vitamina B12": "40316572",
  "Ácido fólico": "40301087",
  "Ácido úrico": "40301150",
  Amônia: "40301320",
  Amilase: "40301281",
  Lipase: "40302199",
  Ceruloplasmina: "40301478",
  "Cobre sérico": "40301567",
  Zinco: "40313328",
  "Alfa-1 antitripsina": "40301249",
  TSH: "40316521",
  "T4 livre": "40316491",
  PTH: "40316424",
  "25-hidroxivitamina D": "40302830",
  "Proteína C reativa (PCR)": "40308391",
  "Urina tipo 1 (EAS)": "40311210",

  // ---------- Hematologia ----------
  "Hemograma completo": "40304361",
  Reticulócitos: "40304558",
  VHS: "40304370",

  // ---------- Marcadores tumorais ----------
  Alfafetoproteína: "40316068",
  CEA: "40316122",
  "CA 19-9": "40316378",
  "CA 125": "40316378",
  "CA 15-3": "40316378",
  "CA 72-4": "40316378",

  // ---------- Autoimunidade ----------
  "FAN (HEp-2)": "40306852",
  "Anti-músculo liso (ASMA)": "40306399",
  "Anti-LKM1": "40306097",
  "Anti-mitocôndria (AMA)": "40306356",
  "p-ANCA": "40306410",
  "c-ANCA": "40306402",
  "Anti-transglutaminase IgA": "40308553",
  "Anti-transglutaminase IgG": "40308561",
  "Anti-endomísio IgA": "40306259",

  // ---------- Sorologias virais ----------
  "Hepatite A IgM": "40306941",
  "Hepatite A IgG": "40306933",
  "Hepatite B - HBsAg": "40307018",
  "Hepatite B - Anti-HBc total": "40306950",
  "Hepatite B - Anti-HBc IgM": "40306968",
  "Hepatite B - Anti-HBs": "40306992",
  "Hepatite B - HBeAg": "40306984",
  "Hepatite B - Anti-HBe": "40306976",
  "Hepatite C - Anti-HCV": "40307026",
  "Hepatite D - Anti-HDV": "40307050",
  "HIV 1/2": "40307182",
  VDRL: "40307760",

  // ---------- Fezes / microbiologia ----------
  "Calprotectina fecal": "40323986",
  "Elastase pancreática fecal": "40303284",
  "Sangue oculto nas fezes": "40303136",
  "Protoparasitológico (PPF)": "40303110",
  Coprocultura: "40310183",
  "Urocultura + antibiograma": "40310213",
  "Antígeno fecal de H. pylori": "40303209",
  "Teste respiratório para H. pylori (ureia C13)": "40307786",

  // ---------- Biologia molecular ----------
  "Carga viral HCV (RNA quantitativo)": "40314103",
  "Genotipagem do HCV": "40314111",
  "Carga viral HBV (DNA quantitativo)": "40314081",

  // ---------- Imagem ----------
  "USG abdome total": "40901122",
  "USG abdome superior": "40901130",
  "Elastografia hepática": "40901793",
  "Elastografia hepática transitória com CAP": "40901793",
  "TC abdome total": "41001095",
  "TC abdome superior": "41001109",
  "RM abdome superior": "41101170",
  "Densitometria óssea": "40808130",

  // ---------- Endoscopia / fisiologia digestiva ----------
  "Endoscopia digestiva alta (EDA)": "40201120",
  "EDA com biópsia": "40202038",
  Colonoscopia: "40201082",
  "Colonoscopia com biópsias seriadas": "40202666",
  CPRE: "40201074",
  "Ecoendoscopia alta": "40201104",
  "Ecoendoscopia baixa": "40201112",
  Retoscopia: "40201180",
  "Cápsula endoscópica de delgado": "40201341",
  "Manometria esofágica de alta resolução": "40102068",

  // ---------- Procedimentos ----------
  "Paracentese diagnóstica": "31009247",
  "Paracentese de alívio (terapêutica)": "31009247",
  "Biópsia hepática percutânea": "31005071",
  "Citológico e bioquímico do líquido ascítico": "40601340",
};

/** Código TUSS do exame, quando conhecido. */
export function tussCode(exam: string): string | undefined {
  return TUSS_CODES[exam];
}

/** Rótulo do exame com o código TUSS entre parênteses, quando houver. */
export function withTuss(exam: string): string {
  const c = TUSS_CODES[exam];
  return c ? `${exam} [TUSS ${c}]` : exam;
}
