import { requireAccessToken } from "@/lib/dal";
import { listPatientsRequest } from "@/lib/api";
import { PacientesList } from "./pacientes-list";

export const metadata = { title: "Pacientes | Prontuário" };

const PAGE_SIZE = 20;

export default async function PacientesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; pagina?: string }>;
}) {
  const { q, pagina } = await searchParams;
  const token = await requireAccessToken();

  // Busca e página vivem na URL: o estado sobrevive ao botão voltar, o link é
  // compartilhável, e a filtragem acontece no banco em vez de no navegador.
  const page = Math.max(0, (Number(pagina) || 1) - 1);
  const result = await listPatientsRequest(token, { q, page, size: PAGE_SIZE });

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <header>
        <h1 className="text-2xl font-semibold">Pacientes</h1>
        <p className="text-sm text-muted-foreground">
          Selecione um paciente para abrir o prontuário, ou cadastre um novo.
        </p>
      </header>

      <PacientesList result={result} query={q ?? ""} />
    </div>
  );
}
