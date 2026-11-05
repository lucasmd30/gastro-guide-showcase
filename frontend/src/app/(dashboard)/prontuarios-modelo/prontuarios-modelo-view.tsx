"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Eye, FilePlus2, User, X } from "lucide-react";
import { formatCpf } from "@/lib/cpf";
import type { DiseaseSpecialty, DiseaseSummary, Patient } from "@/lib/api";
import { PatientPicker } from "@/components/patient-picker";

/** Só as duas abas de verdade — `AMBAS` não é aba, é um modelo que aparece nas duas. */
type SpecialtyTab = Exclude<DiseaseSpecialty, "AMBAS">;

const SPECIALTY_LABEL: Record<SpecialtyTab, string> = {
  HEPATO: "Hepatologia",
  GASTRO: "Gastroenterologia",
};

export function ProntuariosModeloView({
  diseases,
  selectedPatient,
}: {
  diseases: DiseaseSummary[];
  selectedPatient: Patient | null;
}) {
  const router = useRouter();
  const [specialty, setSpecialty] = useState<SpecialtyTab>("HEPATO");

  // Sem paciente o card abre o modelo em modo de visualização: a médica pode
  // só querer ver como o prontuário está, sem escolher ninguém.
  const hrefFor = (slug: string) =>
    selectedPatient
      ? `/atendimento?paciente=${selectedPatient.id}&disease=${slug}`
      : `/atendimento?disease=${slug}`;

  return (
    <div className="space-y-6">
      <div className="space-y-2 rounded-xl border border-primary/40 bg-primary/5 px-4 py-3">
        <div className="flex items-center gap-2 text-sm">
          <User className="h-4 w-4 text-primary" />
          <span className="font-medium text-foreground">Paciente</span>
          <span className="text-xs text-muted-foreground">(opcional)</span>
        </div>
        {selectedPatient ? (
          <div className="flex items-center justify-between gap-2 rounded-md border border-border bg-background px-3 py-2">
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold">{selectedPatient.name}</div>
              <div className="truncate text-xs text-muted-foreground">
                {selectedPatient.cpf ? formatCpf(selectedPatient.cpf) : "Sem CPF cadastrado"}
              </div>
            </div>
            <Link
              href="/prontuarios-modelo"
              className="inline-flex shrink-0 items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" /> trocar paciente
            </Link>
          </div>
        ) : (
          <>
            <PatientPicker
              placeholder="Buscar paciente por nome ou CPF"
              onSelect={(p) => router.push(`/prontuarios-modelo?paciente=${p.id}`)}
            />
            <p className="text-xs text-muted-foreground">
              Sem paciente, os modelos abrem só para visualização — nada é salvo.
            </p>
          </>
        )}
      </div>

      <div className="inline-flex rounded-xl border border-border bg-card p-1">
        {(["HEPATO", "GASTRO"] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setSpecialty(s)}
            className={
              specialty === s
                ? "rounded-lg bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground shadow-sm"
                : "rounded-lg px-4 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            }
          >
            {SPECIALTY_LABEL[s]}
          </button>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {diseases
          .filter((d) => d.specialty === specialty || d.specialty === "AMBAS")
          .map((d) => (
            <Link
              key={d.slug}
              href={hrefFor(d.slug)}
              className="group flex flex-col rounded-2xl border border-primary/40 bg-primary/5 p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary hover:shadow-md"
            >
              <span className="mb-3 inline-flex w-fit items-center gap-1.5 rounded-md bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground">
                <FilePlus2 className="h-3 w-3" /> {d.shortName}
              </span>
              <h3 className="text-base font-semibold text-foreground">{d.title}</h3>
              <p className="mt-1.5 flex-1 text-sm text-muted-foreground">
                {d.description || "Cabeçalho estruturado + histórico cronológico."}
              </p>
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary">
                {selectedPatient ? (
                  <>
                    Abrir prontuário
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </>
                ) : (
                  <>
                    <Eye className="h-4 w-4" /> Visualizar modelo
                  </>
                )}
              </span>
            </Link>
          ))}
        {/* O antigo card "Retorno / evolução sem doença associada" saiu daqui:
            quem ocupa esse lugar agora é o modelo "Página em branco", que vem
            do registro (specialty AMBAS) como qualquer outro card. */}
      </div>
    </div>
  );
}
