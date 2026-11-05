"use client";

import { getDefaultClassNames, type DateRange } from "react-day-picker";
import { Calendar } from "@/components/ui/calendar";
import { formatDateKey, parseDateKey, toDateKey } from "@/lib/dates";
import { cn } from "@/lib/utils";

/**
 * Os dois meses ficam lado a lado só quando cabem: num tablet com a barra
 * lateral aberta a área útil tem ~500px e, presos a um breakpoint de tela, eles
 * passavam da borda. Com wrap, o segundo mês desce para baixo do primeiro.
 */
const MONTHS_CLASS = cn("relative flex flex-wrap gap-4", getDefaultClassNames().months);

/**
 * Período de datas com o calendário inline — nos formulários de janela e
 * bloqueio ele é o centro da tela, não um detalhe atrás de um botão. Um
 * clique só = um dia (início e fim iguais). Emite hidden inputs
 * `startDate`/`endDate` para as Server Actions.
 */
export function DateRangePicker({
  from,
  to,
  onChange,
  min,
  /** Com fim desligado (janela "sem data de fim"), só o início é escolhido. */
  openEnded = false,
  /** Quantos meses lado a lado (o fechamento de agenda usa 1). */
  months = 2,
}: {
  from: string;
  to: string;
  onChange: (range: { from: string; to: string }) => void;
  min?: string;
  openEnded?: boolean;
  months?: number;
}) {
  const selected: DateRange | undefined = from
    ? { from: parseDateKey(from), to: to ? parseDateKey(to) : undefined }
    : undefined;
  const disabled = min ? { before: parseDateKey(min) } : undefined;

  const summary = !from
    ? "Clique no dia de início e depois no dia de fim."
    : openEnded
      ? `A partir de ${formatDateKey(from)}, sem data de fim.`
      : !to || to === from
        ? `Dia ${formatDateKey(from)}.`
        : `De ${formatDateKey(from)} a ${formatDateKey(to)}.`;

  return (
    <div className="space-y-2">
      <input type="hidden" name="startDate" value={from} />
      <input type="hidden" name="endDate" value={openEnded ? "" : to} />
      <div className={cn("rounded-lg border border-border", months === 1 && "w-fit max-w-full")}>
        {openEnded ? (
          <Calendar
            mode="single"
            selected={selected?.from}
            defaultMonth={selected?.from}
            disabled={disabled}
            onSelect={(date) => {
              if (!date) return;
              const key = toDateKey(date);
              onChange({ from: key, to: key });
            }}
          />
        ) : (
          <Calendar
            mode="range"
            numberOfMonths={months}
            classNames={{ months: MONTHS_CLASS }}
            selected={selected}
            defaultMonth={selected?.from}
            disabled={disabled}
            onSelect={(range) => {
              const start = range?.from ? toDateKey(range.from) : "";
              const end = range?.to ? toDateKey(range.to) : start;
              onChange({ from: start, to: end });
            }}
          />
        )}
      </div>
      <p className="text-xs text-muted-foreground">{summary}</p>
    </div>
  );
}
