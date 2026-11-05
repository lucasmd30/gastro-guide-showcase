"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { KeyRound } from "lucide-react";
import {
  createSecretary,
  removeSecretary,
  resetSecretaryPassword,
  type SecretaryFormState,
} from "@/app/actions/perfil";
import type { Secretary } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/password-input";

const initialState: SecretaryFormState = {};

export function SecretarySection({ secretaries }: { secretaries: Secretary[] }) {
  return (
    <div className="space-y-3 rounded-lg border border-border bg-card p-5">
      <h2 className="text-sm font-medium">Minhas secretárias</h2>
      <p className="text-xs text-muted-foreground">
        Secretárias acessam pacientes e agenda, mas não veem prontuário nem dados clínicos.
      </p>
      <div className="space-y-2">
        {secretaries.map((secretary) => (
          <SecretaryRow key={secretary.id} secretary={secretary} />
        ))}
      </div>
      <AddSecretaryForm />
    </div>
  );
}

function SecretaryRow({ secretary }: { secretary: Secretary }) {
  const [state, formAction, pending] = useActionState(removeSecretary, initialState);
  const [editingPassword, setEditingPassword] = useState(false);

  useEffect(() => {
    if (state.error) toast.error(state.error);
  }, [state]);

  return (
    <div className="space-y-2 rounded-md border border-border px-3 py-2 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <span className="font-medium">{secretary.name}</span>
          <span className="ml-2 text-muted-foreground">{secretary.email}</span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="gap-1.5"
            onClick={() => setEditingPassword((v) => !v)}
          >
            <KeyRound className="h-3.5 w-3.5" />
            Trocar senha
          </Button>
          <form action={formAction}>
            <input type="hidden" name="secretaryId" value={secretary.id} />
            <Button type="submit" variant="ghost" size="sm" disabled={pending}>
              {pending ? "..." : "Remover"}
            </Button>
          </form>
        </div>
      </div>
      {editingPassword && (
        <ResetPasswordForm secretaryId={secretary.id} onDone={() => setEditingPassword(false)} />
      )}
    </div>
  );
}

function ResetPasswordForm({ secretaryId, onDone }: { secretaryId: string; onDone: () => void }) {
  const [state, formAction, pending] = useActionState(resetSecretaryPassword, initialState);

  useEffect(() => {
    if (state.error) toast.error(state.error);
    if (state.success) {
      toast.success("Senha alterada. Informe a nova senha à secretária.");
      onDone();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form action={formAction} className="space-y-2 border-t border-border pt-2">
      <input type="hidden" name="secretaryId" value={secretaryId} />
      <div className="flex flex-wrap gap-2">
        <PasswordInput
          name="password"
          placeholder="Nova senha (mín. 8 caracteres)"
          autoComplete="new-password"
          className="flex-1"
        />
        <PasswordInput
          name="confirmPassword"
          placeholder="Repita a nova senha"
          autoComplete="new-password"
          className="flex-1"
        />
        <Button type="submit" variant="secondary" disabled={pending}>
          {pending ? "..." : "Salvar senha"}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Quem estiver logado com a senha antiga precisará entrar de novo.
      </p>
    </form>
  );
}

function AddSecretaryForm() {
  const [state, formAction, pending] = useActionState(createSecretary, initialState);

  useEffect(() => {
    if (state.error) toast.error(state.error);
    if (state.success) toast.success("Secretária adicionada.");
  }, [state]);

  return (
    <form action={formAction} key={state.success ? "reset" : "form"} className="flex flex-wrap gap-2 pt-1">
      <Input name="name" placeholder="Nome" className="flex-1" />
      <Input name="email" type="email" placeholder="E-mail" className="flex-1" />
      <PasswordInput name="password" placeholder="Senha (mín. 8 caracteres)" autoComplete="new-password" className="flex-1" />
      <Button type="submit" variant="secondary" disabled={pending}>
        {pending ? "..." : "Adicionar"}
      </Button>
    </form>
  );
}
