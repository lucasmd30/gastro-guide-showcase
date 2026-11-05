"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { deleteMedicalRecord, type ProntuarioFormState } from "@/app/actions/prontuario";
import { Button } from "@/components/ui/button";

const initialState: ProntuarioFormState = {};

export function DeleteRecordButton({ patientId, recordId }: { patientId: string; recordId: string }) {
  const action = deleteMedicalRecord.bind(null, patientId, recordId);
  const [state, formAction, pending] = useActionState(action, initialState);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (state.error) toast.error(state.error);
  }, [state]);

  if (!confirming) {
    return (
      <div className="flex justify-end">
        <Button type="button" variant="destructive" onClick={() => setConfirming(true)}>
          Remover registro
        </Button>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex items-center justify-end gap-2">
      <span className="text-sm text-muted-foreground">Remover este registro permanentemente?</span>
      <Button type="button" variant="ghost" onClick={() => setConfirming(false)}>
        Cancelar
      </Button>
      <Button type="submit" variant="destructive" disabled={pending}>
        {pending ? "Removendo…" : "Confirmar"}
      </Button>
    </form>
  );
}
