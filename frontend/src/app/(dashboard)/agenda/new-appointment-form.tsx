"use client";

import { startTransition, useActionState, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { createAppointment, type AgendaFormState } from "@/app/actions/agenda";
import type { AppointmentBilling, AppointmentDurations, AppointmentType, AvailabilitySlot } from "@/lib/api";
import { todayKey } from "@/lib/dates";
import { BILLING_OPTIONS } from "@/lib/billing";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect } from "@/components/ui/native-select";
import { DatePicker } from "@/components/date-picker";
import { TimePicker } from "@/components/time-picker";
import { PatientPicker } from "@/components/patient-picker";
import { slotDateKey, slotTime, type PickedSlot } from "@/lib/slot-time";
import { HealthPlanField } from "./health-plan-field";
import { Input } from "@/components/ui/input";
import { centsToInput } from "@/lib/money";

const initialState: AgendaFormState = {};

export function NewAppointmentForm({
  selectedDateKey,
  openSlots,
  picked,
  type,
  onTypeChange,
  onCreated,
  healthPlans,
  durations,
}: {
  /** Valores padrão do particular — o "Valor" já vem com o do tipo escolhido. */
  durations: AppointmentDurations;
  /** Convênios do perfil do médico — as opções do "Plano". */
  healthPlans: string[];
  selectedDateKey: string;
  /** Horários livres da grade — os do dia escolhido ganham destaque no seletor de hora. */
  openSlots: AvailabilitySlot[];
  /** Slot clicado na linha do tempo do dia — pré-preenche data e hora. */
  picked: PickedSlot | null;
  /** Tipo escolhido: mora na view, porque é ele que define a grade do dia inteiro. */
  type: AppointmentType;
  onTypeChange: (type: AppointmentType) => void;
  onCreated: () => void;
}) {
  const [state, formAction, pending] = useActionState(createAppointment, initialState);
  const [resetCount, setResetCount] = useState(0);
  const [date, setDate] = useState(selectedDateKey);
  const [time, setTime] = useState("09:00");
  // Controlado só para abrir o campo de plano quando for convênio.
  const [billing, setBilling] = useState<AppointmentBilling>("PARTICULAR");
  const [healthPlan, setHealthPlan] = useState("");
  /** Encaixe: marcar mesmo com o horário já ocupado (atendimento de última hora). */
  const [encaixe, setEncaixe] = useState(false);
  const defaultPrice = centsToInput(type === "RETORNO" ? durations.followUpPriceCents : durations.firstVisitPriceCents);
  const [price, setPrice] = useState(defaultPrice);
  // Trocar o tipo traz o valor padrão dele (consulta e retorno costumam diferir).
  useEffect(() => {
    setPrice(defaultPrice);
  }, [defaultPrice]);

  // Clicar um dia no calendário grande muda a data do formulário na hora —
  // não só até o primeiro submit, como era com `defaultValue`.
  useEffect(() => {
    setDate(selectedDateKey);
  }, [selectedDateKey]);

  useEffect(() => {
    if (!picked) return;
    setDate(picked.dateKey);
    setTime(picked.time);
    setEncaixe(!!picked.encaixe);
    // Em coluna única o formulário fica abaixo da lista do dia: leva até ele,
    // senão o clique no horário livre parece não fazer nada.
    if (window.matchMedia("(max-width: 1023px)").matches) {
      document.getElementById("novo-agendamento")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [picked]);

  useEffect(() => {
    if (state.success) {
      toast.success("Agendamento criado.");
      setResetCount((n) => n + 1);
      setBilling("PARTICULAR");
      setHealthPlan("");
      setPrice(defaultPrice);
      setEncaixe(false);
      onCreated();
    }
    // O conflito ganha um aviso no próprio formulário, com o botão de encaixe.
    if (state.error && !state.conflict) toast.error(state.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  /** "Encaixar mesmo assim": reenvia o que está no formulário, agora como encaixe. */
  function submitAsEncaixe() {
    const form = document.getElementById("novo-agendamento") as HTMLFormElement | null;
    if (!form) return;
    setEncaixe(true);
    const formData = new FormData(form);
    formData.set("encaixe", "true");
    startTransition(() => formAction(formData));
  }

  const gridTimes = useMemo(() => {
    const times = new Set<string>();
    for (const slot of openSlots) {
      if (slotDateKey(slot.scheduledAt) === date) times.add(slotTime(slot.scheduledAt));
    }
    return times;
  }, [openSlots, date]);

  return (
    // onSubmit em vez de `action`: com `action`, o React reseta o formulário
    // depois de cada envio — inclusive o que falhou —, e um <select>
    // controlado volta visualmente à primeira opção sem o estado saber. Foi
    // assim que um convênio sem plano, recusado, virava "Particular" no envio
    // seguinte. A limpeza depois do sucesso continua pelo `key`.
    <form
      id="novo-agendamento"
      key={resetCount}
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        startTransition(() => formAction(formData));
      }}
      className="space-y-3 rounded-lg border border-border bg-card p-5"
    >
      <h3 className="text-sm font-medium">Novo agendamento</h3>

      <div className="space-y-1.5">
        <Label>Paciente *</Label>
        <PatientPicker name="patientId" required />
      </div>

      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <div className="space-y-1.5">
          <Label>Data *</Label>
          <DatePicker name="date" value={date} onChange={setDate} min={todayKey()} />
        </div>
        <div className="space-y-1.5">
          <Label>Horário *</Label>
          <TimePicker name="time" value={time} onChange={setTime} highlighted={gridTimes} className="sm:w-32" />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Tipo</Label>
          {/* Controlado: o tipo decide a duração, e a duração decide quais
              horários a grade oferece — trocar aqui recarrega os livres. */}
          <NativeSelect name="type" value={type} onChange={(e) => onTypeChange(e.target.value as AppointmentType)}>
            <option value="PRIMEIRA_CONSULTA">Consulta</option>
            <option value="RETORNO">Retorno</option>
          </NativeSelect>
        </div>
        <div className="space-y-1.5">
          <Label>Modalidade</Label>
          <NativeSelect name="modality" defaultValue="PRESENCIAL">
            <option value="PRESENCIAL">Presencial</option>
            <option value="TELECONSULTA">Teleconsulta</option>
          </NativeSelect>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Contratação</Label>
          <NativeSelect
            name="billing"
            value={billing}
            onChange={(e) => setBilling(e.target.value as AppointmentBilling)}
          >
            {BILLING_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </NativeSelect>
        </div>
        {billing === "PARTICULAR" && (
          <div className="space-y-1.5">
            <Label>Valor (R$)</Label>
            <Input
              name="price"
              inputMode="decimal"
              placeholder="Ex.: 450,00"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </div>
        )}
        {billing === "CONVENIO" && (
          <div className="space-y-1.5">
            <Label>Plano *</Label>
            <HealthPlanField name="healthPlan" plans={healthPlans} value={healthPlan} onChange={setHealthPlan} />
            {healthPlans.length === 0 && (
              <p className="text-xs text-muted-foreground">
                Cadastre os convênios em Meu perfil para escolher de uma lista.
              </p>
            )}
          </div>
        )}
      </div>

      <div className="space-y-1.5">
        <Label>Observações</Label>
        <Textarea name="notes" rows={3} />
      </div>

      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          checked={encaixe}
          onChange={(e) => setEncaixe(e.target.checked)}
          className="mt-0.5 h-4 w-4 accent-primary"
        />
        <span>
          Encaixe
          <span className="block text-xs text-muted-foreground">
            Marca mesmo que o horário já tenha outro paciente.
          </span>
        </span>
      </label>
      <input type="hidden" name="encaixe" value={encaixe ? "true" : "false"} readOnly />

      {state.conflict && !encaixe && !pending && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          <span>Esse horário já tem outro agendamento.</span>
          <Button type="button" size="sm" variant="outline" onClick={submitAsEncaixe}>
            Encaixar mesmo assim
          </Button>
        </div>
      )}

      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? "Agendando…" : "Agendar"}
        </Button>
      </div>
    </form>
  );
}
