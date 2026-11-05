"use client";

import { ScalePicker } from "@/components/scales";

/** Sem `onResult`: fora do atendimento não há registro para anexar o resultado. */
export function ScalesTool() {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <ScalePicker />
    </div>
  );
}
