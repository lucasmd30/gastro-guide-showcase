"use client";

import { useState } from "react";
import { Plus, X, Check } from "lucide-react";
import type { DiseaseFieldSummary } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { AlcoholCalculator } from "@/components/alcohol-calculator";
import { computeResult, fieldLabel, type ComputedResult } from "@/lib/computed-fields";

export type TableRow = Record<string, string>;
export type FieldValue = string | string[] | TableRow[];
export type FieldValues = Record<string, FieldValue>;

/**
 * Opções que zeram as demais num campo múltiplo ("Nenhuma associação",
 * "Ausente", "Sem tratamento"…). Mesma lista de prefixos do
 * EXCLUSIVE_PREFIXES do protótipo Lovable.
 */
const EXCLUSIVE_PREFIXES = ["Nenhum", "Nenhuma", "Sem ", "Ausente", "Não", "Não avaliado", "Não indicada"];

export function isExclusiveOption(option: string): boolean {
  return EXCLUSIVE_PREFIXES.some((prefix) => option.startsWith(prefix));
}

/** Aplica a regra de exclusividade ao marcar/desmarcar uma opção de campo múltiplo. */
export function toggleMultiOption(current: string[], option: string): string[] {
  if (current.includes(option)) return current.filter((o) => o !== option);
  if (isExclusiveOption(option)) return [option];
  return [...current.filter((o) => !isExclusiveOption(o)), option];
}

/** Verdadeiro se o campo não tem condição, ou se **todas** as suas condições casam com os valores atuais. */
export function isFieldVisible(field: DiseaseFieldSummary, values: FieldValues): boolean {
  const conditions = field.showIf;
  if (!conditions || conditions.length === 0) return true;
  return conditions.every((condition) => {
    const target = values[condition.key];
    if (condition.equals) return typeof target === "string" && condition.equals.includes(target);
    if (condition.includes) {
      return Array.isArray(target) && (target as string[]).some((v) => condition.includes!.includes(v));
    }
    return true;
  });
}

const LABEL_CLASS = "text-xs font-semibold uppercase tracking-wide text-primary";

/** Cores das pílulas, por rótulo da opção — reproduz o exame físico e o Sim/Não do protótipo. */
function pillClass(option: string, selected: boolean): string {
  if (!selected) return "text-muted-foreground hover:bg-muted";
  if (option === "Alterado") return "bg-amber-500/15 text-amber-700 dark:text-amber-400";
  if (option === "Não" || option === "Não realizado") return "bg-muted-foreground/20 text-foreground";
  if (option === "Normal") return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400";
  return "bg-primary text-primary-foreground";
}

function OptionPills({
  options,
  isSelected,
  onToggle,
  withCheck,
}: {
  options: string[];
  isSelected: (option: string) => boolean;
  onToggle: (option: string) => void;
  withCheck?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1">
      {options.map((option) => {
        const selected = isSelected(option);
        return (
          <button
            key={option}
            type="button"
            onClick={() => onToggle(option)}
            className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${pillClass(option, selected)}`}
          >
            {withCheck && selected && <Check className="h-3 w-3" />}
            {option}
          </button>
        );
      })}
    </div>
  );
}

function OptionBoxes({
  field,
  options,
  type,
  isSelected,
  onToggle,
}: {
  field: DiseaseFieldSummary;
  options: string[];
  type: "radio" | "checkbox";
  isSelected: (option: string) => boolean;
  onToggle: (option: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1.5">
      {options.map((option) => (
        <label key={option} className="flex items-start gap-1.5 text-sm">
          <input
            type={type}
            name={`${field.key}-options`}
            className="mt-0.5 h-4 w-4 accent-primary"
            checked={isSelected(option)}
            // Rádio nativo não desmarca sozinho; o clique num item já
            // selecionado limpa o campo, como no protótipo.
            onChange={() => onToggle(option)}
            onClick={() => {
              if (type === "radio" && isSelected(option)) onToggle(option);
            }}
          />
          <span>{option}</span>
        </label>
      ))}
    </div>
  );
}

const TONE_CLASS: Record<NonNullable<ComputedResult["tone"]>, string> = {
  ok: "text-primary",
  warn: "text-amber-700 dark:text-amber-400",
  alert: "text-destructive",
};

/** A cor de um resultado calculado (dose fora da meta, risco alto…). */
export function toneClass(tone: ComputedResult["tone"]): string {
  return tone ? TONE_CLASS[tone] : "text-foreground";
}

/** Detalhe do álcool: o texto e, no "Sim", a calculadora de dose, que escreve no próprio campo. */
function AlcoholDetail({
  field,
  label,
  value,
  onChange,
}: {
  field: DiseaseFieldSummary;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const [calculatorOpen, setCalculatorOpen] = useState(true);
  return (
    <div className="space-y-2">
      <p className={LABEL_CLASS}>{label}</p>
      <Textarea
        rows={field.rows ?? 2}
        placeholder={field.placeholder ?? undefined}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {calculatorOpen && (
        <AlcoholCalculator
          onClose={() => setCalculatorOpen(false)}
          onUse={(text) => {
            onChange(value ? `${value}\n${text}` : text);
            setCalculatorOpen(false);
          }}
        />
      )}
    </div>
  );
}

/** Renderiza um campo a partir da config dinâmica — usado pelo cabeçalho de doença e pelas seções de consulta. */
export function DynamicFormField({
  field,
  value,
  values,
  onScalarChange,
  onToggleMulti,
  onTableChange,
  hideHint,
}: {
  field: DiseaseFieldSummary;
  value: FieldValue | undefined;
  /** Mapa completo do formulário — o campo de achados do exame físico precisa saber o modo escolhido. */
  values: FieldValues;
  onScalarChange: (value: string) => void;
  onToggleMulti: (option: string) => void;
  onTableChange?: (rows: TableRow[]) => void;
  /** Numa linha de campos lado a lado, o hint é impresso abaixo da linha inteira (ver FieldGroups). */
  hideHint?: boolean;
}) {
  const label = fieldLabel(field, values);
  const compact = field.style === "COMPACT";

  if (field.style === "ALCOHOL_CALCULATOR") {
    return (
      <AlcoholDetail field={field} label={label} value={(value as string) ?? ""} onChange={onScalarChange} />
    );
  }

  // Valor calculado de outros campos (FIB-4, NAS): só mostra, nunca é digitado.
  if (field.type === "COMPUTED") {
    const result = computeResult(field, values);
    const box = (
      <div className="inline-block min-h-8 rounded-md border border-border bg-muted/40 px-3 py-1.5 text-sm">
        <p className={result ? `font-semibold ${toneClass(result.tone)}` : "text-muted-foreground"}>
          {result?.text ?? field.placeholder ?? "Preencha os campos para calcular"}
        </p>
        {result?.detail && <p className="mt-0.5 text-xs text-muted-foreground">{result.detail}</p>}
      </div>
    );
    return compact ? (
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <span className="w-40 shrink-0 text-sm text-muted-foreground">{label}</span>
        {box}
      </div>
    ) : (
      <div className="space-y-1.5">
        <p className={LABEL_CLASS}>{label}</p>
        {box}
      </div>
    );
  }

  if (field.type === "NOTE") {
    return (
      <div className="rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-sm text-foreground">
        {field.label}
      </div>
    );
  }

  if (field.type === "LINKS") {
    return (
      <div className="space-y-1.5">
        <p className={LABEL_CLASS}>{field.label}</p>
        <ul className="space-y-1">
          {field.links?.map((link) => (
            <li key={link.url}>
              <a
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary underline decoration-dotted hover:decoration-solid"
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>
        {field.hint && <p className="text-xs text-muted-foreground">{field.hint}</p>}
      </div>
    );
  }

  // Achados do exame físico: em "Normal" o protótipo mostra a frase padrão
  // da região como texto, sem input; só "Alterado" abre a digitação.
  if (field.style === "EXAM_FINDINGS") {
    const mode = values[field.showIf?.[0]?.key ?? ""];
    if (mode === "Normal") {
      return <p className="text-xs italic text-muted-foreground">{(value as string) || field.placeholder}</p>;
    }
    return (
      <Textarea
        rows={field.rows ?? 2}
        placeholder={`Descreva os achados alterados…`}
        value={(value as string) ?? ""}
        onChange={(e) => onScalarChange(e.target.value)}
      />
    );
  }

  const isOptionField = field.type === "SINGLE" || field.type === "MULTI";
  const usesPills = field.style === "BUTTONS" || field.style === "EXAM_MODE";
  const options = field.options ?? [];

  const isSelected = (option: string) =>
    field.type === "MULTI" ? Array.isArray(value) && (value as string[]).includes(option) : value === option;

  const toggle = (option: string) => {
    if (field.type === "MULTI") onToggleMulti(option);
    else onScalarChange(value === option ? "" : option);
  };

  const optionsNode = isOptionField ? (
    usesPills ? (
      <OptionPills
        options={options}
        isSelected={isSelected}
        onToggle={toggle}
        withCheck={field.style === "EXAM_MODE"}
      />
    ) : (
      <OptionBoxes
        field={field}
        options={options}
        type={field.type === "MULTI" ? "checkbox" : "radio"}
        isSelected={isSelected}
        onToggle={toggle}
      />
    )
  ) : null;

  return (
    <div className="space-y-1.5">
      {isOptionField && compact ? (
        // Item de um bloco que já tem título (biópsia hepática): rótulo cinza
        // numa coluna fixa e as opções logo ao lado, como no protótipo.
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <span className="w-40 shrink-0 text-sm text-muted-foreground">{label}</span>
          {optionsNode}
        </div>
      ) : isOptionField && field.inline ? (
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
          <p className={LABEL_CLASS}>{label}</p>
          {optionsNode}
        </div>
      ) : field.quickFill ? (
        // Atalho do protótipo ("Nega" nos antecedentes): um clique grava o
        // texto, outro clique limpa. O valor é texto comum.
        <div className="flex items-center justify-between gap-2">
          <p className={LABEL_CLASS}>{label}</p>
          <Button
            type="button"
            size="sm"
            variant={(value as string)?.trim() === field.quickFill ? "default" : "outline"}
            className="h-6 px-2 text-[11px]"
            onClick={() =>
              onScalarChange((value as string)?.trim() === field.quickFill ? "" : field.quickFill!)
            }
          >
            {field.quickFill}
          </Button>
        </div>
      ) : (
        <>
          <p className={LABEL_CLASS}>{label}</p>
          {optionsNode}
        </>
      )}

      {field.type === "TEXT" &&
        (field.rows && field.rows > 1 ? (
          <Textarea
            rows={field.rows}
            placeholder={field.placeholder ?? undefined}
            value={(value as string) ?? ""}
            onChange={(e) => onScalarChange(e.target.value)}
          />
        ) : (
          <Input
            placeholder={field.placeholder ?? undefined}
            value={(value as string) ?? ""}
            onChange={(e) => onScalarChange(e.target.value)}
          />
        ))}

      {field.type === "NUMBER" && (
        <div className="flex items-center gap-2">
          <Input
            type="number"
            inputMode="decimal"
            className="max-w-[10rem]"
            placeholder={field.placeholder ?? undefined}
            value={(value as string) ?? ""}
            onChange={(e) => onScalarChange(e.target.value)}
          />
          {field.suffix && <span className="text-xs text-muted-foreground">{field.suffix}</span>}
        </div>
      )}

      {field.type === "TABLE" && (
        <TableField field={field} value={Array.isArray(value) ? (value as TableRow[]) : []} onChange={onTableChange} />
      )}

      {field.hint && !hideHint && (
        <p className="whitespace-pre-line text-xs text-muted-foreground">{field.hint}</p>
      )}
    </div>
  );
}

function TableField({
  field,
  value,
  onChange,
}: {
  field: DiseaseFieldSummary;
  value: TableRow[];
  onChange?: (rows: TableRow[]) => void;
}) {
  const columns = field.columns ?? [];

  const setCell = (rowIndex: number, columnKey: string, cellValue: string) => {
    const next = value.map((row, i) => (i === rowIndex ? { ...row, [columnKey]: cellValue } : row));
    onChange?.(next);
  };

  // Largura mínima por coluna: com todas iguais, a data (15/10/2026) ficava
  // cortada na tabela de 8 colunas da CBP (relato de 23/10/2026). Se não
  // couber, a tabela rola na horizontal dentro do próprio card.
  const minWidth = (col: { key: string; label: string }) =>
    col.key === "data" || /^data\b/i.test(col.label) ? "8.5rem" : "5.5rem";

  const addRow = () => onChange?.([...value, {}]);
  const removeRow = (rowIndex: number) => onChange?.(value.filter((_, i) => i !== rowIndex));

  return (
    <div className="space-y-2 overflow-x-auto rounded-md border border-border/60">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border/60 bg-muted/40">
            {columns.map((col) => (
              <th
                key={col.key}
                style={{ minWidth: minWidth(col) }}
                className="p-2 text-left text-xs font-medium text-muted-foreground"
              >
                {col.label}
              </th>
            ))}
            <th className="w-8" />
          </tr>
        </thead>
        <tbody>
          {value.length === 0 && (
            <tr>
              <td colSpan={columns.length + 1} className="p-2 text-xs text-muted-foreground">
                Nenhuma linha ainda.
              </td>
            </tr>
          )}
          {value.map((row, rowIndex) => (
            <tr key={rowIndex} className="border-b border-border/40 last:border-0">
              {columns.map((col) => (
                <td key={col.key} className="p-1.5">
                  <Input
                    className="h-8"
                    placeholder={col.placeholder ?? undefined}
                    value={row[col.key] ?? ""}
                    onChange={(e) => setCell(rowIndex, col.key, e.target.value)}
                  />
                </td>
              ))}
              <td className="p-1.5">
                <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeRow(rowIndex)}>
                  <X className="h-3.5 w-3.5" />
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="p-2 pt-0">
        <Button type="button" variant="outline" size="sm" onClick={addRow}>
          <Plus className="mr-1 h-3.5 w-3.5" /> Adicionar linha
        </Button>
      </div>
    </div>
  );
}
