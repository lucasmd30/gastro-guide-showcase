import Link from "next/link";
import { ArrowRight, FileText, ShieldCheck } from "lucide-react";
import type { MedicalDocument } from "@/lib/api";
import { KIND_LABEL } from "@/lib/document-models";

/** Uma linha da lista de documentos emitidos (tela Documentos e ficha do paciente). */
export function DocumentRow({ patientId, document }: { patientId: string; document: MedicalDocument }) {
  return (
    <Link
      href={`/documentos/${document.id}?paciente=${patientId}`}
      className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-2 text-sm hover:bg-accent/40"
    >
      <span className="flex min-w-0 flex-wrap items-center gap-2">
        <FileText className="h-3.5 w-3.5 shrink-0 text-primary" />
        <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
          {KIND_LABEL[document.kind]}
        </span>
        <span className="font-medium">{document.title}</span>
        <span className="text-xs text-muted-foreground">
          {new Date(document.issuedAt).toLocaleString("pt-BR", {
            dateStyle: "short",
            timeStyle: "short",
            timeZone: "America/Sao_Paulo",
          })}
        </span>
        {document.signed && (
          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-[11px] font-medium text-emerald-700">
            <ShieldCheck className="h-3 w-3" /> Assinado
          </span>
        )}
      </span>
      <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
    </Link>
  );
}
