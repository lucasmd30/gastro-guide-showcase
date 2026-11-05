import Link from "next/link";
import { redirect } from "next/navigation";
import { FilePlus2 } from "lucide-react";
import { requireAccessToken, getCurrentUser } from "@/lib/dal";
import { getPatientRequest, listMedicalRecordsRequest, ApiError } from "@/lib/api";
import { birthDateWithAge } from "@/lib/birth-date";
import { ConsultationCards } from "./consultation-cards";

export const metadata = { title: "Histórico de consultas | Prontuário" };

/**
 * Histórico de consultas do paciente (pedido de 09/10/2026): um card por
 * registro, do mais recente para o mais antigo, e o card abre o registro
 * completo. Rota na raiz com `?paciente=`, e não em `pacientes/[id]/…`, pela
 * convenção do projeto (rota aninhada em segmento dinâmico já deu 404
 * permanente nesta máquina).
 */
export default async function HistoricoPage({ searchParams }: { searchParams: Promise<{ paciente?: string }> }) {
  const { paciente: id } = await searchParams;
  const token = await requireAccessToken();
  if (!id) {
    redirect("/pacientes");
  }

  // Prontuário é só do médico — mesmo cuidado das outras páginas clínicas:
  // checar o papel antes das buscas que dariam 403.
  const user = await getCurrentUser();
  if (user.role !== "DOCTOR") {
    redirect(`/pacientes/${id}`);
  }

  try {
    const [patient, records] = await Promise.all([
      getPatientRequest(token, id),
      listMedicalRecordsRequest(token, id),
    ]);
    const birthLabel = birthDateWithAge(patient.birthDate);

    return (
      <div className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6">
        <header className="space-y-3">
          <Link href={`/pacientes/${id}`} className="text-sm text-primary">
            ← Voltar ao paciente
          </Link>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold">Histórico de consultas</h1>
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{patient.name}</span>
                {birthLabel && <> · {birthLabel}</>}
                {" · "}
                {records.length === 1 ? "1 consulta" : `${records.length} consultas`}
              </p>
            </div>
            <Link
              href={`/prontuarios-modelo?paciente=${id}`}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
            >
              <FilePlus2 className="h-4 w-4" /> Novo prontuário
            </Link>
          </div>
        </header>

        <ConsultationCards patientId={id} records={records} />
      </div>
    );
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return (
        <div className="mx-auto max-w-3xl space-y-4 p-6">
          <Link href="/pacientes" className="text-sm text-primary">
            ← Voltar
          </Link>
          <p className="text-muted-foreground">Paciente não encontrado.</p>
        </div>
      );
    }
    throw error;
  }
}
