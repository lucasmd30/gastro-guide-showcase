"use server";

import { revalidatePath } from "next/cache";
import { requireAccessToken } from "@/lib/dal";
import {
  updateAppointmentDurationsRequest,
  createAvailabilityWindowRequest,
  updateAvailabilityWindowRequest,
  updateAvailabilityRuleRequest,
  deleteAvailabilityWindowRequest,
  addAvailabilityRuleRequest,
  deleteAvailabilityRuleRequest,
  createAvailabilityBlockRequest,
  deleteAvailabilityBlockRequest,
  ApiError,
  type AvailabilityRuleInput,
  type Weekday,
} from "@/lib/api";
import { parseBRL } from "@/lib/money";

export interface AvailabilityFormState {
  error?: string;
  success?: boolean;
}

const WEEKDAYS: Weekday[] = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];

/**
 * Lê o formulário de faixa (dias marcados + início + fim + duração) e
 * devolve uma faixa por dia marcado — a grade é uma linha por dia+faixa.
 */
function readRules(formData: FormData): AvailabilityRuleInput[] | { error: string } {
  const weekdays = formData.getAll("weekday").map(String).filter((d): d is Weekday => WEEKDAYS.includes(d as Weekday));
  const startTime = String(formData.get("startTime") ?? "");
  const endTime = String(formData.get("endTime") ?? "");

  if (weekdays.length === 0) return { error: "Escolha pelo menos um dia da semana." };
  if (!startTime || !endTime) return { error: "Informe o início e o fim da faixa." };

  return weekdays.map((weekday) => ({ weekday, startTime, endTime }));
}

function fail(err: unknown): AvailabilityFormState {
  if (err instanceof ApiError) return { error: err.message };
  throw err;
}

export async function createWindow(
  _prevState: AvailabilityFormState,
  formData: FormData,
): Promise<AvailabilityFormState> {
  const token = await requireAccessToken();

  const startDate = String(formData.get("startDate") ?? "");
  const endDate = String(formData.get("endDate") ?? "");
  if (!startDate) return { error: "Escolha o dia de início da janela." };

  const rules = readRules(formData);
  if ("error" in rules) return rules;

  try {
    await createAvailabilityWindowRequest(token, { startDate, endDate: endDate || null, rules });
    revalidatePath("/agenda");
    revalidatePath("/disponibilidade");
    return { success: true };
  } catch (err) {
    return fail(err);
  }
}

/** Período da janela: encerrar, adiantar o começo ou reabrir. */
export async function updateWindow(
  windowId: string,
  _prevState: AvailabilityFormState,
  formData: FormData,
): Promise<AvailabilityFormState> {
  const token = await requireAccessToken();

  const startDate = String(formData.get("startDate") ?? "");
  const endDate = String(formData.get("endDate") ?? "");
  if (!startDate) return { error: "Escolha o dia de início da janela." };

  try {
    await updateAvailabilityWindowRequest(token, windowId, { startDate, endDate: endDate || null });
    revalidatePath("/agenda");
    revalidatePath("/disponibilidade");
    return { success: true };
  } catch (err) {
    return fail(err);
  }
}

export async function deleteWindow(
  windowId: string,
  _prevState: AvailabilityFormState,
  _formData: FormData,
): Promise<AvailabilityFormState> {
  const token = await requireAccessToken();

  try {
    await deleteAvailabilityWindowRequest(token, windowId);
    revalidatePath("/agenda");
    revalidatePath("/disponibilidade");
    return { success: true };
  } catch (err) {
    return fail(err);
  }
}

export async function addRule(
  windowId: string,
  _prevState: AvailabilityFormState,
  formData: FormData,
): Promise<AvailabilityFormState> {
  const token = await requireAccessToken();

  const rules = readRules(formData);
  if ("error" in rules) return rules;

  try {
    // Um POST por dia marcado: o erro de sobreposição vem do backend por
    // dia, sem lógica duplicada aqui.
    for (const rule of rules) {
      await addAvailabilityRuleRequest(token, windowId, rule);
    }
    revalidatePath("/agenda");
    revalidatePath("/disponibilidade");
    return { success: true };
  } catch (err) {
    return fail(err);
  }
}

/** Edita uma faixa no lugar — dia da semana e horário. */
export async function updateRule(
  windowId: string,
  ruleId: string,
  _prevState: AvailabilityFormState,
  formData: FormData,
): Promise<AvailabilityFormState> {
  const token = await requireAccessToken();

  const rules = readRules(formData);
  if ("error" in rules) return rules;
  // O formulário de edição tem um dia só: a faixa é uma linha por dia.
  if (rules.length > 1) return { error: "Escolha um dia da semana só." };

  try {
    await updateAvailabilityRuleRequest(token, windowId, ruleId, rules[0]);
    revalidatePath("/agenda");
    revalidatePath("/disponibilidade");
    return { success: true };
  } catch (err) {
    return fail(err);
  }
}

export async function deleteRule(
  windowId: string,
  ruleId: string,
  _prevState: AvailabilityFormState,
  _formData: FormData,
): Promise<AvailabilityFormState> {
  const token = await requireAccessToken();

  try {
    await deleteAvailabilityRuleRequest(token, windowId, ruleId);
    revalidatePath("/agenda");
    revalidatePath("/disponibilidade");
    return { success: true };
  } catch (err) {
    return fail(err);
  }
}

export async function createBlock(
  _prevState: AvailabilityFormState,
  formData: FormData,
): Promise<AvailabilityFormState> {
  const token = await requireAccessToken();

  const startDate = String(formData.get("startDate") ?? "");
  const endDate = String(formData.get("endDate") ?? "") || startDate;
  const allDay = formData.get("allDay") === "on";
  const startTime = allDay ? null : String(formData.get("startTime") ?? "") || null;
  const endTime = allDay ? null : String(formData.get("endTime") ?? "") || null;
  const reason = String(formData.get("reason") ?? "").trim() || null;

  if (!startDate) return { error: "Escolha o período do bloqueio." };
  if (!allDay && (!startTime || !endTime)) return { error: "Informe o início e o fim do horário bloqueado." };

  try {
    await createAvailabilityBlockRequest(token, { startDate, endDate, startTime, endTime, reason });
    revalidatePath("/agenda");
    revalidatePath("/disponibilidade");
    return { success: true };
  } catch (err) {
    return fail(err);
  }
}

/**
 * Duração de cada tipo de atendimento. É daqui que sai o tamanho de cada
 * horário da grade — mudar aqui muda a agenda inteira daqui pra frente.
 */
export async function updateDurations(
  _prevState: AvailabilityFormState,
  formData: FormData,
): Promise<AvailabilityFormState> {
  const token = await requireAccessToken();

  const firstVisitMinutes = Number(formData.get("firstVisitMinutes"));
  const followUpMinutes = Number(formData.get("followUpMinutes"));
  if (!Number.isFinite(firstVisitMinutes) || !Number.isFinite(followUpMinutes)) {
    return { error: "Informe as duas durações." };
  }
  // Valores padrão do particular (opcionais): vazio = sem valor padrão.
  const firstVisitPriceCents = parseBRL(String(formData.get("firstVisitPrice") ?? ""));
  const followUpPriceCents = parseBRL(String(formData.get("followUpPrice") ?? ""));
  if (firstVisitPriceCents === undefined || followUpPriceCents === undefined) {
    return { error: "Valor inválido. Use, por exemplo, 450 ou 450,00." };
  }

  try {
    await updateAppointmentDurationsRequest(token, {
      firstVisitMinutes,
      followUpMinutes,
      firstVisitPriceCents,
      followUpPriceCents,
    });
    revalidatePath("/agenda");
    revalidatePath("/disponibilidade");
    return { success: true };
  } catch (err) {
    return fail(err);
  }
}

export async function deleteBlock(
  blockId: string,
  _prevState: AvailabilityFormState,
  _formData: FormData,
): Promise<AvailabilityFormState> {
  const token = await requireAccessToken();

  try {
    await deleteAvailabilityBlockRequest(token, blockId);
    revalidatePath("/agenda");
    revalidatePath("/disponibilidade");
    return { success: true };
  } catch (err) {
    return fail(err);
  }
}

/**
 * O "X" de um horário livre na agenda: fecha só aquele horário, como um
 * fechamento de agenda por horas naquela data. Reaproveita o bloqueio que já
 * existe — o horário some da grade e do link do paciente, e desfazer é
 * apagar o fechamento em Disponibilidade.
 */
export async function closeSlot(dateKey: string, startTime: string, endTime: string): Promise<AvailabilityFormState> {
  const token = await requireAccessToken();

  try {
    await createAvailabilityBlockRequest(token, {
      startDate: dateKey,
      endDate: dateKey,
      startTime,
      endTime,
      reason: "Horário removido pela agenda",
    });
    revalidatePath("/agenda");
    revalidatePath("/disponibilidade");
    return { success: true };
  } catch (err) {
    return fail(err);
  }
}
