import Link from "next/link";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import type { PatientPage } from "@/lib/api";
import { formatCpf } from "@/lib/cpf";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * Lista de pacientes para escolher para quem é a tela (Documentos, Solicitar
 * exames): a médica vê quem já está cadastrado em vez de ter de lembrar o nome
 * para buscar. Busca e página ficam na URL, como em /pacientes, e a filtragem
 * é no banco.
 */
export function PatientChoiceList({
  basePath,
  title,
  result,
  query,
}: {
  /** A tela que abre com `?paciente=<id>`. */
  basePath: string;
  title: string;
  result: PatientPage;
  query: string;
}) {
  const pageHref = (page: number) => {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    params.set("pagina", String(page + 1));
    return `${basePath}?${params.toString()}`;
  };

  return (
    <div className="space-y-3">
      <div className="space-y-2 rounded-2xl border border-border bg-card p-5">
        <p className="text-sm font-medium">{title}</p>
        <form method="get" action={basePath} className="flex items-center gap-2">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              name="q"
              defaultValue={query}
              placeholder="Buscar paciente por nome ou CPF"
              className="pl-9"
            />
          </div>
          <Button type="submit" variant="outline">
            Buscar
          </Button>
        </form>
      </div>

      <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
        {result.items.length === 0 && (
          <div className="p-6 text-sm text-muted-foreground">
            {query ? (
              "Nenhum paciente encontrado."
            ) : (
              <>
                Nenhum paciente cadastrado ainda.{" "}
                <Link href="/pacientes" className="text-primary underline">
                  Cadastrar paciente
                </Link>
              </>
            )}
          </div>
        )}
        {result.items.map((patient) => (
          <Link
            key={patient.id}
            href={`${basePath}?paciente=${patient.id}`}
            className="flex items-center justify-between gap-3 px-5 py-3 transition-colors hover:bg-accent/40"
          >
            <div className="min-w-0">
              <div className="truncate font-medium text-foreground">{patient.name}</div>
              <div className="truncate text-xs text-muted-foreground">
                {patient.cpf ? formatCpf(patient.cpf) : "—"}
              </div>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
          </Link>
        ))}
      </div>

      {result.total > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 px-1">
          <span className="text-xs text-muted-foreground">
            {result.total} paciente{result.total === 1 ? "" : "s"}
          </span>
          {result.totalPages > 1 && (
            <div className="flex items-center gap-2">
              {result.page > 0 ? (
                <Button asChild variant="ghost" size="sm">
                  <Link href={pageHref(result.page - 1)}>
                    <ChevronLeft className="mr-1 h-4 w-4" /> Anterior
                  </Link>
                </Button>
              ) : (
                <Button variant="ghost" size="sm" disabled>
                  <ChevronLeft className="mr-1 h-4 w-4" /> Anterior
                </Button>
              )}
              <span className="text-xs text-muted-foreground">
                {result.page + 1} / {result.totalPages}
              </span>
              {result.page + 1 < result.totalPages ? (
                <Button asChild variant="ghost" size="sm">
                  <Link href={pageHref(result.page + 1)}>
                    Próxima <ChevronRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
              ) : (
                <Button variant="ghost" size="sm" disabled>
                  Próxima <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
