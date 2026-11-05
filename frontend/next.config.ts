import type { NextConfig } from "next";

/**
 * Cabeçalhos de segurança aplicados a todas as respostas.
 *
 * O app é um prontuário eletrônico: o navegador precisa ser instruído a
 * nunca cair para HTTP, nunca deixar a página ser embutida em iframe de
 * terceiro (clickjacking sobre dado clínico) e nunca vazar a URL — que
 * contém id de paciente — para sites externos pelo Referer.
 */
const securityHeaders = [
  // Só HTTPS por 2 anos, incluindo subdomínios.
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  // Nada de embutir o app em iframe de terceiro.
  { key: "X-Frame-Options", value: "DENY" },
  // Impede o navegador de "adivinhar" tipo de conteúdo.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // A URL tem id de paciente — não vaza nem a origem para fora.
  { key: "Referrer-Policy", value: "no-referrer" },
  // Sem uso de câmera, microfone ou geolocalização (a transcrição por áudio é Fase 2).
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
  // CSP: sem eval, sem embed externo, formulários só para a própria origem.
  // 'unsafe-inline' em style é exigência do Next/Tailwind; script fica sem ele.
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self' data:",
      "connect-src 'self'",
      "frame-ancestors 'none'",
      "form-action 'self'",
      "base-uri 'self'",
      "object-src 'none'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  // Imagem de produção enxuta (ver frontend/Dockerfile).
  output: "standalone",
  // Não anunciar o framework/versão para quem procura alvo.
  poweredByHeader: false,
  experimental: {
    // O PDF assinado do documento sobe por Server Action (até 8 MB + o
    // envelope do multipart); o padrão é 1 MB.
    serverActions: { bodySizeLimit: "9mb" },
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
