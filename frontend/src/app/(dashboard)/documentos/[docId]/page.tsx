import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAccessToken, getCurrentUser, getCurrentDoctor } from "@/lib/dal";
import { getPatientRequest, getMedicalDocumentRequest, ApiError } from "@/lib/api";
import { formatBirthDate } from "@/lib/birth-date";
import { formatCpf } from "@/lib/cpf";
import { officeAddressLines, officeCityLabel } from "@/lib/office-address";
import { PrintButton } from "@/components/print-button";
import { SignaturePanel } from "@/components/documents/signature-panel";

export const metadata = { title: "Documento | Prontuário" };

/**
 * Documento emitido, pronto para imprimir — o `documentos.$id.tsx` do
 * protótipo, no estilo do documento do prontuário. CRM/RQE vêm do próprio
 * documento (congelados na emissão), não do perfil atual do médico. Não há
 * botão de excluir: documento emitido é definitivo. Abaixo da folha (fora da
 * impressão), a assinatura digital: gerar o PDF, assinar e anexar.
 */
export default async function DocumentoPage({
  params,
  searchParams,
}: {
  params: Promise<{ docId: string }>;
  searchParams: Promise<{ paciente?: string }>;
}) {
  const { docId } = await params;
  const { paciente: patientId } = await searchParams;
  const token = await requireAccessToken();

  if (!patientId) {
    redirect("/documentos");
  }
  const user = await getCurrentUser();
  if (user.role !== "DOCTOR") {
    redirect("/pacientes");
  }

  try {
    const [doctor, patient, document] = await Promise.all([
      getCurrentDoctor(),
      getPatientRequest(token, patientId),
      getMedicalDocumentRequest(token, patientId, docId),
    ]);

    const issued = new Date(document.issuedAt);
    const issuedDate = issued.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
    const issuedAt = issued.toLocaleString("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
      timeZone: "America/Sao_Paulo",
    });
    const registration = [
      document.specialty,
      `CRM ${document.crm}/${document.crmUf}`,
      document.rqe ? `RQE ${document.rqe}` : null,
    ]
      .filter(Boolean)
      .join(" · ");

    return (
      <div className="mx-auto max-w-3xl space-y-4 p-6 print:max-w-none print:p-0">
        <div className="flex items-center justify-between gap-3 print:hidden">
          <Link href={`/documentos?paciente=${patientId}`} className="text-sm text-primary">
            ← Documentos
          </Link>
          <PrintButton />
        </div>

        <article className="rounded-xl border border-border bg-card px-6 py-7 text-[15px] leading-relaxed text-foreground shadow-sm sm:px-12 sm:py-10 print:border-0 print:p-0 print:shadow-none">
          <header className="space-y-1 border-b-2 border-foreground/80 pb-4">
            <h1 className="text-lg font-bold uppercase tracking-wide">{document.title}</h1>
            <p className="font-semibold">{doctor.name}</p>
            <p className="text-sm">{registration}</p>
            {officeAddressLines(doctor.officeAddress).map((line) => (
              <p key={line} className="text-sm text-muted-foreground">
                {line}
              </p>
            ))}
            {doctor.phone && <p className="text-sm text-muted-foreground">Tel.: {doctor.phone}</p>}
          </header>

          <section className="mt-5 text-sm">
            <p>
              <span className="font-semibold">Paciente:</span> {patient.name}
            </p>
            {(patient.birthDate || patient.cpf) && (
              <p className="text-muted-foreground">
                {patient.birthDate && <>Nascimento: {formatBirthDate(patient.birthDate)}</>}
                {patient.birthDate && patient.cpf && " · "}
                {patient.cpf && <>CPF: {formatCpf(patient.cpf)}</>}
              </p>
            )}
          </section>

          <section className="mt-8 whitespace-pre-wrap">{document.content}</section>

          <footer className="mt-16 space-y-12 break-inside-avoid text-sm">
            {/* A cidade do endereço comercial preenche o local; sem ela, fica a linha para escrever. */}
            <p>
              Local e data: {officeCityLabel(doctor.officeAddress) ?? "______________________"}, {issuedDate}
            </p>
            <div className="mx-auto w-full max-w-xs border-t border-foreground/70 pt-2 text-center">
              <p className="font-semibold">{doctor.name}</p>
              <p>
                CRM {document.crm}/{document.crmUf}
              </p>
              {document.rqe && <p>RQE {document.rqe}</p>}
            </div>
            <div className="space-y-0.5 border-t border-border pt-3 text-center text-xs text-muted-foreground">
              <p>Documento emitido conforme as Resoluções CFM 1.638/2002, 1.821/2007 e 1.851/2008.</p>
              <p>
                Emitido em {issuedAt}. Código de verificação:{" "}
                <span className="font-mono">
                  {document.verificationCode.slice(0, 4)}-{document.verificationCode.slice(4)}
                </span>
              </p>
            </div>
          </footer>
        </article>

        <SignaturePanel patientId={patientId} document={document} />
      </div>
    );
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return (
        <div className="mx-auto max-w-3xl space-y-4 p-6">
          <Link href="/documentos" className="text-sm text-primary">
            ← Documentos
          </Link>
          <p className="text-muted-foreground">Documento não encontrado.</p>
        </div>
      );
    }
    throw error;
  }
}
