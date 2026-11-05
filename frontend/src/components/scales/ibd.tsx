"use client";

import { useMemo, useState } from "react";
import { AddBtn, Badge, Choice, ComplicationChecklist, NField, ScaleCard, fmt, num, sum, type ResultFn } from "./primitives";
import {
  CDAI_COMPLICATIONS,
  HBI_COMPLICATIONS,
  MAYO_ITEMS,
  MAYO_REFERENCE,
  calculateCdai,
  calculateHbi,
  calculateMayo,
  clinicalNumber,
  type ClinicalSex,
} from "./scores";

/* ------------------------------------------------------------------ */
/* Retocolite ulcerativa                                               */
/* ------------------------------------------------------------------ */

const MAYO_P: { key: string; label: string; opts: [string, number][] }[] = [
  { key: "freq", label: "Frequência evacuatória", opts: [["Normal", 0], ["1–2 acima", 1], ["3–4 acima", 2], ["≥5 acima", 3]] },
  { key: "sang", label: "Sangramento retal", opts: [["Ausente", 0], ["Traços", 1], ["Evidente", 2], ["Só sangue", 3]] },
  { key: "med", label: "Avaliação global do médico", opts: [["Normal", 0], ["Leve", 1], ["Moderada", 2], ["Grave", 3]] },
];

export function MayoParcial({ onResult }: { onResult?: ResultFn }) {
  const [v, setV] = useState<Record<string, number>>({});
  const filled = Object.keys(v).length === MAYO_P.length;
  const total = sum(v);
  const cat = !filled ? "" : total <= 1 ? "remissão" : total <= 3 ? "leve" : total <= 6 ? "moderada" : "grave";
  return (
    <ScaleCard title="Mayo parcial (RCU)" badge={filled && <Badge>{total}/9</Badge>}>
      <div className="grid gap-3 sm:grid-cols-2">
        {MAYO_P.map((it) => (
          <Choice
            key={it.key}
            label={it.label}
            value={v[it.key] ?? null}
            onChange={(val) => setV((s) => ({ ...s, [it.key]: val }))}
            opts={it.opts}
          />
        ))}
      </div>
      {filled && (
        <p className="mt-2 text-xs text-muted-foreground">
          Atividade {cat}. Queda ≥2 pontos = resposta clínica; não avalia endoscopia.
        </p>
      )}
      <AddBtn disabled={!filled} onClick={() => filled && onResult?.(`Mayo parcial (RCU): ${total}/9 (${cat})`)} />
    </ScaleCard>
  );
}

const MAYO_OPTS: [string, number][] = [["0", 0], ["1", 1], ["2", 2], ["3", 3]];

/**
 * Mayo completo como no Lovable: cada subescore com a descrição do que ele
 * significa, e remissão só com total ≤2 sem nenhum subescore acima de 1.
 */
export function MayoUc({ onResult }: { onResult?: ResultFn }) {
  const [v, setV] = useState<Record<string, number>>({});
  const r = calculateMayo(v);
  return (
    <ScaleCard title="Mayo completo (RCU)" badge={r && <Badge>{r.total}/12</Badge>}>
      <div className="grid gap-3 sm:grid-cols-2">
        {MAYO_ITEMS.map((item) => (
          <div key={item.key}>
            <Choice
              label={item.label}
              value={v[item.key] ?? null}
              onChange={(val) => setV((s) => ({ ...s, [item.key]: val }))}
              opts={item.options.map((text, score) => [`${score} — ${text}`, score] as const)}
              wrap
            />
            {item.key === "sang" && (
              <p className="mt-1 text-[11px] text-muted-foreground">
                Para 3 pontos: sangue visível em ≥50% das evacuações e pelo menos uma evacuação somente com sangue.
              </p>
            )}
          </div>
        ))}
      </div>
      {r && (
        <p className="mt-2 text-xs text-muted-foreground">
          Mayo completo: {r.total}/12 — {r.category}.
        </p>
      )}
      <p className="mt-1 text-xs text-muted-foreground">
        Não prediz isoladamente necessidade de internação ou cirurgia.{" "}
        <a href={MAYO_REFERENCE} target="_blank" rel="noreferrer" className="text-primary underline">
          Referência: MDCalc — Mayo/DAI
        </a>
      </p>
      <AddBtn
        disabled={!r}
        onClick={() =>
          r &&
          onResult?.(
            `Mayo completo (RCU): ${r.total}/12 (${r.category}); frequência ${v.freq}/3, sangramento ${v.sang}/3, endoscopia ${v.endo}/3, avaliação médica ${v.pga}/3`,
          )
        }
      />
    </ScaleCard>
  );
}

const MAYO_ENDO_DESC: Record<number, string> = {
  0: "mucosa normal / doença inativa",
  1: "eritema, padrão vascular diminuído, friabilidade discreta",
  2: "eritema acentuado, ausência de padrão vascular, friabilidade, erosões",
  3: "ulcerações e sangramento espontâneo",
};

export function MayoEndo({ onResult }: { onResult?: ResultFn }) {
  const [v, setV] = useState<number | null>(null);
  return (
    <ScaleCard title="Mayo endoscópico (RCU)" badge={v !== null && <Badge>{v}/3</Badge>}>
      <Choice label="Subescore endoscópico" value={v} onChange={setV} opts={MAYO_OPTS} />
      {v !== null && (
        <p className="mt-2 text-xs text-muted-foreground">
          {MAYO_ENDO_DESC[v]}. {v <= 1 ? "Cicatrização mucosa (alvo do STRIDE-II)." : "Doença endoscopicamente ativa."}
        </p>
      )}
      <p className="mt-1 text-xs text-muted-foreground">Friabilidade isolada já classifica como subescore 1.</p>
      <AddBtn disabled={v === null} onClick={() => v !== null && onResult?.(`Mayo endoscópico: ${v}/3 — ${MAYO_ENDO_DESC[v]}`)} />
    </ScaleCard>
  );
}

const TW: { key: string; label: string; opts: [string, number][] }[] = [
  { key: "evac", label: "Evacuações sanguinolentas/dia", opts: [["<4", 0], ["4–6", 1], [">6", 2]] },
  { key: "sang", label: "Sangue nas fezes", opts: [["Pequeno/ausente", 0], ["Médio", 1], ["Grande", 2]] },
  { key: "fc", label: "Frequência cardíaca", opts: [["≤90", 0], [">90", 2]] },
  { key: "tax", label: "Temperatura", opts: [["≤37,8 °C", 0], [">37,8 °C", 2]] },
  { key: "hb", label: "Hemoglobina", opts: [["≥10,5", 0], ["<10,5", 2]] },
  { key: "vhs", label: "VHS", opts: [["≤30", 0], [">30", 2]] },
];

export function TrueloveWitts({ onResult }: { onResult?: ResultFn }) {
  const [v, setV] = useState<Record<string, number>>({});
  const total = sum(v);
  const sistemico = v.fc === 2 || v.tax === 2 || v.hb === 2 || v.vhs === 2;
  let cat = "leve";
  if (v.evac === 2 && (v.sang === 2 || sistemico)) cat = "grave";
  else if (total >= 3) cat = "moderada";
  return (
    <ScaleCard title="Truelove & Witts (RCU)" badge={<Badge>{cat}</Badge>}>
      <div className="grid gap-3 sm:grid-cols-2">
        {TW.map((it) => (
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
        Colite grave → internar e iniciar corticoide EV; reavaliar no 3º dia (critérios de Oxford).
      </p>
      <AddBtn onClick={() => onResult?.(`Truelove & Witts: colite ${cat}`)} />
    </ScaleCard>
  );
}

/* ------------------------------------------------------------------ */
/* Doença de Crohn                                                     */
/* ------------------------------------------------------------------ */

/**
 * CDAI como no Lovable (Best et al.): sexo, hematócrito e pesos digitados
 * em vez das diferenças já calculadas, complicações marcadas na lista, e dor
 * e bem-estar como média diária ou soma dos 7 dias — as duas formas dão o
 * mesmo resultado. A conta está em `scores.ts`.
 */
export function CdaiCrohn({ onResult }: { onResult?: ResultFn }) {
  const [v, setV] = useState<Record<string, string>>({});
  const [sex, setSex] = useState<ClinicalSex | null>(null);
  const [anti, setAnti] = useState<number | null>(null);
  const [mass, setMass] = useState<number | null>(null);
  const [complications, setComplications] = useState<string[]>([]);
  const [inputMode, setInputMode] = useState<"media" | "soma">("media");
  const divisor = inputMode === "soma" ? 7 : 1;
  const rawPain = clinicalNumber(v.pain ?? "");
  const rawWellbeing = clinicalNumber(v.wellbeing ?? "");
  const r =
    complications.length === 0
      ? null
      : calculateCdai({
          stools: clinicalNumber(v.stools ?? ""),
          pain: rawPain === null ? null : rawPain / divisor,
          wellbeing: rawWellbeing === null ? null : rawWellbeing / divisor,
          hematocrit: clinicalNumber(v.hematocrit ?? ""),
          weight: clinicalNumber(v.weight ?? ""),
          idealWeight: clinicalNumber(v.idealWeight ?? ""),
          sex,
          antidiarrheal: anti,
          mass,
          complications: complications.filter((c) => c !== "none").length,
        });
  const fields = [
    { key: "stools", label: "Total de fezes líquidas / semiformadas nos últimos 7 dias" },
    inputMode === "media"
      ? { key: "pain", label: "Dor: média diária em 7 dias (0 ausente; 1 leve; 2 moderada; 3 intensa)" }
      : { key: "pain", label: "Dor: soma dos escores diários em 7 dias (0–21)" },
    inputMode === "media"
      ? { key: "wellbeing", label: "Bem-estar: média diária em 7 dias (0 bem; 1 pouco abaixo; 2 mal; 3 muito mal; 4 terrível)" }
      : { key: "wellbeing", label: "Bem-estar: soma dos escores diários em 7 dias (0–28)" },
    { key: "hematocrit", label: "Hematócrito (%)" },
    { key: "weight", label: "Peso atual (kg)" },
    { key: "idealWeight", label: "Peso ideal de referência (kg)" },
  ];
  return (
    <ScaleCard title="CDAI (Crohn)" badge={r && <Badge>{fmt(r.total, 1)}</Badge>}>
      <div className="space-y-3">
        <Choice
          label="Como informar dor e bem-estar"
          value={inputMode}
          onChange={setInputMode}
          opts={[["Média diária", "media"], ["Soma dos 7 dias (artigo original)", "soma"]]}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <Choice label="Sexo" value={sex} onChange={setSex} opts={[["Masculino", "male"], ["Feminino", "female"]]} />
          {fields.map((f) => (
            <NField
              key={f.key + inputMode}
              label={f.label}
              value={v[f.key] ?? ""}
              onChange={(val) => setV((s) => ({ ...s, [f.key]: val }))}
            />
          ))}
          <Choice
            label="Uso de antidiarreico (difenoxilato / opiáceos)"
            value={anti}
            onChange={setAnti}
            opts={[["Não", 0], ["Sim", 1]]}
          />
          <Choice
            label="Massa abdominal"
            value={mass}
            onChange={setMass}
            opts={[["Ausente", 0], ["Duvidosa", 2], ["Definida", 5]]}
          />
        </div>
      </div>
      <ComplicationChecklist options={CDAI_COMPLICATIONS} selected={complications} onChange={setComplications} />
      {r && (
        <p className="mt-3 text-xs text-muted-foreground">
          Atividade {r.category}. Diferença de hematócrito: {fmt(r.hematocritDifference, 1)} (referência:{" "}
          {sex === "male" ? 47 : 42}%). Variação do peso: {fmt(r.weightDifference, 1)}%.
        </p>
      )}
      <p className="mt-2 text-xs text-muted-foreground">
        <a
          href="https://pmc.ncbi.nlm.nih.gov/articles/PMC2725371/"
          target="_blank"
          rel="noreferrer"
          className="text-primary underline"
        >
          Referência: Best et al. — coeficientes originais do CDAI
        </a>
        . Calculadoras on-line divergem porque algumas pedem a média diária e outras a soma de 7 dias para dor e
        bem-estar; aqui as duas formas dão o mesmo resultado.
      </p>
      <AddBtn disabled={!r} onClick={() => r && onResult?.(`CDAI: ${fmt(r.total, 1)} (${r.category})`)} />
    </ScaleCard>
  );
}

/** Harvey-Bradshaw como no Lovable: sintomas do dia anterior e um ponto por complicação marcada. */
export function Harvey({ onResult }: { onResult?: ResultFn }) {
  const [v, setV] = useState<Record<string, number>>({});
  const [stools, setStools] = useState("");
  const [complications, setComplications] = useState<string[]>([]);
  const marked = complications.filter((c) => c !== "none");
  const r =
    complications.length === 0
      ? null
      : calculateHbi({
          wellbeing: v.wellbeing ?? null,
          pain: v.pain ?? null,
          mass: v.mass ?? null,
          stools: clinicalNumber(stools),
          complications: marked.length,
        });
  const set = (key: string) => (val: number) => setV((s) => ({ ...s, [key]: val }));
  return (
    <ScaleCard title="Harvey-Bradshaw (Crohn)" badge={r && <Badge>{r.total}</Badge>}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Choice
          label="Bem-estar geral no dia anterior"
          value={v.wellbeing ?? null}
          onChange={set("wellbeing")}
          opts={[["Muito bem (0)", 0], ["Pouco abaixo do habitual (1)", 1], ["Mal (2)", 2], ["Muito mal (3)", 3], ["Terrível (4)", 4]]}
          wrap
        />
        <Choice
          label="Dor abdominal no dia anterior"
          value={v.pain ?? null}
          onChange={set("pain")}
          opts={[["Ausente (0)", 0], ["Leve (1)", 1], ["Moderada (2)", 2], ["Intensa (3)", 3]]}
        />
        <Choice
          label="Massa abdominal"
          value={v.mass ?? null}
          onChange={set("mass")}
          opts={[["Ausente (0)", 0], ["Duvidosa (1)", 1], ["Definida (2)", 2], ["Definida e dolorosa (3)", 3]]}
          wrap
        />
        <NField label="Fezes líquidas / semiformadas no dia anterior" value={stools} onChange={setStools} />
      </div>
      <ComplicationChecklist options={HBI_COMPLICATIONS} selected={complications} onChange={setComplications} />
      {r && (
        <p className="mt-3 text-xs text-muted-foreground">
          Atividade {r.category}. Complicações: {marked.length} ponto(s).
        </p>
      )}
      <p className="mt-2 text-xs text-muted-foreground">
        <a
          href="https://www.mdcalc.com/calc/10069/harvey-bradshaw-index-hbi-crohns-disease"
          target="_blank"
          rel="noreferrer"
          className="text-primary underline"
        >
          Referência: MDCalc — Harvey-Bradshaw
        </a>
      </p>
      <AddBtn
        disabled={!r}
        onClick={() =>
          r &&
          onResult?.(`Harvey-Bradshaw: ${r.total} (${r.category}); complicações: ${marked.join(", ") || "nenhuma"}`)
        }
      />
    </ScaleCard>
  );
}

export function Montreal({ onResult }: { onResult?: ResultFn }) {
  const [doenca, setDoenca] = useState<string | null>(null);
  const [v, setV] = useState<Record<string, string>>({});
  const set = (k: string) => (val: string) => setV((s) => ({ ...s, [k]: val }));
  const txt =
    doenca === "CD"
      ? [v.a, v.l, v.b, v.p].filter((x) => x && x !== "—").join(" ")
      : [v.e, v.s].filter(Boolean).join(" ");
  return (
    <ScaleCard title="Montreal — classificação da DII" badge={txt ? <Badge>{txt}</Badge> : undefined}>
      <Choice
        label="Doença"
        value={doenca}
        onChange={(t) => {
          setDoenca(t);
          setV({});
        }}
        opts={[["Doença de Crohn", "CD"], ["Retocolite ulcerativa", "UC"]]}
      />
      {doenca === "CD" && (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Choice label="Idade ao diagnóstico (A)" value={v.a ?? null} onChange={set("a")} opts={[["A1 <17a", "A1"], ["A2 17–40a", "A2"], ["A3 >40a", "A3"]]} />
          <Choice label="Localização (L)" value={v.l ?? null} onChange={set("l")} opts={[["L1 ileal", "L1"], ["L2 cólon", "L2"], ["L3 ileocólica", "L3"], ["L4 TGI alto", "L4"]]} />
          <Choice label="Comportamento (B)" value={v.b ?? null} onChange={set("b")} opts={[["B1 inflamatório", "B1"], ["B2 estenosante", "B2"], ["B3 penetrante", "B3"]]} />
          <Choice label="Doença perianal" value={v.p ?? null} onChange={set("p")} opts={[["Ausente", "—"], ["Presente (p)", "p"]]} />
        </div>
      )}
      {doenca === "UC" && (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Choice label="Extensão (E)" value={v.e ?? null} onChange={set("e")} opts={[["E1 proctite", "E1"], ["E2 esquerda", "E2"], ["E3 extensa", "E3"]]} />
          <Choice label="Gravidade (S)" value={v.s ?? null} onChange={set("s")} opts={[["S0 remissão", "S0"], ["S1 leve", "S1"], ["S2 moderada", "S2"], ["S3 grave", "S3"]]} />
        </div>
      )}
      <p className="mt-2 text-xs text-muted-foreground">Classificação fenotípica — não mede atividade.</p>
      <AddBtn
        disabled={!txt}
        onClick={() => txt && onResult?.(`Montreal ${doenca === "CD" ? "Crohn" : "RCU"}: ${txt}`)}
      />
    </ScaleCard>
  );
}

const SES_SEG = ["Íleo", "Cólon direito", "Transverso", "Cólon esquerdo", "Reto"];
const SES_VAR: { key: string; label: string; opts: [string, number][] }[] = [
  { key: "ulc", label: "Tamanho das úlceras", opts: [["Nenhuma", 0], ["Aftoides 0,1–0,5 cm", 1], ["0,5–2 cm", 2], [">2 cm", 3]] },
  { key: "surfUlc", label: "Superfície ulcerada", opts: [["0%", 0], ["<10%", 1], ["10–30%", 2], [">30%", 3]] },
  { key: "surfAcom", label: "Superfície acometida", opts: [["Normal", 0], ["<50%", 1], ["50–75%", 2], [">75%", 3]] },
  { key: "esten", label: "Estenose", opts: [["Nenhuma", 0], ["Única passável", 1], ["Múltiplas passáveis", 2], ["Não passável", 3]] },
];

export function SesCd({ onResult }: { onResult?: ResultFn }) {
  const [v, setV] = useState<Record<string, number>>({});
  const total = sum(v);
  const cat = total <= 2 ? "remissão endoscópica" : total <= 6 ? "leve" : total <= 15 ? "moderada" : "grave";
  return (
    <ScaleCard title="SES-CD (endoscopia no Crohn)" badge={<Badge>{total}</Badge>}>
      <p className="mb-2 text-xs text-muted-foreground">Pontue cada segmento (0–3) nas 4 variáveis.</p>
      <div className="space-y-4">
        {SES_SEG.map((seg, si) => (
          <div key={seg}>
            <p className="mb-1 text-xs font-semibold text-foreground">{seg}</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {SES_VAR.map((it) => (
                <Choice
                  key={it.key}
                  label={it.label}
                  value={v[`${si}-${it.key}`] ?? null}
                  onChange={(val) => setV((s) => ({ ...s, [`${si}-${it.key}`]: val }))}
                  opts={it.opts}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{cat}. Exige ileocolonoscopia completa dos 5 segmentos.</p>
      <AddBtn onClick={() => onResult?.(`SES-CD: ${total} (${cat})`)} />
    </ScaleCard>
  );
}

const CDEIS_SEG = ["Íleo", "Cólon direito", "Transverso", "Cólon esquerdo/sigmoide", "Reto"];

export function Cdeis({ onResult }: { onResult?: ResultFn }) {
  const [seg, setSeg] = useState<Record<string, boolean>>({});
  const [uf, setUf] = useState<Record<string, boolean>>({});
  const [us, setUs] = useState<Record<string, boolean>>({});
  const [ext, setExt] = useState<Record<string, string>>({});
  const [ulc, setUlc] = useState<Record<string, string>>({});
  const [estUlc, setEstUlc] = useState(false);
  const [estNao, setEstNao] = useState(false);

  const explorados = CDEIS_SEG.filter((s) => seg[s]).length;

  const total = useMemo(() => {
    if (!explorados) return null;
    let acc = 0;
    for (const s of CDEIS_SEG) {
      if (!seg[s]) continue;
      if (uf[s]) acc += 12;
      if (us[s]) acc += 6;
      acc += num(ext[s] ?? "") ?? 0;
      acc += num(ulc[s] ?? "") ?? 0;
    }
    let t = acc / explorados;
    if (estUlc) t += 3;
    if (estNao) t += 3;
    return Math.round(t * 10) / 10;
  }, [seg, uf, us, ext, ulc, explorados, estUlc, estNao]);

  const cat = total === null ? "" : total < 3 ? "remissão" : total < 9 ? "leve" : total <= 12 ? "moderada" : "grave";

  return (
    <ScaleCard title="CDEIS (endoscopia no Crohn)" badge={total !== null && <Badge>{total}</Badge>}>
      <p className="mb-2 text-xs text-muted-foreground">
        Marque os segmentos explorados; extensão e superfície ulcerada em escala 0–10 por segmento.
      </p>
      <div className="space-y-3">
        {CDEIS_SEG.map((s) => (
          <div key={s} className="rounded-lg border border-border p-2">
            <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-foreground">
              <input
                type="checkbox"
                className="h-3.5 w-3.5"
                checked={!!seg[s]}
                onChange={(e) => setSeg((x) => ({ ...x, [s]: e.target.checked }))}
              />
              {s} explorado
            </label>
            {seg[s] && (
              <div className="mt-2 grid gap-2 sm:grid-cols-4">
                <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    className="h-3.5 w-3.5"
                    checked={!!uf[s]}
                    onChange={(e) => setUf((x) => ({ ...x, [s]: e.target.checked }))}
                  />
                  Úlcera profunda (12)
                </label>
                <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    className="h-3.5 w-3.5"
                    checked={!!us[s]}
                    onChange={(e) => setUs((x) => ({ ...x, [s]: e.target.checked }))}
                  />
                  Úlcera superficial (6)
                </label>
                <NField
                  label="Extensão acometida (0–10)"
                  value={ext[s] ?? ""}
                  onChange={(val) => setExt((x) => ({ ...x, [s]: val }))}
                />
                <NField
                  label="Superfície ulcerada (0–10)"
                  value={ulc[s] ?? ""}
                  onChange={(val) => setUlc((x) => ({ ...x, [s]: val }))}
                />
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="mt-3 space-y-1">
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <input type="checkbox" className="h-3.5 w-3.5" checked={estUlc} onChange={(e) => setEstUlc(e.target.checked)} />
          Estenose ulcerada em qualquer segmento (+3)
        </label>
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <input type="checkbox" className="h-3.5 w-3.5" checked={estNao} onChange={(e) => setEstNao(e.target.checked)} />
          Estenose não ulcerada em qualquer segmento (+3)
        </label>
      </div>
      {total !== null && <p className="mt-2 text-xs text-muted-foreground">Atividade endoscópica {cat}.</p>}
      <AddBtn disabled={total === null} onClick={() => total !== null && onResult?.(`CDEIS: ${total} (${cat})`)} />
    </ScaleCard>
  );
}

const RUTG_DESC: Record<string, string> = {
  i0: "sem lesões no íleo neoterminal",
  i1: "≤5 lesões aftosas",
  i2: ">5 lesões aftosas com mucosa normal entre elas, ou lesões restritas à anastomose",
  i3: "ileíte aftosa difusa com mucosa difusamente inflamada",
  i4: "inflamação difusa com úlceras maiores, nódulos e/ou estreitamento",
};

export function Rutgeerts({ onResult }: { onResult?: ResultFn }) {
  const [v, setV] = useState<string | null>(null);
  return (
    <ScaleCard title="Rutgeerts (recorrência pós-operatória)" badge={v && <Badge>{v}</Badge>}>
      <Choice
        label="Achado no íleo neoterminal (6–12 meses após ressecção ileocólica)"
        value={v}
        onChange={setV}
        opts={[["i0", "i0"], ["i1", "i1"], ["i2", "i2"], ["i3", "i3"], ["i4", "i4"]]}
      />
      {v && (
        <p className="mt-2 text-xs text-muted-foreground">
          {RUTG_DESC[v]}. {["i0", "i1"].includes(v) ? "Remissão endoscópica." : "Recorrência — intensificar terapia."}
        </p>
      )}
      <AddBtn disabled={!v} onClick={() => v && onResult?.(`Rutgeerts: ${v} — ${RUTG_DESC[v]}`)} />
    </ScaleCard>
  );
}

const PDAI_ITEMS: { key: string; label: string; opts: [string, number][] }[] = [
  { key: "sec", label: "Secreção", opts: [["Nenhuma", 0], ["Mínima mucoide", 1], ["Moderada mucoide/purulenta", 2], ["Substancial", 3], ["Grosseira contaminação fecal", 4]] },
  { key: "dor", label: "Dor / restrição de atividades", opts: [["Sem restrição", 0], ["Desconforto leve", 1], ["Desconforto moderado", 2], ["Desconforto acentuado", 3], ["Dor intensa", 4]] },
  { key: "sex", label: "Restrição de atividade sexual", opts: [["Sem restrição", 0], ["Leve", 1], ["Moderada", 2], ["Acentuada", 3], ["Impossibilitada", 4]] },
  { key: "tipo", label: "Tipo de doença perianal", opts: [["Nenhuma", 0], ["Fissura / laceração mucosa", 1], ["<3 fístulas", 2], ["≥3 fístulas", 3], ["Ulceração do esfíncter ou fístula com descolamento cutâneo importante", 4]] },
  { key: "indu", label: "Grau de induração", opts: [["Nenhuma", 0], ["Mínima", 1], ["Moderada", 2], ["Substancial", 3], ["Flutuação / abscesso", 4]] },
];

export function Pdai({ onResult }: { onResult?: ResultFn }) {
  const [v, setV] = useState<Record<string, number>>({});
  const filled = Object.keys(v).length === PDAI_ITEMS.length;
  const total = sum(v);
  return (
    <ScaleCard title="PDAI (doença perianal)" badge={filled && <Badge>{total}/20</Badge>}>
      <div className="grid gap-3 sm:grid-cols-2">
        {PDAI_ITEMS.map((it) => (
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
      {filled && (
        <p className="mt-2 text-xs text-muted-foreground">
          {total <= 4 ? "Doença perianal inativa/mínima." : "Doença perianal ativa."} Queda ≥5 pontos indica resposta.
        </p>
      )}
      <AddBtn disabled={!filled} onClick={() => filled && onResult?.(`PDAI: ${total}/20`)} />
    </ScaleCard>
  );
}

/* ------------------------------------------------------------------ */
/* DII pediátrica                                                      */
/* ------------------------------------------------------------------ */

const PUCAI: { key: string; label: string; opts: [string, number][] }[] = [
  { key: "dor", label: "Dor abdominal", opts: [["Sem dor", 0], ["Pode ser ignorada", 5], ["Não pode ser ignorada", 10]] },
  { key: "sang", label: "Sangramento retal", opts: [["Ausente", 0], ["Pequena quantidade em <50%", 10], ["Pequena quantidade na maioria", 20], ["Grande quantidade", 30]] },
  { key: "cons", label: "Consistência das fezes", opts: [["Formadas", 0], ["Parcialmente formadas", 5], ["Completamente líquidas", 10]] },
  { key: "num", label: "Evacuações / 24 h", opts: [["0–2", 0], ["3–5", 5], ["6–8", 10], [">8", 15]] },
  { key: "not", label: "Evacuação noturna", opts: [["Não", 0], ["Sim", 10]] },
  { key: "ativ", label: "Nível de atividade", opts: [["Sem limitação", 0], ["Limitação ocasional", 5], ["Restrição intensa", 10]] },
];

export function Pucai({ onResult }: { onResult?: ResultFn }) {
  const [v, setV] = useState<Record<string, number>>({});
  const filled = Object.keys(v).length === PUCAI.length;
  const total = sum(v);
  const cat = !filled ? "" : total < 10 ? "remissão" : total <= 34 ? "leve" : total <= 64 ? "moderada" : "grave";
  return (
    <ScaleCard title="PUCAI (RCU pediátrica)" badge={filled && <Badge>{total}/85</Badge>}>
      <div className="grid gap-3 sm:grid-cols-2">
        {PUCAI.map((it) => (
          <Choice
            key={it.key}
            label={it.label}
            value={v[it.key] ?? null}
            onChange={(val) => setV((s) => ({ ...s, [it.key]: val }))}
            opts={it.opts}
          />
        ))}
      </div>
      {filled && (
        <p className="mt-2 text-xs text-muted-foreground">
          Atividade {cat}. ≥45 no D3 e ≥70 no D5 de corticoide EV indicam terapia de resgate.
        </p>
      )}
      <AddBtn disabled={!filled} onClick={() => filled && onResult?.(`PUCAI: ${total}/85 (${cat})`)} />
    </ScaleCard>
  );
}

const PCDAI: { key: string; label: string; opts: [string, number][] }[] = [
  { key: "dor", label: "Dor abdominal", opts: [["Ausente", 0], ["Leve", 5], ["Moderada/grave", 10]] },
  { key: "fezes", label: "Fezes / dia", opts: [["0–1 líquidas, sem sangue", 0], ["≤2 semi-formadas ou 1–2 líquidas", 5], ["Sangramento importante / ≥6 líquidas", 10]] },
  { key: "bem", label: "Bem-estar geral", opts: [["Sem limitação", 0], ["Dificuldade ocasional", 5], ["Limitação frequente", 10]] },
  { key: "ht", label: "Hematócrito", opts: [["Normal para idade/sexo", 0], ["Redução leve", 2.5], ["Redução importante", 5]] },
  { key: "vhs", label: "VHS (mm/h)", opts: [["<20", 0], ["20–50", 2.5], [">50", 5]] },
  { key: "alb", label: "Albumina (g/dL)", opts: [["≥3,5", 0], ["3,1–3,4", 5], ["≤3,0", 10]] },
  { key: "peso", label: "Peso", opts: [["Ganho ou estável", 0], ["Perda 1–9%", 5], ["Perda ≥10%", 10]] },
  { key: "alt", label: "Velocidade de crescimento", opts: [["≥ −1 DP", 0], ["−1 a −2 DP", 5], ["< −2 DP", 10]] },
  { key: "abd", label: "Exame do abdome", opts: [["Normal", 0], ["Dor / massa sem defesa", 5], ["Defesa / massa definida", 10]] },
  { key: "peri", label: "Doença perirretal", opts: [["Ausente / plicoma", 0], ["Fissura / fístula indolor", 5], ["Fístula ativa / abscesso", 10]] },
  { key: "extra", label: "Manifestações extraintestinais", opts: [["Nenhuma", 0], ["Uma", 5], ["Duas ou mais", 10]] },
];

export function Pcdai({ onResult }: { onResult?: ResultFn }) {
  const [v, setV] = useState<Record<string, number>>({});
  const filled = Object.keys(v).length === PCDAI.length;
  const total = sum(v);
  const cat = !filled ? "" : total <= 10 ? "inativa" : total <= 27.5 ? "leve" : "moderada a grave";
  return (
    <ScaleCard title="PCDAI (Crohn pediátrico)" badge={filled && <Badge>{total}/100</Badge>}>
      <div className="grid gap-3 sm:grid-cols-2">
        {PCDAI.map((it) => (
          <Choice
            key={it.key}
            label={it.label}
            value={v[it.key] ?? null}
            onChange={(val) => setV((s) => ({ ...s, [it.key]: val }))}
            opts={it.opts}
          />
        ))}
      </div>
      {filled && (
        <p className="mt-2 text-xs text-muted-foreground">Atividade {cat}. Queda ≥12,5 pontos = resposta.</p>
      )}
      <AddBtn disabled={!filled} onClick={() => filled && onResult?.(`PCDAI: ${total}/100 (${cat})`)} />
    </ScaleCard>
  );
}

export function Paris({ onResult }: { onResult?: ResultFn }) {
  const [tipo, setTipo] = useState<string | null>(null);
  const [v, setV] = useState<Record<string, string>>({});
  const set = (k: string) => (val: string) => setV((s) => ({ ...s, [k]: val }));
  const txt =
    tipo === "DC"
      ? [v.a, v.l, v.b, v.p, v.g].filter((x) => x && x !== "—").join(" ")
      : [v.e, v.s].filter(Boolean).join(" ");
  return (
    <ScaleCard title="Classificação de Paris (pediátrica)" badge={txt ? <Badge>{txt}</Badge> : undefined}>
      <Choice
        label="Doença"
        value={tipo}
        onChange={(t) => {
          setTipo(t);
          setV({});
        }}
        opts={[["Doença de Crohn", "DC"], ["Retocolite ulcerativa", "RCU"]]}
      />
      {tipo === "DC" && (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Choice label="Idade ao diagnóstico" value={v.a ?? null} onChange={set("a")} opts={[["A1a <10a", "A1a"], ["A1b 10–17a", "A1b"], ["A2 17–40a", "A2"], ["A3 >40a", "A3"]]} />
          <Choice label="Localização" value={v.l ?? null} onChange={set("l")} opts={[["L1 íleo distal", "L1"], ["L2 cólon", "L2"], ["L3 ileocolônica", "L3"], ["L4a proximal ao Treitz", "L4a"], ["L4b Treitz–íleo distal", "L4b"]]} />
          <Choice label="Comportamento" value={v.b ?? null} onChange={set("b")} opts={[["B1 não estenosante", "B1"], ["B2 estenosante", "B2"], ["B3 penetrante", "B3"], ["B2B3", "B2B3"]]} />
          <Choice label="Doença perianal" value={v.p ?? null} onChange={set("p")} opts={[["Ausente", "—"], ["Presente (p)", "p"]]} />
          <Choice label="Crescimento" value={v.g ?? null} onChange={set("g")} opts={[["G0 sem atraso", "G0"], ["G1 atraso", "G1"]]} />
        </div>
      )}
      {tipo === "RCU" && (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Choice label="Extensão" value={v.e ?? null} onChange={set("e")} opts={[["E1 proctite", "E1"], ["E2 até flexura esplênica", "E2"], ["E3 até flexura hepática", "E3"], ["E4 pancolite", "E4"]]} />
          <Choice label="Gravidade" value={v.s ?? null} onChange={set("s")} opts={[["S0 nunca grave", "S0"], ["S1 grave (PUCAI ≥65)", "S1"]]} />
        </div>
      )}
      <AddBtn disabled={!txt} onClick={() => txt && onResult?.(`Paris (${tipo}): ${txt}`)} />
    </ScaleCard>
  );
}
