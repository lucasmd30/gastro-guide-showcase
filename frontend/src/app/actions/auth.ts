"use server";

import { redirect } from "next/navigation";
import { loginRequest, signupRequest, logoutRequest, ApiError } from "@/lib/api";
import { setSession, clearSession, getRefreshToken } from "@/lib/session";
import { normalizeCrm, validateCrm } from "@/lib/crm";

export interface AuthFormState {
  error?: string;
}

export async function login(_prevState: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Preencha e-mail e senha." };
  }

  let role: "DOCTOR" | "SECRETARIA";
  try {
    const { accessToken, refreshToken, role: loggedInRole } = await loginRequest({ email, password });
    await setSession(accessToken, refreshToken);
    role = loggedInRole;
  } catch (error) {
    if (error instanceof ApiError) {
      return { error: error.status === 401 ? "E-mail ou senha inválidos." : error.message };
    }
    throw error;
  }

  redirect(role === "SECRETARIA" ? "/pacientes" : "/perfil");
}

export async function signup(_prevState: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const crm = normalizeCrm(String(formData.get("crm") ?? ""));
  const crmUf = String(formData.get("crmUf") ?? "").trim().toUpperCase();

  if (!name || !email || !password || !crm || !crmUf) {
    return { error: "Preencha nome, e-mail, senha, CRM e UF do CRM." };
  }
  if (password.length < 8) {
    return { error: "A senha deve ter ao menos 8 caracteres." };
  }
  const crmError = validateCrm(crm, crmUf);
  if (crmError) {
    return { error: crmError };
  }

  try {
    await signupRequest({
      name,
      email,
      password,
      crm,
      crmUf,
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return { error: error.status === 409 ? "Já existe um médico com esse e-mail." : error.message };
    }
    throw error;
  }

  redirect("/login?cadastrado=1");
}

export async function logout() {
  const refreshToken = await getRefreshToken();
  if (refreshToken) {
    await logoutRequest(refreshToken).catch(() => {
      // Revogação falhou (ex.: API fora do ar) — segue com o logout local mesmo assim.
    });
  }
  await clearSession();
  redirect("/login");
}
