"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { listAppointmentsForRange, listOpenSlotsForRange } from "@/app/actions/agenda";
import type { Appointment, AppointmentDurations, AppointmentType, AvailabilitySlot } from "@/lib/api";
import { slotDateKey, type PickedSlot } from "@/lib/slot-time";
import { MonthCalendar } from "@/components/month-calendar";
import { NewAppointmentForm } from "./new-appointment-form";
import { DayList } from "./day-list";

function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function startOfLocalDayUtcIso(dateKey: string): string {
  return new Date(`${dateKey}T00:00:00-03:00`).toISOString();
}

function endOfLocalDayUtcIso(dateKey: string): string {
  return new Date(`${dateKey}T23:59:59-03:00`).toISOString();
}

export function AgendaView({
  healthPlans,
  durations,
}: {
  healthPlans: string[];
  /** Valores padrão do particular por tipo — pré-preenchem o "Valor". */
  durations: AppointmentDurations;
}) {
  const today = useMemo(() => new Date(), []);
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDateKey, setSelectedDateKey] = useState(toDateKey(today));
  const [monthAppointments, setMonthAppointments] = useState<Appointment[]>([]);
  const [monthSlots, setMonthSlots] = useState<AvailabilitySlot[]>([]);
  const [dayAppointments, setDayAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);
  const [picked, setPicked] = useState<PickedSlot | null>(null);
  // O tipo mora aqui porque decide a duração e, com ela, quais horários a
  // grade oferece — calendário, linha do dia e seletor de hora seguem junto.
  const [type, setType] = useState<AppointmentType>("PRIMEIRA_CONSULTA");

  const monthRange = useMemo(() => {
    const lastDay = new Date(year, month + 1, 0).getDate();
    const mm = String(month + 1).padStart(2, "0");
    return {
      from: startOfLocalDayUtcIso(`${year}-${mm}-01`),
      to: endOfLocalDayUtcIso(`${year}-${mm}-${String(lastDay).padStart(2, "0")}`),
    };
  }, [year, month]);

  const loadMonth = useCallback(async () => {
    try {
      setMonthAppointments(await listAppointmentsForRange(monthRange.from, monthRange.to));
    } catch {
      toast.error("Não foi possível carregar a agenda do mês.");
    }
  }, [monthRange]);

  // A grade livre do mês visível: dias verdes no calendário, linhas
  // "horário livre" do dia e destaque no seletor de hora. Falhar aqui não
  // bloqueia a agenda — só some a grade.
  const loadSlots = useCallback(async () => {
    try {
      setMonthSlots(await listOpenSlotsForRange(type, monthRange.from, monthRange.to));
    } catch {
      setMonthSlots([]);
    }
  }, [monthRange, type]);

  const loadDay = useCallback(async () => {
    setLoading(true);
    const from = startOfLocalDayUtcIso(selectedDateKey);
    const to = endOfLocalDayUtcIso(selectedDateKey);
    try {
      setDayAppointments(await listAppointmentsForRange(from, to));
    } catch {
      toast.error("Não foi possível carregar os agendamentos do dia.");
    } finally {
      setLoading(false);
    }
  }, [selectedDateKey]);

  useEffect(() => {
    loadMonth();
  }, [loadMonth]);

  useEffect(() => {
    loadSlots();
  }, [loadSlots]);

  useEffect(() => {
    loadDay();
  }, [loadDay]);

  const markedDateKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const appt of monthAppointments) {
      keys.add(toDateKey(new Date(appt.scheduledAt)));
    }
    return keys;
  }, [monthAppointments]);

  const availableDateKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const slot of monthSlots) keys.add(slotDateKey(slot.scheduledAt));
    return keys;
  }, [monthSlots]);

  const daySlots = useMemo(
    () => monthSlots.filter((slot) => slotDateKey(slot.scheduledAt) === selectedDateKey),
    [monthSlots, selectedDateKey],
  );

  const refresh = useCallback(() => {
    loadMonth();
    loadDay();
    loadSlots();
  }, [loadMonth, loadDay, loadSlots]);

  return (
    // No celular e no tablet (coluna única) o calendário e o dia vêm antes do
    // formulário — é o que se consulta o tempo todo; no computador o
    // formulário fica à esquerda, como sempre.
    <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
      <div className="order-2 space-y-4 lg:order-1">
        <NewAppointmentForm
          selectedDateKey={selectedDateKey}
          openSlots={monthSlots}
          picked={picked}
          type={type}
          onTypeChange={setType}
          onCreated={refresh}
          healthPlans={healthPlans}
          durations={durations}
        />
      </div>
      <div className="order-1 space-y-4 lg:order-2">
        <MonthCalendar
          year={year}
          month={month}
          selectedDateKey={selectedDateKey}
          markedDateKeys={markedDateKeys}
          availableDateKeys={availableDateKeys}
          onSelectDate={setSelectedDateKey}
          onNavigateMonth={(delta) => {
            const next = new Date(year, month + delta, 1);
            setYear(next.getFullYear());
            setMonth(next.getMonth());
          }}
        />
        <DayList
          dateKey={selectedDateKey}
          appointments={dayAppointments}
          slots={daySlots}
          loading={loading}
          onChanged={refresh}
          healthPlans={healthPlans}
          durations={durations}
          onPickSlot={(time, encaixe) =>
            setPicked((prev) => ({ dateKey: selectedDateKey, time, seq: (prev?.seq ?? 0) + 1, encaixe }))
          }
        />
      </div>
    </div>
  );
}
