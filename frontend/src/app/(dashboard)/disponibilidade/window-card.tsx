"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { CalendarCog, Pencil, Plus } from "lucide-react";
import {
  addRule,
  deleteRule,
  deleteWindow,
  updateRule,
  updateWindow,
  type AvailabilityFormState,
} from "@/app/actions/disponibilidade";
import type { AvailabilityRule, AvailabilityWindow } from "@/lib/api";
import { formatDateKey, hhmm, todayKey } from "@/lib/dates";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/date-picker";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { RuleFields, WEEKDAYS, WEEKDAY_LABEL } from "./rule-fields";

const initialState: AvailabilityFormState = {};

export function windowTitle(win: AvailabilityWindow) {
  if (!win.endDate) return `A partir de ${formatDateKey(win.startDate)}`;
  if (win.endDate === win.startDate) return `Dia ${formatDateKey(win.startDate)}`;
  return `${formatDateKey(win.startDate)} a ${formatDateKey(win.endDate)}`;
}

export function isWindowClosed(win: AvailabilityWindow) {
  return win.endDate != null && win.endDate < todayKey();
}

export function WindowCard({ win }: { win: AvailabilityWindow }) {
  const closed = isWindowClosed(win);
  const [mode, setMode] = useState<"idle" | "add-rule" | "close">("idle");

  const byWeekday = WEEKDAYS.map((day) => ({
    ...day,
    rules: win.rules.filter((rule) => rule.weekday === day.value),
  })).filter((day) => day.rules.length > 0);

  return (
    <div className={`space-y-3 rounded-lg border border-border bg-card p-5 ${closed ? "opacity-70" : ""}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium">{windowTitle(win)}</h3>
          {closed && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
              Encerrada
            </span>
          )}
        </div>
        <DeleteWindowForm windowId={win.id} />
      </div>

      <div className="divide-y divide-border rounded-md border border-border">
        {byWeekday.map((day) => (
          <div key={day.value} className="px-4 py-3">
            <div className="text-sm font-medium">{WEEKDAY_LABEL[day.value]}</div>
            <div className="mt-1 space-y-1">
              {day.rules.map((rule) => (
                <RuleRow key={rule.id} windowId={win.id} rule={rule} />
              ))}
            </div>
          </div>
        ))}
      </div>

      {!closed && mode === "idle" && (
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => setMode("add-rule")}>
            <Plus />
            Adicionar faixa
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => setMode("close")}>
            <CalendarCog />
            Editar período
          </Button>
        </div>
      )}
      {mode === "add-rule" && <AddRuleForm windowId={win.id} onDone={() => setMode("idle")} />}
      {mode === "close" && <EditPeriodForm win={win} onDone={() => setMode("idle")} />}
    </div>
  );
}

function RuleRow({ windowId, rule }: { windowId: string; rule: AvailabilityRule }) {
  const [state, formAction, pending] = useActionState(deleteRule.bind(null, windowId, rule.id), initialState);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (state.error) toast.error(state.error);
  }, [state]);

  if (editing) {
    return <EditRuleForm windowId={windowId} rule={rule} onDone={() => setEditing(false)} />;
  }

  return (
    <form action={formAction} className="flex items-center justify-between gap-3 text-sm">
      <span className="text-muted-foreground">
        {hhmm(rule.startTime)} às {hhmm(rule.endTime)}
      </span>
      <span className="flex items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          aria-label="Editar faixa"
          onClick={() => setEditing(true)}
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <ConfirmDeleteButton label="Remover faixa" pending={pending} iconOnly />
      </span>
    </form>
  );
}

/** Edita a faixa no lugar — antes era preciso apagar e criar de novo. */
function EditRuleForm({
  windowId,
  rule,
  onDone,
}: {
  windowId: string;
  rule: AvailabilityRule;
  onDone: () => void;
}) {
  const [state, formAction, pending] = useActionState(updateRule.bind(null, windowId, rule.id), initialState);

  useEffect(() => {
    if (state.success) {
      toast.success("Faixa atualizada.");
      onDone();
    }
    if (state.error) toast.error(state.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form action={formAction} className="space-y-4 rounded-md border border-dashed border-border p-4">
      <RuleFields current={rule} />
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onDone}>
          Cancelar
        </Button>
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Salvando…" : "Salvar faixa"}
        </Button>
      </div>
    </form>
  );
}

function AddRuleForm({ windowId, onDone }: { windowId: string; onDone: () => void }) {
  const [state, formAction, pending] = useActionState(addRule.bind(null, windowId), initialState);

  useEffect(() => {
    if (state.success) {
      toast.success("Faixa adicionada.");
      onDone();
    }
    if (state.error) toast.error(state.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form action={formAction} className="space-y-4 rounded-md border border-dashed border-border p-4">
      <RuleFields />
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onDone}>
          Cancelar
        </Button>
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Adicionando…" : "Adicionar"}
        </Button>
      </div>
    </form>
  );
}

/** Período da janela: mudar o começo, encerrar numa data ou reabrir. */
function EditPeriodForm({ win, onDone }: { win: AvailabilityWindow; onDone: () => void }) {
  const [state, formAction, pending] = useActionState(updateWindow.bind(null, win.id), initialState);
  const [startDate, setStartDate] = useState(win.startDate);
  // Sugere hoje (encerrar agora), mas nunca antes do início da janela.
  const [endDate, setEndDate] = useState(win.endDate ?? (win.startDate > todayKey() ? win.startDate : todayKey()));
  const [openEnded, setOpenEnded] = useState(win.endDate === null);

  useEffect(() => {
    if (state.success) {
      toast.success("Período atualizado.");
      onDone();
    }
    if (state.error) toast.error(state.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form action={formAction} className="space-y-3 rounded-md border border-dashed border-border p-4">
      <input type="hidden" name="startDate" value={startDate} />
      <input type="hidden" name="endDate" value={openEnded ? "" : endDate} />

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Primeiro dia</Label>
          <DatePicker value={startDate} onChange={setStartDate} />
        </div>
        <div className="space-y-1.5">
          <Label>Último dia</Label>
          <DatePicker
            value={endDate}
            onChange={(date) => {
              setEndDate(date);
              setOpenEnded(false);
            }}
            min={startDate}
            className={openEnded ? "text-muted-foreground" : undefined}
          />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <Switch checked={openEnded} onCheckedChange={setOpenEnded} />
        Sem data de fim (vale até ser encerrada)
      </label>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onDone}>
          Cancelar
        </Button>
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Salvando…" : "Salvar período"}
        </Button>
      </div>
    </form>
  );
}

function DeleteWindowForm({ windowId }: { windowId: string }) {
  const [state, formAction, pending] = useActionState(deleteWindow.bind(null, windowId), initialState);

  useEffect(() => {
    if (state.error) toast.error(state.error);
  }, [state]);

  return (
    <form action={formAction}>
      <ConfirmDeleteButton label="Excluir janela" pending={pending} />
    </form>
  );
}
