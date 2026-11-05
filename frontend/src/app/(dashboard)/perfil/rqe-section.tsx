"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { addRqe, removeRqe, setRqePrincipal, type PerfilFormState } from "@/app/actions/perfil";
import type { DoctorRqe } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { MEDICAL_SPECIALTIES } from "@/lib/specialties";

const initialState: PerfilFormState = {};

export function RqeSection({ rqes }: { rqes: DoctorRqe[] }) {
  return (
    <div className="space-y-3 rounded-lg border border-border bg-card p-5">
      <h2 className="text-sm font-medium">Meus RQEs</h2>
      <div className="space-y-2">
        {rqes.map((rqe) => (
          <RqeRow key={rqe.id} rqe={rqe} />
        ))}
      </div>
      <AddRqeForm />
    </div>
  );
}

function RqeRow({ rqe }: { rqe: DoctorRqe }) {
  const [removeState, removeAction, removePending] = useActionState(removeRqe, initialState);
  const [principalState, principalAction, principalPending] = useActionState(setRqePrincipal, initialState);

  useEffect(() => {
    if (removeState.error) toast.error(removeState.error);
  }, [removeState]);

  useEffect(() => {
    if (principalState.error) toast.error(principalState.error);
  }, [principalState]);

  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2 text-sm">
      <div className="flex items-center gap-2">
        <span className="font-medium">{rqe.rqe}</span>
        <span className="text-muted-foreground">{rqe.specialty}</span>
        {rqe.principal && (
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">Principal</span>
        )}
      </div>
      <div className="flex items-center gap-2">
        {!rqe.principal && (
          <form action={principalAction}>
            <input type="hidden" name="rqeId" value={rqe.id} />
            <Button type="submit" variant="outline" size="sm" disabled={principalPending}>
              {principalPending ? "..." : "Tornar principal"}
            </Button>
          </form>
        )}
        <form action={removeAction}>
          <input type="hidden" name="rqeId" value={rqe.id} />
          <Button type="submit" variant="ghost" size="sm" disabled={removePending}>
            {removePending ? "..." : "Remover"}
          </Button>
        </form>
      </div>
    </div>
  );
}

function AddRqeForm() {
  const [state, formAction, pending] = useActionState(addRqe, initialState);

  useEffect(() => {
    if (state.error) toast.error(state.error);
    if (state.success) toast.success("RQE adicionado.");
  }, [state]);

  return (
    <form action={formAction} className="flex gap-2 pt-1">
      <Input name="rqe" placeholder="RQE" className="w-28" />
      <NativeSelect name="specialty" defaultValue="" className="flex-1">
        <option value="" disabled>
          Selecione a especialidade
        </option>
        {MEDICAL_SPECIALTIES.map((specialty) => (
          <option key={specialty} value={specialty}>
            {specialty}
          </option>
        ))}
      </NativeSelect>
      <Button type="submit" variant="secondary" disabled={pending}>
        {pending ? "..." : "Adicionar"}
      </Button>
    </form>
  );
}
