"use client";

import { useActionState, useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { login, signup, type AuthFormState } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const initialState: AuthFormState = {};

function SignupSuccessNotice() {
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get("cadastrado") === "1") {
      toast.success("Conta criada! Faça login para continuar.");
    }
  }, [searchParams]);

  return null;
}

export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [loginState, loginAction, loginPending] = useActionState(login, initialState);
  const [signupState, signupAction, signupPending] = useActionState(signup, initialState);

  const state = mode === "login" ? loginState : signupState;
  const pending = mode === "login" ? loginPending : signupPending;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Suspense fallback={null}>
        <SignupSuccessNotice />
      </Suspense>
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Gastrohepato" width={48} height={48} className="h-12 w-12 rounded-xl" />
          <h1 className="text-lg font-bold text-foreground">Prontuário Gastrohepatologia</h1>
          <p className="text-sm text-muted-foreground">
            {mode === "login" ? "Entre na sua conta" : "Crie sua conta de médico"}
          </p>
        </div>

        {mode === "login" ? (
          <form action={loginAction} className="space-y-3">
            <Input type="email" name="email" placeholder="E-mail" required />
            <Input type="password" name="password" placeholder="Senha" minLength={8} required />
            {state.error && <p className="text-sm text-destructive">{state.error}</p>}
            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? "Aguarde…" : "Entrar"}
            </Button>
          </form>
        ) : (
          <form action={signupAction} className="space-y-3">
            <Input name="name" placeholder="Nome completo" required />
            <Input type="email" name="email" placeholder="E-mail" required />
            <Input type="password" name="password" placeholder="Senha (mín. 8 caracteres)" minLength={8} required />
            <div className="flex gap-2">
              <Input name="crm" placeholder="CRM" required className="flex-1" />
              <Input name="crmUf" placeholder="UF" maxLength={2} required className="w-16" />
            </div>
            {state.error && <p className="text-sm text-destructive">{state.error}</p>}
            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? "Aguarde…" : "Criar conta"}
            </Button>
          </form>
        )}

        <button
          type="button"
          onClick={() => setMode(mode === "login" ? "signup" : "login")}
          className="mt-4 w-full text-center text-sm text-primary hover:underline"
        >
          {mode === "login" ? "Não tem conta? Cadastre-se" : "Já tem conta? Entrar"}
        </button>
      </div>
    </div>
  );
}
