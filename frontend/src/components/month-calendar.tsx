"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const WEEKDAY_LABELS = ["D", "S", "T", "Q", "Q", "S", "S"];
const MONTH_LABELS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

function toDateKey(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function MonthCalendar({
  year,
  month,
  selectedDateKey,
  markedDateKeys,
  selectableDateKeys,
  availableDateKeys,
  onSelectDate,
  onNavigateMonth,
}: {
  year: number;
  month: number;
  selectedDateKey: string;
  markedDateKeys: Set<string>;
  /**
   * Quando presente, só estes dias são clicáveis — é o caso do paciente
   * escolhendo horário, em que a maior parte do mês não tem vaga. Ausente
   * (agenda do médico) mantém o mês inteiro clicável.
   */
  selectableDateKeys?: Set<string>;
  /**
   * Dias com horário livre na grade de atendimento (agenda do médico):
   * ficam verdes, como no protótipo, e a legenda aparece. Ausente, nada
   * é destacado.
   */
  availableDateKeys?: Set<string>;
  onSelectDate: (dateKey: string) => void;
  onNavigateMonth: (deltaMonths: number) => void;
}) {
  const firstOfMonth = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startWeekday = firstOfMonth.getDay();
  const todayKey = toDateKey(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());

  const cells: (number | null)[] = [
    ...Array.from({ length: startWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <Button type="button" variant="ghost" size="sm" onClick={() => onNavigateMonth(-1)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm font-medium">
          {MONTH_LABELS[month]} {year}
        </span>
        <Button type="button" variant="ghost" size="sm" onClick={() => onNavigateMonth(1)}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
        {WEEKDAY_LABELS.map((label, i) => (
          <div key={i} className="py-1">
            {label}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (day === null) return <div key={i} />;
          const dateKey = toDateKey(year, month, day);
          const isSelected = dateKey === selectedDateKey;
          const isToday = dateKey === todayKey;
          const hasAppointment = markedDateKeys.has(dateKey);
          const disabled = selectableDateKeys != null && !selectableDateKeys.has(dateKey);
          const available = !isSelected && (availableDateKeys?.has(dateKey) ?? false);
          return (
            <button
              key={i}
              type="button"
              disabled={disabled}
              onClick={() => onSelectDate(dateKey)}
              className={`relative rounded-md py-1.5 text-sm transition-colors ${
                disabled ? "cursor-not-allowed text-muted-foreground/40" : "hover:bg-accent/60"
              } ${isSelected ? "bg-primary text-primary-foreground hover:bg-primary" : ""} ${
                available ? "bg-emerald-100 text-emerald-900 hover:bg-emerald-200" : ""
              } ${isToday && !isSelected && !disabled && !available ? "font-semibold text-primary" : ""}`}
            >
              {day}
              {hasAppointment && (
                <span
                  className={`absolute bottom-0.5 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full ${
                    isSelected ? "bg-primary-foreground" : availableDateKeys ? "bg-amber-500" : "bg-primary"
                  }`}
                />
              )}
            </button>
          );
        })}
      </div>
      {availableDateKeys && (
        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3 w-3 rounded bg-emerald-200" /> Dia com horário livre
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> Consulta agendada
          </span>
        </div>
      )}
    </div>
  );
}
