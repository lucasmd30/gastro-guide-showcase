"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { X } from "lucide-react";
import { addHealthPlan, removeHealthPlan, type HealthPlanFormState } from "@/app/actions/perfil";
import type { DoctorHealthPlan } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const initialState: HealthPlanFormState = {};

/** Sugestões para digitar mais rápido — o nome continua livre. */
const COMMON_PLANS = [
  "Allianz Saúde",
  "Amil",
  "Bradesco Saúde",
  "Care Plus",
  "Cassi",
  "GEAP",
  "Golden Cross",
  "Hapvida",
  "Mediservice",
  "NotreDame Intermédica",
  "Omint",
  "Porto Seguro Saúde",
  "Postal Saúde",
  "Prevent Senior",
  "Saúde Caixa",
  "SulAmérica",
  "Unimed",
];

/**
 * Convênios que o médico atende. A lista vai sozinha para o link de
 * consulta: o paciente que escolhe "Convênio" escolhe um destes. Sem nenhum,
 * o link só oferece atendimento particular.
 */
export function HealthPlanSection({ plans }: { plans: DoctorHealthPlan[] }) {
  return (
    <div className="space-y-3 rounded-lg border border-border bg-card p-5">
      <div>
        <h2 className="text-sm font-medium">Convênios atendidos</h2>
        <p className="text-xs text-muted-foreground">
          Aparecem no link de consulta para o paciente que escolher convênio. Sem nenhum, o link oferece só
          atendimento particular.
        </p>
      </div>
      {plans.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {plans.map((plan) => (
            <HealthPlanChip key={plan.id} plan={plan} />
          ))}
        </div>
      )}
      <AddHealthPlanForm existing={plans} />
    </div>
  );
}

function HealthPlanChip({ plan }: { plan: DoctorHealthPlan }) {
  const [state, formAction, pending] = useActionState(removeHealthPlan, initialState);

  useEffect(() => {
    if (state.error) toast.error(state.error);
  }, [state]);

  return (
    <form action={formAction}>
      <input type="hidden" name="planId" value={plan.id} />
      <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/40 py-1 pl-3 pr-1 text-sm">
        {plan.name}
        <button
          type="submit"
          disabled={pending}
          aria-label={`Remover ${plan.name}`}
          className="rounded-full p-0.5 text-muted-foreground hover:text-destructive disabled:opacity-40"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </span>
    </form>
  );
}

function AddHealthPlanForm({ existing }: { existing: DoctorHealthPlan[] }) {
  const [state, formAction, pending] = useActionState(addHealthPlan, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.error) toast.error(state.error);
    if (state.success) {
      toast.success("Convênio adicionado.");
      formRef.current?.reset();
    }
  }, [state]);

  const taken = new Set(existing.map((p) => p.name.toLowerCase()));

  return (
    <form ref={formRef} action={formAction} className="flex gap-2 pt-1">
      <Input name="name" list="convenios-comuns" placeholder="Nome do convênio" maxLength={120} className="flex-1" />
      <datalist id="convenios-comuns">
        {COMMON_PLANS.filter((name) => !taken.has(name.toLowerCase())).map((name) => (
          <option key={name} value={name} />
        ))}
      </datalist>
      <Button type="submit" variant="secondary" disabled={pending}>
        {pending ? "..." : "Adicionar"}
      </Button>
    </form>
  );
}
