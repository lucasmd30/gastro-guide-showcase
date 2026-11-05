import Link from "next/link";
import { FileBadge, FilePlus2, History } from "lucide-react";
import { requireAccessToken, getCurrentUser } from "@/lib/dal";
import { getPatientRequest, listMedicalRecordsRequest, listMedicalDocumentsRequest, ApiError } from "@/lib/api";
import { DocumentRow } from "@/components/documents/document-row";
import { PacienteForm } from "./paciente-form";

export const metadata = { title: "Paciente | Prontuário" };

export default async function PacienteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const token = await requireAccessToken();
  const user = await getCurrentUser();

  try {
    const patient = await getPatientRequest(token, id);
    // Só o médico enxerga prontuário e documentos — a secretária recebe 403
    // nessas rotas. A lista do prontuário vive no "Histórico de consultas";
    // aqui só a contagem.
    const [records, documents] =
      user.role === "DOCTOR"
        ? await Promise.all([listMedicalRecordsRequest(token, id), listMedicalDocumentsRequest(token, id)])
        : [[], []];
    return (
      <div className="mx-auto max-w-3xl space-y-6 p-6">
        <header>
          <Link href="/pacientes" className="text-sm text-primary">
            ← Voltar
          </Link>
          <h1 className="mt-2 text-2xl font-semibold">{patient.name}</h1>
          {user.role === "DOCTOR" && (
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <Link
                href={`/prontuarios-modelo?paciente=${id}`}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
              >
                <FilePlus2 className="h-4 w-4" /> Novo prontuário
              </Link>
              <Link
                href={`/historico?paciente=${id}`}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-accent"
              >
                <History className="h-4 w-4" /> Histórico de consultas ({records.length})
              </Link>
              <Link
                href={`/documentos?paciente=${id}`}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-accent"
              >
                <FileBadge className="h-4 w-4" /> Novo documento
              </Link>
            </div>
          )}
        </header>

        {user.role === "DOCTOR" && documents.length > 0 && (
          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-muted-foreground">
              Documentos emitidos ({documents.length})
            </h2>
            {documents.map((d) => (
              <DocumentRow key={d.id} patientId={id} document={d} />
            ))}
          </section>
        )}

        <PacienteForm patient={patient} canDelete={user.role === "DOCTOR"} showClinicalFields={user.role === "DOCTOR"} />

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
