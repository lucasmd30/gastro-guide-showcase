"use client";

import { useMemo, useState } from "react";
import type { AvailabilitySlot } from "@/lib/api";
import { MonthCalendar } from "@/components/month-calendar";

const TIME_ZONE = "America/Sao_Paulo";

/**
 * Dia do slot no fuso do consultório, no formato `YYYY-MM-DD` que o
 * MonthCalendar usa como chave. O `en-CA` é o atalho para esse formato — o
 * ponto aqui é o `timeZone`, que faz um horário das 23h de Brasília cair no
 * dia certo mesmo para um paciente com o celular em outro fuso.
 */
const DATE_KEY_FORMAT = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function toDateKey(iso: string) {
  return DATE_KEY_FORMAT.format(new Date(iso));
}

function timeLabel(iso: string) {
  return new Date(iso).toLocaleTimeString("pt-BR", {
    timeZone: TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
  });
}

function longDayLabel(dateKey: string) {
  // Meio-dia UTC evita que a conversão para o fuso local puxe a data para o
  // dia anterior — só a data importa aqui, não a hora.
  return new Date(`${dateKey}T12:00:00Z`).toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });
}

/**
 * Escolha do horário sobre um calendário mensal, em vez de uma lista
 * cronológica: marcar consulta para daqui a algumas semanas era uma rolagem
 * longa, agora é trocar de mês e clicar no dia.
 */
export function SlotPicker({
  slots,
  selected,
  onSelect,
}: {
  slots: AvailabilitySlot[];
  selected: string;
  onSelect: (scheduledAt: string) => void;
}) {
  const slotsByDay = useMemo(() => {
    const map = new Map<string, AvailabilitySlot[]>();
    for (const slot of slots) {
      const key = toDateKey(slot.scheduledAt);
      const existing = map.get(key);
      if (existing) existing.push(slot);
      else map.set(key, [slot]);
    }
    return map;
  }, [slots]);

  const firstDayKey = slots.length > 0 ? toDateKey(slots[0].scheduledAt) : "";

  // Abre já no primeiro mês que tem vaga: se a agenda só reabre no mês que
  // vem, o paciente não cai num calendário todo apagado.
  const [cursor, setCursor] = useState(() => {
    const base = firstDayKey ? new Date(`${firstDayKey}T12:00:00Z`) : new Date();
    return { year: base.getUTCFullYear(), month: base.getUTCMonth() };
  });
  const [selectedDay, setSelectedDay] = useState(firstDayKey);

  const daySlots = slotsByDay.get(selectedDay) ?? [];

  function navigateMonth(delta: number) {
    setCursor((current) => {
      const next = new Date(Date.UTC(current.year, current.month + delta, 1));
      return { year: next.getUTCFullYear(), month: next.getUTCMonth() };
    });
  }

  return (
    <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_11rem]">
      <MonthCalendar
        year={cursor.year}
        month={cursor.month}
        selectedDateKey={selectedDay}
        markedDateKeys={new Set(slotsByDay.keys())}
        selectableDateKeys={new Set(slotsByDay.keys())}
        onSelectDate={(dateKey) => {
          setSelectedDay(dateKey);
          onSelect("");
        }}
        onNavigateMonth={navigateMonth}
      />

      <div className="rounded-lg border border-border bg-card p-3">
        {selectedDay ? (
          <>
            <p className="mb-2 text-xs font-medium text-muted-foreground first-letter:uppercase">
              {longDayLabel(selectedDay)}
            </p>
            <div className="flex max-h-72 flex-col gap-1.5 overflow-y-auto">
              {daySlots.map((slot) => {
                const active = selected === slot.scheduledAt;
                return (
                  <button
                    key={slot.scheduledAt}
                    type="button"
                    onClick={() => onSelect(active ? "" : slot.scheduledAt)}
                    className={
                      active
                        ? "rounded-md bg-primary py-1.5 text-sm font-medium text-primary-foreground"
                        : "rounded-md bg-muted py-1.5 text-sm text-muted-foreground hover:bg-muted/70"
                    }
                  >
                    {timeLabel(slot.scheduledAt)}
                  </button>
                );
              })}
            </div>
          </>
        ) : (
          <p className="text-xs text-muted-foreground">Escolha um dia marcado no calendário.</p>
        )}
      </div>
    </div>
  );
}
