"use client";

import { useMemo, useState } from "react";
import { AddBtn, Badge, Choice, NField, ScaleCard, num, sum, type ResultFn } from "./primitives";
import {
  ISEE_COMPLICATIONS,
  ISEE_FIB_ENDO,
  ISEE_FIB_HISTO,
  ISEE_INFL_ENDO,
  ISEE_INFL_HISTO,
  ISEE_SYMPTOMS,
  calculateIsee,
} from "./scores";

/* ------------------------------------------------------------------ */
/* Hemorragia digestiva alta                                           */
/* ------------------------------------------------------------------ */

const FORREST_DESC: Record<string, string> = {
  Ia: "sangramento ativo em jato — ressangramento ~90%",
  Ib: "sangramento ativo em babação — ~30%",
  IIa: "vaso visível não sangrante — ~50%",
  IIb: "coágulo aderente — ~30%",
  IIc: "hematina — ~7%",
  III: "base limpa — ~3%",
};

export function Forrest({ onResult }: { onResult?: ResultFn }) {
  const [v, setV] = useState<string | null>(null);
  return (
    <ScaleCard title="Forrest (HDA não varicosa)" badge={v && <Badge>{v}</Badge>}>
      <Choice
        label="Achado endoscópico"
        value={v}
        onChange={setV}
        opts={[["Ia", "Ia"], ["Ib", "Ib"], ["IIa", "IIa"], ["IIb", "IIb"], ["IIc", "IIc"], ["III", "III"]]}
      />
      {v && <p className="mt-2 text-xs text-muted-foreground">{FORREST_DESC[v]}.</p>}
      <AddBtn disabled={!v} onClick={() => v && onResult?.(`Forrest ${v} — ${FORREST_DESC[v]}`)} />
    </ScaleCard>
  );
}

/**
 * Glasgow-Blatchford. Os cortes de ureia seguem o escore publicado
 * (6,5–8,0 / 8,0–10,0 / 10,0–25,0 / ≥25 mmol/L, aqui convertidos para mg/dL),
 * que é o que o documento de fórmulas da cliente traz. O protótipo Lovable
 * usava faixas que não correspondem a essa conversão.
 *
 * A hemoglobina é uma linha só, escolhida pelo sexo — no protótipo eram duas
 * linhas independentes, e preencher as duas somava os pontos duas vezes.
 */
const GB_UREIA: [string, number][] = [
  ["<18,2", 0],
  ["18,2–22,4", 2],
  ["22,4–28", 3],
  ["28–70", 4],
  ["≥70", 6],
];
const GB_HB_M: [string, number][] = [["≥13", 0], ["12–12,9", 1], ["10–11,9", 3], ["<10", 6]];
const GB_HB_F: [string, number][] = [["≥12", 0], ["10–11,9", 1], ["<10", 6]];

const GB_REST: { key: string; label: string; opts: [string, number][] }[] = [
  { key: "pas", label: "PAS (mmHg)", opts: [["≥110", 0], ["100–109", 1], ["90–99", 2], ["<90", 3]] },
  { key: "fc", label: "FC ≥ 100 bpm", opts: [["Não", 0], ["Sim", 1]] },
  { key: "mel", label: "Melena", opts: [["Não", 0], ["Sim", 1]] },
  { key: "sinc", label: "Síncope", opts: [["Não", 0], ["Sim", 2]] },
  { key: "hep", label: "Hepatopatia", opts: [["Não", 0], ["Sim", 2]] },
  { key: "card", label: "Insuficiência cardíaca", opts: [["Não", 0], ["Sim", 2]] },
];

export function Blatchford({ onResult }: { onResult?: ResultFn }) {
  const [sexo, setSexo] = useState<string | null>(null);
  const [ureia, setUreia] = useState<number | null>(null);
  const [hb, setHb] = useState<number | null>(null);
  const [v, setV] = useState<Record<string, number>>({});
  const total = (ureia ?? 0) + (hb ?? 0) + sum(v);
  const cat =
    total <= 1 ? "muito baixo risco — alta precoce possível" : total <= 6 ? "risco baixo a moderado" : "alto risco de intervenção";
  return (
    <ScaleCard title="Glasgow-Blatchford (HDA)" badge={<Badge>{total}/23</Badge>}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Choice label="Ureia (mg/dL)" value={ureia} onChange={setUreia} opts={GB_UREIA} />
        <Choice label="Sexo" value={sexo} onChange={(s) => { setSexo(s); setHb(null); }} opts={[["Masc.", "m"], ["Fem.", "f"]]} />
        {sexo && (
          <Choice
            label={`Hemoglobina (g/dL) — ${sexo === "m" ? "homem" : "mulher"}`}
            value={hb}
            onChange={setHb}
            opts={sexo === "m" ? GB_HB_M : GB_HB_F}
          />
        )}
        {GB_REST.map((it) => (
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
        {cat}. Avalia necessidade de intervenção, não mortalidade; aplicado antes da endoscopia.
      </p>
      <AddBtn onClick={() => onResult?.(`Glasgow-Blatchford: ${total}/23 (${cat})`)} />
    </ScaleCard>
  );
}

const ROCKALL: { key: string; label: string; opts: [string, number][] }[] = [
  { key: "idade", label: "Idade", opts: [["<60 anos", 0], ["60–79 anos", 1], ["≥80 anos", 2]] },
  { key: "choque", label: "Choque", opts: [["PAS ≥100 e FC <100", 0], ["PAS ≥100 e FC ≥100", 1], ["PAS <100", 2]] },
  { key: "comorb", label: "Comorbidades", opts: [["Nenhuma", 0], ["Cardiopatia isquêmica / IC", 2], ["Renal, hepática ou neoplasia disseminada", 3]] },
  { key: "dx", label: "Diagnóstico endoscópico", opts: [["Mallory-Weiss / sem lesão", 0], ["Outras lesões", 1], ["Neoplasia de TGI alto", 2]] },
  { key: "estig", label: "Estigmas de sangramento recente", opts: [["Nenhum ou hematina", 0], ["Sangue, coágulo aderido ou vaso visível", 2]] },
];

export function Rockall({ onResult }: { onResult?: ResultFn }) {
  const [v, setV] = useState<Record<string, number>>({});
  const total = sum(v);
  const cat = total <= 2 ? "baixo risco" : total <= 4 ? "risco intermediário" : "alto risco de ressangramento/óbito";
  return (
    <ScaleCard title="Rockall (HDA)" badge={<Badge>{total}/11</Badge>}>
      <div className="grid gap-3 sm:grid-cols-2">
        {ROCKALL.map((it) => (
          <Choice
            key={it.key}
            label={it.label}
            value={v[it.key] ?? null}
            onChange={(val) => setV((s) => ({ ...s, [it.key]: val }))}
            opts={it.opts}
          />
        ))}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{cat}. O escore completo exige achados endoscópicos.</p>
      <AddBtn onClick={() => onResult?.(`Rockall: ${total}/11 (${cat})`)} />
    </ScaleCard>
  );
}

const AIMS65: { key: string; label: string }[] = [
  { key: "alb", label: "Albumina < 3,0 g/dL" },
  { key: "inr", label: "INR > 1,5" },
  { key: "ams", label: "Alteração do estado mental" },
  { key: "sbp", label: "PAS ≤ 90 mmHg" },
  { key: "age", label: "Idade > 65 anos" },
];

export function Aims65({ onResult }: { onResult?: ResultFn }) {
  const [v, setV] = useState<Record<string, number>>({});
  const total = sum(v);
  const cat = total <= 1 ? "baixo risco" : total <= 2 ? "risco intermediário" : "alto risco";
  return (
    <ScaleCard title="AIMS65 (mortalidade na HDA)" badge={<Badge>{total}/5</Badge>}>
      <div className="grid gap-3 sm:grid-cols-2">
        {AIMS65.map((it) => (
          <Choice
            key={it.key}
            label={it.label}
            value={v[it.key] ?? null}
            onChange={(val) => setV((s) => ({ ...s, [it.key]: val }))}
            opts={[["Não", 0], ["Sim", 1]]}
          />
        ))}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{cat}. Prediz mortalidade, não ressangramento.</p>
      <AddBtn onClick={() => onResult?.(`AIMS65: ${total}/5 (${cat})`)} />
    </ScaleCard>
  );
}

/* ------------------------------------------------------------------ */
/* Esôfago                                                             */
/* ------------------------------------------------------------------ */

const ECKARDT: { key: string; label: string; opts: [string, number][] }[] = [
  { key: "peso", label: "Perda ponderal (kg)", opts: [["Nenhuma", 0], ["<5", 1], ["5–10", 2], [">10", 3]] },
  { key: "disf", label: "Disfagia", opts: [["Nunca", 0], ["Ocasional", 1], ["Diária", 2], ["A cada refeição", 3]] },
  { key: "dor", label: "Dor retroesternal", opts: [["Nunca", 0], ["Ocasional", 1], ["Diária", 2], ["A cada refeição", 3]] },
  { key: "reg", label: "Regurgitação", opts: [["Nunca", 0], ["Ocasional", 1], ["Diária", 2], ["A cada refeição", 3]] },
];

export function Eckardt({ onResult }: { onResult?: ResultFn }) {
  const [v, setV] = useState<Record<string, number>>({});
  const total = sum(v);
  const cat = total <= 3 ? "remissão (tratamento bem-sucedido)" : "falha ou recidiva — reavaliar";
  return (
    <ScaleCard title="Eckardt (acalasia)" badge={<Badge>{total}/12</Badge>}>
      <div className="grid gap-3 sm:grid-cols-2">
        {ECKARDT.map((it) => (
          <Choice
            key={it.key}
            label={it.label}
            value={v[it.key] ?? null}
            onChange={(val) => setV((s) => ({ ...s, [it.key]: val }))}
            opts={it.opts}
          />
        ))}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{cat}.</p>
      <AddBtn onClick={() => onResult?.(`Eckardt: ${total}/12 (${cat})`)} />
    </ScaleCard>
  );
}

const LA_DESC: Record<string, string> = {
  A: "≥1 erosão ≤5 mm, sem confluência",
  B: "≥1 erosão >5 mm, sem confluência entre pregas",
  C: "erosões confluentes entre 2 ou mais pregas, <75% da circunferência",
  D: "erosões em ≥75% da circunferência",
};

export function LosAngeles({ onResult }: { onResult?: ResultFn }) {
  const [v, setV] = useState<string | null>(null);
  return (
    <ScaleCard title="Los Angeles (esofagite)" badge={v && <Badge>{v}</Badge>}>
      <Choice label="Grau" value={v} onChange={setV} opts={[["A", "A"], ["B", "B"], ["C", "C"], ["D", "D"]]} />
      {v && <p className="mt-2 text-xs text-muted-foreground">{LA_DESC[v]}.</p>}
      <p className="mt-1 text-xs text-muted-foreground">Só avaliável com IBP suspenso 2–4 semanas antes da endoscopia.</p>
      <AddBtn disabled={!v} onClick={() => v && onResult?.(`Los Angeles ${v} — ${LA_DESC[v]}`)} />
    </ScaleCard>
  );
}

const CHICAGO_OPTS: [string, string][] = [
  ["Acalasia I", "Acalasia tipo I"],
  ["Acalasia II", "Acalasia tipo II"],
  ["Acalasia III", "Acalasia tipo III"],
  ["EGJOO", "Obstrução da junção esofagogástrica"],
  ["Espasmo distal", "Espasmo esofágico distal"],
  ["Hipercontrátil", "Esôfago hipercontrátil (jackhammer)"],
  ["Aperistalse", "Peristalse ausente"],
  ["IEM", "Motilidade esofágica inefetiva"],
  ["Normal", "Manometria normal"],
];

const iseeOpts = (o: readonly (readonly [string, number])[]) => o.map(([l, v]) => [`${l} (${v})`, v] as const);

export function Isee({ onResult }: { onResult?: ResultFn }) {
  const [symptoms, setSymptoms] = useState<number | null>(null);
  const [complications, setComplications] = useState<number[]>([]);
  const [inflEndo, setInflEndo] = useState<number | null>(null);
  const [inflHisto, setInflHisto] = useState<number | null>(null);
  const [fibEndo, setFibEndo] = useState<number | null>(null);
  const [fibHisto, setFibHisto] = useState<number | null>(null);
  const r =
    symptoms !== null && inflEndo !== null && inflHisto !== null && fibEndo !== null && fibHisto !== null
      ? calculateIsee({
          symptoms,
          complications: complications.map((i) => ISEE_COMPLICATIONS[i][1]),
          inflEndo,
          inflHisto,
          fibEndo,
          fibHisto,
        })
      : null;
  return (
    <ScaleCard title="I-SEE — Índice de Gravidade da Esofagite Eosinofílica" badge={r && <Badge>{r.total}</Badge>}>
      <div className="space-y-3">
        <Choice label="Sintomas (disfagia etc.)" value={symptoms} onChange={setSymptoms} opts={iseeOpts(ISEE_SYMPTOMS)} wrap />
        <div>
          <p className="mb-1 text-xs font-medium text-muted-foreground">Complicações (somar todas que se aplicam)</p>
          {ISEE_COMPLICATIONS.map(([label, points], i) => (
            <label key={label} className="flex items-start gap-2 text-xs">
              <input
                type="checkbox"
                className="mt-0.5 h-3.5 w-3.5 accent-primary"
                checked={complications.includes(i)}
                onChange={(e) =>
                  setComplications((c) => (e.target.checked ? [...c, i] : c.filter((x) => x !== i)))
                }
              />
              {label} ({points})
            </label>
          ))}
        </div>
        <Choice label="Inflamação — endoscopia (edema, sulcos, exsudatos)" value={inflEndo} onChange={setInflEndo} opts={iseeOpts(ISEE_INFL_ENDO)} wrap />
        <Choice label="Inflamação — histologia (pico de eosinófilos)" value={inflHisto} onChange={setInflHisto} opts={iseeOpts(ISEE_INFL_HISTO)} wrap />
        <Choice label="Fibroestenose — endoscopia (anéis, estenoses)" value={fibEndo} onChange={setFibEndo} opts={iseeOpts(ISEE_FIB_ENDO)} wrap />
        <Choice label="Fibroestenose — histologia" value={fibHisto} onChange={setFibHisto} opts={iseeOpts(ISEE_FIB_HISTO)} wrap />
      </div>
      {r ? (
        <p className="mt-2 text-xs font-semibold">
          I-SEE {r.total} pontos — doença {r.category}. (inativa &lt;1; leve 1–6; moderada 7–14; grave ≥15)
        </p>
      ) : (
        <p className="mt-2 text-xs text-muted-foreground">Preencha todos os domínios.</p>
      )}
      <AddBtn disabled={!r} onClick={() => r && onResult?.(`I-SEE: ${r.total} pontos — EoE ${r.category}.`)} />
    </ScaleCard>
  );
}

export function Chicago({ onResult }: { onResult?: ResultFn }) {
  const [v, setV] = useState<string | null>(null);
  return (
    <ScaleCard title="Classificação de Chicago v4" badge={v && <Badge>{v}</Badge>}>
      <Choice label="Diagnóstico manométrico" value={v} onChange={setV} opts={CHICAGO_OPTS} />
      <p className="mt-2 text-xs text-muted-foreground">
        Requer manometria de alta resolução com protocolo completo (deglutições múltiplas rápidas / sobrecarga).
      </p>
      <AddBtn disabled={!v} onClick={() => v && onResult?.(`Chicago v4: ${v}`)} />
    </ScaleCard>
  );
}

/* ------------------------------------------------------------------ */
/* Intestino — sintomas                                                */
/* ------------------------------------------------------------------ */

const BRISTOL_DESC = [
  "",
  "Caroços duros separados",
  "Cilíndrico, em pedaços",
  "Cilíndrico com rachaduras",
  "Cilíndrico liso e macio",
  "Pedaços moles com bordas nítidas",
  "Pastosas / fragmentadas",
  "Líquida, sem pedaços sólidos",
];

export function Bristol({ onResult }: { onResult?: ResultFn }) {
  const [v, setV] = useState<number | null>(null);
  return (
    <ScaleCard title="Escala de Bristol" badge={v !== null && <Badge>Tipo {v}</Badge>}>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[1, 2, 3, 4, 5, 6, 7].map((n) => {
          const active = v === n;
          return (
            <button
              key={n}
              type="button"
              onClick={() => setV(n)}
              className={`flex flex-col gap-0.5 rounded-lg border p-2 text-left transition-colors ${
                active ? "border-primary bg-primary/10" : "border-border hover:bg-muted"
              }`}
            >
              <span className="text-[11px] font-semibold text-foreground">Tipo {n}</span>
              <span className="text-[10px] leading-tight text-muted-foreground">{BRISTOL_DESC[n]}</span>
            </button>
          );
        })}
      </div>
      {v !== null && (
        <p className="mt-2 text-xs text-muted-foreground">
          {BRISTOL_DESC[v]} — {v <= 2 ? "constipação" : v >= 6 ? "diarreia" : "normal"}. Registre o padrão habitual, não
          uma única evacuação.
        </p>
      )}
      <AddBtn disabled={v === null} onClick={() => v !== null && onResult?.(`Bristol: tipo ${v} (${BRISTOL_DESC[v]})`)} />
    </ScaleCard>
  );
}

const ROME4: { key: string; label: string }[] = [
  { key: "freq", label: "Dor abdominal ≥1 dia/semana nos últimos 3 meses" },
  { key: "evac", label: "Relacionada à defecação" },
  { key: "freqMud", label: "Associada a mudança na frequência das evacuações" },
  { key: "formaMud", label: "Associada a mudança na forma das fezes" },
];

export function RomeIv({ onResult }: { onResult?: ResultFn }) {
  const [v, setV] = useState<Record<string, number>>({});
  const yes = Object.values(v).filter((x) => x === 1).length;
  // O critério exige a dor (obrigatória) + pelo menos 2 das 3 características.
  const ok = v.freq === 1 && yes >= 3;
  return (
    <ScaleCard title="Rome IV — SII" badge={ok && <Badge>Critérios preenchidos</Badge>}>
      <div className="grid gap-3 sm:grid-cols-2">
        {ROME4.map((it) => (
          <Choice
            key={it.key}
            label={it.label}
            value={v[it.key] ?? null}
            onChange={(val) => setV((s) => ({ ...s, [it.key]: val }))}
            opts={[["Não", 0], ["Sim", 1]]}
          />
        ))}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        {ok ? "Preenche critérios para SII." : "Não preenche."} Início dos sintomas há ≥6 meses e ausência de sinais de
        alarme.
      </p>
      <AddBtn onClick={() => onResult?.(`Rome IV (SII): ${ok ? "critérios preenchidos" : "critérios não preenchidos"}`)} />
    </ScaleCard>
  );
}

/**
 * Rome V: uma calculadora por diagnóstico, como no Lovable (antes era um
 * "Rome V (DGBI)" só, com critérios genéricos para qualquer diagnóstico).
 * Cada uma tem critérios obrigatórios, um bloco "≥ N de" quando o
 * diagnóstico pede, e o subtipo quando existe.
 */
type R5Item = { key: string; label: string };
type R5Rule = {
  title: string;
  nome: string;
  nota?: string;
  obrig: R5Item[];
  assoc?: { label: string; min: number; itens: R5Item[] };
  subtipo?: { label: string; opts: [string, string][] };
};

function RomeVBase({ cfg, onResult }: { cfg: R5Rule; onResult?: ResultFn }) {
  const [v, setV] = useState<Record<string, number>>({});
  const [sub, setSub] = useState<string | null>(null);
  const yn = (it: R5Item) => (
    <Choice
      key={it.key}
      label={it.label}
      value={v[it.key] ?? null}
      onChange={(val) => setV((s) => ({ ...s, [it.key]: val }))}
      opts={[["Não", 0], ["Sim", 1]]}
    />
  );
  const obrigOk = cfg.obrig.every((i) => v[i.key] === 1);
  const nAssoc = cfg.assoc ? cfg.assoc.itens.filter((i) => v[i.key] === 1).length : 0;
  const assocOk = !cfg.assoc || nAssoc >= cfg.assoc.min;
  const ok = obrigOk && assocOk && (!cfg.subtipo || sub !== null);
  const subNome = cfg.subtipo?.opts.find(([, id]) => id === sub)?.[0];
  const txt = ok ? `critérios preenchidos${subNome ? ` — ${subNome}` : ""}` : "critérios não preenchidos";
  return (
    <ScaleCard title={cfg.title} badge={ok && <Badge>Critérios preenchidos</Badge>}>
      {cfg.nota && <p className="mb-3 text-xs text-muted-foreground">{cfg.nota}</p>}
      <div className="grid gap-3 sm:grid-cols-2">{cfg.obrig.map(yn)}</div>
      {cfg.assoc && (
        <>
          <p className="mb-1 mt-3 text-xs font-semibold text-foreground">
            {cfg.assoc.label} ({nAssoc}/{cfg.assoc.min})
          </p>
          <div className="grid gap-3 sm:grid-cols-2">{cfg.assoc.itens.map(yn)}</div>
        </>
      )}
      {cfg.subtipo && (
        <div className="mt-3">
          <Choice label={cfg.subtipo.label} value={sub} onChange={setSub} opts={cfg.subtipo.opts} wrap />
        </div>
      )}
      <p className="mt-2 text-xs text-muted-foreground">
        {ok ? `Preenche critérios Rome V para ${cfg.nome}.` : "Não preenche."}
      </p>
      <AddBtn onClick={() => onResult?.(`Rome V (${cfg.nome}): ${txt}`)} />
    </ScaleCard>
  );
}

const CRON: R5Item = { key: "cron", label: "Início há ≥ 6 meses, critérios presentes nos últimos 3 meses" };
const ORG: R5Item = { key: "org", label: "Sem doença estrutural/orgânica que explique (alarmes investigados)" };

const R5_SII: R5Rule = {
  title: "Rome V — Síndrome do intestino irritável",
  nome: "SII",
  nota: "Rome V reintroduz o desconforto junto à dor e exige que não seja contínua.",
  obrig: [
    { key: "dor", label: "Dor ou desconforto abdominal recorrente, não contínuo, em média ≥ 3 dias/mês nos últimos 3 meses" },
    { key: "menst", label: "Sintomas não relacionados exclusivamente à menstruação" },
    CRON,
    ORG,
  ],
  assoc: {
    label: "Associado a ≥ 1 de",
    min: 1,
    itens: [
      { key: "def", label: "Relacionado à defecação" },
      { key: "freq", label: "Mudança na frequência das fezes" },
      { key: "forma", label: "Mudança na forma (aparência) das fezes" },
    ],
  },
  subtipo: {
    label: "Subtipo (Bristol nos dias com evacuação anormal)",
    opts: [
      ["SII-C (>25% tipo 1–2 e <25% tipo 6–7)", "C"],
      ["SII-D (>25% tipo 6–7 e <25% tipo 1–2)", "D"],
      ["SII-M (>25% tipo 1–2 e >25% tipo 6–7)", "M"],
      ["SII-U (não classificável)", "U"],
    ],
  },
};

const R5_DF: R5Rule = {
  title: "Rome V — Dispepsia funcional",
  nome: "dispepsia funcional",
  nota: "Requer ≥1 sintoma incômodo; subtipos SDP e SDE podem coexistir. EDA sem lesão que explique.",
  obrig: [CRON, { key: "eda", label: "Sem doença estrutural (incluindo EDA) que explique os sintomas" }],
  assoc: {
    label: "≥ 1 sintoma incômodo",
    min: 1,
    itens: [
      { key: "plen", label: "Plenitude pós-prandial incômoda (≥ 3 dias/semana)" },
      { key: "sac", label: "Saciedade precoce incômoda (≥ 3 dias/semana)" },
      { key: "dorep", label: "Dor epigástrica incômoda (≥ 1 dia/semana)" },
      { key: "queim", label: "Queimação epigástrica incômoda (≥ 1 dia/semana)" },
    ],
  },
  subtipo: {
    label: "Subtipo predominante",
    opts: [
      ["SDP — desconforto pós-prandial", "SDP"],
      ["SDE — dor epigástrica", "SDE"],
      ["Sobreposição SDP + SDE", "SDP+SDE"],
    ],
  },
};

const R5_CONST: R5Rule = {
  title: "Rome V — Constipação crônica",
  nome: "constipação crônica",
  obrig: [
    CRON,
    { key: "semsii", label: "Não preenche critérios de SII" },
    { key: "raro", label: "Fezes amolecidas raras sem laxantes" },
    ORG,
  ],
  assoc: {
    label: "≥ 2 de (em >25% das evacuações)",
    min: 2,
    itens: [
      { key: "esf", label: "Esforço evacuatório" },
      { key: "end", label: "Fezes endurecidas (Bristol 1–2)" },
      { key: "inc", label: "Sensação de evacuação incompleta" },
      { key: "obs", label: "Sensação de obstrução anorretal" },
      { key: "man", label: "Manobras manuais para evacuar" },
      { key: "lt3", label: "< 3 evacuações espontâneas/semana" },
    ],
  },
};

const R5_DIAR: R5Rule = {
  title: "Rome V — Diarreia funcional",
  nome: "diarreia funcional",
  obrig: [
    { key: "liq", label: "Fezes amolecidas/aquosas (Bristol 6–7) em > 25% das evacuações" },
    { key: "semdor", label: "Sem dor/desconforto abdominal predominante (não SII-D)" },
    CRON,
    ORG,
  ],
};

const R5_DIST: R5Rule = {
  title: "Rome V — Distensão/inchaço abdominal funcional",
  nome: "distensão/inchaço abdominal funcional",
  obrig: [
    { key: "dist", label: "Inchaço e/ou distensão recorrente, em média ≥ 1 dia/semana, predominante sobre outros sintomas" },
    { key: "outros", label: "Não preenche critérios de SII, constipação, diarreia ou SDP" },
    CRON,
    ORG,
  ],
};

export const RomeVSii = ({ onResult }: { onResult?: ResultFn }) => <RomeVBase cfg={R5_SII} onResult={onResult} />;
export const RomeVDispepsia = ({ onResult }: { onResult?: ResultFn }) => <RomeVBase cfg={R5_DF} onResult={onResult} />;
export const RomeVConstipacao = ({ onResult }: { onResult?: ResultFn }) => <RomeVBase cfg={R5_CONST} onResult={onResult} />;
export const RomeVDiarreia = ({ onResult }: { onResult?: ResultFn }) => <RomeVBase cfg={R5_DIAR} onResult={onResult} />;
export const RomeVDistensao = ({ onResult }: { onResult?: ResultFn }) => <RomeVBase cfg={R5_DIST} onResult={onResult} />;

const IBS_SSS: { key: string; label: string }[] = [
  { key: "intDor", label: "Intensidade da dor (0–100)" },
  { key: "diasDor", label: "Dias com dor em 10 dias (× 10)" },
  { key: "distAbd", label: "Distensão abdominal (0–100)" },
  { key: "satEvac", label: "Insatisfação com o hábito intestinal (0–100)" },
  { key: "qv", label: "Interferência na vida (0–100)" },
];

export function IbsSss({ onResult }: { onResult?: ResultFn }) {
  const [v, setV] = useState<Record<string, string>>({});
  const parsed = IBS_SSS.map((it) => num(v[it.key] ?? ""));
  const ok = parsed.every((x) => x !== null);
  const total = ok ? (parsed as number[]).reduce((a, b) => a + b, 0) : null;
  const cat =
    total === null ? "" : total < 75 ? "remissão" : total < 175 ? "leve" : total < 300 ? "moderada" : "grave";
  return (
    <ScaleCard title="IBS-SSS" badge={total !== null && <Badge>{total}/500</Badge>}>
      <div className="grid gap-3 sm:grid-cols-2">
        {IBS_SSS.map((it) => (
          <NField
            key={it.key}
            label={it.label}
            value={v[it.key] ?? ""}
            onChange={(val) => setV((s) => ({ ...s, [it.key]: val }))}
          />
        ))}
      </div>
      {total !== null && (
        <p className="mt-2 text-xs text-muted-foreground">
          {cat}. Referente aos últimos 10 dias; queda de 50 pontos indica resposta.
        </p>
      )}
      <AddBtn disabled={total === null} onClick={() => total !== null && onResult?.(`IBS-SSS: ${total}/500 (${cat})`)} />
    </ScaleCard>
  );
}
