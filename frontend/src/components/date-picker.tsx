"use client";

import { useState } from "react";
import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { formatDateKeyWithWeekday, parseDateKey, toDateKey } from "@/lib/dates";

/**
 * Data única num popover, no lugar do `<input type="date">` do navegador.
 * Trabalha com chave `YYYY-MM-DD`; com `name`, emite um hidden input para
 * continuar servindo os `<form action>` das Server Actions.
 */
export function DatePicker({
  value,
  onChange,
  min,
  name,
  placeholder = "Escolha a data",
  className,
}: {
  value: string;
  onChange: (dateKey: string) => void;
  min?: string;
  name?: string;
  placeholder?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = value ? parseDateKey(value) : undefined;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      {name && <input type="hidden" name={name} value={value} />}
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn("w-full justify-start font-normal", !value && "text-muted-foreground", className)}
        >
          <CalendarIcon className="text-muted-foreground" />
          {value ? formatDateKeyWithWeekday(value) : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          defaultMonth={selected}
          disabled={min ? { before: parseDateKey(min) } : undefined}
          onSelect={(date) => {
            if (!date) return;
            onChange(toDateKey(date));
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
