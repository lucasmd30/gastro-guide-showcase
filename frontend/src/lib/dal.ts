import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { getAccessToken } from "@/lib/session";
import { meRequest, currentUserRequest, ApiError, type Doctor, type CurrentUser } from "@/lib/api";

export const requireAccessToken = cache(async () => {
  const token = await getAccessToken();
  if (!token) {
    redirect("/login");
  }
  return token;
});

export const getCurrentUser = cache(async (): Promise<CurrentUser> => {
  const token = await requireAccessToken();
  try {
    return await currentUserRequest(token);
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      // Cookie presente mas rejeitado pela API (não é falta de cookie, o
      // proxy já trata isso) — precisa ser limpo antes do redirect pro
      // /login, senão o proxy vê o cookie ainda lá e manda de volta pro
      // /perfil, causando loop infinito (achado da revisão final da Fase 0).
      // Cookies só podem ser alterados numa Server Action ou Route Handler,
      // não durante o render de um Server Component — por isso a limpeza
      // acontece em /api/auth/clear-session, não aqui.
      redirect("/api/auth/clear-session");
    }
    throw error;
  }
});

export const getCurrentDoctor = cache(async (): Promise<Doctor> => {
  const token = await requireAccessToken();

  try {
    return await meRequest(token);
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      redirect("/api/auth/clear-session");
    }
    if (error instanceof ApiError && error.status === 403) {
      // Secretária tentando acessar uma rota exclusiva de médico (ex.: perfil,
      // prontuário — que também chamam getCurrentDoctor pra montar o cabeçalho
      // CFM). O backend já bloqueou de verdade; aqui só redireciona pra um
      // lugar que ela pode ver.
      redirect("/pacientes");
    }
    throw error;
  }
});
