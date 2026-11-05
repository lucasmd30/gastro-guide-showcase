"use client";

import { fib4Faixa, fib4Value } from "@/lib/fib4";
import { useMemo, useState } from "react";
import {
  AddBtn,
  Badge,
  Choice,
  NField,
  ScaleCard,
  Slider,
  fmt,
  num,
  sum,
  type ResultFn,
} from "./primitives";
import {
  ANTICIPATE_REFERENCE,
  AUDIT_C_ITEMS,
  AUDIT_C_REFERENCE,
  AUDIT_ITEMS,
  AUDIT_REFERENCE,
  UK_PBC_REFERENCE,
  calculateAnticipate,
  calculateAudit,
  calculateAuditC,
  calculateUkPbc,
  clinicalNumber,
} from "./scores";

/* ------------------------------------------------------------------ */
/* Fibrose                                                             */
/* ------------------------------------------------------------------ */

/**
 * APRI. O `× 100` é parte do escore publicado (Wai et al., 2003) — o
 * documento de fórmulas da cliente o omitiu, e sem ele o resultado sai duas
 * ordens de grandeza abaixo dos pontos de corte (0,5 e 1,5).
 */
export function Apri({ onResult }: { onResult?: ResultFn }) {
  const [ast, setAst] = useState("");
  const [uln, setUln] = useState("40");
  const [plt, setPlt] = useState("");
  const r = useMemo(() => {
    const a = num(ast), u = num(uln), p = num(plt);
    if (a === null || u === null || p === null || u <= 0 || p <= 0) return null;
    return (a / u / p) * 100;
  }, [ast, uln, plt]);
  const interp = r === null ? "" : r < 0.5 ? "fibrose avançada improvável" : r > 1.5 ? "sugere cirrose" : "indeterminado";
  return (
    <ScaleCard title="APRI" badge={r !== null && <Badge>{fmt(r)}</Badge>}>
      <div className="grid grid-cols-3 gap-3">
        <NField label="AST (U/L)" value={ast} onChange={setAst} />
        <NField label="Limite sup. AST" value={uln} onChange={setUln} />
        <NField label="Plaquetas (×10⁹/L)" value={plt} onChange={setPlt} />
      </div>
      {r !== null && <p className="mt-2 text-xs text-muted-foreground">{interp}.</p>}
      <AddBtn disabled={r === null} onClick={() => r !== null && onResult?.(`APRI: ${fmt(r)} (${interp})`)} />
    </ScaleCard>
  );
}

export function Fib4({ onResult }: { onResult?: ResultFn }) {
  const [age, setAge] = useState("");
  const [ast, setAst] = useState("");
  const [alt, setAlt] = useState("");
  const [plt, setPlt] = useState("");
  const r = useMemo(() => {
    const a = num(age), s = num(ast), l = num(alt), p = num(plt);
    if (a === null || s === null || l === null || p === null || p <= 0 || l <= 0) return null;
    return fib4Value(a, s, l, p);
  }, [age, ast, alt, plt]);
  const interp = r === null ? "" : fib4Faixa(r, num(age) ?? 0);
  return (
    <ScaleCard title="FIB-4" badge={r !== null && <Badge>{fmt(r)}</Badge>}>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <NField label="Idade (anos)" value={age} onChange={setAge} />
        <NField label="AST (U/L)" value={ast} onChange={setAst} />
        <NField label="ALT (U/L)" value={alt} onChange={setAlt} />
        <NField label="Plaquetas (×10⁹/L)" value={plt} onChange={setPlt} />
      </div>
      {r !== null && <p className="mt-2 text-xs text-muted-foreground">{interp}.</p>}
      <AddBtn disabled={r === null} onClick={() => r !== null && onResult?.(`FIB-4: ${fmt(r)} (${interp})`)} />
    </ScaleCard>
  );
}

export function Nfs({ onResult }: { onResult?: ResultFn }) {
  const [age, setAge] = useState("");
  const [bmi, setBmi] = useState("");
  const [ifg, setIfg] = useState<number | null>(null);
  const [ast, setAst] = useState("");
  const [alt, setAlt] = useState("");
  const [plt, setPlt] = useState("");
  const [alb, setAlb] = useState("");
  const r = useMemo(() => {
    const a = num(age), b = num(bmi), s = num(ast), l = num(alt), p = num(plt), al = num(alb);
    if ([a, b, s, l, p, al].some((x) => x === null) || l! <= 0 || ifg === null) return null;
    const score = -1.675 + 0.037 * a! + 0.094 * b! + 1.13 * ifg + 0.99 * (s! / l!) - 0.013 * p! - 0.66 * al!;
    const cat = score < -1.455 ? "exclui fibrose avançada" : score > 0.676 ? "fibrose avançada provável" : "indeterminado";
    return { score, cat };
  }, [age, bmi, ifg, ast, alt, plt, alb]);
  return (
    <ScaleCard title="NAFLD Fibrosis Score (NFS)" badge={r && <Badge>{fmt(r.score)}</Badge>}>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <NField label="Idade (anos)" value={age} onChange={setAge} />
        <NField label="IMC (kg/m²)" value={bmi} onChange={setBmi} />
        <NField label="Albumina (g/dL)" value={alb} onChange={setAlb} />
        <NField label="AST (U/L)" value={ast} onChange={setAst} />
        <NField label="ALT (U/L)" value={alt} onChange={setAlt} />
        <NField label="Plaquetas (×10⁹/L)" value={plt} onChange={setPlt} />
      </div>
      {/* Rótulo longo numa coluna estreita quebrava em duas linhas e desalinhava a grade. */}
      <div className="mt-3 sm:max-w-xs">
        <Choice
          label="Glicemia de jejum alterada / Diabetes"
          value={ifg}
          onChange={setIfg}
          opts={[["Sim", 1], ["Não", 0]]}
        />
      </div>
      {r && <p className="mt-2 text-xs text-muted-foreground">{r.cat}.</p>}
      <AddBtn disabled={!r} onClick={() => r && onResult?.(`NAFLD Fibrosis Score: ${fmt(r.score)} (${r.cat})`)} />
    </ScaleCard>
  );
}

/* ------------------------------------------------------------------ */
/* Hipertensão portal                                                  */
/* ------------------------------------------------------------------ */

/**
 * ANTICIPATE e ANTICIPATE-NASH (Barcelona). Estimam hipertensão portal
 * clinicamente significativa e eventos hepáticos em 3 anos — não diagnosticam
 * MASH nem fibrose.
 */
function PortalRisk({ nash, onResult }: { nash: boolean; onResult?: ResultFn }) {
  const [lsm, setLsm] = useState("");
  const [platelets, setPlatelets] = useState("");
  const [bmi, setBmi] = useState("");
  const r = calculateAnticipate(
    clinicalNumber(lsm),
    clinicalNumber(platelets),
    nash ? clinicalNumber(bmi) : undefined,
  );
  const name = nash ? "ANTICIPATE-NASH" : "ANTICIPATE";
  const text = r
    ? `${name}: probabilidade de HPCS ${Math.round(r.csph)}%; eventos hepáticos em 3 anos ${Math.round(r.lre3)}%.${
        r.capped ? " Plaquetas limitadas a 150 ×10⁹/L conforme o modelo." : ""
      }`
    : "";
  return (
    <ScaleCard title={`${name} — hipertensão portal`} badge={r && <Badge>HPCS {Math.round(r.csph)}%</Badge>}>
      <p className="mb-3 text-xs text-muted-foreground">
        Doença hepática crônica avançada compensada{" "}
        {nash ? "associada a NASH/MASH" : "de etiologia viral e/ou alcoólica"}. Estima hipertensão portal clinicamente
        significativa (HPCS; HVPG ≥10 mmHg), não o diagnóstico de MASH nem fibrose F≥2.
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <NField label="Rigidez hepática por elastografia (kPa)" value={lsm} onChange={setLsm} />
        <NField label="Plaquetas (×10⁹/L)" value={platelets} onChange={setPlatelets} />
        {nash && <NField label="IMC (kg/m²)" value={bmi} onChange={setBmi} />}
      </div>
      {!nash && (
        <p className="mt-2 text-xs text-muted-foreground">
          Plaquetas &gt;150 ×10⁹/L: o cálculo usa 150, conforme a referência.{r?.capped ? " Limite aplicado." : ""}
        </p>
      )}
      {r && (
        <div className="mt-2 space-y-0.5 text-xs font-medium text-foreground">
          <p>Probabilidade de HPCS: {Math.round(r.csph)}%</p>
          <p>Risco de eventos hepáticos em 3 anos: {Math.round(r.lre3)}%</p>
        </div>
      )}
      <p className="mt-2 text-xs text-muted-foreground">
        Eventos hepáticos: descompensação clínica, carcinoma hepatocelular ou morte relacionada ao fígado.{" "}
        <a href={ANTICIPATE_REFERENCE} target="_blank" rel="noreferrer" className="text-primary underline">
          Referência: Barcelona Liver Unit
        </a>
      </p>
      <AddBtn disabled={!r} onClick={() => r && onResult?.(text)} />
    </ScaleCard>
  );
}

export function Anticipate({ onResult }: { onResult?: ResultFn }) {
  return <PortalRisk nash={false} onResult={onResult} />;
}

export function AnticipateNash({ onResult }: { onResult?: ResultFn }) {
  return <PortalRisk nash onResult={onResult} />;
}

/* ------------------------------------------------------------------ */
/* Prognóstico hepático                                                */
/* ------------------------------------------------------------------ */

type CP = { enc: number; asc: number; bili: number; alb: number; inr: number };

function childClass(total: number) {
  if (total <= 6) return { label: "A", desc: "doença bem compensada", sobrevida: "Sobrevida 1 ano ~100%" };
  if (total <= 9) return { label: "B", desc: "comprometimento funcional significativo", sobrevida: "Sobrevida 1 ano ~80%" };
  return { label: "C", desc: "doença descompensada", sobrevida: "Sobrevida 1 ano ~45%" };
}

const CP_ROWS: { key: keyof CP; label: string; opts: [string, number][] }[] = [
  { key: "enc", label: "Encefalopatia", opts: [["Ausente", 1], ["Grau 1–2", 2], ["Grau 3–4", 3]] },
  { key: "asc", label: "Ascite", opts: [["Ausente", 1], ["Leve / controlada", 2], ["Moderada / refratária", 3]] },
  { key: "bili", label: "Bilirrubina (mg/dL)", opts: [["< 2", 1], ["2–3", 2], ["> 3", 3]] },
  { key: "alb", label: "Albumina (g/dL)", opts: [["> 3,5", 1], ["2,8–3,5", 2], ["< 2,8", 3]] },
  { key: "inr", label: "INR", opts: [["< 1,7", 1], ["1,7–2,3", 2], ["> 2,3", 3]] },
];

export function ChildPugh({ onResult }: { onResult?: ResultFn }) {
  const [v, setV] = useState<CP>({ enc: 1, asc: 1, bili: 1, alb: 1, inr: 1 });
  const total = v.enc + v.asc + v.bili + v.alb + v.inr;
  const cls = childClass(total);
  return (
    <ScaleCard title="Child-Pugh" badge={<Badge>{total} • Classe {cls.label}</Badge>}>
      <div className="grid gap-3 sm:grid-cols-2">
        {CP_ROWS.map((row) => (
          <Choice
            key={row.key}
            label={row.label}
            value={v[row.key]}
            onChange={(val) => setV((s) => ({ ...s, [row.key]: val }))}
            opts={row.opts}
          />
        ))}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        {cls.sobrevida}. Mínimo 5, máximo 15 pontos.
      </p>
      <AddBtn onClick={() => onResult?.(`Child-Pugh: ${total} pontos — Classe ${cls.label} (${cls.desc})`)} />
    </ScaleCard>
  );
}

/**
 * MELD e MELD-Na. As regras de truncamento (valores <1 viram 1, creatinina
 * limitada a 4,0 — ou 4,0 se diálise ≥2×/semana —, sódio entre 125 e 137 e
 * resultado entre 6 e 40) fazem parte do escore oficial e não estavam no
 * documento de fórmulas; sem elas o MELD sai errado justamente no paciente
 * grave, que é quando ele decide conduta.
 */
function computeMeld(bili: number, inr: number, creat: number, dialysis: boolean) {
  let cr = creat;
  if (dialysis || cr > 4) cr = 4;
  cr = Math.max(cr, 1);
  const b = Math.max(bili, 1);
  const i = Math.max(inr, 1);
  const meld = Math.round((0.957 * Math.log(cr) + 0.378 * Math.log(b) + 1.12 * Math.log(i) + 0.643) * 10);
  return Math.min(Math.max(meld, 6), 40);
}

function computeMeldNa(meld: number, na: number) {
  // O sódio só corrige MELD > 11 — abaixo disso a equação publicada não se aplica.
  if (meld <= 11) return meld;
  const sodium = Math.min(Math.max(na, 125), 137);
  const meldNa = meld + 1.32 * (137 - sodium) - 0.033 * meld * (137 - sodium);
  return Math.min(Math.max(Math.round(meldNa), 6), 40);
}

function meldRisk(score: number) {
  if (score < 10) return "mortalidade em 3 meses ~1,9%";
  if (score <= 19) return "mortalidade em 3 meses ~6%";
  if (score <= 29) return "mortalidade em 3 meses ~20%";
  if (score <= 39) return "mortalidade em 3 meses ~52%";
  return "mortalidade em 3 meses ~71%";
}

export function MeldNa({ onResult }: { onResult?: ResultFn }) {
  const [bili, setBili] = useState("");
  const [inr, setInr] = useState("");
  const [creat, setCreat] = useState("");
  const [na, setNa] = useState("");
  const [dialysis, setDialysis] = useState(false);

  const res = useMemo(() => {
    const b = num(bili), i = num(inr), c = num(creat), n = num(na);
    if (b === null || i === null || c === null) return null;
    const meld = computeMeld(b, i, c, dialysis);
    return { meld, meldNa: n === null ? null : computeMeldNa(meld, n) };
  }, [bili, inr, creat, na, dialysis]);

  const shown = res ? res.meldNa ?? res.meld : null;

  return (
    <ScaleCard
      title="MELD / MELD-Na"
      badge={res && <Badge>{res.meldNa != null ? `MELD-Na ${res.meldNa}` : `MELD ${res.meld}`}</Badge>}
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <NField label="Bilirrubina (mg/dL)" value={bili} onChange={setBili} />
        <NField label="INR" value={inr} onChange={setInr} />
        <NField label="Creatinina (mg/dL)" value={creat} onChange={setCreat} />
        <NField label="Sódio (mEq/L)" value={na} onChange={setNa} />
      </div>
      <label className="mt-3 flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
        <input
          type="checkbox"
          checked={dialysis}
          onChange={(e) => setDialysis(e.target.checked)}
          className="h-3.5 w-3.5"
        />
        Diálise ≥ 2× na última semana (creatinina considerada 4,0)
      </label>
      {res && (
        <div className="mt-3 rounded-lg bg-muted p-3 text-xs">
          <p className="font-semibold text-foreground">
            MELD: {res.meld}
            {res.meldNa != null && ` • MELD-Na: ${res.meldNa}`}
          </p>
          <p className="mt-0.5 text-muted-foreground">{meldRisk(shown ?? res.meld)}.</p>
          {(shown ?? res.meld) >= 15 && (
            <p className="mt-0.5 text-primary">MELD ≥ 15 → considerar encaminhamento a centro de transplante.</p>
          )}
        </div>
      )}
      <AddBtn
        disabled={!res}
        onClick={() => res && onResult?.(`MELD: ${res.meld}${res.meldNa != null ? ` / MELD-Na: ${res.meldNa}` : ""}`)}
      />
    </ScaleCard>
  );
}

export function Meld30({ onResult }: { onResult?: ResultFn }) {
  const [female, setFemale] = useState<number | null>(null);
  const [bili, setBili] = useState("");
  const [inr, setInr] = useState("");
  const [creat, setCreat] = useState("");
  const [na, setNa] = useState("");
  const [alb, setAlb] = useState("");
  const [dialysis, setDialysis] = useState(false);

  const r = useMemo(() => {
    const b0 = num(bili), i0 = num(inr), c0 = num(creat), n0 = num(na), a0 = num(alb);
    if ([b0, i0, c0, n0, a0].some((x) => x === null) || female === null) return null;
    const b = Math.max(b0!, 1);
    const i = Math.max(i0!, 1);
    let c = dialysis ? 3 : c0!;
    c = Math.min(Math.max(c, 1), 3);
    const n = Math.min(Math.max(n0!, 125), 137);
    const a = Math.min(Math.max(a0!, 1.5), 3.5);
    const m =
      1.33 * female +
      4.56 * Math.log(b) +
      0.82 * (137 - n) -
      0.24 * (137 - n) * Math.log(b) +
      9.09 * Math.log(i) +
      11.14 * Math.log(c) +
      1.85 * (3.5 - a) -
      1.83 * (3.5 - a) * Math.log(c) +
      6;
    return Math.min(Math.max(Math.round(m), 6), 40);
  }, [female, bili, inr, creat, na, alb, dialysis]);

  return (
    <ScaleCard title="MELD 3.0" badge={r !== null && <Badge>{r}</Badge>}>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <NField label="Bilirrubina (mg/dL)" value={bili} onChange={setBili} />
        <NField label="INR" value={inr} onChange={setInr} />
        <NField label="Creatinina (mg/dL)" value={creat} onChange={setCreat} />
        <NField label="Sódio (mEq/L)" value={na} onChange={setNa} />
        <NField label="Albumina (g/dL)" value={alb} onChange={setAlb} />
        <Choice label="Sexo" value={female} onChange={setFemale} opts={[["Masc.", 0], ["Fem.", 1]]} />
      </div>
      <label className="mt-3 flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
        <input
          type="checkbox"
          checked={dialysis}
          onChange={(e) => setDialysis(e.target.checked)}
          className="h-3.5 w-3.5"
        />
        Diálise ≥ 2× na última semana
      </label>
      {r !== null && r >= 15 && (
        <p className="mt-2 text-xs text-primary">MELD ≥ 15 → considerar centro de transplante.</p>
      )}
      <AddBtn disabled={r === null} onClick={() => r !== null && onResult?.(`MELD 3.0: ${r}`)} />
    </ScaleCard>
  );
}

export function Albi({ onResult }: { onResult?: ResultFn }) {
  const [bili, setBili] = useState("");
  const [alb, setAlb] = useState("");
  const r = useMemo(() => {
    const b = num(bili), a = num(alb);
    if (b === null || a === null || b <= 0) return null;
    // A fórmula publicada usa bilirrubina em µmol/L e albumina em g/L; aqui a
    // entrada é nas unidades do laboratório brasileiro (mg/dL e g/dL).
    const score = Math.log10(b * 17.1) * 0.66 - a * 10 * 0.085;
    const grade = score <= -2.6 ? 1 : score <= -1.39 ? 2 : 3;
    return { score, grade };
  }, [bili, alb]);
  return (
    <ScaleCard title="ALBI" badge={r && <Badge>Grau {r.grade}</Badge>}>
      <div className="grid grid-cols-2 gap-3">
        <NField label="Bilirrubina (mg/dL)" value={bili} onChange={setBili} />
        <NField label="Albumina (g/dL)" value={alb} onChange={setAlb} />
      </div>
      {r && (
        <p className="mt-2 text-xs text-muted-foreground">
          Escore {fmt(r.score)} — Grau {r.grade} (1 ≤ −2,60; 2 até −1,39; 3 acima).
        </p>
      )}
      <AddBtn disabled={!r} onClick={() => r && onResult?.(`ALBI: ${fmt(r.score)} — Grau ${r.grade}`)} />
    </ScaleCard>
  );
}

/* ------------------------------------------------------------------ */
/* Hepatite alcoólica                                                  */
/* ------------------------------------------------------------------ */

export function Maddrey({ onResult }: { onResult?: ResultFn }) {
  const [tp, setTp] = useState("");
  const [ctrl, setCtrl] = useState("");
  const [bili, setBili] = useState("");
  const r = useMemo(() => {
    const a = num(tp), b = num(ctrl), c = num(bili);
    if (a === null || b === null || c === null) return null;
    return 4.6 * (a - b) + c;
  }, [tp, ctrl, bili]);
  const cat = r === null ? "" : r >= 32 ? "hepatite alcoólica grave — considerar corticoide" : "não grave";
  return (
    <ScaleCard title="Maddrey DF (hepatite alcoólica)" badge={r !== null && <Badge>{fmt(r, 1)}</Badge>}>
      <div className="grid grid-cols-3 gap-3">
        <NField label="TP paciente (s)" value={tp} onChange={setTp} />
        <NField label="TP controle (s)" value={ctrl} onChange={setCtrl} />
        <NField label="Bilirrubina (mg/dL)" value={bili} onChange={setBili} />
      </div>
      {r !== null && <p className="mt-2 text-xs text-muted-foreground">{cat}.</p>}
      <AddBtn disabled={r === null} onClick={() => r !== null && onResult?.(`Maddrey DF: ${fmt(r, 1)} (${cat})`)} />
    </ScaleCard>
  );
}

/**
 * Lille (Louvet et al., Hepatology 2007), como no Lovable: albumina em g/dL e
 * bilirrubina em mg/dL, convertidas para as unidades da equação (g/L e
 * µmol/L), e o TP do próprio paciente em segundos — a versão anterior pedia
 * albumina em g/L e usava a diferença para o TP controle.
 */
export function Lille({ onResult }: { onResult?: ResultFn }) {
  const [age, setAge] = useState("");
  const [alb, setAlb] = useState("");
  const [b0, setB0] = useState("");
  const [b7, setB7] = useState("");
  const [tp, setTp] = useState("");
  const [creat, setCreat] = useState("");
  const r = useMemo(() => {
    const a = num(age), al = num(alb), bi0 = num(b0), bi7 = num(b7), p = num(tp), c = num(creat);
    if ([a, al, bi0, bi7, p, c].some((x) => x === null)) return null;
    const renal = c! > 1.3 ? 1 : 0;
    const albGL = al! * 10;
    const B0 = bi0! * 17.1, B7 = bi7! * 17.1;
    const R = 3.19 - 0.101 * a! + 0.147 * albGL + 0.0165 * (B0 - B7) - 0.206 * renal - 0.0065 * B0 - 0.0096 * p!;
    const lille = Math.exp(-R) / (1 + Math.exp(-R));
    const cat = lille >= 0.45 ? "não respondedor — suspender corticoide" : "respondedor";
    return { lille, cat };
  }, [age, alb, b0, b7, tp, creat]);
  return (
    <ScaleCard title="Lille (resposta ao corticoide, D7)" badge={r && <Badge>{fmt(r.lille)}</Badge>}>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <NField label="Idade (anos)" value={age} onChange={setAge} />
        <NField label="Albumina D0 (g/dL)" value={alb} onChange={setAlb} />
        <NField label="Bilirrubina D0 (mg/dL)" value={b0} onChange={setB0} />
        <NField label="Bilirrubina D7 (mg/dL)" value={b7} onChange={setB7} />
        <NField label="TP paciente D0 (s)" value={tp} onChange={setTp} />
        <NField label="Creatinina D0 (mg/dL)" value={creat} onChange={setCreat} />
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Variáveis basais (D0 = início do corticoide): idade, albumina, bilirrubina, TP do paciente e creatinina; apenas
        a bilirrubina se repete no D7.
      </p>
      {r && <p className="mt-1 text-xs text-muted-foreground">{r.cat} (corte 0,45).</p>}
      <AddBtn disabled={!r} onClick={() => r && onResult?.(`Lille: ${fmt(r.lille)} (${r.cat})`)} />
    </ScaleCard>
  );
}

/* ------------------------------------------------------------------ */
/* CHC                                                                 */
/* ------------------------------------------------------------------ */

export function PageB({ onResult }: { onResult?: ResultFn }) {
  const [age, setAge] = useState("");
  const [plt, setPlt] = useState("");
  const [sex, setSex] = useState<string | null>(null);
  const r = useMemo(() => {
    const a = num(age), p = num(plt);
    if (a === null || p === null || sex === null) return null;
    const ageP = a < 30 ? 0 : a < 40 ? 2 : a < 50 ? 4 : a < 60 ? 6 : a < 70 ? 8 : 10;
    // Pontuação publicada das plaquetas: 0 / 6 / 9 (o documento da cliente
    // trazia 0 / 1 / 2, que não reproduz os cortes 9 e 17 do escore).
    const pltP = p >= 200 ? 0 : p >= 100 ? 6 : 9;
    const total = ageP + pltP + (sex === "f" ? 0 : 6);
    const risk = total <= 9 ? "baixo risco de CHC" : total <= 17 ? "risco intermediário" : "alto risco";
    return { total, risk };
  }, [age, plt, sex]);
  return (
    <ScaleCard title="PAGE-B (CHC na HBV)" badge={r && <Badge>{r.total}</Badge>}>
      <div className="grid grid-cols-3 gap-3">
        <NField label="Idade (anos)" value={age} onChange={setAge} />
        <NField label="Plaquetas (×10⁹/L)" value={plt} onChange={setPlt} />
        <Choice label="Sexo" value={sex} onChange={setSex} opts={[["Masc.", "m"], ["Fem.", "f"]]} />
      </div>
      {r && <p className="mt-2 text-xs text-muted-foreground">{r.risk}.</p>}
      <AddBtn disabled={!r} onClick={() => r && onResult?.(`PAGE-B: ${r.total} (${r.risk})`)} />
    </ScaleCard>
  );
}

const BCLC_DESC: Record<string, string> = {
  "0": "muito inicial: nódulo único ≤2 cm, Child A, PS 0 — ressecção/ablação",
  A: "inicial: único ou ≤3 nódulos ≤3 cm, Child A-B, PS 0 — ressecção/ablação/transplante",
  B: "intermediário: multinodular, Child A-B, PS 0 — quimioembolização",
  C: "avançado: invasão vascular/metástase, PS 1–2 — terapia sistêmica",
  D: "terminal: Child C, PS 3–4 — suporte",
};

export function Bclc({ onResult }: { onResult?: ResultFn }) {
  const [s, setS] = useState<string | null>(null);
  return (
    <ScaleCard title="BCLC (estadiamento CHC)" badge={s && <Badge>{s}</Badge>}>
      <Choice
        label="Estágio"
        value={s}
        onChange={setS}
        opts={[["0", "0"], ["A", "A"], ["B", "B"], ["C", "C"], ["D", "D"]]}
      />
      {s && <p className="mt-2 text-xs text-muted-foreground">{BCLC_DESC[s]}.</p>}
      <AddBtn disabled={!s} onClick={() => s && onResult?.(`BCLC: ${s} — ${BCLC_DESC[s]}`)} />
    </ScaleCard>
  );
}

/* ------------------------------------------------------------------ */
/* Encefalopatia                                                       */
/* ------------------------------------------------------------------ */

const WH_DESC = [
  "Sem alterações detectáveis (EH mínima).",
  "Déficit de atenção, alteração do sono, euforia/ansiedade.",
  "Letargia, desorientação temporal, asterixis, comportamento inadequado.",
  "Sonolência a torpor, desorientação espaço-temporal, confusão.",
  "Coma.",
];

export function WestHaven({ onResult }: { onResult?: ResultFn }) {
  const [g, setG] = useState<number | null>(null);
  return (
    <ScaleCard title="West Haven (encefalopatia)" badge={g !== null && <Badge>Grau {g}</Badge>}>
      <Choice
        label="Grau"
        value={g}
        onChange={setG}
        opts={[["Grau 0", 0], ["Grau I", 1], ["Grau II", 2], ["Grau III", 3], ["Grau IV (coma)", 4]]}
      />
      {g !== null && <p className="mt-2 text-xs text-muted-foreground">{WH_DESC[g]}</p>}
      <AddBtn disabled={g === null} onClick={() => g !== null && onResult?.(`West Haven: Grau ${g}`)} />
    </ScaleCard>
  );
}

/* ------------------------------------------------------------------ */
/* Hepatotoxicidade                                                    */
/* ------------------------------------------------------------------ */

/**
 * RUCAM em duas versões, como no Lovable: hepatocelular e colestático/misto
 * diferem nos itens 2 (curso após suspensão), 3 (fatores de risco) e 7
 * (reexposição).
 */
type RucamItem = { key: string; label: string; opts: [string, number][] };

const RUCAM_TEMPO: RucamItem = {
  key: "tempo",
  label: "1. Tempo até o início",
  opts: [["5–90 d (+2)", 2], ["<5 ou >90 d (+1)", 1], ["Sem relação (0)", 0]],
};
const RUCAM_IDADE: RucamItem = { key: "idade", label: "Idade", opts: [["≥55 anos (+1)", 1], ["<55 anos (0)", 0]] };
const RUCAM_COMUM: RucamItem[] = [
  { key: "concomitante", label: "4. Medicação concomitante", opts: [["Nenhuma (0)", 0], ["Compatível (−1)", -1], ["Provável outra causa (−2)", -2], ["Outra confirmada (−3)", -3]] },
  { key: "outras", label: "5. Exclusão de outras causas", opts: [["Grupos I e II excluídos (+2)", 2], ["7 causas do grupo I excluídas (+1)", 1], ["5–6 causas excluídas (0)", 0], ["<5 causas excluídas (−2)", -2], ["Causa alternativa altamente provável (−3)", -3]] },
  { key: "conhecida", label: "6. Hepatotoxicidade conhecida", opts: [["Em bula (+2)", 2], ["Relatos publicados (+1)", 1], ["Desconhecida (0)", 0]] },
];

const RUCAM_HEP: RucamItem[] = [
  RUCAM_TEMPO,
  { key: "curso", label: "2. Curso da ALT após suspensão", opts: [["↓ ≥50% em 8 d (+3)", 3], ["↓ ≥50% em 30 d (+2)", 2], ["↓ ≥50% após 30 d (0)", 0], ["↓ <50% após 30 d ou nova elevação (−2)", -2], ["Sem dados / uso continuado (0)", 0]] },
  { key: "risco", label: "3. Fatores de risco", opts: [["Álcool (+1)", 1], ["Ausentes (0)", 0]] },
  RUCAM_IDADE,
  ...RUCAM_COMUM,
  { key: "reexposicao", label: "7. Reexposição (ALT)", opts: [["Dobra da ALT com ALT prévia <5×LSN (+3)", 3], ["Dobra da ALT com ALT prévia ≥5×LSN (+1)", 1], ["Negativa (−2)", -2], ["Não realizada/não interpretável (0)", 0]] },
];

const RUCAM_COL: RucamItem[] = [
  RUCAM_TEMPO,
  { key: "curso", label: "2. Curso da FA/bilirrubina após suspensão", opts: [["↓ ≥50% em 180 d (+2)", 2], ["↓ <50% em 180 d (+1)", 1], ["Persistência ou nova elevação (0)", 0], ["Sem dados / uso continuado (0)", 0]] },
  { key: "risco", label: "3. Fatores de risco", opts: [["Álcool ou gravidez (+1)", 1], ["Ausentes (0)", 0]] },
  RUCAM_IDADE,
  ...RUCAM_COMUM,
  { key: "reexposicao", label: "7. Reexposição (FA/bilirrubina)", opts: [["Dobra da FA/bilirrubina com valores prévios <2×LSN (+3)", 3], ["Dobra com valores prévios ≥2×LSN (+1)", 1], ["Negativa (−2)", -2], ["Não realizada/não interpretável (0)", 0]] },
];

function RucamBase({ items, title, onResult }: { items: RucamItem[]; title: string; onResult?: ResultFn }) {
  const [v, setV] = useState<Record<string, number>>({});
  const total = sum(v);
  const cat =
    total <= 0 ? "excluída" : total <= 2 ? "improvável" : total <= 5 ? "possível" : total <= 8 ? "provável" : "altamente provável";
  return (
    <ScaleCard title={title} badge={<Badge>{total} • {cat}</Badge>}>
      <div className="grid gap-3 sm:grid-cols-2">
        {items.map((it) => (
          <Choice
            key={it.key}
            label={it.label}
            value={v[it.key] ?? null}
            onChange={(val) => setV((s) => ({ ...s, [it.key]: val }))}
            opts={it.opts}
            wrap
          />
        ))}
      </div>
      <AddBtn onClick={() => onResult?.(`${title}: ${total} pontos (${cat})`)} />
    </ScaleCard>
  );
}

export function RucamHep({ onResult }: { onResult?: ResultFn }) {
  return (
    <RucamBase items={RUCAM_HEP} title="RUCAM hepatocelular (DILI com ALT ≥5×LSN ou R ≥5)" onResult={onResult} />
  );
}

export function RucamCol({ onResult }: { onResult?: ResultFn }) {
  return (
    <RucamBase items={RUCAM_COL} title="RUCAM colestático/misto (DILI com FA ≥2×LSN ou R <5)" onResult={onResult} />
  );
}

/* ------------------------------------------------------------------ */
/* Hepatite autoimune e Wilson                                         */
/* ------------------------------------------------------------------ */

const AIH_SIMPLE: { key: string; label: string; opts: [string, number][] }[] = [
  { key: "auto", label: "Autoanticorpos", opts: [["Negativos (0)", 0], ["ANA/ASMA ≥1:40 (+1)", 1], ["ANA/ASMA ≥1:80, LKM ≥1:40 ou SLA+ (+2)", 2]] },
  { key: "igg", label: "IgG", opts: [["≤ LSN (0)", 0], ["> LSN (+1)", 1], ["> 1,10× LSN (+2)", 2]] },
  { key: "histo", label: "Histologia", opts: [["Incompatível (0)", 0], ["Compatível com HAI (+1)", 1], ["Típica de HAI (+2)", 2]] },
  { key: "viral", label: "Ausência de hepatite viral", opts: [["Não (0)", 0], ["Sim (+2)", 2]] },
];

export function AihSimple({ onResult }: { onResult?: ResultFn }) {
  const [v, setV] = useState<Record<string, number>>({});
  const total = Math.min(sum(v), 8);
  const cat = total >= 7 ? "HAI definida" : total >= 6 ? "HAI provável" : "não preenche critérios";
  return (
    <ScaleCard title="HAI — escore simplificado (IAIHG 2008)" badge={<Badge>{total} • {cat}</Badge>}>
      <div className="grid gap-3 sm:grid-cols-2">
        {AIH_SIMPLE.map((it) => (
          <Choice
            key={it.key}
            label={it.label}
            value={v[it.key] ?? null}
            onChange={(val) => setV((s) => ({ ...s, [it.key]: val }))}
            opts={it.opts}
          />
        ))}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">≥6 provável; ≥7 definida.</p>
      <AddBtn onClick={() => onResult?.(`HAI simplificado: ${total} pontos (${cat})`)} />
    </ScaleCard>
  );
}

/**
 * HAI revisado (IAIHG 1999), como no Lovable — a cliente apontou o anterior
 * como errado. A histologia é item a item (cada achado soma ou subtrai, e
 * nenhum dos três sugestivos vale −5), e o corte muda quando há resposta ao
 * tratamento informada.
 */
const AIH_FULL: { key: string; label: string; opts: [string, number][] }[] = [
  { key: "sexo", label: "Sexo", opts: [["Feminino (+2)", 2], ["Masculino (0)", 0]] },
  { key: "faAst", label: "Razão FA:AST (ou ALT)", opts: [["<1,5 (+2)", 2], ["1,5–3,0 (0)", 0], [">3,0 (−2)", -2]] },
  { key: "gama", label: "γ-globulina/IgG acima do normal", opts: [[">2,0× (+3)", 3], ["1,5–2,0× (+2)", 2], ["1,0–1,5× (+1)", 1], ["<1,0× (0)", 0]] },
  { key: "anticorpos", label: "ANA, AML ou anti-LKM1", opts: [[">1:80 (+3)", 3], ["1:80 (+2)", 2], ["1:40 (+1)", 1], ["<1:40 (0)", 0]] },
  { key: "ama", label: "AMA", opts: [["Positivo (−4)", -4], ["Negativo (0)", 0]] },
  { key: "viral", label: "Marcadores de hepatite viral", opts: [["Positivos (−3)", -3], ["Negativos (+3)", 3]] },
  { key: "drogas", label: "Uso de drogas hepatotóxicas", opts: [["Sim (−4)", -4], ["Não (+1)", 1]] },
  { key: "alcool", label: "Consumo de álcool", opts: [["<25 g/dia (+2)", 2], ["25–60 g/dia (0)", 0], [">60 g/dia (−2)", -2]] },
  { key: "imune", label: "Doença autoimune concomitante", opts: [["Sim (+2)", 2], ["Não (0)", 0]] },
  { key: "outros", label: "Outros autoanticorpos (SLA, pANCA, etc.)", opts: [["Presentes (+2)", 2], ["Ausentes (0)", 0]] },
  { key: "hInterface", label: "Histologia: hepatite de interface", opts: [["Sim (+3)", 3], ["Não (0)", 0]] },
  { key: "hPlasmo", label: "Histologia: infiltrado linfoplasmocitário predominante", opts: [["Sim (+1)", 1], ["Não (0)", 0]] },
  { key: "hRoseta", label: "Histologia: rosetas", opts: [["Sim (+1)", 1], ["Não (0)", 0]] },
  { key: "hBiliar", label: "Histologia: alterações biliares", opts: [["Sim (−3)", -3], ["Não (0)", 0]] },
  { key: "hAtipica", label: "Histologia: outras alterações atípicas", opts: [["Sim (−3)", -3], ["Não (0)", 0]] },
  { key: "hla", label: "HLA DR3 ou DR4", opts: [["Presente (+1)", 1], ["Ausente/desconhecido (0)", 0]] },
  { key: "resposta", label: "Resposta ao tratamento", opts: [["Completa (+2)", 2], ["Recidiva (+3)", 3], ["Não avaliada (0)", 0]] },
];

export function AihFull({ onResult }: { onResult?: ResultFn }) {
  const [v, setV] = useState<Record<string, number>>({});
  const noHisto = v.hInterface === 0 && v.hPlasmo === 0 && v.hRoseta === 0 ? -5 : 0;
  const total = sum(v) + noHisto;
  const treated = (v.resposta ?? 0) !== 0;
  const cat = treated
    ? total > 17 ? "definida (pós-tratamento >17)" : total >= 12 ? "provável (pós-tratamento 12–17)" : "improvável (<12)"
    : total > 15 ? "definida (pré-tratamento >15)" : total >= 10 ? "provável (pré-tratamento 10–15)" : "improvável (<10)";
  return (
    <ScaleCard title="HAI — escore revisado completo (IAIHG 1999)" badge={<Badge>{total}</Badge>}>
      <div className="grid gap-3 sm:grid-cols-2">
        {AIH_FULL.map((it) => (
          <Choice
            key={it.key}
            label={it.label}
            value={v[it.key] ?? null}
            onChange={(val) => setV((s) => ({ ...s, [it.key]: val }))}
            opts={it.opts}
          />
        ))}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Pré-tratamento: &gt;15 definida, 10–15 provável. Pós-tratamento: &gt;17 definida, 12–17 provável. Sem
        interface, infiltrado linfoplasmocitário nem rosetas: −5.
      </p>
      <AddBtn onClick={() => onResult?.(`HAI revisado (IAIHG 1999): ${total} pontos — ${cat}`)} />
    </ScaleCard>
  );
}

const WILSON: { key: string; label: string; opts: [string, number][] }[] = [
  { key: "kf", label: "Anéis de Kayser-Fleischer", opts: [["Presentes (+2)", 2], ["Ausentes (0)", 0]] },
  { key: "neuro", label: "Sintomas neurológicos / RM típica", opts: [["Graves (+2)", 2], ["Leves (+1)", 1], ["Ausentes (0)", 0]] },
  { key: "cerulo", label: "Ceruloplasmina sérica", opts: [[">0,2 g/L (0)", 0], ["0,1–0,2 g/L (+1)", 1], ["<0,1 g/L (+2)", 2]] },
  { key: "hemo", label: "Anemia hemolítica Coombs-negativa", opts: [["Presente (+1)", 1], ["Ausente (0)", 0]] },
  { key: "cuhep", label: "Cobre hepático (sem colestase)", opts: [[">250 µg/g (+2)", 2], ["50–249 µg/g (+1)", 1], ["<50 µg/g (−1)", -1], ["Rodanina+ sem quantificação (+1)", 1] ] },
  { key: "cuurina", label: "Cobre urinário 24 h", opts: [["Normal (0)", 0], ["1–2× LSN (+1)", 1], [">2× LSN (+2)", 2], ["Normal, >5× após D-penicilamina (+2)", 2]] },
  { key: "mutacao", label: "Análise genética (ATP7B)", opts: [["Dois cromossomos (+4)", 4], ["Um cromossomo (+1)", 1], ["Nenhuma (0)", 0]] },
];

export function Wilson({ onResult }: { onResult?: ResultFn }) {
  const [v, setV] = useState<Record<string, number>>({});
  const total = sum(v);
  const cat = total >= 4 ? "diagnóstico estabelecido" : total === 3 ? "provável — investigar mais" : "improvável";
  return (
    <ScaleCard title="Leipzig — Doença de Wilson" badge={<Badge>{total} • {cat}</Badge>}>
      <div className="grid gap-3 sm:grid-cols-2">
        {WILSON.map((it) => (
          <Choice
            key={it.key}
            label={it.label}
            value={v[it.key] ?? null}
            onChange={(val) => setV((s) => ({ ...s, [it.key]: val }))}
            opts={it.opts}
          />
        ))}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">≥4 estabelecido; 3 provável; ≤2 improvável.</p>
      <AddBtn onClick={() => onResult?.(`Leipzig (Wilson): ${total} pontos (${cat})`)} />
    </ScaleCard>
  );
}

/* ------------------------------------------------------------------ */
/* CBP / CEP                                                           */
/* ------------------------------------------------------------------ */

/**
 * GLOBE (Lammers et al., Gastroenterology 2015), como no Lovable: a
 * bilirrubina entra dividida pelo LSN informado, e o corte depende da idade
 * (globalpbc.com) — a versão anterior pedia a bilirrubina já em "× LSN" e
 * usava um corte único de 0,30.
 */
function globeThreshold(age: number) {
  if (age < 45) return 0.52;
  if (age < 52) return 0.01;
  if (age < 58) return 0.6;
  if (age <= 66) return 1.01;
  return 1.69;
}

export function Globe({ onResult }: { onResult?: ResultFn }) {
  const [age, setAge] = useState("");
  const [bili, setBili] = useState("");
  const [biliULN, setBiliULN] = useState("1.2");
  const [alb, setAlb] = useState("");
  const [ap, setAp] = useState("");
  const [plt, setPlt] = useState("");
  const [apULN, setApULN] = useState("104");
  const [albLLN, setAlbLLN] = useState("3.5");
  const r = useMemo(() => {
    const a = num(age), b = num(bili), bu = num(biliULN), al = num(alb), p = num(ap), pl = num(plt), u = num(apULN), ln = num(albLLN);
    if ([a, b, bu, al, p, pl, u, ln].some((x) => x === null) || b! <= 0 || p! <= 0 || bu! <= 0 || u! <= 0 || ln! <= 0) {
      return null;
    }
    const score =
      0.044378 * a! +
      0.93982 * Math.log(b! / bu!) +
      0.335648 * Math.log(p! / u!) -
      2.266708 * (al! / ln!) -
      0.002581 * pl! +
      1.216865;
    const thr = globeThreshold(a!);
    const cat =
      score > thr
        ? "alto risco — sobrevida livre de transplante reduzida"
        : "baixo risco — sobrevida comparável à população pareada";
    return { score, cat, thr };
  }, [age, bili, biliULN, alb, ap, plt, apULN, albLLN]);
  return (
    <ScaleCard title="GLOBE Score (CBP após 12 m de UDCA)" badge={r && <Badge>{fmt(r.score)}</Badge>}>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <NField label="Idade ao iniciar UDCA" value={age} onChange={setAge} />
        <NField label="Bilirrubina (mg/dL)" value={bili} onChange={setBili} />
        <NField label="LSN da bilirrubina" value={biliULN} onChange={setBiliULN} />
        <NField label="Albumina (g/dL)" value={alb} onChange={setAlb} />
        <NField label="LIN da albumina" value={albLLN} onChange={setAlbLLN} />
        <NField label="FA (U/L)" value={ap} onChange={setAp} />
        <NField label="LSN da FA" value={apULN} onChange={setApULN} />
        <NField label="Plaquetas (×10⁹/L)" value={plt} onChange={setPlt} />
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Exames após 12 meses de UDCA. O corte depende da idade: &lt;45 anos → 0,52; 45–51 → 0,01; 52–57 → 0,60; 58–66 →
        1,01; &gt;66 → 1,69.
      </p>
      {r && (
        <p className="mt-1 text-xs text-muted-foreground">
          {r.cat} (corte para esta idade: {fmt(r.thr)}).
        </p>
      )}
      <AddBtn
        disabled={!r}
        onClick={() => r && onResult?.(`GLOBE: ${fmt(r.score)} — ${r.cat} (corte ${fmt(r.thr)})`)}
      />
    </ScaleCard>
  );
}

const UKPBC_FIELDS: [string, string][] = [
  ["alp", "FA após 12 meses (U/L)"],
  ["alpUln", "LSN da FA (U/L)"],
  ["transaminase", "AST ou ALT após 12 meses (U/L)"],
  ["transaminaseUln", "LSN da mesma AST ou ALT (U/L)"],
  ["bilirubin", "Bilirrubina após 12 meses (mg/dL)"],
  ["bilirubinUln", "LSN da bilirrubina (mg/dL)"],
  ["albumin", "Albumina basal (g/dL)"],
  ["albuminLln", "LIN da albumina (g/dL)"],
  ["platelets", "Plaquetas basais (×10⁹/L)"],
  ["plateletsLln", "LIN das plaquetas (×10⁹/L)"],
];

/** UK-PBC como no Lovable (conferido com a MDApp); a conta está em `scores.ts`. */
export function UkPbc({ onResult }: { onResult?: ResultFn }) {
  const [v, setV] = useState<Record<string, string>>({});
  const value = (key: string) => clinicalNumber(v[key] ?? "");
  const r = calculateUkPbc({
    alp: value("alp"),
    alpUln: value("alpUln"),
    transaminase: value("transaminase"),
    transaminaseUln: value("transaminaseUln"),
    bilirubin: value("bilirubin"),
    bilirubinUln: value("bilirubinUln"),
    albumin: value("albumin"),
    albuminLln: value("albuminLln"),
    platelets: value("platelets"),
    plateletsLln: value("plateletsLln"),
  });
  const text = r
    ? `UK-PBC: 5 anos ${fmt(r.r5, 1)}%; 10 anos ${fmt(r.r10, 1)}%; 15 anos ${fmt(r.r15, 1)}% (risco de doença hepática terminal)`
    : "";
  return (
    <ScaleCard title="UK-PBC — após 12 meses de UDCA" badge={r && <Badge>{fmt(r.r5, 1)}% em 5a</Badge>}>
      <p className="mb-3 text-xs text-muted-foreground">
        FA, AST ou ALT e bilirrubina após 12 meses de UDCA; albumina e plaquetas basais. Informar os limites do próprio
        laboratório, nas mesmas unidades dos resultados. LSN: limite superior; LIN: limite inferior.
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {UKPBC_FIELDS.map(([key, label]) => (
          <NField key={key} label={label} value={v[key] ?? ""} onChange={(val) => setV((s) => ({ ...s, [key]: val }))} />
        ))}
      </div>
      {r && <p className="mt-2 text-xs font-medium text-foreground">{text}.</p>}
      <p className="mt-2 text-xs text-muted-foreground">
        <a href={UK_PBC_REFERENCE} target="_blank" rel="noreferrer" className="text-primary underline">
          Referência: MDApp / Carbone et al., Hepatology 2016
        </a>
      </p>
      <AddBtn disabled={!r} onClick={() => r && onResult?.(`${text}.`)} />
    </ScaleCard>
  );
}

export function MayoPsc({ onResult }: { onResult?: ResultFn }) {
  const [age, setAge] = useState("");
  const [bili, setBili] = useState("");
  const [ast, setAst] = useState("");
  const [alb, setAlb] = useState("");
  const [vari, setVari] = useState<number | null>(null);
  const r = useMemo(() => {
    const a = num(age), b = num(bili), s = num(ast), al = num(alb);
    if ([a, b, s, al].some((x) => x === null) || b! <= 0 || s! <= 0 || vari === null) return null;
    return 0.03 * a! + 0.54 * Math.log(b!) + 0.54 * Math.log(s!) - 0.84 * al! + 1.24 * vari;
  }, [age, bili, ast, alb, vari]);
  const cat = r === null ? "" : r < 0 ? "baixo risco" : r <= 2 ? "risco intermediário" : "alto risco em 4 anos";
  return (
    <ScaleCard title="Mayo Risk Score — CEP" badge={r !== null && <Badge>{fmt(r)}</Badge>}>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <NField label="Idade (anos)" value={age} onChange={setAge} />
        <NField label="Bilirrubina (mg/dL)" value={bili} onChange={setBili} />
        <NField label="AST (U/L)" value={ast} onChange={setAst} />
        <NField label="Albumina (g/dL)" value={alb} onChange={setAlb} />
        <Choice label="Sangramento varicoso prévio" value={vari} onChange={setVari} opts={[["Não", 0], ["Sim", 1]]} />
      </div>
      {r !== null && <p className="mt-2 text-xs text-muted-foreground">{cat}.</p>}
      <AddBtn disabled={r === null} onClick={() => r !== null && onResult?.(`Mayo Risk (CEP): R = ${fmt(r)} (${cat})`)} />
    </ScaleCard>
  );
}

export function Paris2({ onResult }: { onResult?: ResultFn }) {
  const [ap, setAp] = useState<number | null>(null);
  const [ast, setAst] = useState<number | null>(null);
  const [bili, setBili] = useState<number | null>(null);
  const all = ap !== null && ast !== null && bili !== null;
  const ok = ap === 1 && ast === 1 && bili === 1;
  return (
    <ScaleCard title="Paris II (resposta ao UDCA aos 12 m)" badge={all && <Badge>{ok ? "Resposta" : "Não resposta"}</Badge>}>
      <div className="grid gap-3 sm:grid-cols-3">
        <Choice label="FA ≤ 1,5× LSN" value={ap} onChange={setAp} opts={[["Sim", 1], ["Não", 0]]} />
        <Choice label="AST ≤ 1,5× LSN" value={ast} onChange={setAst} opts={[["Sim", 1], ["Não", 0]]} />
        <Choice
          label="Bilirrubina normal (≤ LSN do laboratório)"
          value={bili}
          onChange={setBili}
          opts={[["Sim", 1], ["Não", 0]]}
        />
      </div>
      <AddBtn
        disabled={!all}
        onClick={() =>
          all &&
          onResult?.(
            `Paris II: ${ok ? "respondedora ao UDCA" : "não respondedora — considerar bezafibrato, seladelparo ou elafibranor"}`,
          )
        }
      />
    </ScaleCard>
  );
}

const PBC_DOMAINS: { key: string; label: string; itens: number }[] = [
  { key: "fadiga", label: "Fadiga (11 itens, 11–55)", itens: 11 },
  { key: "sintomas", label: "Sintomas gerais (7 itens, 7–35)", itens: 7 },
  { key: "prurido", label: "Prurido (3 itens, 3–15)", itens: 3 },
  { key: "cognitivo", label: "Cognitivo (6 itens, 6–30)", itens: 6 },
  { key: "social", label: "Social (10 itens, 10–50)", itens: 10 },
  { key: "emocional", label: "Emocional (3 itens, 3–15)", itens: 3 },
];

/**
 * PBC-40. Os tamanhos dos domínios seguem o instrumento original (social com
 * 10 itens e emocional com 3); o documento da cliente inverteu os dois — a
 * soma continua 40, então o erro só apareceria nos subescores.
 */
export function Pbc40({ onResult }: { onResult?: ResultFn }) {
  const [v, setV] = useState<Record<string, string>>({});
  const parts = PBC_DOMAINS.filter((d) => v[d.key]).map((d) => `${d.label.split(" (")[0]}: ${v[d.key]}`);
  const total = PBC_DOMAINS.reduce((a, d) => a + (num(v[d.key] ?? "") ?? 0), 0);
  const complete = PBC_DOMAINS.every((d) => num(v[d.key] ?? "") !== null);
  return (
    <ScaleCard title="PBC-40 (qualidade de vida na CBP)" badge={complete && <Badge>{total}/200</Badge>}>
      <p className="mb-3 text-xs text-muted-foreground">
        Cada item vale 1 a 5. Informe a soma de cada domínio; total possível 40–200.
      </p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {PBC_DOMAINS.map((d) => (
          <NField
            key={d.key}
            label={d.label}
            value={v[d.key] ?? ""}
            onChange={(val) => setV((s) => ({ ...s, [d.key]: val }))}
          />
        ))}
      </div>
      <AddBtn
        disabled={!parts.length}
        onClick={() =>
          parts.length && onResult?.(`PBC-40${complete ? ` (total ${total}/200)` : ""} — ${parts.join("; ")}`)
        }
      />
    </ScaleCard>
  );
}

/**
 * SCCS — Escore Simples de Queixas Colestáticas (entrou no protótipo no
 * export de 06/10/2026). Quatro itens dos últimos 7 dias, total 0–13.
 * Escore de sintomas para acompanhamento, não prognóstico.
 */
export function Sccs({ onResult }: { onResult?: ResultFn }) {
  const [itch, setItch] = useState<number | null>(null);
  const [fad, setFad] = useState<number | null>(null);
  const [dor, setDor] = useState<number | null>(null);
  const [febre, setFebre] = useState<number | null>(null);

  const done = [itch, fad, dor, febre].every((x) => x !== null);
  const total = done ? itch! + fad! + dor! + febre! : null;
  const interp =
    total === null
      ? ""
      : total === 0
        ? "sem queixas colestáticas relevantes"
        : total <= 3
          ? "carga sintomática leve"
          : total <= 7
            ? "carga sintomática moderada — considerar tratamento sintomático dirigido"
            : "carga sintomática intensa — avaliar terapia do prurido/fadiga e excluir complicação biliar";

  return (
    <ScaleCard title="SCCS — Escore Simples de Queixas Colestáticas" badge={total !== null && <Badge>{total}/13</Badge>}>
      <p className="mb-2 text-xs text-muted-foreground">
        Referente aos últimos 7 dias. Escore de sintomas (apoio clínico), não diagnóstico nem prognóstico isolado.
      </p>
      <div className="space-y-2">
        <Choice
          label="Prurido"
          value={itch}
          onChange={setItch}
          opts={[["Não 0", 0], ["Às vezes 1", 1], ["Diário 2", 2], ["Acorda/antipruriginoso 3", 3], ["Insuportável 4", 4]]}
        />
        <Choice
          label="Fadiga"
          value={fad}
          onChange={setFad}
          opts={[["Não 0", 0], ["Limita 1", 1], ["Precisa descansar 2", 2], ["Acamado >½ dia 3", 3], ["Acamado o dia todo 4", 4]]}
        />
        <Choice
          label="Dor abdominal em QSD"
          value={dor}
          onChange={setDor}
          opts={[["Não 0", 0], ["Às vezes 1", 1], ["Diária 2", 2], ["Acorda/analgésico 3", 3], ["Insuportável 4", 4]]}
        />
        <Choice label="Febre" value={febre} onChange={setFebre} opts={[["Não 0", 0], ["Sim 1", 1]]} />
      </div>
      {total !== null && <p className="mt-2 text-xs text-muted-foreground">{interp}.</p>}
      <AddBtn
        disabled={total === null}
        onClick={() =>
          total !== null &&
          onResult?.(
            `SCCS: ${total}/13 — ${interp} (prurido ${itch}, fadiga ${fad}, dor QSD ${dor}, febre ${febre})`,
          )
        }
      />
    </ScaleCard>
  );
}

/* ------------------------------------------------------------------ */
/* Fadiga e prurido                                                    */
/* ------------------------------------------------------------------ */

const FSS_ITEMS = [
  "Minha motivação é menor quando estou fadigado",
  "Exercício me causa fadiga",
  "Fico facilmente fadigado",
  "A fadiga interfere no meu desempenho físico",
  "A fadiga causa problemas frequentes",
  "A fadiga impede atividade física sustentada",
  "A fadiga interfere em certas funções e deveres",
  "A fadiga é um dos meus 3 sintomas mais incapacitantes",
  "A fadiga interfere no trabalho, família e vida social",
];

const LIKERT_7: [string, number][] = [1, 2, 3, 4, 5, 6, 7].map((n) => [String(n), n] as [string, number]);

export function Fss({ onResult }: { onResult?: ResultFn }) {
  const [v, setV] = useState<Record<number, number>>({});
  const filled = Object.keys(v).length;
  const avg = filled === FSS_ITEMS.length ? Object.values(v).reduce((a, b) => a + b, 0) / FSS_ITEMS.length : null;
  const interp = avg === null ? "" : avg >= 4 ? "fadiga clinicamente relevante" : "sem fadiga significativa";
  return (
    <ScaleCard title="FSS — Fatigue Severity Scale" badge={avg !== null && <Badge>{fmt(avg, 1)}</Badge>}>
      <div className="space-y-2">
        {FSS_ITEMS.map((q, i) => (
          <Choice
            key={i}
            label={`${i + 1}. ${q}`}
            value={v[i] ?? null}
            onChange={(val) => setV((s) => ({ ...s, [i]: val }))}
            opts={LIKERT_7}
          />
        ))}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        1 = discordo completamente, 7 = concordo completamente. Escore = média dos 9 itens; ≥4 indica fadiga.
      </p>
      <AddBtn disabled={avg === null} onClick={() => avg !== null && onResult?.(`FSS: ${fmt(avg, 1)} (${interp})`)} />
    </ScaleCard>
  );
}

const FSS5_ITEMS = [
  "Fico facilmente fadigado",
  "A fadiga interfere no meu desempenho físico",
  "A fadiga impede atividade física sustentada",
  "A fadiga é um dos meus 3 sintomas mais incapacitantes",
  "A fadiga interfere no trabalho, família e vida social",
];

/**
 * FSS-5. O documento da cliente descreve a versão curta como 5 itens com
 * média (e não os 4 itens somados que o protótipo trazia).
 */
export function Fss5({ onResult }: { onResult?: ResultFn }) {
  const [v, setV] = useState<Record<number, number>>({});
  const avg =
    Object.keys(v).length === FSS5_ITEMS.length
      ? Object.values(v).reduce((a, b) => a + b, 0) / FSS5_ITEMS.length
      : null;
  return (
    <ScaleCard title="FSS-5 — fadiga (versão curta)" badge={avg !== null && <Badge>{fmt(avg, 1)}</Badge>}>
      <div className="space-y-2">
        {FSS5_ITEMS.map((q, i) => (
          <Choice
            key={i}
            label={`${i + 1}. ${q}`}
            value={v[i] ?? null}
            onChange={(val) => setV((s) => ({ ...s, [i]: val }))}
            opts={LIKERT_7}
          />
        ))}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">Escore = média dos 5 itens (1–7).</p>
      <AddBtn disabled={avg === null} onClick={() => avg !== null && onResult?.(`FSS-5: ${fmt(avg, 1)}`)} />
    </ScaleCard>
  );
}

export function NrsFadiga({ onResult }: { onResult?: ResultFn }) {
  const [v, setV] = useState(0);
  const cat = v <= 3 ? "leve" : v <= 6 ? "moderada" : "intensa";
  return (
    <ScaleCard title="NRS — Fadiga">
      <Slider label="Intensidade da fadiga (0 = ausente, 10 = pior imaginável)" value={v} onChange={setV} />
      <p className="mt-2 text-xs text-muted-foreground">0–3 leve; 4–6 moderada; 7–10 intensa.</p>
      <AddBtn onClick={() => onResult?.(`Fadiga (NRS): ${v}/10 (${cat})`)} />
    </ScaleCard>
  );
}

const ITCH_ITEMS: { key: string; label: string; opts: [string, number][] }[] = [
  { key: "dur", label: "Duração (h/dia)", opts: [["<6h", 1], ["6–12h", 2], ["12–18h", 3], ["18–23h", 4], ["O dia todo", 5]] },
  { key: "deg", label: "Grau (intensidade)", opts: [["Ausente", 1], ["Leve", 2], ["Moderado", 3], ["Intenso", 4], ["Insuportável", 5]] },
  { key: "dir", label: "Evolução (vs. últimas 2 semanas)", opts: [["Resolveu", 1], ["Muito melhor", 2], ["Melhor", 3], ["Inalterado", 4], ["Pior", 5]] },
  {
    key: "dis",
    label: "Incapacidade — maior pontuação entre sono, lazer/social, tarefas domésticas e trabalho/escola",
    opts: [["Nunca afeta", 1], ["Raramente", 2], ["Ocasionalmente", 3], ["Frequentemente", 4], ["Sempre", 5]],
  },
];

/**
 * As 16 regiões do instrumento original, como no Lovable — a lista anterior
 * tinha 12 regiões inventadas e faixas de pontuação que não batiam com elas.
 */
const ITCH_DISTRIB = [
  "Cabeça/couro cabeludo", "Face", "Tórax", "Abdome", "Dorso superior", "Dorso inferior", "Nádegas", "Coxas",
  "Pernas", "Dorso dos pés", "Planta dos pés", "Palmas", "Dorso das mãos", "Antebraços", "Braços", "Virilha",
];

export function FiveDItch({ onResult }: { onResult?: ResultFn }) {
  const [v, setV] = useState<Record<string, number>>({});
  const [areas, setAreas] = useState<string[]>([]);
  // Distribuição: 0–2 regiões = 1; 3–5 = 2; 6–10 = 3; 11–13 = 4; 14–16 = 5.
  const n = areas.length;
  const distScore = n <= 2 ? 1 : n <= 5 ? 2 : n <= 10 ? 3 : n <= 13 ? 4 : 5;
  const filled = Object.keys(v).length === ITCH_ITEMS.length;
  const total = sum(v) + distScore;
  return (
    <ScaleCard title="5-D Itch (prurido)" badge={filled && <Badge>{total}/25</Badge>}>
      <div className="grid gap-3 sm:grid-cols-2">
        {ITCH_ITEMS.map((it) => (
          <Choice
            key={it.key}
            label={it.label}
            value={v[it.key] ?? null}
            onChange={(val) => setV((s) => ({ ...s, [it.key]: val }))}
            opts={it.opts}
          />
        ))}
      </div>
      <p className="mb-1 mt-3 text-xs font-medium text-muted-foreground">
        Distribuição — marque as regiões afetadas ({areas.length} → {distScore} ponto{distScore > 1 ? "s" : ""})
      </p>
      <div className="flex flex-wrap gap-1.5">
        {ITCH_DISTRIB.map((a) => {
          const on = areas.includes(a);
          return (
            <button
              key={a}
              type="button"
              onClick={() => setAreas((s) => (on ? s.filter((x) => x !== a) : [...s, a]))}
              className={`rounded-md border px-2 py-0.5 text-xs ${
                on ? "border-primary bg-primary/10 text-foreground" : "border-border text-muted-foreground"
              }`}
            >
              {a}
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">Mínimo 5, máximo 25 — refere-se às últimas 2 semanas.</p>
      <AddBtn disabled={!filled} onClick={() => filled && onResult?.(`5-D Itch: ${total}/25`)} />
    </ScaleCard>
  );
}

export function NrsPrurido({ onResult }: { onResult?: ResultFn }) {
  const [v, setV] = useState(0);
  return (
    <ScaleCard title="NRS — Prurido">
      <Slider label="Intensidade do prurido (0 = ausente, 10 = pior imaginável)" value={v} onChange={setV} />
      <p className="mt-2 text-xs text-muted-foreground">
        ≥4 moderado (tratar); ≥7 intenso. Redução ≥4 pontos = resposta clinicamente significativa.
      </p>
      <AddBtn onClick={() => onResult?.(`Prurido (NRS): ${v}/10`)} />
    </ScaleCard>
  );
}

export function VasPrurido({ onResult }: { onResult?: ResultFn }) {
  const [v, setV] = useState(0);
  return (
    <ScaleCard title="VAS — Prurido">
      <Slider label="Escala visual analógica (0–10)" value={v} onChange={setV} />
      <p className="mt-2 text-xs text-muted-foreground">≥4 indica prurido com impacto clínico.</p>
      <AddBtn onClick={() => onResult?.(`Prurido (VAS): ${v}/10`)} />
    </ScaleCard>
  );
}

/* ------------------------------------------------------------------ */
/* Consumo de álcool                                                   */
/* ------------------------------------------------------------------ */

/** AUDIT (versão MSD, 10 perguntas) e AUDIT-C (versão internacional, 3), como no Lovable. */
function AuditQuestionnaire({ short, onResult }: { short: boolean; onResult?: ResultFn }) {
  const items = short ? AUDIT_C_ITEMS : AUDIT_ITEMS;
  const [answers, setAnswers] = useState<(number | null)[]>(() => items.map(() => null));
  const [sex, setSex] = useState<"male" | "female" | null>(null);
  const r = short ? calculateAuditC(answers, sex) : calculateAudit(answers);
  const name = short ? "AUDIT-C" : "AUDIT";
  const max = short ? 12 : 40;
  // AUDIT-C: sem consumo no ano, as perguntas 2 e 3 não se aplicam.
  const noConsumption = short && answers[0] === 0;
  const pending = items.map((_, i) => (answers[i] === null ? i + 1 : null)).filter((i) => i !== null);
  return (
    <ScaleCard title={`${name} — rastreamento do consumo de álcool`} badge={r && <Badge>{r.total}/{max}</Badge>}>
      <p className="mb-3 text-xs text-muted-foreground">
        Últimos 12 meses.{" "}
        {short
          ? "Versão internacional: dose-padrão de cerca de 10 g de etanol; seis ou mais doses na mesma ocasião."
          : "Versão da referência MSD: a pergunta 3 considera cinco ou mais bebidas na mesma ocasião."}{" "}
        Triagem, não diagnóstico de dependência.
      </p>
      <div className="space-y-3">
        {short && !noConsumption && (
          <Choice
            label="Sexo (ponto de corte)"
            value={sex}
            onChange={setSex}
            opts={[["Mulher (≥3)", "female"], ["Homem (≥4)", "male"]]}
          />
        )}
        {items.map((item, index) =>
          noConsumption && index > 0 ? null : (
            <Choice
              key={index}
              label={`${index + 1}. ${item.question}`}
              value={answers[index]}
              onChange={(val) => setAnswers((s) => s.map((a, i) => (i === index ? val : a)))}
              opts={item.options.map(([text, value]) => [`${text} (${value})`, value] as const)}
              wrap
            />
          ),
        )}
      </div>
      {r ? (
        <p className="mt-3 text-xs font-medium text-foreground">
          {r.total}/{max} pontos — {r.category}.
        </p>
      ) : (
        <p className="mt-3 text-xs text-muted-foreground">
          Respostas pendentes: {pending.join(", ") || "sexo para interpretação do AUDIT-C"}.
        </p>
      )}
      <p className="mt-2 text-xs text-muted-foreground">
        <a
          href={short ? AUDIT_C_REFERENCE : AUDIT_REFERENCE}
          target="_blank"
          rel="noreferrer"
          className="text-primary underline"
        >
          Referência: {short ? "Tade Clinicagem / Bradley et al." : "Manual MSD"}
        </a>
      </p>
      <AddBtn
        disabled={!r}
        onClick={() =>
          r &&
          onResult?.(
            `${name}${short ? " (6 doses; versão internacional)" : " (MSD; 5 bebidas)"}: ${r.total}/${max} pontos — ${r.category}`,
          )
        }
      />
    </ScaleCard>
  );
}

export function Audit({ onResult }: { onResult?: ResultFn }) {
  return <AuditQuestionnaire short={false} onResult={onResult} />;
}

export function AuditC({ onResult }: { onResult?: ResultFn }) {
  return <AuditQuestionnaire short onResult={onResult} />;
}
