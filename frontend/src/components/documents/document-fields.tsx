"use client";

import type { DocField } from "@/lib/document-models";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/date-picker";

/**
 * Os campos de um modelo de documento (dias de afastamento, destino do
 * encaminhamento…), que montam o texto. Compartilhado entre a tela Documentos
 * e o painel de documentos dentro do prontuário, para os dois não divergirem.
 */
export function DocumentFields({
  fields,
  values,
  onChange,
}: {
  /** Já filtrados por `showIf`. */
  fields: DocField[];
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {fields.map((f) => (
        <div key={f.key} className={f.type === "textarea" ? "space-y-1 sm:col-span-2" : "space-y-1"}>
          <Label className="text-xs">{f.label}</Label>
          {f.type === "select" ? (
            <NativeSelect
              value={values[f.key] ?? f.options?.[0]?.value ?? ""}
              onChange={(e) => onChange(f.key, e.target.value)}
            >
              {(f.options ?? []).map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </NativeSelect>
          ) : f.type === "textarea" ? (
            <Textarea
              rows={3}
              value={values[f.key] ?? ""}
              placeholder={f.placeholder}
              onChange={(e) => onChange(f.key, e.target.value)}
            />
          ) : f.type === "date" ? (
            <DatePicker value={values[f.key] ?? ""} onChange={(v) => onChange(f.key, v)} />
          ) : (
            <Input
              type={f.type ?? "text"}
              inputMode={f.type === "number" ? "numeric" : undefined}
              value={values[f.key] ?? ""}
              placeholder={f.placeholder}
              onChange={(e) => onChange(f.key, e.target.value)}
            />
          )}
        </div>
      ))}
    </div>
  );
}
