import { NextResponse } from "next/server";
import { clearSession } from "@/lib/session";

/**
 * Cookies não podem ser mutados durante o render de um Server Component
 * (ver dal.ts) — por isso um 401 "de verdade" (token presente mas rejeitado
 * pela API, ex.: secretária excluída, rotação de JWT_SECRET) só redirecionava
 * pro /login sem limpar o cookie. Como o proxy via o cookie ainda presente,
 * ele mandava de volta pro /perfil, causando um loop infinito de redirect
 * (achado da revisão final da Fase 0). Um Route Handler pode limpar cookies,
 * então o 401 passa a redirecionar pra cá em vez de direto pro /login.
 */
export async function GET(request: Request) {
  await clearSession();
  return NextResponse.redirect(new URL("/login", request.url));
}
