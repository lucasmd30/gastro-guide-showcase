"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AvailabilityRule, Weekday } from "@/lib/api";

/** "08:00:00" → "08:00"; o input `type=time` não aceita segundos. */
const hhmm = (time?: string) => (time ? time.slice(0, 5) : undefined);

export const WEEKDAYS: { value: Weekday; label: string; short: string }[] = [
  { value: "MONDAY", label: "Segunda-feira", short: "Seg" },
  { value: "TUESDAY", label: "Terça-feira", short: "Ter" },
  { value: "WEDNESDAY", label: "Quarta-feira", short: "Qua" },
  { value: "THURSDAY", label: "Quinta-feira", short: "Qui" },
  { value: "FRIDAY", label: "Sexta-feira", short: "Sex" },
  { value: "SATURDAY", label: "Sábado", short: "Sáb" },
  { value: "SUNDAY", label: "Domingo", short: "Dom" },
];

export const WEEKDAY_LABEL = Object.fromEntries(WEEKDAYS.map((d) => [d.value, d.label])) as Record<Weekday, string>;

/**
 * Os campos de uma faixa (dia da semana + início + fim). Servem para criar
 * (janela nova ou "Adicionar faixa", onde cada dia marcado vira uma faixa)
 * e, com `current`, para editar uma faixa existente.
 */
export function RuleFields({ current }: { current?: AvailabilityRule }) {
  return (
    <>
      <div className="space-y-1.5">
        <Label>{current ? "Dia da semana" : "Dias da semana"}</Label>
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          {WEEKDAYS.map((day) => (
            <label key={day.value} className="flex items-center gap-1.5 text-sm">
              {/* Editando uma faixa é rádio: ela é uma linha por dia, então
                  não faria sentido marcar dois. Criando, é checkbox — um
                  POST por dia marcado. */}
              <input
                type={current ? "radio" : "checkbox"}
                name="weekday"
                value={day.value}
                defaultChecked={current?.weekday === day.value}
                className="h-4 w-4 accent-primary"
              />
              <span>{day.short}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Início</Label>
          <Input name="startTime" type="time" required defaultValue={hhmm(current?.startTime) ?? "08:00"} />
        </div>
        <div className="space-y-1.5">
          <Label>Fim</Label>
          <Input name="endTime" type="time" required defaultValue={hhmm(current?.endTime) ?? "12:00"} />
        </div>
      </div>
    </>
  );
}
