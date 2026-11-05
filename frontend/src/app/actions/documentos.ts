"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAccessToken } from "@/lib/dal";
import {
  attachSignedDocumentRequest,
  createMedicalDocumentRequest,
  createDocumentTemplateRequest,
  updateDocumentTemplateRequest,
  deleteDocumentTemplateRequest,
  ApiError,
  type CreateMedicalDocumentInput,
  type DocumentTemplate,
  type MedicalDocument,
  type SaveDocumentTemplateInput,
} from "@/lib/api";

export interface DocumentActionResult {
  error?: string;
}

/** Emite o documento e abre a página de impressão dele. Não há volta: documento emitido é definitivo. */
export async function issueMedicalDocument(
  patientId: string,
  input: CreateMedicalDocumentInput,
): Promise<DocumentActionResult> {
  const result = await issue(patientId, input);
  if (!result.document) return { error: result.error };
  // Fora do try: redirect() funciona lançando uma exceção própria do Next.
  redirect(`/documentos/${result.document.id}?paciente=${patientId}`);
}

/**
 * Emite de dentro do prontuário: devolve o documento em vez de navegar, para
 * a consulta em andamento continuar aberta — a impressão abre em outra aba.
 */
export async function issueMedicalDocumentInline(
  patientId: string,
  input: CreateMedicalDocumentInput,
): Promise<DocumentActionResult & { document?: MedicalDocument }> {
  return issue(patientId, input);
}

async function issue(
  patientId: string,
  input: CreateMedicalDocumentInput,
): Promise<DocumentActionResult & { document?: MedicalDocument }> {
  const token = await requireAccessToken();
  if (!input.content.trim()) return { error: "O documento está sem texto." };
  if (!input.title.trim()) return { error: "Dê um título ao documento." };
  if (!input.crmId) return { error: "Selecione o CRM." };

  try {
    const document = await createMedicalDocumentRequest(token, patientId, input);
    revalidatePath("/documentos");
    revalidatePath(`/pacientes/${patientId}`);
    return { document };
  } catch (error) {
    if (error instanceof ApiError) return { error: error.message };
    throw error;
  }
}

/** Tem que bater com MedicalDocumentService.MAX_SIGNED_PDF_BYTES no backend. */
const MAX_SIGNED_PDF_BYTES = 8 * 1024 * 1024;

/**
 * Anexa o PDF do documento assinado no assinador do médico. O backend confere
 * o arquivo (é deste documento, tem assinatura, não foi alterado) e devolve a
 * mensagem pronta quando recusa.
 */
export async function attachSignedDocument(
  patientId: string,
  documentId: string,
  formData: FormData,
): Promise<DocumentActionResult> {
  const token = await requireAccessToken();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Escolha o PDF assinado." };
  if (file.size > MAX_SIGNED_PDF_BYTES) return { error: "O PDF passa de 8 MB." };
  try {
    await attachSignedDocumentRequest(token, patientId, documentId, file, file.name || "documento-assinado.pdf");
  } catch (error) {
    if (error instanceof ApiError) return { error: error.message };
    throw error;
  }
  revalidatePath(`/documentos/${documentId}`);
  revalidatePath("/documentos");
  revalidatePath(`/pacientes/${patientId}`);
  return {};
}

export async function saveDocumentTemplate(
  templateId: string | null,
  input: SaveDocumentTemplateInput,
): Promise<DocumentActionResult & { template?: DocumentTemplate }> {
  const token = await requireAccessToken();
  if (!input.name.trim()) return { error: "Dê um nome ao modelo." };
  if (!input.content.trim()) return { error: "Escreva o conteúdo do modelo." };
  try {
    const template = templateId
      ? await updateDocumentTemplateRequest(token, templateId, input)
      : await createDocumentTemplateRequest(token, input);
    revalidatePath("/documentos");
    revalidatePath("/atendimento");
    return { template };
  } catch (error) {
    if (error instanceof ApiError) return { error: error.message };
    throw error;
  }
}

export async function deleteDocumentTemplate(templateId: string): Promise<DocumentActionResult> {
  const token = await requireAccessToken();
  try {
    await deleteDocumentTemplateRequest(token, templateId);
    revalidatePath("/documentos");
    revalidatePath("/atendimento");
    return {};
  } catch (error) {
    if (error instanceof ApiError) return { error: error.message };
    throw error;
  }
}
