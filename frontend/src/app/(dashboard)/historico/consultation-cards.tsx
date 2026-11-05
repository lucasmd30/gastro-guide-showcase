import Link from "next/link";
import { Calculator, ChevronRight, ClipboardList } from "lucide-react";
import type { MedicalRecordSummary, MedicalRecordType } from "@/lib/api";
import { RECORD_TYPE_LABELS } from "@/components/medical-record-rows";
import { cn } from "@/lib/utils";

const TIME_ZONE = "America/Sao_Paulo";

/** Consulta em verde (primária), retorno em azul — mesma leitura rápida da agenda. */
const TYPE_STYLES: Record<MedicalRecordType, string> = {
  PRIMEIRA_CONSULTA: "bg-primary/10 text-primary",
  RETORNO: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
  EVOLUCAO: "bg-muted text-muted-foreground",
};

function dateParts(iso: string) {
  const date = new Date(iso);
  const part = (options: Intl.DateTimeFormatOptions) =>
    date.toLocaleString("pt-BR", { timeZone: TIME_ZONE, ...options });
  return {
    day: part({ day: "2-digit" }),
    month: part({ month: "short" }).replace(".", ""),
    year: part({ year: "numeric" }),
    weekday: part({ weekday: "long" }),
    time: part({ hour: "2-digit", minute: "2-digit" }),
  };
}

/**
 * Um card por consulta, do mais recente para o mais antigo (é a ordem em que
 * a API já devolve). Cada card mostra só o que identifica o atendimento —
 * data, tipo, modelo — e o essencial do que foi decidido: hipótese e conduta,
 * em no máximo duas linhas cada. O resto está no registro, que o card abre.
 */
export function ConsultationCards({ patientId, records }: { patientId: string; records: MedicalRecordSummary[] }) {
  if (records.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border bg-card p-10 text-center">
        <ClipboardList className="h-8 w-8 text-muted-foreground" />
        <p className="text-sm font-medium">Nenhuma consulta registrada ainda.</p>
        <p className="text-xs text-muted-foreground">
          Os registros salvos no prontuário deste paciente aparecem aqui.
        </p>
      </div>
    );
  }

  return (
    <ol className="space-y-3">
      {records.map((record) => {
        const when = dateParts(record.createdAt);
        return (
          <li key={record.id}>
            <Link
              href={`/atendimento/${record.id}?paciente=${patientId}&de=historico`}
              className="group flex gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm transition-all hover:border-primary/50 hover:shadow-md sm:gap-4 sm:p-5"
            >
              <div className="flex w-12 shrink-0 flex-col sm:w-14 items-center justify-center self-start rounded-xl bg-muted/60 py-2 text-center leading-tight">
                <span className="text-xl font-semibold text-foreground">{when.day}</span>
                <span className="text-xs uppercase text-muted-foreground">{when.month}</span>
                <span className="text-[11px] text-muted-foreground">{when.year}</span>
              </div>

              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className={cn("rounded-md px-2 py-0.5 text-xs font-semibold", TYPE_STYLES[record.type])}>
                    {RECORD_TYPE_LABELS[record.type]}
                  </span>
                  <span className="rounded-md border border-border px-2 py-0.5 text-xs text-muted-foreground">
                    {record.diseaseName ?? "Geral"}
                  </span>
                  <span className="text-xs text-muted-foreground first-letter:uppercase">
                    {when.weekday}, {when.time}
                  </span>
                </div>

                {record.hypothesis || record.conduct ? (
                  // No celular o rótulo fica em cima: ao lado, o texto virava uma coluna estreita.
                  <dl className="space-y-1 text-sm">
                    {record.hypothesis && (
                      <div className="sm:flex sm:gap-1.5">
                        <dt className="shrink-0 text-xs text-muted-foreground sm:text-sm">Hipótese:</dt>
                        <dd className="line-clamp-2 text-foreground">{record.hypothesis}</dd>
                      </div>
                    )}
                    {record.conduct && (
                      <div className="sm:flex sm:gap-1.5">
                        <dt className="shrink-0 text-xs text-muted-foreground sm:text-sm">Conduta:</dt>
                        <dd className="line-clamp-2 text-foreground">{record.conduct}</dd>
                      </div>
                    )}
                  </dl>
                ) : (
                  <p className="line-clamp-2 text-sm text-muted-foreground">
                    {record.excerpt ?? "Sem hipótese ou conduta registradas."}
                  </p>
                )}

                {(record.scoreCount > 0 || record.crm) && (
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    {record.scoreCount > 0 && (
                      <span className="inline-flex items-center gap-1">
                        <Calculator className="h-3.5 w-3.5" />
                        {record.scoreCount === 1 ? "1 escala" : `${record.scoreCount} escalas`}
                      </span>
                    )}
                    {record.crm && <span>CRM {record.crm}</span>}
                  </div>
                )}
              </div>

              <ChevronRight className="hidden h-5 w-5 shrink-0 self-center text-muted-foreground transition-transform group-hover:translate-x-0.5 sm:block" />
            </Link>
          </li>
        );
      })}
    </ol>
  );
}
