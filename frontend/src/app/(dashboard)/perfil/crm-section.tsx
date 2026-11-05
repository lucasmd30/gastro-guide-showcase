"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { addCrm, removeCrm, setCrmPrincipal, type PerfilFormState } from "@/app/actions/perfil";
import type { DoctorCrm } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const initialState: PerfilFormState = {};

export function CrmSection({ crms }: { crms: DoctorCrm[] }) {
  return (
    <div className="space-y-3 rounded-lg border border-border bg-card p-5">
      <h2 className="text-sm font-medium">Meus CRMs</h2>
      <div className="space-y-2">
        {crms.map((crm) => (
          <CrmRow key={crm.id} crm={crm} canRemove={crms.length > 1} />
        ))}
      </div>
      <AddCrmForm />
    </div>
  );
}

function CrmRow({ crm, canRemove }: { crm: DoctorCrm; canRemove: boolean }) {
  const [removeState, removeAction, removePending] = useActionState(removeCrm, initialState);
  const [principalState, principalAction, principalPending] = useActionState(setCrmPrincipal, initialState);

  useEffect(() => {
    if (removeState.error) toast.error(removeState.error);
  }, [removeState]);

  useEffect(() => {
    if (principalState.error) toast.error(principalState.error);
  }, [principalState]);

  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2 text-sm">
      <div className="flex items-center gap-2">
        <span className="font-medium">{crm.crm}</span>
        <span className="text-muted-foreground">{crm.crmUf}</span>
        {crm.principal && (
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">Principal</span>
        )}
      </div>
      <div className="flex items-center gap-2">
        {!crm.principal && (
          <form action={principalAction}>
            <input type="hidden" name="crmId" value={crm.id} />
            <Button type="submit" variant="outline" size="sm" disabled={principalPending}>
              {principalPending ? "..." : "Tornar principal"}
            </Button>
          </form>
        )}
        {canRemove && (
          <form action={removeAction}>
            <input type="hidden" name="crmId" value={crm.id} />
            <Button type="submit" variant="ghost" size="sm" disabled={removePending}>
              {removePending ? "..." : "Remover"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}

function AddCrmForm() {
  const [state, formAction, pending] = useActionState(addCrm, initialState);

  useEffect(() => {
    if (state.error) toast.error(state.error);
    if (state.success) toast.success("CRM adicionado.");
  }, [state]);

  return (
    <form action={formAction} className="flex gap-2 pt-1">
      <Input name="crm" placeholder="CRM" className="flex-1" />
      <Input name="crmUf" placeholder="UF" maxLength={2} className="w-16" />
      <Button type="submit" variant="secondary" disabled={pending}>
        {pending ? "..." : "Adicionar"}
      </Button>
    </form>
  );
}
