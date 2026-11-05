"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { createWindow, type AvailabilityFormState } from "@/app/actions/disponibilidade";
import { todayKey } from "@/lib/dates";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { DateRangePicker } from "@/components/date-range-picker";
import { RuleFields } from "./rule-fields";

const initialState: AvailabilityFormState = {};

export function NewWindowForm({ onDone }: { onDone: () => void }) {
  const [state, formAction, pending] = useActionState(createWindow, initialState);
  const [range, setRange] = useState({ from: "", to: "" });
  const [openEnded, setOpenEnded] = useState(false);

  useEffect(() => {
    if (state.success) {
      toast.success("Janela aberta.");
      onDone();
    }
    if (state.error) toast.error(state.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form action={formAction} className="space-y-5 rounded-lg border border-primary/40 bg-card p-5">
      <h2 className="text-sm font-medium">Nova janela de atendimento</h2>

      <div className="space-y-2">
        <Label>Período</Label>
        <DateRangePicker from={range.from} to={range.to} onChange={setRange} min={todayKey()} openEnded={openEnded} />
        <label className="flex items-center gap-2 text-sm">
          <Switch checked={openEnded} onCheckedChange={setOpenEnded} />
          Sem data de fim (vale até ser encerrada)
        </label>
      </div>

      <RuleFields />

      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onDone}>
          Cancelar
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Abrindo…" : "Abrir janela"}
        </Button>
      </div>
    </form>
  );
}
