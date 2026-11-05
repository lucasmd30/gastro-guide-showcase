"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { updateProfile, type PerfilFormState } from "@/app/actions/perfil";
import type { Doctor, DoctorHealthPlan, Secretary } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CrmSection } from "./crm-section";
import { OfficeAddressSection } from "./office-address-section";
import { RqeSection } from "./rqe-section";
import { HealthPlanSection } from "./health-plan-section";
import { SecretarySection } from "./secretary-section";

const initialState: PerfilFormState = {};

export function PerfilForm({
  doctor,
  secretaries,
  healthPlans,
}: {
  doctor: Doctor;
  secretaries: Secretary[];
  healthPlans: DoctorHealthPlan[];
}) {
  const [state, formAction, pending] = useActionState(updateProfile, initialState);

  useEffect(() => {
    if (state.success) toast.success("Perfil salvo.");
    if (state.error) toast.error(state.error);
  }, [state]);

  // `doctor` (a prop) é a fonte da verdade — updateProfile já chama
  // revalidatePath("/perfil"), então ela vem sempre atualizada do servidor,
  // inclusive depois de mudanças de CRM/RQE feitas nas seções abaixo. Usar
  // `state.doctor` (o retorno de updateProfile) como fallback prioritário
  // fixava a lista de CRM/RQE numa foto congelada do momento do último save
  // de nome/telefone — um CRM adicionado depois disso não aparecia até
  // recarregar a página (achado da revisão final da Fase 0).

  return (
    <div className="space-y-5">
      <form action={formAction} className="space-y-5 rounded-lg border border-border bg-card p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nome completo" required>
            <Input name="name" defaultValue={doctor.name} required />
          </Field>
          <Field label="E-mail">
            <Input defaultValue={doctor.email} disabled />
          </Field>
          <Field label="Telefone">
            <Input name="phone" defaultValue={doctor.phone ?? ""} />
          </Field>
        </div>

        <div className="flex justify-end">
          <Button type="submit" disabled={pending}>
            {pending ? "Salvando…" : "Salvar"}
          </Button>
        </div>
      </form>

      <OfficeAddressSection address={doctor.officeAddress} />
      <CrmSection crms={doctor.crms} />
      <RqeSection rqes={doctor.rqes} />
      <HealthPlanSection plans={healthPlans} />
      <SecretarySection secretaries={secretaries} />
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm">
        {label}
        {required && <span className="text-destructive"> *</span>}
      </Label>
      {children}
    </div>
  );
}
