"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { CalendarX } from "lucide-react";
import { createBlock, deleteBlock, type AvailabilityFormState } from "@/app/actions/disponibilidade";
import type { AvailabilityBlock } from "@/lib/api";
import { formatDateKey, hhmm, todayKey } from "@/lib/dates";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { DateRangePicker } from "@/components/date-range-picker";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";

const initialState: AvailabilityFormState = {};

function blockLabel(block: AvailabilityBlock) {
  const period =
    block.startDate === block.endDate
      ? formatDateKey(block.startDate)
      : `${formatDateKey(block.startDate)} a ${formatDateKey(block.endDate)}`;
  const hours = block.startTime && block.endTime ? ` · ${hhmm(block.startTime)} às ${hhmm(block.endTime)}` : "";
  return `${period}${hours}`;
}

/** Fechamentos de agenda (férias, congresso, folga), modelo iClinic. */
export function BlocksSection({ blocks }: { blocks: AvailabilityBlock[] }) {
  const [state, formAction, pending] = useActionState(createBlock, initialState);
  const [resetCount, setResetCount] = useState(0);
  const [range, setRange] = useState({ from: "", to: "" });
  const [allDay, setAllDay] = useState(true);

  useEffect(() => {
    if (state.success) {
      toast.success("Período bloqueado.");
      setRange({ from: "", to: "" });
      setAllDay(true);
      setResetCount((n) => n + 1);
    }
    if (state.error) toast.error(state.error);
  }, [state]);

  return (
    <div className="space-y-4 rounded-lg border border-border bg-card p-5">
      <div className="flex items-center gap-2">
        <CalendarX className="h-4 w-4 text-destructive" />
        <h2 className="text-sm font-medium">Fechamento de agenda (férias, congresso, folga)</h2>
      </div>

      <form key={resetCount} action={formAction} className="space-y-4">
        {/* Um mês só: com dois, o card ocupava a tela inteira (pedido da cliente, 13/10/2026). */}
        <DateRangePicker from={range.from} to={range.to} onChange={setRange} min={todayKey()} months={1} />

        <label className="flex items-center gap-2 text-sm">
          <Switch name="allDay" checked={allDay} onCheckedChange={setAllDay} />
          Dia inteiro
        </label>

        {!allDay && (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Das</Label>
              <Input name="startTime" type="time" required defaultValue="14:00" />
            </div>
            <div className="space-y-1.5">
              <Label>Até</Label>
              <Input name="endTime" type="time" required defaultValue="16:00" />
            </div>
          </div>
        )}

        <div className="space-y-1.5">
          <Label>Motivo (opcional)</Label>
          <Input name="reason" maxLength={200} placeholder="Ex.: Férias" />
        </div>

        <div className="flex justify-end">
          <Button type="submit" variant="outline" disabled={pending || !range.from}>
            {pending ? "Bloqueando…" : "Bloquear período"}
          </Button>
        </div>
      </form>

      {blocks.length === 0 ? (
        <p className="text-xs text-muted-foreground">Nenhum bloqueio cadastrado.</p>
      ) : (
        <ul className="divide-y divide-border rounded-md border border-border">
          {blocks.map((block) => (
            <BlockRow key={block.id} block={block} />
          ))}
        </ul>
      )}
    </div>
  );
}

function BlockRow({ block }: { block: AvailabilityBlock }) {
  const [state, formAction, pending] = useActionState(deleteBlock.bind(null, block.id), initialState);

  useEffect(() => {
    if (state.error) toast.error(state.error);
  }, [state]);

  return (
    <li className="px-4 py-2.5">
      <form action={formAction} className="flex items-center justify-between gap-3 text-sm">
        <span>
          {blockLabel(block)}
          {block.reason && <span className="ml-2 text-muted-foreground">· {block.reason}</span>}
        </span>
        <ConfirmDeleteButton label="Remover bloqueio" pending={pending} iconOnly />
      </form>
    </li>
  );
}
