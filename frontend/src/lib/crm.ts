const VALID_UFS = new Set([
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG",
  "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
]);

/** As 27 UFs em ordem alfabética, para seletores (ex.: endereço comercial). */
export const BRAZILIAN_UFS = [...VALID_UFS].sort();

export function normalizeCrm(crm: string): string {
  return crm.replace(/\D/g, "");
}

/** CRM não tem dígito verificador (ao contrário do CPF) — valida só formato e UF real. */
export function validateCrm(crm: string, crmUf: string): string | null {
  if (!/^\d{4,7}$/.test(crm)) {
    return "CRM deve conter só números (4 a 7 dígitos).";
  }
  if (!VALID_UFS.has(crmUf)) {
    return "UF do CRM inválida.";
  }
  return null;
}
