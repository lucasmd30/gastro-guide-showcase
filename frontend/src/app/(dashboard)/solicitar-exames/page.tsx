import Link from "next/link";
import { redirect } from "next/navigation";
import { ClipboardList, User, X } from "lucide-react";
import { requireAccessToken, getCurrentUser, getCurrentDoctor } from "@/lib/dal";
import { getPatientRequest, getExamPreferencesRequest, listPatientsRequest, ApiError } from "@/lib/api";
import { ExamOrder } from "@/components/exams/exam-order";
import { PatientChoiceList } from "@/components/patient-choice-list";

export const metadata = { title: "Solicitar exames | Prontuário" };

/**
 * A tela "Solicitar exames" do protótipo Lovable: o pedido sem abrir um
 * prontuário. O mesmo pedido existe como card na tela de atendimento.
 */
export default async function SolicitarExamesPage({
  searchParams,
}: {
  searchParams: Promise<{ paciente?: string; q?: string; pagina?: string }>;
}) {
  const { paciente, q, pagina } = await searchParams;
  const token = await requireAccessToken();

  // Checar o papel antes do Promise.all, para a secretária ser redirecionada
  // em vez de ver um 500 (mesma corrida das outras páginas clínicas).
  const user = await getCurrentUser();
  if (user.role !== "DOCTOR") {
    redirect("/pacientes");
  }

  const heading = (
    <header>
      <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
        <ClipboardList className="h-3.5 w-3.5" /> Pedido de exames
      </div>
      <h1 className="text-2xl font-semibold">Solicitar exames</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Monte o pedido sem precisar abrir um prontuário. Use a busca ou os combos por doença.
      </p>
    </header>
  );

  if (!paciente) {
    const page = Math.max(0, (Number(pagina) || 1) - 1);
    const result = await listPatientsRequest(token, { q, page, size: 20 });
    return (
      <div className="mx-auto max-w-3xl space-y-6 p-6">
        {heading}
        <PatientChoiceList basePath="/solicitar-exames" title="Para quem é o pedido?" result={result} query={q ?? ""} />
      </div>
    );
  }

  try {
    const [doctor, patient, preferences] = await Promise.all([
      getCurrentDoctor(),
      getPatientRequest(token, paciente),
      getExamPreferencesRequest(token),
    ]);

    return (
      <div className="mx-auto max-w-5xl space-y-6 p-6">
        {heading}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/40 bg-primary/5 px-4 py-3">
          <Link href={`/pacientes/${patient.id}`} className="flex items-center gap-2 text-sm hover:underline">
            <User className="h-4 w-4 text-primary" />
            <span className="text-muted-foreground">Paciente:</span>
            <span className="font-semibold">{patient.name}</span>
          </Link>
          <Link
            href="/solicitar-exames"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" /> trocar paciente
          </Link>
        </div>
        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <ExamOrder
            key={patient.id}
            patient={{ id: patient.id, name: patient.name }}
            doctorCrms={doctor.crms}
            doctorRqes={doctor.rqes}
            preferences={preferences}
          />
        </section>
      </div>
    );
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return (
        <div className="mx-auto max-w-3xl space-y-4 p-6">
          <Link href="/solicitar-exames" className="text-sm text-primary">
            ← Voltar
          </Link>
          <p className="text-muted-foreground">Paciente não encontrado.</p>
        </div>
      );
    }
    throw error;
  }
}
