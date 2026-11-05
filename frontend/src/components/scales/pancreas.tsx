"use client";

import { useState } from "react";
import { AddBtn, Badge, Choice, NField, ScaleCard, num, sum, type ResultFn } from "./primitives";

const RANSON_ADM: { key: string; label: string }[] = [
  { key: "age", label: "Idade > 55 anos" },
  { key: "wbc", label: "Leucócitos > 16.000/mm³" },
  { key: "gli", label: "Glicose > 200 mg/dL" },
  { key: "ldh", label: "LDH > 350 U/L" },
  { key: "ast", label: "AST > 250 U/L" },
];

const RANSON_48: { key: string; label: string }[] = [
  { key: "hct", label: "Queda do hematócrito > 10%" },
  { key: "bun", label: "Aumento do BUN > 5 mg/dL" },
  { key: "ca", label: "Cálcio < 8 mg/dL" },
  { key: "po2", label: "PaO₂ < 60 mmHg" },
  { key: "be", label: "Déficit de base > 4 mEq/L" },
  { key: "seq", label: "Sequestro líquido > 6 L" },
];

export function Ranson({ onResult }: { onResult?: ResultFn }) {
  const [v, setV] = useState<Record<string, number>>({});
  const total = sum(v);
  const cat = total <= 2 ? "mortalidade <5%" : total <= 4 ? "mortalidade ~15%" : total <= 6 ? "mortalidade ~40%" : "mortalidade ~100%";
  return (
    <ScaleCard title="Ranson (pancreatite aguda)" badge={<Badge>{total}/11</Badge>}>
      <p className="mb-1 text-xs font-semibold text-foreground">Na admissão</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {RANSON_ADM.map((it) => (
          <Choice
            key={it.key}
            label={it.label}
            value={v[it.key] ?? null}
            onChange={(val) => setV((s) => ({ ...s, [it.key]: val }))}
            opts={[["Não", 0], ["Sim", 1]]}
          />
        ))}
      </div>
      <p className="mb-1 mt-3 text-xs font-semibold text-foreground">Em 48 horas</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {RANSON_48.map((it) => (
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
        ≥3 critérios = pancreatite grave. {cat}. Só é completável após 48 h.
      </p>
      <AddBtn onClick={() => onResult?.(`Ranson: ${total}/11 (${cat})`)} />
    </ScaleCard>
  );
}

const BISAP_ITEMS: { key: string; label: string }[] = [
  { key: "bun", label: "BUN > 25 mg/dL" },
  { key: "ams", label: "Alteração do estado mental" },
  { key: "sirs", label: "SIRS" },
  { key: "age", label: "Idade > 60 anos" },
  { key: "pl", label: "Derrame pleural" },
];

export function Bisap({ onResult }: { onResult?: ResultFn }) {
  const [v, setV] = useState<Record<string, number>>({});
  const total = sum(v);
  const cat = total <= 2 ? "baixa mortalidade" : "risco aumentado de mortalidade e falência orgânica";
  return (
    <ScaleCard title="BISAP (pancreatite)" badge={<Badge>{total}/5</Badge>}>
      <div className="grid gap-2 sm:grid-cols-2">
        {BISAP_ITEMS.map((it) => (
          <Choice
            key={it.key}
            label={it.label}
            value={v[it.key] ?? null}
            onChange={(val) => setV((s) => ({ ...s, [it.key]: val }))}
            opts={[["Não", 0], ["Sim", 1]]}
          />
        ))}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{cat}. Calculado nas primeiras 24 h.</p>
      <AddBtn onClick={() => onResult?.(`BISAP: ${total}/5 (${cat})`)} />
    </ScaleCard>
  );
}

const ATLANTA_DESC: Record<string, string> = {
  Leve: "sem falência orgânica e sem complicações locais ou sistêmicas",
  Moderada: "falência orgânica transitória (<48 h) ou complicação local",
  Grave: "falência orgânica persistente (>48 h)",
};

export function Atlanta({ onResult }: { onResult?: ResultFn }) {
  const [v, setV] = useState<string | null>(null);
  return (
    <ScaleCard title="Atlanta revisada (gravidade)" badge={v && <Badge>{v}</Badge>}>
      <Choice
        label="Classificação"
        value={v}
        onChange={setV}
        opts={[["Leve", "Leve"], ["Moderada", "Moderada"], ["Grave", "Grave"]]}
      />
      {v && <p className="mt-2 text-xs text-muted-foreground">{ATLANTA_DESC[v]}.</p>}
      <p className="mt-1 text-xs text-muted-foreground">Definição só é definitiva após 48–72 h de evolução.</p>
      <AddBtn disabled={!v} onClick={() => v && onResult?.(`Atlanta revisada: ${v} — ${ATLANTA_DESC[v]}`)} />
    </ScaleCard>
  );
}

/**
 * APACHE II completo. O protótipo Lovable não calcula nada — pede o total já
 * pronto de "uma calculadora dedicada". A tabela de pontos abaixo é a do
 * documento de fórmulas da cliente.
 *
 * As variáveis fisiológicas usam pontuação em "U" (pior para os dois lados),
 * por isso cada uma é uma escolha explícita em vez de um número: digitar o
 * valor bruto exigiria replicar as faixas de qualquer forma, e a escolha
 * deixa visível qual faixa foi considerada.
 */
const APACHE_FISIO: { key: string; label: string; opts: [string, number][] }[] = [
  { key: "temp", label: "Temperatura (°C)", opts: [["≥41", 4], ["39–40,9", 3], ["38,5–38,9", 1], ["36–38,4", 0], ["34–35,9", 1], ["32–33,9", 2], ["30–31,9", 3], ["<30", 4]] },
  { key: "pam", label: "PAM (mmHg)", opts: [["≥160", 4], ["130–159", 3], ["110–129", 2], ["70–109", 0], ["50–69", 2], ["<50", 4]] },
  { key: "fc", label: "FC (bpm)", opts: [["≥180", 4], ["140–179", 3], ["110–139", 2], ["70–109", 0], ["55–69", 2], ["40–54", 3], ["<40", 4]] },
  { key: "fr", label: "FR (irpm)", opts: [["≥50", 4], ["35–49", 3], ["25–34", 1], ["12–24", 0], ["10–11", 1], ["6–9", 2], ["<6", 4]] },
  { key: "oxi", label: "Oxigenação", opts: [["FiO₂≥0,5: PaO₂ ≥70", 0], ["FiO₂≥0,5: 61–70", 1], ["FiO₂≥0,5: 55–60", 3], ["FiO₂≥0,5: <55", 4], ["FiO₂<0,5: PaO₂ ≥70", 0], ["FiO₂<0,5: <70", 1]] },
  { key: "ph", label: "pH arterial", opts: [["≥7,70", 4], ["7,60–7,69", 3], ["7,50–7,59", 1], ["7,33–7,49", 0], ["7,25–7,32", 2], ["7,15–7,24", 3], ["<7,15", 4]] },
  { key: "na", label: "Sódio (mEq/L)", opts: [["≥180", 4], ["160–179", 3], ["155–159", 1], ["130–149", 0], ["120–129", 2], ["111–119", 3], ["≤110", 4]] },
  { key: "k", label: "Potássio (mEq/L)", opts: [["≥7,0", 4], ["6,0–6,9", 3], ["5,5–5,9", 1], ["3,5–5,4", 0], ["3,0–3,4", 1], ["2,5–2,9", 2], ["<2,5", 4]] },
  { key: "creat", label: "Creatinina (mg/dL)", opts: [["≥3,5", 4], ["2,0–3,4", 3], ["1,5–1,9", 2], ["0,6–1,4", 0], ["<0,6", 2]] },
  { key: "ht", label: "Hematócrito (%)", opts: [["≥60", 4], ["50–59,9", 2], ["46–49,9", 1], ["30–45,9", 0], ["20–29,9", 2], ["<20", 4]] },
  { key: "leuco", label: "Leucócitos (×10³/mm³)", opts: [["≥40", 4], ["20–39,9", 2], ["15–19,9", 1], ["3–14,9", 0], ["1–2,9", 2], ["<1", 4]] },
];

const APACHE_IDADE: [string, number][] = [["<45", 0], ["45–54", 2], ["55–64", 3], ["65–74", 5], ["≥75", 6]];
const APACHE_CRONICA: [string, number][] = [
  ["Nenhuma", 0],
  ["Pós-op. eletivo", 2],
  ["Emergência / não operatório", 5],
];

export function Apache2({ onResult }: { onResult?: ResultFn }) {
  const [v, setV] = useState<Record<string, number>>({});
  const [gcs, setGcs] = useState("15");
  const [iraAguda, setIraAguda] = useState(false);
  const [idade, setIdade] = useState<number | null>(null);
  const [cronica, setCronica] = useState<number | null>(null);

  const gcsNum = num(gcs);
  const gcsPts = gcsNum === null ? 0 : Math.max(0, Math.min(15, 15 - gcsNum));
  // A creatinina vale o dobro na insuficiência renal aguda.
  const creatExtra = iraAguda ? v.creat ?? 0 : 0;
  const total = sum(v) + creatExtra + gcsPts + (idade ?? 0) + (cronica ?? 0);
  const cat = total < 8 ? "mortalidade ~4%" : total < 15 ? "~15%" : total < 25 ? "~40%" : ">55%";
  const completo = idade !== null && cronica !== null;

  return (
    <ScaleCard title="APACHE II" badge={<Badge>{total}</Badge>}>
      <p className="mb-2 text-xs font-semibold text-foreground">Fisiologia aguda</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {APACHE_FISIO.map((it) => (
          <Choice
            key={it.key}
            label={it.label}
            value={v[it.key] ?? null}
            onChange={(val) => setV((s) => ({ ...s, [it.key]: val }))}
            opts={it.opts}
          />
        ))}
        <NField label="Escala de Glasgow (3–15)" value={gcs} onChange={setGcs} />
      </div>
      <label className="mt-2 flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
        <input
          type="checkbox"
          checked={iraAguda}
          onChange={(e) => setIraAguda(e.target.checked)}
          className="h-3.5 w-3.5"
        />
        Insuficiência renal aguda (dobra os pontos da creatinina)
      </label>

      <p className="mb-2 mt-4 text-xs font-semibold text-foreground">Idade e doença crônica</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Choice label="Idade (anos)" value={idade} onChange={setIdade} opts={APACHE_IDADE} />
        <Choice
          label="Insuficiência orgânica grave ou imunossupressão"
          value={cronica}
          onChange={setCronica}
          opts={APACHE_CRONICA}
        />
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        Glasgow contribui com 15 − GCS ({gcsPts} pts). Total {total} — {cat}. ≥8 sugere pancreatite grave.
      </p>
      <AddBtn disabled={!completo} onClick={() => completo && onResult?.(`APACHE II: ${total} (${cat})`)} />
    </ScaleCard>
  );
}
