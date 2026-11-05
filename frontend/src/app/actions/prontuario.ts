"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAccessToken } from "@/lib/dal";
import {
  upsertDiseaseHeaderRequest,
  createMedicalRecordRequest,
  deleteMedicalRecordRequest,
  getMedicalRecordDraftRequest,
  saveMedicalRecordDraftRequest,
  deleteMedicalRecordDraftRequest,
  type MedicalRecordDraft,
  ApiError,
  type MedicalRecordType,
} from "@/lib/api";

export interface ProntuarioFormState {
  error?: string;
  success?: boolean;
}

/**
 * Salvamento automático do cabeçalho (pedido de 20/10/2026: sem botão).
 * Sem `revalidatePath` de propósito: roda a cada pausa na digitação, e
 * recarregar a tela inteira toda vez seria pesado — quem guarda o valor
 * mais recente entre as abas é o próprio `ProntuarioView`.
 */
export async function autosaveDiseaseHeader(
  patientId: string,
  disease: string,
  data: Record<string, unknown>,
): Promise<{ updatedAt?: string; error?: string }> {
  const token = await requireAccessToken();
  try {
    const header = await upsertDiseaseHeaderRequest(token, patientId, disease, data);
    return { updatedAt: header.updatedAt };
  } catch (error) {
    if (error instanceof ApiError) {
      return { error: error.message };
    }
    throw error;
  }
}

export async function createMedicalRecord(
  patientId: string,
  _prevState: ProntuarioFormState,
  formData: FormData,
): Promise<ProntuarioFormState> {
  const token = await requireAccessToken();

  const type = String(formData.get("type") ?? "") as MedicalRecordType;
  const disease = String(formData.get("disease") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const contentText = String(formData.get("contentText") ?? "").trim();
  const crmId = String(formData.get("crmId") ?? "").trim();
  const rqeIdRaw = String(formData.get("rqeId") ?? "").trim();
  const rqeId = rqeIdRaw === "" || rqeIdRaw === "none" ? undefined : rqeIdRaw;

  if (!title) {
    return { error: "Preencha o título do registro." };
  }
  if (!crmId) {
    return { error: "Selecione o CRM." };
  }

  let consultationData: Record<string, unknown>;
  let scores: string[];
  try {
    consultationData = JSON.parse(String(formData.get("consultationJson") ?? "{}"));
    const raw: unknown = JSON.parse(String(formData.get("scores") ?? "[]"));
    scores = Array.isArray(raw) ? raw.filter((s): s is string => typeof s === "string") : [];
  } catch {
    return { error: "Dados do formulário inválidos." };
  }

  try {
    await createMedicalRecordRequest(token, patientId, {
      type,
      disease: disease || undefined,
      title,
      contentText: contentText || undefined,
      crmId,
      rqeId,
      consultationData,
      scores,
    });
    revalidatePath(`/atendimento`);
    return { success: true };
  } catch (error) {
    if (error instanceof ApiError) {
      return { error: error.message };
    }
    throw error;
  }
}

export async function deleteMedicalRecord(
  patientId: string,
  recordId: string,
  _prevState: ProntuarioFormState,
  _formData: FormData,
): Promise<ProntuarioFormState> {
  const token = await requireAccessToken();

  try {
    await deleteMedicalRecordRequest(token, patientId, recordId);
  } catch (error) {
    if (error instanceof ApiError) {
      return { error: error.message };
    }
    throw error;
  }

  revalidatePath(`/atendimento`);
  revalidatePath(`/historico`);
  // O histórico de consultas é por onde se chega ao registro.
  redirect(`/historico?paciente=${patientId}`);
}

/*
 * Rascunho automático da tela de atendimento. Chamado direto do Client
 * Component (não é form action). Falha de rede/servidor vira `error` em vez de
 * exceção: o rascunho é conveniência, e perder um salvamento não pode quebrar
 * a tela em que a médica está digitando.
 */

export interface DraftResult {
  draft?: MedicalRecordDraft;
  error?: string;
}

export async function loadRecordDraft(patientId: string, formKey: string): Promise<DraftResult> {
  const token = await requireAccessToken();
  try {
    return { draft: await getMedicalRecordDraftRequest(token, patientId, formKey) };
  } catch (error) {
    if (error instanceof ApiError) return { error: error.message };
    throw error;
  }
}

export async function saveRecordDraft(
  patientId: string,
  formKey: string,
  data: Record<string, unknown>,
): Promise<DraftResult> {
  const token = await requireAccessToken();
  try {
    return { draft: await saveMedicalRecordDraftRequest(token, patientId, formKey, data) };
  } catch (error) {
    if (error instanceof ApiError) return { error: error.message };
    throw error;
  }
}

export async function discardRecordDraft(patientId: string, formKey: string): Promise<DraftResult> {
  const token = await requireAccessToken();
  try {
    await deleteMedicalRecordDraftRequest(token, patientId, formKey);
    return {};
  } catch (error) {
    if (error instanceof ApiError) return { error: error.message };
    throw error;
  }
}
