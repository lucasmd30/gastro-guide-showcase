import Link from "next/link";
import type { MedicalRecordSummary, MedicalRecordType } from "@/lib/api";

export const RECORD_TYPE_LABELS: Record<MedicalRecordType, string> = {
  PRIMEIRA_CONSULTA: "Consulta",
  RETORNO: "Retorno",
  EVOLUCAO: "Evolução",
};

/**
 * Linhas do histórico cronológico, cada uma levando ao documento CFM do
 * registro. Compartilhadas entre a ficha do paciente e o painel "Histórico"
 * da tela de atendimento — lá, `newTab` abre o documento em outra aba para
 * não perder o registro que está sendo preenchido.
 */
export function MedicalRecordRows({
  patientId,
  records,
  newTab = false,
}: {
  patientId: string;
  records: MedicalRecordSummary[];
  newTab?: boolean;
}) {
  return (
    <div className="divide-y divide-border rounded-md border border-border">
      {records.length === 0 && <p className="p-4 text-sm text-muted-foreground">Nenhum registro ainda.</p>}
      {records.map((record) => (
        <Link
          key={record.id}
          href={`/atendimento/${record.id}?paciente=${patientId}`}
          target={newTab ? "_blank" : undefined}
          rel={newTab ? "noopener" : undefined}
          className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm hover:bg-accent/40"
        >
          <div>
            <span className="font-medium">{RECORD_TYPE_LABELS[record.type]}</span>
            {record.disease && (
              <span className="ml-2 text-xs text-muted-foreground">{record.diseaseName ?? record.disease}</span>
            )}
            <div className="text-xs text-muted-foreground">{record.title}</div>
          </div>
          <span className="shrink-0 text-xs text-muted-foreground">
            {new Date(record.createdAt).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}
          </span>
        </Link>
      ))}
    </div>
  );
}
