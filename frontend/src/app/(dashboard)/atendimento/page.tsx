import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAccessToken, getCurrentUser, getCurrentDoctor } from "@/lib/dal";
import { birthDateWithAge } from "@/lib/birth-date";
import {
  getPatientRequest,
  listDiseasesRequest,
  getDiseaseConfigRequest,
  getDiseaseHeaderRequest,
  getConsultationSectionsRequest,
  listMedicalRecordsRequest,
  listDocumentTemplatesRequest,
  getExamPreferencesRequest,
  ApiError,
  type DiseaseHeader,
} from "@/lib/api";
import { ProntuarioView } from "./prontuario-view";

export const metadata = { title: "Prontuário | Prontuário" };

async function safeGetHeader(token: string, patientId: string, disease: string): Promise<DiseaseHeader | null> {
  try {
    return await getDiseaseHeaderRequest(token, patientId, disease);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

export default async function ProntuarioPage({
  searchParams,
}: {
  searchParams: Promise<{ paciente?: string; disease?: string }>;
}) {
  const { paciente: id, disease: initialDiseaseSlug } = await searchParams;
  const token = await requireAccessToken();

  // Checa o papel *antes* de disparar as buscas em paralelo: se isso rodasse
  // dentro do mesmo Promise.all, uma secretária correndo contra os 403 de
  // listDiseasesRequest/listMedicalRecordsRequest (sem tratamento de erro
  // próprio) poderia ver a página quebrar com 500 em vez de redirecionar —
  // mesma corrida já corrigida em getCurrentDoctor/listSecretarias.
  const user = await getCurrentUser();
  if (user.role !== "DOCTOR") {
    redirect("/pacientes");
  }

  // Sem paciente na URL é a visualização do modelo, aberta de Prontuários
  // modelo: a mesma tela, sem histórico, sem cabeçalho salvo e sem salvar.
  const [doctor, patient, diseaseSummaries, records, documentTemplates, examPreferences] = await Promise.all([
    getCurrentDoctor(),
    id ? getPatientRequest(token, id) : Promise.resolve(null),
    listDiseasesRequest(token),
    id ? listMedicalRecordsRequest(token, id) : Promise.resolve([]),
    // Modelos próprios do médico, para o card de documentos.
    id ? listDocumentTemplatesRequest(token) : Promise.resolve([]),
    // Combos próprios e favoritos, para o card de solicitação de exames (também na visualização).
    getExamPreferencesRequest(token),
  ]);

  const diseaseConfigs = await Promise.all(
    diseaseSummaries.map((d) => getDiseaseConfigRequest(token, d.slug)),
  );
  const headers = await Promise.all(
    diseaseConfigs.map((config) => (id ? safeGetHeader(token, id, config.slug) : Promise.resolve(null))),
  );

  const birthLabel = patient ? birthDateWithAge(patient.birthDate) : null;

  const [primeiraConsultaFields, retornoFields, evolucaoFields] = await Promise.all([
    getConsultationSectionsRequest(token, "PRIMEIRA_CONSULTA"),
    getConsultationSectionsRequest(token, "RETORNO"),
    getConsultationSectionsRequest(token, "EVOLUCAO"),
  ]);

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <header>
        <Link href={patient ? `/pacientes/${patient.id}` : "/prontuarios-modelo"} className="text-sm text-primary">
          ← Voltar
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">
          {patient ? `Prontuário — ${patient.name}` : "Visualização do modelo"}
        </h1>
        {birthLabel && <p className="text-sm text-muted-foreground">Nascimento: {birthLabel}</p>}
      </header>

      <ProntuarioView
        patientId={patient?.id ?? null}
        patientName={patient?.name ?? null}
        patientCpf={patient?.cpf ?? null}
        patientBirthLabel={birthLabel}
        records={records}
        diseaseConfigs={diseaseConfigs}
        headers={headers}
        doctorCrms={doctor.crms}
        doctorRqes={doctor.rqes}
        primeiraConsultaFields={primeiraConsultaFields}
        retornoFields={retornoFields}
        evolucaoFields={evolucaoFields}
        documentTemplates={documentTemplates}
        examPreferences={examPreferences}
        initialDiseaseSlug={initialDiseaseSlug}
      />
    </div>
  );
}

