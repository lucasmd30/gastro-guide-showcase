import { requireAccessToken } from "@/lib/dal";
import {
  getAppointmentDurationsRequest,
  listAvailabilityBlocksRequest,
  listAvailabilityWindowsRequest,
  listOpenSlotsRequest,
} from "@/lib/api";
import { DisponibilidadeView } from "./disponibilidade-view";

export const metadata = { title: "Disponibilidade | Prontuário" };

/**
 * Janelas de atendimento, fechamentos, durações e valores. Item próprio da
 * barra lateral desde 13/10/2026 (antes era uma aba da Agenda). Como a
 * Agenda carrega a grade a cada visita, mexer aqui e voltar lá já mostra os
 * horários novos.
 */
export default async function DisponibilidadePage() {
  const token = await requireAccessToken();
  const [windows, blocks, durations, slots] = await Promise.all([
    listAvailabilityWindowsRequest(token),
    listAvailabilityBlocksRequest(token),
    getAppointmentDurationsRequest(token),
    listOpenSlotsRequest(token, "PRIMEIRA_CONSULTA"),
  ]);

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
      <header>
        <h1 className="text-2xl font-semibold">Disponibilidade</h1>
        <p className="text-sm text-muted-foreground">
          Janelas de atendimento abrem horários por período; fechamentos tiram dias ou faixas. É daqui que saem os
          horários da agenda e do link de consulta.
        </p>
      </header>

      <DisponibilidadeView windows={windows} blocks={blocks} durations={durations} openSlotCount={slots.length} />
    </div>
  );
}
