"use client";

import { startTransition, useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { updateOfficeAddress, type PerfilFormState } from "@/app/actions/perfil";
import type { OfficeAddress } from "@/lib/api";
import { BRAZILIAN_UFS } from "@/lib/crm";
import { formatCep } from "@/lib/office-address";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";

const initialState: PerfilFormState = {};

/**
 * Endereço comercial (pedido de 23/10/2026): sai no cabeçalho dos documentos
 * (atestado, encaminhamento…), e a cidade preenche o "Local e data".
 * Formulário próprio, separado de nome/telefone, para um não apagar o outro.
 */
export function OfficeAddressSection({ address }: { address: OfficeAddress }) {
  const [state, formAction, pending] = useActionState(updateOfficeAddress, initialState);
  const [cep, setCep] = useState(formatCep(address.cep ?? ""));

  useEffect(() => {
    if (state.success) toast.success("Endereço comercial salvo.");
    if (state.error) toast.error(state.error);
  }, [state]);

  return (
    // onSubmit em vez de `action`: com `action` o React limpa o formulário
    // depois de todo envio, inclusive o recusado (CEP incompleto), e o que foi
    // digitado se perderia — mesmo achado da agenda.
    <form
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        startTransition(() => formAction(formData));
      }}
      className="space-y-4 rounded-lg border border-border bg-card p-5"
    >
      <div>
        <h2 className="text-sm font-medium">Endereço comercial</h2>
        <p className="text-xs text-muted-foreground">
          Aparece no cabeçalho dos documentos emitidos (atestados, declarações, encaminhamentos…).
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-6">
        <Field label="CEP" className="sm:col-span-2">
          <Input
            name="cep"
            inputMode="numeric"
            placeholder="00000-000"
            value={cep}
            onChange={(e) => setCep(formatCep(e.target.value))}
          />
        </Field>
        <Field label="Logradouro" className="sm:col-span-4">
          <Input name="street" defaultValue={address.street ?? ""} placeholder="Rua, avenida…" maxLength={200} />
        </Field>
        <Field label="Número" className="sm:col-span-2">
          <Input name="number" defaultValue={address.number ?? ""} maxLength={20} />
        </Field>
        <Field label="Complemento" className="sm:col-span-4">
          <Input name="complement" defaultValue={address.complement ?? ""} placeholder="Sala, conjunto, andar…" maxLength={100} />
        </Field>
        <Field label="Bairro" className="sm:col-span-2">
          <Input name="district" defaultValue={address.district ?? ""} maxLength={120} />
        </Field>
        <Field label="Cidade" className="sm:col-span-3">
          <Input name="city" defaultValue={address.city ?? ""} maxLength={120} />
        </Field>
        <Field label="UF" className="sm:col-span-1">
          <NativeSelect name="state" defaultValue={address.state ?? ""}>
            <option value="">—</option>
            {BRAZILIAN_UFS.map((uf) => (
              <option key={uf} value={uf}>
                {uf}
              </option>
            ))}
          </NativeSelect>
        </Field>
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? "Salvando…" : "Salvar endereço"}
        </Button>
      </div>
    </form>
  );
}

function Field({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={`space-y-1.5 ${className ?? ""}`}>
      <Label className="text-sm">{label}</Label>
      {children}
    </div>
  );
}
