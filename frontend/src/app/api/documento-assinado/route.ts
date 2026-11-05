import { getAccessToken } from "@/lib/session";
import { fetchSignedDocumentPdf } from "@/lib/api";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Baixa o PDF assinado de um documento (`?paciente=<id>&documento=<id>`).
 * Um link comum não leva o token (ele está num cookie httpOnly que só o
 * servidor lê), então esta rota busca o arquivo na API e repassa. Rota na
 * raiz com query param, pela convenção do projeto para rotas novas.
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const patientId = params.get("paciente") ?? "";
  const documentId = params.get("documento") ?? "";
  if (!UUID.test(patientId) || !UUID.test(documentId)) {
    return new Response("Documento inválido.", { status: 400 });
  }

  const token = await getAccessToken();
  if (!token) {
    return new Response("Sessão expirada. Entre de novo.", { status: 401 });
  }

  const upstream = await fetchSignedDocumentPdf(token, patientId, documentId).catch(() => null);
  if (!upstream) {
    return new Response("Não foi possível conectar à API.", { status: 502 });
  }
  if (!upstream.ok) {
    return new Response(upstream.status === 404 ? "PDF assinado não encontrado." : "Não foi possível baixar o PDF.", {
      status: upstream.status,
    });
  }

  return new Response(upstream.body, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": upstream.headers.get("Content-Disposition") ?? 'attachment; filename="documento-assinado.pdf"',
      "Cache-Control": "private, no-store",
    },
  });
}
