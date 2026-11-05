"use client";

import { useMemo, useState, type ReactNode } from "react";
import { Search, X } from "lucide-react";
import { ScaleAttachContext, type ResultFn } from "./primitives";
import { CollapsibleSection } from "@/components/collapsible-section";
import {
  Aims65, Blatchford, Bristol, Chicago, Eckardt, Forrest, IbsSss, Isee, LosAngeles, RomeIv, RomeVConstipacao, RomeVDiarreia,
  RomeVDispepsia, RomeVDistensao, RomeVSii, Rockall,
} from "./upper-gi";
import {
  AihFull, AihSimple, Albi, Anticipate, AnticipateNash, Apri, Audit, AuditC, Bclc, ChildPugh, Fib4, FiveDItch, Fss,
  Fss5, Globe, Lille, Maddrey, MayoPsc, Meld30, MeldNa, Nfs, NrsFadiga, NrsPrurido, PageB, Paris2, Pbc40, RucamCol,
  RucamHep, Sccs, UkPbc, VasPrurido, WestHaven, Wilson,
} from "./liver";
import {
  Cdeis, CdaiCrohn, Harvey, MayoEndo, MayoParcial, MayoUc, Montreal, Paris, Pcdai, Pdai, Pucai, Rutgeerts,
  SesCd, TrueloveWitts,
} from "./ibd";
import { Apache2, Atlanta, Bisap, Ranson } from "./pancreas";

export type ScaleSpecialty = "hepato" | "gastro" | "both";
export type Organ = "figado" | "estomago" | "intestino" | "pancreas";

export type ScaleDef = {
  id: string;
  name: string;
  group: string;
  organ: Organ;
  specialty: ScaleSpecialty;
  Comp: (p: { onResult?: ResultFn }) => ReactNode;
};

/**
 * Catálogo das escalas, na ordem e no agrupamento do protótipo Lovable.
 *
 * Fadiga, prurido e consumo de álcool ficam sob Fígado, que é onde o
 * hepatologista as usa e onde a cliente as mostrou — o export do Lovable de
 * 27/10/2026 criou uma 5ª aba "Sintomas" para eles, que não foi trazida.
 * Retiradas a pedido da cliente (27/10/2026), mesmo existindo no Lovable:
 * HOMA-IR, CLIP, PHES e Mayo Risk (CBP). Registros que já anexaram uma delas
 * continuam imprimindo, porque guardam o resultado já escrito.
 */
export const SCALES: ScaleDef[] = [
  // ---------- FÍGADO ----------
  { id: "apri", name: "APRI", group: "Fibrose", organ: "figado", specialty: "hepato", Comp: Apri },
  { id: "fib4", name: "FIB-4", group: "Fibrose", organ: "figado", specialty: "hepato", Comp: Fib4 },
  { id: "nfs", name: "NAFLD Fibrosis Score", group: "Fibrose", organ: "figado", specialty: "hepato", Comp: Nfs },

  { id: "anticipate", name: "ANTICIPATE", group: "Hipertensão portal", organ: "figado", specialty: "hepato", Comp: Anticipate },
  { id: "anticipatenash", name: "ANTICIPATE-NASH", group: "Hipertensão portal", organ: "figado", specialty: "hepato", Comp: AnticipateNash },

  { id: "child", name: "Child-Pugh", group: "Prognóstico hepático", organ: "figado", specialty: "hepato", Comp: ChildPugh },
  { id: "meldna", name: "MELD-Na", group: "Prognóstico hepático", organ: "figado", specialty: "hepato", Comp: MeldNa },
  { id: "meld30", name: "MELD 3.0", group: "Prognóstico hepático", organ: "figado", specialty: "hepato", Comp: Meld30 },
  { id: "albi", name: "ALBI", group: "Prognóstico hepático", organ: "figado", specialty: "hepato", Comp: Albi },

  { id: "maddrey", name: "Maddrey DF", group: "Hepatite alcoólica", organ: "figado", specialty: "hepato", Comp: Maddrey },
  { id: "lille", name: "Lille (D7)", group: "Hepatite alcoólica", organ: "figado", specialty: "hepato", Comp: Lille },

  { id: "pageb", name: "PAGE-B", group: "CHC", organ: "figado", specialty: "hepato", Comp: PageB },
  { id: "bclc", name: "BCLC", group: "CHC", organ: "figado", specialty: "hepato", Comp: Bclc },

  { id: "westhaven", name: "West Haven", group: "Encefalopatia", organ: "figado", specialty: "hepato", Comp: WestHaven },

  { id: "rucamhep", name: "RUCAM hepatocelular", group: "Hepatotoxicidade", organ: "figado", specialty: "hepato", Comp: RucamHep },
  { id: "rucamcol", name: "RUCAM colestático/misto", group: "Hepatotoxicidade", organ: "figado", specialty: "hepato", Comp: RucamCol },

  { id: "aihsimple", name: "HAI simplificado", group: "Hepatite autoimune", organ: "figado", specialty: "hepato", Comp: AihSimple },
  { id: "aihfull", name: "HAI revisado", group: "Hepatite autoimune", organ: "figado", specialty: "hepato", Comp: AihFull },

  { id: "wilson", name: "Leipzig (Wilson)", group: "Doença de Wilson", organ: "figado", specialty: "hepato", Comp: Wilson },

  { id: "globe", name: "GLOBE", group: "CBP / CEP", organ: "figado", specialty: "hepato", Comp: Globe },
  { id: "ukpbc", name: "UK-PBC", group: "CBP / CEP", organ: "figado", specialty: "hepato", Comp: UkPbc },
  { id: "mayopsc", name: "Mayo Risk (CEP)", group: "CBP / CEP", organ: "figado", specialty: "hepato", Comp: MayoPsc },
  { id: "paris2", name: "Paris II", group: "CBP / CEP", organ: "figado", specialty: "hepato", Comp: Paris2 },
  { id: "pbc40", name: "PBC-40", group: "CBP / CEP", organ: "figado", specialty: "hepato", Comp: Pbc40 },
  { id: "sccs", name: "SCCS (queixas colestáticas)", group: "CBP / CEP", organ: "figado", specialty: "hepato", Comp: Sccs },

  { id: "audit", name: "AUDIT", group: "Consumo de álcool", organ: "figado", specialty: "both", Comp: Audit },
  { id: "audit-c", name: "AUDIT-C", group: "Consumo de álcool", organ: "figado", specialty: "both", Comp: AuditC },

  { id: "fss", name: "FSS (fadiga)", group: "Fadiga", organ: "figado", specialty: "both", Comp: Fss },
  { id: "shortfat", name: "FSS-5 (curta)", group: "Fadiga", organ: "figado", specialty: "both", Comp: Fss5 },
  { id: "nrsfadiga", name: "NRS fadiga", group: "Fadiga", organ: "figado", specialty: "both", Comp: NrsFadiga },

  { id: "itch5d", name: "5-D Itch", group: "Prurido", organ: "figado", specialty: "hepato", Comp: FiveDItch },
  { id: "nrsprurido", name: "NRS prurido", group: "Prurido", organ: "figado", specialty: "hepato", Comp: NrsPrurido },
  { id: "vasprurido", name: "VAS prurido", group: "Prurido", organ: "figado", specialty: "hepato", Comp: VasPrurido },

  // ---------- ESTÔMAGO / ESÔFAGO ----------
  { id: "forrest", name: "Forrest", group: "HDA", organ: "estomago", specialty: "gastro", Comp: Forrest },
  { id: "blatchford", name: "Glasgow-Blatchford", group: "HDA", organ: "estomago", specialty: "gastro", Comp: Blatchford },
  { id: "rockall", name: "Rockall", group: "HDA", organ: "estomago", specialty: "gastro", Comp: Rockall },
  { id: "aims65", name: "AIMS65", group: "HDA", organ: "estomago", specialty: "gastro", Comp: Aims65 },

  { id: "eckardt", name: "Eckardt", group: "Esôfago", organ: "estomago", specialty: "gastro", Comp: Eckardt },
  { id: "la", name: "Los Angeles", group: "Esôfago", organ: "estomago", specialty: "gastro", Comp: LosAngeles },
  { id: "chicago", name: "Chicago v4", group: "Esôfago", organ: "estomago", specialty: "gastro", Comp: Chicago },
  { id: "isee", name: "I-SEE (gravidade EoE)", group: "Esôfago", organ: "estomago", specialty: "gastro", Comp: Isee },

  // O grupo "Funcional" existe nas duas abas, como no Lovable: a dispepsia
  // aparece em Estômago/Esôfago, o resto em Intestino.
  { id: "romevdf", name: "Rome V — Dispepsia funcional", group: "Funcional", organ: "estomago", specialty: "gastro", Comp: RomeVDispepsia },

  // ---------- INTESTINO ----------
  { id: "bristol", name: "Bristol", group: "Funcional", organ: "intestino", specialty: "gastro", Comp: Bristol },
  { id: "rome", name: "Rome IV (SII)", group: "Funcional", organ: "intestino", specialty: "gastro", Comp: RomeIv },
  { id: "romevsii", name: "Rome V — SII", group: "Funcional", organ: "intestino", specialty: "gastro", Comp: RomeVSii },
  { id: "romevcc", name: "Rome V — Constipação crônica", group: "Funcional", organ: "intestino", specialty: "gastro", Comp: RomeVConstipacao },
  { id: "romevdiar", name: "Rome V — Diarreia funcional", group: "Funcional", organ: "intestino", specialty: "gastro", Comp: RomeVDiarreia },
  { id: "romevdist", name: "Rome V — Distensão abdominal funcional", group: "Funcional", organ: "intestino", specialty: "gastro", Comp: RomeVDistensao },
  { id: "ibsss", name: "IBS-SSS", group: "Funcional", organ: "intestino", specialty: "gastro", Comp: IbsSss },

  { id: "mayoparcial", name: "Mayo parcial (RCU)", group: "DII", organ: "intestino", specialty: "gastro", Comp: MayoParcial },
  { id: "mayouc", name: "Mayo completo (RCU)", group: "DII", organ: "intestino", specialty: "gastro", Comp: MayoUc },
  { id: "mayoendo", name: "Mayo endoscópico", group: "DII", organ: "intestino", specialty: "gastro", Comp: MayoEndo },
  { id: "tw", name: "Truelove & Witts", group: "DII", organ: "intestino", specialty: "gastro", Comp: TrueloveWitts },
  { id: "cdai", name: "CDAI", group: "DII", organ: "intestino", specialty: "gastro", Comp: CdaiCrohn },
  { id: "harvey", name: "Harvey-Bradshaw", group: "DII", organ: "intestino", specialty: "gastro", Comp: Harvey },
  { id: "montreal", name: "Montreal", group: "DII", organ: "intestino", specialty: "gastro", Comp: Montreal },
  { id: "sescd", name: "SES-CD", group: "DII", organ: "intestino", specialty: "gastro", Comp: SesCd },
  { id: "cdeis", name: "CDEIS", group: "DII", organ: "intestino", specialty: "gastro", Comp: Cdeis },
  { id: "rutgeerts", name: "Rutgeerts", group: "DII", organ: "intestino", specialty: "gastro", Comp: Rutgeerts },
  { id: "pdai", name: "PDAI (perianal)", group: "DII", organ: "intestino", specialty: "gastro", Comp: Pdai },

  { id: "pucai", name: "PUCAI (pediátrico)", group: "DII pediátrica", organ: "intestino", specialty: "gastro", Comp: Pucai },
  { id: "pcdai", name: "PCDAI (pediátrico)", group: "DII pediátrica", organ: "intestino", specialty: "gastro", Comp: Pcdai },
  { id: "paris", name: "Classificação de Paris", group: "DII pediátrica", organ: "intestino", specialty: "gastro", Comp: Paris },

  // ---------- PÂNCREAS ----------
  { id: "ranson", name: "Ranson", group: "Pancreatite", organ: "pancreas", specialty: "gastro", Comp: Ranson },
  { id: "bisap", name: "BISAP", group: "Pancreatite", organ: "pancreas", specialty: "gastro", Comp: Bisap },
  { id: "atlanta", name: "Atlanta revisada", group: "Pancreatite", organ: "pancreas", specialty: "gastro", Comp: Atlanta },
  { id: "apache2", name: "APACHE II", group: "Pancreatite", organ: "pancreas", specialty: "gastro", Comp: Apache2 },
];

/** Minúsculas e sem acento: "pancreatite" acha "Pancreatite", "figado" acha "Fígado". */
function fold(text: string): string {
  return text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

const ORGAN_LABEL: Record<Organ, string> = {
  figado: "Fígado",
  estomago: "Estômago / Esôfago",
  intestino: "Intestino",
  pancreas: "Pâncreas",
};

/** Interpretação e cuidados de uso, transcritos do protótipo. */
export const SCALE_NOTES: Record<string, { interp: string; caution?: string }> = {
  apri: { interp: "<0,5 fibrose avançada improvável; >1,5 sugere fibrose significativa; >2,0 sugere cirrose.", caution: "Perde acurácia em hepatite aguda, colestase e após tratamento antiviral." },
  fib4: { interp: "<1,30 (ou <2,0 se ≥65 anos) baixo risco; 1,30–2,67 indeterminado (fazer elastografia/ELF); >2,67 alto risco.", caution: "Usar com cautela em <35 ou ≥65 anos — o corte baixo é ajustado automaticamente para 2,0 a partir de 65 anos." },
  nfs: { interp: "<−1,455 exclui fibrose avançada; >0,676 indica fibrose avançada (F3-F4); entre eles = indeterminado.", caution: "Depende de IMC e diabetes; menos confiável em idosos e em não-MASLD." },
  anticipate: { interp: "Probabilidade de hipertensão portal clinicamente significativa (HVPG ≥10 mmHg) e risco de eventos hepáticos em 3 anos.", caution: "Doença hepática crônica avançada compensada de etiologia viral e/ou alcoólica; plaquetas acima de 150 entram como 150." },
  anticipatenash: { interp: "Probabilidade de hipertensão portal clinicamente significativa (HVPG ≥10 mmHg) e risco de eventos hepáticos em 3 anos.", caution: "Doença hepática crônica avançada compensada associada a NASH/MASH; não diagnostica MASH nem fibrose." },
  child: { interp: "A 5-6 (compensada); B 7-9 (comprometimento significativo); C 10-15 (descompensada).", caution: "Ascite e encefalopatia são subjetivas; albumina cai em desnutrição/infecção." },
  meldna: { interp: "≥15 → avaliar transplante; ≥20 alta mortalidade em 3 meses; teto de 40.", caution: "Creatinina truncada em 4,0 (ou diálise ≥2×/semana). Sódio só corrige MELD >11." },
  meld30: { interp: "Inclui sexo e albumina; ≥15 encaminhar a centro de transplante.", caution: "Válido a partir dos 12 anos; não se aplica a exceções (CHC, situações especiais)." },
  albi: { interp: "Grau 1 ≤−2,60; grau 2 −2,60 a −1,39; grau 3 >−1,39.", caution: "Não usar isoladamente para indicar transplante." },
  maddrey: { interp: "≥32 hepatite alcoólica grave — considerar corticoide.", caution: "Requer TP do paciente e do controle do mesmo laboratório." },
  lille: { interp: "≥0,45 no D7 = não resposta ao corticoide → suspender; <0,45 manter 28 dias.", caution: "Só é válido após 7 dias de corticoide." },
  pageb: { interp: "≤9 baixo risco de CHC; 10-17 intermediário; ≥18 alto risco.", caution: "Validado em HBV em análogo há ≥1 ano; não usar em cirrose descompensada." },
  bclc: { interp: "0/A curativo; B quimioembolização; C sistêmico; D suporte.", caution: "Requer estadiamento por imagem trifásica e performance status." },
  westhaven: { interp: "I-II encefalopatia leve; III-IV grave (considerar UTI e via aérea).", caution: "Não detecta encefalopatia mínima." },
  rucamhep: { interp: ">8 altamente provável; 6-8 provável; 3-5 possível; 1-2 improvável; ≤0 excluída.", caution: "Padrão hepatocelular (ALT ≥5×LSN ou R ≥5). Exige exclusão de causas virais, autoimunes e biliares." },
  rucamcol: { interp: ">8 altamente provável; 6-8 provável; 3-5 possível; 1-2 improvável; ≤0 excluída.", caution: "Padrão colestático/misto (FA ≥2×LSN ou R <5). Exige exclusão de causas virais, autoimunes e biliares." },
  aihsimple: { interp: "≥6 HAI provável; ≥7 HAI definida.", caution: "Não validado em formas agudas graves nem em sobreposição com CBP/CEP." },
  aihfull: { interp: "Pré-tratamento: >15 definida, 10-15 provável. Pós: >17 definida, 12-17 provável.", caution: "Escore de pesquisa; exige biópsia e exclusão de outras causas." },
  wilson: { interp: "≥4 estabelecido; 3 provável; ≤2 improvável.", caution: "Ceruloplasmina é reagente de fase aguda — pode estar falsamente normal." },
  globe: { interp: "Acima do corte para a idade, após 1 ano de UDCA = sobrevida livre de transplante reduzida → 2ª linha.", caution: "Só é válido após 12 meses de UDCA, em CBP." },
  ukpbc: { interp: "Estima risco de doença hepática terminal em 5, 10 e 15 anos, conforme o modelo UK-PBC.", caution: "FA, AST ou ALT e bilirrubina após 12 meses de UDCA; albumina e plaquetas basais. Usar limites do laboratório, sem presumir um LIN universal." },
  mayopsc: { interp: "<0 baixo risco; 0-2 intermediário; >2 alto risco em 4 anos.", caution: "Não válido em colangite aguda ou após transplante." },
  paris2: { interp: "Resposta se FA ≤1,5× LSN, AST ≤1,5× LSN e bilirrubina normal (≤ LSN do laboratório) após 1 ano de UDCA.", caution: "Não respondedores: considerar bezafibrato, seladelparo ou elafibranor (ácido obeticólico retirado do mercado)." },
  pbc40: { interp: "Qualidade de vida na CBP — pontuações maiores = maior impacto sintomático.", caution: "Instrumento de sintomas; não avalia prognóstico hepático." },
  audit: { interp: "0–7 baixo risco; 8–15 risco médio; 16–19 alto risco; 20–40 provável dependência, a confirmar clinicamente.", caution: "Versão MSD: cinco ou mais bebidas na pergunta 3. Não confirma diagnóstico. Suspeita de dependência exige avaliação e retirada do álcool supervisionada." },
  "audit-c": { interp: "0–12 pontos; rastreamento positivo ≥3 em mulheres e ≥4 em homens.", caution: "Versão internacional: seis ou mais doses, aproximadamente 10 g de etanol por dose. Resultado baixo não significa consumo seguro; não diagnostica dependência." },
  sccs: { interp: "Soma 0-13 dos 4 itens (prurido, fadiga, dor em QSD, febre) nos últimos 7 dias; quanto maior, maior a carga sintomática colestática.", caution: "Escore de sintomas (PROM) para acompanhamento; não substitui avaliação de colangite, obstrução biliar ou progressão da doença." },
  fss: { interp: "Média ≥4 indica fadiga clinicamente relevante.", caution: "Inespecífico — descartar anemia, hipotireoidismo, depressão e apneia." },
  shortfat: { interp: "Escores maiores = fadiga mais intensa; útil para acompanhar evolução.", caution: "Triagem, não diagnóstico." },
  nrsfadiga: { interp: "0-3 leve; 4-6 moderada; 7-10 intensa.", caution: "Subjetivo; compare com a medida anterior do mesmo paciente." },
  itch5d: { interp: "5-25 pontos; maior = prurido mais intenso e incapacitante.", caution: "Avalia as últimas 2 semanas." },
  nrsprurido: { interp: "≥4 prurido moderado; ≥7 intenso.", caution: "Redução ≥4 pontos = resposta clinicamente significativa." },
  vasprurido: { interp: "0-10; ≥4 indica prurido com impacto clínico.", caution: "Excluir causas dermatológicas e medicamentosas." },
  forrest: { interp: "Ia/Ib e IIa = alto risco de ressangramento; IIc/III baixo risco.", caution: "Depende da qualidade do exame e da limpeza do coágulo." },
  blatchford: { interp: "0-1 muito baixo risco (alta precoce); ≥7 alta chance de intervenção.", caution: "Avalia necessidade de intervenção, não mortalidade; feito antes da endoscopia." },
  rockall: { interp: "≤2 baixo risco; 3-4 intermediário; ≥5 alto risco.", caution: "O escore completo exige achados endoscópicos." },
  aims65: { interp: "0-1 baixo risco; ≥2 mortalidade hospitalar crescente.", caution: "Prediz mortalidade, não ressangramento." },
  eckardt: { interp: "0-3 remissão; >3 falha ou recidiva — reavaliar.", caution: "Sintomático — não substitui manometria ou esvaziamento." },
  la: { interp: "A/B esofagite leve; C/D grave — confirma DRGE e exige IBP prolongado.", caution: "Só avaliável com IBP suspenso 2-4 semanas antes da endoscopia." },
  chicago: { interp: "Define acalasia I/II/III, obstrução da JEG, espasmo, hipercontrátil e IEM.", caution: "Requer manometria de alta resolução com protocolo completo." },
  bristol: { interp: "Tipos 1-2 constipação; 3-4 normal; 5-7 diarreia.", caution: "Registre o padrão habitual, não uma única evacuação." },
  rome: { interp: "SII: dor ≥1×/semana nos últimos 3 meses, com início há ≥6 meses.", caution: "Exige ausência de sinais de alarme." },
  romevsii: { interp: "Rome V: dor ou desconforto recorrente, não contínuo, ≥3 dias/mês nos últimos 3 meses, associado à defecação ou mudança de frequência/forma.", caution: "Diagnóstico positivo, mas sempre excluir doença celíaca, DII e causas orgânicas." },
  romevdf: { interp: "≥1 sintoma incômodo (plenitude, saciedade precoce, dor ou queimação epigástrica); subtipos SDP e SDE podem coexistir.", caution: "Exige EDA sem lesão que explique os sintomas." },
  romevcc: { interp: "≥2 critérios em >25% das evacuações, fezes amolecidas raras sem laxantes e sem critérios de SII." },
  romevdiar: { interp: "Fezes amolecidas/aquosas em >25% das evacuações, sem dor predominante (não SII-D)." },
  romevdist: { interp: "Inchaço/distensão ≥1 dia/semana, predominante, sem critérios de outro distúrbio funcional." },
  ibsss: { interp: "<75 remissão; 75-174 leve; 175-299 moderada; ≥300 grave.", caution: "Referente aos últimos 10 dias; queda de 50 pontos = resposta." },
  mayoparcial: { interp: "≤1 remissão; 2–3 leve; 4–6 moderada; 7–9 grave.", caution: "Não avalia endoscopia — não define cicatrização mucosa." },
  mayouc: { interp: "Remissão: total ≤2, sem subescore >1; 3–5 leve; 6–10 moderada; 11–12 grave.", caution: "Requer os quatro critérios, incluindo endoscopia. Não prediz isoladamente necessidade de internação ou cirurgia." },
  mayoendo: { interp: "0–1 = cicatrização mucosa (alvo do STRIDE-II); 2–3 = doença ativa.", caution: "Friabilidade isolada já classifica como subescore 1." },
  tw: { interp: "≥6 evacuações sanguinolentas/dia + sinais sistêmicos = colite grave.", caution: "Reavaliar no 3º dia (critérios de Oxford) para resgate." },
  cdai: { interp: "<150 remissão; 150–<220 leve; 220–450 moderada a grave; >450 grave.", caution: "Total de fezes e médias diárias de dor/bem-estar em 7 dias. Muito influenciado por sintomas funcionais e ressecção intestinal prévia." },
  harvey: { interp: "<5 remissão; 5-7 leve; 8-16 moderada; >16 grave.", caution: "Versão simplificada do CDAI — não reflete atividade endoscópica." },
  montreal: { interp: "Classifica idade (A), localização (L) e comportamento (B) no Crohn; extensão (E) na RCU.", caution: "Classificação fenotípica, não de atividade." },
  sescd: { interp: "0-2 remissão endoscópica; 3-6 leve; 7-15 moderada; >15 grave.", caution: "Exige ileocolonoscopia completa dos 5 segmentos." },
  cdeis: { interp: "<3 remissão; 3–8 leve; 9–12 moderada; >12 grave.", caution: "Trabalhoso e dependente do examinador — o SES-CD é mais simples." },
  rutgeerts: { interp: "i0–i1 remissão; i2 intermediário; i3–i4 recorrência grave.", caution: "Só após ressecção ileocólica, avaliado 6–12 meses depois." },
  pdai: { interp: "≤4 sugere doença perianal inativa; queda ≥5 pontos indica resposta.", caution: "Não substitui RM de pelve ou ultrassom endoanal." },
  pucai: { interp: "<10 remissão; 10–34 leve; 35–64 moderada; ≥65 grave.", caution: "Validado em crianças e adolescentes — não usar em adultos." },
  pcdai: { interp: "≤10 inativa; 11–27,5 leve; ≥30 moderada a grave.", caution: "Exige laboratório e dados antropométricos de crescimento." },
  paris: { interp: "Adaptação pediátrica de Montreal, com A1a/A1b, L4a/L4b, B2B3 e crescimento.", caution: "Classificação descritiva — não mede atividade." },
  ranson: { interp: "≥3 critérios = pancreatite grave; mortalidade sobe com ≥5.", caution: "Só é completável após 48 h — não serve para triagem inicial." },
  bisap: { interp: "≥3 pontos = risco aumentado de mortalidade e falência orgânica.", caution: "Calculado nas primeiras 24 h; menos sensível que o APACHE II." },
  atlanta: { interp: "Leve, moderada (falência transitória <48 h) ou grave (persistente >48 h).", caution: "Definição só é definitiva após 48-72 h." },
  apache2: { interp: "≥8 sugere pancreatite grave; escores maiores = mortalidade maior.", caution: "Complexo e pouco específico para pâncreas; usar junto de critérios clínicos." },
};

/**
 * Seletor de escalas: abas por órgão, busca por nome e um cartão por escala
 * escolhida. Cada cartão devolve o resultado formatado via `onResult`, que é
 * quem anexa o escore ao registro do atendimento.
 */
export function ScalePicker({
  onResult,
  specialty,
}: {
  onResult?: ResultFn;
  specialty?: Exclude<ScaleSpecialty, "both">;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [query, setQuery] = useState("");

  const visible = useMemo(
    () => (specialty ? SCALES.filter((s) => s.specialty === specialty || s.specialty === "both") : SCALES),
    [specialty],
  );

  const organs = useMemo(() => {
    const present = new Set(visible.map((s) => s.organ));
    return (Object.keys(ORGAN_LABEL) as Organ[]).filter((o) => present.has(o));
  }, [visible]);

  const [organ, setOrgan] = useState<Organ>(() => organs[0] ?? "figado");
  const activeOrgan = organs.includes(organ) ? organ : organs[0];

  const listed = useMemo(() => {
    const q = fold(query.trim());
    // A busca atravessa as abas: quem procura "MELD" não deveria precisar
    // saber que ele está sob Fígado.
    const base = q ? visible : visible.filter((s) => s.organ === activeOrgan);
    return q ? base.filter((s) => fold(s.name).includes(q) || fold(s.group).includes(q)) : base;
  }, [visible, activeOrgan, query]);

  // Todos os grupos do catálogo, na ordem dele — e não só os da aba aberta:
  // a calculadora aberta mora dentro do grupo dela, e precisa continuar
  // montada (com o que já foi digitado) quando o médico troca de aba ou busca.
  // A chave inclui a aba: "Funcional" existe em Estômago e em Intestino, e a
  // calculadora aberta numa não pode aparecer dentro do grupo da outra.
  const groups = useMemo(() => {
    const listedIds = new Set(listed.map((s) => s.id));
    const map = new Map<string, { group: string; items: ScaleDef[]; all: ScaleDef[] }>();
    for (const s of SCALES) {
      const key = `${s.organ}:${s.group}`;
      const entry = map.get(key) ?? { group: s.group, items: [], all: [] };
      entry.all.push(s);
      if (listedIds.has(s.id)) entry.items.push(s);
      map.set(key, entry);
    }
    return [...map.entries()];
  }, [listed]);

  function toggle(id: string) {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  return (
    <ScaleAttachContext.Provider value={!!onResult}>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          {organs.map((o) => (
            <button
              key={o}
              type="button"
              onClick={() => setOrgan(o)}
              className={
                activeOrgan === o && !query
                  ? "rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"
                  : "rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
              }
            >
              {ORGAN_LABEL[o]}
            </button>
          ))}
          <div className="ml-auto flex min-w-40 flex-1 items-center gap-2 rounded-lg border border-border bg-card px-2 py-1">
            <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar escala…"
              className="w-full bg-transparent text-xs outline-none placeholder:text-muted-foreground"
            />
            {query && (
              <button type="button" onClick={() => setQuery("")} className="shrink-0 text-muted-foreground">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
  
        {/* A calculadora abre logo abaixo do grupo em que foi clicada (pedido
            da clínica, 08/10/2026): antes ia para o fim do card, e numa lista
            longa o médico clicava e não via nada acontecer. */}
        <div className="space-y-3">
          {groups.map(([key, { group, items, all }]) => {
            const open = selected
              .map((id) => all.find((s) => s.id === id))
              .filter((s): s is ScaleDef => !!s);
            const shown = items.length > 0;
            if (!shown && open.length === 0) return null;
            return (
              // Grupo fora da aba/busca, mas com calculadora aberta: fica
              // escondido em vez de desmontado, para não perder o preenchimento.
              <div key={key} hidden={!shown}>
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{group}</p>
                <div className="flex flex-wrap gap-1.5">
                  {items.map((s) => {
                    const on = selected.includes(s.id);
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => toggle(s.id)}
                        aria-expanded={on}
                        className={`rounded-md border px-2 py-1 text-xs transition-colors ${
                          on
                            ? "border-primary bg-primary/10 font-semibold text-foreground"
                            : "border-border text-muted-foreground hover:bg-muted"
                        }`}
                      >
                        {s.name}
                      </button>
                    );
                  })}
                </div>
                {open.length > 0 && (
                  <div className="mt-3 space-y-3 border-l-2 border-primary/30 pl-3">
                    {open.map((s) => (
                      <OpenScale key={s.id} scale={s} onResult={onResult} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          {listed.length === 0 && (
            <p className="text-xs text-muted-foreground">Nenhuma escala encontrada para “{query}”.</p>
          )}
        </div>
      </div>
    </ScaleAttachContext.Provider>
  );
}

/** Uma calculadora aberta, com a nota de interpretação. Fecha clicando de novo no nome dela. */
function OpenScale({ scale, onResult }: { scale: ScaleDef; onResult?: ResultFn }) {
  const note = SCALE_NOTES[scale.id];
  return (
    <div className="space-y-1">
      <scale.Comp onResult={onResult} />
      {note && (
        <p className="px-1 text-[11px] leading-relaxed text-muted-foreground">
          <span className="font-medium text-foreground">Interpretação:</span> {note.interp}
          {note.caution && (
            <>
              {" "}
              <span className="font-medium text-foreground">Cuidado:</span> {note.caution}
            </>
          )}
        </p>
      )}
    </div>
  );
}

/** Cabeçalho recolhível usado pelo formulário de registro. */
/** Mesmo card dos demais da tela de atendimento — antes tinha título menor e sem ícone. */
export function ScalesSection({ children, count }: { children: ReactNode; count: number }) {
  return (
    <CollapsibleSection
      title={`Escalas e calculadoras${count > 0 ? ` — ${count} anexada${count > 1 ? "s" : ""}` : ""}`}
    >
      {children}
    </CollapsibleSection>
  );
}
