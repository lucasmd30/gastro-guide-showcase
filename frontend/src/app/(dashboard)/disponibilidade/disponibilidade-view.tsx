"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import type { AppointmentDurations, AvailabilityBlock, AvailabilityWindow } from "@/lib/api";
import { DurationsCard } from "./durations-card";
import { Button } from "@/components/ui/button";
import { NewWindowForm } from "./new-window-form";
import { WindowCard, isWindowClosed } from "./window-card";
import { BlocksSection } from "./blocks-section";

export function DisponibilidadeView({
  windows,
  blocks,
  durations,
  openSlotCount,
}: {
  windows: AvailabilityWindow[];
  blocks: AvailabilityBlock[];
  durations: AppointmentDurations;
  openSlotCount: number;
}) {
  const [creating, setCreating] = useState(false);
  const [showClosed, setShowClosed] = useState(false);

  // Janelas vigentes ou futuras primeiro; as encerradas ficam recolhidas
  // no fim, só como histórico.
  const active = windows.filter((win) => !isWindowClosed(win));
  const closed = windows.filter(isWindowClosed);

  return (
    <div className="space-y-5">
      <DurationsCard durations={durations} />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="space-y-0.5">
          <h2 className="text-sm font-medium">Janelas de atendimento</h2>
          <p className="text-xs text-muted-foreground">
            {openSlotCount === 0
              ? "Nenhum horário livre nos próximos 60 dias."
              : `${openSlotCount} horários de consulta livres nos próximos 60 dias.`}
          </p>
        </div>
        {!creating && (
          <Button type="button" onClick={() => setCreating(true)}>
            <Plus />
            Nova janela
          </Button>
        )}
      </div>

      {creating && <NewWindowForm onDone={() => setCreating(false)} />}

      {active.length === 0 && !creating ? (
        <p className="rounded-lg border border-dashed border-border p-5 text-sm text-muted-foreground">
          Nenhuma janela aberta. Enquanto não houver janela, o link de consulta não oferece horário nenhum e o
          agendamento continua sendo feito pela agenda.
        </p>
      ) : (
        active.map((win) => <WindowCard key={win.id} win={win} />)
      )}

      {closed.length > 0 && (
        <div className="space-y-3">
          <button
            type="button"
            className="text-xs text-muted-foreground underline-offset-4 hover:underline"
            onClick={() => setShowClosed((v) => !v)}
          >
            {showClosed ? "Ocultar" : "Mostrar"} {closed.length} {closed.length === 1 ? "janela encerrada" : "janelas encerradas"}
          </button>
          {showClosed && closed.map((win) => <WindowCard key={win.id} win={win} />)}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        O paciente só enxerga horários com pelo menos 12 horas de antecedência, e um horário some da lista assim
        que alguém marca nele.
      </p>

      <BlocksSection blocks={blocks} />
    </div>
  );
}
