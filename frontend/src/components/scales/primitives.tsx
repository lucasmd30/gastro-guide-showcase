"use client";

import { createContext, useContext, type ReactNode } from "react";
import { Calculator } from "lucide-react";
import { Input } from "@/components/ui/input";

/**
 * Peças compartilhadas das escalas clínicas.
 *
 * No protótipo Lovable esse mesmo bloco está duplicado em três arquivos
 * ("duplicated locally to keep file self-contained"); aqui ele existe uma vez
 * só, para as ~60 escalas terem exatamente a mesma aparência e o mesmo
 * comportamento de entrada.
 */

/** Aceita vírgula decimal — o médico digita "1,5", não "1.5". */
export function num(v: string): number | null {
  const n = parseFloat(v.replace(",", "."));
  return isNaN(n) ? null : n;
}

/** Número no formato pt-BR, para o texto que vai ao prontuário. */
export function fmt(n: number, decimals = 2): string {
  return n.toFixed(decimals).replace(".", ",");
}

export type ResultFn = (s: string) => void;

export function ScaleCard({
  title,
  badge,
  children,
}: {
  title: string;
  badge?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-primary">
          <Calculator className="h-4 w-4" /> {title}
        </h3>
        {badge}
      </div>
      {children}
    </div>
  );
}

export function Badge({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-md bg-primary/10 px-2 py-0.5 text-sm font-bold text-primary">{children}</span>
  );
}

export function NField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <p className="mb-1 text-xs font-medium text-muted-foreground">{label}</p>
      <Input inputMode="decimal" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

export function Choice<T extends string | number>({
  label,
  value,
  onChange,
  opts,
  wrap = false,
}: {
  label: string;
  value: T | null;
  onChange: (v: T) => void;
  opts: readonly (readonly [string, T])[];
  /** Opções com texto longo (AUDIT, Mayo completo): quebram linha em vez de vazar. */
  wrap?: boolean;
}) {
  return (
    <div>
      <p className="mb-1 text-xs font-medium text-muted-foreground">{label}</p>
      <div className="flex flex-wrap gap-1">
        {opts.map(([lbl, val]) => {
          const active = value === val;
          return (
            <button
              key={lbl}
              type="button"
              onClick={() => onChange(val)}
              className={`${wrap ? "whitespace-normal text-left" : "flex-1 whitespace-nowrap"} rounded-md border px-1.5 py-1 text-xs transition-colors ${
                active
                  ? "border-primary bg-primary/10 font-semibold text-foreground"
                  : "border-border text-muted-foreground hover:bg-muted"
              }`}
            >
              {lbl}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function Slider({
  label,
  value,
  onChange,
  max = 10,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  max?: number;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <Badge>
          {value}/{max}
        </Badge>
      </div>
      <input
        type="range"
        min={0}
        max={max}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-primary"
      />
    </div>
  );
}

/**
 * Se há um registro para anexar o resultado. Fora do atendimento (página
 * "Escalas e calculadoras" da sidebar) a calculadora é só consulta, e o
 * botão de anexar não aparece.
 */
export const ScaleAttachContext = createContext(true);

export function AddBtn({ onClick, disabled }: { onClick: () => void; disabled?: boolean }) {
  const canAttach = useContext(ScaleAttachContext);
  if (!canAttach) return null;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="mt-3 text-xs font-medium text-primary hover:underline disabled:opacity-40"
    >
      Anexar ao registro →
    </button>
  );
}

/**
 * Lista de complicações do CDAI e do Harvey-Bradshaw. "Nenhuma" é uma
 * escolha explícita (`["none"]`), para o escore não sair com zero
 * complicações só porque o médico não chegou a olhar a lista.
 */
export function ComplicationChecklist({
  options,
  selected,
  onChange,
}: {
  options: readonly string[];
  selected: string[];
  onChange: (v: string[]) => void;
}) {
  const none = selected.includes("none");
  return (
    <fieldset className="mt-3">
      <legend className="mb-2 text-xs font-medium text-muted-foreground">Complicações</legend>
      <div className="grid gap-1.5 sm:grid-cols-2">
        <label className="flex items-start gap-2 text-xs">
          <input
            type="checkbox"
            className="mt-0.5 accent-primary"
            checked={none}
            onChange={(e) => onChange(e.target.checked ? ["none"] : [])}
          />
          Nenhuma complicação
        </label>
        {options.map((text) => (
          <label key={text} className="flex items-start gap-2 text-xs">
            <input
              type="checkbox"
              className="mt-0.5 accent-primary"
              checked={selected.includes(text)}
              onChange={(e) =>
                onChange(
                  e.target.checked
                    ? [...selected.filter((s) => s !== "none"), text]
                    : selected.filter((s) => s !== text),
                )
              }
            />
            {text}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/** Soma os pontos escolhidos num grupo de `Choice` guardado num Record. */
export function sum(v: Record<string, number>): number {
  return Object.values(v).reduce((a, b) => a + b, 0);
}
