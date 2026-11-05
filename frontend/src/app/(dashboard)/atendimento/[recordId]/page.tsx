import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAccessToken, getCurrentUser, getCurrentDoctor } from "@/lib/dal";
import {
  getPatientRequest,
  getMedicalRecordRequest,
  getConsultationSectionsRequest,
  getDiseaseConfigRequest,
  type DiseaseFieldSummary,
} from "@/lib/api";
import { buildMedicalRecordDocument } from "@/lib/cfm";
import { DeleteRecordButton } from "./delete-record-button";
import { MedicalRecordDocument } from "./medical-record-document";
import { PrintButton } from "@/components/print-button";

export const metadata = { title: "Registro | Prontuário" };

/**
 * Até 14/10/2026 a evolução usava os campos do retorno (queixa, adesão,
 * exame dirigido…). As chaves que a evolução nova não tem continuam no fim
 * da lista, só para a impressão: sem elas, uma evolução antiga sairia em
 * branco. O documento pula campo sem valor, então numa evolução nova elas
 * não aparecem.
 */
function withLegacyEvolucao(evolucao: DiseaseFieldSummary[], retorno: DiseaseFieldSummary[]) {
  const keys = new Set(evolucao.map((f) => f.key));
  return [...evolucao, ...retorno.filter((f) => !keys.has(f.key))];
}

export default async function MedicalRecordPage({
  params,
  searchParams,
}: {
  params: Promise<{ recordId: string }>;
  searchParams: Promise<{ paciente?: string; de?: string }>;
}) {
  const { recordId } = await params;
  const { paciente: id, de } = await searchParams;
  // Aberto pelo card do histórico de consultas: "voltar" leva de volta para lá.
  const fromHistory = de === "historico";
  const token = await requireAccessToken();

  if (!id) {
    redirect("/pacientes");
  }

  // Mesma razão de prontuario/page.tsx: checar o papel antes do Promise.all
  // evita a corrida entre o 403 sem tratamento de getMedicalRecordRequest e
  // o redirect de getCurrentDoctor.
  const user = await getCurrentUser();
  if (user.role !== "DOCTOR") {
    redirect("/pacientes");
  }

  const [doctor, patient, record, primeiraConsultaFields, retornoFields, evolucaoFields] = await Promise.all([
    getCurrentDoctor(),
    getPatientRequest(token, id),
    getMedicalRecordRequest(token, id, recordId),
    getConsultationSectionsRequest(token, "PRIMEIRA_CONSULTA"),
    getConsultationSectionsRequest(token, "RETORNO"),
    getConsultationSectionsRequest(token, "EVOLUCAO"),
  ]);

  // Config da doença só depois do record resolver (precisamos de record.disease) — não dá
  // pra entrar no Promise.all de cima. Sem doença associada, contentJson também é null.
  const diseaseConfig = record.disease ? await getDiseaseConfigRequest(token, record.disease) : null;
  // Mesma regra da tela de atendimento: modelo com primeira consulta própria
  // (Gastro — Guiada) imprime com os campos dele.
  const consultationFields =
    record.type === "PRIMEIRA_CONSULTA"
      ? (diseaseConfig?.consultationFields ?? primeiraConsultaFields)
      : record.type === "EVOLUCAO"
        ? withLegacyEvolucao(evolucaoFields, retornoFields)
        : retornoFields;
  const doc = buildMedicalRecordDocument(doctor, patient, record, consultationFields, diseaseConfig);

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-6 print:max-w-none print:p-0">
      <div className="flex items-center justify-between gap-3 print:hidden">
        <Link
          href={fromHistory ? `/historico?paciente=${id}` : `/atendimento?paciente=${id}`}
          className="text-sm text-primary"
        >
          {fromHistory ? "← Voltar ao histórico" : "← Voltar ao prontuário"}
        </Link>
        <PrintButton />
      </div>
      <MedicalRecordDocument doc={doc} />
      <div className="print:hidden">
        <DeleteRecordButton patientId={id} recordId={recordId} />
      </div>
    </div>
  );
}
