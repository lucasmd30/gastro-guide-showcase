/**
 * Valores em reais. O backend guarda centavos (inteiro) para não ter erro de
 * arredondamento; a tela mostra e aceita "450", "450,00" ou "1.200,50".
 */

/** 45000 → "R$ 450,00". */
export function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/** 45000 → "450,00", para preencher um campo de valor. */
export function centsToInput(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) return "";
  return (cents / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * "1.200,50" → 120050. Vazio → null (sem valor). Texto que não é valor →
 * undefined, para o formulário avisar em vez de gravar errado.
 */
export function parseBRL(input: string): number | null | undefined {
  const text = input.replace(/[R$\s]/g, "");
  if (!text) return null;
  // Ponto de milhar sai; a vírgula vira o separador decimal.
  const normalized = text.includes(",") ? text.replace(/\./g, "").replace(",", ".") : text;
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return undefined;
  return Math.round(parseFloat(normalized) * 100);
}
