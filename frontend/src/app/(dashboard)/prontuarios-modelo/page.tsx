import { redirect } from "next/navigation";
import { requireAccessToken, getCurrentUser } from "@/lib/dal";
import { listDiseasesRequest, getPatientRequest, ApiError, type Patient } from "@/lib/api";
import { ProntuariosModeloView } from "./prontuarios-modelo-view";

export const metadata = { title: "Prontuários modelo | Prontuário" };

export default async function ProntuariosModeloPage({
  searchParams,
}: {
  searchParams: Promise<{ paciente?: string }>;
}) {
  const { paciente } = await searchParams;
  const token = await requireAccessToken();

  // Mesma razão das demais páginas clínicas: checar o papel antes das buscas
  // evita a secretária ver a página quebrar com 500 em vez de redirecionar.
  const user = await getCurrentUser();
  if (user.role !== "DOCTOR") {
    redirect("/pacientes");
  }

  // Os cards aparecem sempre (pedido de 08/10/2026): antes a tela era uma
  // lista de pacientes, que repetia a aba Pacientes. O paciente agora é um
  // seletor opcional no topo — sem ele, o modelo abre só para visualização.
  const diseases = await listDiseasesRequest(token);

  let selectedPatient: Patient | null = null;
  if (paciente) {
    try {
      selectedPatient = await getPatientRequest(token, paciente);
    } catch (error) {
      if (!(error instanceof ApiError && error.status === 404)) throw error;
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <header>
        <h1 className="text-2xl font-semibold">Prontuários modelo</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Escolha o modelo. Com um paciente selecionado, ele abre pronto para preencher e salvar.
        </p>
      </header>

      <ProntuariosModeloView diseases={diseases} selectedPatient={selectedPatient} />
    </div>
  );
}
