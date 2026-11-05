import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const protectedPrefixes = ["/dashboard", "/perfil", "/pacientes", "/agenda", "/prontuarios-modelo", "/atendimento", "/escalas", "/historico", "/disponibilidade", "/documentos", "/solicitar-exames"];
const publicOnlyRoutes = ["/login"];

const API_URL = process.env.API_URL ?? "http://localhost:8080";
const ACCESS_TOKEN_COOKIE = "access_token";
const REFRESH_TOKEN_COOKIE = "refresh_token";

function cookieOptions(maxAgeSeconds: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: maxAgeSeconds,
  };
}

/**
 * O cookie de access token expira em 15min (ver session.ts) — quando o
 * navegador para de enviá-lo mas o refresh token (30 dias) ainda é válido,
 * tentamos renovar aqui, no proxy, antes da página renderizar. Isso evita
 * que uma sessão morra silenciosamente a cada 15min (refreshRequest nunca
 * era chamado de lugar nenhum — achado da revisão final da Fase 0).
 */
async function tryRefresh(refreshToken: string) {
  try {
    const response = await fetch(`${API_URL}/api/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
    if (!response.ok) return null;
    const data = (await response.json()) as { accessToken: string; refreshToken: string };
    return data;
  } catch {
    return null;
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const accessToken = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  const refreshToken = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value;

  const isProtected = protectedPrefixes.some((prefix) => pathname.startsWith(prefix));
  const isPublicOnly = publicOnlyRoutes.includes(pathname);

  if (isProtected && !accessToken) {
    if (refreshToken) {
      const refreshed = await tryRefresh(refreshToken);
      if (refreshed) {
        const response = NextResponse.next();
        response.cookies.set(ACCESS_TOKEN_COOKIE, refreshed.accessToken, cookieOptions(60 * 15));
        response.cookies.set(REFRESH_TOKEN_COOKIE, refreshed.refreshToken, cookieOptions(60 * 60 * 24 * 30));
        return response;
      }
    }
    // Sem cookie nenhum, ou refresh token também inválido/revogado: limpa
    // qualquer cookie remanescente pra não deixar o access_token de outra
    // aba/sessão confundir o próximo carregamento, e manda pro login.
    const response = NextResponse.redirect(new URL("/login", request.url));
    response.cookies.delete(ACCESS_TOKEN_COOKIE);
    response.cookies.delete(REFRESH_TOKEN_COOKIE);
    return response;
  }

  if (isPublicOnly && accessToken) {
    return NextResponse.redirect(new URL("/perfil", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
