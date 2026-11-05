"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { createPatient, type PatientFormState } from "@/app/actions/pacientes";
import type { PatientPage } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EMPTY_PATIENT_FIELDS, PatientFormFields } from "@/components/patient-form-fields";
import { formatCpf } from "@/lib/cpf";
import { ConsultationLinkButton } from "@/components/consultation-link-button";
import { PatientSearchBox } from "./patient-search-box";

const initialState: PatientFormState = {};

export function PacientesList({ result, query }: { result: PatientPage; query: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showForm, setShowForm] = useState(false);
  const [state, formAction, pending] = useActionState(createPatient, initialState);
  const [resetCount, setResetCount] = useState(0);

  useEffect(() => {
    if (state.success) {
      toast.success("Paciente cadastrado.");
      setShowForm(false);
      setResetCount((n) => n + 1);
      router.refresh();
    }
    if (state.error) toast.error(state.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  function goToPage(page: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("pagina", String(page + 1));
    router.push(`/pacientes?${params.toString()}`);
  }

  const from = result.total === 0 ? 0 : result.page * result.size + 1;
  const to = Math.min(result.total, (result.page + 1) * result.size);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-border bg-card p-4">
        <div className="flex-1 space-y-2">
          <h3 className="text-sm font-medium">Links para o paciente</h3>
          <p className="text-xs text-muted-foreground">
            Para quem ainda não é paciente. <strong>Cadastro</strong>: ele só preenche os dados.{" "}
            <strong>Consulta</strong>: ele preenche e escolhe o horário sozinho, sobre a grade de{" "}
            <Link href="/disponibilidade" className="underline">disponibilidade</Link>. Se você já
            marcou a consulta pela agenda, gere o link na própria consulta.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <ConsultationLinkButton purpose="CADASTRO" />
            <ConsultationLinkButton purpose="AGENDAMENTO" />
          </div>
        </div>
        <Button onClick={() => setShowForm((v) => !v)}>
          <Plus className="mr-1 h-4 w-4" /> Novo paciente
        </Button>
      </div>

      {showForm && (
        <form
          key={resetCount}
          action={formAction}
          className="grid gap-3 rounded-lg border border-border bg-card p-5 sm:grid-cols-2"
        >
          {/* Os mesmos campos da edição completa: o cadastro rápido tinha uma
              cópia própria, e por isso ficou sem naturalidade e procedência
              (achado da cliente). Um componente só evita a divergência. */}
          <PatientFormFields current={EMPTY_PATIENT_FIELDS} />
          <div className="sm:col-span-2 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Salvando…" : "Cadastrar"}
            </Button>
          </div>
        </form>
      )}

      {/* `key`: ao limpar ou trocar a busca pela URL, o campo volta ao valor dela. */}
      <PatientSearchBox key={query} query={query} />

      <div className="divide-y divide-border rounded-lg border border-border bg-card">
        {result.items.length === 0 && (
          <div className="p-6 text-sm text-muted-foreground">
            {query ? "Nenhum paciente encontrado." : "Nenhum paciente cadastrado ainda."}
          </div>
        )}
        {result.items.map((p) => (
          <Link
            key={p.id}
            href={`/pacientes/${p.id}`}
            className="flex items-center justify-between gap-3 px-5 py-3 transition-colors hover:bg-accent/40"
          >
            <div className="min-w-0">
              <div className="truncate font-medium text-foreground">{p.name}</div>
              <div className="truncate text-xs text-muted-foreground">
                {p.cpf ? formatCpf(p.cpf) : "—"}
              </div>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
          </Link>
        ))}
      </div>

      {result.total > 0 && (
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="text-muted-foreground">
            {from}–{to} de {result.total}
          </span>
          {result.totalPages > 1 && (
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                disabled={result.page === 0}
                onClick={() => goToPage(result.page - 1)}
              >
                <ChevronLeft className="mr-1 h-4 w-4" /> Anterior
              </Button>
              <span className="text-xs text-muted-foreground">
                {result.page + 1} / {result.totalPages}
              </span>
              <Button
                variant="ghost"
                size="sm"
                disabled={result.page + 1 >= result.totalPages}
                onClick={() => goToPage(result.page + 1)}
              >
                Próxima <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
