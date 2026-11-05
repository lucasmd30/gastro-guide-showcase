"use server";

import { revalidatePath } from "next/cache";
import { requireAccessToken } from "@/lib/dal";
import {
  listAppointmentsRequest,
  listOpenSlotsRequest,
  createAppointmentRequest,
  updateAppointmentRequest,
  deleteAppointmentRequest,
  ApiError,
  type Appointment,
  type AppointmentType,
  type AppointmentStatus,
  type AppointmentModality,
  type AppointmentBilling,
  type AvailabilitySlot,
} from "@/lib/api";
import { parseBRL } from "@/lib/money";

export interface AgendaFormState {
  error?: string;
  success?: boolean;
  /** O horário cruza outro agendamento (409): a tela oferece marcar como encaixe. */
  conflict?: boolean;
}

/** Chamada direto de Client Components (`AgendaView`) — não precisa de uma rota HTTP própria. */
export async function listAppointmentsForRange(from: string, to: string): Promise<Appointment[]> {
  const token = await requireAccessToken();
  return listAppointmentsRequest(token, from, to);
}

/**
 * Os horários livres da grade num intervalo (a agenda pede o mês visível):
 * viram os dias verdes do calendário, as linhas "horário livre" do dia e o
 * destaque no seletor de hora.
 */
export async function listOpenSlotsForRange(
  type: AppointmentType,
  from: string,
  to: string,
): Promise<AvailabilitySlot[]> {
  const token = await requireAccessToken();
  return listOpenSlotsRequest(token, type, { from, to });
}

/**
 * Data e hora vêm em campos separados (`YYYY-MM-DD` + `HH:mm`), sem fuso —
 * um horário de parede. Tratamos sempre como horário de Brasília (UTC-3
 * fixo, sem horário de verão desde 2019), não deixamos o servidor
 * (container em UTC) interpretar como fuso dele. Mesma classe de bug já
 * corrigida no rodapé CFM (ver documentação interna).
 */
function localDateTimeToUtcIso(date: string, time: string): string {
  return new Date(`${date}T${time}:00-03:00`).toISOString();
}

export async function createAppointment(
  _prevState: AgendaFormState,
  formData: FormData,
): Promise<AgendaFormState> {
  const token = await requireAccessToken();

  const patientId = String(formData.get("patientId") ?? "").trim();
  const date = String(formData.get("date") ?? "").trim();
  const time = String(formData.get("time") ?? "").trim();
  const type = String(formData.get("type") ?? "") as AppointmentType;
  const modality = String(formData.get("modality") ?? "PRESENCIAL") as AppointmentModality;
  const billing = String(formData.get("billing") ?? "PARTICULAR") as AppointmentBilling;
  const healthPlan = String(formData.get("healthPlan") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const encaixe = formData.get("encaixe") === "true";

  if (!patientId) {
    return { error: "Selecione o paciente." };
  }
  if (!date || !time) {
    return { error: "Escolha a data e o horário." };
  }
  // Valor do particular: vazio = o padrão do tipo (o backend aplica).
  const price = billing === "PARTICULAR" ? parseBRL(String(formData.get("price") ?? "")) : null;
  if (price === undefined) {
    return { error: "Valor inválido. Use, por exemplo, 450 ou 450,00." };
  }
  if (billing === "CONVENIO" && !healthPlan) {
    return { error: "Informe o plano do convênio." };
  }

  try {
    await createAppointmentRequest(token, {
      patientId,
      scheduledAt: localDateTimeToUtcIso(date, time),
      type,
      modality,
      billing,
      healthPlan: billing === "CONVENIO" ? healthPlan : undefined,
      priceCents: price ?? undefined,
      notes: notes || undefined,
      encaixe: encaixe || undefined,
    });
    revalidatePath("/agenda");
    return { success: true };
  } catch (error) {
    if (error instanceof ApiError) {
      return { error: error.message, conflict: error.status === 409 };
    }
    throw error;
  }
}

export async function updateAppointmentStatus(
  appointmentId: string,
  status: AppointmentStatus,
): Promise<AgendaFormState> {
  const token = await requireAccessToken();

  try {
    await updateAppointmentRequest(token, appointmentId, { status });
    revalidatePath("/agenda");
    return { success: true };
  } catch (error) {
    if (error instanceof ApiError) {
      return { error: error.message };
    }
    throw error;
  }
}

/** Contratação ajustada na linha do dia — é onde a secretária completa a das consultas marcadas pelo link. */
export async function updateAppointmentBilling(
  appointmentId: string,
  billing: AppointmentBilling,
  healthPlan: string,
  price: string = "",
): Promise<AgendaFormState> {
  const token = await requireAccessToken();
  const plan = healthPlan.trim();
  if (billing === "CONVENIO" && !plan) {
    return { error: "Informe o plano do convênio." };
  }
  const priceCents = billing === "PARTICULAR" ? parseBRL(price) : null;
  if (priceCents === undefined) {
    return { error: "Valor inválido. Use, por exemplo, 450 ou 450,00." };
  }

  try {
    await updateAppointmentRequest(token, appointmentId, {
      billing,
      healthPlan: billing === "CONVENIO" ? plan : undefined,
      priceCents,
    });
    revalidatePath("/agenda");
    return { success: true };
  } catch (error) {
    if (error instanceof ApiError) {
      return { error: error.message };
    }
    throw error;
  }
}

export async function deleteAppointment(
  appointmentId: string,
  _prevState: AgendaFormState,
  _formData: FormData,
): Promise<AgendaFormState> {
  const token = await requireAccessToken();

  try {
    await deleteAppointmentRequest(token, appointmentId);
  } catch (error) {
    if (error instanceof ApiError) {
      return { error: error.message };
    }
    throw error;
  }

  revalidatePath("/agenda");
  return { success: true };
}

/**
 * Remarca uma consulta para outra data/hora (botão "Remarcar" da linha do
 * dia e "Mover paciente para cá" do horário livre). O backend recusa com 409
 * se o novo horário cruzar outro agendamento que ainda ocupa a agenda —
 * cancelado e falta não ocupam —, a não ser que seja um encaixe.
 */
export async function rescheduleAppointment(
  appointmentId: string,
  date: string,
  time: string,
  encaixe?: boolean,
): Promise<AgendaFormState> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) {
    return { error: "Escolha a data e o horário." };
  }
  const token = await requireAccessToken();

  try {
    await updateAppointmentRequest(token, appointmentId, { scheduledAt: localDateTimeToUtcIso(date, time), encaixe });
    revalidatePath("/agenda");
    return { success: true };
  } catch (error) {
    if (error instanceof ApiError) {
      return { error: error.message, conflict: error.status === 409 };
    }
    throw error;
  }
}
