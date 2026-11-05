import { redirect } from "next/navigation";
import { requireAccessToken } from "@/lib/dal";
import { getAppointmentDurationsRequest, listAgendaHealthPlansRequest } from "@/lib/api";
import { AgendaView } from "./agenda-view";

export const metadata = { title: "Agenda | Prontuário" };

/**
 * Agenda do dia e do mês. A disponibilidade, que já foi uma aba daqui, virou
 * item próprio da barra lateral (pedido da cliente, 13/10/2026); o link
 * antigo `?aba=disponibilidade` só encaminha.
 */
export default async function AgendaPage({ searchParams }: { searchParams: Promise<{ aba?: string }> }) {
  const { aba } = await searchParams;
  if (aba === "disponibilidade") {
    redirect("/disponibilidade");
  }
  const token = await requireAccessToken();

  // Os convênios do perfil viram as opções de "Plano"; os valores padrão do
  // particular pré-preenchem o "Valor".
  const [healthPlans, durations] = await Promise.all([
    listAgendaHealthPlansRequest(token),
    getAppointmentDurationsRequest(token),
  ]);

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
      <header>
        <h1 className="text-2xl font-semibold">Agenda</h1>
        <p className="text-sm text-muted-foreground">
          Marque consultas e acompanhe os agendamentos do dia. Os horários livres vêm da Disponibilidade.
        </p>
      </header>

      <AgendaView healthPlans={healthPlans} durations={durations} />
    </div>
  );
}
