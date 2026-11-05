import Link from "next/link";
import { redirect } from "next/navigation";
import { FileBadge } from "lucide-react";
import { requireAccessToken, getCurrentUser, getCurrentDoctor } from "@/lib/dal";
import {
  getPatientRequest,
  listPatientsRequest,
  listMedicalDocumentsRequest,
  listDocumentTemplatesRequest,
  ApiError,
} from "@/lib/api";
import { PatientChoiceList } from "@/components/patient-choice-list";
import { DocumentosView } from "./documentos-view";

export const metadata = { title: "Documentos | Prontuário" };

export default async function DocumentosPage({
  searchParams,
}: {
  searchParams: Promise<{ paciente?: string; modelo?: string; q?: string; pagina?: string }>;
}) {
  const { paciente, modelo, q, pagina } = await searchParams;
  const token = await requireAccessToken();

  // Mesma razão das outras páginas clínicas: checar o papel antes do
  // Promise.all, para a secretária ser redirecionada em vez de ver um 500.
  const user = await getCurrentUser();
  if (user.role !== "DOCTOR") {
    redirect("/pacientes");
  }

  const heading = (
    <header>
      <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
        <FileBadge className="h-3.5 w-3.5" /> Documentos médicos
      </div>
      <h1 className="text-2xl font-semibold">Emitir documento</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Atestados, declarações, encaminhamentos, relatórios, solicitações de exame e orientações.
      </p>
    </header>
  );

  if (!paciente) {
    const page = Math.max(0, (Number(pagina) || 1) - 1);
    const result = await listPatientsRequest(token, { q, page, size: 20 });
    return (
      <div className="mx-auto max-w-3xl space-y-6 p-6">
        {heading}
        <PatientChoiceList basePath="/documentos" title="Para quem é o documento?" result={result} query={q ?? ""} />
      </div>
    );
  }

  try {
    const [doctor, patient, documents, templates] = await Promise.all([
      getCurrentDoctor(),
      getPatientRequest(token, paciente),
      listMedicalDocumentsRequest(token, paciente),
      listDocumentTemplatesRequest(token),
    ]);

    return (
      <div className="mx-auto max-w-5xl space-y-6 p-6">
        {heading}
        <DocumentosView
          key={patient.id}
          patient={{ id: patient.id, name: patient.name, cpf: patient.cpf }}
          doctorCrms={doctor.crms}
          doctorRqes={doctor.rqes}
          documents={documents}
          templates={templates}
          initialModelId={modelo}
        />
      </div>
    );
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return (
        <div className="mx-auto max-w-3xl space-y-4 p-6">
          <Link href="/documentos" className="text-sm text-primary">
            ← Voltar
          </Link>
          <p className="text-muted-foreground">Paciente não encontrado.</p>
        </div>
      );
    }
    throw error;
  }
}
