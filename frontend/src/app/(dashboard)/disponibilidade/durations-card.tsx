"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { Timer } from "lucide-react";
import { updateDurations, type AvailabilityFormState } from "@/app/actions/disponibilidade";
import type { AppointmentDurations } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { centsToInput } from "@/lib/money";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";

const initialState: AvailabilityFormState = {};

const OPTIONS = [10, 15, 20, 30, 40, 45, 60, 90];

/**
 * Quanto dura cada tipo de atendimento, e quanto custa no particular. Fica aqui, e não no agendamento,
 * porque é decisão de configuração: vale para todas as consultas até a
 * médica mudar — mesmo modelo do catálogo de serviços da Doctoralia e dos
 * procedimentos do iClinic.
 */
export function DurationsCard({ durations }: { durations: AppointmentDurations }) {
  const [state, formAction, pending] = useActionState(updateDurations, initialState);

  useEffect(() => {
    if (state.success) toast.success("Durações e valores salvos.");
    if (state.error) toast.error(state.error);
  }, [state]);

  return (
    <form action={formAction} className="space-y-4 rounded-lg border border-border bg-card p-5">
      <div className="flex items-center gap-2">
        <Timer className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-medium">Duração e valor dos atendimentos</h2>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Consulta</Label>
          <NativeSelect name="firstVisitMinutes" defaultValue={String(durations.firstVisitMinutes)}>
            {OPTIONS.map((minutes) => (
              <option key={minutes} value={minutes}>
                {minutes} minutos
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="space-y-1.5">
          <Label>Retorno</Label>
          <NativeSelect name="followUpMinutes" defaultValue={String(durations.followUpMinutes)}>
            {OPTIONS.map((minutes) => (
              <option key={minutes} value={minutes}>
                {minutes} minutos
              </option>
            ))}
          </NativeSelect>
        </div>
      </div>

      {/* Valor padrão do particular (13/10/2026): todo agendamento particular
          já nasce com ele, e dá para ajustar numa consulta específica. */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Valor da consulta particular (R$)</Label>
          <Input
            name="firstVisitPrice"
            inputMode="decimal"
            placeholder="Ex.: 450,00"
            defaultValue={centsToInput(durations.firstVisitPriceCents)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Valor do retorno particular (R$)</Label>
          <Input
            name="followUpPrice"
            inputMode="decimal"
            placeholder="Ex.: 250,00"
            defaultValue={centsToInput(durations.followUpPriceCents)}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          Vale para todos os agendamentos até você mudar. A duração define os horários oferecidos dentro de cada
          janela; o valor já vem preenchido em cada consulta particular (dá para ajustar nela). Deixe o valor em
          branco se não quiser um padrão.
        </p>
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Salvando…" : "Salvar"}
        </Button>
      </div>
    </form>
  );
}
