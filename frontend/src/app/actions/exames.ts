"use server";

import { requireAccessToken } from "@/lib/dal";
import {
  createExamComboRequest,
  updateExamComboRequest,
  deleteExamComboRequest,
  setExamFavoriteRequest,
  ApiError,
  type ExamCombo,
  type SaveExamComboInput,
} from "@/lib/api";

/**
 * Combos próprios e favoritos da solicitação de exames. A tela guarda a lista
 * no próprio estado e só aplica a resposta, então não há revalidatePath: a
 * próxima abertura de qualquer tela já busca do servidor.
 */

export interface ExamActionResult {
  error?: string;
}

export async function saveExamCombo(
  comboId: string | null,
  input: SaveExamComboInput,
): Promise<ExamActionResult & { combo?: ExamCombo }> {
  const token = await requireAccessToken();
  if (!input.name.trim()) return { error: "Dê um nome ao combo." };
  if (input.items.length === 0) return { error: "O combo está sem exames." };
  try {
    const combo = comboId
      ? await updateExamComboRequest(token, comboId, input)
      : await createExamComboRequest(token, input);
    return { combo };
  } catch (error) {
    if (error instanceof ApiError) return { error: error.message };
    throw error;
  }
}

export async function deleteExamCombo(comboId: string): Promise<ExamActionResult> {
  const token = await requireAccessToken();
  try {
    await deleteExamComboRequest(token, comboId);
    return {};
  } catch (error) {
    if (error instanceof ApiError) return { error: error.message };
    throw error;
  }
}

export async function setExamFavorite(
  name: string,
  favorite: boolean,
): Promise<ExamActionResult & { favorites?: string[] }> {
  const token = await requireAccessToken();
  try {
    return { favorites: await setExamFavoriteRequest(token, name, favorite) };
  } catch (error) {
    if (error instanceof ApiError) return { error: error.message };
    throw error;
  }
}
