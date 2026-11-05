"use client";

import type { ReactNode } from "react";
import { Calculator, ExternalLink } from "lucide-react";
import type { DiseaseFieldSummary } from "@/lib/api";
import { computeResult } from "@/lib/computed-fields";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import {
  DynamicFormField,
  isFieldVisible,
  toneClass,
  type FieldValue,
  type FieldValues,
  type TableRow,
} from "@/components/dynamic-form-field";

type RowGroup = { rowLabel: string | null; fields: DiseaseFieldSummary[] };
type SubGroup = { subsection: string | null; rows: RowGroup[] };
export type SectionGroup = { section: string | null; subgroups: SubGroup[] };

/**
 * Agrupa uma lista **plana** de campos em seção → subseção → linha, sempre
 * por igualdade entre campos consecutivos. É assim que o motor reproduz o
 * layout do protótipo sem aninhar a config (ver DiseaseField no backend).
 */
export function groupFields(fields: DiseaseFieldSummary[]): SectionGroup[] {
  const sections: SectionGroup[] = [];
  for (const field of fields) {
    let section = sections[sections.length - 1];
    if (!section || section.section !== (field.section ?? null)) {
      section = { section: field.section ?? null, subgroups: [] };
      sections.push(section);
    }
    let sub = section.subgroups[section.subgroups.length - 1];
    if (!sub || sub.subsection !== (field.subsection ?? null)) {
      sub = { subsection: field.subsection ?? null, rows: [] };
      section.subgroups.push(sub);
    }
    let row = sub.rows[sub.rows.length - 1];
    if (!row || row.rowLabel !== (field.rowLabel ?? null)) {
      row = { rowLabel: field.rowLabel ?? null, fields: [] };
      sub.rows.push(row);
    }
    row.fields.push(field);
  }
  return sections;
}

export function FieldGroups({
  fields,
  values,
  onScalarChange,
  onToggleMulti,
  onTableChange,
  renderSection,
  slotAfterSubsection,
}: {
  fields: DiseaseFieldSummary[];
  values: FieldValues;
  onScalarChange: (key: string, value: string) => void;
  onToggleMulti: (key: string, option: string) => void;
  onTableChange?: (key: string, rows: TableRow[]) => void;
  /** Como envolver cada seção — card recolhível no formulário de registro, título simples no cabeçalho de doença. */
  renderSection?: (section: string, children: ReactNode) => ReactNode;
  /** Conteúdo extra logo depois de uma subseção (o IMC calculado, por exemplo). */
  slotAfterSubsection?: (subsection: string | null) => ReactNode;
}) {
  const visible = fields.filter((field) => isFieldVisible(field, values));
  const sections = groupFields(visible);

  const renderField = (field: DiseaseFieldSummary, hideHint = false) => (
    <DynamicFormField
      key={field.key}
      field={field}
      value={values[field.key] as FieldValue | undefined}
      values={values}
      hideHint={hideHint}
      onScalarChange={(v) => onScalarChange(field.key, v)}
      onToggleMulti={(option) => onToggleMulti(field.key, option)}
      onTableChange={onTableChange ? (rows) => onTableChange(field.key, rows) : undefined}
    />
  );

  return (
    <>
      {sections.map((section, sectionIndex) => {
        const body = (
          <div className="space-y-4">
            {section.subgroups.map((sub, subIndex) => (
              <div key={sub.subsection ?? `sub-${subIndex}`} className="space-y-3">
                {sub.subsection && (
                  <h4 className="pt-1 text-sm font-semibold text-primary">{sub.subsection}</h4>
                )}
                {sub.rows.map((row, rowIndex) =>
                  row.rowLabel && row.fields.every((field) => field.style === "CALCULATOR_PANEL") ? (
                    <CalculatorPanel
                      key={`row-${rowIndex}`}
                      title={row.rowLabel}
                      fields={row.fields}
                      values={values}
                      onChange={onScalarChange}
                      onToggleMulti={onToggleMulti}
                    />
                  ) : row.rowLabel ? (
                    <div key={`row-${rowIndex}`} className="space-y-1.5">
                      {/* Uma linha que ocupa a subseção inteira não repete o título. */}
                      {row.rowLabel !== sub.subsection && (
                        <p className="text-xs font-semibold uppercase tracking-wide text-primary">{row.rowLabel}</p>
                      )}
                      <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
                        {row.fields.map((field) => (
                          <div key={field.key} className="min-w-[10rem] flex-1">
                            {renderField(field, true)}
                          </div>
                        ))}
                      </div>
                      {/* Hint de campo dentro de uma linha vai abaixo dela inteira, não espremido numa coluna. */}
                      {row.fields
                        .filter((field) => field.hint)
                        .map((field) => (
                          <p key={`${field.key}-hint`} className="whitespace-pre-line text-xs text-muted-foreground">
                            {field.hint}
                          </p>
                        ))}
                    </div>
                  ) : (
                    <div key={`row-${rowIndex}`} className="space-y-3">
                      {chunkChoiceTables(row.fields).map((chunk) =>
                        Array.isArray(chunk) ? (
                          <ChoiceTable
                            key={chunk[0].key}
                            fields={chunk}
                            values={values}
                            onChange={onScalarChange}
                          />
                        ) : (
                          renderField(chunk)
                        ),
                      )}
                    </div>
                  ),
                )}
                {slotAfterSubsection?.(sub.subsection)}
              </div>
            ))}
          </div>
        );

        if (!section.section) {
          return (
            <div key={`section-${sectionIndex}`} className="space-y-4">
              {body}
            </div>
          );
        }
        if (renderSection) {
          return <div key={section.section}>{renderSection(section.section, body)}</div>;
        }
        return (
          <div key={section.section} className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">{section.section}</p>
            {body}
          </div>
        );
      })}
    </>
  );
}

/**
 * Quadro de uma calculadora (o PREVENT da Esteatose no protótipo): grade de
 * campos pequenos, o link da calculadora oficial no canto do título e as
 * notas no rodapé. Escolha Sim/Não vira bolinha; as demais escolhas, uma lista
 * suspensa, que cabe na célula da grade. Cada campo calculado fecha a grade
 * acima dele e vira uma faixa de resultado, com "Usar resultado" quando a
 * config diz para qual campo o valor vai.
 */
function CalculatorPanel({
  title,
  fields,
  values,
  onChange,
  onToggleMulti,
}: {
  title: string;
  fields: DiseaseFieldSummary[];
  values: FieldValues;
  onChange: (key: string, value: string) => void;
  onToggleMulti: (key: string, option: string) => void;
}) {
  const links = fields.filter((f) => f.type === "LINKS").flatMap((f) => f.links ?? []);
  const notes = fields.filter((f) => f.type === "NOTE");
  const body = fields.filter((f) => f.type !== "LINKS" && f.type !== "NOTE");

  // Grades de campos separadas pelos resultados, na ordem da config.
  const blocks: (DiseaseFieldSummary | DiseaseFieldSummary[])[] = [];
  for (const field of body) {
    const last = blocks[blocks.length - 1];
    if (field.type === "COMPUTED") blocks.push(field);
    else if (Array.isArray(last)) last.push(field);
    else blocks.push([field]);
  }

  return (
    <div className="rounded-xl border border-border bg-background/40 p-3">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-primary">
          <Calculator className="h-3.5 w-3.5" /> {title}
        </p>
        {links.map((link) => (
          <a
            key={link.url}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            {link.label} <ExternalLink className="h-3 w-3" />
          </a>
        ))}
      </div>
      <div className="space-y-3">
        {blocks.map((block) =>
          Array.isArray(block) ? (
      <div key={block[0].key} className="grid grid-cols-2 gap-x-3 gap-y-3 sm:grid-cols-4">
        {block.map((field) => {
          const value = typeof values[field.key] === "string" ? (values[field.key] as string) : "";
          const options = field.options ?? [];
          const yesNo = options.length === 2 && options[0] === "Sim" && options[1] === "Não";
          if (field.type === "MULTI") {
            const marked = Array.isArray(values[field.key]) ? (values[field.key] as string[]) : [];
            return (
              <div key={field.key} className="col-span-full flex flex-wrap gap-x-4 gap-y-1.5">
                {options.map((option) => (
                  <label key={option} className="flex items-center gap-1.5 text-sm">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-primary"
                      checked={marked.includes(option)}
                      onChange={() => onToggleMulti(field.key, option)}
                    />
                    {option}
                  </label>
                ))}
              </div>
            );
          }
          return (
            // Rótulos longos quebram linha: o campo fica embaixo, alinhado com os vizinhos.
            <div key={field.key} className="flex min-w-0 flex-col justify-end">
              <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                {field.label}
              </p>
              {field.type === "SINGLE" && yesNo ? (
                <div className="flex h-9 items-center gap-3">
                  {options.map((option) => (
                    <label key={option} className="flex items-center gap-1 text-sm">
                      <input
                        type="radio"
                        name={`${field.key}-options`}
                        className="h-4 w-4 accent-primary"
                        checked={value === option}
                        onChange={() => onChange(field.key, option)}
                        // Clicar de novo na opção marcada limpa, como nos outros campos.
                        onClick={() => value === option && onChange(field.key, "")}
                      />
                      {option}
                    </label>
                  ))}
                </div>
              ) : field.type === "SINGLE" ? (
                <NativeSelect value={value} onChange={(e) => onChange(field.key, e.target.value)} className="h-9">
                  <option value="">—</option>
                  {options.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </NativeSelect>
              ) : (
                <Input
                  className="h-9"
                  inputMode={field.type === "NUMBER" ? "decimal" : undefined}
                  placeholder={field.placeholder ?? undefined}
                  value={value}
                  onChange={(e) => onChange(field.key, e.target.value)}
                />
              )}
            </div>
          );
        })}
      </div>
          ) : (
            <ResultStrip key={block.key} field={block} values={values} onChange={onChange} />
          ),
        )}
      </div>
      {notes.map((note) => (
        <p key={note.key} className="mt-3 text-[11px] text-muted-foreground">
          {note.label}
        </p>
      ))}
    </div>
  );
}

/** Resultado de uma conta dentro do quadro: texto, complemento e o botão que leva o valor ao campo de destino. */
function ResultStrip({
  field,
  values,
  onChange,
}: {
  field: DiseaseFieldSummary;
  values: FieldValues;
  onChange: (key: string, value: string) => void;
}) {
  const result = computeResult(field, values);
  const target = field.computed?.applyTo;
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-primary/30 bg-primary/5 p-2">
      {result ? (
        <>
          <div className="min-w-0 flex-1">
            <p className={`text-sm font-semibold ${result.tone ? toneClass(result.tone) : "text-primary"}`}>{result.text}</p>
            {result.detail && <p className="text-xs text-muted-foreground">{result.detail}</p>}
          </div>
          {target && result.value !== undefined && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7"
              onClick={() => onChange(target, result.value!)}
            >
              Usar resultado
            </Button>
          )}
        </>
      ) : (
        <p className="text-xs text-muted-foreground">{field.placeholder}</p>
      )}
    </div>
  );
}

/** Separa os campos de tabela de escolha seguidos (um array) dos demais (um campo cada). */
function chunkChoiceTables(fields: DiseaseFieldSummary[]): (DiseaseFieldSummary | DiseaseFieldSummary[])[] {
  const chunks: (DiseaseFieldSummary | DiseaseFieldSummary[])[] = [];
  for (const field of fields) {
    const last = chunks[chunks.length - 1];
    if (field.style === "CHOICE_TABLE" && field.type === "SINGLE") {
      if (Array.isArray(last)) last.push(field);
      else chunks.push([field]);
    } else {
      chunks.push(field);
    }
  }
  return chunks;
}

/**
 * Tabela de escolha (a estratificação de risco da CBP no protótipo): uma
 * linha por campo, uma coluna por opção, e a célula é o botão. O selo mostra
 * a pior coluna marcada — basta um item na última coluna para a
 * classificação ser a dela, como no protótipo ("qualquer item na coluna de
 * risco intermediário a alto já classifica…"). Os títulos das colunas vêm do
 * primeiro campo; a legenda pequena de cada linha, do placeholder dele.
 */
function ChoiceTable({
  fields,
  values,
  onChange,
}: {
  fields: DiseaseFieldSummary[];
  values: FieldValues;
  onChange: (key: string, value: string) => void;
}) {
  const headers = fields[0].columns?.map((c) => c.label) ?? [];
  const columnCount = Math.max(headers.length, ...fields.map((f) => f.options?.length ?? 0));
  const worst = Math.max(
    -1,
    ...fields.map((f) => (typeof values[f.key] === "string" ? (f.options ?? []).indexOf(values[f.key] as string) : -1)),
  );
  const isLast = worst === columnCount - 1 && columnCount > 1;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-start justify-between gap-2">
        {fields[0].hint && <p className="max-w-prose text-xs text-muted-foreground">{fields[0].hint}</p>}
        {worst >= 0 && headers[worst] && (
          <span
            className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
              isLast
                ? "bg-red-500/15 text-red-600 dark:text-red-400"
                : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
            }`}
          >
            {headers[worst]}
          </span>
        )}
      </div>
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="min-w-full text-xs">
          <thead className="bg-muted">
            <tr>
              <th className="px-2 py-1.5 text-left font-medium">Domínio</th>
              {Array.from({ length: columnCount }, (_, i) => (
                <th key={i} className="px-2 py-1.5 text-left font-medium">
                  {headers[i] ?? ""}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {fields.map((field) => (
              <tr key={field.key} className="border-t border-border align-top">
                <td className="px-2 py-1.5">
                  <span className="font-medium text-foreground">{field.label}</span>
                  {field.placeholder && (
                    <span className="block text-[10px] text-muted-foreground">{field.placeholder}</span>
                  )}
                </td>
                {(field.options ?? []).map((option, i) => {
                  const selected = values[field.key] === option;
                  const last = i === columnCount - 1 && columnCount > 1;
                  return (
                    <td key={option} className="p-1">
                      <button
                        type="button"
                        aria-pressed={selected}
                        onClick={() => onChange(field.key, selected ? "" : option)}
                        className={`w-full rounded-md border px-2 py-1.5 text-left transition-colors ${
                          selected
                            ? last
                              ? "border-red-400 bg-red-500/10 font-medium text-foreground"
                              : "border-emerald-400 bg-emerald-500/10 font-medium text-foreground"
                            : "border-transparent text-muted-foreground hover:border-border hover:bg-muted/60"
                        }`}
                      >
                        {option}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
