"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  updateAppointmentStatus,
  updateAppointmentBilling,
  deleteAppointment,
  listOpenSlotsForRange,
  rescheduleAppointment,
  type AgendaFormState,
} from "@/app/actions/agenda";
import { ArrowRightLeft, CalendarClock, Link2, MapPin, Plus, Video, Wallet, X } from "lucide-react";
import { DatePicker } from "@/components/date-picker";
import { TimePicker } from "@/components/time-picker";
import { ConsultationLinkButton } from "@/components/consultation-link-button";
import type {
  Appointment,
  AppointmentBilling,
  AppointmentDurations,
  AppointmentModality,
  AppointmentStatus,
  AvailabilitySlot,
} from "@/lib/api";
import { BILLING_OPTIONS, billingLabel } from "@/lib/billing";
import { HealthPlanField } from "./health-plan-field";
import { Input } from "@/components/ui/input";
import { centsToInput } from "@/lib/money";
import { slotDateKey, slotTime } from "@/lib/slot-time";
import { closeSlot } from "@/app/actions/disponibilidade";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";

const TYPE_LABELS: Record<string, string> = {
  PRIMEIRA_CONSULTA: "Consulta",
  RETORNO: "Retorno",
};

/**
 * Presencial e teleconsulta ficam em cores diferentes na linha do tempo:
 * ao abrir o dia, o médico precisa ver de relance o que vai passar.
 */
const MODALITY_STYLES: Record<AppointmentModality, { row: string; chip: string; label: string }> = {
  PRESENCIAL: {
    row: "border-amber-200 bg-amber-50",
    chip: "bg-amber-200/80 text-amber-900",
    label: "Presencial",
  },
  TELECONSULTA: {
    row: "border-sky-200 bg-sky-50",
    chip: "bg-sky-200/80 text-sky-900",
    label: "Teleconsulta",
  },
};

/** Cancelado e falta não seguram o horário (mesma regra do backend, AppointmentStatus.occupiesSlot). */
function occupiesSlot(status: AppointmentStatus): boolean {
  return status !== "CANCELADO" && status !== "FALTOU";
}

/** "sex., 10/10 às 11:00" — para os avisos de remarcação. */
function whenLabel(date: string, time: string): string {
  const [year, month, day] = date.split("-").map(Number);
  const weekday = new Date(year, month - 1, day).toLocaleDateString("pt-BR", { weekday: "short" });
  return `${weekday} ${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")} às ${time}`;
}

const STATUS_LABELS: Record<AppointmentStatus, string> = {
  AGENDADO: "Agendado",
  CONFIRMADO: "Confirmado",
  ATENDIDO: "Atendido",
  FALTOU: "Faltou",
  CANCELADO: "Cancelado",
};

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  });
}

function formatDateHeading(dateKey: string): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });
}

/** A linha do tempo do dia: consultas marcadas e, entre elas, os horários que a grade ainda oferece. */
type TimelineEntry =
  | { kind: "appointment"; at: string; appointment: Appointment }
  | { kind: "free"; at: string; slot: AvailabilitySlot };

export function DayList({
  dateKey,
  appointments,
  slots,
  loading,
  onChanged,
  onPickSlot,
  healthPlans,
  durations,
}: {
  /** Valores padrão do particular, para o editor de contratação. */
  durations: AppointmentDurations;
  /** Convênios do perfil do médico — as opções do "Plano" no editor de contratação. */
  healthPlans: string[];
  dateKey: string;
  appointments: Appointment[];
  /** Horários livres da grade nesse dia — viram linhas "Horário livre" clicáveis. */
  slots: AvailabilitySlot[];
  loading: boolean;
  onChanged: () => void;
  /** `encaixe`: o horário veio de uma consulta, então já está ocupado. */
  onPickSlot: (time: string, encaixe?: boolean) => void;
}) {
  const timeline: TimelineEntry[] = [
    ...appointments.map((appointment): TimelineEntry => ({ kind: "appointment", at: appointment.scheduledAt, appointment })),
    ...slots.map((slot): TimelineEntry => ({ kind: "free", at: slot.scheduledAt, slot })),
  ].sort((a, b) => a.at.localeCompare(b.at));

  return (
    <div className="space-y-3 rounded-lg border border-border bg-card p-5">
      <div className="flex items-baseline justify-between">
        <h3 className="text-sm font-medium first-letter:uppercase">{formatDateHeading(dateKey)}</h3>
        <span className="text-xs text-muted-foreground">
          {appointments.length} agendada{appointments.length === 1 ? "" : "s"} · {slots.length} livre
          {slots.length === 1 ? "" : "s"}
        </span>
      </div>

      {loading && <p className="text-sm text-muted-foreground">Carregando…</p>}
      {!loading && timeline.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Nenhum agendamento nem horário livre nesse dia. A grade vem da Disponibilidade, no menu ao lado.
        </p>
      )}

      <div className="space-y-2">
        {timeline.map((entry) =>
          entry.kind === "appointment" ? (
            <AppointmentRow
              key={entry.appointment.id}
              appointment={entry.appointment}
              healthPlans={healthPlans}
              durations={durations}
              onChanged={onChanged}
              onEncaixe={() => onPickSlot(slotTime(entry.appointment.scheduledAt), true)}
            />
          ) : (
            <FreeSlotRow
              key={entry.at}
              slot={entry.slot}
              movable={appointments.filter(
                (a) => (a.status === "AGENDADO" || a.status === "CONFIRMADO") && a.scheduledAt !== entry.at,
              )}
              onPick={onPickSlot}
              onChanged={onChanged}
            />
          ),
        )}
      </div>
    </div>
  );
}

function FreeSlotRow({
  slot,
  movable,
  onPick,
  onChanged,
}: {
  slot: AvailabilitySlot;
  /** Consultas do dia que podem vir para este horário (agendadas ou confirmadas). */
  movable: Appointment[];
  onPick: (time: string) => void;
  onChanged: () => void;
}) {
  const time = slotTime(slot.scheduledAt);
  const [removing, startRemove] = useTransition();
  const [choosing, setChoosing] = useState(false);
  const [moving, startMove] = useTransition();

  // "Mover paciente para cá": o caso de quem faltou — o horário vira livre e
  // o médico puxa o próximo paciente para ele, sem abrir formulário nenhum.
  function moveHere(appointment: Appointment) {
    const date = slotDateKey(slot.scheduledAt);
    startMove(async () => {
      const result = await rescheduleAppointment(appointment.id, date, time);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(`${appointment.patientName} remarcado(a) para ${whenLabel(date, time)}. Avise o paciente.`);
      setChoosing(false);
      onChanged();
    });
  }

  // O "X" fecha só este horário (vira um fechamento de agenda por horas
  // naquela data); desfazer é apagar o fechamento em Disponibilidade.
  function remove() {
    const endTime = slotTime(new Date(new Date(slot.scheduledAt).getTime() + slot.durationMin * 60_000).toISOString());
    startRemove(async () => {
      const result = await closeSlot(slotDateKey(slot.scheduledAt), time, endTime);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Horário removido. Para desfazer, apague o fechamento em Disponibilidade.");
      onChanged();
    });
  }

  return (
    <div className="rounded-lg border border-emerald-200 bg-emerald-50 transition-colors hover:bg-emerald-100">
      <div className="flex w-full items-center gap-1 pr-1">
        <button
          type="button"
          onClick={() => onPick(time)}
          className="flex flex-1 items-center gap-3 px-3 py-2 text-left"
        >
          <span className="min-w-[58px] rounded-md bg-emerald-200/70 px-2 py-1 text-center font-mono text-sm font-semibold text-emerald-900">
            {time}
          </span>
          <span className="text-sm text-emerald-900">Horário livre · {slot.durationMin} min</span>
          <Plus className="ml-auto h-4 w-4 text-emerald-700" />
        </button>
        {movable.length > 0 && (
          <button
            type="button"
            onClick={() => setChoosing((v) => !v)}
            title="Mover um paciente do dia para este horário"
            aria-label="Mover um paciente do dia para este horário"
            aria-expanded={choosing}
            className="rounded-md p-1.5 text-emerald-700 transition-colors hover:bg-emerald-200/70"
          >
            <ArrowRightLeft className="h-4 w-4" />
          </button>
        )}
        <button
          type="button"
          onClick={remove}
          disabled={removing}
          title="Remover este horário da agenda"
          aria-label="Remover este horário da agenda"
          className="rounded-md p-1.5 text-emerald-700 transition-colors hover:bg-emerald-200/70 hover:text-destructive disabled:opacity-50"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      {choosing && (
        <div className="space-y-1.5 border-t border-emerald-200 px-3 py-2">
          <p className="text-xs font-medium text-emerald-900">Trazer para as {time}:</p>
          <div className="flex flex-wrap gap-1.5">
            {movable.map((appointment) => (
              <button
                key={appointment.id}
                type="button"
                onClick={() => moveHere(appointment)}
                disabled={moving}
                className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-background px-3 py-1 text-xs text-foreground transition-colors hover:border-emerald-500 hover:bg-emerald-100 disabled:opacity-50"
              >
                <span className="font-mono font-semibold">{formatTime(appointment.scheduledAt)}</span>
                <span>{appointment.patientName}</span>
                <span className="text-muted-foreground">· {appointment.durationMin} min</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function AppointmentRow({
  appointment,
  healthPlans,
  durations,
  onChanged,
  onEncaixe,
}: {
  appointment: Appointment;
  healthPlans: string[];
  durations: AppointmentDurations;
  onChanged: () => void;
  /** Leva o horário desta consulta ao formulário de novo agendamento, como encaixe. */
  onEncaixe: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [confirmReady, setConfirmReady] = useState(false);
  const [showLink, setShowLink] = useState(false);
  const [editingBilling, setEditingBilling] = useState(false);
  const [rescheduling, setRescheduling] = useState(false);
  const billing = billingLabel(appointment.billing, appointment.healthPlan, appointment.priceCents);
  const [deleteState, deleteAction, deletePending] = useActionState(
    deleteAppointment.bind(null, appointment.id),
    {} as AgendaFormState,
  );

  useEffect(() => {
    if (deleteState.success) onChanged();
    if (deleteState.error) toast.error(deleteState.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deleteState]);

  useEffect(() => {
    if (!confirming) {
      setConfirmReady(false);
      return;
    }
    // Mesmo achado do paciente: "Remover" e "Confirmar" ocupam a mesma
    // posição, então um duplo-clique comum contorna a confirmação.
    const timer = setTimeout(() => setConfirmReady(true), 400);
    return () => clearTimeout(timer);
  }, [confirming]);

  async function handleStatusChange(status: AppointmentStatus) {
    const result = await updateAppointmentStatus(appointment.id, status);
    if (result.error) toast.error(result.error);
    else onChanged();
  }

  const modality = MODALITY_STYLES[appointment.modality] ?? MODALITY_STYLES.PRESENCIAL;
  const ModalityIcon = appointment.modality === "TELECONSULTA" ? Video : MapPin;
  // Consulta marcada pela secretária: o link leva o paciente a ver a consulta
  // e completar o cadastro, sem escolher horário. Só faz sentido para uma
  // consulta que ainda vai acontecer — é ela que o link mostra.
  const canSendLink =
    (appointment.status === "AGENDADO" || appointment.status === "CONFIRMADO") &&
    new Date(appointment.scheduledAt).getTime() > Date.now();
  // Encaixe só onde ainda dá para atender: a consulta segura o horário e não terminou.
  const canEncaixe =
    occupiesSlot(appointment.status) &&
    new Date(appointment.scheduledAt).getTime() + appointment.durationMin * 60_000 > Date.now();

  return (
    // Falta e cancelamento ficam esmaecidos: continuam registrados, mas o
    // horário já está livre (aparece como "Horário livre" ao lado).
    <div
      className={`flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm ${modality.row} ${
        occupiesSlot(appointment.status) ? "" : "opacity-60"
      }`}
    >
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <span className={`min-w-[58px] rounded-md px-2 py-1 text-center font-mono font-semibold ${modality.chip}`}>
            {formatTime(appointment.scheduledAt)}
          </span>
          <Link
            href={`/pacientes/${appointment.patientId}`}
            title="Abrir a ficha do paciente"
            className="font-medium underline-offset-2 hover:text-primary hover:underline"
          >
            {appointment.patientName}
          </Link>
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${modality.chip}`}>
            <ModalityIcon className="h-3 w-3" />
            {modality.label}
          </span>
          <span className="text-xs uppercase text-muted-foreground">
            {TYPE_LABELS[appointment.type]} · {appointment.durationMin} min
          </span>
          {appointment.encaixe && (
            <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-800">Encaixe</span>
          )}
          <button
            type="button"
            onClick={() => setEditingBilling((v) => !v)}
            title="Alterar contratação"
            className={
              billing
                ? "inline-flex items-center gap-1 rounded-full border border-border bg-background/70 px-2 py-0.5 text-xs text-foreground hover:bg-background"
                : "inline-flex items-center gap-1 rounded-full border border-dashed border-muted-foreground/50 px-2 py-0.5 text-xs text-muted-foreground hover:bg-background/70"
            }
          >
            <Wallet className="h-3 w-3" />
            {billing ?? "Contratação não informada"}
          </button>
        </div>
        {appointment.notes && (
          <p className="mt-0.5 text-xs text-muted-foreground">{appointment.notes}</p>
        )}
      </div>
      <div className="flex items-center gap-2">
        {canSendLink && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowLink((v) => !v)}
            title="Link para o paciente conferir a consulta e completar o cadastro"
          >
            <Link2 className="mr-1 h-3.5 w-3.5" />
            Link
          </Button>
        )}
        {canEncaixe && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onEncaixe}
            title="Marcar outro paciente neste mesmo horário (encaixe)"
          >
            <Plus className="mr-1 h-3.5 w-3.5" />
            Encaixe
          </Button>
        )}
        {occupiesSlot(appointment.status) && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setRescheduling((v) => !v)}
            aria-expanded={rescheduling}
            title="Mudar a data ou o horário desta consulta"
          >
            <CalendarClock className="mr-1 h-3.5 w-3.5" />
            Remarcar
          </Button>
        )}
        <NativeSelect
          value={appointment.status}
          onChange={(e) => handleStatusChange(e.target.value as AppointmentStatus)}
          className="h-8 w-36 text-xs"
        >
          {Object.entries(STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </NativeSelect>
        {!confirming ? (
          <Button type="button" variant="ghost" size="sm" onClick={() => setConfirming(true)}>
            Remover
          </Button>
        ) : (
          <form action={deleteAction} className="flex items-center gap-1">
            <Button type="button" variant="ghost" size="sm" onClick={() => setConfirming(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="destructive" size="sm" disabled={deletePending || !confirmReady}>
              {deletePending ? "…" : "Confirmar"}
            </Button>
          </form>
        )}
      </div>
      {rescheduling && (
        <RescheduleEditor
          appointment={appointment}
          onDone={() => {
            setRescheduling(false);
            onChanged();
          }}
        />
      )}
      {editingBilling && (
        <BillingEditor
          appointment={appointment}
          healthPlans={healthPlans}
          durations={durations}
          onDone={() => {
            setEditingBilling(false);
            onChanged();
          }}
        />
      )}
      {showLink && canSendLink && (
        <div className="basis-full pt-1">
          <ConsultationLinkButton
            patientId={appointment.patientId}
            purpose="CADASTRO"
            hint="O paciente vê esta consulta e completa o cadastro — não escolhe outro horário."
          />
        </div>
      )}
    </div>
  );
}

/**
 * Remarcação no lugar (pedido de 10/10/2026 — antes era preciso apagar e
 * marcar de novo). O seletor de hora marca os horários livres da grade no dia
 * escolhido para o tipo desta consulta, mas aceita qualquer horário, como o
 * formulário de novo agendamento (encaixe).
 */
function RescheduleEditor({ appointment, onDone }: { appointment: Appointment; onDone: () => void }) {
  const [date, setDate] = useState(slotDateKey(appointment.scheduledAt));
  const [time, setTime] = useState(slotTime(appointment.scheduledAt));
  const [free, setFree] = useState<Set<string>>(new Set());
  const [encaixe, setEncaixe] = useState(appointment.encaixe);
  /** O último "Salvar" esbarrou em outro agendamento: oferece o encaixe. */
  const [conflict, setConflict] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    listOpenSlotsForRange(
      appointment.type,
      new Date(`${date}T00:00:00-03:00`).toISOString(),
      new Date(`${date}T23:59:59-03:00`).toISOString(),
    )
      .then((slots) => {
        if (!cancelled) setFree(new Set(slots.filter((s) => slotDateKey(s.scheduledAt) === date).map((s) => slotTime(s.scheduledAt))));
      })
      .catch(() => {
        if (!cancelled) setFree(new Set());
      });
    return () => {
      cancelled = true;
    };
  }, [date, appointment.type]);

  const unchanged = date === slotDateKey(appointment.scheduledAt) && time === slotTime(appointment.scheduledAt);

  function save(asEncaixe = encaixe) {
    startTransition(async () => {
      const result = await rescheduleAppointment(appointment.id, date, time, asEncaixe);
      if (result.error) {
        setConflict(!!result.conflict);
        if (!result.conflict) toast.error(result.error);
        return;
      }
      toast.success(`${appointment.patientName} remarcado(a) para ${whenLabel(date, time)}. Avise o paciente.`);
      onDone();
    });
  }

  return (
    <div className="flex basis-full flex-wrap items-center gap-2 border-t border-border/60 pt-2">
      <span className="text-xs font-medium text-muted-foreground">Remarcar para</span>
      <DatePicker value={date} onChange={setDate} className="h-8 w-auto text-xs" />
      <TimePicker value={time} onChange={setTime} highlighted={free} className="h-8 w-28 text-xs" />
      <label className="flex items-center gap-1.5 text-xs">
        <input
          type="checkbox"
          checked={encaixe}
          onChange={(e) => setEncaixe(e.target.checked)}
          className="h-3.5 w-3.5 accent-primary"
        />
        Encaixe
      </label>
      <Button type="button" size="sm" onClick={() => save()} disabled={pending || unchanged}>
        {pending ? "Salvando…" : "Salvar"}
      </Button>
      <Button type="button" variant="ghost" size="sm" onClick={onDone}>
        Cancelar
      </Button>
      {conflict && !pending && (
        <div className="flex basis-full flex-wrap items-center gap-2 text-xs text-amber-900">
          <span>Esse horário já tem outro agendamento.</span>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7"
            onClick={() => {
              setEncaixe(true);
              save(true);
            }}
          >
            Encaixar mesmo assim
          </Button>
        </div>
      )}
    </div>
  );
}

function BillingEditor({
  appointment,
  healthPlans,
  durations,
  onDone,
}: {
  appointment: Appointment;
  healthPlans: string[];
  durations: AppointmentDurations;
  onDone: () => void;
}) {
  const [billing, setBilling] = useState<AppointmentBilling>(appointment.billing ?? "PARTICULAR");
  const [healthPlan, setHealthPlan] = useState(appointment.healthPlan ?? "");
  // Valor do particular: o já gravado nesta consulta, senão o padrão do tipo.
  const defaultPrice = appointment.type === "RETORNO" ? durations.followUpPriceCents : durations.firstVisitPriceCents;
  const [price, setPrice] = useState(
    centsToInput(appointment.billing === "PARTICULAR" ? (appointment.priceCents ?? defaultPrice) : defaultPrice),
  );
  const [pending, startTransition] = useTransition();

  function save() {
    startTransition(async () => {
      const result = await updateAppointmentBilling(appointment.id, billing, healthPlan, price);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Contratação atualizada.");
      onDone();
    });
  }

  return (
    <div className="flex basis-full flex-wrap items-center gap-2 border-t border-border/60 pt-2">
      <span className="text-xs font-medium text-muted-foreground">Contratação</span>
      <NativeSelect
        value={billing}
        onChange={(e) => setBilling(e.target.value as AppointmentBilling)}
        className="h-8 w-36 text-xs"
      >
        {BILLING_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </NativeSelect>
      {billing === "PARTICULAR" && (
        <Input
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          inputMode="decimal"
          placeholder="Valor (R$)"
          aria-label="Valor (R$)"
          className="h-8 w-28 text-xs"
        />
      )}
      {billing === "CONVENIO" && (
        <HealthPlanField
          plans={healthPlans}
          value={healthPlan}
          onChange={setHealthPlan}
          className="h-8 w-48 text-xs"
        />
      )}
      <Button type="button" size="sm" onClick={save} disabled={pending}>
        {pending ? "Salvando…" : "Salvar"}
      </Button>
    </div>
  );
}
