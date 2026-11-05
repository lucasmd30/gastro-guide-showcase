"use client";

import { useMemo, useState } from "react";
import { Plus, Trash2, Wine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";

/**
 * Calculadora de dose de álcool (o `AlcoholCalculator` do protótipo): abre
 * quando a resposta de "Álcool" é "Sim", e o resultado entra no texto do
 * próprio campo. g = volume(ml) × teor(%) × 0,789.
 */
const DENS = 0.789;

type Drink = { id: string; label: string; grams?: number; custom?: boolean };

const DRINKS: Drink[] = [
  { id: "cerveja-lata", label: "Cerveja lata 350 mL (5%)", grams: 14 },
  { id: "cerveja-long-neck", label: "Cerveja long neck 330 mL (5%)", grams: 13 },
  { id: "cerveja-600", label: "Cerveja garrafa 600 mL (5%)", grams: 24 },
  { id: "chopp", label: "Chopp 300 mL (5%)", grams: 12 },
  { id: "vinho-taca", label: "Vinho taça 150 mL (12%)", grams: 14 },
  { id: "vinho-garrafa", label: "Vinho garrafa 750 mL (12%)", grams: 71 },
  { id: "espumante-taca", label: "Espumante taça 125 mL (12%)", grams: 12 },
  { id: "espumante-garrafa", label: "Espumante garrafa 750 mL (12%)", grams: 72 },
  { id: "destilado-45", label: "Destilado (vodka, gin, tequila) dose 45 mL (40%)", grams: 14 },
  { id: "cachaca-50", label: "Cachaça dose 50 mL (40%)", grams: 16 },
  { id: "caipirinha", label: "Caipirinha (1 dose de cachaça 50 mL)", grams: 16 },
  { id: "drink-destilado", label: "Drink com 1 dose de destilado", grams: 14 },
  { id: "whisky-50", label: "Whisky dose 50 mL (40%)", grams: 16 },
  { id: "whisky-doble", label: "Whisky doble 100 mL (40%)", grams: 32 },
  { id: "licor-50", label: "Licor / digestivo dose 50 mL (25%)", grams: 10 },
  { id: "outra", label: "Outra bebida (informar mL e %)", custom: true },
];

type Row = { drinkId: string; qty: string; dias: string; ml: string; pct: string };

const fmt = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: n < 10 ? 1 : 0 });
const num = (s: string) => parseFloat(s.replace(",", "."));

export function AlcoholCalculator({ onUse, onClose }: { onUse: (text: string) => void; onClose?: () => void }) {
  const [rows, setRows] = useState<Row[]>([{ drinkId: "cerveja-lata", qty: "", dias: "", ml: "", pct: "" }]);

  const setRow = (i: number, patch: Partial<Row>) =>
    setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  const compute = useMemo(() => {
    let week = 0;
    const parts: string[] = [];
    rows.forEach((r) => {
      const drink = DRINKS.find((d) => d.id === r.drinkId);
      if (!drink) return;
      const qty = num(r.qty);
      const dias = num(r.dias);
      let grams = drink.grams;
      if (drink.custom) {
        const ml = num(r.ml);
        const pct = num(r.pct);
        if (!ml || !pct) return;
        grams = ml * (pct / 100) * DENS;
      }
      if (!grams || !qty || !dias) return;
      week += grams * qty * dias;
      const detail = drink.custom ? `${fmt(num(r.ml))} mL, ${fmt(num(r.pct))}%` : `${fmt(grams)} g/unid.`;
      parts.push(`${fmt(qty)} × ${drink.label} — ${detail} — ${fmt(dias)} dias/semana`);
    });
    return { week, parts };
  }, [rows]);

  const day = compute.week / 7;
  const risky = day > 20;

  return (
    <div className="rounded-lg border border-primary/25 bg-primary/5 p-3">
      <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-primary">
        <Wine className="h-4 w-4" /> Calculadora de dose de álcool (gramas de etanol)
      </div>

      <div className="space-y-2">
        {rows.map((r, i) => (
          <div key={i} className="flex flex-wrap items-center gap-1.5">
            <NativeSelect
              aria-label="Bebida"
              value={r.drinkId}
              onChange={(e) => setRow(i, { drinkId: e.target.value })}
              className="min-w-0 flex-1 basis-56"
            >
              {DRINKS.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.label}
                  {d.grams ? ` — ${fmt(d.grams)} g/unid.` : ""}
                </option>
              ))}
            </NativeSelect>
            <Input
              aria-label="Quantidade por dia"
              className="w-16"
              inputMode="decimal"
              placeholder="Qtd."
              value={r.qty}
              onChange={(e) => setRow(i, { qty: e.target.value })}
            />
            <Input
              aria-label="Dias por semana"
              className="w-24"
              inputMode="decimal"
              placeholder="Dias/sem."
              value={r.dias}
              onChange={(e) => setRow(i, { dias: e.target.value })}
            />
            {r.drinkId === "outra" && (
              <>
                <Input
                  aria-label="Volume em ml"
                  className="w-16"
                  inputMode="decimal"
                  placeholder="mL"
                  value={r.ml}
                  onChange={(e) => setRow(i, { ml: e.target.value })}
                />
                <Input
                  aria-label="Teor alcoólico em porcentagem"
                  className="w-16"
                  inputMode="decimal"
                  placeholder="%"
                  value={r.pct}
                  onChange={(e) => setRow(i, { pct: e.target.value })}
                />
              </>
            )}
            <button
              type="button"
              aria-label="Remover bebida"
              className="rounded p-2 text-muted-foreground hover:bg-muted"
              onClick={() => setRows((rs) => rs.filter((_, j) => j !== i))}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        className="mt-2 flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        onClick={() => setRows((rs) => [...rs, { drinkId: "outra", qty: "", dias: "", ml: "", pct: "" }])}
      >
        <Plus className="h-3.5 w-3.5" /> Adicionar outra bebida
      </button>

      {compute.week > 0 && (
        <div className="mt-2 space-y-1 rounded-lg bg-card p-2.5 text-xs">
          <div className="text-sm font-semibold text-foreground">
            {fmt(compute.week)} g/semana ≈ {fmt(day)} g/dia
          </div>
          <div className={risky ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"}>
            {risky
              ? "Acima do limite de risco (> 20 g/dia em mulheres; > 30 g/dia em homens)."
              : "Referência de risco: > 20 g/dia em mulheres; > 30 g/dia em homens."}
          </div>
        </div>
      )}

      <div className="mt-3 flex items-center gap-2">
        <Button
          type="button"
          size="sm"
          disabled={compute.parts.length === 0}
          onClick={() => onUse(`${compute.parts.join(" + ")} — ${fmt(compute.week)} g/semana (≈ ${fmt(day)} g/dia).`)}
        >
          Inserir no campo Álcool
        </Button>
        {onClose && (
          <Button type="button" size="sm" variant="ghost" onClick={onClose}>
            Fechar
          </Button>
        )}
      </div>
    </div>
  );
}
