"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAccessToken } from "@/lib/dal";
import {
  updateProfileRequest,
  updateOfficeAddressRequest,
  addCrmRequest,
  removeCrmRequest,
  setCrmPrincipalRequest,
  addRqeRequest,
  removeRqeRequest,
  setRqePrincipalRequest,
  listSecretariesRequest,
  createSecretaryRequest,
  removeSecretaryRequest,
  resetSecretaryPasswordRequest,
  listHealthPlansRequest,
  addHealthPlanRequest,
  removeHealthPlanRequest,
  ApiError,
  type Doctor,
  type Secretary,
  type DoctorHealthPlan,
} from "@/lib/api";
import { normalizeCrm, validateCrm } from "@/lib/crm";
import { MEDICAL_SPECIALTIES } from "@/lib/specialties";

export interface PerfilFormState {
  error?: string;
  success?: boolean;
  doctor?: Doctor;
}

export async function updateProfile(
  _prevState: PerfilFormState,
  formData: FormData,
): Promise<PerfilFormState> {
  const token = await requireAccessToken();

  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();

  if (!name) {
    return { error: "Preencha o nome." };
  }

  try {
    const doctor = await updateProfileRequest(token, {
      name,
      phone: phone || undefined,
    });
    revalidatePath("/perfil");
    return { success: true, doctor };
  } catch (error) {
    if (error instanceof ApiError) {
      return { error: error.message };
    }
    throw error;
  }
}

export async function updateOfficeAddress(
  _prevState: PerfilFormState,
  formData: FormData,
): Promise<PerfilFormState> {
  const token = await requireAccessToken();
  const read = (key: string) => String(formData.get(key) ?? "").trim();

  const cep = read("cep").replace(/\D/g, "");
  if (cep && cep.length !== 8) {
    return { error: "CEP deve ter 8 dígitos." };
  }

  try {
    const doctor = await updateOfficeAddressRequest(token, {
      cep,
      street: read("street"),
      number: read("number"),
      complement: read("complement"),
      district: read("district"),
      city: read("city"),
      state: read("state"),
    });
    revalidatePath("/perfil");
    return { success: true, doctor };
  } catch (error) {
    if (error instanceof ApiError) {
      return { error: error.message };
    }
    throw error;
  }
}

export async function addCrm(
  _prevState: PerfilFormState,
  formData: FormData,
): Promise<PerfilFormState> {
  const token = await requireAccessToken();

  const crm = normalizeCrm(String(formData.get("crm") ?? ""));
  const crmUf = String(formData.get("crmUf") ?? "").trim().toUpperCase();

  if (!crm || !crmUf) {
    return { error: "Preencha CRM e UF." };
  }
  const crmError = validateCrm(crm, crmUf);
  if (crmError) {
    return { error: crmError };
  }

  try {
    const doctor = await addCrmRequest(token, { crm, crmUf });
    revalidatePath("/perfil");
    return { success: true, doctor };
  } catch (error) {
    if (error instanceof ApiError) {
      return { error: error.message };
    }
    throw error;
  }
}

export async function removeCrm(
  _prevState: PerfilFormState,
  formData: FormData,
): Promise<PerfilFormState> {
  const token = await requireAccessToken();
  const crmId = String(formData.get("crmId") ?? "");

  try {
    const doctor = await removeCrmRequest(token, crmId);
    revalidatePath("/perfil");
    return { success: true, doctor };
  } catch (error) {
    if (error instanceof ApiError) {
      return { error: error.message };
    }
    throw error;
  }
}

export async function setCrmPrincipal(
  _prevState: PerfilFormState,
  formData: FormData,
): Promise<PerfilFormState> {
  const token = await requireAccessToken();
  const crmId = String(formData.get("crmId") ?? "");

  try {
    const doctor = await setCrmPrincipalRequest(token, crmId);
    revalidatePath("/perfil");
    return { success: true, doctor };
  } catch (error) {
    if (error instanceof ApiError) {
      return { error: error.message };
    }
    throw error;
  }
}

export async function addRqe(
  _prevState: PerfilFormState,
  formData: FormData,
): Promise<PerfilFormState> {
  const token = await requireAccessToken();

  const rqe = String(formData.get("rqe") ?? "").trim();
  const specialty = String(formData.get("specialty") ?? "").trim();

  if (!rqe || !specialty) {
    return { error: "Preencha o número do RQE e a especialidade." };
  }
  if (!(MEDICAL_SPECIALTIES as readonly string[]).includes(specialty)) {
    return { error: "Especialidade inválida." };
  }

  try {
    const doctor = await addRqeRequest(token, { rqe, specialty });
    revalidatePath("/perfil");
    return { success: true, doctor };
  } catch (error) {
    if (error instanceof ApiError) {
      return { error: error.message };
    }
    throw error;
  }
}

export async function removeRqe(
  _prevState: PerfilFormState,
  formData: FormData,
): Promise<PerfilFormState> {
  const token = await requireAccessToken();
  const rqeId = String(formData.get("rqeId") ?? "");

  try {
    const doctor = await removeRqeRequest(token, rqeId);
    revalidatePath("/perfil");
    return { success: true, doctor };
  } catch (error) {
    if (error instanceof ApiError) {
      return { error: error.message };
    }
    throw error;
  }
}

export async function setRqePrincipal(
  _prevState: PerfilFormState,
  formData: FormData,
): Promise<PerfilFormState> {
  const token = await requireAccessToken();
  const rqeId = String(formData.get("rqeId") ?? "");

  try {
    const doctor = await setRqePrincipalRequest(token, rqeId);
    revalidatePath("/perfil");
    return { success: true, doctor };
  } catch (error) {
    if (error instanceof ApiError) {
      return { error: error.message };
    }
    throw error;
  }
}

export interface SecretaryFormState {
  error?: string;
  success?: boolean;
}

export async function listSecretaries(): Promise<Secretary[]> {
  const token = await requireAccessToken();
  try {
    return await listSecretariesRequest(token);
  } catch (error) {
    if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
      // Mesmo tratamento de getCurrentDoctor (lib/dal.ts): essa rota é
      // exclusiva de médico, e as duas chamadas da página de perfil correm
      // em paralelo (Promise.all) — sem isso aqui, uma secretária que
      // chegasse em /perfil poderia ver o 403 desta chamada quebrar a
      // página com 500 antes do redirect de getCurrentDoctor vencer a corrida.
      // 401 vai pro Route Handler que limpa o cookie (não pro /login direto)
      // pelo mesmo motivo documentado em dal.ts — senão o proxy via o cookie
      // ainda presente e criava um loop de redirect.
      redirect(error.status === 401 ? "/api/auth/clear-session" : "/pacientes");
    }
    throw error;
  }
}

export async function createSecretary(
  _prevState: SecretaryFormState,
  formData: FormData,
): Promise<SecretaryFormState> {
  const token = await requireAccessToken();

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!name || !email || !password) {
    return { error: "Preencha nome, e-mail e senha." };
  }
  if (password.length < 8) {
    return { error: "A senha deve ter ao menos 8 caracteres." };
  }

  try {
    await createSecretaryRequest(token, { name, email, password });
    revalidatePath("/perfil");
    return { success: true };
  } catch (error) {
    if (error instanceof ApiError) {
      return { error: error.message };
    }
    throw error;
  }
}

export async function removeSecretary(
  _prevState: SecretaryFormState,
  formData: FormData,
): Promise<SecretaryFormState> {
  const token = await requireAccessToken();
  const secretaryId = String(formData.get("secretaryId") ?? "");

  try {
    await removeSecretaryRequest(token, secretaryId);
    revalidatePath("/perfil");
    return { success: true };
  } catch (error) {
    if (error instanceof ApiError) {
      return { error: error.message };
    }
    throw error;
  }
}

/**
 * O médico define uma senha nova para a secretária — antes, esquecida a
 * senha, o único caminho era excluir a conta e criar outra.
 */
export async function resetSecretaryPassword(
  _prevState: SecretaryFormState,
  formData: FormData,
): Promise<SecretaryFormState> {
  const token = await requireAccessToken();
  const secretaryId = String(formData.get("secretaryId") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirmPassword") ?? "");

  if (password.length < 8) {
    return { error: "A senha deve ter ao menos 8 caracteres." };
  }
  if (password !== confirm) {
    return { error: "As duas senhas não conferem." };
  }

  try {
    await resetSecretaryPasswordRequest(token, secretaryId, password);
    return { success: true };
  } catch (error) {
    if (error instanceof ApiError) {
      return { error: error.message };
    }
    throw error;
  }
}

export interface HealthPlanFormState {
  error?: string;
  success?: boolean;
}

/** Convênios atendidos — o que o link de consulta oferece a quem escolhe convênio. */
export async function listHealthPlans(): Promise<DoctorHealthPlan[]> {
  const token = await requireAccessToken();
  try {
    return await listHealthPlansRequest(token);
  } catch (error) {
    // Mesmo tratamento de listSecretaries: a página de perfil busca isto em
    // paralelo com getCurrentDoctor.
    if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
      redirect(error.status === 401 ? "/api/auth/clear-session" : "/pacientes");
    }
    throw error;
  }
}

export async function addHealthPlan(
  _prevState: HealthPlanFormState,
  formData: FormData,
): Promise<HealthPlanFormState> {
  const token = await requireAccessToken();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) {
    return { error: "Informe o nome do convênio." };
  }

  try {
    await addHealthPlanRequest(token, name);
    revalidatePath("/perfil");
    return { success: true };
  } catch (error) {
    if (error instanceof ApiError) {
      return { error: error.message };
    }
    throw error;
  }
}

export async function removeHealthPlan(
  _prevState: HealthPlanFormState,
  formData: FormData,
): Promise<HealthPlanFormState> {
  const token = await requireAccessToken();
  const planId = String(formData.get("planId") ?? "");

  try {
    await removeHealthPlanRequest(token, planId);
    revalidatePath("/perfil");
    return { success: true };
  } catch (error) {
    if (error instanceof ApiError) {
      return { error: error.message };
    }
    throw error;
  }
}
