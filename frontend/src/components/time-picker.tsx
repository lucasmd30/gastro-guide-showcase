"use client";

import { useEffect, useRef, useState } from "react";
import { Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const STEP_MINUTES = 15;
const FIRST_HOUR = 6;
const LAST_HOUR = 22;

/** `06:00`, `06:15`, …, `21:45`. */
const TIMES: string[] = [];
for (let minute = FIRST_HOUR * 60; minute < LAST_HOUR * 60; minute += STEP_MINUTES) {
  TIMES.push(`${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`);
}

/**
 * Hora do agendamento manual: uma coluna rolável de 15 em 15 min, como o
 * operador do iClinic vê. Os horários da grade livre do dia (`highlighted`)
 * ganham destaque; os demais continuam clicáveis — a secretária encaixa
 * fora da grade quando precisa.
 */
export function TimePicker({
  value,
  onChange,
  highlighted,
  name,
  className,
}: {
  value: string;
  onChange: (time: string) => void;
  /** Horários `HH:mm` que a grade oferece nesse dia. */
  highlighted: Set<string>;
  name?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const selectedRef = useRef<HTMLButtonElement>(null);

  // Abre já com o horário atual à vista, em vez de no topo da lista. O
  // conteúdo do Popover monta num portal depois do `open`, por isso o
  // frame seguinte — no mesmo tick o botão ainda não existe.
  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => selectedRef.current?.scrollIntoView({ block: "center" }));
    return () => cancelAnimationFrame(frame);
  }, [open]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      {name && <input type="hidden" name={name} value={value} />}
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn("w-full justify-start font-normal", !value && "text-muted-foreground", className)}
        >
          <Clock className="text-muted-foreground" />
          {value || "Escolha o horário"}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-1" align="start">
        <div className="max-h-64 overflow-y-auto">
          {TIMES.map((time) => {
            const isSelected = time === value;
            const inGrid = highlighted.has(time);
            return (
              <button
                key={time}
                ref={isSelected ? selectedRef : undefined}
                type="button"
                onClick={() => {
                  onChange(time);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center justify-between rounded-md px-3 py-1.5 text-sm transition-colors hover:bg-accent",
                  isSelected && "bg-primary text-primary-foreground hover:bg-primary",
                )}
              >
                <span className={cn(inGrid && !isSelected && "font-medium text-primary")}>{time}</span>
                {inGrid && (
                  <span
                    className={cn(
                      "flex items-center gap-1 text-[10px] uppercase tracking-wide",
                      isSelected ? "text-primary-foreground/80" : "text-primary",
                    )}
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-current" />
                    grade
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
