"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAccessToken } from "@/lib/dal";
import {
  createPatientRequest,
  updatePatientRequest,
  deletePatientRequest,
  createConsultationLinkRequest,
  listPatientsRequest,
  ApiError,
  type Patient,
  type PatientInput,
  type IntakeLinkPurpose,
  type PatientIntakeLink,
} from "@/lib/api";
import { readPatientInput } from "@/lib/patient-input";

export interface PatientFormState {
  error?: string;
  success?: boolean;
  patient?: Patient;
}

/**
 * Busca usada pelo seletor de paciente da agenda. Devolve poucos resultados de
 * propósito: é um seletor, não uma listagem — quem precisa navegar a base
 * inteira usa a tela de Pacientes, que tem paginação.
 */
export async function searchPatients(query: string): Promise<Patient[]> {
  const token = await requireAccessToken();
  const q = query.trim();
  if (!q) return [];

  try {
    const result = await listPatientsRequest(token, { q, size: 8 });
    return result.items;
  } catch (error) {
    if (error instanceof ApiError) return [];
    throw error;
  }
}

/**
 * Cadastro só com o nome, de dentro da agenda: a secretária marca a consulta
 * sem sair da tela, e o resto do cadastro vem depois (link de cadastro ou
 * ficha do paciente). O backend já aceita paciente só com nome.
 */
export async function quickCreatePatient(name: string): Promise<{ patient?: Patient; error?: string }> {
  const token = await requireAccessToken();
  const trimmed = name.trim();
  if (!trimmed) return { error: "Informe o nome do paciente." };

  try {
    const patient = await createPatientRequest(token, { name: trimmed });
    revalidatePath("/pacientes");
    return { patient };
  } catch (err) {
    if (err instanceof ApiError) return { error: err.message };
    throw err;
  }
}

function readInput(formData: FormData): { input: PatientInput; error?: string } {
  const { input, error } = readPatientInput(formData);
  if (error) return { input, error };

  return {
    input: {
      ...input,
      continuousMedications: String(formData.get("continuousMedications") ?? "").trim() || undefined,
      notes: String(formData.get("notes") ?? "").trim() || undefined,
    },
  };
}

export async function createPatient(
  _prevState: PatientFormState,
  formData: FormData,
): Promise<PatientFormState> {
  const token = await requireAccessToken();

  const { input, error } = readInput(formData);
  if (error) {
    return { error };
  }

  try {
    const patient = await createPatientRequest(token, input);
    revalidatePath("/pacientes");
    return { success: true, patient };
  } catch (err) {
    if (err instanceof ApiError) {
      return { error: err.message };
    }
    throw err;
  }
}

export async function updatePatient(
  patientId: string,
  _prevState: PatientFormState,
  formData: FormData,
): Promise<PatientFormState> {
  const token = await requireAccessToken();

  const { input, error } = readInput(formData);
  if (error) {
    return { error };
  }

  try {
    const patient = await updatePatientRequest(token, patientId, input);
    revalidatePath("/pacientes");
    revalidatePath(`/pacientes/${patientId}`);
    return { success: true, patient };
  } catch (err) {
    if (err instanceof ApiError) {
      return { error: err.message };
    }
    throw err;
  }
}

export async function deletePatient(
  patientId: string,
  _prevState: PatientFormState,
  _formData: FormData,
): Promise<PatientFormState> {
  const token = await requireAccessToken();

  try {
    await deletePatientRequest(token, patientId);
  } catch (err) {
    if (err instanceof ApiError) {
      return { error: err.message };
    }
    throw err;
  }

  revalidatePath("/pacientes");
  redirect("/pacientes");
}

export interface IntakeLinkState {
  error?: string;
  link?: PatientIntakeLink;
}

/**
 * `patientId` nulo é o botão da lista de pacientes: o link existe antes do
 * cadastro, e o paciente é criado quando ele preencher.
 */
export async function generateConsultationLink(
  patientId: string | null,
  purpose: IntakeLinkPurpose,
  _prevState: IntakeLinkState,
  _formData: FormData,
): Promise<IntakeLinkState> {
  const token = await requireAccessToken();

  try {
    // Sem `type`: primeira consulta ou retorno é escolha do paciente, dentro
    // do link — quem gera não decide mais por ele.
    const link = await createConsultationLinkRequest(token, {
      patientId: patientId ?? undefined,
      purpose,
    });
    return { link };
  } catch (err) {
    if (err instanceof ApiError) {
      return { error: err.message };
    }
    throw err;
  }
}
