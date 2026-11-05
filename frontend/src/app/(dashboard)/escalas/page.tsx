import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/dal";
import { ScalesTool } from "./scales-tool";

export const metadata = { title: "Escalas e calculadoras | Prontuário" };

/**
 * As mesmas 60 escalas da tela de atendimento, para consulta rápida sem abrir
 * prontuário. Aqui o resultado não é anexado a nada — para isso, a escala é
 * calculada de dentro do atendimento.
 */
export default async function EscalasPage() {
  // Ferramenta clínica: a secretária não tem o item na sidebar nem a página.
  const user = await getCurrentUser();
  if (user.role !== "DOCTOR") {
    redirect("/pacientes");
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <header>
        <h1 className="text-2xl font-semibold">Escalas e calculadoras</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Consulta rápida. Para anexar o resultado a um registro, calcule de dentro do atendimento.
        </p>
      </header>
      <ScalesTool />
    </div>
  );
}
